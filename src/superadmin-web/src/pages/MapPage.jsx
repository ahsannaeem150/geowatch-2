import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  PanelLeftOpen,
  Layers,
  List,
  Radio,
  Activity as ActivityIcon,
  Bell,
  Bookmark,
  Clock,
  Settings,
  ChevronLeft,
  Plus,
  Hexagon,
  Zap,
  Search,
  LayoutDashboard,
  Users,
  Globe,
  Map as MapIcon,
  ClipboardList,
  Eye,
  Trash2,
  Tags,
  Download,
  Archive,
} from 'lucide-react';
import {
  getIncidents,
  getIncident,
  getDeletedIncident,
  createIncident,
  updateIncident,
  deleteIncident,
  resolveIncident,
  restoreIncident,
  purgeIncident,
  getDomains,
  listAllCategories,
  listZoneCategories,
  searchIncidentsAdvanced,
  mapIncidentForShared,
  addTimeline,
  updateTimeline,
  deleteTimeline,
  addSource,
  updateSource,
  deleteSource,
  pinSource,
  checkSource,
  uploadMedia,
  updateMedia,
  deleteMedia,
  pinMedia,
  setFeatured,
  clearFeatured,
  listAuditLogs,
} from '../services/api.js';
import { API_BASE_URL } from '@shared/constants.js';
import { IncidentDetailSidebar, ZoneDetailSidebar, CommandPalette } from '@shared';
import SuperadminMap from '../components/Map/SuperadminMap.jsx';
import DrawingToolbar from '../components/Map/DrawingToolbar.jsx';
import PlacementToolbar from '../components/Map/PlacementToolbar.jsx';
import ZoneForm from '../components/ZoneForm/ZoneForm.jsx';
import IncidentDetailPanel from '../components/Map/IncidentDetailPanel.jsx';
import WorkspaceTopBar from '../components/MapWorkspace/WorkspaceTopBar.jsx';
import WorkspaceRail from '@shared/components/WorkspaceRail.jsx';
import WorkspaceDrawer from '../components/MapWorkspace/WorkspaceDrawer.jsx';
import PowerSearchPanel from '../components/PowerSearchPanel/PowerSearchPanel.jsx';
import MapContextMenu from '@shared/components/MapContextMenu.jsx';
import { useMapContextMenu } from '@shared/hooks/useMapContextMenu.js';
import { ConfirmDialog } from '@shared/components/ConfirmDialog.jsx';
import IncidentForm from '../components/IncidentForm/IncidentForm.jsx';
import ActivityInspectorSidebar from '../components/Audit/ActivityInspectorSidebar.jsx';
import RecycleBinSidebar from '../components/Map/RecycleBinSidebar.jsx';
import UserDetailDrawer from '../components/Users/UserDetailDrawer.jsx';
import PublicUserDrawer from '../components/PublicUsers/PublicUserDrawer.jsx';
import AuditTable from '../components/Audit/AuditTable.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useStaffNotifications } from '../hooks/useStaffNotifications.js';
import { useStaffSavedIncidents } from '../hooks/useStaffSavedIncidents.js';
import { useStaffRecents } from '../hooks/useStaffRecents.js';
import { useSearchCategories } from '../hooks/useSearchCategories.js';
import { computeMapPadding } from '../utils/mapPadding.js';
import { estimatePolygonAreaSqM, formatArea } from '@shared/utils/zoneGeometry.js';

const LS_KEY = 'geowatch_superadmin_last_seen';
const LS_COMPACT = 'geowatch_superadmin_compact_mode';
const LS_AUTO_ZOOM = 'geowatch_superadmin_auto_zoom';
const MAX_ACTIVITIES = 50;
const RIGHT_PANEL_TRANSITION_MS = 250;
const PS_PAGE_SIZE = 25;

const DEFAULT_PS_FILTERS = {
  dateFrom: '',
  dateTo: '',
  domainSlugs: [],
  categorySlugs: [],
  severities: [],
  statuses: [],
  verificationStatuses: [],
  sourceTypes: [],
  geometryTypes: [],
  savedOnly: false,
};

const SORT_OPTIONS_PS = [
  { key: 'relevance', api: 'relevance' },
  { key: 'newest', api: 'newest' },
  { key: 'oldest', api: 'oldest' },
  { key: 'severity-desc', api: 'severity_desc' },
  { key: 'severity-asc', api: 'severity_asc' },
  { key: 'name', api: 'name_asc' },
];

function getLastSeen() {
  const raw = localStorage.getItem(LS_KEY);
  return raw ? parseInt(raw, 10) : Date.now();
}

function setLastSeen(ts) {
  localStorage.setItem(LS_KEY, String(ts));
}

// Flightradar-style large-range gating: date ranges spanning more than this
// many days (or an unbounded "All time") only load point incidents once the
// map is zoomed to GATE_ZOOM or closer; polygon zones always load.
const LARGE_RANGE_DAYS = 31;
const GATE_ZOOM = 6;

