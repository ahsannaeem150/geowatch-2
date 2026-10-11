import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, isValid, parseISO, startOfMonth, subDays } from 'date-fns';
import { listIncidents, listZones } from '../services/incidents.service';
import { subscribeSse } from '../services/sse.service';
import { DOMAINS, STORAGE_KEYS, ZONE_OVERLAYS } from '../constants';
import {
  centerForPaddedFlight,
  fitZoomForBounds,
  getSelectionCamera,
  projectToScreen,
  selectionSignature,
  zoneComfortFactor,
} from '../utils/selectionCamera';
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
const SSE_REFETCH_DEBOUNCE_MS = 1500;
const SSE_MAP_EVENTS = new Set([
  'incident_created',
  'incident_updated',
  'incident_resolved',
  'incident_deleted',
  'timeline_added',
  'timeline_updated',
  'timeline_deleted',
]);

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
  const mapCenterRef = useRef(DEFAULT_CENTER);
  const viewportPxRef = useRef(Dimensions.get('window'));
  const lastSelectionFlightRef = useRef(null);
  const viewportBoundsRef = useRef(null); // "w,s,e,n" string for the API
  const viewportModeRef = useRef(viewportMode);
  const dateRangeRef = useRef(dateRange);
  const debounceRef = useRef(null);
  const fetchSeqRef = useRef(0); // drops stale responses (pan refetch vs range fetch)

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => {
      viewportPxRef.current = window;
    });
    return () => sub?.remove();
  }, []);

  // ─── Auto-zoom on selection (web Settings drawer parity; off = pan-only) ───
  const [autoZoomEnabled, setAutoZoomEnabledState] = useState(true);
  const autoZoomRef = useRef(true);
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEYS.AUTO_ZOOM)
      .then((raw) => {
        if (raw !== null) {
          const v = raw === 'true';
          autoZoomRef.current = v;
          setAutoZoomEnabledState(v);
        }
      })
      .catch(() => {});
  }, []);
  const setAutoZoomEnabled = useCallback((v) => {
    autoZoomRef.current = v;
    setAutoZoomEnabledState(v);
    AsyncStorage.setItem(STORAGE_KEYS.AUTO_ZOOM, String(v)).catch(() => {});
  }, []);

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
    async ({ boundedRefetch = false, silent = false } = {}) => {
      const seq = ++fetchSeqRef.current;
      if (!silent) {
        setLoading(true);
      }
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
        if (seq === fetchSeqRef.current && !silent) {
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

  // SSE live updates (signed-in only — LiveContext owns the connection):
  // bursts are coalesced into one silent trailing refetch so a stream of
  // events never spams the pipeline or flashes the loading pill.
  const sseDebounceRef = useRef(null);
  useEffect(
    () =>
      subscribeSse((evt) => {
        if (!evt || !SSE_MAP_EVENTS.has(evt.type)) {
          return;
        }
        if (sseDebounceRef.current) {
          clearTimeout(sseDebounceRef.current);
        }
        sseDebounceRef.current = setTimeout(() => {
          sseDebounceRef.current = null;
          runFetch({ silent: true });
        }, SSE_REFETCH_DEBOUNCE_MS);
      }),
    [runFetch],
  );
  useEffect(
    () => () => {
      if (sseDebounceRef.current) {
        clearTimeout(sseDebounceRef.current);
      }
    },
    [],
  );

  // Region changes: track zoom/bounds; debounced viewport-bounded refetch.
  const handleRegionChange = useCallback(
    (state) => {
      if (!state) return;
      const { bounds, zoom } = state;
      if (Array.isArray(bounds) && bounds.length === 4) {
        viewportBoundsRef.current = bounds.map((n) => n.toFixed(5)).join(',');
      }
      const center = state.center;
      if (Array.isArray(center) && center.length === 2 && center.every(Number.isFinite)) {
        mapCenterRef.current = center;
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
  // Power Search result overlay: while the PS screen is open its result set
  // renders as extra map markers on top of the date-range fetch. Null = off.
  const [searchOverlay, setSearchOverlay] = useState(null);
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

  // ─── Smart selection camera (web UserMap flyToCoords effect parity) ───
  // The shared pure policy decides zoom/duration/panOnly; measurement is
  // pure Web-Mercator (utils/selectionCamera.js) because MapLibre RN has no
  // synchronous cameraForBounds. request: { type, source, lng, lat, bounds?,
  // padding? } — padding mirrors the chrome about to open (peek sheet etc.)
  // so the target lands in the visible area, via centerForPaddedFlight.
  const flyToSelection = useCallback((request) => {
    const cam = cameraRef.current;
    if (
      !cam ||
      !request ||
      !Number.isFinite(request.lng) ||
      !Number.isFinite(request.lat)
    ) {
      return;
    }
    const { type, source, bounds } = request;
    const padding = request.padding || { top: 0, right: 0, bottom: 0, left: 0 };
    const { width: vw, height: vh } = viewportPxRef.current;
    const currentZoom = mapZoomRef.current;
    const currentCenter = mapCenterRef.current;

    // Repeat-click guard: skip only when an identical (type, source, lng, lat)
    // selection would repeat the last flight AND the camera + padding are
    // unchanged (web: signature + zoom ±0.3 + drift ≤ 5% of the viewport span).
    const signature = selectionSignature({ type, source, lng: request.lng, lat: request.lat });
    const last = lastSelectionFlightRef.current;
    if (last && last.signature === signature) {
      const world = 512 * 2 ** currentZoom;
      const viewportSpan = Math.hypot((360 * vw) / world, (360 * vh) / world);
      const centerDrift = Math.hypot(
        currentCenter[0] - last.center[0],
        currentCenter[1] - last.center[1],
      );
      const sameCamera =
        Math.abs(currentZoom - last.zoom) <= 0.3 && centerDrift <= viewportSpan * 0.05;
      if (sameCamera && paddingEquals(padding, last.padding)) {
        return;
      }
    }

    const isZone = type === 'zone' && bounds;
    let fitZoom;
    let fitsAtCurrentZoom = false;
    if (isZone) {
      fitZoom = fitZoomForBounds(bounds, vw, vh, padding, zoneComfortFactor(bounds));
      fitsAtCurrentZoom = currentZoom >= fitZoomForBounds(bounds, vw, vh, padding, 1.0);
    }
    let isVisibleInViewport = false;
    if (type === 'incident' && source === 'power-search') {
      const [x, y] = projectToScreen([request.lng, request.lat], currentZoom, currentCenter, vw, vh);
      isVisibleInViewport =
        x >= (padding.left || 0) &&
        x <= vw - (padding.right || 0) &&
        y >= (padding.top || 0) &&
        y <= vh - (padding.bottom || 0);
    }

    const decision = getSelectionCamera({
      type,
      source,
      bounds,
      currentZoom,
      isVisibleInViewport,
      fitsAtCurrentZoom,
      autoZoomEnabled: autoZoomRef.current,
      fitZoom,
    });

    const targetZoom = Math.min(decision.zoom, MAX_ZOOM);
    // Pan-only and equal-zoom results go through easeTo: flyTo's van Wijk arc
    // zooms out mid-flight on long pans, which reads as stutter when no zoom
    // change is intended (web parity).
    const zoomUnchanged = decision.panOnly || Math.abs(targetZoom - currentZoom) < 0.001;
    const flightCenter = centerForPaddedFlight([request.lng, request.lat], targetZoom, padding);
    lastSelectionFlightRef.current = {
      signature,
      zoom: targetZoom,
      center: [request.lng, request.lat],
      padding,
    };
    const camera = { center: flightCenter, zoom: targetZoom, duration: decision.duration };
    if (zoomUnchanged) {
      cam.easeTo(camera);
    } else {
      cam.flyTo(camera);
    }
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
      searchOverlay,
      setSearchOverlay,
      layerVisibility,
      toggleDomainLayer,
      toggleZoneLayer,
      setAllDomainLayers,
      setAllZoneLayers,
      cameraRef,
      zoomIn,
      zoomOut,
      flyTo,
      flyToSelection,
      autoZoomEnabled,
      setAutoZoomEnabled,
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
      searchOverlay,
      layerVisibility,
      toggleDomainLayer,
      toggleZoneLayer,
      setAllDomainLayers,
      setAllZoneLayers,
      zoomIn,
      zoomOut,
      flyTo,
      flyToSelection,
      autoZoomEnabled,
      setAutoZoomEnabled,
      handleRegionChange,
    ],
  );

  return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
}

function isUnboundedRangeNow(from, to) {
  return !from || !to;
}

function paddingEquals(a, b) {
  if (!a || !b) return false;
  return (
    (a.top || 0) === (b.top || 0) &&
    (a.right || 0) === (b.right || 0) &&
    (a.bottom || 0) === (b.bottom || 0) &&
    (a.left || 0) === (b.left || 0)
  );
}

export function useMap() {
  const ctx = useContext(MapContext);
  if (!ctx) {
    throw new Error('useMap must be used within MapProvider');
  }
  return ctx;
}

export default MapContext;
