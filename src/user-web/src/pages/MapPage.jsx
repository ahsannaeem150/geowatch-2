import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Layers,
  AlertCircle,
  Activity as ActivityIcon,
  Bookmark,
  Settings,
  Zap,
} from 'lucide-react';
import { api, mapIncidentForShared } from '../services/api.js';
import { API_BASE_URL } from '@shared/constants.js';
import UserMap from '../components/Map/UserMap.jsx';
import WorkspaceTopBar from '../components/Layout/WorkspaceTopBar.jsx';
import WorkspaceRail from '../components/Layout/WorkspaceRail.jsx';
import WorkspaceDrawer from '../components/Layout/WorkspaceDrawer.jsx';
import PowerSearchPanel from '../components/Layout/PowerSearchPanel.jsx';
import UserCommandPalette from '../components/Layout/UserCommandPalette.jsx';
import AwayBanner from '../components/AwayBanner/AwayBanner.jsx';
import MapLegend from '@shared/components/MapLegend.jsx';
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

  // ─── Date & filters ───
  const today = getToday();
  const [dateRange, setDateRange] = useState({ from: today, to: today });
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [flyToCoords, setFlyToCoords] = useState(
    hasViewportParams
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
    verifiedOnly: false,
  });

  // ─── Domain / Zone legend ───
  const [domains, setDomains] = useState([]);
  const [zoneCategories, setZoneCategories] = useState([]);
  const [activeDomainFilters, setActiveDomainFilters] = useState(new Set());
  const [activeZoneSlugs, setActiveZoneSlugs] = useState(new Set());
  const [showZones, setShowZones] = useState(true);

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

      const pointParams = { dateFrom: dateRange.from, dateTo: dateRange.to, ...baseParams };
      const zoneParams = { dateFrom: dateRange.from, dateTo: dateRange.to, geometryType: 'polygon' };

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
  }, [dateRange.from, dateRange.to, filters.categoryId, filters.severity, closeMapMenu]);

  // Fetch domains and zone categories
  useEffect(() => {
    api.getDomains()
      .then((res) => setDomains(res.data.domains || []))
      .catch(() => setDomains([]));
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

  const visibleIncidents = useMemo(() => {
    if (!filters.verifiedOnly) return pointIncidents;
    return pointIncidents.filter((i) => i.verification_status === 'verified');
  }, [pointIncidents, filters.verifiedOnly]);

  const activeIncidents = useMemo(() => {
    return pointIncidents.filter((i) => i.status === 'active');
  }, [pointIncidents]);

  const overdueCount = useMemo(() => {
    const nowMs = Date.now();
    return activeIncidents.filter((i) => {
      const t = i.created_at || i.createdAt;
      if (!t) return false;
      return nowMs - new Date(t).getTime() > 24 * 60 * 60 * 1000;
    }).length;
  }, [activeIncidents]);

  const visibleSavedIncidents = useMemo(() => {
    let result = savedIncidents;
    if (filters.verifiedOnly) {
      result = result.filter((i) => i.verification_status === 'verified');
    }
    if (activeDomainFilters.size > 0) {
      result = result.filter((i) => !activeDomainFilters.has(i.domain_slug));
    }
    return result;
  }, [savedIncidents, filters.verifiedOnly, activeDomainFilters]);

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

      if (center && Number.isFinite(zoom)) {
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            next.set('lat', center.lat.toFixed(6));
            next.set('lng', center.lng.toFixed(6));
            next.set('zoom', zoom.toFixed(2));
            if (!selectedIncidentRef.current) {
              next.delete('incident');
              next.delete('zone');
            }
            return next;
          },
          { replace: true }
        );
      }

      if (viewportFilteringRef.current === true) {
        const pointParams = {
          dateFrom: dateRange.from,
          dateTo: dateRange.to,
          viewport: bounds,
        };
        if (filters.categoryId) pointParams.categoryId = filters.categoryId;
        if (filters.severity) pointParams.severity = filters.severity;

        const zoneParams = {
          dateFrom: dateRange.from,
          dateTo: dateRange.to,
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
      setSelectedIncident(incident);

      const isPolygon = incident.geometry_type === 'polygon';
      const padding = getNextMapPadding();

      if (!opts.skipFlyTo) {
        if (isPolygon) {
          if (skipNextZoneFitRef.current) {
            skipNextZoneFitRef.current = false;
            setFlyToCoords({
              lat: parseFloat(incident.latitude),
              lng: parseFloat(incident.longitude),
              type: 'zone',
              source: opts.source || 'list',
              padding,
            });
          } else if (incident.geometry?.coordinates?.[0]) {
            const coords = incident.geometry.coordinates[0];
            let minLng = Infinity,
              minLat = Infinity,
              maxLng = -Infinity,
              maxLat = -Infinity;
            coords.forEach(([lng, lat]) => {
              minLng = Math.min(minLng, lng);
              minLat = Math.min(minLat, lat);
              maxLng = Math.max(maxLng, lng);
              maxLat = Math.max(maxLat, lat);
            });
            setFlyToCoords({
              lat: parseFloat(incident.latitude),
              lng: parseFloat(incident.longitude),
              type: 'zone',
              source: opts.source || 'list',
              bounds: [
                [minLng, minLat],
                [maxLng, maxLat],
              ],
              padding,
            });
          }
        } else {
          setFlyToCoords({
            lat: parseFloat(incident.latitude),
            lng: parseFloat(incident.longitude),
            type: 'incident',
            source: opts.source || 'list',
            padding,
          });
        }
      } else {
        setFlyToCoords(null);
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
    [getNextMapPadding, setSearchParams]
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
    setFlyToCoords(null);

    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('incident');
        next.delete('zone');
        return next;
      },
      { replace: true }
    );
  }, [setSearchParams]);

  const handleNavigateToFullPage = useCallback(
    (incidentId) => {
      const map = mapRef.current?.getMap?.();
      const isZone = selectedIncident?.geometry_type === 'polygon';

      const saveMapViewAndNavigate = () => {
        if (map) {
          const center = map.getCenter();
          const zoom = map.getZoom();
          sessionStorage.setItem(
            'geowatch_user_return_view',
            JSON.stringify({ lat: center.lat, lng: center.lng, zoom })
          );
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
        if (isZone) {
          sessionStorage.setItem('geowatch_user_selected_zone', incidentId);
        }
        sessionStorage.setItem('geowatch_user_returning', '1');
        navigate(isZone ? `/zone/${incidentId}` : `/incident/${incidentId}`);
      };

      if (map && map.isMoving()) {
        map.once('moveend', saveMapViewAndNavigate);
      } else {
        saveMapViewAndNavigate();
      }
    },
    [navigate, selectedIncident?.geometry_type, setSearchParams]
  );

  // Restore exact map view and selected zone when returning from a full-page detail view
  useEffect(() => {
    const returningZoneId = sessionStorage.getItem('geowatch_user_selected_zone');
    if (returningZoneId) {
      sessionStorage.removeItem('geowatch_user_selected_zone');
      skipNextZoneFitRef.current = true;
      const zone = incidents.find((i) => i.id === returningZoneId);
      if (zone) {
        setSelectedIncident(zone);
      } else {
        api.getIncident(returningZoneId)
          .then((res) => {
            if (res.data?.incident) {
              setSelectedIncident(res.data.incident);
            }
          })
          .catch(() => {});
      }
    }

    if (sessionStorage.getItem('geowatch_user_returning') !== '1') return;
    sessionStorage.removeItem('geowatch_user_returning');
    skipNextZoneFitRef.current = true;
    const raw = sessionStorage.getItem('geowatch_user_return_view');
    sessionStorage.removeItem('geowatch_user_return_view');
    if (!raw) return;
    try {
      const { lat, lng, zoom } = JSON.parse(raw);
      if (Number.isFinite(lat) && Number.isFinite(lng) && Number.isFinite(zoom)) {
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            next.set('lat', Number(lat).toFixed(6));
            next.set('lng', Number(lng).toFixed(6));
            next.set('zoom', Number(zoom).toFixed(2));
            return next;
          },
          { replace: true }
        );
      }
    } catch {
      // ignore malformed stored view
    }
  }, [incidents, setSearchParams]);

  // ─── Handle incident ID from URL — robust deep-linking with ghost support ───
  useEffect(() => {
    if (!incidentIdFromUrl) {
      ghostFetchAttempted.current = false;
      return;
    }

    if (selectedIncident?.geometry_type === 'polygon') return;

    const inList = incidents.find((i) => i.id === incidentIdFromUrl);
    if (inList) {
      handleSelectIncident(inList, { skipFlyTo: hasViewportParams, source: 'deep-link' });
      ghostFetchAttempted.current = true;
      return;
    }

    if (incidents.length > 0 && !ghostFetchAttempted.current) {
      ghostFetchAttempted.current = true;
      api
        .getIncident(incidentIdFromUrl)
        .then((res) => {
          if (res.data?.incident) {
            handleSelectIncident(res.data.incident, { skipFlyTo: hasViewportParams, source: 'deep-link' });
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
  }, [incidentIdFromUrl, incidents.length, handleSelectIncident, hasViewportParams, setSearchParams]);

  // ─── Handle zone ID from URL — deep-linking with ghost support ───
  useEffect(() => {
    if (!zoneIdFromUrl) {
      zoneGhostFetchAttempted.current = false;
      return;
    }

    if (selectedIncident?.id === zoneIdFromUrl && selectedIncident?.geometry_type === 'polygon') {
      return;
    }

    const inList = incidents.find((i) => i.id === zoneIdFromUrl);
    if (inList) {
      handleSelectIncident(inList, { skipFlyTo: hasViewportParams, source: 'deep-link' });
      zoneGhostFetchAttempted.current = true;
      return;
    }

    if (incidents.length > 0 && !zoneGhostFetchAttempted.current) {
      zoneGhostFetchAttempted.current = true;
      api
        .getIncident(zoneIdFromUrl)
        .then((res) => {
          if (res.data?.incident) {
            handleSelectIncident(res.data.incident, { skipFlyTo: hasViewportParams, source: 'deep-link' });
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
  }, [zoneIdFromUrl, incidents.length, handleSelectIncident, hasViewportParams, setSearchParams]);

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
      setPowerSearchMode(false);
      handleSelectIncident(incident, { source: 'power-search' });
    },
    [handleSelectIncident]
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

  // ─── Rail items ───
  const railItems = useMemo(
    () => [
      { id: 'layers', label: 'Layers', icon: Layers },
      { id: 'incidents', label: 'Incidents', icon: AlertCircle },
      { id: 'active', label: 'Active', icon: Zap, badge: activeIncidents.length, overdue: overdueCount > 0 },
      { id: 'activity', label: 'Activity', icon: ActivityIcon, badge: unreadCount },
      ...(isAuthenticated
        ? [{ id: 'saved', label: 'Saved', icon: Bookmark, badge: savedIncidents.length }]
        : []),
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
    [activeIncidents.length, overdueCount, unreadCount, isAuthenticated, savedIncidents.length]
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
      <WorkspaceTopBar
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onResetToToday={handleResetToToday}
        onOpenSearch={() => setCommandPaletteOpen(true)}
        onOpenAdvancedSearch={() => setPowerSearchMode(true)}
        onToggleFocusMode={() => setFocusMode((p) => !p)}
        isFocusMode={focusMode}
        onOpenZones={() => setActiveDrawer((p) => (p === 'layers' ? null : 'layers'))}
        compactMode={compactMode}
        onToggleCompactMode={() => setCompactMode((p) => !p)}
        verifiedOnly={filters.verifiedOnly}
        onToggleVerifiedOnly={() => setFilters((p) => ({ ...p, verifiedOnly: !p.verifiedOnly }))}
      />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        {!focusMode && !powerSearchMode && (
          <WorkspaceRail
            items={railItems}
            activeId={activeDrawer}
            onSelect={(id) => setActiveDrawer((p) => (p === id ? null : id))}
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
            overdueCount={overdueCount}
            activities={activities}
            activityLastSeenAt={lastSeenTimestamp}
            onMarkAllActivitySeen={handleMarkAllRead}
            onSelectActivityIncident={handleSelectEventFromActivity}
            savedIncidents={visibleSavedIncidents}
            onSelectSavedIncident={handleSelectIncident}
            onUnsaveIncident={(id) => handleSaveChange(id, false)}
            autoZoomEnabled={autoZoomEnabled}
            onToggleAutoZoom={() => setAutoZoomEnabled((p) => !p)}
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
                ? { center: [parseFloat(lngParam), parseFloat(latParam)], zoom: parseFloat(zoomParam) }
                : null
            }
            ghostIncident={ghostIncident}
            ghostZone={ghostZone}
            showZones={powerSearchMode ? true : showZones}
            onMarkerContextMenu={handleMarkerContextMenu}
            onZoneContextMenu={handleZoneContextMenu}
            onMapContextMenu={handleMapContextMenu}
            autoZoomEnabled={autoZoomEnabled}
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

          {!powerSearchMode && (
            <MapLegend
              domains={domains}
              activeDomainFilters={activeDomainFilters}
              onToggleDomain={handleToggleDomain}
              onShowAll={handleShowAllDomains}
              onHideAll={handleHideAllDomains}
              showZones={showZones}
              onToggleZones={handleToggleZones}
            />
          )}

          {/* Incident counter overlay */}
          {!powerSearchMode && !focusMode && (
            <div
              style={{
                position: 'absolute',
                top: '12px',
                left: `calc(12px + ${bannerPadding.left}px)`,
                background: 'var(--bg-surface)',
                backdropFilter: 'blur(8px)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 14px',
                fontSize: '12px',
                color: 'var(--text-secondary)',
                zIndex: 10,
                maxWidth: '340px',
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
                {viewportFiltering === true && ' in current map area'}
              </div>
              {viewportFiltering === true && totalEventCount > 100 && (
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {totalEventCount} total incidents match this date range — zoom or pan to explore
                </div>
              )}
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
              top: 0,
              right: 0,
              bottom: 0,
              width: 'var(--admin-right-panel-width)',
              background: 'var(--bg-surface)',
              borderLeft: '1px solid var(--border-default)',
              boxShadow: 'var(--shadow-lg)',
              zIndex: 45,
              transform: `translateX(${rightPanelVisible && !rightPanelCollapsed ? '0%' : '100%'})`,
              transition: `transform ${RIGHT_PANEL_TRANSITION_MS}ms ease`,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {panelMode === 'incident' && (
              <IncidentDetailSidebar
                incident={detail?.incident}
                timeline={detail?.timeline}
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
                incident={detail?.incident}
                timeline={detail?.timeline}
                mode="user"
                onBack={handleBack}
                onFullDetails={handleNavigateToFullPage}
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
          </div>
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
            domains={domains}
            categories={[]}
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
      />
    </div>
  );
}
