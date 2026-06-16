import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import TopBar from './TopBar.jsx';
import AdminMap from '../Map/AdminMap.jsx';
import IncidentForm from '../IncidentForm/IncidentForm.jsx';
import { IncidentDetailSidebar } from '@shared';
import LocationSearch from '../LocationSearch/LocationSearch.jsx';
import SearchModal from '../SearchModal/SearchModal.jsx';
import AdminLiveFeed from '../LiveActivity/AdminLiveFeed.jsx';
import DrawingToolbar from '../Map/DrawingToolbar.jsx';
import ZoneForm from '../ZoneForm/ZoneForm.jsx';
import MapContextMenu from '../Map/MapContextMenu.jsx';
import { useMapContextMenu } from '@shared/hooks/useMapContextMenu.js';
import { ConfirmDialog } from '@shared/components/ConfirmDialog.jsx';
import MapLegend from '@shared/components/MapLegend.jsx';
import { reverseGeocode } from '../../utils/reverseGeocode.js';
import { api, mapIncidentForShared } from '../../services/api.js';
import { API_BASE_URL } from '@shared/constants.js';

const MAX_ACTIVITIES = 50;
const LS_KEY = 'geowatch_admin_last_seen';

function getLastSeen() {
  const raw = localStorage.getItem(LS_KEY);
  return raw ? parseInt(raw, 10) : Date.now();
}

function setLastSeen(ts) {
  localStorage.setItem(LS_KEY, String(ts));
}

function pointToSegmentDistance(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  if (dx === 0 && dy === 0) return Math.sqrt((p[0] - a[0]) ** 2 + (p[1] - a[1]) ** 2);

  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)));
  const projX = a[0] + t * dx;
  const projY = a[1] + t * dy;
  return Math.sqrt((p[0] - projX) ** 2 + (p[1] - projY) ** 2);
}

function findNearestSegmentIndex(point, vertices) {
  let minIdx = -1;
  let minDist = Infinity;
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % vertices.length];
    const dist = pointToSegmentDistance(point, a, b);
    if (dist < minDist) {
      minDist = dist;
      minIdx = i;
    }
  }
  return minIdx;
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
  if (['street', 'road', 'square', 'farm', ' allotments'].includes(t)) return 16;
  if (['house', 'building', 'place_of_worship', 'museum', 'hospital', 'school', 'university', 'college'].includes(t)) return 17;
  if (['river', 'lake', 'water', 'reservoir', 'pond'].includes(t)) return 12;
  if (['mountain', 'peak', 'volcano', 'ridge'].includes(t)) return 13;
  if (['airport', 'station', 'bus_station', 'railway_station'].includes(t)) return 14;

  if (c === 'boundary') return 9;
  if (c === 'place') return 12;
  if (c === 'highway') return 16;

  return 11;
}

