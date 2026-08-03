import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Layers,
  AlertTriangle,
  Activity as ActivityIcon,
  Bookmark,
  ChevronLeft,
  Settings,
  Zap,
} from 'lucide-react';
import { api, mapIncidentForShared } from '../services/api.js';
import { API_BASE_URL } from '@shared/constants.js';
import { Skeleton } from '@shared/components/Skeleton.jsx';
import UserMap from '../components/Map/UserMap.jsx';
import WorkspaceTopBar from '../components/Layout/WorkspaceTopBar.jsx';
import WorkspaceRail from '../components/Layout/WorkspaceRail.jsx';
import WorkspaceDrawer from '../components/Layout/WorkspaceDrawer.jsx';
import PowerSearchPanel from '../components/Layout/PowerSearchPanel.jsx';
import UserCommandPalette from '../components/Layout/UserCommandPalette.jsx';
import AwayBanner from '../components/AwayBanner/AwayBanner.jsx';
import MapContextMenu from '@shared/components/MapContextMenu.jsx';
import { IncidentDetailSidebar, ZoneDetailSidebar } from '@shared';
import { useMapContextMenu } from '@shared/hooks/useMapContextMenu.js';
import { usePublicAuth } from '../contexts/PublicAuthContext.jsx';
import { useSignInModal } from '../contexts/SignInModalContext.jsx';
import { computeMapPadding, computeOuterContainerPadding } from '../utils/mapPadding.js';

const LS_KEY = 'geowatch_last_seen';
const LS_COMPACT = 'geowatch_user_compact_mode';
const LS_AUTO_ZOOM = 'geowatch_user_auto_zoom';
const MAX_ACTIVITIES = 50;
const RIGHT_PANEL_TRANSITION_MS = 250;
const PS_PAGE_SIZE = 25;
// Large-range gating (flightradar-style): ranges wider than this or unbounded
// ("All time") withhold point incidents until the map is zoomed to GATE_ZOOM
// or closer; polygon zones always load.
const LARGE_RANGE_DAYS = 31;
const GATE_ZOOM = 6;

const DEFAULT_PS_FILTERS = {
  domainSlugs: [],
  categorySlugs: [],
  statuses: ['active'],
  verificationStatuses: [],
  sourceTypes: [],
  severities: [],
  geometryTypes: [],
  savedOnly: false,
  dateFrom: '',
  dateTo: '',
};

function getLastSeen() {
  const raw = localStorage.getItem(LS_KEY);
  return raw ? parseInt(raw, 10) : Date.now();
}

function setLastSeen(ts) {
  localStorage.setItem(LS_KEY, String(ts));
}