export default function MapPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const incidentIdFromUrl = searchParams.get('incident');
  const zoneIdFromUrl = searchParams.get('zone');

  // ─── Deep-link params ───
  const dateParam = searchParams.get('date');
  const fromParam = searchParams.get('from');
  const toParam = searchParams.get('to');
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
  // Viewport params appended AFTER mount by the app's own viewport sync
  // (handleViewportChange) are not a saved position. Freeze the flag to what
  // the URL carried when this page mounted, so incident/zone deep-link
  // flights still fire once the sync has written lat/lng/zoom into the URL.
  const savedViewportRef = useRef(undefined);
  if (savedViewportRef.current === undefined) {
    savedViewportRef.current = hasViewportParams
      ? { lat: parseFloat(latParam), lng: parseFloat(lngParam), zoom: parseFloat(zoomParam) }
      : null;
  }
  const hasSavedViewport = !!savedViewportRef.current;

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
      const raw = sessionStorage.getItem('geowatch_superadmin_return_view');
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

  const refParam = searchParams.get('ref');
  const actorParam = searchParams.get('actor');
  const returnToParam = searchParams.get('returnTo');
  const staffUserId = searchParams.get('staffUserId');
  const publicUserId = searchParams.get('publicUserId');

  // ─── Date & filters ───
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const initialFrom = dateParam || fromParam || today;
  const initialTo = dateParam || toParam || today;
  const [dateRange, setDateRange] = useState({ from: initialFrom, to: initialTo });
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [selectedIncidentDetail, setSelectedIncidentDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditDrawerOpen, setAuditDrawerOpen] = useState(false);
  const [auditPagination, setAuditPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [auditLoading, setAuditLoading] = useState(false);
  const [flyToCoords, setFlyToCoords] = useState(
    latParam && lngParam && !returnView
      ? { lat: parseFloat(latParam), lng: parseFloat(lngParam), zoom: zoomParam ? parseFloat(zoomParam) : 10 }
      : null
  );
  const [refreshKey, setRefreshKey] = useState(0);
  const [filters, setFilters] = useState({
    categoryId: searchParams.get('categoryId') || '',
    severity: '',
    status: searchParams.get('status') || '',
  });

  // ─── Zones (polygon incidents) ───
  const [selectedZoneId, setSelectedZoneId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // ─── Zone Drawing ───
  const [mapMode, setMapMode] = useState('pan'); // 'pan' | 'polygon'
  const [drawVertices, setDrawVertices] = useState([]);
  const [isPolygonClosed, setIsPolygonClosed] = useState(false);
  const isPolygonClosedRef = useRef(isPolygonClosed);
  const [showZoneCreatePanel, setShowZoneCreatePanel] = useState(false);
  const [zoneInfoEditMode, setZoneInfoEditMode] = useState(false);
  const [selectedDrawVertexIndex, setSelectedDrawVertexIndex] = useState(null);

  // ─── Zone Editing ───
  const [editingZoneId, setEditingZoneId] = useState(null);
  const [editingZoneVertices, setEditingZoneVertices] = useState([]);
  const [originalZoneVertices, setOriginalZoneVertices] = useState([]);
  const [selectedEditVertexIndex, setSelectedEditVertexIndex] = useState(null);

  // ─── Map context menu ───
  const mapRef = useRef(null);
  const prevIncidentIdRef = useRef(null);
  // Live mirror of the current selection for deep-link already-selected guards.
  const selectedIncidentRef = useRef(null);
  selectedIncidentRef.current = selectedIncident;
  // Deep-link stale-URL guards. In-app selections write ?incident/?zone via
  // React Router transitions that can take arbitrarily long to land (and can
  // be superseded), so the deep-link effects can fire while the URL param is
  // still stale. Each effect stamps the time it first observes a param value;
  // when the last in-app selection is NEWER than that observation, the param
  // is stale and must not hijack the selection's own flight. External URL
  // changes (paste, back/forward, inspector clicks) stamp a fresh observation
  // and are processed normally.
  const lastInAppSelectAtRef = useRef(0);
  const incidentUrlSeenRef = useRef({ param: null, at: 0 });
  const zoneUrlSeenRef = useRef({ param: null, at: 0 });
  const {
    isOpen: mapMenuOpen,
    position: mapMenuPosition,
    feature: mapMenuFeature,
    open: openMapMenu,
    close: closeMapMenu,
  } = useMapContextMenu();
  const [confirmDialog, setConfirmDialog] = useState(null);

  // ─── Point incident create/edit form ───
  const [pointFormMode, setPointFormMode] = useState(null); // null | 'create' | 'edit'
  const [pointFormCoords, setPointFormCoords] = useState(null);

  const editingZoneIdRef = useRef(editingZoneId);
  const editingZoneVerticesRef = useRef(editingZoneVertices);
  const drawVerticesRef = useRef(drawVertices);
  isPolygonClosedRef.current = isPolygonClosed;
  editingZoneIdRef.current = editingZoneId;
  editingZoneVerticesRef.current = editingZoneVertices;
  drawVerticesRef.current = drawVertices;

  // ─── Drawing Undo History ───
  const drawHistoryRef = useRef([{ vertices: [], isClosed: false }]);
  const historyIndexRef = useRef(0);

  // ─── Edit Mode Undo History ───
  const editHistoryRef = useRef([]);
  const editHistoryIndexRef = useRef(-1);

  // Show contextual banner when coming from activity timeline with an incident
  const showContextBanner = (refParam === 'activity' && incidentIdFromUrl) || (refParam === 'recyclebin' && incidentIdFromUrl);

  // ─── Domain Filter / Layers ───
  const [domains, setDomains] = useState([]);
  const [activeDomainFilters, setActiveDomainFilters] = useState(new Set());
  const [zoneCategories, setZoneCategories] = useState([]);
  const [activeZoneSlugs, setActiveZoneSlugs] = useState(new Set());

  // Zones are visible when at least one zone category is active. If the
  // category list failed to load, fall back to showing every zone.
  const showZones = zoneCategories.length > 0 ? activeZoneSlugs.size > 0 : true;

  // ─── Categories for edit form ───
  const [categories, setCategories] = useState([]);

  // ─── Workspace layout state ───
  const [activeDrawer, setActiveDrawer] = useState(null);
  const [focusMode, setFocusMode] = useState(false);
  const [compactMode, setCompactMode] = useState(() => {
    try {
      return localStorage.getItem(LS_COMPACT) === 'true';
    } catch {
      return false;
    }
  });
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [autoZoomEnabled, setAutoZoomEnabled] = useState(() => {
    try {
      const raw = localStorage.getItem(LS_AUTO_ZOOM);
      return raw === null ? true : raw === 'true';
    } catch {
      return true;
    }
  });
  const [toast, setToast] = useState(null);

  // ─── Right panel animation lifecycle ───
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const preFocusRightCollapsedRef = useRef(false);
  const [rightPanelRendered, setRightPanelRendered] = useState(false);
  const [rightPanelVisible, setRightPanelVisible] = useState(false);
  const rightPanelRef = useRef(null);
  const flyToTimeoutRef = useRef(null);

  const isPanelOpen = !!(selectedIncident || showZoneCreatePanel || pointFormMode);

  // ─── Power Search state ───
  const [powerSearchMode, setPowerSearchMode] = useState(false);
  const [psQuery, setPsQuery] = useState('');
  const [psFilters, setPsFilters] = useState(DEFAULT_PS_FILTERS);
  const [psSort, setPsSort] = useState('relevance');
  const [psResults, setPsResults] = useState([]);
  const [psTotal, setPsTotal] = useState(0);
  const [psLoading, setPsLoading] = useState(false);
  const [psError, setPsError] = useState(null);
  const [psOffset, setPsOffset] = useState(0);
  const [psFilterCollapsed, setPsFilterCollapsed] = useState(false);
  const [psResultsCollapsed, setPsResultsCollapsed] = useState(false);
  const psTimerRef = useRef(null);

  // ─── Staff workspace data ───
  const { user, logout } = useAuth();
  const {
    notifications,
    unreadCount: notificationUnreadCount,
    markRead: markNotificationRead,
    markAllRead: markAllNotificationsRead,
  } = useStaffNotifications();
  const { savedIncidents, savedIds, unsaveIncident, toggleSaved } = useStaffSavedIncidents();
  const { recents, recordRecent, clearRecents } = useStaffRecents('incident');
  const { domains: psDomains, categories: psCategories } = useSearchCategories();

  // ─── Live Activity Feed ───
  const [activities, setActivities] = useState([]);
  const [lastSeenTimestamp, setLastSeenTimestamp] = useState(getLastSeen());

  // ─── Activity inspector sidebar ───
  const [activitySidebarOpen, setActivitySidebarOpen] = useState(true);
  const isActivityMode = refParam === 'activity' && (staffUserId || publicUserId);

  // ─── Recycle Bin sidebar ───
  const [recycleBinSidebarOpen, setRecycleBinSidebarOpen] = useState(true);

  // ─── Inline creator profile drawer ───
  const [creatorDrawer, setCreatorDrawer] = useState({ userId: null, role: null });

  // Bumps whenever an incident is selected from the creator drawer so the
  // Activity sidebar re-jumps/scrolls even if the incident id is unchanged.
  const [activitySelectionKey, setActivitySelectionKey] = useState(0);
  const isRecycleBinMode = refParam === 'recyclebin';

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
  const isLargeRangeRef = useRef(isLargeRange);
  useEffect(() => {
    isLargeRangeRef.current = isLargeRange;
  }, [isLargeRange]);

  // Live mode = the map shows exactly today (drives the topbar LIVE pill)
  const isLiveMode = dateRange.from === today && dateRange.to === today;

  // ─── SSE Connection ───
  const esRef = useRef(null);

  // Close the creator drawer when the user selects a different incident
  // (e.g. from the drawer's own Activity tab) so the incident detail panel
  // on the right can open without staying hidden behind the overlay.
  useEffect(() => {
    if (creatorDrawer.userId) {
      setCreatorDrawer({ userId: null, role: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incidentIdFromUrl]);

  // Ghost zone for recycle-bin incidents
  const [ghostZone, setGhostZone] = useState(null);

  // Ghost fetch tracking
  const ghostFetchAttempted = useRef(false);
  const lastIncidentIdRef = useRef(null);

  // ─── Apply compact-mode class to html ───
  useEffect(() => {
    const root = document.documentElement;
    if (compactMode) root.classList.add('admin-compact');
    else root.classList.remove('admin-compact');
    try {
      localStorage.setItem(LS_COMPACT, String(compactMode));
    } catch {}
    return () => root.classList.remove('admin-compact');
  }, [compactMode]);

  // ─── Persist auto-zoom preference ───
  useEffect(() => {
    try {
      localStorage.setItem(LS_AUTO_ZOOM, String(autoZoomEnabled));
    } catch {}
  }, [autoZoomEnabled]);

  // ─── Auto-dismiss toast ───
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Sync categoryId filter from URL params
  useEffect(() => {
    const cid = searchParams.get('categoryId');
    setFilters((prev) => ({ ...prev, categoryId: cid || '' }));
  }, [searchParams]);

  // ─── Right panel open/close animation ───
  useEffect(() => {
    const shouldShow = isPanelOpen && !rightPanelCollapsed;
    if (shouldShow) {
      setRightPanelRendered(true);
      // Double rAF + forced reflow so the transform transition always runs
      // from the collapsed (off-screen) state.
      const raf1 = requestAnimationFrame(() => {
        const raf2 = requestAnimationFrame(() => {
          rightPanelRef.current?.offsetWidth;
          setRightPanelVisible(true);
        });
        return () => cancelAnimationFrame(raf2);
      });
      return () => cancelAnimationFrame(raf1);
    }
    setRightPanelVisible(false);
    const timer = setTimeout(() => setRightPanelRendered(false), RIGHT_PANEL_TRANSITION_MS);
    return () => clearTimeout(timer);
  }, [isPanelOpen, rightPanelCollapsed]);

  useEffect(() => () => clearTimeout(flyToTimeoutRef.current), []);

  const exitFocusMode = useCallback(() => {
    if (!focusMode) return;
    setFocusMode(false);
    setActiveDrawer(null);
  }, [focusMode]);

  // Delay a camera flight by the right-panel transition when the selection is
  // about to open the panel, so the flight starts from the settled layout.
  // Padding is measured live at flight time via getCurrentMapPadding.
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

  // ─── Fetch incidents with smart viewport filtering ───
  useEffect(() => {
    let cancelled = false;

    const doFetch = async () => {
      setLoading(true);
      setViewportFiltering(null);
      viewportFilteringRef.current = null;

      const baseParams = {};
      if (filters.categoryId) baseParams.categoryId = filters.categoryId;
      if (filters.severity) baseParams.severity = filters.severity;
      if (filters.status) baseParams.status = filters.status;

      // Unbounded "All time" translates to a maximally wide overlap window —
      // the list endpoint applies a default "visible today" window when no
      // date params are sent, so nulls must never reach it.
      const effFrom = dateRange.from || '1970-01-01';
      const effTo = dateRange.to || '2099-12-31';

      // ─── Large-range mode (flightradar-style gating) ───
      if (isLargeRange) {
        // Polygon zones always load — few and needed for context
        const zonesRes = await getIncidents({ dateFrom: effFrom, dateTo: effTo, geometryType: 'polygon' });
        if (cancelled) return;
        const zones = zonesRes.incidents || [];

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
          const params = { dateFrom: effFrom, dateTo: effTo, geometryType: 'point', ...baseParams };
          if (viewportBoundsRef.current) params.viewport = viewportBoundsRef.current;
          const pointsRes = await getIncidents(params);
          if (cancelled) return;
          setIncidents([...pointsRes.incidents || [], ...zones]);
          setTotalEventCount(pointsRes.count);
        }
        setLoading(false);
        return;
      }

      const params1 = { dateFrom: effFrom, dateTo: effTo, ...baseParams };
      const res1 = await getIncidents(params1);

      if (cancelled) return;
      setTotalEventCount(res1.count);

      if (res1.count <= 100) {
        setIncidents(res1.incidents || []);
        setViewportFiltering(false);
        viewportFilteringRef.current = false;
        setLoading(false);
      } else {
        setViewportFiltering(true);
        viewportFilteringRef.current = true;

        if (viewportBoundsRef.current) {
          const params2 = {
            dateFrom: effFrom,
            dateTo: effTo,
            viewport: viewportBoundsRef.current,
            ...baseParams,
          };
          const res2 = await getIncidents(params2);
          if (cancelled) return;
          setIncidents(res2.incidents || []);
          setTotalEventCount(res2.count);
        } else {
          setIncidents(res1.incidents || []);
        }
        setLoading(false);
      }
    };

    doFetch();

    return () => {
      cancelled = true;
    };
  }, [dateRange.from, dateRange.to, filters.categoryId, filters.severity, filters.status, refreshKey, isLargeRange, isRangeGated]);


  // Filtered incidents (must be declared before any effect/callback that depends on polygonIncidents)
  const filteredIncidents = useMemo(() => {
    let result = incidents;
    if (activeDomainFilters.size > 0) {
      result = result.filter((i) => !activeDomainFilters.has(i.domain_slug));
    }
    return result;
  }, [incidents, activeDomainFilters]);

  // Point incidents are rendered as markers; polygons are rendered via the zones source
  const polygonIncidents = useMemo(
    () => filteredIncidents.filter((i) => i.geometry_type === 'polygon'),
    [filteredIncidents]
  );

  // Zone-category visibility filter (layers drawer). Applies only to what the
  // map renders; lookups (deep-links, ghosts) keep using polygonIncidents.
  const activeZoneIds = useMemo(
    () => new Set(zoneCategories.filter((z) => activeZoneSlugs.has(z.slug)).map((z) => String(z.id))),
    [zoneCategories, activeZoneSlugs]
  );
  const visiblePolygonIncidents = useMemo(() => {
    if (zoneCategories.length === 0) return polygonIncidents;
    return polygonIncidents.filter((i) => activeZoneIds.has(String(i.zone_category_id)));
  }, [polygonIncidents, zoneCategories.length, activeZoneIds]);

  const visibleDomainSlugs = useMemo(
    () => new Set(domains.map((d) => d.slug).filter((slug) => !activeDomainFilters.has(slug))),
    [domains, activeDomainFilters]
  );

  const activeIncidents = useMemo(
    () => incidents.filter((i) => i.status === 'active'),
    [incidents]
  );
  const activeIncidentCount = activeIncidents.length;
  const overdueIncidentCount = useMemo(() => {
    const nowTs = Date.now();
    return activeIncidents.filter((i) => {
      const created = new Date(i.created_at || i.createdAt).getTime();
      return Number.isFinite(created) && nowTs - created > 24 * 60 * 60 * 1000;
    }).length;
  }, [activeIncidents]);

  const unreadCount = useMemo(
    () => activities.filter((a) => a.timestamp > lastSeenTimestamp).length,
    [activities, lastSeenTimestamp]
  );

  // Compute the padding MapLibre should apply so camera flights target the
  // visible map rectangle after a layout change. `overrides` lets callers
  // describe the state *after* the action they are about to trigger. Also used
  // for floating overlays inside the map container (ghost banner) that must
  // avoid the absolutely-positioned chrome (drawer, right panel, power-search
  // rails).
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

  // Live layout state mirror for the map padding getter. SuperadminMap calls
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

  // ─── Handle zone ID from URL — deep-linking ───
  const zoneDeepLinkProcessed = useRef(false);
  const prevZoneIdRef = useRef(null);
  useEffect(() => {
    if (prevZoneIdRef.current !== zoneIdFromUrl) {
      zoneDeepLinkProcessed.current = false;
      prevZoneIdRef.current = zoneIdFromUrl;
    }

    if (!zoneIdFromUrl) {
      return;
    }

    // Stamp the first observation of this param value; suppress the effect
    // when a newer in-app selection makes the param stale (see the ref block).
    if (zoneUrlSeenRef.current.param !== zoneIdFromUrl) {
      zoneUrlSeenRef.current = { param: zoneIdFromUrl, at: performance.now() };
    }
    if (lastInAppSelectAtRef.current > zoneUrlSeenRef.current.at) {
      zoneDeepLinkProcessed.current = true;
      return;
    }

    // Already-selected guard (mirrors the incident deep-link guard): when the
    // URL param was written by an in-app zone selection (map click, power
    // search), the selection's own flight already ran — do not re-fire a
    // deep-link flight that would hijack the source and bypass the map-click
    // tolerance rule.
    const currentZoneSelection = selectedIncidentRef.current;
    const currentIsPolygonZone = currentZoneSelection?.geometry_type === 'polygon' || currentZoneSelection?.geometryType === 'polygon';
    if (currentZoneSelection?.id === zoneIdFromUrl && currentIsPolygonZone) {
      zoneDeepLinkProcessed.current = true;
      return;
    }

    const zone = polygonIncidents.find((z) => z.id === zoneIdFromUrl);
    if (zone && !zoneDeepLinkProcessed.current) {
      exitFocusMode();
      setSelectedZoneId(zone.id);
      setSelectedIncident(zone);
      setRightPanelCollapsed(false);
      // Only fly to the zone when the URL does not already carry a saved viewport.
      // This preserves the map position when the user returns from the full-page zone view.
      if (!hasSavedViewport) {
        const centroid = getZoneCentroid(zone);
        const bounds = getZoneBounds(zone);
        if (centroid && bounds) {
          scheduleFlyTo(
            {
              type: 'zone',
              source: 'deep-link',
              lat: centroid.lat,
              lng: centroid.lng,
              bounds,
              padding: getNextMapPadding({
                focusMode: false,
                activeDrawer: focusMode ? null : activeDrawer,
                rightPanelCollapsed: false,
                isPanelOpen: true,
              }),
            },
            isPanelOpen && !rightPanelCollapsed
          );
        }
      }
      zoneDeepLinkProcessed.current = true;
      return;
    }

    if (polygonIncidents.length > 0 && !zoneDeepLinkProcessed.current) {
      zoneDeepLinkProcessed.current = true;
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('zone');
        return next;
      });
    }
  }, [zoneIdFromUrl, polygonIncidents, hasSavedViewport, setSearchParams, exitFocusMode, getNextMapPadding, activeDrawer, focusMode, isPanelOpen, rightPanelCollapsed, scheduleFlyTo]);

  // Fetch domains for layers drawer
  useEffect(() => {
    getDomains()
      .then((res) => {
        setDomains(res.domains || []);
      })
      .catch(() => setDomains([]));
  }, []);

  // Fetch zone categories for layers drawer (default: all visible)
  useEffect(() => {
    listZoneCategories()
      .then((cats) => {
        const list = cats || [];
        setZoneCategories(list);
        setActiveZoneSlugs(new Set(list.map((z) => z.slug).filter(Boolean)));
      })
      .catch(() => {
        setZoneCategories([]);
        setActiveZoneSlugs(new Set());
      });
  }, []);

  // Fetch categories for edit form
  useEffect(() => {
    listAllCategories()
      .then((cats) => setCategories(cats || []))
      .catch(() => setCategories([]));
  }, []);

  // Listen for incident deletion from detail panel and refresh list
  useEffect(() => {
    const handleDeleted = (e) => {
      setIncidents((prev) => prev.filter((i) => i.id !== e?.detail?.incidentId));
      if (selectedIncident?.id === e?.detail?.incidentId) {
        setSelectedIncident(null);
        setGhostZone(null);
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.delete('incident');
          return next;
        });
      }
    };
    window.addEventListener('incident-deleted', handleDeleted);
    return () => window.removeEventListener('incident-deleted', handleDeleted);
  }, [selectedIncident?.id, setSearchParams]);

  // ─── SSE Connection ───
  useEffect(() => {
    if (typeof EventSource === 'undefined') return;

    const token = localStorage.getItem('superadmin_token');
    const url = `${API_BASE_URL}/incidents/stream?token=${token}`;
    const es = new EventSource(url);
    esRef.current = es;

    es.onmessage = (e) => {
      if (!e.data) return;
      try {
        const payload = JSON.parse(e.data);
        if (!payload.type) return;

        if (payload.type === 'incident_deleted') {
          setIncidents((prev) => prev.filter((ev) => ev.id !== payload.incidentId));
          return;
        }

        // Live activity feed (dedupe rapid repeats of the same event)
        setActivities((prev) => {
          const last = prev[0];
          const ts = Date.now();
          if (
            last &&
            last.type === payload.type &&
            last.incidentId === (payload.incidentId || payload.incident?.id) &&
            ts - last.timestamp < 2000
          ) {
            return prev;
          }

          const activity = {
            type: payload.type,
            incidentId: payload.incidentId || payload.incident?.id,
            incident: payload.incident || null,
            update: payload.update || null,
            updateId: payload.updateId || null,
            timestamp: ts,
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

          // Refresh selected incident if it matches
          if (selectedIncident?.id === payload.incident.id) {
            getIncident(selectedIncident.id)
              .then((res) => {
                if (res?.incident) setSelectedIncident(res.incident);
              })
              .catch(() => {});
          }
        }
      } catch (err) {
        console.warn('[SSE] Failed to parse message:', err);
      }
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [selectedIncident?.id]);

  // Legend / layer handlers
  const handleToggleDomain = useCallback((slug) => {
    setActiveDomainFilters((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  }, []);

  const handleShowAllDomains = useCallback(() => {
    setActiveDomainFilters(new Set());
  }, []);

  const handleHideAllDomains = useCallback(() => {
    setActiveDomainFilters(new Set(domains.map((d) => d.slug)));
  }, [domains]);

  const handleToggleZone = useCallback((slug) => {
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

  const handleHideAllZones = useCallback(() => {
    setActiveZoneSlugs(new Set());
  }, []);

  // Viewport change handler
  const handleViewportChange = useCallback(({ bounds, center, zoom }) => {
    closeMapMenu();
    viewportBoundsRef.current = bounds;

    if (center && Number.isFinite(zoom)) {
      setMapZoom(zoom);
      const lat = center.lat.toFixed(6);
      const lng = center.lng.toFixed(6);
      const z = zoom.toFixed(2);
      // Avoid overwriting the URL when the reported viewport already matches the
      // current query params. This prevents a programmatic or load-time report
      // from changing the saved map position on back-navigation.
      if (lat !== latParam || lng !== lngParam || z !== zoomParam) {
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            next.set('lat', lat);
            next.set('lng', lng);
            next.set('zoom', z);
            return next;
          },
          { replace: true }
        );
      }
    }

    if (viewportFilteringRef.current === true) {
      const effFrom = dateRange.from || '1970-01-01';
      const effTo = dateRange.to || '2099-12-31';

      if (isLargeRangeRef.current) {
        // Large ranges: points-only viewport refetch; zones stay global
        const params = { dateFrom: effFrom, dateTo: effTo, viewport: bounds, geometryType: 'point' };
        if (filters.categoryId) params.categoryId = filters.categoryId;
        if (filters.severity) params.severity = filters.severity;
        if (filters.status) params.status = filters.status;

        getIncidents(params)
          .then((res) => {
            setIncidents((prev) => [
              ...(res.incidents || []),
              ...prev.filter((i) => i.geometry_type === 'polygon'),
            ]);
            setTotalEventCount(res.count);
          })
          .catch(() => {});
      } else {
        const params = {
          dateFrom: effFrom,
          dateTo: effTo,
          viewport: bounds,
        };
        if (filters.categoryId) params.categoryId = filters.categoryId;
        if (filters.severity) params.severity = filters.severity;
        if (filters.status) params.status = filters.status;

        getIncidents(params)
          .then((res) => {
            setIncidents(res.incidents || []);
            setTotalEventCount(res.count);
          })
          .catch(() => setIncidents([]));
      }
    }
  }, [dateRange.from, dateRange.to, filters.categoryId, filters.severity, filters.status, closeMapMenu, setSearchParams, latParam, lngParam, zoomParam]);

  // Select incident
  const handleSelectIncident = useCallback((incident, opts = {}) => {
    const panelAlreadyOpen = isPanelOpen && !rightPanelCollapsed;
    const source = opts.source || 'map';
    if (focusMode) {
      setFocusMode(false);
      setActiveDrawer(null);
    }
    setRightPanelCollapsed(false);
    setSelectedIncident(incident);
    setEditingZoneId(null);
    setEditingZoneVertices([]);
    setOriginalZoneVertices([]);

    // Padding snapshot describing the layout AFTER this selection (panel
    // open, focus exited); the map re-measures live at flight time.
    const padding = getNextMapPadding({
      focusMode: false,
      activeDrawer: focusMode ? null : activeDrawer,
      rightPanelCollapsed: false,
      isPanelOpen: true,
    });

    if (incident?.geometry_type === 'polygon') {
      setSelectedZoneId(incident.id);
      if (!opts.skipFlyTo) {
        const centroid = getZoneCentroid(incident);
        const bounds = getZoneBounds(incident);
        if (centroid && bounds) {
          scheduleFlyTo(
            { type: 'zone', source, lat: centroid.lat, lng: centroid.lng, bounds, padding },
            panelAlreadyOpen
          );
        }
      } else {
        scheduleFlyTo(null, true);
      }
    } else {
      setSelectedZoneId(null);
      if (!opts.skipFlyTo) {
        const lat = parseFloat(incident?.latitude);
        const lng = parseFloat(incident?.longitude);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          scheduleFlyTo(
            { type: 'incident', source, lat, lng, padding },
            panelAlreadyOpen
          );
        }
      } else {
        scheduleFlyTo(null, true);
      }
    }

    lastInAppSelectAtRef.current = performance.now();
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('incident', incident.id);
      next.delete('zone');
      return next;
    });

    try {
      recordRecent({ incidentId: incident.id, title: incident.title });
    } catch {
      // ignore
    }
  }, [setSearchParams, focusMode, recordRecent, getNextMapPadding, activeDrawer, isPanelOpen, rightPanelCollapsed, scheduleFlyTo]);

  const handleBack = useCallback(() => {
    setSelectedIncident(null);
    setSelectedIncidentDetail(null);
    setDetailError('');
    setAuditDrawerOpen(false);
    setSelectedZoneId(null);
    setGhostZone(null);
    setEditingZoneId(null);
    setEditingZoneVertices([]);
    setOriginalZoneVertices([]);
    setShowZoneCreatePanel(false);
    setZoneInfoEditMode(false);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('incident');
      next.delete('zone');
      return next;
    });
  }, [setSearchParams]);

  // ─── Shared incident detail fetch & refresh ───
  const fetchSelectedIncidentDetail = useCallback(async (opts = {}) => {
    if (!selectedIncident?.id) return;
    if (selectedIncident.isDeleted || selectedIncident.isPurged || selectedIncident.status === 'hidden') {
      setSelectedIncidentDetail(null);
      return;
    }
    if (opts.loading !== false) {
      setDetailLoading(true);
    }
    setDetailError('');
    try {
      const res = await getIncident(selectedIncident.id);
      setSelectedIncidentDetail(mapIncidentForShared(res));
    } catch (err) {
      setDetailError(err.message || 'Failed to load incident details');
      setSelectedIncidentDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, [selectedIncident]);

  useEffect(() => {
    const isNewIncident = prevIncidentIdRef.current !== selectedIncident?.id;
    prevIncidentIdRef.current = selectedIncident?.id || null;
    fetchSelectedIncidentDetail({ loading: isNewIncident });
  }, [fetchSelectedIncidentDetail, selectedIncident?.id]);

  useEffect(() => {
    if (refreshKey > 0 && selectedIncident?.id) {
      fetchSelectedIncidentDetail({ loading: false });
    }
  }, [refreshKey, selectedIncident?.id, fetchSelectedIncidentDetail]);

  const fetchAuditLogs = useCallback(async (page = 1) => {
    if (!selectedIncident?.id) return;
    setAuditLoading(true);
    try {
      const data = await listAuditLogs({
        targetType: 'incident',
        targetId: selectedIncident.id,
        page,
        limit: 50,
      });
      setAuditLogs(data.logs || []);
      setAuditPagination(data.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 });
    } catch (err) {
      console.warn('[Audit] Failed to load audit logs:', err);
    } finally {
      setAuditLoading(false);
    }
  }, [selectedIncident?.id]);

  useEffect(() => {
    if (auditDrawerOpen) {
      fetchAuditLogs(1);
    }
  }, [auditDrawerOpen, fetchAuditLogs]);

  const handleActivityIncidentClick = useCallback(
    (log) => {
      if (!log.target_id || log.target_type !== 'incident') return;

      const status = log.incident_status;

      // Live / recycle-bin incidents: navigate via URL so the deep-link effect
      // can load them and (for deleted ones) render a ghost marker/zone.
      if (status === 'active' || status === 'resolved' || status === 'hidden') {
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.set('incident', log.target_id);
          return next;
        });
        return;
      }

      // Fully purged / no longer present: show a read-only panel built from the
      // audit log details. No URL change, no map marker.
      const details = typeof log.details === 'string'
        ? (() => { try { return JSON.parse(log.details); } catch { return {}; } })()
        : (log.details || {});
      setSelectedIncident({
        id: log.target_id,
        title: details.title || 'Unknown incident',
        description: details.description || '',
        severity: details.severity,
        category_name: details.categoryName,
        domain_name: details.domainName,
        domain_color: details.domainColor,
        start_date: details.startDate,
        end_date: details.endDate,
        deleted_at: details.deletedAt,
        purged_at: details.purgedAt,
        original_status: details.originalStatus,
        isPurged: true,
      });
      setSelectedZoneId(null);
      setGhostZone(null);
      scheduleFlyTo(null, true);
    },
    [setSearchParams, scheduleFlyTo]
  );

  // ─── Shared incident detail callbacks ───
  const withDetailRefresh = useCallback(
    (fn) =>
      async (...args) => {
        if (!selectedIncident?.id) return;
        try {
          await fn(...args);
          await fetchSelectedIncidentDetail({ loading: false });
          setRefreshKey((k) => k + 1);
          setGhostZone(null);
        } catch (err) {
          setDetailError(err.message || 'Action failed');
        }
      },
    [selectedIncident?.id, fetchSelectedIncidentDetail]
  );

  // Save the full return context (camera + date range + selection) so a later
  // Back — from a full-page detail view OR a directory page — restores the map
  // exactly as left. Detail navigation passes the target selection explicitly;
  // without one the current panel selection is saved. Sets the
  // `geowatch_superadmin_returning` latch the mount-time restore effect
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
      // historic), the selected incident/zone, and the camera.
      // getCenter/getPadding are padding-aware, so saving the tuple
      // (center, zoom, bearing, pitch, padding) lets the map remount at
      // the exact framing the user left — no flight, no refit.
      sessionStorage.setItem(
        'geowatch_superadmin_return_view',
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
        })
      );
      sessionStorage.setItem('geowatch_superadmin_returning', '1');
    },
    [selectedIncident, dateRange.from, dateRange.to, isLiveMode]
  );

  const handleNavigateToFullPage = useCallback(() => {
    if (!selectedIncident?.id) return;
    const map = mapRef.current?.getMap?.();
    const isZone = selectedIncident?.geometry_type === 'polygon';
    if (map) {
      saveMapReturnView({ id: selectedIncident.id, isZone });
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
    }
    navigate(isZone ? `/superadmin/zone/${selectedIncident.id}` : `/superadmin/incident/${selectedIncident.id}`);
  }, [navigate, selectedIncident?.id, selectedIncident?.geometry_type, setSearchParams, saveMapReturnView]);

  // Restore full map context when returning from a full-page detail view:
  // date range (live or historic — the mode pill and date control both derive
  // from it), the camera, and the selected incident/zone. The selection is
  // restored through the normal ?incident=/?zone= deep-link effects (flights
  // skipped via the mount-time saved-viewport snapshot) — no duplicated
  // selection logic. Missing fields (older payloads) degrade to viewport-only.
  useEffect(() => {
    if (sessionStorage.getItem('geowatch_superadmin_returning') !== '1') return;
    sessionStorage.removeItem('geowatch_superadmin_returning');
    const raw = sessionStorage.getItem('geowatch_superadmin_return_view');
    sessionStorage.removeItem('geowatch_superadmin_return_view');
    if (!raw) return;
    try {
      const payload = JSON.parse(raw);
      const { lat, lng, zoom, dateRange: savedRange, selectedIncidentId, selectedZoneId } = payload;
      // Date state FIRST so the restored selection is inside the fetched window
      if (savedRange && ('from' in savedRange || 'to' in savedRange)) {
        setDateRange({ from: savedRange.from ?? null, to: savedRange.to ?? null });
      }
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

  const handleCopyIncidentLink = useCallback(() => {
    if (!selectedIncident?.id) return;
    const url = `${window.location.origin}/incident/${selectedIncident.id}`;
    navigator.clipboard.writeText(url).catch(() => {});
  }, [selectedIncident?.id]);

  const handleOpenAudit = useCallback(() => {
    setAuditDrawerOpen(true);
  }, []);

  const handleViewCreator = useCallback((userId, role) => {
    setCreatorDrawer({ userId, role });
  }, []);

  const handleUpdateIncident = useCallback(
    withDetailRefresh(async (patch) => {
      const body = {
        ...(patch.title !== undefined && { title: patch.title }),
        ...(patch.description !== undefined && { description: patch.description }),
        ...(patch.locationContext !== undefined && { locationContext: patch.locationContext }),
        ...(patch.severity !== undefined && { severity: patch.severity }),
        ...(patch.verification !== undefined && { verificationStatus: patch.verification }),
        ...(patch.heroImageUrl && { heroImageUrl: patch.heroImageUrl }),
      };
      await updateIncident(selectedIncident.id, body);
    }),
    [selectedIncident?.id, withDetailRefresh]
  );

  const handleResolveSelectedIncident = useCallback(
    withDetailRefresh(async () => {
      await resolveIncident(selectedIncident.id, { resolvedAt: new Date().toISOString() });
    }),
    [selectedIncident?.id, withDetailRefresh]
  );

  const handleDeleteSelectedIncident = useCallback(
    withDetailRefresh(async () => {
      await deleteIncident(selectedIncident.id);
    }),
    [selectedIncident?.id, withDetailRefresh]
  );

  const handleRestoreIncident = useCallback(
    withDetailRefresh(async () => {
      await restoreIncident(selectedIncident.id);
    }),
    [selectedIncident?.id, withDetailRefresh]
  );

  const handlePurgeIncident = useCallback(
    withDetailRefresh(async () => {
      await purgeIncident(selectedIncident.id);
    }),
    [selectedIncident?.id, withDetailRefresh]
  );

  const handleAddUpdate = useCallback(
    withDetailRefresh(async (form) => {
      await addTimeline(selectedIncident.id, {
        summary: form.summary,
        details: form.details,
        updateDate: form.timestamp || form.updateDate || new Date().toISOString(),
        type: form.type || 'update',
        verificationStatus: form.verification || 'unverified',
      });
    }),
    [selectedIncident?.id, withDetailRefresh]
  );

  const handleEditUpdate = useCallback(
    withDetailRefresh(async (updateId, form) => {
      const body = {};
      if (form.summary !== undefined) body.summary = form.summary;
      if (form.details !== undefined) body.details = form.details;
      if (form.timestamp !== undefined || form.updateDate !== undefined) {
        body.updateDate = form.timestamp || form.updateDate;
      }
      if (form.type !== undefined) body.type = form.type;
      if (form.verification !== undefined) body.verificationStatus = form.verification;
      await updateTimeline(selectedIncident.id, updateId, body);
    }),
    [selectedIncident?.id, withDetailRefresh]
  );

  const handleDeleteUpdate = useCallback(
    withDetailRefresh(async (updateId) => {
      await deleteTimeline(selectedIncident.id, updateId);
    }),
    [selectedIncident?.id, withDetailRefresh]
  );

  const handleAddEvidence = useCallback(
    withDetailRefresh(async (eventId, sourceType, item) => {
      const incidentId = selectedIncident.id;
      if (sourceType === 'media') {
        const items = Array.isArray(item) ? item : [item];
        for (const mediaItem of items) {
          if (mediaItem.url?.startsWith('data:')) {
            const file = dataUrlToFile(mediaItem.url, mediaItem.name || 'upload.png');
            await uploadMedia(incidentId, file, { updateId: eventId, caption: mediaItem.caption });
          } else if (mediaItem.url) {
            console.warn('URL-based media evidence not yet supported', mediaItem);
          }
        }
        return;
      }

      if (sourceType === 'x_post') {
        await addSource(incidentId, {
          updateId: eventId,
          sourceType: 'x_post',
          sourceUrl: item.tweetUrl,
          description: item.text,
        });
        return;
      }

      if (sourceType === 'news_article') {
        await addSource(incidentId, {
          updateId: eventId,
          sourceType: 'news_article',
          sourceUrl: item.url,
          description: [item.title, item.publisher].filter(Boolean).join(' — '),
        });
        return;
      }

      if (sourceType === 'admin_note') {
        await addSource(incidentId, {
          updateId: eventId,
          sourceType: 'admin_note',
          description: item.text,
        });
        return;
      }

      console.warn('Unsupported evidence type', sourceType, item);
    }),
    [selectedIncident?.id, withDetailRefresh]
  );

  const handleEditEvidence = useCallback(
    withDetailRefresh(async (eventId, sourceType, item) => {
      const incidentId = selectedIncident.id;
      if (sourceType === 'media') {
        const body = {};
        if (item.caption !== undefined) body.caption = item.caption;
        if (item.pinned !== undefined) body.pinned = item.pinned;
        if (eventId !== undefined) body.updateId = eventId;
        await updateMedia(incidentId, item.id, body);
        return;
      }

      const body = {};
      if (item.sourceUrl !== undefined || item.tweetUrl !== undefined || item.url !== undefined) {
        body.sourceUrl = item.tweetUrl || item.url || item.sourceUrl;
      }
      if (item.text !== undefined || item.description !== undefined) {
        body.description = item.text || item.description;
      }
      if (item.title !== undefined && item.publisher !== undefined) {
        body.description = [item.title, item.publisher].filter(Boolean).join(' — ');
      }
      if (item.pinned !== undefined) body.pinned = item.pinned;
      await updateSource(incidentId, item.id, body);
    }),
    [selectedIncident?.id, withDetailRefresh]
  );

  const handleDeleteEvidence = useCallback(
    withDetailRefresh(async (eventId, sourceType, itemId) => {
      const incidentId = selectedIncident.id;
      if (sourceType === 'media') {
        await deleteMedia(incidentId, itemId);
      } else {
        await deleteSource(incidentId, itemId);
      }
    }),
    [selectedIncident?.id, withDetailRefresh]
  );

  const handlePinEvidence = useCallback(
    withDetailRefresh(async (eventId, sourceType, itemId, pinned) => {
      const incidentId = selectedIncident.id;
      if (sourceType === 'media') {
        await pinMedia(incidentId, itemId, pinned);
      } else {
        await pinSource(incidentId, itemId, pinned);
      }
    }),
    [selectedIncident?.id, withDetailRefresh]
  );

  const handleFeatureEvidence = useCallback(
    withDetailRefresh(async (eventId, { sourceType, sourceId }) => {
      const body = { sourceType };
      if (sourceType === 'media') {
        body.mediaId = sourceId;
      } else {
        body.sourceId = sourceId;
      }
      await setFeatured(selectedIncident.id, eventId, body);
    }),
    [selectedIncident?.id, withDetailRefresh]
  );

  const handleClearFeatureEvidence = useCallback(
    withDetailRefresh(async (eventId) => {
      await clearFeatured(selectedIncident.id, eventId);
    }),
    [selectedIncident?.id, withDetailRefresh]
  );

  function pickScreenshotFile() {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.style.display = 'none';
      document.body.appendChild(input);
      let resolved = false;
      const cleanup = () => {
        if (input.parentNode) input.parentNode.removeChild(input);
      };
      input.addEventListener('change', () => {
        if (resolved) return;
        resolved = true;
        cleanup();
        resolve(input.files?.[0] || null);
      });
      const onFocus = () => {
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            cleanup();
            resolve(null);
          }
        }, 300);
      };
      window.addEventListener('focus', onFocus, { once: true });
      input.click();
    });
  }

  const handleArchiveSource = useCallback(
    withDetailRefresh(async (eventId, item) => {
      if (item.archived) {
        // Unarchive removes the archived flag but keeps the captured snapshot so it can be
        // used as a fallback if the post becomes unavailable again later.
        await updateSource(selectedIncident.id, item.id, {
          archived: false,
          archiveReason: null,
        });
        return;
      }

      const reason = window.prompt('Reason for archiving this X post?');
      if (reason === null) return;

      // If the system already captured a snapshot, reuse it instead of asking for a manual upload.
      if (item.archiveMediaId) {
        await updateSource(selectedIncident.id, item.id, {
          archived: true,
          archiveMediaId: item.archiveMediaId,
          archiveReason: reason,
        });
        return;
      }

      const file = await pickScreenshotFile();
      if (!file) {
        throw new Error('A screenshot is required to archive an X post.');
      }

      const uploadResult = await uploadMedia(selectedIncident.id, file, { updateId: eventId, caption: reason });
      const mediaId = uploadResult?.media?.id;
      if (!mediaId) {
        throw new Error('Screenshot upload failed: no media id returned.');
      }

      await updateSource(selectedIncident.id, item.id, {
        archived: true,
        archiveMediaId: mediaId,
        archiveReason: reason,
      });
    }),
    [selectedIncident?.id, withDetailRefresh]
  );

  const handleCheckSource = useCallback(
    withDetailRefresh(async (eventId, item) => {
      await checkSource(selectedIncident.id, item.id);
    }),
    [selectedIncident?.id, withDetailRefresh]
  );

  function dataUrlToFile(dataUrl, fileName = 'image.png') {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], fileName, { type: mime });
  }

  // When an incident is clicked inside the inline creator profile drawer,
  // close the drawer and navigate to the map with the activity sidebar open
  // for the drawer user so the left sidebar can jump to the incident's page.
  const handleCreatorDrawerIncidentClick = useCallback(
    (log) => {
      const userId = creatorDrawer.userId;
      const role = creatorDrawer.role;

      setCreatorDrawer({ userId: null, role: null });

      if (!log.target_id || log.target_type !== 'incident' || !userId) return;

      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('incident', log.target_id);
        next.set('ref', 'activity');
        if (role === 'public_user') {
          next.set('publicUserId', userId);
          next.delete('staffUserId');
        } else {
          next.set('staffUserId', userId);
          next.delete('publicUserId');
        }
        return next;
      });

      // Force the Activity sidebar to re-evaluate jump/scroll even if the
      // incident id is the same as the one already selected on the map.
      setActivitySelectionKey((k) => k + 1);
    },
    [creatorDrawer.userId, creatorDrawer.role, setSearchParams]
  );

  const handleToggleActivitySidebar = useCallback(() => {
    setActivitySidebarOpen((prev) => !prev);
  }, []);

  const handleCloseActivitySidebar = useCallback(() => {
    // Close the activity sidebar and stay on the map. The Back to Profile button
    // is the dedicated path for returning to the originating user profile.
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('ref');
      next.delete('actor');
      next.delete('returnTo');
      next.delete('staffUserId');
      next.delete('publicUserId');
      return next;
    });
  }, [setSearchParams]);

  const handleToggleRecycleBinSidebar = useCallback(() => {
    setRecycleBinSidebarOpen((prev) => !prev);
  }, []);

  const handleCloseRecycleBinSidebar = useCallback(() => {
    // Close the recycle bin sidebar and stay on the map.
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('ref');
      return next;
    });
  }, [setSearchParams]);

  const handleRecycleBinIncidentClick = useCallback((incident) => {
    // Selecting a deleted incident from the recycle-bin sidebar navigates via URL
    // so the deep-link effect loads the ghost marker/zone and read-only panel.
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('incident', incident.id);
      return next;
    });
  }, [setSearchParams]);

  const handleBackToRecycleBin = useCallback(() => {
    navigate('/superadmin/recycle-bin');
  }, [navigate]);


  // ─── Handle incident ID from URL — deep-linking with ghost + deleted support ───
  useEffect(() => {
    if (!incidentIdFromUrl) {
      ghostFetchAttempted.current = false;
      lastIncidentIdRef.current = null;
      return;
    }

    // Stamp the first observation of this param value; suppress the effect
    // when a newer in-app selection makes the param stale (see the ref block).
    if (incidentUrlSeenRef.current.param !== incidentIdFromUrl) {
      incidentUrlSeenRef.current = { param: incidentIdFromUrl, at: performance.now() };
    }
    if (lastInAppSelectAtRef.current > incidentUrlSeenRef.current.at) {
      return;
    }

    // Reset ghost-fetch tracking when the requested incident changes
    if (lastIncidentIdRef.current !== incidentIdFromUrl) {
      ghostFetchAttempted.current = false;
      lastIncidentIdRef.current = incidentIdFromUrl;
    }

    // If a zone is currently selected (by URL or by user click), it takes
    // precedence; do not auto-switch back to a stale incident id.
    if (zoneIdFromUrl) {
      return;
    }

    // Already-selected guard: when the URL param was written by an in-app
    // selection (map click, drawer, power search), the selection's own flight
    // already ran — do not re-fire a deep-link flight that would hijack the
    // source and bypass its zoom rules.
    const currentSelection = selectedIncidentRef.current;
    const currentIsPolygon = currentSelection?.geometry_type === 'polygon' || currentSelection?.geometryType === 'polygon';
    if (currentSelection?.id === incidentIdFromUrl && !currentIsPolygon) {
      return;
    }
    if (currentIsPolygon) {
      return;
    }

    const inList = incidents.find((i) => i.id === incidentIdFromUrl);
    if (inList) {
      handleSelectIncident(inList, { skipFlyTo: hasSavedViewport, source: 'deep-link' });
      ghostFetchAttempted.current = true;
      return;
    }

    if (incidents.length > 0 && !ghostFetchAttempted.current) {
      ghostFetchAttempted.current = true;
      getIncident(incidentIdFromUrl)
        .then((res) => {
          if (res?.incident) {
            handleSelectIncident(res.incident, { skipFlyTo: hasSavedViewport, source: 'deep-link' });
          }
        })
        .catch((err) => {
          // Incident may have been soft-deleted. Try to load it from the recycle bin
          // so the user still sees a meaningful panel instead of a flash + empty state.
          if (err?.status === 404 || err?.code === 'NOT_FOUND') {
            getDeletedIncident(incidentIdFromUrl)
              .then((res) => {
                if (res?.incident) {
                  const deletedIncident = { ...res.incident, isDeleted: true };
                  setSelectedIncident(deletedIncident);
                  setSelectedZoneId(null);
                  setGhostZone(null);

                  // Fly the map to the deleted incident and render a ghost marker/zone.
                  const deepLinkPadding = getNextMapPadding({
                    focusMode: false,
                    activeDrawer: focusMode ? null : activeDrawer,
                    rightPanelCollapsed: false,
                    isPanelOpen: true,
                  });
                  if (deletedIncident.geometry_type === 'polygon' && deletedIncident.geometry?.coordinates?.[0]) {
                    const centroid = getZoneCentroid(deletedIncident);
                    const bounds = getZoneBounds(deletedIncident);
                    if (centroid && bounds) {
                      scheduleFlyTo(
                        {
                          type: 'zone',
                          source: 'deep-link',
                          lat: centroid.lat,
                          lng: centroid.lng,
                          bounds,
                          padding: deepLinkPadding,
                        },
                        isPanelOpen && !rightPanelCollapsed
                      );
                    }
                    setGhostZone(deletedIncident);
                  } else {
                    const lat = parseFloat(deletedIncident.latitude);
                    const lng = parseFloat(deletedIncident.longitude);
                    if (Number.isFinite(lat) && Number.isFinite(lng)) {
                      scheduleFlyTo(
                        { type: 'incident', source: 'deep-link', lat, lng, padding: deepLinkPadding },
                        isPanelOpen && !rightPanelCollapsed
                      );
                    }
                  }
                } else {
                  setSearchParams((prev) => {
                    const next = new URLSearchParams(prev);
                    next.delete('incident');
                    return next;
                  });
                }
              })
              .catch(() => {
                setSearchParams((prev) => {
                  const next = new URLSearchParams(prev);
                  next.delete('incident');
                  return next;
                });
              });
          } else {
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev);
              next.delete('incident');
              return next;
            });
          }
        });
    }
  }, [incidentIdFromUrl, incidents.length, handleSelectIncident, hasSavedViewport, setSearchParams, zoneIdFromUrl, getNextMapPadding, activeDrawer, focusMode, isPanelOpen, rightPanelCollapsed, scheduleFlyTo]);

  // ─── Zone selection ───
  const handleZoneClick = useCallback((zoneId, opts = {}) => {
    const panelAlreadyOpen = isPanelOpen && !rightPanelCollapsed;
    const source = opts.source || 'map';
    const zone = polygonIncidents.find((z) => z.id === zoneId)
      || (powerSearchMode ? psResults.find((z) => z.id === zoneId) : null);
    if (!zone) return;
    if (focusMode) {
      setFocusMode(false);
      setActiveDrawer(null);
    }
    setRightPanelCollapsed(false);
    setSelectedZoneId(zoneId);
    setSelectedIncident(zone);
    // Clear editing state when selecting a different zone
    setEditingZoneId(null);
    setEditingZoneVertices([]);
    setOriginalZoneVertices([]);
    // Comfort-fit the zone in the visible map area (smart selection camera).
    const centroid = getZoneCentroid(zone);
    const bounds = getZoneBounds(zone);
    if (centroid && bounds) {
      scheduleFlyTo(
        {
          type: 'zone',
          source,
          lat: centroid.lat,
          lng: centroid.lng,
          bounds,
          padding: getNextMapPadding({
            focusMode: false,
            activeDrawer: focusMode ? null : activeDrawer,
            rightPanelCollapsed: false,
            isPanelOpen: true,
          }),
        },
        panelAlreadyOpen
      );
    }
    // Update URL to make zone shareable
    lastInAppSelectAtRef.current = performance.now();
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('zone', zone.id);
      next.delete('incident');
      return next;
    });

    try {
      recordRecent({ incidentId: zone.id, title: zone.title });
    } catch {
      // ignore
    }
  }, [polygonIncidents, powerSearchMode, psResults, focusMode, recordRecent, setSearchParams, getNextMapPadding, activeDrawer, isPanelOpen, rightPanelCollapsed, scheduleFlyTo]);

  // ─── Drawing history helpers ───
  const pushToHistory = useCallback((vertices, isClosed) => {
    drawHistoryRef.current = drawHistoryRef.current.slice(0, historyIndexRef.current + 1);
    drawHistoryRef.current.push({ vertices: vertices.map((v) => [...v]), isClosed });
    historyIndexRef.current += 1;
    if (drawHistoryRef.current.length > 50) {
      drawHistoryRef.current.shift();
      historyIndexRef.current -= 1;
    }
    setDrawHistState({ canUndo: historyIndexRef.current > 0, canRedo: false });
  }, []);

  const handleDrawUndo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    const prev = drawHistoryRef.current[historyIndexRef.current];
    setDrawVertices(prev.vertices.map((v) => [...v]));
    setIsPolygonClosed(prev.isClosed);
    setSelectedDrawVertexIndex(null);
    setDrawHistState({
      canUndo: historyIndexRef.current > 0,
      canRedo: historyIndexRef.current < drawHistoryRef.current.length - 1,
    });
  }, []);

  const handleDrawRedo = useCallback(() => {
    if (historyIndexRef.current >= drawHistoryRef.current.length - 1) return;
    historyIndexRef.current += 1;
    const next = drawHistoryRef.current[historyIndexRef.current];
    setDrawVertices(next.vertices.map((v) => [...v]));
    setIsPolygonClosed(next.isClosed);
    setSelectedDrawVertexIndex(null);
    setDrawHistState({
      canUndo: historyIndexRef.current > 0,
      canRedo: historyIndexRef.current < drawHistoryRef.current.length - 1,
    });
  }, []);

  const pushToEditHistory = useCallback((vertices) => {
    editHistoryRef.current = editHistoryRef.current.slice(0, editHistoryIndexRef.current + 1);
    editHistoryRef.current.push(vertices.map((v) => [...v]));
    editHistoryIndexRef.current += 1;
    if (editHistoryRef.current.length > 50) {
      editHistoryRef.current.shift();
      editHistoryIndexRef.current -= 1;
    }
  }, []);

  const handleEditUndo = useCallback(() => {
    if (editHistoryIndexRef.current <= 0) return;
    editHistoryIndexRef.current -= 1;
    const prev = editHistoryRef.current[editHistoryIndexRef.current];
    setEditingZoneVertices(prev.map((v) => [...v]));
    setSelectedEditVertexIndex(null);
  }, []);

  // Clean up edit selection/history whenever edit mode is exited
  useEffect(() => {
    if (!editingZoneId) {
      setSelectedEditVertexIndex(null);
      editHistoryRef.current = [];
      editHistoryIndexRef.current = -1;
    }
  }, [editingZoneId]);

  // ─── Drawing handlers ───
  const handleSetMode = useCallback((mode) => {
    setMapMode(mode);
    if (mode === 'polygon') {
      setDrawVertices([]);
      setIsPolygonClosed(false);
      setShowZoneCreatePanel(false);
      setZoneInfoEditMode(false);
      setSelectedDrawVertexIndex(null);
      setDrawTool('polygon');
      drawHistoryRef.current = [{ vertices: [], isClosed: false }];
      historyIndexRef.current = 0;
      setDrawHistState({ canUndo: false, canRedo: false });
      // Clear editing state when entering drawing mode
      setEditingZoneId(null);
      setEditingZoneVertices([]);
      setOriginalZoneVertices([]);
      setSelectedEditVertexIndex(null);
      editHistoryRef.current = [];
      editHistoryIndexRef.current = -1;
    }
  }, []);

  const handleDrawVertexAdd = useCallback(({ lat, lng, insertIndex }) => {
    const prev = drawVerticesRef.current;
    const next = [...prev];
    if (insertIndex !== undefined && insertIndex !== null && insertIndex >= 0 && insertIndex < prev.length) {
      next.splice(insertIndex + 1, 0, [lng, lat]);
    } else {
      next.push([lng, lat]);
    }
    setDrawVertices(next);
    setSelectedDrawVertexIndex(null);
    pushToHistory(next, isPolygonClosedRef.current);
  }, [pushToHistory]);

  const handleDrawClose = useCallback(() => {
    setIsPolygonClosed(true);
    setShowZoneCreatePanel(true);
    setRightPanelCollapsed(false);
    setSelectedDrawVertexIndex(null);
    pushToHistory(drawVerticesRef.current, true);
  }, [pushToHistory]);

  const handleDrawCancel = useCallback(() => {
    setMapMode('pan');
    setDrawVertices([]);
    setIsPolygonClosed(false);
    setShowZoneCreatePanel(false);
    setSelectedDrawVertexIndex(null);
    setDrawTool('polygon');
    drawHistoryRef.current = [{ vertices: [], isClosed: false }];
    historyIndexRef.current = 0;
    setDrawHistState({ canUndo: false, canRedo: false });
  }, []);

  // ─── Draw tool state (Pan / Polygon / Circle) ───
  const [drawTool, setDrawTool] = useState('polygon');
  const [drawHistState, setDrawHistState] = useState({ canUndo: false, canRedo: false });

  const handleCircleComplete = useCallback(({ radiusMeters, vertices }) => {
    if (!vertices || radiusMeters < 50) {
      setToast({ message: 'Circle too small — drag a radius of at least 50 m.', type: 'error' });
      return;
    }
    // Circle becomes a closed 64-vertex polygon; one undo step removes it.
    setDrawVertices(vertices);
    setIsPolygonClosed(true);
    setSelectedDrawVertexIndex(null);
    pushToHistory(vertices, true);
  }, [pushToHistory]);

  const handleDrawFinish = useCallback(() => {
    if (isPolygonClosedRef.current) return;
    if (drawVerticesRef.current.length >= 3) {
      setIsPolygonClosed(true);
      setSelectedDrawVertexIndex(null);
      pushToHistory(drawVerticesRef.current, true);
    }
  }, [pushToHistory]);

  // Save finishes the shape (closing if needed) and opens the zone form —
  // superadmin's handleDrawClose also opens the create panel on close.
  const handleDrawSave = useCallback(() => {
    if (!isPolygonClosedRef.current) {
      if (drawVerticesRef.current.length >= 3) handleDrawClose();
      return;
    }
    setShowZoneCreatePanel(true);
    setRightPanelCollapsed(false);
  }, [handleDrawClose]);

  // Live area readout for the drawing toolbar.
  const polygonAreaText = useMemo(() => {
    if (drawVertices.length < 3) return null;
    const area = estimatePolygonAreaSqM(drawVertices);
    return area != null ? formatArea(area) : null;
  }, [drawVertices]);

  const handleDrawVertexSelect = useCallback((index) => {
    setSelectedDrawVertexIndex(index);
  }, []);

  const handleDrawVertexMove = useCallback((index, { lng, lat }) => {
    setDrawVertices((prev) => {
      const next = [...prev];
      next[index] = [lng, lat];
      return next;
    });
  }, []);

  const handleDrawVertexDragEnd = useCallback((index) => {
    pushToHistory(drawVerticesRef.current, isPolygonClosedRef.current);
  }, [pushToHistory]);

  const handleDrawVertexDelete = useCallback((index) => {
    if (drawVerticesRef.current.length <= 3) {
      console.warn('Cannot delete vertex: polygon must have at least 3 vertices');
      return;
    }
    const next = [...drawVerticesRef.current];
    next.splice(index, 1);
    setDrawVertices(next);
    setSelectedDrawVertexIndex(null);
    pushToHistory(next, isPolygonClosedRef.current);
  }, [pushToHistory]);

  const handleZoneCreateSubmit = useCallback(async (payload) => {
    setSubmitting(true);
    try {
      const res = await createIncident(payload);
      const newZone = res?.incident;
      setMapMode('pan');
      setDrawVertices([]);
      setIsPolygonClosed(false);
      setShowZoneCreatePanel(false);
      setSelectedDrawVertexIndex(null);
      drawHistoryRef.current = [{ vertices: [], isClosed: false }];
      historyIndexRef.current = 0;

      if (newZone) {
        // Select the newly created zone and fly the map to it
        setSelectedIncident(newZone);
        setSelectedZoneId(newZone.id);
        setEditingZoneId(null);
        setEditingZoneVertices([]);
        setOriginalZoneVertices([]);

        const centroid = getZoneCentroid(newZone);
        const bounds = getZoneBounds(newZone);
        if (centroid && bounds) {
          scheduleFlyTo(
            {
              type: 'zone',
              source: 'create',
              lat: centroid.lat,
              lng: centroid.lng,
              bounds,
              padding: getNextMapPadding({
                focusMode: false,
                activeDrawer: focusMode ? null : activeDrawer,
                rightPanelCollapsed: false,
                isPanelOpen: true,
              }),
            },
            isPanelOpen && !rightPanelCollapsed
          );
        }

        lastInAppSelectAtRef.current = performance.now();
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.set('zone', newZone.id);
          next.delete('incident');
          return next;
        });
      }

      setRefreshKey((k) => k + 1);
    } catch (err) {
      alert(err.message || 'Failed to create zone');
    } finally {
      setSubmitting(false);
    }
  }, [setSearchParams, getNextMapPadding, activeDrawer, focusMode, isPanelOpen, rightPanelCollapsed, scheduleFlyTo]);

  const handleEditZone = useCallback((explicitZone) => {
    const zone = explicitZone || polygonIncidents.find((z) => z.id === selectedZoneId);
    if (!zone || !zone.geometry?.coordinates?.[0]) return;

    // Clear drawing state and info-edit mode
    setMapMode('pan');
    setDrawVertices([]);
    setIsPolygonClosed(false);
    setShowZoneCreatePanel(false);
    setZoneInfoEditMode(false);

    const coords = [...zone.geometry.coordinates[0]];
    // Remove closing duplicate vertex if present
    if (coords.length > 1) {
      const first = coords[0];
      const last = coords[coords.length - 1];
      if (first[0] === last[0] && first[1] === last[1]) {
        coords.pop();
      }
    }

    setSelectedZoneId(zone.id);
    setSelectedIncident(zone);
    setEditingZoneId(zone.id);
    setEditingZoneVertices(coords);
    setOriginalZoneVertices(JSON.parse(JSON.stringify(coords)));
    setSelectedEditVertexIndex(null);
    editHistoryRef.current = [coords.map((v) => [...v])];
    editHistoryIndexRef.current = 0;
  }, [selectedZoneId, polygonIncidents]);

  const handleVertexDrag = useCallback((index, { lng, lat }) => {
    setEditingZoneVertices((prev) => {
      const next = [...prev];
      next[index] = [lng, lat];
      return next;
    });
  }, []);

  const handleVertexDragEnd = useCallback(() => {
    pushToEditHistory(editingZoneVerticesRef.current);
  }, [pushToEditHistory]);

  const handleMidpointClick = useCallback((edgeIndex) => {
    setEditingZoneVertices((prev) => {
      const a = prev[edgeIndex];
      const b = prev[(edgeIndex + 1) % prev.length];
      const midpoint = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const next = [...prev];
      next.splice(edgeIndex + 1, 0, midpoint);
      pushToEditHistory(next);
      return next;
    });
    setSelectedEditVertexIndex(null);
  }, [pushToEditHistory]);

  const handleVertexDoubleClick = useCallback((index) => {
    setEditingZoneVertices((prev) => {
      if (prev.length <= 3) {
        console.warn('Cannot delete vertex: polygon must have at least 3 vertices');
        return prev;
      }
      const next = [...prev];
      next.splice(index, 1);
      pushToEditHistory(next);
      return next;
    });
    setSelectedEditVertexIndex(null);
  }, [pushToEditHistory]);

  const handleEditVertexSelect = useCallback((index) => {
    setSelectedEditVertexIndex(index);
  }, []);

  const handleEditVertexDelete = useCallback((index) => {
    setEditingZoneVertices((prev) => {
      if (prev.length <= 3) {
        console.warn('Cannot delete vertex: polygon must have at least 3 vertices');
        return prev;
      }
      const next = [...prev];
      next.splice(index, 1);
      pushToEditHistory(next);
      return next;
    });
    setSelectedEditVertexIndex(null);
  }, [pushToEditHistory]);

  const handleZoneEditCancel = useCallback(() => {
    setEditingZoneId(null);
    setEditingZoneVertices([]);
    setOriginalZoneVertices([]);
    setSelectedEditVertexIndex(null);
    editHistoryRef.current = [];
    editHistoryIndexRef.current = -1;
  }, []);

  const handleZoneGeometrySave = useCallback(async () => {
    if (!editingZoneId || editingZoneVertices.length < 3) {
      alert('A zone must have at least 3 vertices');
      return;
    }
    setSubmitting(true);
    try {
      const closedRing = [...editingZoneVertices, editingZoneVertices[0]];
      await updateIncident(editingZoneId, {
        geometryType: 'polygon',
        geometry: { type: 'Polygon', coordinates: [closedRing] },
      });

      setEditingZoneId(null);
      setEditingZoneVertices([]);
      setOriginalZoneVertices([]);
      setSelectedEditVertexIndex(null);
      editHistoryRef.current = [];
      editHistoryIndexRef.current = -1;

      setRefreshKey((k) => k + 1);
      // Refetch the selected incident so the detail panel shows the new geometry
      const updated = await getIncident(editingZoneId);
      if (updated?.incident) {
        setSelectedIncident(updated.incident);
      }
    } catch (err) {
      alert(err.message || 'Failed to update zone geometry');
    } finally {
      setSubmitting(false);
    }
  }, [editingZoneId, editingZoneVertices]);

  const handleZoneInfoEdit = useCallback((explicitZone) => {
    const zone = explicitZone || selectedIncident;
    if (!zone || zone.geometry_type !== 'polygon') return;

    // Clear any active geometry editing/drawing state
    setMapMode('pan');
    setDrawVertices([]);
    setIsPolygonClosed(false);
    setShowZoneCreatePanel(false);
    setEditingZoneId(null);
    setEditingZoneVertices([]);
    setOriginalZoneVertices([]);
    setSelectedEditVertexIndex(null);

    setSelectedIncident(zone);
    setSelectedZoneId(zone.id);
    setZoneInfoEditMode(true);
    setRightPanelCollapsed(false);
  }, [selectedIncident]);

  const handleZoneInfoSubmit = useCallback(
    async (payload) => {
      if (!selectedIncident) return;
      setSubmitting(true);
      try {
        await updateIncident(selectedIncident.id, payload);
        const updated = await getIncident(selectedIncident.id);
        if (updated?.incident) {
          setSelectedIncident(updated.incident);
        }
        setZoneInfoEditMode(false);
        setRefreshKey((k) => k + 1);
      } catch (err) {
        alert(err.message || 'Failed to update zone info');
      } finally {
        setSubmitting(false);
      }
    },
    [selectedIncident]
  );

  // ─── General map context menu handlers ───
  const handleMarkerContextMenu = useCallback((incident, point) => {
    openMapMenu(point, { type: 'incident', incident });
  }, [openMapMenu]);

  const handleZoneContextMenu = useCallback((feature, point, latLng) => {
    const zoneId = feature?.properties?.id || feature?.id;
    const zone = polygonIncidents.find((z) => String(z.id) === String(zoneId));
    if (zone) {
      openMapMenu(point, { type: 'zone', zone, latLng });
    } else {
      openMapMenu(point, { type: 'empty', latLng });
    }
  }, [openMapMenu, polygonIncidents]);

  const handleMapContextMenu = useCallback((point, latLng) => {
    openMapMenu(point, { type: 'empty', latLng });
  }, [openMapMenu]);

  const handleResolveIncident = useCallback(async (id) => {
    try {
      await resolveIncident(id);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      alert(err.message || 'Failed to resolve incident');
    } finally {
      setConfirmDialog(null);
      closeMapMenu();
    }
  }, [closeMapMenu]);

  const handleDeleteIncident = useCallback(async (id) => {
    try {
      await deleteIncident(id);
      if (selectedIncident?.id === id) {
        setSelectedIncident(null);
        setSelectedZoneId(null);
        setGhostZone(null);
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.delete('incident');
          next.delete('zone');
          return next;
        });
      }
      setRefreshKey((k) => k + 1);
    } catch (err) {
      alert(err.message || 'Failed to delete incident');
    } finally {
      setConfirmDialog(null);
      closeMapMenu();
    }
  }, [selectedIncident, setSearchParams, closeMapMenu]);

  const copyCoordinates = useCallback(async (lat, lng) => {
    try {
      await navigator.clipboard.writeText(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    } catch {}
    closeMapMenu();
  }, [closeMapMenu]);

  const copyLink = useCallback(async (key, id) => {
    const url = new URL(window.location.href);
    url.searchParams.set(key, id);
    try {
      await navigator.clipboard.writeText(url.toString());
    } catch {}
    closeMapMenu();
  }, [closeMapMenu]);

  const handleCreateZoneHere = useCallback((lat, lng) => {
    setPointFormMode(null);
    setShowZoneCreatePanel(false);
    setZoneInfoEditMode(false);
    setSelectedIncident(null);
    setGhostZone(null);
    setMapMode('polygon');
    setTimeout(() => {
      handleDrawVertexAdd({ lat, lng });
    }, 0);
    closeMapMenu();
  }, [handleDrawVertexAdd, closeMapMenu]);

  const handleCreateIncidentHere = useCallback((lat, lng) => {
    setMapMode('pan');
    setShowZoneCreatePanel(false);
    setZoneInfoEditMode(false);
    setSelectedIncident(null);
    setSelectedZoneId(null);
    setGhostZone(null);
    setRightPanelCollapsed(false);
    setPointFormCoords({ lat, lng });
    setPointFormMode('create');
    closeMapMenu();
  }, [closeMapMenu]);

  const handleCenterMapHere = useCallback((lng, lat) => {
    mapRef.current?.centerAt(lng, lat);
    closeMapMenu();
  }, [closeMapMenu]);

  const handleResetMapView = useCallback(() => {
    mapRef.current?.resetView();
    closeMapMenu();
  }, [closeMapMenu]);

  const buildEmptyMenuItems = useCallback((latLng) => {
    if (!latLng) return [];
    const { lat, lng } = latLng;
    return [
      { label: 'Create Zone Here', onClick: () => handleCreateZoneHere(lat, lng) },
      { label: 'Create Incident Here', onClick: () => handleCreateIncidentHere(lat, lng) },
      { label: 'Center Map Here', onClick: () => handleCenterMapHere(lng, lat) },
      { label: 'Copy Coordinates', onClick: () => copyCoordinates(lat, lng) },
      { label: 'Reset Map View', onClick: handleResetMapView },
    ];
  }, [handleCreateZoneHere, handleCreateIncidentHere, handleCenterMapHere, copyCoordinates, handleResetMapView]);

  const buildIncidentMenuItems = useCallback((incident) => {
    if (!incident) return [];
    return [
      { label: 'View Details', onClick: () => { handleSelectIncident(incident); closeMapMenu(); } },
      { label: 'Edit Incident', onClick: () => { setSelectedIncident(incident); setPointFormMode('edit'); setRightPanelCollapsed(false); closeMapMenu(); } },
      { label: 'Resolve', onClick: () => setConfirmDialog({ type: 'resolve', id: incident.id, title: 'Resolve incident?', message: 'Mark this incident as resolved.', confirmText: 'Resolve', onConfirm: () => handleResolveIncident(incident.id) }) },
      { label: 'Delete', danger: true, onClick: () => setConfirmDialog({ type: 'delete', id: incident.id, title: 'Delete incident?', message: 'This action cannot be undone.', confirmText: 'Delete', danger: true, onConfirm: () => handleDeleteIncident(incident.id) }) },
      { label: 'Copy Link', onClick: () => copyLink('incident', incident.id) },
    ];
  }, [handleSelectIncident, handleResolveIncident, handleDeleteIncident, copyLink, closeMapMenu]);

  const buildZoneMenuItems = useCallback((zone) => {
    if (!zone) return [];
    return [
      { label: 'View Zone Details', onClick: () => { handleZoneClick(zone.id); closeMapMenu(); } },
      { label: 'Edit Zone Shape', onClick: () => { handleEditZone(zone); closeMapMenu(); } },
      { label: 'Edit Zone Info', onClick: () => { handleZoneInfoEdit(zone); closeMapMenu(); } },
      { label: 'Resolve', onClick: () => setConfirmDialog({ type: 'resolve', id: zone.id, title: 'Resolve zone?', message: 'Mark this zone as resolved.', confirmText: 'Resolve', onConfirm: () => handleResolveIncident(zone.id) }) },
      { label: 'Delete', danger: true, onClick: () => setConfirmDialog({ type: 'delete', id: zone.id, title: 'Delete zone?', message: 'This action cannot be undone.', confirmText: 'Delete', danger: true, onConfirm: () => handleDeleteIncident(zone.id) }) },
      { label: 'Copy Link', onClick: () => copyLink('zone', zone.id) },
    ];
  }, [handleZoneClick, handleEditZone, handleZoneInfoEdit, handleResolveIncident, handleDeleteIncident, copyLink, closeMapMenu]);

  const handlePointFormSubmit = useCallback(async (payload) => {
    setSubmitting(true);
    try {
      if (pointFormMode === 'edit' && selectedIncident) {
        await updateIncident(selectedIncident.id, payload);
        const updated = await getIncident(selectedIncident.id);
        if (updated?.incident) setSelectedIncident(updated.incident);
      } else {
        const res = await createIncident(payload);
        if (res?.incident) {
          setSelectedIncident(res.incident);
          setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.set('incident', res.incident.id);
            next.delete('zone');
            return next;
          });
        }
      }
      setPointFormMode(null);
      setPointFormCoords(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      alert(err.message || 'Failed to save incident');
    } finally {
      setSubmitting(false);
    }
  }, [pointFormMode, selectedIncident, setSearchParams]);

  const handlePointFormCancel = useCallback(() => {
    setPointFormMode(null);
    setPointFormCoords(null);
  }, []);

  // ─── Incident placement mode (ported from admin-web DashboardLayout) ───
  // Armed while the create form is open without coords; dismissed by Esc
  // (marker + typed coords stay). Edit mode only gets the draggable marker.
  const placementMode = pointFormMode === 'create';
  const [placementDismissed, setPlacementDismissed] = useState(false);
  const placementActive = placementMode && !placementDismissed;
  useEffect(() => {
    setPlacementDismissed(false);
  }, [pointFormMode, selectedIncident?.id]);

  useEffect(() => {
    if (!placementMode) return;
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (placementDismissed) {
        handlePointFormCancel();
      } else {
        setPlacementDismissed(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placementMode, placementDismissed]);

  const handlePlacementClick = useCallback(({ lat, lng }) => {
    setPointFormCoords({ lat, lng });
  }, []);

  const handleMarkerDragEnd = useCallback(({ lat, lng }) => {
    setPointFormCoords({ lat, lng });
  }, []);

  // Form fields → map: typing valid coords moves/drops the marker, easing the
  // map to it when it falls outside the current view.
  const handleFormCoordsChange = useCallback((lat, lng) => {
    const m = mapRef.current?.getMap?.();
    if (m) {
      const b = m.getBounds();
      const visible = lng >= b.getWest() && lng <= b.getEast() && lat >= b.getSouth() && lat <= b.getNorth();
      if (!visible) m.easeTo({ center: [lng, lat], duration: 600 });
    }
    setPointFormCoords({ lat, lng });
  }, []);

  // Edit-mode parity: show the incident's marker (draggable, two-way synced
  // with the form's lat/lng fields) whenever the edit form opens.
  useEffect(() => {
    if (pointFormMode !== 'edit' || !selectedIncident || selectedIncident.geometry_type === 'polygon') return;
    const lat = parseFloat(selectedIncident.latitude);
    const lng = parseFloat(selectedIncident.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) setPointFormCoords({ lat, lng });
  }, [pointFormMode, selectedIncident?.id]);

  // ─── Workspace chrome handlers ───
  const handleDrawerSelect = useCallback(
    (id) => {
      exitFocusMode();
      setActiveDrawer(id);
    },
    [exitFocusMode]
  );

  const toggleFocusMode = useCallback(() => {
    setFocusMode((prev) => {
      if (!prev) {
        preFocusRightCollapsedRef.current = rightPanelCollapsed;
        setRightPanelCollapsed(true);
      } else {
        setRightPanelCollapsed(preFocusRightCollapsedRef.current);
      }
      return !prev;
    });
  }, [rightPanelCollapsed]);

  const toggleCompactMode = useCallback(() => {
    setCompactMode((prev) => !prev);
  }, []);

  const toggleAutoZoom = useCallback(() => {
    setAutoZoomEnabled((prev) => !prev);
  }, []);

  // Add Incident: same creation flow as the context menu, opened without
  // pre-set coordinates (type them in or click the map to place).
  const handleAddIncident = useCallback(() => {
    exitFocusMode();
    // Placement mode and zone drawing are mutually exclusive — cancel any draw.
    if (mapMode === 'polygon') handleDrawCancel();
    setShowZoneCreatePanel(false);
    setZoneInfoEditMode(false);
    setSelectedIncident(null);
    setSelectedZoneId(null);
    setGhostZone(null);
    setEditingZoneId(null);
    setEditingZoneVertices([]);
    setOriginalZoneVertices([]);
    setPointFormCoords(null);
    setPointFormMode('create');
    setRightPanelCollapsed(false);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('incident');
      next.delete('zone');
      return next;
    });
  }, [exitFocusMode, setSearchParams, mapMode, handleDrawCancel]);

  // Add Zone: same polygon-drawing flow as "Create Zone Here".
  const handleAddZone = useCallback(() => {
    exitFocusMode();
    setPointFormMode(null);
    setPointFormCoords(null);
    setSelectedIncident(null);
    setSelectedZoneId(null);
    setGhostZone(null);
    setEditingZoneId(null);
    setEditingZoneVertices([]);
    setOriginalZoneVertices([]);
    handleSetMode('polygon');
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('incident');
      next.delete('zone');
      return next;
    });
  }, [exitFocusMode, handleSetMode, setSearchParams]);

  // Double-click on the map places a new incident marker and opens the form.
  const handleMapDblClick = useCallback(
    ({ lat, lng }) => {
      exitFocusMode();
      setSelectedIncident(null);
      setSelectedZoneId(null);
      setGhostZone(null);
      setShowZoneCreatePanel(false);
      setZoneInfoEditMode(false);
      setPointFormCoords({ lat, lng });
      setPointFormMode('create');
      setRightPanelCollapsed(false);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('incident');
        next.delete('zone');
        return next;
      });
    },
    [exitFocusMode, setSearchParams]
  );

  const handleResetToToday = useCallback(() => {
    setDateRange({ from: today, to: today });
  }, [today]);

  const handlePaletteSelectLocation = useCallback(({ lat, lng, zoom }) => {
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) return;
    setFlyToCoords({
      type: 'location',
      source: 'search',
      lat: parsedLat,
      lng: parsedLng,
      zoom: zoom || getZoomForLocation(),
    });
  }, []);

  const handlePaletteOpenAdvanced = useCallback((initialQuery) => {
    // The palette forwards its query (footer bridge / empty-state CTA) so
    // Power Search opens with the search already populated.
    if (typeof initialQuery === 'string' && initialQuery.trim()) {
      setPsQuery(initialQuery.trim());
    }
    setPowerSearchMode(true);
  }, []);

  // Quick actions + console page jumps (the old palette's QUICK_ACTIONS and
  // NAV_ACTIONS) for the shared palette's Actions scope. Nav rows carry their
  // route as `path` (rendered as trailing mono text) and as keywords so
  // typing a path still filters them in; `group` restores the old sub-group
  // headers.
  const paletteActions = useMemo(
    () => [
      { id: 'add-incident', label: 'Add new incident', icon: Plus, hint: 'I', group: 'Actions', onSelect: handleAddIncident },
      { id: 'add-zone', label: 'Add new zone', icon: Hexagon, hint: 'Z', group: 'Actions', onSelect: handleAddZone },
      { id: 'open-layers', label: 'Open layers panel', icon: Layers, hint: 'L', group: 'Actions', onSelect: () => handleDrawerSelect('layers') },
      { id: 'toggle-focus', label: 'Toggle focus mode', icon: Zap, hint: 'F', group: 'Actions', onSelect: toggleFocusMode },
      { id: 'open-power-search', label: 'Open power search', icon: Search, hint: 'P', group: 'Actions', onSelect: (action, query) => handlePaletteOpenAdvanced(query) },
      { id: 'nav-dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/superadmin', keywords: '/superadmin', group: 'Go to page', onSelect: () => navigate('/superadmin') },
      { id: 'nav-users', label: 'Staff Users', icon: Users, path: '/superadmin/users', keywords: '/superadmin/users', group: 'Go to page', onSelect: () => navigate('/superadmin/users') },
      { id: 'nav-public-users', label: 'Public Users', icon: Globe, path: '/superadmin/public-users', keywords: '/superadmin/public-users', group: 'Go to page', onSelect: () => navigate('/superadmin/public-users') },
      { id: 'nav-map', label: 'Map', icon: MapIcon, path: '/superadmin/map', keywords: '/superadmin/map', group: 'Go to page', onSelect: () => navigate('/superadmin/map') },
      { id: 'nav-audit', label: 'System Activity', icon: ClipboardList, path: '/superadmin/audit', keywords: '/superadmin/audit', group: 'Go to page', onSelect: () => navigate('/superadmin/audit') },
      { id: 'nav-public-activity', label: 'Public Activity', icon: Eye, path: '/superadmin/public-activity', keywords: '/superadmin/public-activity', group: 'Go to page', onSelect: () => navigate('/superadmin/public-activity') },
      { id: 'nav-recycle-bin', label: 'Recycle Bin', icon: Trash2, path: '/superadmin/recycle-bin', keywords: '/superadmin/recycle-bin', group: 'Go to page', onSelect: () => navigate('/superadmin/recycle-bin') },
      { id: 'nav-domains', label: 'Domains', icon: Tags, path: '/superadmin/domains', keywords: '/superadmin/domains', group: 'Go to page', onSelect: () => navigate('/superadmin/domains') },
      { id: 'nav-zone-categories', label: 'Zone Categories', icon: Hexagon, path: '/superadmin/zone-categories', keywords: '/superadmin/zone-categories', group: 'Go to page', onSelect: () => navigate('/superadmin/zone-categories') },
      { id: 'nav-system', label: 'System', icon: ActivityIcon, path: '/superadmin/system', keywords: '/superadmin/system', group: 'Go to page', onSelect: () => navigate('/superadmin/system') },
      { id: 'nav-export', label: 'Export', icon: Download, path: '/superadmin/export', keywords: '/superadmin/export', group: 'Go to page', onSelect: () => navigate('/superadmin/export') },
      { id: 'nav-x-archive-debug', label: 'X Archive Debug', icon: Archive, path: '/superadmin/x-archive-debug', keywords: '/superadmin/x-archive-debug', group: 'Go to page', onSelect: () => navigate('/superadmin/x-archive-debug') },
    ],
    [navigate, handleAddIncident, handleAddZone, handleDrawerSelect, toggleFocusMode, handlePaletteOpenAdvanced]
  );

  const handleDismissContext = useCallback(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('ref');
      next.delete('actor');
      next.delete('returnTo');
      return next;
    });
  }, [setSearchParams]);

  const handleBackToProfile = useCallback(() => {
    if (returnToParam) {
      navigate(returnToParam);
      return;
    }

    // If we came from an inline creator profile drawer, reopen it and close
    // the activity sidebar.
    if (staffUserId || publicUserId) {
      setCreatorDrawer({
        userId: staffUserId || publicUserId,
        role: publicUserId ? 'public_user' : 'admin',
      });
      handleDismissContext();
      return;
    }

    handleDismissContext();
  }, [returnToParam, navigate, staffUserId, publicUserId, setCreatorDrawer, handleDismissContext]);

  const handleSwitchToIncidentDate = (incident) => {
    const incidentDate = incident.start_date
      ? (() => {
          const d = new Date(incident.start_date);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        })()
      : today;
    setDateRange({ from: incidentDate, to: incidentDate });
  };

  // ─── Drawer data handlers ───
  const selectIncidentById = useCallback(
    (incidentId, incidentData, source = 'list') => {
      // SSE payloads carry unparsed geometry — for polygons, fetch the full
      // incident so fit-bounds and zone rendering get real coordinates.
      const usable =
        incidentData &&
        (incidentData.geometry_type !== 'polygon' || incidentData.geometry?.coordinates);
      if (usable) {
        handleSelectIncident(incidentData, { source });
        return;
      }
      const found = incidents.find((i) => i.id === incidentId);
      if (found) {
        handleSelectIncident(found, { source });
        return;
      }
      getIncident(incidentId)
        .then((res) => {
          if (res?.incident) handleSelectIncident(res.incident, { source });
        })
        .catch(() => {
          console.warn('Could not fetch incident', incidentId);
        });
    },
    [incidents, handleSelectIncident]
  );

  const handleSelectActivityIncident = useCallback(
    (incidentId) => {
      const activity = activities.find((a) => a.incidentId === incidentId);
      selectIncidentById(incidentId, activity?.incident || null, 'activity');
    },
    [activities, selectIncidentById]
  );

  const handleSelectNotificationIncident = useCallback(
    (incidentId) => {
      if (!incidentId) return;
      selectIncidentById(incidentId, null, 'notification');
    },
    [selectIncidentById]
  );

  const handleSelectRecent = useCallback(
    (recent) => {
      if (recent?.id) selectIncidentById(recent.id, null, 'recent');
    },
    [selectIncidentById]
  );

  const handleResolveFromDrawer = useCallback(async (id) => {
    try {
      await resolveIncident(id);
      setToast({ message: 'Incident resolved', type: 'success' });
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setToast({ message: err.message || 'Failed to resolve incident', type: 'error' });
    }
  }, []);

  const handleMarkAllRead = useCallback(() => {
    const nowTs = Date.now();
    setLastSeenTimestamp(nowTs);
    setLastSeen(nowTs);
  }, []);

  // ─── Power Search data fetching ───
  const fetchPowerSearchResults = useCallback(
    async ({ replace = true, nextOffset = 0 } = {}) => {
      setPsLoading(true);
      setPsError(null);
      try {
        const sortApi = SORT_OPTIONS_PS.find((s) => s.key === psSort)?.api || 'relevance';
        const params = {
          q: psQuery.trim() || undefined,
          dateFrom: psFilters.dateFrom || undefined,
          dateTo: psFilters.dateTo || undefined,
          domainSlugs: psFilters.domainSlugs.length ? psFilters.domainSlugs : undefined,
          categorySlugs: psFilters.categorySlugs.length ? psFilters.categorySlugs : undefined,
          severities: psFilters.severities.length ? psFilters.severities : undefined,
          statuses: psFilters.statuses.length ? psFilters.statuses : undefined,
          verificationStatuses: psFilters.verificationStatuses.length ? psFilters.verificationStatuses : undefined,
          sourceTypes: psFilters.sourceTypes.length ? psFilters.sourceTypes : undefined,
          geometryTypes: psFilters.geometryTypes.length ? psFilters.geometryTypes : undefined,
          savedOnly: psFilters.savedOnly ? true : undefined,
          sort: sortApi,
          limit: PS_PAGE_SIZE,
          offset: nextOffset,
        };
        const res = await searchIncidentsAdvanced(params);
        const fetched = res?.incidents || [];
        const count = res?.count || 0;
        if (replace) {
          setPsResults(fetched);
        } else {
          setPsResults((prev) => {
            const existing = new Set(prev.map((i) => i.id));
            return [...prev, ...fetched.filter((i) => !existing.has(i.id))];
          });
        }
        setPsTotal(count);
      } catch (err) {
        setPsError(err.message || 'Search failed');
        if (replace) {
          setPsResults([]);
          setPsTotal(0);
        }
      } finally {
        setPsLoading(false);
      }
    },
    [psQuery, psFilters, psSort]
  );

  useEffect(() => {
    if (!powerSearchMode) return;
    setPsOffset(0);
    if (psTimerRef.current) clearTimeout(psTimerRef.current);
    psTimerRef.current = setTimeout(() => {
      fetchPowerSearchResults({ replace: true, nextOffset: 0 });
    }, 300);
    return () => {
      if (psTimerRef.current) clearTimeout(psTimerRef.current);
    };
  }, [powerSearchMode, fetchPowerSearchResults]);

  const handlePowerSearchSelect = useCallback(
    (incident) => {
      if (!incident) return;
      handleSelectIncident(incident, { source: 'power-search' });
    },
    [handleSelectIncident]
  );

  const handleToggleSavedPowerSearch = useCallback(
    async (e, id) => {
      e?.stopPropagation?.();
      await toggleSaved(id);
    },
    [toggleSaved]
  );

  const handlePowerSearchLoadMore = useCallback(() => {
    const nextOffset = psOffset + PS_PAGE_SIZE;
    fetchPowerSearchResults({ replace: false, nextOffset });
    setPsOffset(nextOffset);
  }, [psOffset, fetchPowerSearchResults]);

  const handleResetPowerSearchFilters = useCallback(() => {
    setPsFilters(DEFAULT_PS_FILTERS);
    setPsQuery('');
    setPsSort('relevance');
  }, []);

  // ─── Keyboard shortcuts: ⌘K palette, ESC layers ───
  useEffect(() => {
    function onKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (powerSearchMode) return;
        setCommandPaletteOpen((prev) => !prev);
        return;
      }
      if (e.key === 'Escape') {
        // The command palette and confirm dialog handle their own ESC.
        if (commandPaletteOpen || confirmDialog) return;
        if (powerSearchMode) {
          setPowerSearchMode(false);
          return;
        }
        if (activeDrawer) setActiveDrawer(null);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [powerSearchMode, commandPaletteOpen, confirmDialog, activeDrawer]);

  // ─── Rail items ───
  const railItems = useMemo(
    () => [
      { id: 'layers', label: 'Layers', icon: Layers },
      { id: 'incidents', label: 'Incidents', icon: List },
      { id: 'active', label: 'Active', icon: Radio, badge: activeIncidentCount, overdue: overdueIncidentCount > 0 },
      { id: 'activity', label: 'Activity', icon: ActivityIcon, badge: unreadCount },
      { id: 'notifications', label: 'Notifications', icon: Bell, badge: notificationUnreadCount },
      { id: 'saved', label: 'Saved', icon: Bookmark },
      { id: 'recents', label: 'Recents', icon: Clock },
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
    [activeIncidentCount, overdueIncidentCount, unreadCount, notificationUnreadCount]
  );

  // Ghost incident / zone (selected item outside current date range)
  const ghostIncident = selectedIncident && !incidents.find((i) => i.id === selectedIncident.id)
    ? selectedIncident
    : null;
  const dateGhostZone = selectedIncident?.geometry_type === 'polygon' &&
    !polygonIncidents.find((z) => z.id === selectedIncident.id)
    ? selectedIncident
    : null;

  const bannerPadding = getNextMapPadding();

  return (
    <>
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
            activeCount={activeIncidentCount}
            overdueCount={overdueIncidentCount}
            onOpenActiveDrawer={() => handleDrawerSelect('active')}
            onToggleFocusMode={toggleFocusMode}
            isFocusMode={focusMode}
            onAddIncident={handleAddIncident}
            onAddZone={handleAddZone}
            user={user}
            onLogout={logout}
            compactMode={compactMode}
            onSaveReturnView={saveMapReturnView}
          />
        )}

        {/* Contextual banner (activity timeline / recycle-bin deep links) */}
        {showContextBanner && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 20px',
              background: 'var(--bg-surface)',
              borderBottom: '1px solid var(--border-subtle)',
              flexShrink: 0,
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: 'var(--navy-400)',
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>
                {'Showing incident from '}
                <span style={{ fontWeight: 700 }}>
                  {refParam === 'recyclebin'
                    ? 'Recycle Bin'
                    : actorParam
                    ? `${actorParam}'s activity`
                    : 'activity timeline'}
                </span>
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              <button
                onClick={refParam === 'recyclebin' ? handleBackToRecycleBin : handleBackToProfile}
                style={{
                  padding: '5px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: '1px solid var(--navy-500)',
                  background: 'linear-gradient(135deg, var(--navy-600), var(--navy-700))',
                  color: '#fff',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                  transition: 'all 0.2s ease',
                }}
              >
                ← {refParam === 'recyclebin' ? 'Back to Recycle Bin' : 'Back to profile'}
              </button>
              <button
                onClick={handleDismissContext}
                style={{
                  padding: '5px 10px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: '1px solid var(--border-subtle)',
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                  transition: 'all 0.2s ease',
                }}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        <div style={{ flex: 1, display: 'flex', alignItems: 'stretch', minHeight: 0, overflow: 'hidden', position: 'relative' }}>
          {!powerSearchMode && (
            <WorkspaceRail
              items={railItems}
              activeId={activeDrawer}
              onSelect={handleDrawerSelect}
              compactMode={compactMode}
            />
          )}

          {/* Workspace drawer — replaced by inspector sidebars in deep-link modes */}
          {activeDrawer && !focusMode && !powerSearchMode && !isActivityMode && !isRecycleBinMode && (
            <WorkspaceDrawer
              activeDrawer={activeDrawer}
              onClose={() => setActiveDrawer(null)}
              domains={domains}
              zoneCategories={zoneCategories}
              activeDomainSlugs={visibleDomainSlugs}
              activeZoneSlugs={activeZoneSlugs}
              onToggleDomain={handleToggleDomain}
              onToggleZone={handleToggleZone}
              onShowAllDomains={handleShowAllDomains}
              onHideAllDomains={handleHideAllDomains}
              onShowAllZones={handleShowAllZones}
              onHideAllZones={handleHideAllZones}
              visibleIncidents={filteredIncidents}
              onSelectIncident={(incident) => handleSelectIncident(incident, { source: 'drawer' })}
              activeIncidents={activeIncidents}
              overdueCount={overdueIncidentCount}
              onResolveIncident={handleResolveFromDrawer}
              activities={activities}
              activityLastSeenAt={lastSeenTimestamp}
              onMarkAllActivitySeen={handleMarkAllRead}
              onSelectActivityIncident={handleSelectActivityIncident}
              notifications={notifications}
              notificationUnreadCount={notificationUnreadCount}
              onMarkNotificationRead={markNotificationRead}
              onMarkAllNotificationsRead={markAllNotificationsRead}
              onSelectNotificationIncident={handleSelectNotificationIncident}
              savedIncidents={savedIncidents}
              onSelectSavedIncident={(incident) => handleSelectIncident(incident, { source: 'drawer' })}
              onUnsaveIncident={unsaveIncident}
              recents={recents}
              onClearRecents={clearRecents}
              onSelectRecentIncident={handleSelectRecent}
              autoZoomEnabled={autoZoomEnabled}
              onToggleAutoZoom={toggleAutoZoom}
              compactMode={compactMode}
              onToggleCompactMode={toggleCompactMode}
            />
          )}

          {/* Deep-link inspector sidebars (rendered in place of the workspace drawer) */}
          {isActivityMode && activitySidebarOpen && (
            <ActivityInspectorSidebar
              actorName={actorParam}
              staffUserId={staffUserId}
              publicUserId={publicUserId}
              selectedIncidentId={incidentIdFromUrl}
              selectionKey={activitySelectionKey}
              onIncidentClick={handleActivityIncidentClick}
              onToggleCollapse={handleToggleActivitySidebar}
              onClose={handleCloseActivitySidebar}
              onBackToProfile={handleBackToProfile}
            />
          )}
          {isRecycleBinMode && recycleBinSidebarOpen && (
            <RecycleBinSidebar
              selectedIncidentId={incidentIdFromUrl}
              onIncidentClick={handleRecycleBinIncidentClick}
              onToggleCollapse={handleToggleRecycleBinSidebar}
              onClose={handleCloseRecycleBinSidebar}
              onBackToRecycleBin={handleBackToRecycleBin}
            />
          )}
          {isActivityMode && !activitySidebarOpen && (
            <div
              style={{
                width: '44px',
                minWidth: '44px',
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                paddingTop: '12px',
                background: 'var(--bg-surface)',
                borderRight: '1px solid var(--border-subtle)',
              }}
            >
              <button
                type="button"
                onClick={handleToggleActivitySidebar}
                title="Show activity sidebar"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 32,
                  height: 32,
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                <PanelLeftOpen size={16} />
              </button>
            </div>
          )}
          {isRecycleBinMode && !recycleBinSidebarOpen && (
            <div
              style={{
                width: '44px',
                minWidth: '44px',
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                paddingTop: '12px',
                background: 'var(--bg-surface)',
                borderRight: '1px solid var(--border-subtle)',
              }}
            >
              <button
                type="button"
                onClick={handleToggleRecycleBinSidebar}
                title="Show recycle bin sidebar"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 32,
                  height: 32,
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                <PanelLeftOpen size={16} />
              </button>
            </div>
          )}

          {/* Center — Map */}
          <div style={{ flex: 1, position: 'relative', minWidth: 0, background: 'var(--bg-deep)' }}>
            <SuperadminMap
              ref={mapRef}
              incidents={powerSearchMode ? psResults : filteredIncidents}
              zones={powerSearchMode ? psResults.filter((i) => i.geometry_type === 'polygon') : visiblePolygonIncidents}
              showZones={powerSearchMode ? true : showZones}
              onZoneClick={handleZoneClick}
              selectedEventId={
                powerSearchMode && selectedIncident?.geometry_type === 'polygon' ? null : selectedIncident?.id
              }
              selectedZoneId={selectedZoneId}
              onEventClick={handleSelectIncident}
              onViewportChange={handleViewportChange}
              flyToCoords={flyToCoords}
              getMapPadding={getCurrentMapPadding}
              initialViewport={
                savedViewportRef.current
                  ? {
                      center: [savedViewportRef.current.lng, savedViewportRef.current.lat],
                      zoom: savedViewportRef.current.zoom,
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
              ghostZone={ghostZone || (!powerSearchMode ? dateGhostZone : null)}
              adminMode={true}
              mapMode={mapMode}
              drawVertices={drawVertices}
              isPolygonClosed={isPolygonClosed}
              onDrawVertexAdd={handleDrawVertexAdd}
              onDrawClose={handleDrawClose}
              onDrawCancel={handleDrawCancel}
              onDrawUndo={handleDrawUndo}
              onDrawRedo={handleDrawRedo}
              onDrawVertexSelect={handleDrawVertexSelect}
              onDrawVertexMove={handleDrawVertexMove}
              onDrawVertexDragEnd={handleDrawVertexDragEnd}
              onDrawVertexDelete={handleDrawVertexDelete}
              selectedDrawVertexIndex={selectedDrawVertexIndex}
              editingZoneId={editingZoneId}
              editingZoneVertices={editingZoneVertices}
              selectedEditVertexIndex={selectedEditVertexIndex}
              onVertexDrag={handleVertexDrag}
              onVertexDragEnd={handleVertexDragEnd}
              onMidpointClick={handleMidpointClick}
              onVertexDoubleClick={handleVertexDoubleClick}
              onEditVertexSelect={handleEditVertexSelect}
              onEditVertexDelete={handleEditVertexDelete}
              onEditUndo={handleEditUndo}
              onEditCancel={handleZoneEditCancel}
              onMarkerContextMenu={handleMarkerContextMenu}
              onZoneContextMenu={handleZoneContextMenu}
              onMapContextMenu={handleMapContextMenu}
              markerCoords={pointFormMode ? pointFormCoords : null}
              onMapDblClick={handleMapDblClick}
              autoZoomEnabled={autoZoomEnabled}
              placementMode={placementActive}
              markerDraggable={pointFormMode === 'create' || pointFormMode === 'edit'}
              onPlacementClick={handlePlacementClick}
              onMarkerDragEnd={handleMarkerDragEnd}
              drawTool={drawTool}
              onDrawToolChange={setDrawTool}
              onCircleComplete={handleCircleComplete}
              onDrawFinish={handleDrawFinish}
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

            <ConfirmDialog
              isOpen={!!confirmDialog}
              title={confirmDialog?.title || ''}
              message={confirmDialog?.message || ''}
              confirmText={confirmDialog?.confirmText || 'Confirm'}
              danger={confirmDialog?.danger || false}
              onConfirm={() => confirmDialog?.onConfirm?.()}
              onCancel={() => setConfirmDialog(null)}
            />

            {/* Drawing / edit toolbar overlay — 2.0 toolbar in draw mode;
                save/cancel bar stays for zone vertex-edit mode */}
            {editingZoneId ? (
            <div
              style={{
                position: 'absolute',
                top: '80px',
                right: '12px',
                zIndex: 20,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px',
                  background: 'var(--bg-surface)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-lg)',
                }}
              >
                <button
                  type="button"
                  onClick={handleZoneGeometrySave}
                  disabled={submitting}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    fontSize: '12px',
                    fontWeight: 600,
                    letterSpacing: '0.3px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--success, #22c55e)',
                    background: 'var(--success-bg, rgba(34,197,94,0.15))',
                    color: 'var(--success, #22c55e)',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.6 : 1,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span>✓</span>
                  <span>{submitting ? 'Saving…' : 'Save Changes'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleZoneEditCancel}
                  disabled={submitting}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    fontSize: '12px',
                    fontWeight: 600,
                    letterSpacing: '0.3px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid rgba(239,68,68,0.4)',
                    background: 'transparent',
                    color: 'var(--danger, #ef4444)',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.6 : 1,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span>✕</span>
                  <span>Cancel</span>
                </button>
              </div>
            </div>
            ) : mapMode === 'polygon' ? (
              <DrawingToolbar
                tool={drawTool}
                onToolChange={setDrawTool}
                canUndo={drawHistState.canUndo}
                canRedo={drawHistState.canRedo}
                onUndo={handleDrawUndo}
                onRedo={handleDrawRedo}
                onCancel={handleDrawCancel}
                onSave={handleDrawSave}
                vertexCount={drawVertices.length}
                areaText={polygonAreaText}
                isClosed={isPolygonClosed}
              />
            ) : null}

            {/* Incident placement toolbar */}
            {placementActive && (
              <PlacementToolbar
                markerCoords={pointFormCoords}
                onClear={() => setPointFormCoords(null)}
                onCancel={handlePointFormCancel}
              />
            )}

            {/* Incident counter overlay — top left */}
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
                  maxWidth: '340px',
                  lineHeight: 1.5,
                }}
              >
                <div>
                  <span style={{ color: 'var(--accent-light)', fontWeight: 700 }}>{filteredIncidents.length}</span>
                  {' incidents visible'}
                  {viewportFiltering === true && ' in current map area'}
                </div>
                {viewportFiltering === true && totalEventCount > 100 && (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {totalEventCount} total incidents match this date range — zoom or pan to explore
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
            {isRangeGated && !powerSearchMode && !focusMode && (
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

            {/* Ghost incident banner — centered on the visible map area */}
            {ghostIncident && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '16px',
                  left: `${bannerPadding.left + 16}px`,
                  right: `${bannerPadding.right + 16}px`,
                  zIndex: 20,
                  display: 'flex',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                }}
              >
                <div
                  style={{
                    background: 'var(--bg-surface)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    boxShadow: 'var(--shadow-md)',
                    maxWidth: '100%',
                    pointerEvents: 'auto',
                  }}
                >
                  <div
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: ghostIncident.isDeleted || ghostIncident.isPurged ? 'var(--danger)' : 'var(--text-muted)',
                      border: ghostIncident.isDeleted || ghostIncident.isPurged ? '2px solid var(--danger)' : '2px dashed var(--text-muted)',
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.4 }}>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                        {ghostIncident.title}
                      </span>
                      {ghostIncident.isDeleted || ghostIncident.isPurged ? (
                        <span style={{ color: 'var(--danger)', fontWeight: 500 }}>
                          {' — deleted incident (read-only)'}
                        </span>
                      ) : (
                        <>
                          {' occurred on '}
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
                        </>
                      )}
                    </p>
                  </div>
                  {ghostIncident.isDeleted || ghostIncident.isPurged ? (
                    <button
                      onClick={() => navigate('/superadmin/recycle-bin')}
                      style={{
                        padding: '6px 14px',
                        fontSize: '11px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--danger)',
                        background: 'var(--alert-error-bg)',
                        color: 'var(--danger)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      Open Recycle Bin
                    </button>
                  ) : (
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
                        background: 'var(--alert-error-bg)',
                        color: 'var(--accent-light)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      Switch to this date
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Panel — 630px absolute overlay that slides in with transform */}
          {rightPanelRendered && (
            <div
              ref={rightPanelRef}
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
                transform: rightPanelVisible ? 'translateX(0)' : 'translateX(100%)',
                transition: `transform ${RIGHT_PANEL_TRANSITION_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                pointerEvents: rightPanelVisible ? 'auto' : 'none',
                willChange: 'transform',
              }}
            >
              {pointFormMode ? (
                <IncidentForm
                  initialData={pointFormMode === 'edit' ? selectedIncident : null}
                  initialCoords={pointFormCoords}
                  categories={categories}
                  onSubmit={handlePointFormSubmit}
                  onCancel={handlePointFormCancel}
                  submitting={submitting}
                  onCoordsChange={handleFormCoordsChange}
                />
              ) : zoneInfoEditMode && selectedIncident ? (
                <div style={{ padding: '20px', overflowY: 'auto', flex: 1, minHeight: 0, boxSizing: 'border-box' }}>
                  <ZoneForm
                    geometry={selectedIncident.geometry}
                    initialData={selectedIncident}
                    onSubmit={handleZoneInfoSubmit}
                    onCancel={() => setZoneInfoEditMode(false)}
                    submitting={submitting}
                  />
                </div>
              ) : selectedIncident && !(selectedIncident.isDeleted || selectedIncident.isPurged || selectedIncident.status === 'hidden') ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  {selectedIncident.geometry_type === 'polygon' && !selectedIncidentDetail && (
                    <div
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid var(--border-subtle)',
                        display: 'flex',
                        gap: 10,
                        background: 'var(--bg-elevated)',
                        flexShrink: 0,
                      }}
                    >
                      <button
                        onClick={() => handleEditZone()}
                        style={{
                          padding: '6px 12px',
                          fontSize: 12,
                          fontWeight: 600,
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-subtle)',
                          background: 'var(--bg-surface)',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                        }}
                      >
                        Edit geometry
                      </button>
                      <button
                        onClick={() => handleZoneInfoEdit()}
                        style={{
                          padding: '6px 12px',
                          fontSize: 12,
                          fontWeight: 600,
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-subtle)',
                          background: 'var(--bg-surface)',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                        }}
                      >
                        Edit zone info
                      </button>
                    </div>
                  )}
                  {detailLoading ? (
                    <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                      Loading incident details…
                    </div>
                  ) : detailError ? (
                    <div style={{ padding: 24, textAlign: 'center', color: 'var(--danger)', fontSize: 13 }}>
                      {detailError}
                    </div>
                  ) : selectedIncidentDetail ? (
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                      {(
                        selectedIncidentDetail.incident.geometryType === 'polygon' ||
                        selectedIncidentDetail.incident.geometry_type === 'polygon' ||
                        selectedIncidentDetail.incident.geometry?.type === 'Polygon'
                      ) ? (
                        <ZoneDetailSidebar
                          mode="superadmin"
                          incident={selectedIncidentDetail.incident}
                          timeline={selectedIncidentDetail.timeline}
                          onBack={handleBack}
                          onFullDetails={handleNavigateToFullPage}
                          onShare={() => {
                            const url = `${window.location.origin}/zone/${selectedIncidentDetail.incident.id}`;
                            navigator.clipboard.writeText(url).catch(() => {});
                          }}
                          onEditZoneInfo={() => handleZoneInfoEdit()}
                          onEditZoneShape={() => handleEditZone()}
                          onResolve={() => {
                            if (window.confirm('Resolve zone? This will mark the zone as resolved.')) {
                              handleResolveSelectedIncident();
                            }
                          }}
                          onDelete={() => {
                            if (window.confirm('Delete zone? This will move the zone to the Recycle Bin.')) {
                              handleDeleteSelectedIncident();
                            }
                          }}
                          onRestore={() => {
                            if (window.confirm('Restore zone? This will return it to the live map.')) {
                              handleRestoreIncident();
                            }
                          }}
                          onPurge={() => {
                            if (window.confirm('Purge zone permanently? This cannot be undone.')) {
                              handlePurgeIncident();
                            }
                          }}
                          onAddUpdate={handleAddUpdate}
                          onEditUpdate={handleEditUpdate}
                          onDeleteUpdate={handleDeleteUpdate}
                          onAddEvidence={handleAddEvidence}
                          onEditEvidence={handleEditEvidence}
                          onDeleteEvidence={handleDeleteEvidence}
                          onPinEvidence={handlePinEvidence}
                          onFeatureEvidence={handleFeatureEvidence}
                          onClearFeatureEvidence={handleClearFeatureEvidence}
                          onCheckSource={handleCheckSource}
                          onArchiveSource={handleArchiveSource}
                          onOpenAudit={handleOpenAudit}
                          onViewCreator={handleViewCreator}
                          auditLogs={auditLogs}
                          onCollapse={() => setRightPanelCollapsed(true)}
                        />
                      ) : (
                        <IncidentDetailSidebar
                          mode="superadmin"
                          incident={selectedIncidentDetail.incident}
                          timeline={selectedIncidentDetail.timeline}
                          onNavigateToFullPage={handleNavigateToFullPage}
                          onCopyIncidentLink={handleCopyIncidentLink}
                          onUpdateIncident={handleUpdateIncident}
                          onResolveIncident={handleResolveSelectedIncident}
                          onDeleteIncident={handleDeleteSelectedIncident}
                          onRestoreIncident={handleRestoreIncident}
                          onPurgeIncident={handlePurgeIncident}
                          onAddUpdate={handleAddUpdate}
                          onEditUpdate={handleEditUpdate}
                          onDeleteUpdate={handleDeleteUpdate}
                          onAddEvidence={handleAddEvidence}
                          onEditEvidence={handleEditEvidence}
                          onDeleteEvidence={handleDeleteEvidence}
                          onPinEvidence={handlePinEvidence}
                          onFeatureEvidence={handleFeatureEvidence}
                          onClearFeatureEvidence={handleClearFeatureEvidence}
                          onArchiveSource={handleArchiveSource}
                          onCheckSource={handleCheckSource}
                          onAutoCheck={handleCheckSource}
                          onOpenAudit={handleOpenAudit}
                          onViewCreator={handleViewCreator}
                          auditLogs={auditLogs}
                          onCollapse={() => setRightPanelCollapsed(true)}
                        />
                      )}
                    </div>
                  ) : null}
                </div>
              ) : selectedIncident ? (
                <IncidentDetailPanel
                  incident={selectedIncident}
                  onBack={handleBack}
                  adminMode={true}
                  onRefresh={() => {
                    setRefreshKey((k) => k + 1);
                    setGhostZone(null);
                  }}
                  categories={categories}
                  onEditZone={handleEditZone}
                  onEditZoneInfo={handleZoneInfoEdit}
                  onViewCreator={(userId, role) => setCreatorDrawer({ userId, role })}
                />
              ) : (
                <div style={{ padding: '20px', overflowY: 'auto', flex: 1, minHeight: 0, boxSizing: 'border-box' }}>
                  <ZoneForm
                    geometry={{
                      type: 'Polygon',
                      coordinates: [drawVertices.length >= 3 ? [...drawVertices, drawVertices[0]] : drawVertices],
                    }}
                    onSubmit={handleZoneCreateSubmit}
                    onCancel={handleDrawCancel}
                    submitting={submitting}
                  />
                </div>
              )}
            </div>
          )}

          {/* Collapsed right-panel handle — show only after the panel has fully closed */}
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

          {/* Power Search full-viewport overlay (center stays transparent to the map) */}
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
              categories={psCategories}
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

        {/* Toast notification */}
        {toast && (
          <div
            style={{
              position: 'fixed',
              bottom: '24px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 2000,
              background: 'var(--bg-surface)',
              backdropFilter: 'blur(12px)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '14px 24px',
              boxShadow: 'var(--shadow-lg)',
              color: toast.type === 'error' ? 'var(--danger)' : 'var(--text-primary)',
              fontSize: '13px',
              fontWeight: 500,
              maxWidth: '480px',
              textAlign: 'center',
              lineHeight: 1.5,
            }}
            onClick={() => setToast(null)}
          >
            {toast.message}
          </div>
        )}
      </div>

      {/* Inline creator profile drawer */}
      {creatorDrawer.userId && creatorDrawer.role === 'public_user' && (
        <PublicUserDrawer
          userId={creatorDrawer.userId}
          onClose={() => setCreatorDrawer({ userId: null, role: null })}
          onIncidentClick={handleCreatorDrawerIncidentClick}
        />
      )}
      {creatorDrawer.userId && creatorDrawer.role !== 'public_user' && (
        <UserDetailDrawer
          userId={creatorDrawer.userId}
          onClose={() => setCreatorDrawer({ userId: null, role: null })}
          onIncidentClick={handleCreatorDrawerIncidentClick}
        />
      )}

      {/* Inline audit log drawer */}
      {auditDrawerOpen && selectedIncident?.id && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 13000,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setAuditDrawerOpen(false);
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 1100,
              maxHeight: '90vh',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Audit log — {selectedIncident.title}</h3>
              <button
                onClick={() => setAuditDrawerOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 32,
                  height: 32,
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                <PanelLeftOpen size={18} style={{ transform: 'rotate(180deg)' }} />
              </button>
            </div>
            <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
              <AuditTable
                logs={auditLogs}
                pagination={auditPagination}
                loading={auditLoading}
                onPageChange={(page) => fetchAuditLogs(page)}
                onUserClick={() => {}}
                onTargetClick={() => {}}
              />
            </div>
          </div>
        </div>
      )}

      {/* Command palette */}
      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        incidents={incidents}
        savedIds={savedIds}
        actions={paletteActions}
        onSelectIncident={(incident) => handleSelectIncident(incident, { source: 'palette' })}
        onSelectLocation={handlePaletteSelectLocation}
        onOpenAdvanced={handlePaletteOpenAdvanced}
        recentsKey="geowatch_superadmin_command_palette_recents_v2"
        legacyRecentsKey="geowatch_superadmin_command_palette_recents"
        bridgeHint="Open Power Search with this query"
        advancedLabel="Open power search"
      />
    </>
  );
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
  if (!Number.isFinite(minLng) || !Number.isFinite(maxLng) || !Number.isFinite(minLat) || !Number.isFinite(maxLat)) {
    return null;
  }
  return [[minLng, minLat], [maxLng, maxLat]];
}

function getZoomForLocation(type, cls) {
  const t = (type || '').toLowerCase();
  const c = (cls || '').toLowerCase();

  if (t === 'coordinates') return 16;
  if (t === 'continent') return 3;
  if (t === 'country') return 5;
  if (['state', 'province', 'region'].includes(t)) return 7;
  if (['county', 'district'].includes(t)) return 9;
  if (t === 'city') return 11;
  if (t === 'town') return 13;
  if (t === 'village') return 14;
  if (['suburb', 'neighbourhood', 'neighborhood', 'quarter'].includes(t)) return 15;
  if (['street', 'road', 'square', 'farm', 'allotments'].includes(t)) return 16;
  if (['house', 'building', 'place_of_worship', 'museum', 'hospital', 'school', 'university', 'college'].includes(t)) return 17;
  if (['river', 'lake', 'water', 'reservoir', 'pond'].includes(t)) return 12;
  if (['mountain', 'peak', 'volcano', 'ridge'].includes(t)) return 13;
  if (['airport', 'station', 'bus_station', 'railway_station'].includes(t)) return 14;

  if (c === 'boundary') return 9;
  if (c === 'place') return 12;
  if (c === 'highway') return 16;

  return 11;
}
