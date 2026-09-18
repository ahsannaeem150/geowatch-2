import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, isValid, parseISO, startOfMonth, subDays } from 'date-fns';
import { listIncidents, listZones } from '../services/incidents.service';
import { DOMAINS, STORAGE_KEYS, ZONE_OVERLAYS } from '../constants';
import { useOverlay } from './OverlayContext';

// Shared map state: date range (lifted from TimeStrip), incident/zone data,
// viewport fetch policy, selection, layer visibility, and the camera handle.
//
// The fetch policy mirrors the web apps (src/user-web/src/pages/MapPage.jsx):
//  1. Point list queries always go through listIncidents → geometryType=point
//     (otherwise polygon zones arrive twice).
//  2. Null date ends never reach the API — translated to 1970-01-01/2099-12-31.
//  3. Ranges > LARGE_RANGE_DAYS or "All time" withhold points below GATE_ZOOM
//     (zones always load); at/above the gate, point fetches are viewport-bounded.
//  4. Small ranges fetch unbounded first; if the point total exceeds
//     SMART_FILTER_THRESHOLD, pan/zoom refetches become viewport-bounded
//     (debounced VIEWPORT_DEBOUNCE_MS).

export const GATE_ZOOM = 6;
export const LARGE_RANGE_DAYS = 31;
const SMART_FILTER_THRESHOLD = 100;
const VIEWPORT_DEBOUNCE_MS = 400;
const UNBOUNDED_FROM = '1970-01-01';
const UNBOUNDED_TO = '2099-12-31';

export const DEFAULT_CENTER = [15, 25];
export const DEFAULT_ZOOM = 2;
export const MIN_ZOOM = 1.5;
export const MAX_ZOOM = 16;

const MapContext = createContext(null);

function toIso(d) {
  return format(d, 'yyyy-MM-dd');
}

function validIso(s) {
  return s && isValid(parseISO(s)) ? s : null;
}

// TimeStrip selection ({ preset, single, from, to }) → { from, to } ISO dates.
// Null ends mean unbounded ("All time") and are translated at fetch time.
function deriveDateRange(sel) {
  const today = new Date();
  switch (sel.preset) {
    case 'Today':
      return { from: toIso(today), to: toIso(today) };
    case 'Yesterday': {
      const y = subDays(today, 1);
      return { from: toIso(y), to: toIso(y) };
    }
    case 'Last 7 days':
      return { from: toIso(subDays(today, 6)), to: toIso(today) };
    case 'Last 30 days':
      return { from: toIso(subDays(today, 29)), to: toIso(today) };
    case 'This month':
      return { from: toIso(startOfMonth(today)), to: toIso(today) };
    case 'All time':
      return { from: null, to: null };
    default:
      break;
  }
  if (sel.single) {
    const d = validIso(sel.single);
    return { from: d, to: d };
  }
  if (sel.from || sel.to) {
    return { from: validIso(sel.from), to: validIso(sel.to) };
  }
  return { from: toIso(today), to: toIso(today) };
}