function uniqueById(items) {
  const seen = new Set();
  return (items || []).filter((item) => {
    if (!item || !item.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function getToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function getZoneCentroid(zone) {
  const coords = zone?.geometry?.coordinates?.[0];
  if (!coords || coords.length === 0) return null;
  let sumLng = 0;
  let sumLat = 0;
  coords.forEach(([lng, lat]) => {
    sumLng += lng;
    sumLat += lat;
  });
  return { lng: sumLng / coords.length, lat: sumLat / coords.length };
}

function getZoneBounds(zone) {
  const coords = zone?.geometry?.coordinates?.[0];
  if (!coords || coords.length === 0) return null;
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  coords.forEach(([lng, lat]) => {
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  });
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}

export default function MapPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const incidentIdFromUrl = searchParams.get('incident');
  const zoneIdFromUrl = searchParams.get('zone');
  const latParam = searchParams.get('lat');
  const lngParam = searchParams.get('lng');
  const zoomParam = searchParams.get('zoom');
  const hasViewportParams =
    latParam &&
    lngParam &&
    zoomParam &&
    Number.isFinite(parseFloat(latParam)) &&
    Number.isFinite(parseFloat(lngParam)) &&
    Number.isFinite(parseFloat(zoomParam));
  // Mount-time snapshot: true only when the URL the page was OPENED with
  // carried an explicit camera (shared-view restore). lat/lng/zoom params
  // written afterwards by the app's own viewport sync must not turn a plain
  // ?incident=/?zone= deep-link into a skipFlyTo.
  const initialUrlHadViewportRef = useRef(!!hasViewportParams);

  // Return-restore snapshot: arriving Back from a full-page detail view with
  // the return-view payload (built into the URL by buildReturnMapUrl). When the
  // payload's camera matches the URL camera, this mount IS a return — the map
  // then initializes at the exact saved camera (padding/bearing/pitch included)
  // and no initial flight runs (a no-op easeTo would clobber the restored
  // padding). A stale payload whose camera differs from the URL (share-link
  // opened in the same tab) is ignored.
  const returnViewRef = useRef(undefined);
  if (returnViewRef.current === undefined) {
    try {
      const raw = sessionStorage.getItem('geowatch_user_return_view');
      returnViewRef.current = raw ? JSON.parse(raw) : null;
    } catch {
      returnViewRef.current = null;
    }
  }
  const returnViewPayload = returnViewRef.current;
  const returnView =
    returnViewPayload &&
    hasViewportParams &&
    Number(returnViewPayload.lat).toFixed(6) === Number(latParam).toFixed(6) &&
    Number(returnViewPayload.lng).toFixed(6) === Number(lngParam).toFixed(6) &&
    Number(returnViewPayload.zoom).toFixed(2) === Number(zoomParam).toFixed(2)
      ? returnViewPayload
      : null;

  // ─── Date & filters ───
  const today = getToday();
  const [dateRange, setDateRange] = useState({ from: today, to: today });
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [flyToCoords, setFlyToCoords] = useState(
    hasViewportParams && !returnView
      ? {
          lat: parseFloat(latParam),
          lng: parseFloat(lngParam),
          zoom: parseFloat(zoomParam),
          source: 'deep-link',
        }
      : null
  );
  const [filters, setFilters] = useState({
    categoryId: searchParams.get('categoryId') || '',
    severity: '',
  });

  // ─── Domain / Zone legend ───
  const [domains, setDomains] = useState([]);
  const [categories, setCategories] = useState([]);
  const [zoneCategories, setZoneCategories] = useState([]);
  const [activeDomainFilters, setActiveDomainFilters] = useState(new Set());
  const [activeZoneSlugs, setActiveZoneSlugs] = useState(new Set());
  const [showZones, setShowZones] = useState(true);
  const zoneSlugsInitializedRef = useRef(false);

  // Zones default to visible: all categories switched ON once the taxonomy
  // loads; afterwards the user's drawer toggles own the state (no persistence).
  useEffect(() => {
    if (zoneSlugsInitializedRef.current || zoneCategories.length === 0) return;
    zoneSlugsInitializedRef.current = true;
    setActiveZoneSlugs(new Set(zoneCategories.map((z) => z.slug).filter(Boolean)));
  }, [zoneCategories]);

  // ─── Layout state ───
  const [activeDrawer, setActiveDrawer] = useState(null);
  const [focusMode, setFocusMode] = useState(false);
  const [compactMode, setCompactMode] = useState(() => {
    try {
      return localStorage.getItem(LS_COMPACT) === 'true';
    } catch {
      return false;
    }
  });
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const preFocusRightCollapsedRef = useRef(false);
  const [rightPanelRendered, setRightPanelRendered] = useState(false);
  const [rightPanelVisible, setRightPanelVisible] = useState(false);
  const [powerSearchMode, setPowerSearchMode] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [autoZoomEnabled, setAutoZoomEnabled] = useState(() => {
    try {
      const raw = localStorage.getItem(LS_AUTO_ZOOM);
      return raw === null ? true : raw === 'true';
    } catch {
      return true;
    }
  });

  // ─── Power Search state ───
  const [psQuery, setPsQuery] = useState('');
  const [psFilters, setPsFilters] = useState(DEFAULT_PS_FILTERS);
  const [psSort, setPsSort] = useState('newest');
  const [psResults, setPsResults] = useState([]);
  const [psTotal, setPsTotal] = useState(0);
  const [psLoading, setPsLoading] = useState(false);
  const [psError, setPsError] = useState('');
  const [psFilterCollapsed, setPsFilterCollapsed] = useState(false);
  const [psResultsCollapsed, setPsResultsCollapsed] = useState(false);

  // ─── Detail panel state ───
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailRefreshKey, setDetailRefreshKey] = useState(0);

  // ─── Smart Viewport Filtering ───
  const [viewportFiltering, setViewportFiltering] = useState(null);
  const [totalEventCount, setTotalEventCount] = useState(0);
  const viewportBoundsRef = useRef(null);
  const viewportFilteringRef = useRef(null);

  // ─── Large-range gating (flightradar-style) ───
  // Ranges > LARGE_RANGE_DAYS or unbounded ("All time") withhold point
  // incidents below GATE_ZOOM; polygons always load. Crossing the gate zoom
  // re-evaluates via the main fetch effect (isRangeGated dependency).
  const [mapZoom, setMapZoom] = useState(null);
  const isUnboundedRange = !dateRange.from || !dateRange.to;
  const rangeDayCount = isUnboundedRange
    ? Infinity
    : Math.floor(
        (new Date(`${dateRange.to}T00:00:00`) - new Date(`${dateRange.from}T00:00:00`)) / 86400000
      ) + 1;
  const isLargeRange = isUnboundedRange || rangeDayCount > LARGE_RANGE_DAYS;
  const isRangeGated = isLargeRange && !(mapZoom >= GATE_ZOOM);

  // Live mode = the map shows exactly today (drives the topbar LIVE pill)
  const isLiveMode = dateRange.from === today && dateRange.to === today;

  // ─── Saved Incidents ───
  const { isAuthenticated, user } = usePublicAuth();
  const { openSignInModal } = useSignInModal();
  const [savedIncidents, setSavedIncidents] = useState([]);
  const [savedIds, setSavedIds] = useState(new Set());

  // ─── Map context menu ───
  const mapRef = useRef(null);
  const {
    isOpen: mapMenuOpen,
    position: mapMenuPosition,
    feature: mapMenuFeature,
    open: openMapMenu,
    close: closeMapMenu,
  } = useMapContextMenu();

  // ─── Live Activity ───
  const [activities, setActivities] = useState([]);
  const [lastSeenTimestamp, setLastSeenTimestamp] = useState(getLastSeen());
  const [showAwayBanner, setShowAwayBanner] = useState(false);
  const [awayStats, setAwayStats] = useState({ newEvents: 0, updatedEvents: 0 });

  const esRef = useRef(null);
  const selectedIncidentRef = useRef(null);
  const skipNextZoneFitRef = useRef(false);
  const zoneGhostFetchAttempted = useRef(false);
  const ghostFetchAttempted = useRef(false);
  const flyToTimeoutRef = useRef(null);
  // Last URL param value each deep-link effect has already handled (or
  // intentionally ignored because it came from an in-app selection).
  const incidentDeepLinkProcessedRef = useRef(null);
  const zoneDeepLinkProcessedRef = useRef(null);

  // Keep ref in sync with state for SSE handler
  useEffect(() => {
    selectedIncidentRef.current = selectedIncident;
  }, [selectedIncident]);

  // ─── Apply compact-mode class to html ───
  useEffect(() => {
    const html = document.documentElement;
    if (compactMode) {
      html.classList.add('admin-compact');
    } else {
      html.classList.remove('admin-compact');
    }
    try {
      localStorage.setItem(LS_COMPACT, String(compactMode));
    } catch {
      // ignore
    }
  }, [compactMode]);

  // ─── Persist auto-zoom preference ───
  useEffect(() => {
    try {
      localStorage.setItem(LS_AUTO_ZOOM, String(autoZoomEnabled));
    } catch {
      // ignore
    }
  }, [autoZoomEnabled]);

  // ─── Sync categoryId filter from URL params ───
  useEffect(() => {
    const cid = searchParams.get('categoryId');
    setFilters((prev) => ({ ...prev, categoryId: cid || '' }));
  }, [searchParams]);

  // ─── Open a rail drawer via ?drawer=<id> (e.g. profile-menu "Saved incidents"
  // → /map?drawer=saved). Stripped after applying; unknown ids and 'saved'
  // while signed out are ignored gracefully. ───
  useEffect(() => {
    const drawerParam = searchParams.get('drawer');
    if (!drawerParam) return;
    const publicDrawers = ['layers', 'incidents', 'active', 'activity', 'settings'];
    if (publicDrawers.includes(drawerParam) || (drawerParam === 'saved' && isAuthenticated)) {
      setActiveDrawer(drawerParam);
    }
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('drawer');
        return next;
      },
      { replace: true }
    );
  }, [searchParams, isAuthenticated, setSearchParams]);

  // ─── Fetch point incidents and polygon zones with smart viewport filtering ───
  useEffect(() => {
    let cancelled = false;

    const doFetch = async () => {
      setLoading(true);
      setViewportFiltering(null);
      viewportFilteringRef.current = null;

      const baseParams = {};
      if (filters.categoryId) baseParams.categoryId = filters.categoryId;
      if (filters.severity) baseParams.severity = filters.severity;

      // Unbounded "All time" translates to a maximally wide overlap window —
      // the list endpoint applies a default "visible today" window when no
      // date params are sent, so nulls must never reach it.
      const effFrom = dateRange.from || '1970-01-01';
      const effTo = dateRange.to || '2099-12-31';

      // ─── Large-range mode (flightradar-style gating) ───
      if (isLargeRange) {
        // Polygon zones always load — few and needed for context
        const zonesRes = await api.getIncidents({ dateFrom: effFrom, dateTo: effTo, geometryType: 'polygon' });
        if (cancelled) return;
        const zones = zonesRes.data.incidents || [];

        if (isRangeGated) {
          // Below the gate zoom: withhold point incidents entirely
          setIncidents(zones);
          setTotalEventCount(0);
          setViewportFiltering(false);
          viewportFilteringRef.current = 'gated';
        } else {
          // At/above the gate zoom: viewport-bounded points + global zones
          setViewportFiltering(true);
          viewportFilteringRef.current = true;
          const pointParams = { dateFrom: effFrom, dateTo: effTo, geometryType: 'point', ...baseParams };
          if (viewportBoundsRef.current) pointParams.viewport = viewportBoundsRef.current;
          const pointRes = await api.getIncidents(pointParams);
          if (cancelled) return;
          setIncidents([...(pointRes.data.incidents || []), ...zones]);
          setTotalEventCount(pointRes.data.count || 0);
        }
        setLoading(false);
        return;
      }

      const pointParams = { dateFrom: effFrom, dateTo: effTo, geometryType: 'point', ...baseParams };
      const zoneParams = { dateFrom: effFrom, dateTo: effTo, geometryType: 'polygon' };

      const [pointRes, zoneRes] = await Promise.all([
        api.getIncidents(pointParams),
        api.getIncidents(zoneParams),
      ]);

      if (cancelled) return;
      const pointCount = pointRes.data.count || 0;
      const zoneCount = zoneRes.data.count || 0;
      setTotalEventCount(pointCount + zoneCount);

      if (pointCount <= 100) {
        setIncidents([...(pointRes.data.incidents || []), ...(zoneRes.data.incidents || [])]);
        setViewportFiltering(false);
        viewportFilteringRef.current = false;
        setLoading(false);
      } else {
        setViewportFiltering(true);
        viewportFilteringRef.current = true;

        if (viewportBoundsRef.current) {
          const [pointRes2, zoneRes2] = await Promise.all([
            api.getIncidents({ ...pointParams, viewport: viewportBoundsRef.current }),
            api.getIncidents({ ...zoneParams, viewport: viewportBoundsRef.current }),
          ]);
          if (cancelled) return;
          setIncidents([...(pointRes2.data.incidents || []), ...(zoneRes2.data.incidents || [])]);
          setTotalEventCount((pointRes2.data.count || 0) + (zoneRes2.data.count || 0));
        } else {
          setIncidents([...(pointRes.data.incidents || []), ...(zoneRes.data.incidents || [])]);
        }
        setLoading(false);
      }
    };

    doFetch();

    return () => {
      cancelled = true;
    };
  }, [dateRange.from, dateRange.to, filters.categoryId, filters.severity, closeMapMenu, isLargeRange, isRangeGated]);

  // Fetch domains, categories, and zone categories
  useEffect(() => {
    api.getDomains()
      .then((res) => setDomains(res.data.domains || []))
      .catch(() => setDomains([]));
    api.getCategories()
      .then((res) => setCategories(res.data.categories || []))
      .catch(() => setCategories([]));
    api.getZoneCategories()
      .then((res) => setZoneCategories(res.data.categories || res.data.zoneCategories || []))
      .catch(() => setZoneCategories([]));
  }, []);

  // Fetch saved incidents
  const refreshSaves = useCallback(async () => {
    if (!isAuthenticated) {
      setSavedIncidents([]);
      setSavedIds(new Set());
      return;
    }
    try {
      const res = await api.listSavedIncidents();
      const list = res.data.incidents || [];
      setSavedIncidents(list);
      setSavedIds(new Set(list.map((i) => i.id)));
    } catch (err) {
      console.error('Failed to refresh saved incidents:', err);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refreshSaves();
  }, [refreshSaves]);

  // Separate point and polygon incidents for the map
  const visibleDomainSlugs = useMemo(
    () => new Set(domains.map((d) => d.slug).filter((slug) => !activeDomainFilters.has(slug))),
    [domains, activeDomainFilters]
  );

  // Power Search needs domains enriched with their categories.
  const psDomains = useMemo(() => {
    const catsByDomain = {};
    categories.forEach((c) => {
      const key = c.domain_slug || c.domainSlug;
      if (!key) return;
      if (!catsByDomain[key]) catsByDomain[key] = [];
      catsByDomain[key].push(c);
    });
    return domains.map((d) => ({ ...d, categories: catsByDomain[d.slug] || [] }));
  }, [domains, categories]);

  const activeZoneIds = useMemo(
    () => new Set(zoneCategories.filter((z) => activeZoneSlugs.has(z.slug)).map((z) => String(z.id))),
    [zoneCategories, activeZoneSlugs]
  );

  const pointIncidents = useMemo(() => {
    return incidents.filter((i) => i.geometry_type !== 'polygon' && !activeDomainFilters.has(i.domain_slug));
  }, [incidents, activeDomainFilters]);

  const polygonIncidents = useMemo(() => {
    if (!showZones || activeZoneSlugs.size === 0) return [];
    return incidents.filter(
      (i) => i.geometry_type === 'polygon' && activeZoneIds.has(String(i.zone_category_id))
    );
  }, [incidents, showZones, activeZoneSlugs, activeZoneIds]);

  const visibleIncidents = pointIncidents;

  const activeIncidents = useMemo(() => {
    return pointIncidents.filter((i) => i.status === 'active');
  }, [pointIncidents]);



  const visibleSavedIncidents = useMemo(() => {
    if (activeDomainFilters.size === 0) return savedIncidents;
    return savedIncidents.filter((i) => !activeDomainFilters.has(i.domain_slug));
  }, [savedIncidents, activeDomainFilters]);

  useEffect(() => {
    setShowZones(activeZoneSlugs.size > 0);
  }, [activeZoneSlugs]);

  const panelMode = useMemo(() => {
    if (!selectedIncident) return 'empty';
    return selectedIncident.geometry_type === 'polygon' ? 'zone' : 'incident';
  }, [selectedIncident]);

  const isPanelOpen = panelMode !== 'empty';

  const getNextMapPadding = useCallback(
    (overrides = {}) =>
      computeMapPadding({
        scale: compactMode ? 0.9 : 1,
        powerSearchMode: overrides.powerSearchMode ?? powerSearchMode,
        psFilterCollapsed: overrides.psFilterCollapsed ?? psFilterCollapsed,
        psResultsCollapsed: overrides.psResultsCollapsed ?? psResultsCollapsed,
        activeDrawer: overrides.activeDrawer ?? activeDrawer,
        focusMode: overrides.focusMode ?? focusMode,
        isPanelOpen: overrides.isPanelOpen ?? isPanelOpen,
        rightPanelCollapsed: overrides.rightPanelCollapsed ?? rightPanelCollapsed,
      }),
    [compactMode, powerSearchMode, psFilterCollapsed, psResultsCollapsed, activeDrawer, focusMode, isPanelOpen, rightPanelCollapsed]
  );

  const getBannerPadding = useCallback(
    (overrides = {}) =>
      computeOuterContainerPadding({
        scale: compactMode ? 0.9 : 1,
        powerSearchMode: overrides.powerSearchMode ?? powerSearchMode,
        psFilterCollapsed: overrides.psFilterCollapsed ?? psFilterCollapsed,
        psResultsCollapsed: overrides.psResultsCollapsed ?? psResultsCollapsed,
        activeDrawer: overrides.activeDrawer ?? activeDrawer,
        focusMode: overrides.focusMode ?? focusMode,
        isPanelOpen: overrides.isPanelOpen ?? isPanelOpen,
        rightPanelCollapsed: overrides.rightPanelCollapsed ?? rightPanelCollapsed,
      }),
    [compactMode, powerSearchMode, psFilterCollapsed, psResultsCollapsed, activeDrawer, focusMode, isPanelOpen, rightPanelCollapsed]
  );

  // Live layout state mirror for the map padding getter. UserMap calls
  // getCurrentMapPadding at flight time (after panel/drawer transitions and
  // the scheduleFlyTo delay), so the padding always matches the chrome that is
  // actually on screen — a snapshot taken at click time would go stale.
  const layoutStateRef = useRef({});
  layoutStateRef.current = {
    compactMode,
    powerSearchMode,
    psFilterCollapsed,
    psResultsCollapsed,
    activeDrawer,
    focusMode,
    isPanelOpen,
    rightPanelCollapsed,
  };
  const getCurrentMapPadding = useCallback(() => {
    const s = layoutStateRef.current;
    return computeMapPadding({
      scale: s.compactMode ? 0.9 : 1,
      powerSearchMode: s.powerSearchMode,
      psFilterCollapsed: s.psFilterCollapsed,
      psResultsCollapsed: s.psResultsCollapsed,
      activeDrawer: s.activeDrawer,
      focusMode: s.focusMode,
      isPanelOpen: s.isPanelOpen,
      rightPanelCollapsed: s.rightPanelCollapsed,
    });
  }, []);

  useEffect(() => () => clearTimeout(flyToTimeoutRef.current), []);

  // Delay the flight by the right-panel transition when the panel is about to
  // open, so the camera (and the live padding measurement) targets the settled
  // layout instead of the mid-transition one.
  const scheduleFlyTo = useCallback((request, panelAlreadyOpen) => {
    clearTimeout(flyToTimeoutRef.current);
    if (!request) {
      setFlyToCoords(null);
    } else if (panelAlreadyOpen) {
      setFlyToCoords(request);
    } else {
      flyToTimeoutRef.current = setTimeout(() => setFlyToCoords(request), RIGHT_PANEL_TRANSITION_MS);
    }
  }, []);

  // ─── Right panel animation lifecycle ───
  useEffect(() => {
    if (isPanelOpen) {
      setRightPanelRendered(true);
      const timer = setTimeout(() => setRightPanelVisible(true), 10);
      return () => clearTimeout(timer);
    }
    setRightPanelVisible(false);
    const timer = setTimeout(() => setRightPanelRendered(false), RIGHT_PANEL_TRANSITION_MS);
    return () => clearTimeout(timer);
  }, [isPanelOpen]);

  // ─── Fetch detail for right panel ───
  const fetchDetail = useCallback(async (incidentId, opts = {}) => {
    if (!incidentId) {
      setDetail(null);
      return;
    }
    if (!opts.silent) setDetailLoading(true);
    try {
      const res = await api.getIncident(incidentId);
      setDetail(mapIncidentForShared(res.data));
    } catch (err) {
      console.error('Failed to fetch incident detail:', err);
      if (!opts.silent) setDetail(null);
    } finally {
      if (!opts.silent) setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedIncident?.id) {
      fetchDetail(selectedIncident.id);
    } else {
      setDetail(null);
    }
  }, [selectedIncident?.id, fetchDetail]);

  useEffect(() => {
    if (selectedIncident?.id && detailRefreshKey > 0) {
      fetchDetail(selectedIncident.id, { silent: true });
    }
  }, [detailRefreshKey, selectedIncident?.id, fetchDetail]);

  // ─── Handle viewport bounds changes from the map ───
  const handleViewportChange = useCallback(
    ({ bounds, center, zoom }) => {
      closeMapMenu();
      viewportBoundsRef.current = bounds;
      if (Number.isFinite(zoom)) setMapZoom(zoom);

      if (center && Number.isFinite(zoom)) {
        setSearchParams(
          () => {
            // Build from the LIVE URL: react-router's functional updater
            // receives a render-time (possibly stale) searchParams snapshot,
            // which would clobber a concurrent selection's incident/zone
            // param with the previous one.
            const next = new URLSearchParams(window.location.search);
            next.set('lat', center.lat.toFixed(6));
            next.set('lng', center.lng.toFixed(6));
            next.set('zoom', zoom.toFixed(2));
            if (!selectedIncidentRef.current) {
              // Only purge params for selections that were already handled and
              // are now gone (stale). A param whose deep-link has NOT been
              // processed yet is a selection still in flight (e.g. the
              // return-view restore) — purging it here would race the
              // deep-link effect and silently close the panel.
              const pendingIncident = next.get('incident');
              const pendingZone = next.get('zone');
              if (pendingIncident && incidentDeepLinkProcessedRef.current === pendingIncident) {
                next.delete('incident');
              }
              if (pendingZone && zoneDeepLinkProcessedRef.current === pendingZone) {
                next.delete('zone');
              }
            }
            return next;
          },
          { replace: true }
        );
      }

      if (viewportFilteringRef.current === true) {
        // Unbounded ranges must never send null dates (see the fetch effect).
        const effFrom = dateRange.from || '1970-01-01';
        const effTo = dateRange.to || '2099-12-31';
        const pointParams = {
          dateFrom: effFrom,
          dateTo: effTo,
          geometryType: 'point',
          viewport: bounds,
        };
        if (filters.categoryId) pointParams.categoryId = filters.categoryId;
        if (filters.severity) pointParams.severity = filters.severity;

        const zoneParams = {
          dateFrom: effFrom,
          dateTo: effTo,
          geometryType: 'polygon',
          viewport: bounds,
        };

        Promise.all([api.getIncidents(pointParams), api.getIncidents(zoneParams)])
          .then(([pointRes, zoneRes]) => {
            setIncidents([...(pointRes.data.incidents || []), ...(zoneRes.data.incidents || [])]);
            setTotalEventCount((pointRes.data.count || 0) + (zoneRes.data.count || 0));
          })
          .catch(() => setIncidents([]));
      }
    },
    [dateRange.from, dateRange.to, filters.categoryId, filters.severity, setSearchParams]
  );

  // ─── SSE Connection ───
  useEffect(() => {
    if (typeof EventSource === 'undefined') return;

    const url = `${API_BASE_URL}/incidents/stream`;
    const es = new EventSource(url);
    esRef.current = es;

    es.onopen = () => {
      console.log('[SSE] Connected to GeoWatch stream');
    };

    es.onmessage = (e) => {
      if (!e.data) return;
      try {
        const payload = JSON.parse(e.data);
        if (!payload.type) return;

        if (payload.type === 'incident_deleted' || payload.type === 'timeline_deleted') {
          if (payload.type === 'incident_deleted') {
            setIncidents((prev) => prev.filter((ev) => ev.id !== payload.incidentId));
          }
          return;
        }

        setActivities((prev) => {
          const last = prev[0];
          const now = Date.now();
          if (
            last &&
            last.type === payload.type &&
            last.incidentId === (payload.incidentId || payload.incident?.id) &&
            now - last.timestamp < 2000
          ) {
            return prev;
          }

          const activity = {
            type: payload.type,
            incidentId: payload.incidentId || payload.incident?.id,
            incident: payload.incident || null,
            update: payload.update || null,
            updateId: payload.updateId || null,
            timestamp: now,
            isUnread: true,
          };

          return [activity, ...prev].slice(0, MAX_ACTIVITIES);
        });

        if (payload.incident) {
          setIncidents((prev) => {
            const exists = prev.find((ev) => ev.id === payload.incident.id);
            if (exists) {
              return prev.map((ev) => (ev.id === payload.incident.id ? { ...ev, ...payload.incident } : ev));
            }
            return [payload.incident, ...prev];
          });
        }

        const currentSelected = selectedIncidentRef.current;
        const affectedIncidentId = payload.incidentId || payload.incident?.id;
        if (currentSelected?.id && affectedIncidentId === currentSelected.id) {
          if (payload.incident) {
            setSelectedIncident(payload.incident);
          }
          api.getIncident(currentSelected.id)
            .then((res) => {
              if (res.data?.incident) {
                setSelectedIncident(res.data.incident);
                setIncidents((prev) => prev.map((i) => (i.id === currentSelected.id ? res.data.incident : i)));
                setDetailRefreshKey((k) => k + 1);
              }
            })
            .catch(() => {});
        }
      } catch (err) {
        console.warn('[SSE] Failed to parse message:', err);
      }
    };

    es.onerror = (err) => {
      console.warn('[SSE] Connection error, will retry:', err);
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, []);

  // ─── Mark unread items based on lastSeenTimestamp ───
  useEffect(() => {
    setActivities((prev) =>
      prev.map((a) => ({
        ...a,
        isUnread: a.timestamp > lastSeenTimestamp,
      }))
    );
  }, [lastSeenTimestamp]);

  const unreadCount = activities.filter((a) => a.isUnread).length;

  // ─── "While you were away" banner on tab focus ───
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const lastSeen = getLastSeen();
        const nowTs = Date.now();
        if (nowTs - lastSeen > 30000) {
          const newEvents = activities.filter(
            (a) => a.timestamp > lastSeen && a.type === 'incident_created'
          ).length;
          const updatedEvents = activities.filter(
            (a) => a.timestamp > lastSeen && (a.type === 'incident_updated' || a.type === 'timeline_added')
          ).length;
          if (newEvents > 0 || updatedEvents > 0) {
            setAwayStats({ newEvents, updatedEvents });
            setShowAwayBanner(true);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [activities]);

  // ─── Selection handlers ───
  const handleSelectIncident = useCallback(
    (incident, opts = {}) => {
      const panelAlreadyOpen = isPanelOpen && !rightPanelCollapsed;
      if (focusMode) setFocusMode(false);
      setRightPanelCollapsed(false);
      setSelectedIncident(incident);

      const isPolygon = incident.geometry_type === 'polygon';
      const padding = getNextMapPadding({
        focusMode: false,
        activeDrawer: focusMode ? null : activeDrawer,
        rightPanelCollapsed: false,
        isPanelOpen: true,
      });

      if (!opts.skipFlyTo) {
        if (isPolygon) {
          if (skipNextZoneFitRef.current) {
            // Returning from a full-page zone view: the saved camera is
            // restored from the URL viewport params — no flight at all.
            skipNextZoneFitRef.current = false;
          } else {
            // Polygon rows from the list endpoint have null latitude/longitude
            // — the flight must target the geometry centroid instead.
            const centroid = getZoneCentroid(incident);
            const bounds = getZoneBounds(incident);
            if (centroid && bounds) {
              scheduleFlyTo({
                lat: centroid.lat,
                lng: centroid.lng,
                type: 'zone',
                source: opts.source || 'list',
                bounds,
                padding,
              }, panelAlreadyOpen);
            }
          }
        } else {
          scheduleFlyTo({
            lat: parseFloat(incident.latitude),
            lng: parseFloat(incident.longitude),
            type: 'incident',
            source: opts.source || 'list',
            padding,
          }, panelAlreadyOpen);
        }
      } else {
        scheduleFlyTo(null, true);
      }

      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (isPolygon) {
          next.set('zone', incident.id);
          next.delete('incident');
        } else {
          next.set('incident', incident.id);
          next.delete('zone');
        }
        return next;
      });
    },
    [focusMode, activeDrawer, isPanelOpen, rightPanelCollapsed, getNextMapPadding, setSearchParams, scheduleFlyTo]
  );

  const handleSelectEventFromActivity = useCallback(
    (incidentId, incidentData) => {
      if (incidentData && incidentData.latitude && incidentData.longitude) {
        handleSelectIncident(incidentData, { source: 'activity' });
        return;
      }
      const found = incidents.find((i) => i.id === incidentId);
      if (found) {
        handleSelectIncident(found, { source: 'activity' });
        return;
      }
      api
        .getIncident(incidentId)
        .then((res) => {
          if (res.data?.incident) handleSelectIncident(res.data.incident, { source: 'activity' });
        })
        .catch(() => {
          console.warn('Could not fetch incident', incidentId);
        });
    },
    [incidents, handleSelectIncident]
  );

  const handleBack = useCallback(() => {
    const map = mapRef.current?.getMap?.();
    if (map && typeof map.stop === 'function') {
      map.stop();
    }

    selectedIncidentRef.current = null;
    setSelectedIncident(null);
    scheduleFlyTo(null, true);

    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('incident');
        next.delete('zone');
        return next;
      },
      { replace: true }
    );
  }, [setSearchParams, scheduleFlyTo]);

  // Save the full return context (camera + date range + selection + drawer)
  // so a later Back — from a full-page detail view OR a directory page —
  // restores the map exactly as left. Detail navigation passes the target
  // selection explicitly; without one the current panel selection is saved.
  // Sets the `geowatch_user_returning` latch the mount-time restore effect
  // consumes. No-op until the map instance exists (map not ready).
  const saveMapReturnView = useCallback(
    (selection) => {
      const map = mapRef.current?.getMap?.();
      if (!map) return;
      const selId = selection ? selection.id : (selectedIncident?.id ?? null);
      const selIsZone = selection ? selection.isZone : selectedIncident?.geometry_type === 'polygon';
      const center = map.getCenter();
      const zoom = map.getZoom();
      // Full return context: Back must restore the date range (live or
      // historic), the selected incident/zone, the drawer, and the camera.
      // getCenter/getPadding are padding-aware, so saving the tuple
      // (center, zoom, bearing, pitch, padding) lets the map remount at
      // the exact framing the user left — no flight, no refit.
      sessionStorage.setItem(
        'geowatch_user_return_view',
        JSON.stringify({
          lat: center.lat,
          lng: center.lng,
          zoom,
          bearing: map.getBearing(),
          pitch: map.getPitch(),
          padding: map.getPadding(),
          dateRange: { from: dateRange.from ?? null, to: dateRange.to ?? null },
          isLiveMode,
          selectedIncidentId: selId && !selIsZone ? selId : null,
          selectedZoneId: selId && selIsZone ? selId : null,
          activeDrawer,
        })
      );
      sessionStorage.setItem('geowatch_user_returning', '1');
    },
    [selectedIncident, dateRange.from, dateRange.to, isLiveMode, activeDrawer]
  );

  const handleNavigateToFullPage = useCallback(
    (incidentId) => {
      const map = mapRef.current?.getMap?.();
      const isZone = selectedIncident?.geometry_type === 'polygon';

      const saveMapViewAndNavigate = () => {
        if (map) {
          saveMapReturnView({ id: incidentId, isZone });
          const center = map.getCenter();
          const zoom = map.getZoom();
          setSearchParams(
            (prev) => {
              const next = new URLSearchParams(prev);
              next.set('lat', center.lat.toFixed(6));
              next.set('lng', center.lng.toFixed(6));
              next.set('zoom', zoom.toFixed(2));
              return next;
            },
            { replace: true }
          );
        } else {
          sessionStorage.setItem('geowatch_user_returning', '1');
        }
        navigate(isZone ? `/zone/${incidentId}` : `/incident/${incidentId}`);
      };

      if (map && map.isMoving()) {
        map.once('moveend', saveMapViewAndNavigate);
      } else {
        saveMapViewAndNavigate();
      }
    },
    [navigate, selectedIncident?.geometry_type, setSearchParams, saveMapReturnView]
  );

  // Restore full map context when returning from a full-page detail view:
  // date range (live or historic — the mode pill and date control both derive
  // from it), the rail drawer, the camera, and the selected incident/zone.
  // The selection is restored through the normal ?incident=/?zone= deep-link
  // effects (skipFlyTo via the mount-time viewport snapshot) — no duplicated
  // selection logic. Missing fields (older payloads) degrade to viewport-only.
  useEffect(() => {
    if (sessionStorage.getItem('geowatch_user_returning') !== '1') return;
    sessionStorage.removeItem('geowatch_user_returning');
    const raw = sessionStorage.getItem('geowatch_user_return_view');
    sessionStorage.removeItem('geowatch_user_return_view');
    if (!raw) return;
    try {
      const payload = JSON.parse(raw);
      const {
        lat,
        lng,
        zoom,
        dateRange: savedRange,
        selectedIncidentId,
        selectedZoneId,
        activeDrawer: savedDrawer,
      } = payload;
      // Date state FIRST so the restored selection is inside the fetched window
      if (savedRange && ('from' in savedRange || 'to' in savedRange)) {
        setDateRange({ from: savedRange.from ?? null, to: savedRange.to ?? null });
      }
      if (savedDrawer) setActiveDrawer(savedDrawer);
      if (Number.isFinite(lat) && Number.isFinite(lng) && Number.isFinite(zoom)) {
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            next.set('lat', Number(lat).toFixed(6));
            next.set('lng', Number(lng).toFixed(6));
            next.set('zoom', Number(zoom).toFixed(2));
            if (selectedZoneId) {
              next.set('zone', selectedZoneId);
              next.delete('incident');
            } else if (selectedIncidentId) {
              next.set('incident', selectedIncidentId);
              next.delete('zone');
            }
            return next;
          },
          { replace: true }
        );
      }
    } catch {
      // ignore malformed stored view
    }
  }, [setSearchParams]);

  // ─── Handle incident ID from URL — robust deep-linking with ghost support ───
  useEffect(() => {
    if (!incidentIdFromUrl) {
      incidentDeepLinkProcessedRef.current = null;
      ghostFetchAttempted.current = false;
      return;
    }

    if (selectedIncident?.geometry_type === 'polygon') return;

    // Already handled this exact URL value. Router/identity churn can re-fire
    // this effect with a STALE param while an in-app selection is mid-flight;
    // without this guard the stale id would be re-selected and hijack the
    // camera (observed: a power-search click re-flew the previous selection at
    // deep-link zoom).
    if (incidentDeepLinkProcessedRef.current === incidentIdFromUrl) return;

    // Already-selected guard: when the URL param was written by an in-app
    // incident selection (map click, drawer, power search), the selection's
    // own flight already ran — mark it handled and do not re-fire a deep-link
    // flight that would hijack the source.
    const currentSelection = selectedIncidentRef.current;
    if (currentSelection?.id === incidentIdFromUrl && currentSelection?.geometry_type !== 'polygon') {
      incidentDeepLinkProcessedRef.current = incidentIdFromUrl;
      return;
    }

    const inList = incidents.find((i) => i.id === incidentIdFromUrl);
    if (inList) {
      incidentDeepLinkProcessedRef.current = incidentIdFromUrl;
      handleSelectIncident(inList, { skipFlyTo: initialUrlHadViewportRef.current, source: 'deep-link' });
      ghostFetchAttempted.current = true;
      return;
    }

    if (incidents.length > 0 && !ghostFetchAttempted.current) {
      ghostFetchAttempted.current = true;
      api
        .getIncident(incidentIdFromUrl)
        .then((res) => {
          if (res.data?.incident) {
            incidentDeepLinkProcessedRef.current = incidentIdFromUrl;
            handleSelectIncident(res.data.incident, { skipFlyTo: initialUrlHadViewportRef.current, source: 'deep-link' });
          }
        })
        .catch(() => {
          setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.delete('incident');
            return next;
          });
        });
    }
  }, [incidentIdFromUrl, incidents.length, handleSelectIncident, setSearchParams]);

  // ─── Handle zone ID from URL — deep-linking with ghost support ───
  useEffect(() => {
    if (!zoneIdFromUrl) {
      zoneDeepLinkProcessedRef.current = null;
      zoneGhostFetchAttempted.current = false;
      return;
    }

    // Already handled this exact URL value (see the incident effect above).
    if (zoneDeepLinkProcessedRef.current === zoneIdFromUrl) return;

    const currentZoneSelection = selectedIncidentRef.current;
    if (currentZoneSelection?.id === zoneIdFromUrl && currentZoneSelection?.geometry_type === 'polygon') {
      zoneDeepLinkProcessedRef.current = zoneIdFromUrl;
      return;
    }

    const inList = incidents.find((i) => i.id === zoneIdFromUrl);
    if (inList) {
      zoneDeepLinkProcessedRef.current = zoneIdFromUrl;
      handleSelectIncident(inList, { skipFlyTo: initialUrlHadViewportRef.current, source: 'deep-link' });
      zoneGhostFetchAttempted.current = true;
      return;
    }

    if (incidents.length > 0 && !zoneGhostFetchAttempted.current) {
      zoneGhostFetchAttempted.current = true;
      api
        .getIncident(zoneIdFromUrl)
        .then((res) => {
          if (res.data?.incident) {
            zoneDeepLinkProcessedRef.current = zoneIdFromUrl;
            handleSelectIncident(res.data.incident, { skipFlyTo: initialUrlHadViewportRef.current, source: 'deep-link' });
          }
        })
        .catch(() => {
          setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.delete('zone');
            return next;
          });
        });
    }
  }, [zoneIdFromUrl, incidents.length, handleSelectIncident, setSearchParams]);

  const handleResetToToday = useCallback(() => {
    setDateRange({ from: today, to: today });
  }, [today]);

  // ─── Layer filter handlers ───
  const handleToggleDomain = useCallback((slug) => {
    setActiveDomainFilters((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }, []);

  const handleShowAllDomains = useCallback(() => setActiveDomainFilters(new Set()), []);

  const handleHideAllDomains = useCallback(() => {
    setActiveDomainFilters(new Set(domains.map((d) => d.slug)));
  }, [domains]);

  const handleToggleZones = useCallback(() => {
    setActiveZoneSlugs((prev) => {
      if (prev.size > 0) return new Set();
      return new Set(zoneCategories.map((z) => z.slug).filter(Boolean));
    });
  }, [zoneCategories]);

  const handleToggleZoneCategory = useCallback((slug) => {
    setActiveZoneSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }, []);

  const handleShowAllZones = useCallback(() => {
    setActiveZoneSlugs(new Set(zoneCategories.map((z) => z.slug).filter(Boolean)));
  }, [zoneCategories]);

  const handleHideAllZones = useCallback(() => setActiveZoneSlugs(new Set()), []);

  // ─── Saved incident handlers ───
  const handleSaveChange = useCallback(
    async (incidentId, isSaved) => {
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (isSaved) next.add(incidentId);
        else next.delete(incidentId);
        return next;
      });
      if (isSaved) {
        setSavedIncidents((prev) => {
          if (prev.some((i) => i.id === incidentId)) return prev;
          const incident = incidents.find((i) => i.id === incidentId);
          if (incident) return [incident, ...prev];
          return prev;
        });
      } else {
        setSavedIncidents((prev) => prev.filter((i) => i.id !== incidentId));
      }
      await refreshSaves();
    },
    [incidents, refreshSaves]
  );

  const handleToggleSave = useCallback(
    async (incidentId) => {
      const isSaved = savedIds.has(incidentId);
      await handleSaveChange(incidentId, !isSaved);
      closeMapMenu();
    },
    [savedIds, handleSaveChange, closeMapMenu]
  );

  // ─── Map context menu handlers ───
  const handleMarkerContextMenu = useCallback(
    (incident, point) => {
      openMapMenu(point, { type: 'incident', incident });
    },
    [openMapMenu]
  );

  const handleZoneContextMenu = useCallback(
    (feature, point, latLng) => {
      const zoneId = feature?.properties?.id || feature?.id;
      const zone = polygonIncidents.find((z) => String(z.id) === String(zoneId));
      if (zone) {
        openMapMenu(point, { type: 'zone', zone, latLng });
      } else {
        openMapMenu(point, { type: 'empty', latLng });
      }
    },
    [openMapMenu, polygonIncidents]
  );

  const handleMapContextMenu = useCallback(
    (point, latLng) => {
      openMapMenu(point, { type: 'empty', latLng });
    },
    [openMapMenu]
  );

  const copyCoordinates = useCallback(
    async (lat, lng) => {
      try {
        await navigator.clipboard.writeText(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      } catch {}
      closeMapMenu();
    },
    [closeMapMenu]
  );

  const copyLink = useCallback(
    async (key, id) => {
      const url = new URL(window.location.href);
      url.searchParams.set(key, id);
      try {
        await navigator.clipboard.writeText(url.toString());
      } catch {}
      closeMapMenu();
    },
    [closeMapMenu]
  );

  const handleCenterMapHere = useCallback(
    (lng, lat) => {
      mapRef.current?.centerAt(lng, lat);
      closeMapMenu();
    },
    [closeMapMenu]
  );

  const handleResetMapView = useCallback(() => {
    mapRef.current?.resetView();
    closeMapMenu();
  }, [closeMapMenu]);

  const buildEmptyMenuItems = useCallback(
    (latLng) => {
      if (!latLng) return [];
      const { lat, lng } = latLng;
      return [
        { label: 'Center Map Here', onClick: () => handleCenterMapHere(lng, lat) },
        { label: 'Copy Coordinates', onClick: () => copyCoordinates(lat, lng) },
        { label: 'Reset Map View', onClick: handleResetMapView },
      ];
    },
    [handleCenterMapHere, copyCoordinates, handleResetMapView]
  );

  const buildIncidentMenuItems = useCallback(
    (incident) => {
      if (!incident) return [];
      const isSaved = savedIds.has(incident.id);
      return [
        {
          label: 'View Details',
          onClick: () => {
            handleSelectIncident(incident, { source: 'map' });
            closeMapMenu();
          },
        },
        {
          label: isSaved ? 'Unsave Incident' : 'Save Incident',
          onClick: () => {
            if (!isAuthenticated) {
              openSignInModal();
            } else {
              handleToggleSave(incident.id);
            }
            closeMapMenu();
          },
        },
        { label: 'Share Incident', onClick: () => copyLink('incident', incident.id) },
      ];
    },
    [savedIds, isAuthenticated, handleSelectIncident, handleToggleSave, copyLink, closeMapMenu, openSignInModal]
  );

  const buildZoneMenuItems = useCallback(
    (zone) => {
      if (!zone) return [];
      const isSaved = savedIds.has(zone.id);
      return [
        {
          label: 'View Zone Details',
          onClick: () => {
            handleSelectIncident(zone, { source: 'map' });
            closeMapMenu();
          },
        },
        {
          label: isSaved ? 'Unsave Zone' : 'Save Zone',
          onClick: () => {
            if (!isAuthenticated) {
              openSignInModal();
            } else {
              handleToggleSave(zone.id);
            }
            closeMapMenu();
          },
        },
        { label: 'Share Zone', onClick: () => copyLink('zone', zone.id) },
      ];
    },
    [savedIds, isAuthenticated, handleSelectIncident, handleToggleSave, copyLink, closeMapMenu, openSignInModal]
  );

  const handleMarkAllRead = useCallback(() => {
    const nowTs = Date.now();
    setLastSeenTimestamp(nowTs);
    setLastSeen(nowTs);
  }, []);

  const handleDismissAway = useCallback(() => {
    handleMarkAllRead();
    setShowAwayBanner(false);
  }, [handleMarkAllRead]);

  const handleJumpToNew = useCallback(() => {
    setActiveDrawer('activity');
    handleMarkAllRead();
    setShowAwayBanner(false);
  }, [handleMarkAllRead]);

  const handleSwitchToIncidentDate = (incident) => {
    const incidentDate = incident.start_date
      ? (() => {
          const d = new Date(incident.start_date);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        })()
      : today;
    setDateRange({ from: incidentDate, to: incidentDate });
  };

  // ─── Power Search API integration ───
  const runPowerSearch = useCallback(
    async (replace = true) => {
      if (!powerSearchMode) return;
      setPsLoading(true);
      setPsError('');
      try {
        const params = {
          q: psQuery.trim(),
          domainSlugs: psFilters.domainSlugs,
          categorySlugs: psFilters.categorySlugs,
          statuses: psFilters.statuses,
          verificationStatuses: psFilters.verificationStatuses,
          sourceTypes: psFilters.sourceTypes,
          severities: psFilters.severities,
          geometryTypes: psFilters.geometryTypes,
          savedOnly: psFilters.savedOnly,
          dateFrom: psFilters.dateFrom || undefined,
          dateTo: psFilters.dateTo || undefined,
          sort: psSort,
          limit: PS_PAGE_SIZE,
          offset: replace ? 0 : psResults.length,
        };
        const res = await api.searchIncidentsAdvanced(params);
        const fetched = res.data?.incidents || [];
        const count = res.data?.count || 0;
        setPsResults(replace ? fetched : [...psResults, ...fetched]);
        setPsTotal(count);
      } catch (err) {
        console.error('Power search failed:', err);
        setPsError(err.message || 'Search failed');
        if (replace) {
          setPsResults([]);
          setPsTotal(0);
        }
      } finally {
        setPsLoading(false);
      }
    },
    [powerSearchMode, psQuery, psFilters, psSort, psResults.length]
  );

  useEffect(() => {
    if (!powerSearchMode) return;
    const timer = setTimeout(() => runPowerSearch(true), 250);
    return () => clearTimeout(timer);
  }, [powerSearchMode, psQuery, psFilters, psSort, runPowerSearch]);

  const handlePowerSearchSelect = useCallback(
    (incident) => {
      if (!incident) return;
      const panelAlreadyOpen = isPanelOpen && !rightPanelCollapsed;
      if (focusMode) setFocusMode(false);
      setRightPanelCollapsed(false);
      const isPolygon = incident.geometry_type === 'polygon';
      const padding = getNextMapPadding({
        powerSearchMode: true,
        focusMode: false,
        activeDrawer: null,
        isPanelOpen: true,
        rightPanelCollapsed: false,
      });

      if (isPolygon) {
        const centroid = getZoneCentroid(incident);
        const bounds = getZoneBounds(incident);
        if (centroid && bounds) {
          setSelectedIncident(incident);
          scheduleFlyTo({
            type: 'zone',
            source: 'power-search',
            lat: centroid.lat,
            lng: centroid.lng,
            bounds,
            padding,
          }, panelAlreadyOpen);
        }
      } else {
        setSelectedIncident(incident);
        scheduleFlyTo({
          lat: parseFloat(incident.latitude),
          lng: parseFloat(incident.longitude),
          type: 'incident',
          source: 'power-search',
          padding,
        }, panelAlreadyOpen);
      }

      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (isPolygon) {
          next.set('zone', incident.id);
          next.delete('incident');
        } else {
          next.set('incident', incident.id);
          next.delete('zone');
        }
        return next;
      });
    },
    [focusMode, isPanelOpen, rightPanelCollapsed, getNextMapPadding, setSearchParams, scheduleFlyTo]
  );

  const handleToggleSavedPowerSearch = useCallback(
    async (incidentId) => {
      if (!isAuthenticated) {
        openSignInModal();
        return;
      }
      const isSaved = savedIds.has(incidentId);
      await handleSaveChange(incidentId, !isSaved);
    },
    [isAuthenticated, savedIds, handleSaveChange, openSignInModal]
  );

  const handlePowerSearchLoadMore = useCallback(() => {
    runPowerSearch(false);
  }, [runPowerSearch]);

  const handleResetPowerSearchFilters = useCallback(() => {
    setPsFilters(DEFAULT_PS_FILTERS);
    setPsQuery('');
    setPsSort('newest');
  }, []);

  // ─── Keyboard shortcuts ───
  useEffect(() => {
    function onKeyDown(e) {
      if (powerSearchMode || commandPaletteOpen) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
      if (e.key === 'Escape' && activeDrawer) {
        setActiveDrawer(null);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [powerSearchMode, commandPaletteOpen, activeDrawer]);

  // ─── Command palette selection ───
  const handleCommandPaletteSelectIncident = useCallback(
    (incident) => {
      handleSelectIncident(incident, { source: 'command-palette' });
    },
    [handleSelectIncident]
  );

  const handleCommandPaletteSelectLocation = useCallback(
    ({ lat, lng, zoom }) => {
      setFlyToCoords({ lat, lng, zoom: zoom || 11, type: 'location', source: 'command-palette' });
    },
    []
  );

  const handleCommandPaletteOpenLayers = useCallback(() => {
    if (focusMode) setFocusMode(false);
    setActiveDrawer('layers');
  }, [focusMode]);

  const handleCommandPaletteOpenSaved = useCallback(() => {
    if (focusMode) setFocusMode(false);
    setActiveDrawer('saved');
  }, [focusMode]);

  const handleCommandPaletteToggleFocus = useCallback(() => {
    setFocusMode((prev) => !prev);
  }, []);

  const handleCommandPaletteOpenAdvanced = useCallback(() => {
    setPowerSearchMode(true);
  }, []);

  // ─── Rail items ───
  const railItems = useMemo(
    () => [
      { id: 'layers', label: 'Layers', icon: Layers },
      { id: 'incidents', label: 'Incidents', icon: AlertTriangle },
      { id: 'active', label: 'Active', icon: Zap, badge: activeIncidents.length },
      { id: 'activity', label: 'Activity', icon: ActivityIcon, badge: unreadCount },
      ...(isAuthenticated
        ? [{ id: 'saved', label: 'Saved', icon: Bookmark, badge: savedIncidents.length }]
        : []),
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
    [activeIncidents.length, unreadCount, isAuthenticated, savedIncidents.length]
  );

  // ─── Ghost detection ───
  const ghostIncident =
    selectedIncident && selectedIncident.geometry_type !== 'polygon' && !incidents.find((i) => i.id === selectedIncident.id)
      ? selectedIncident
      : null;
  const ghostZone =
    selectedIncident?.geometry_type === 'polygon' && !polygonIncidents.find((z) => z.id === selectedIncident.id)
      ? selectedIncident
      : null;

  const bannerPadding = getBannerPadding();

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: 'var(--bg-deep)',
      }}
    >
      {!powerSearchMode && (
        <WorkspaceTopBar
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          onResetToToday={handleResetToToday}
          isLiveMode={isLiveMode}
          onOpenSearch={() => setCommandPaletteOpen(true)}
          onOpenAdvancedSearch={() => setPowerSearchMode(true)}
          onToggleFocusMode={() => {
            setFocusMode((prev) => {
              if (!prev) {
                preFocusRightCollapsedRef.current = rightPanelCollapsed;
                setRightPanelCollapsed(true);
              } else {
                setRightPanelCollapsed(preFocusRightCollapsedRef.current);
              }
              return !prev;
            });
          }}
          isFocusMode={focusMode}
          compactMode={compactMode}
          onSaveReturnView={saveMapReturnView}
        />
      )}

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        {!powerSearchMode && (
          <WorkspaceRail
            items={railItems}
            activeId={activeDrawer}
            onSelect={(id) => {
              if (focusMode) setFocusMode(false);
              setActiveDrawer((p) => (p === id ? null : id));
            }}
            compactMode={compactMode}
          />
        )}

        {activeDrawer && !focusMode && !powerSearchMode && (
          <WorkspaceDrawer
            activeDrawer={activeDrawer}
            onClose={() => setActiveDrawer(null)}
            domains={domains}
            zoneCategories={zoneCategories}
            activeDomainSlugs={visibleDomainSlugs}
            activeZoneSlugs={activeZoneSlugs}
            onToggleDomain={handleToggleDomain}
            onToggleZone={handleToggleZoneCategory}
            onShowAllDomains={handleShowAllDomains}
            onHideAllDomains={handleHideAllDomains}
            onShowAllZones={handleShowAllZones}
            onHideAllZones={handleHideAllZones}
            visibleIncidents={visibleIncidents}
            onSelectIncident={handleSelectIncident}
            activeIncidents={activeIncidents}

            activities={activities}
            activityLastSeenAt={lastSeenTimestamp}
            onMarkAllActivitySeen={handleMarkAllRead}
            onSelectActivityIncident={handleSelectEventFromActivity}
            savedIncidents={visibleSavedIncidents}
            onSelectSavedIncident={handleSelectIncident}
            onUnsaveIncident={(id) => handleSaveChange(id, false)}
            autoZoomEnabled={autoZoomEnabled}
            onToggleAutoZoom={() => setAutoZoomEnabled((p) => !p)}
            compactMode={compactMode}
            onToggleCompactMode={() => setCompactMode((p) => !p)}
          />
        )}

        <div
          style={{
            flex: 1,
            position: 'relative',
            minWidth: 0,
            background: 'var(--bg-deep)',
          }}
        >
          <UserMap
            ref={mapRef}
            incidents={powerSearchMode ? psResults.filter((i) => i.geometry_type !== 'polygon') : visibleIncidents}
            zones={powerSearchMode ? psResults.filter((i) => i.geometry_type === 'polygon') : polygonIncidents}
            selectedEventId={
              powerSearchMode && selectedIncident?.geometry_type === 'polygon' ? null : selectedIncident?.id
            }
            selectedZoneId={
              powerSearchMode && selectedIncident?.geometry_type === 'polygon'
                ? selectedIncident.id
                : selectedIncident?.geometry_type === 'polygon'
                ? selectedIncident.id
                : null
            }
            onEventClick={(incident) => handleSelectIncident(incident, { source: 'map' })}
            onZoneClick={(zone) => handleSelectIncident(zone, { source: 'map' })}
            onViewportChange={handleViewportChange}
            flyToCoords={flyToCoords}
            initialViewport={
              hasViewportParams
                ? {
                    center: [parseFloat(lngParam), parseFloat(latParam)],
                    zoom: parseFloat(zoomParam),
                    ...(returnView && Number.isFinite(returnView.bearing)
                      ? { bearing: returnView.bearing }
                      : {}),
                    ...(returnView && Number.isFinite(returnView.pitch)
                      ? { pitch: returnView.pitch }
                      : {}),
                    ...(returnView?.padding ? { padding: returnView.padding } : {}),
                  }
                : null
            }
            ghostIncident={ghostIncident}
            ghostZone={ghostZone}
            showZones={powerSearchMode ? true : showZones}
            onMarkerContextMenu={handleMarkerContextMenu}
            onZoneContextMenu={handleZoneContextMenu}
            onMapContextMenu={handleMapContextMenu}
            autoZoomEnabled={autoZoomEnabled}
            getMapPadding={getCurrentMapPadding}
          />

          {mapMenuOpen && (
            <MapContextMenu
              position={mapMenuPosition}
              items={
                mapMenuFeature?.type === 'incident'
                  ? buildIncidentMenuItems(mapMenuFeature.incident)
                  : mapMenuFeature?.type === 'zone'
                  ? buildZoneMenuItems(mapMenuFeature.zone)
                  : buildEmptyMenuItems(mapMenuFeature?.latLng)
              }
              onClose={closeMapMenu}
            />
          )}



          {/* Incident counter + viewport filtering indicator overlay */}
          {!powerSearchMode && !focusMode && (
            <div
              style={{
                position: 'absolute',
                top: '12px',
                left: '12px',
                background: 'var(--bg-surface)',
                backdropFilter: 'blur(8px)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 14px',
                fontSize: '12px',
                color: 'var(--text-secondary)',
                zIndex: 10,
                maxWidth: '320px',
                lineHeight: 1.5,
              }}
            >
              <div>
                <span style={{ color: 'var(--accent-light)', fontWeight: 700 }}>{visibleIncidents.length}</span>
                {' incidents visible'}
                {showZones && (
                  <>
                    {' · '}
                    <span style={{ color: 'var(--accent-light)', fontWeight: 700 }}>{polygonIncidents.length}</span>
                    {' zones'}
                  </>
                )}
                {viewportFiltering === true && (
                  <span style={{ color: 'var(--text-muted)' }}> in current map area</span>
                )}
              </div>
              {viewportFiltering === true && totalEventCount > 100 && (
                <div style={{ fontSize: '11px', color: 'var(--warning)', marginTop: '4px' }}>
                  {totalEventCount > 300
                    ? `${totalEventCount}+ total incidents match this date range — zoom or pan to explore`
                    : `${totalEventCount} total incidents match this date range — zoom or pan to explore`}
                </div>
              )}
              {isRangeGated && (
                <div style={{ fontSize: '11px', color: 'var(--warning)', marginTop: '4px' }}>
                  zoom in to load incidents
                </div>
              )}
            </div>
          )}

          {/* Large-range gate hint — point incidents withheld below the gate zoom */}
          {isRangeGated && (
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'var(--bg-surface)',
                backdropFilter: 'blur(8px)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 14px',
                fontSize: '12px',
                color: 'var(--text-secondary)',
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: 'var(--shadow-md)',
                pointerEvents: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: 'var(--warning)',
                  flexShrink: 0,
                }}
              />
              Zoom in to load incidents for this range
            </div>
          )}

          {/* Ghost incident banner */}
          {ghostIncident && (
            <div
              style={{
                position: 'absolute',
                bottom: '16px',
                left: `calc(${bannerPadding.left}px + 16px)`,
                right: `calc(${bannerPadding.right}px + 16px)`,
                transform: 'none',
                zIndex: 20,
                background: 'var(--bg-surface)',
                backdropFilter: 'blur(12px)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              <div
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: 'var(--text-muted)',
                  border: '2px dashed var(--text-muted)',
                  flexShrink: 0,
                }}
              />
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.4 }}>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{ghostIncident.title}</span>{' '}
                  occurred on{' '}
                  <span style={{ color: 'var(--accent-light)', fontWeight: 600 }}>
                    {ghostIncident.start_date
                      ? new Date(ghostIncident.start_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : 'unknown date'}
                  </span>
                  {' — outside your current date range'}
                </p>
              </div>
              <button
                onClick={() => handleSwitchToIncidentDate(ghostIncident)}
                style={{
                  padding: '6px 14px',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--accent-light)',
                  background: 'var(--accent-subtle-bg)',
                  color: 'var(--accent-light)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--accent-subtle-border)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--accent-subtle-bg)';
                }}
              >
                Switch to this date
              </button>
            </div>
          )}

          {/* Away banner */}
          {showAwayBanner && (
            <AwayBanner
              newEventsCount={awayStats.newEvents}
              updatedEventsCount={awayStats.updatedEvents}
              onJumpToNew={handleJumpToNew}
              onDismiss={handleDismissAway}
            />
          )}
        </div>

        {/* Right detail panel — absolute overlay */}
        {rightPanelRendered && (
          <div
            style={{
              position: 'absolute',
              top: powerSearchMode ? 'calc(var(--admin-ps-topbar-height) + var(--admin-ps-chips-height))' : 0,
              right: 0,
              bottom: 0,
              width: 'var(--admin-right-panel-width)',
              background: 'var(--bg-surface)',
              borderLeft: '1px solid var(--border-default)',
              boxShadow: 'var(--shadow-lg)',
              zIndex: 70,
              transform: `translateX(${rightPanelVisible && !rightPanelCollapsed ? '0%' : '100%'})`,
              transition: `transform ${RIGHT_PANEL_TRANSITION_MS}ms ease`,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {detailLoading || !detail?.incident ? (
              <div
                style={{
                  flex: 1,
                  padding: 'calc(20px * var(--admin-ui-scale))',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                }}
              >
                {/* Sidebar-shaped skeleton — the panel arrives composed */}
                <div style={{ display: 'flex', gap: 'calc(8px * var(--admin-ui-scale))', marginBottom: 'calc(18px * var(--admin-ui-scale))' }}>
                  <Skeleton width="72px" height="20px" style={{ borderRadius: 'var(--radius-pill)' }} />
                  <Skeleton width="92px" height="20px" style={{ borderRadius: 'var(--radius-pill)' }} />
                  <Skeleton width="60px" height="20px" style={{ borderRadius: 'var(--radius-pill)' }} />
                </div>
                <Skeleton height="26px" width="78%" style={{ marginBottom: 'calc(10px * var(--admin-ui-scale))' }} />
                <Skeleton height="14px" width="46%" style={{ marginBottom: 'calc(22px * var(--admin-ui-scale))' }} />
                {['86%', '68%', '76%'].map((w, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'calc(10px * var(--admin-ui-scale))', marginBottom: 'calc(12px * var(--admin-ui-scale))' }}>
                    <Skeleton width="15px" height="15px" style={{ borderRadius: '50%', flexShrink: 0 }} />
                    <Skeleton height="12px" width={w} />
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 'calc(10px * var(--admin-ui-scale))', margin: 'calc(20px * var(--admin-ui-scale)) 0' }}>
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} height="72px" style={{ flex: 1 }} />
                  ))}
                </div>
                <Skeleton height="12px" style={{ marginBottom: 'calc(9px * var(--admin-ui-scale))' }} />
                <Skeleton height="12px" style={{ marginBottom: 'calc(9px * var(--admin-ui-scale))' }} />
                <Skeleton height="12px" width="58%" />
              </div>
            ) : (
              <>
                {panelMode === 'incident' && (
                  <IncidentDetailSidebar
                    incident={detail.incident}
                    timeline={detail.timeline}
                    mode="user"
                    onNavigateToFullPage={handleNavigateToFullPage}
                    onCopyIncidentLink={async (id) => {
                      try {
                        await navigator.clipboard.writeText(`${window.location.origin}/incident/${id}`);
                      } catch {}
                    }}
                    onSave={async (id) => {
                      if (!isAuthenticated) {
                        openSignInModal();
                        return;
                      }
                      await handleToggleSave(id);
                    }}
                    isSaved={savedIds.has(selectedIncident?.id)}
                    onCollapse={() => setRightPanelCollapsed((p) => !p)}
                  />
                )}
                {panelMode === 'zone' && (
                  <ZoneDetailSidebar
                    incident={detail.incident}
                    timeline={detail.timeline}
                    mode="user"
                    onBack={handleBack}
                    // The shared sidebar invokes this with the click event, so
                    // wrap it — handleNavigateToFullPage expects the zone id
                    // (incident sidebar passes the id itself).
                    onFullDetails={() => handleNavigateToFullPage(selectedIncident?.id)}
                    onShare={async () => {
                      try {
                        await navigator.clipboard.writeText(`${window.location.origin}/zone/${selectedIncident?.id}`);
                      } catch {}
                    }}
                    onSave={async () => {
                      if (!isAuthenticated) {
                        openSignInModal();
                        return;
                      }
                      await handleToggleSave(selectedIncident?.id);
                    }}
                    isSaved={savedIds.has(selectedIncident?.id)}
                    onCollapse={() => setRightPanelCollapsed((p) => !p)}
                  />
                )}
              </>
            )}
          </div>
        )}

        {/* Collapsed right-panel expand handle */}
        {isPanelOpen && rightPanelCollapsed && !rightPanelRendered && (
          <button
            type="button"
            onClick={() => setRightPanelCollapsed(false)}
            title="Expand sidebar"
            style={{
              position: 'absolute',
              top: '50%',
              right: 0,
              transform: 'translateY(-50%)',
              zIndex: 100,
              width: 'calc(32px * var(--admin-ui-scale))',
              height: 'calc(96px * var(--admin-ui-scale))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRight: 'none',
              borderRadius: 'var(--radius-md) 0 0 var(--radius-md)',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-md)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent-light)';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-subtle)';
              e.currentTarget.style.color = 'var(--text-muted)';
            }}
          >
            <ChevronLeft size={compactMode ? 16 : 18} />
          </button>
        )}

        {/* Power Search full-viewport overlay */}
        {powerSearchMode && (
          <PowerSearchPanel
            isOpen={powerSearchMode}
            onClose={() => setPowerSearchMode(false)}
            query={psQuery}
            onQueryChange={setPsQuery}
            filters={psFilters}
            onFiltersChange={setPsFilters}
            sortBy={psSort}
            onSortChange={setPsSort}
            results={psResults}
            total={psTotal}
            loading={psLoading}
            error={psError}
            hasMore={psResults.length < psTotal}
            onLoadMore={handlePowerSearchLoadMore}
            savedIds={savedIds}
            domains={psDomains}
            categories={categories}
            onSelectIncident={handlePowerSearchSelect}
            onToggleSaved={handleToggleSavedPowerSearch}
            onResetFilters={handleResetPowerSearchFilters}
            compactMode={compactMode}
            filterCollapsed={psFilterCollapsed}
            onFilterCollapsedChange={setPsFilterCollapsed}
            resultsCollapsed={psResultsCollapsed}
            onResultsCollapsedChange={setPsResultsCollapsed}
          />
        )}
      </div>

      <UserCommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        incidents={incidents}
        savedIds={savedIds}
        onSelectIncident={handleCommandPaletteSelectIncident}
        onSelectLocation={handleCommandPaletteSelectLocation}
        onOpenLayers={handleCommandPaletteOpenLayers}
        onOpenSaved={handleCommandPaletteOpenSaved}
        onToggleFocusMode={handleCommandPaletteToggleFocus}
        onOpenAdvancedSearch={handleCommandPaletteOpenAdvanced}
      />
    </div>
  );
}