export default function DashboardLayout() {
  // Use local timezone date, not UTC
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const [dateRange, setDateRange] = useState({ from: today, to: today });
  const [incidents, setEvents] = useState([]);
  const [panelMode, setPanelMode] = useState('empty'); // 'empty' | 'detail' | 'form' | 'zones' | 'zone-detail'
  const [selectedIncident, setSelectedIncident] = useState(null);
  const selectedIncidentRef = useRef(selectedIncident);
  selectedIncidentRef.current = selectedIncident;
  const [selectedIncidentDetail, setSelectedIncidentDetail] = useState(null);
  const [selectedIncidentDetailLoading, setSelectedIncidentDetailLoading] = useState(false);
  const [detailRefreshKey, setDetailRefreshKey] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [markerCoords, setMarkerCoords] = useState(null);
  const [flyToCoords, setFlyToCoords] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [toast, setToast] = useState(null);

  // ─── Zones (polygon incidents) ───
  const [selectedZoneId, setSelectedZoneId] = useState(null);
  const [fitBounds, setFitBounds] = useState(null);
  const polygonIncidents = useMemo(
    () => incidents.filter((i) => i.geometry_type === 'polygon'),
    [incidents]
  );

  // ─── Zone Drawing ───
  const [mapMode, setMapMode] = useState('pan'); // 'pan' | 'polygon'
  const [drawVertices, setDrawVertices] = useState([]);
  const [isPolygonClosed, setIsPolygonClosed] = useState(false);
  const isPolygonClosedRef = useRef(isPolygonClosed);
  const [showZoneCreatePanel, setShowZoneCreatePanel] = useState(false);
  const [selectedDrawVertexIndex, setSelectedDrawVertexIndex] = useState(null);
  const [drawContextMenu, setDrawContextMenu] = useState(null); // { x, y, type, index }
  const mapRef = useRef(null);
  const {
    isOpen: mapMenuOpen,
    position: mapMenuPosition,
    feature: mapMenuFeature,
    open: openMapMenu,
    close: closeMapMenu,
  } = useMapContextMenu();
  const [confirmDialog, setConfirmDialog] = useState(null);

  // ─── Zone Editing ───
  const [editingZoneId, setEditingZoneId] = useState(null);
  const [editingZoneVertices, setEditingZoneVertices] = useState([]);
  const [originalZoneVertices, setOriginalZoneVertices] = useState([]);
  const [selectedEditVertexIndex, setSelectedEditVertexIndex] = useState(null);
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

  const pushToHistory = useCallback((vertices, isClosed) => {
    drawHistoryRef.current = drawHistoryRef.current.slice(0, historyIndexRef.current + 1);
    drawHistoryRef.current.push({ vertices: vertices.map((v) => [...v]), isClosed });
    historyIndexRef.current += 1;
    if (drawHistoryRef.current.length > 50) {
      drawHistoryRef.current.shift();
      historyIndexRef.current -= 1;
    }
  }, []);

  const handleDrawUndo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    const prev = drawHistoryRef.current[historyIndexRef.current];
    setDrawVertices(prev.vertices.map((v) => [...v]));
    setIsPolygonClosed(prev.isClosed);
    setSelectedDrawVertexIndex(null);
  }, []);

  const handleDrawRedo = useCallback(() => {
    if (historyIndexRef.current >= drawHistoryRef.current.length - 1) return;
    historyIndexRef.current += 1;
    const next = drawHistoryRef.current[historyIndexRef.current];
    setDrawVertices(next.vertices.map((v) => [...v]));
    setIsPolygonClosed(next.isClosed);
    setSelectedDrawVertexIndex(null);
  }, []);

  // ─── Edit Mode Undo History ───
  const editHistoryRef = useRef([]);
  const editHistoryIndexRef = useRef(-1);

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

  // Search modal state
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchModalQuery, setSearchModalQuery] = useState('');

  // Smart viewport filtering state
  const [viewportFiltering, setViewportFiltering] = useState(null);
  const [totalEventCount, setTotalEventCount] = useState(0);
  const viewportBoundsRef = useRef(null);
  const viewportFilteringRef = useRef(null);

  // ─── URL Sharing (Deep-linking) ───
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const incidentIdFromUrl = searchParams.get('incident');
  const zoneIdFromUrl = searchParams.get('zone');
  const ghostFetchAttempted = useRef(false);
  const zoneDeepLinkProcessed = useRef(false);

  // ─── Domain Filter / Legend ───
  const [domains, setDomains] = useState([]);
  const [activeDomainFilters, setActiveDomainFilters] = useState(new Set());
  const [showZones, setShowZones] = useState(true);

  // ─── Live Activity Feed ───
  const [activities, setActivities] = useState([]);
  const [feedCollapsed, setFeedCollapsed] = useState(false);
  const [lastSeenTimestamp, setLastSeenTimestamp] = useState(getLastSeen());
  const [newIncidentIds, setNewIncidentIds] = useState(new Set());
  const esRef = useRef(null);

  // ─── Domain Filters ───
  const [activeDomainFilter, setActiveDomainFilter] = useState(null);

  // Compute domain filter badges from current incidents
  const domainFilters = useMemo(() => {
    const counts = new Map();
    incidents.forEach((i) => {
      const id = i.domain_id || i.domain_name || 'unknown';
      const name = i.domain_name || 'Unknown';
      const color = i.domain_color || '#6b7280';
      const icon = i.domain_icon || '•';
      if (!counts.has(id)) {
        counts.set(id, { id, name, color, icon, count: 0 });
      }
      counts.get(id).count += 1;
    });
    return Array.from(counts.values()).map((df) => ({
      ...df,
      active: activeDomainFilter === df.id,
    }));
  }, [incidents, activeDomainFilter]);

  // Filtered incidents for display (domain filter applied)
  const filteredIncidents = useMemo(() => {
    let result = incidents;
    // Top-bar single domain filter
    if (activeDomainFilter) {
      result = result.filter((i) => {
        const id = i.domain_id || i.domain_name;
        return id === activeDomainFilter;
      });
    }
    // Legend multi-domain filter (exclusion model: Set contains HIDDEN domains)
    if (activeDomainFilters.size > 0) {
      result = result.filter((i) => !activeDomainFilters.has(i.domain_slug));
    }
    return result;
  }, [incidents, activeDomainFilter, activeDomainFilters]);

  // Point incidents are rendered as markers; polygons are rendered via the zones source
  const pointIncidents = useMemo(
    () => filteredIncidents.filter((i) => i.geometry_type !== 'polygon'),
    [filteredIncidents]
  );

  // Fetch incidents: date-based with smart viewport only
  useEffect(() => {
    let cancelled = false;

    const doFetch = async () => {
      setViewportFiltering(null);
      viewportFilteringRef.current = null;

      const baseParams = {};
      if (activeDomainFilter) baseParams.categoryId = ''; // domain filter is client-side for now

      // Step 1: Fetch without viewport to count total incidents for this date range
      const params1 = { dateFrom: dateRange.from, dateTo: dateRange.to, ...baseParams };
      const res1 = await api.getIncidents(params1);

      if (cancelled) return;
      setTotalEventCount(res1.data.count);

      if (res1.data.count <= 100) {
        setEvents(res1.data.incidents);
        setViewportFiltering(false);
        viewportFilteringRef.current = false;
      } else {
        setViewportFiltering(true);
        viewportFilteringRef.current = true;

        if (viewportBoundsRef.current) {
          const params2 = {
            dateFrom: dateRange.from,
            dateTo: dateRange.to,
            viewport: viewportBoundsRef.current,
            ...baseParams,
          };
          const res2 = await api.getIncidents(params2);
          if (cancelled) return;
          setEvents(res2.data.incidents);
          setTotalEventCount(res2.data.count);
        } else {
          setEvents(res1.data.incidents);
        }
      }
    };

    doFetch();

    return () => {
      cancelled = true;
    };
  }, [dateRange.from, dateRange.to, refreshKey, activeDomainFilter]);

  // ─── Handle incident ID from URL — deep-linking with ghost support ───
  useEffect(() => {
    if (!incidentIdFromUrl) {
      ghostFetchAttempted.current = false;
      return;
    }

    const inList = incidents.find((i) => i.id === incidentIdFromUrl);
    if (inList) {
      setSelectedIncident(inList);
      setIsEditing(false);
      setPanelMode('detail');
      setFlyToCoords({ lat: parseFloat(inList.latitude), lng: parseFloat(inList.longitude) });
      setMarkerCoords(null);
      ghostFetchAttempted.current = true;
      return;
    }

    // Incident not in current list — fetch as ghost after initial load completes
    if (incidents.length > 0 && !ghostFetchAttempted.current) {
      ghostFetchAttempted.current = true;
      api
        .getIncident(incidentIdFromUrl)
        .then((res) => {
          if (res.data?.incident) {
            const incident = res.data.incident;
            setSelectedIncident(incident);
            setIsEditing(false);
            setPanelMode('detail');
            setFlyToCoords({ lat: parseFloat(incident.latitude), lng: parseFloat(incident.longitude) });
            setMarkerCoords(null);
          }
        })
        .catch(() => {
          // Incident not found or deleted — clean up URL
          setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.delete('incident');
            return next;
          });
          setToast({
            message: 'Incident not found or has been deleted',
            type: 'error',
          });
        });
    }
  }, [incidentIdFromUrl, incidents.length]);

  // ─── Handle zone focus from ZonesPage or ?zone=<id> deep-link ───
  useEffect(() => {
    const focusZoneFromState = location.state?.focusZone;

    if (focusZoneFromState) {
      const zone = focusZoneFromState;
      setSelectedZoneId(zone.id);
      setSelectedIncident(zone);
      setIsEditing(false);
      setPanelMode('detail');
      // Clear any existing editing/drawing state
      setEditingZoneId(null);
      setEditingZoneVertices([]);
      setOriginalZoneVertices([]);
      if (zone.geometry?.coordinates?.[0]) {
        const coords = zone.geometry.coordinates[0];
        let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
        coords.forEach(([lng, lat]) => {
          minLng = Math.min(minLng, lng);
          minLat = Math.min(minLat, lat);
          maxLng = Math.max(maxLng, lng);
          maxLat = Math.max(maxLat, lat);
        });
        setFitBounds({ bounds: [[minLng, minLat], [maxLng, maxLat]], padding: 40 });
      }
      // Clear any stale incident/zone URL params so they don't fight this selection
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('incident');
        next.delete('zone');
        return next;
      });
      navigate(`${location.pathname}${location.search}`, { replace: true, state: {} });
      return;
    }

    if (location.state?.drawZone) {
      setMarkerCoords(null);
      setSelectedIncident(null);
      setIsEditing(false);
      setPanelMode('empty');
      setSelectedZoneId(null);
      setEditingZoneId(null);
      setEditingZoneVertices([]);
      setOriginalZoneVertices([]);
      setMapMode('polygon');
      setDrawVertices([]);
      setIsPolygonClosed(false);
      setShowZoneCreatePanel(false);
      setSelectedDrawVertexIndex(null);
      drawHistoryRef.current = [{ vertices: [], isClosed: false }];
      historyIndexRef.current = 0;
      navigate(`${location.pathname}${location.search}`, { replace: true, state: {} });
      return;
    }

    if (!zoneIdFromUrl) {
      zoneDeepLinkProcessed.current = false;
      return;
    }

    const zone = polygonIncidents.find((z) => z.id === zoneIdFromUrl);
    if (zone) {
      setSelectedZoneId(zone.id);
      setSelectedIncident(zone);
      setPanelMode('detail');
      if (zone.geometry?.coordinates?.[0]) {
        const coords = zone.geometry.coordinates[0];
        let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
        coords.forEach(([lng, lat]) => {
          minLng = Math.min(minLng, lng);
          minLat = Math.min(minLat, lat);
          maxLng = Math.max(maxLng, lng);
          maxLat = Math.max(maxLat, lat);
        });
        setFitBounds({ bounds: [[minLng, minLat], [maxLng, maxLat]], padding: 40 });
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
      setToast({ message: 'Zone not found in current date range', type: 'error' });
    }
  }, [location.state, location.pathname, location.search, zoneIdFromUrl, polygonIncidents, navigate, setSearchParams]);

  // Fetch full incident detail whenever a sidebar incident is selected
  useEffect(() => {
    if (!selectedIncident) {
      setSelectedIncidentDetail(null);
      return;
    }

    let cancelled = false;
    setSelectedIncidentDetailLoading(true);
    api.getIncident(selectedIncident.id)
      .then((res) => {
        if (cancelled) return;
        setSelectedIncidentDetail(mapIncidentForShared(res.data));
      })
      .catch(() => {
        if (cancelled) return;
        setSelectedIncidentDetail(null);
      })
      .finally(() => {
        if (cancelled) return;
        setSelectedIncidentDetailLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedIncident?.id, detailRefreshKey, refreshKey]);

  // Clear context menu when switching modes
  useEffect(() => {
    setDrawContextMenu(null);
  }, [mapMode, editingZoneId]);

  // Fetch domains for legend
  useEffect(() => {
    api.getDomains()
      .then((res) => {
        setDomains(res.data.domains || []);
      })
      .catch(() => setDomains([]));
  }, []);

  // Legend handlers
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

  const handleToggleZones = useCallback(() => {
    setShowZones((prev) => !prev);
  }, []);

  // Handle viewport bounds changes from the map
  const handleViewportChange = useCallback((bounds) => {
    closeMapMenu();
    viewportBoundsRef.current = bounds;

    if (viewportFilteringRef.current === true) {
      const params = {
        dateFrom: dateRange.from,
        dateTo: dateRange.to,
        viewport: bounds,
      };
      api.getIncidents(params)
        .then((res) => {
          setEvents(res.data.incidents);
          setTotalEventCount(res.data.count);
        })
        .catch(() => setEvents([]));
    }
  }, [dateRange.from, dateRange.to, closeMapMenu]);

  // ─── SSE Connection ───
  useEffect(() => {
    if (typeof EventSource === 'undefined') return;

    const token = localStorage.getItem('geowatch_token');
    const url = `${API_BASE_URL}/incidents/stream`;
    const fullUrl = token ? `${url}?token=${encodeURIComponent(token)}` : url;

    let reconnectTimer = null;
    let reconnectAttempt = 0;
    const MAX_RECONNECT_ATTEMPTS = 5;
    const RECONNECT_DELAY = 5000;

    const connect = () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }

      const es = new EventSource(fullUrl);
      esRef.current = es;

      es.onopen = () => {
        reconnectAttempt = 0;
        console.log('[SSE] Admin connected to GeoWatch stream');
      };

      es.onmessage = (e) => {
        if (!e.data || e.data.startsWith(':')) return;
        try {
          const payload = JSON.parse(e.data);
          if (!payload.type) return;

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
              isUnread: true,
            };

            return [activity, ...prev].slice(0, MAX_ACTIVITIES);
          });

          // If the activity is about an incident we know, refresh it in our list
          if (payload.incident) {
            setEvents((prev) => {
              const exists = prev.find((ev) => ev.id === payload.incident.id);
              if (exists) {
                return prev.map((ev) => (ev.id === payload.incident.id ? payload.incident : ev));
              }
              return [payload.incident, ...prev];
            });

            // Refresh selected incident detail when it is updated
            if (
              selectedIncidentRef.current?.id === payload.incident.id &&
              (payload.type === 'incident_updated' || payload.type === 'timeline_updated' || payload.type === 'timeline_added' || payload.type === 'timeline_deleted')
            ) {
              setDetailRefreshKey((k) => k + 1);
            }

            // Mark as new for pulse animation
            if (payload.type === 'incident_created') {
              setNewIncidentIds((prev) => {
                const next = new Set(prev);
                next.add(payload.incident.id);
                return next;
              });

              // Show toast notification
              setToast({
                message: `New incident: ${payload.incident.title}`,
                type: 'info',
                incidentId: payload.incident.id,
              });

              // Auto-clear pulse after 8 seconds
              setTimeout(() => {
                setNewIncidentIds((prev) => {
                  const next = new Set(prev);
                  next.delete(payload.incident.id);
                  return next;
                });
              }, 8000);
            }
          }

          // Handle deletions
          if (payload.type === 'incident_deleted') {
            setEvents((prev) => prev.filter((ev) => ev.id !== payload.incidentId));

            // If the deleted incident/zone is currently selected, close its panel
            setSelectedIncident((prev) => (prev?.id === payload.incidentId ? null : prev));
            setSelectedZoneId((prev) => (prev === payload.incidentId ? null : prev));
            setPanelMode((prev) => {
              if (selectedIncidentRef.current?.id === payload.incidentId) {
                return 'empty';
              }
              return prev;
            });
            setFitBounds((prev) => (selectedIncidentRef.current?.id === payload.incidentId ? null : prev));
            if (selectedIncidentRef.current?.id === payload.incidentId) {
              setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                next.delete('incident');
                next.delete('zone');
                return next;
              });
            }
          }
        } catch (err) {
          console.warn('[SSE] Failed to parse message:', err);
        }
      };

      es.onerror = () => {
        es.close(); // Prevent browser native auto-reconnect
        if (reconnectAttempt < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempt += 1;
          reconnectTimer = setTimeout(connect, RECONNECT_DELAY * reconnectAttempt);
        }
      };
    };

    connect();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (esRef.current) {
        try { esRef.current.close(); } catch { /* ignore */ }
        esRef.current = null;
      }
    };
  }, []);

  // Listen for incident deletion from detail panel and refresh list
  useEffect(() => {
    const handleDeleted = (e) => {
      setRefreshKey((k) => k + 1);
      setPanelMode('empty');
      setSelectedIncident(null);
      setToast({
        message: e?.detail?.incidentTitle
          ? `"${e.detail.incidentTitle}" moved to Recycle Bin`
          : 'Incident moved to Recycle Bin',
        type: 'info',
      });
    };
    window.addEventListener('incident-deleted', handleDeleted);
    return () => window.removeEventListener('incident-deleted', handleDeleted);
  }, []);

  // Mark unread items based on lastSeenTimestamp
  useEffect(() => {
    setActivities((prev) =>
      prev.map((a) => ({
        ...a,
        isUnread: a.timestamp > lastSeenTimestamp,
      }))
    );
  }, [lastSeenTimestamp]);

  const unreadCount = activities.filter((a) => a.isUnread).length;

  // Auto-dismiss toast after 6 seconds
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleMapDblClick = useCallback((coords) => {
    setMarkerCoords({ lat: coords.lat, lng: coords.lng, locationContext: undefined });
    setSelectedIncident(null);
    setIsEditing(false);
    setPanelMode('form');
    // Clear any stale incident ID from URL so the deep-link effect doesn't
    // re-trigger after the incident list refreshes post-creation.
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('incident');
      next.delete('zone');
      return next;
    });

    reverseGeocode(coords.lat, coords.lng).then((locationContext) => {
      setMarkerCoords((prev) => {
        if (!prev) return null;
        return { ...prev, locationContext: locationContext || null };
      });
    });
  }, [setSearchParams]);

  const handleEventClick = useCallback((incident) => {
    setSelectedIncident(incident);
    setIsEditing(false);
    setPanelMode('detail');
    setFlyToCoords({ lat: parseFloat(incident.latitude), lng: parseFloat(incident.longitude) });
    setMarkerCoords(null);
    // Clear zone selection and editing when an incident is selected
    setSelectedZoneId(null);
    setEditingZoneId(null);
    setEditingZoneVertices([]);
    setOriginalZoneVertices([]);
    // Update URL to make incident shareable
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('incident', incident.id);
      return next;
    });
  }, [setSearchParams]);

  const handleZoneClick = useCallback((zoneId) => {
    const zone = polygonIncidents.find((z) => z.id === zoneId);
    if (!zone) return;
    setSelectedZoneId(zoneId);
    setSelectedIncident(zone);
    setPanelMode('detail');
    // Clear editing state when selecting a different zone
    setEditingZoneId(null);
    setEditingZoneVertices([]);
    setOriginalZoneVertices([]);
    // Compute bounds from polygon and fly map there
    if (zone.geometry?.coordinates?.[0]) {
      const coords = zone.geometry.coordinates[0];
      let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
      coords.forEach(([lng, lat]) => {
        minLng = Math.min(minLng, lng);
        minLat = Math.min(minLat, lat);
        maxLng = Math.max(maxLng, lng);
        maxLat = Math.max(maxLat, lat);
      });
      setFitBounds({ bounds: [[minLng, minLat], [maxLng, maxLat]], padding: 40 });
    }
    // Update URL to make zone shareable
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('zone', zone.id);
      return next;
    });
  }, [polygonIncidents, setSearchParams]);

  // ─── Drawing handlers ───
  const handleSetMode = useCallback((mode) => {
    setMapMode(mode);
    if (mode === 'polygon') {
      setDrawVertices([]);
      setIsPolygonClosed(false);
      setShowZoneCreatePanel(false);
      setSelectedDrawVertexIndex(null);
      drawHistoryRef.current = [{ vertices: [], isClosed: false }];
      historyIndexRef.current = 0;
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
    setSelectedDrawVertexIndex(null); // Deselect when adding new point
    pushToHistory(next, isPolygonClosedRef.current);
  }, [pushToHistory]);

  const handleDrawClose = useCallback(() => {
    setIsPolygonClosed(true);
    setSelectedDrawVertexIndex(null);
    pushToHistory(drawVerticesRef.current, true);
  }, [pushToHistory]);

  const handleDrawCancel = useCallback(() => {
    setMapMode('pan');
    setDrawVertices([]);
    setIsPolygonClosed(false);
    setShowZoneCreatePanel(false);
    setSelectedDrawVertexIndex(null);
    setDrawContextMenu(null);
    drawHistoryRef.current = [{ vertices: [], isClosed: false }];
    historyIndexRef.current = 0;
  }, []);

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

  const handleEditEdgeVertexInsert = useCallback((coords, segmentIndex) => {
    setEditingZoneVertices((prev) => {
      const idx = segmentIndex !== undefined && segmentIndex !== null ? segmentIndex : findNearestSegmentIndex(coords, prev);
      if (idx === -1) return prev;
      const next = [...prev];
      next.splice(idx + 1, 0, coords);
      pushToEditHistory(next);
      return next;
    });
    setSelectedEditVertexIndex(null);
    setDrawContextMenu(null);
  }, [pushToEditHistory]);

  const handleDrawVertexDelete = useCallback((index) => {
    if (drawVerticesRef.current.length <= 3) {
      console.warn('Cannot delete vertex: polygon must have at least 3 vertices');
      return;
    }
    const next = [...drawVerticesRef.current];
    next.splice(index, 1);
    setDrawVertices(next);
    setSelectedDrawVertexIndex(null);
    setDrawContextMenu(null);
    pushToHistory(next, isPolygonClosedRef.current);
  }, [pushToHistory]);

  const handleDrawContextMenu = useCallback((data) => {
    setDrawContextMenu(data);
  }, []);

  const handleDrawContextMenuClose = useCallback(() => {
    setDrawContextMenu(null);
  }, []);

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
      await api.resolveIncident(id);
      setToast({ message: 'Incident resolved', type: 'success' });
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setToast({ message: err.message || 'Failed to resolve incident', type: 'error' });
    } finally {
      setConfirmDialog(null);
      closeMapMenu();
    }
  }, [closeMapMenu]);

  const handleClosePanel = () => {
    setPanelMode('empty');
    setSelectedIncident(null);
    setMarkerCoords(null);
    setIsEditing(false);
    setEditingZoneId(null);
    setEditingZoneVertices([]);
    setOriginalZoneVertices([]);
    setSelectedZoneId(null);
    setFitBounds(null);
    // Clear selected incident/zone from URL while preserving other params
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('incident');
      next.delete('zone');
      return next;
    });
  };
  const handleDeleteIncident = useCallback(async (id) => {
    try {
      await api.deleteIncident(id);
      setToast({ message: 'Incident deleted', type: 'success' });
      if (selectedIncident?.id === id) {
        handleClosePanel();
      }
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setToast({ message: err.message || 'Failed to delete incident', type: 'error' });
    } finally {
      setConfirmDialog(null);
      closeMapMenu();
    }
  }, [selectedIncident, handleClosePanel, closeMapMenu]);

  const copyCoordinates = useCallback(async (lat, lng) => {
    try {
      await navigator.clipboard.writeText(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      setToast({ message: 'Coordinates copied to clipboard', type: 'success' });
    } catch {
      setToast({ message: 'Failed to copy coordinates', type: 'error' });
    }
    closeMapMenu();
  }, []);

  const copyLink = useCallback(async (key, id) => {
    const url = new URL(window.location.href);
    url.searchParams.set(key, id);
    try {
      await navigator.clipboard.writeText(url.toString());
      setToast({ message: 'Link copied to clipboard', type: 'success' });
    } catch {
      setToast({ message: 'Failed to copy link', type: 'error' });
    }
    closeMapMenu();
  }, []);

  const handleCreateZoneHere = useCallback((lat, lng) => {
    handleSetMode('polygon');
    // Let handleSetMode reset state before adding the first vertex
    setTimeout(() => {
      handleDrawVertexAdd({ lat, lng });
    }, 0);
    closeMapMenu();
  }, [handleSetMode, handleDrawVertexAdd, closeMapMenu]);

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
      { label: 'Create Incident Here', onClick: () => { handleMapDblClick({ lat, lng }); closeMapMenu(); } },
      { label: 'Center Map Here', onClick: () => handleCenterMapHere(lng, lat) },
      { label: 'Copy Coordinates', onClick: () => copyCoordinates(lat, lng) },
      { label: 'Reset Map View', onClick: handleResetMapView },
    ];
  }, [handleCreateZoneHere, handleMapDblClick, handleCenterMapHere, copyCoordinates, handleResetMapView, closeMapMenu]);

  const buildIncidentMenuItems = useCallback((incident) => {
    if (!incident) return [];
    return [
      { label: 'View Details', onClick: () => { handleEventClick(incident); closeMapMenu(); } },
      { label: 'Edit Incident', onClick: () => { setSelectedIncident(incident); setIsEditing(true); setPanelMode('form'); setMarkerCoords(null); closeMapMenu(); } },
      { label: 'Resolve', onClick: () => setConfirmDialog({ type: 'resolve', id: incident.id, title: 'Resolve incident?', message: 'Mark this incident as resolved.', confirmText: 'Resolve', onConfirm: () => handleResolveIncident(incident.id) }) },
      { label: 'Delete', danger: true, onClick: () => setConfirmDialog({ type: 'delete', id: incident.id, title: 'Delete incident?', message: 'This action cannot be undone.', confirmText: 'Delete', danger: true, onConfirm: () => handleDeleteIncident(incident.id) }) },
      { label: 'Copy Link', onClick: () => copyLink('incident', incident.id) },
    ];
  }, [handleEventClick, handleResolveIncident, handleDeleteIncident, copyLink, closeMapMenu]);

  const handleZoneCreateSubmit = useCallback(async (payload) => {
    setSubmitting(true);
    try {
      const res = await api.createIncident(payload);
      const newZone = res.data?.incident;
      setToast({ message: 'Zone created successfully' });
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
        setPanelMode('detail');
        setMarkerCoords(null);
        setFlyToCoords(null);
        setEditingZoneId(null);
        setEditingZoneVertices([]);
        setOriginalZoneVertices([]);

        if (newZone.geometry?.coordinates?.[0]) {
          const coords = newZone.geometry.coordinates[0];
          let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
          coords.forEach(([lng, lat]) => {
            minLng = Math.min(minLng, lng);
            minLat = Math.min(minLat, lat);
            maxLng = Math.max(maxLng, lng);
            maxLat = Math.max(maxLat, lat);
          });
          setFitBounds({ bounds: [[minLng, minLat], [maxLng, maxLat]], padding: 40 });
        }
      }

      setRefreshKey((k) => k + 1);
    } catch (err) {
      setToast({ message: err.message || 'Failed to create zone' });
    } finally {
      setSubmitting(false);
    }
  }, []);

  const handleEditZone = useCallback((explicitZone) => {
    const zone = explicitZone || polygonIncidents.find((z) => z.id === selectedZoneId);
    if (!zone || !zone.geometry?.coordinates?.[0]) return;

    // Clear drawing state
    setMapMode('pan');
    setDrawVertices([]);
    setIsPolygonClosed(false);
    setShowZoneCreatePanel(false);

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

  const handleZoneInfoEdit = useCallback((explicitZone) => {
    const zone = explicitZone || selectedIncident;
    if (!zone || zone.geometry_type !== 'polygon') return;

    // Clear any active geometry drawing/editing state
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
    setPanelMode('zone-edit');
  }, [selectedIncident]);

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
  const handleZoneInfoSubmit = useCallback(
    async (payload) => {
      if (!selectedIncident) return;
      setSubmitting(true);
      try {
        await api.updateIncident(selectedIncident.id, payload);
        setPanelMode('detail');
        setToast({ message: 'Zone updated successfully', type: 'success' });
        setRefreshKey((k) => k + 1);
      } catch (err) {
        setToast({ message: err.message || 'Failed to update zone', type: 'error' });
      } finally {
        setSubmitting(false);
      }
    },
    [selectedIncident]
  );

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

  const handleZoneEditSubmit = useCallback(async () => {
    if (!editingZoneId || editingZoneVertices.length < 3) {
      setToast({ message: 'A zone must have at least 3 vertices', type: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      const closedRing = [...editingZoneVertices, editingZoneVertices[0]];
      await api.updateIncident(editingZoneId, {
        geometryType: 'polygon',
        geometry: { type: 'Polygon', coordinates: [closedRing] },
      });

      setEditingZoneId(null);
      setEditingZoneVertices([]);
      setOriginalZoneVertices([]);
      setSelectedEditVertexIndex(null);
      editHistoryRef.current = [];
      editHistoryIndexRef.current = -1;

      setToast({ message: 'Zone updated successfully', type: 'success' });
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setToast({ message: err.message || 'Failed to update zone', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  }, [editingZoneId, editingZoneVertices]);

  const handleSearchSelect = useCallback((incident) => {
    setSelectedIncident(incident);
    setIsEditing(false);
    setPanelMode('detail');
    setFlyToCoords({ lat: parseFloat(incident.latitude), lng: parseFloat(incident.longitude) });
    setMarkerCoords(null);
    // Update URL to make incident shareable
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('incident', incident.id);
      return next;
    });
  }, [setSearchParams]);

  const handleOpenSearchModal = useCallback((query) => {
    setSearchModalQuery(query);
    setSearchModalOpen(true);
  }, []);

  const handleAddIncident = () => {
    setMarkerCoords(null);
    setSelectedIncident(null);
    setIsEditing(false);
    setPanelMode('form');
  };

  const handleAddZone = useCallback(() => {
    // Reset any incident/marker state
    setMarkerCoords(null);
    setSelectedIncident(null);
    setIsEditing(false);
    setPanelMode('empty');
    // Reset any existing zone selection/editing
    setSelectedZoneId(null);
    setEditingZoneId(null);
    setEditingZoneVertices([]);
    setOriginalZoneVertices([]);
    // Enter polygon drawing mode
    setMapMode('polygon');
    setDrawVertices([]);
    setIsPolygonClosed(false);
    setShowZoneCreatePanel(false);
    setSelectedDrawVertexIndex(null);
    // Reset drawing history
    drawHistoryRef.current = [{ vertices: [], isClosed: false }];
    historyIndexRef.current = 0;
    // Clear any selected incident/zone from URL
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('incident');
      next.delete('zone');
      return next;
    });
  }, [setSearchParams]);

  const handleResetToToday = () => {
    setDateRange({ from: today, to: today });
  };

  const handleEditFromDetail = (incident) => {
    setIsEditing(true);
    setPanelMode('form');
  };

  const handleSwitchToIncidentDate = (incident) => {
    const incidentDate = incident.start_date
      ? (() => {
          const d = new Date(incident.start_date);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        })()
      : today;
    setDateRange({ from: incidentDate, to: incidentDate });
  };

  // Determine if selected incident is a "ghost" (outside current date range)
  const ghostIncident = selectedIncident && !incidents.find((i) => i.id === selectedIncident.id)
    ? selectedIncident
    : null;

  const handleSubmit = async (payload, { heroImageFile } = {}) => {
    setSubmitting(true);
    try {
      if (isEditing && selectedIncident) {
        await api.updateIncident(selectedIncident.id, payload);
        setSelectedIncident((prev) => ({ ...prev, ...payload, start_date: payload.startDate, end_date: payload.endDate }));
        setIsEditing(false);
        setPanelMode('detail');
      } else {
        const res = await api.createIncident(payload);
        let newIncident = res.data.incident;

        // Upload hero image if provided and attach it to the incident.
        if (heroImageFile) {
          try {
            const detailRes = await api.getIncident(newIncident.id);
            const initialReport = detailRes.data.timeline?.find((u) => u.type === 'report');
            const uploadRes = await api.uploadMedia(newIncident.id, heroImageFile, {
              updateId: initialReport?.id,
              caption: payload.title,
            });
            await api.updateIncident(newIncident.id, {
              heroImageUrl: uploadRes.data.media.file_url,
            });
            newIncident = { ...newIncident, hero_image_url: uploadRes.data.media.file_url };
          } catch (err) {
            console.warn('Hero image upload failed', err);
            setToast({
              message: 'Incident created, but hero image upload failed: ' + (err.message || 'Unknown error'),
              type: 'error',
            });
          }
        }

        // Open the newly created incident in the sidebar, but do NOT fly the map
        // — it's already centered where the user double-clicked.
        setSelectedIncident(newIncident);
        setPanelMode('detail');
        setMarkerCoords(null);
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.set('incident', newIncident.id);
          return next;
        });

        let graceToastShown = false;
        if (newIncident.end_date) {
          const graceEnd = new Date(new Date(newIncident.end_date).getTime() + 24 * 60 * 60 * 1000);
          if (graceEnd < new Date()) {
            setToast({
              message: 'Incident added successfully. It has already ended — use the date range picker to view it on the map.',
              type: 'info',
            });
            graceToastShown = true;
          }
        }

        // Hint user that media can now be uploaded (unless grace warning took precedence)
        if (!graceToastShown) {
          setToast({
            message: 'Incident created. Add photos and videos in the detail panel.',
            type: 'success',
          });
        }
      }
      setRefreshKey((k) => k + 1);
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectFromActivity = useCallback(
    (incidentId, incidentData) => {
      if (incidentData && incidentData.latitude && incidentData.longitude) {
        setSelectedIncident(incidentData);
        setIsEditing(false);
        setPanelMode('detail');
        setFlyToCoords({ lat: parseFloat(incidentData.latitude), lng: parseFloat(incidentData.longitude) });
        setMarkerCoords(null);
        return;
      }
      const found = incidents.find((i) => i.id === incidentId);
      if (found) {
        setSelectedIncident(found);
        setIsEditing(false);
        setPanelMode('detail');
        setFlyToCoords({ lat: parseFloat(found.latitude), lng: parseFloat(found.longitude) });
        setMarkerCoords(null);
        return;
      }
      api
        .getIncident(incidentId)
        .then((res) => {
          if (res.data?.incident) {
            setSelectedIncident(res.data.incident);
            setIsEditing(false);
            setPanelMode('detail');
            setFlyToCoords({ lat: parseFloat(res.data.incident.latitude), lng: parseFloat(res.data.incident.longitude) });
            setMarkerCoords(null);
          }
        })
        .catch(() => {
          console.warn('Could not fetch incident', incidentId);
        });
    },
    [incidents]
  );

  const handleEditFromActivity = useCallback(
    (incidentId, incidentData) => {
      const found = incidents.find((i) => i.id === incidentId) || incidentData;
      if (found) {
        setSelectedIncident(found);
        setIsEditing(true);
        setPanelMode('form');
        setFlyToCoords({ lat: parseFloat(found.latitude), lng: parseFloat(found.longitude) });
        setMarkerCoords(null);
      }
    },
    [incidents]
  );

  const handleMarkAllRead = useCallback(() => {
    const nowTs = Date.now();
    setLastSeenTimestamp(nowTs);
    setLastSeen(nowTs);
  }, []);

  const handleToggleCollapse = useCallback(() => {
    setFeedCollapsed((prev) => !prev);
  }, []);

  const handleDomainFilterChange = useCallback((domainId) => {
    setActiveDomainFilter((prev) => (prev === domainId ? null : domainId));
  }, []);

  // ─── Zone page navigation ───
  const handleOpenZones = useCallback(() => {
    navigate('/zones');
  }, [navigate]);

  // ─── Shared incident-detail callbacks ───
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

  const refreshSelectedDetail = useCallback(() => {
    setDetailRefreshKey((k) => k + 1);
  }, []);

  const withDetailRefresh = useCallback(
    (fn) =>
      async (...args) => {
        try {
          await fn(...args);
          refreshSelectedDetail();
          setRefreshKey((k) => k + 1);
        } catch (err) {
          setToast({ message: err.message || 'Action failed', type: 'error' });
        }
      },
    [refreshSelectedDetail]
  );

  const handleCopyIncidentLink = useCallback(() => {
    const url = `${window.location.origin}/incident/${selectedIncident?.id}`;
    navigator.clipboard.writeText(url).catch(() => {});
    setToast({ message: 'Link copied to clipboard', type: 'success' });
  }, [selectedIncident?.id]);

  const handleUpdateIncident = useCallback(
    withDetailRefresh(async (patch) => {
      const body = {
        ...(patch.title !== undefined && { title: patch.title }),
        ...(patch.description !== undefined && { description: patch.description }),
        ...(patch.locationContext !== undefined && { locationContext: patch.locationContext }),
        ...(patch.severity !== undefined && { severity: patch.severity }),
        ...(patch.verification !== undefined && { verificationOverride: patch.verification }),
        ...(patch.heroImageUrl !== undefined && { heroImageUrl: patch.heroImageUrl }),
      };
      await api.updateIncident(selectedIncident.id, body);
    }),
    [selectedIncident?.id, withDetailRefresh]
  );

  const handleResolveIncidentDetail = useCallback(
    withDetailRefresh(async () => {
      await api.resolveIncident(selectedIncident.id, { resolvedAt: new Date().toISOString() });
    }),
    [selectedIncident?.id, withDetailRefresh]
  );

  const handleDeleteIncidentDetail = useCallback(
    withDetailRefresh(async () => {
      await api.deleteIncident(selectedIncident.id);
      handleClosePanel();
    }),
    [selectedIncident?.id, withDetailRefresh]
  );

  const handleRestoreIncidentDetail = useCallback(
    withDetailRefresh(async () => {
      await api.restoreIncident(selectedIncident.id);
    }),
    [selectedIncident?.id, withDetailRefresh]
  );

  const handlePurgeIncidentDetail = useCallback(
    withDetailRefresh(async () => {
      await api.purgeIncident(selectedIncident.id);
      handleClosePanel();
    }),
    [selectedIncident?.id, withDetailRefresh]
  );

  const handleAddUpdate = useCallback(
    withDetailRefresh(async (form) => {
      await api.addTimeline(selectedIncident.id, {
        summary: form.summary,
        details: form.details,
        updateDate: form.timestamp || form.updateDate || new Date().toISOString(),
        type: form.type || 'update',
        verificationStatus: form.verification || 'verified',
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
      await api.updateTimeline(selectedIncident.id, updateId, body);
    }),
    [selectedIncident?.id, withDetailRefresh]
  );

  const handleDeleteUpdate = useCallback(
    withDetailRefresh(async (updateId) => {
      await api.deleteTimeline(selectedIncident.id, updateId);
    }),
    [selectedIncident?.id, withDetailRefresh]
  );

  const handleAddEvidence = useCallback(
    withDetailRefresh(async (eventId, sourceType, item) => {
      if (sourceType === 'media') {
        const items = Array.isArray(item) ? item : [item];
        for (const mediaItem of items) {
          if (mediaItem.url?.startsWith('data:')) {
            const file = dataUrlToFile(mediaItem.url, mediaItem.name || 'upload.png');
            await api.uploadMedia(selectedIncident.id, file, { updateId: eventId, caption: mediaItem.caption });
          } else if (mediaItem.url) {
            console.warn('URL-based media evidence not yet supported', mediaItem);
          }
        }
        return;
      }

      if (sourceType === 'x_post') {
        await api.addSource(selectedIncident.id, {
          updateId: eventId,
          sourceType: 'x_post',
          sourceUrl: item.tweetUrl,
          description: item.text,
        });
        return;
      }

      if (sourceType === 'news_article') {
        await api.addSource(selectedIncident.id, {
          updateId: eventId,
          sourceType: 'news_article',
          sourceUrl: item.url,
          description: [item.title, item.publisher].filter(Boolean).join(' — '),
        });
        return;
      }

      if (sourceType === 'admin_note') {
        await api.addSource(selectedIncident.id, {
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
      if (sourceType === 'media') {
        const body = {};
        if (item.caption !== undefined) body.caption = item.caption;
        if (item.pinned !== undefined) body.pinned = item.pinned;
        if (eventId !== undefined) body.updateId = eventId;
        await api.updateMedia(selectedIncident.id, item.id, body);
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
      await api.updateSource(selectedIncident.id, item.id, body);
    }),
    [selectedIncident?.id, withDetailRefresh]
  );

  const handleDeleteEvidence = useCallback(
    withDetailRefresh(async (eventId, sourceType, itemId) => {
      if (sourceType === 'media') {
        await api.deleteMedia(selectedIncident.id, itemId);
      } else {
        await api.deleteSource(selectedIncident.id, itemId);
      }
    }),
    [selectedIncident?.id, withDetailRefresh]
  );

  const handlePinEvidence = useCallback(
    withDetailRefresh(async (eventId, sourceType, itemId, pinned) => {
      if (sourceType === 'media') {
        await api.pinMedia(selectedIncident.id, itemId, pinned);
      } else {
        await api.pinSource(selectedIncident.id, itemId, pinned);
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
      await api.setFeatured(selectedIncident.id, eventId, body);
    }),
    [selectedIncident?.id, withDetailRefresh]
  );

  const handleClearFeatureEvidence = useCallback(
    withDetailRefresh(async (eventId) => {
      await api.clearFeatured(selectedIncident.id, eventId);
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
        await api.archiveSource(selectedIncident.id, item.id, {
          archived: false,
          archiveMediaId: null,
          archiveReason: null,
        });
        return;
      }

      const reason = window.prompt('Reason for archiving this X post?');
      if (reason === null) return;

      const file = await pickScreenshotFile();
      if (!file) {
        throw new Error('A screenshot is required to archive an X post.');
      }

      const uploadRes = await api.uploadMedia(selectedIncident.id, file, { updateId: eventId, caption: reason });
      const mediaId = uploadRes?.data?.media?.id;
      if (!mediaId) {
        throw new Error('Screenshot upload failed: no media id returned.');
      }

      await api.archiveSource(selectedIncident.id, item.id, {
        archived: true,
        archiveMediaId: mediaId,
        archiveReason: reason,
      });
    }),
    [selectedIncident?.id, withDetailRefresh]
  );

  // Determine what to show in the right panel
  const renderPanel = () => {
    if (showZoneCreatePanel) {
      return (
        <ZoneForm
          geometry={{ type: 'Polygon', coordinates: [drawVertices] }}
          onSubmit={handleZoneCreateSubmit}
          onCancel={handleDrawCancel}
          submitting={submitting}
        />
      );
    }

    if (panelMode === 'zone-edit' && selectedIncident) {
      return (
        <ZoneForm
          geometry={selectedIncident.geometry}
          initialData={selectedIncident}
          onSubmit={handleZoneInfoSubmit}
          onCancel={() => setPanelMode('detail')}
          submitting={submitting}
        />
      );
    }

    if (panelMode === 'detail' && selectedIncident) {
      if (selectedIncidentDetailLoading) {
        return (
          <div style={{ padding: 24, color: 'var(--text-secondary)' }}>
            Loading incident details…
          </div>
        );
      }

      if (!selectedIncidentDetail) {
        return (
          <div style={{ padding: 24, color: 'var(--danger)' }}>
            Failed to load incident details.
          </div>
        );
      }

      return (
        <IncidentDetailSidebar
          mode="admin"
          incident={selectedIncidentDetail.incident}
          timeline={selectedIncidentDetail.timeline}
          onNavigateToFullPage={() => navigate(`/incident/${selectedIncident.id}`)}
          onCopyIncidentLink={handleCopyIncidentLink}
          onUpdateIncident={handleUpdateIncident}
          onResolveIncident={handleResolveIncidentDetail}
          onDeleteIncident={handleDeleteIncidentDetail}
          onRestoreIncident={handleRestoreIncidentDetail}
          onPurgeIncident={handlePurgeIncidentDetail}
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
          onOpenAudit={() => {}}
          onViewCreator={() => {}}
        />
      );
    }

    if (panelMode === 'form') {
      return (
        <IncidentForm
          initialCoords={markerCoords}
          initialData={isEditing ? selectedIncident : null}
          onSubmit={handleSubmit}
          onCancel={handleClosePanel}
          submitting={submitting}
        />
      );
    }

    return null;
  };

  const isPanelOpen = panelMode !== 'empty' || showZoneCreatePanel;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-gradient)' }}>
      <TopBar
        onAddEvent={handleAddIncident}
        onAddZone={handleAddZone}
        onOpenZones={handleOpenZones}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onResetToToday={handleResetToToday}
        onSearchSelect={handleSearchSelect}
        onOpenSearchModal={handleOpenSearchModal}
        selectedIncident={selectedIncident}
        onResolve={() => {
          // If panel is not showing detail, switch to it first
          if (panelMode !== 'detail' && selectedIncident) {
            setPanelMode('detail');
          }
          // The shared sidebar provides its own resolve confirmation.
        }}
      />

      {/* Toast Notification */}
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
            color: 'var(--text-primary)',
            fontSize: '13px',
            fontWeight: 500,
            maxWidth: '480px',
            textAlign: 'center',
            lineHeight: 1.5,
            animation: 'slideUp 0.3s ease-out',
            cursor: toast.incidentId ? 'pointer' : 'default',
          }}
          onClick={() => {
            if (toast.incidentId) {
              const found = incidents.find((i) => i.id === toast.incidentId);
              if (found) handleEventClick(found);
              setToast(null);
            }
          }}
        >
          {toast.message}
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden', position: 'relative', zIndex: 1 }}>
        {/* Left — Live Activity Feed */}
        <AdminLiveFeed
          activities={activities}
          onSelectEvent={handleSelectFromActivity}
          onEditEvent={handleEditFromActivity}
          isCollapsed={feedCollapsed}
          onToggleCollapse={handleToggleCollapse}
          unreadCount={unreadCount}
          onMarkAllRead={handleMarkAllRead}
          domainFilters={domainFilters}
          onDomainFilterChange={handleDomainFilterChange}
        />

        {/* Center — Map */}
        <div
          style={{
            flex: 1,
            position: 'relative',
            borderRight: isPanelOpen ? '1px solid var(--border-subtle)' : 'none',
            background: 'var(--bg-deep)',
            minWidth: 0,
          }}
        >
          <AdminMap
            ref={mapRef}
            incidents={pointIncidents}
            zones={polygonIncidents}
            showZones={showZones}
            selectedEventId={selectedIncident?.id}
            selectedZoneId={selectedZoneId}
            onEventClick={handleEventClick}
            onZoneClick={handleZoneClick}
            onMapDblClick={handleMapDblClick}
            onViewportChange={handleViewportChange}
            flyToCoords={flyToCoords}
            markerCoords={markerCoords}
            ghostIncident={ghostIncident}
            newIncidentIds={newIncidentIds}
            fitBounds={fitBounds}
            mapMode={mapMode}
            drawVertices={drawVertices}
            isPolygonClosed={isPolygonClosed}
            onDrawVertexAdd={handleDrawVertexAdd}
            onDrawClose={handleDrawClose}
            onDrawCancel={handleDrawCancel}
            selectedDrawVertexIndex={selectedDrawVertexIndex}
            onDrawVertexSelect={handleDrawVertexSelect}
            onDrawVertexMove={handleDrawVertexMove}
            onDrawVertexDragEnd={handleDrawVertexDragEnd}
            onContextMenu={handleDrawContextMenu}
            onMarkerContextMenu={handleMarkerContextMenu}
            onZoneContextMenu={handleZoneContextMenu}
            onMapContextMenu={handleMapContextMenu}
            onDrawVertexDelete={handleDrawVertexDelete}
            onDrawUndo={handleDrawUndo}
            onDrawRedo={handleDrawRedo}
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
          />

          {editingZoneId ? (
            <div
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                zIndex: 20,
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
                onClick={handleZoneEditSubmit}
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
          ) : (
            <DrawingToolbar
              mode={mapMode}
              hasClosedPolygon={isPolygonClosed}
              selectedZoneId={selectedZoneId}
              onSetMode={handleSetMode}
              onSave={() => setShowZoneCreatePanel(true)}
              onCancel={handleDrawCancel}
              onEditZone={handleEditZone}
            />
          )}

          {drawContextMenu && (
            <MapContextMenu
              position={{ x: drawContextMenu.x, y: drawContextMenu.y }}
              items={
                drawContextMenu.type === 'vertex'
                  ? [
                      {
                        label: 'Delete vertex',
                        danger: true,
                        onClick: () => handleDrawVertexDelete(drawContextMenu.index),
                      },
                    ]
                  : drawContextMenu.type === 'empty'
                  ? [
                      {
                        label: 'Add vertex here',
                        onClick: () => handleDrawVertexAdd({ lat: drawContextMenu.lat, lng: drawContextMenu.lng, insertIndex: drawContextMenu.insertIndex }),
                      },
                    ]
                  : drawContextMenu.type === 'edge'
                  ? [
                      {
                        label: 'Add vertex here',
                        onClick: () => handleEditEdgeVertexInsert([drawContextMenu.lng, drawContextMenu.lat], drawContextMenu.index),
                      },
                    ]
                  : []
              }
              onClose={handleDrawContextMenuClose}
            />
          )}

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

          <MapLegend
            domains={domains}
            activeDomainFilters={activeDomainFilters}
            onToggleDomain={handleToggleDomain}
            onShowAll={handleShowAllDomains}
            onHideAll={handleHideAllDomains}
            showZones={showZones}
            onToggleZones={handleToggleZones}
          />

          {/* Ghost incident banner */}
          {ghostIncident && (
            <div
              style={{
                position: 'absolute',
                bottom: '16px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 20,
                background: 'var(--bg-surface)',
                backdropFilter: 'blur(12px)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                boxShadow: 'var(--shadow-lg)',
                maxWidth: '90%',
              }}
            >
              <div
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: 'var(--text-muted)',
                  opacity: 0.5,
                  border: '2px dashed var(--text-muted)',
                  flexShrink: 0,
                }}
              />
              <div>
                <p
                  style={{
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    fontWeight: 500,
                    margin: 0,
                  }}
                >
                  <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                    {ghostIncident.title}
                  </span>{' '}
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

          {/* Location search overlay */}
          <div
            style={{
              position: 'absolute',
              top: '12px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '380px',
              zIndex: 15,
            }}
          >
            <LocationSearch
              onSelect={(result) => {
                const zoom = getZoomForLocation(result.type, result.class);
                setFlyToCoords({ lat: parseFloat(result.lat), lng: parseFloat(result.lon), zoom });
              }}
              viewbox={(() => {
                const b = viewportBoundsRef.current;
                if (!b) return null;
                const [minLng, minLat, maxLng, maxLat] = b.split(',').map(Number);
                return `${minLng},${maxLat},${maxLng},${minLat}`;
              })()}
            />
          </div>

          {/* Incident counter + viewport filtering indicator overlay */}
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
              <span style={{ color: 'var(--accent-light)', fontWeight: 700 }}>{pointIncidents.length}</span>
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
              {activeDomainFilter && (
                <span style={{ color: 'var(--text-muted)' }}> (filtered)</span>
              )}
            </div>
            {viewportFiltering === true && totalEventCount > 100 && (
              <div style={{ fontSize: '11px', color: 'var(--warning)', marginTop: '4px' }}>
                {totalEventCount > 300
                  ? `${totalEventCount}+ total incidents match this date range — zoom or pan to explore`
                  : `${totalEventCount} total incidents match this date range — zoom or pan to explore`}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel — 630px slide-in */}
        {isPanelOpen && (
          <div
            className="dashboard-right-panel"
            style={{
              width: '630px',
              overflowY: 'auto',
              padding: panelMode === 'detail' ? 0 : '20px',
              boxSizing: 'border-box',
              background: 'var(--bg-surface)',
              borderLeft: '1px solid var(--border-subtle)',
              flexShrink: 0,
              animation: 'slideInRight 0.25s ease-out',
            }}
          >
            {renderPanel()}
          </div>
        )}
      </div>

      {/* Search Modal */}
      <SearchModal
        initialQuery={searchModalQuery}
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        onSelectEvent={handleSearchSelect}
      />

      {/* Slide-in animation */}
      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