export function MapProvider({ children }) {
  const { showToast } = useOverlay();

  // ─── Date selection (lifted from TimeStrip) ───
  const [timeSel, setTimeSel] = useState({
    preset: 'Today',
    single: '',
    from: '',
    to: '',
  });

  const pickPreset = useCallback((name) => {
    setTimeSel({ preset: name, single: '', from: '', to: '' });
  }, []);

  const applySingle = useCallback((value) => {
    setTimeSel((p) => ({
      ...p,
      single: value,
      ...(value ? { preset: null, from: '', to: '' } : {}),
    }));
  }, []);

  const applyRange = useCallback((which, value) => {
    setTimeSel((p) => ({
      ...p,
      [which]: value,
      ...(value ? { preset: null, single: '' } : {}),
    }));
  }, []);

  const dateRange = useMemo(() => deriveDateRange(timeSel), [timeSel]);

  // ─── Data + fetch policy ───
  const [incidents, setIncidents] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewportMode, setViewportMode] = useState('unbounded'); // 'unbounded' | 'bounded'
  const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM);

  const cameraRef = useRef(null);
  const mapZoomRef = useRef(DEFAULT_ZOOM);
  const viewportBoundsRef = useRef(null); // "w,s,e,n" string for the API
  const viewportModeRef = useRef(viewportMode);
  const dateRangeRef = useRef(dateRange);
  const debounceRef = useRef(null);
  const fetchSeqRef = useRef(0); // drops stale responses (pan refetch vs range fetch)

  useEffect(() => {
    viewportModeRef.current = viewportMode;
  }, [viewportMode]);
  useEffect(() => {
    dateRangeRef.current = dateRange;
  }, [dateRange]);

  const isUnboundedRange = !dateRange.from || !dateRange.to;
  const rangeDayCount = isUnboundedRange
    ? Infinity
    : Math.floor(
        (new Date(`${dateRange.to}T00:00:00`) -
          new Date(`${dateRange.from}T00:00:00`)) /
          86400000,
      ) + 1;
  const isLargeRange = isUnboundedRange || rangeDayCount > LARGE_RANGE_DAYS;
  const isRangeGated = isLargeRange && !(mapZoom >= GATE_ZOOM);
  const isRangeGatedRef = useRef(isRangeGated);
  useEffect(() => {
    isRangeGatedRef.current = isRangeGated;
  }, [isRangeGated]);

  const runFetch = useCallback(
    async ({ boundedRefetch = false } = {}) => {
      const seq = ++fetchSeqRef.current;
      setLoading(true);
      const { from, to } = dateRangeRef.current;
      const effFrom = from || UNBOUNDED_FROM;
      const effTo = to || UNBOUNDED_TO;
      const days = isUnboundedRangeNow(from, to)
        ? Infinity
        : Math.floor(
            (new Date(`${to}T00:00:00`) - new Date(`${from}T00:00:00`)) /
              86400000,
          ) + 1;
      const largeRange = days === Infinity || days > LARGE_RANGE_DAYS;

      try {
        if (largeRange) {
          // Polygon zones always load — few and needed for context.
          const zonesRes = await listZones({ dateFrom: effFrom, dateTo: effTo });
          if (seq !== fetchSeqRef.current) return;
          const zoneRows = zonesRes?.incidents || [];

          if (isRangeGatedRef.current) {
            // Below the gate zoom: withhold point incidents entirely.
            setIncidents([]);
            setZones(zoneRows);
            setViewportMode('unbounded');
          } else {
            // At/above the gate zoom: viewport-bounded points + global zones.
            const viewport = viewportBoundsRef.current;
            const pointRes = await listIncidents({
              dateFrom: effFrom,
              dateTo: effTo,
              ...(viewport ? { viewport } : {}),
            });
            if (seq !== fetchSeqRef.current) return;
            setIncidents(pointRes?.incidents || []);
            setZones(zoneRows);
            setViewportMode('bounded');
          }
          return;
        }

        if (boundedRefetch) {
          const viewport = viewportBoundsRef.current;
          if (!viewport) return;
          const [pointRes, zoneRes] = await Promise.all([
            listIncidents({ dateFrom: effFrom, dateTo: effTo, viewport }),
            listZones({ dateFrom: effFrom, dateTo: effTo, viewport }),
          ]);
          if (seq !== fetchSeqRef.current) return;
          setIncidents(pointRes?.incidents || []);
          setZones(zoneRes?.incidents || []);
          return;
        }

        // Smart filtering: unbounded first, switch to viewport-bounded
        // refetches when the point total is too large.
        const [pointRes, zoneRes] = await Promise.all([
          listIncidents({ dateFrom: effFrom, dateTo: effTo }),
          listZones({ dateFrom: effFrom, dateTo: effTo }),
        ]);
        if (seq !== fetchSeqRef.current) return;
        const pointCount = pointRes?.count ?? 0;

        if (pointCount > SMART_FILTER_THRESHOLD) {
          setViewportMode('bounded');
          const viewport = viewportBoundsRef.current;
          if (viewport) {
            const [pointRes2, zoneRes2] = await Promise.all([
              listIncidents({ dateFrom: effFrom, dateTo: effTo, viewport }),
              listZones({ dateFrom: effFrom, dateTo: effTo, viewport }),
            ]);
            if (seq !== fetchSeqRef.current) return;
            setIncidents(pointRes2?.incidents || []);
            setZones(zoneRes2?.incidents || []);
            return;
          }
          setIncidents(pointRes?.incidents || []);
          setZones(zoneRes?.incidents || []);
        } else {
          setViewportMode('unbounded');
          setIncidents(pointRes?.incidents || []);
          setZones(zoneRes?.incidents || []);
        }
      } catch {
        if (seq === fetchSeqRef.current) {
          showToast('Could not load incidents — check the backend');
        }
      } finally {
        if (seq === fetchSeqRef.current) {
          setLoading(false);
        }
      }
    },
    [showToast],
  );

  // Main fetch: date range or gate crossing.
  useEffect(() => {
    runFetch();
  }, [dateRange.from, dateRange.to, isRangeGated, runFetch]);

  // Region changes: track zoom/bounds; debounced viewport-bounded refetch.
  const handleRegionChange = useCallback(
    (state) => {
      if (!state) return;
      const { bounds, zoom } = state;
      if (Array.isArray(bounds) && bounds.length === 4) {
        viewportBoundsRef.current = bounds.map((n) => n.toFixed(5)).join(',');
      }
      if (Number.isFinite(zoom)) {
        mapZoomRef.current = zoom;
        setMapZoom((prev) => (Math.abs(prev - zoom) < 0.05 ? prev : zoom));
      }
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        if (viewportModeRef.current === 'bounded') {
          runFetch({ boundedRefetch: true });
        }
      }, VIEWPORT_DEBOUNCE_MS);
    },
    [runFetch],
  );

  // ─── Selection (stub — full peek/drawer flow comes later) ───
  const [selectedId, setSelectedId] = useState(null);
  const [selectedKind, setSelectedKind] = useState(null); // 'incident' | 'zone'
  const [ghostItem, setGhostItem] = useState(null);
  const selectedItemRef = useRef(null);
  const incidentsRef = useRef(incidents);
  const zonesRef = useRef(zones);
  useEffect(() => {
    incidentsRef.current = incidents;
  }, [incidents]);
  useEffect(() => {
    zonesRef.current = zones;
  }, [zones]);

  const selectItem = useCallback((id, kind) => {
    const list = kind === 'zone' ? zonesRef.current : incidentsRef.current;
    selectedItemRef.current = list.find((i) => i.id === id) || null;
    setSelectedId(id);
    setSelectedKind(kind);
    setGhostItem(null);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedId(null);
    setSelectedKind(null);
    setGhostItem(null);
    selectedItemRef.current = null;
  }, []);

  // Prototype ghostSelected(): when a date-range change drops the selected
  // item out of the fetched set, keep it rendered greyed + toast once.
  // The rangeChangedRef flag scopes ghosting to date-range changes only —
  // a viewport-bounded pan refetch can also drop the selected item, and that
  // must NOT ghost it (mirrors the web, where ghosting is date-driven).
  const rangeChangedRef = useRef(false);
  useEffect(() => {
    rangeChangedRef.current = true;
  }, [dateRange.from, dateRange.to]);

  useEffect(() => {
    if (loading) {
      return; // keep the flag; evaluate once the fresh data lands
    }
    const rangeChanged = rangeChangedRef.current;
    rangeChangedRef.current = false;
    if (!selectedId) {
      return;
    }
    const list = selectedKind === 'zone' ? zones : incidents;
    const found = list.find((i) => i.id === selectedId);
    if (found) {
      selectedItemRef.current = found;
      if (ghostItem) {
        setGhostItem(null);
      }
      return;
    }
    if (rangeChanged && (!ghostItem || ghostItem.id !== selectedId)) {
      const item = selectedItemRef.current;
      if (item) {
        showToast('Selection out of range — shown as ghost');
        setGhostItem({ ...item, __kind: selectedKind });
      }
    }
  }, [incidents, zones, selectedId, selectedKind, loading, ghostItem, showToast]);

  // ─── Layer visibility (persisted) ───
  const [layerVisibility, setLayerVisibility] = useState({
    domains: {},
    zones: {},
  });
  const [layersLoaded, setLayersLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEYS.LAYERS)
      .then((raw) => {
        if (cancelled || !raw) return;
        const parsed = JSON.parse(raw);
        setLayerVisibility({
          domains: parsed.domains || {},
          zones: parsed.zones || {},
        });
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLayersLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (layersLoaded) {
      AsyncStorage.setItem(
        STORAGE_KEYS.LAYERS,
        JSON.stringify(layerVisibility),
      ).catch(() => {});
    }
  }, [layerVisibility, layersLoaded]);

  const toggleDomainLayer = useCallback((slug) => {
    setLayerVisibility((p) => ({
      ...p,
      domains: { ...p.domains, [slug]: p.domains[slug] === false },
    }));
  }, []);

  const toggleZoneLayer = useCallback((slug) => {
    setLayerVisibility((p) => ({
      ...p,
      zones: { ...p.zones, [slug]: p.zones[slug] === false },
    }));
  }, []);

  const setAllDomainLayers = useCallback((visible) => {
    setLayerVisibility((p) => ({
      ...p,
      domains: Object.fromEntries(DOMAINS.map((d) => [d.slug, visible])),
    }));
  }, []);

  const setAllZoneLayers = useCallback((visible) => {
    setLayerVisibility((p) => ({
      ...p,
      zones: Object.fromEntries(ZONE_OVERLAYS.map((z) => [z.slug, visible])),
    }));
  }, []);

  // ─── Camera helpers (SideControls) ───
  const zoomIn = useCallback(() => {
    cameraRef.current?.zoomTo(Math.min(mapZoomRef.current + 1, MAX_ZOOM), {
      duration: 300,
    });
  }, []);

  const zoomOut = useCallback(() => {
    cameraRef.current?.zoomTo(Math.max(mapZoomRef.current - 1, MIN_ZOOM), {
      duration: 300,
    });
  }, []);

  const flyTo = useCallback((center, zoom) => {
    cameraRef.current?.flyTo({ center, zoom, duration: 1200 });
  }, []);

  const value = useMemo(
    () => ({
      timeSel,
      pickPreset,
      applySingle,
      applyRange,
      dateRange,
      incidents,
      zones,
      loading,
      viewportMode,
      isLargeRange,
      isRangeGated,
      mapZoom,
      selectedId,
      selectedKind,
      selectItem,
      clearSelection,
      ghostItem,
      layerVisibility,
      toggleDomainLayer,
      toggleZoneLayer,
      setAllDomainLayers,
      setAllZoneLayers,
      cameraRef,
      zoomIn,
      zoomOut,
      flyTo,
      handleRegionChange,
    }),
    [
      timeSel,
      pickPreset,
      applySingle,
      applyRange,
      dateRange,
      incidents,
      zones,
      loading,
      viewportMode,
      isLargeRange,
      isRangeGated,
      mapZoom,
      selectedId,
      selectedKind,
      selectItem,
      clearSelection,
      ghostItem,
      layerVisibility,
      toggleDomainLayer,
      toggleZoneLayer,
      setAllDomainLayers,
      setAllZoneLayers,
      zoomIn,
      zoomOut,
      flyTo,
      handleRegionChange,
    ],
  );

  return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
}

function isUnboundedRangeNow(from, to) {
  return !from || !to;
}

export function useMap() {
  const ctx = useContext(MapContext);
  if (!ctx) {
    throw new Error('useMap must be used within MapProvider');
  }
  return ctx;
}

export default MapContext;
