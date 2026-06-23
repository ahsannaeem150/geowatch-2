import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { PanelLeftOpen } from 'lucide-react';
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
import { IncidentDetailSidebar, ZoneDetailSidebar } from '@shared';
import SuperadminMap from '../components/Map/SuperadminMap.jsx';
import MapControls from '../components/Map/MapControls.jsx';
import DrawingToolbar from '../components/Map/DrawingToolbar.jsx';
import ZoneForm from '../components/ZoneForm/ZoneForm.jsx';
import LocationSearch from '../components/LocationSearch/LocationSearch.jsx';
import IncidentDetailPanel from '../components/Map/IncidentDetailPanel.jsx';
import MapLegend from '@shared/components/MapLegend.jsx';
import MapContextMenu from '@shared/components/MapContextMenu.jsx';
import { useMapContextMenu } from '@shared/hooks/useMapContextMenu.js';
import { ConfirmDialog } from '@shared/components/ConfirmDialog.jsx';
import IncidentForm from '../components/IncidentForm/IncidentForm.jsx';
import ActivityInspectorSidebar from '../components/Audit/ActivityInspectorSidebar.jsx';
import RecycleBinSidebar from '../components/Map/RecycleBinSidebar.jsx';
import UserDetailDrawer from '../components/Users/UserDetailDrawer.jsx';
import PublicUserDrawer from '../components/PublicUsers/PublicUserDrawer.jsx';
import AuditTable from '../components/Audit/AuditTable.jsx';

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
    latParam && lngParam
      ? { lat: parseFloat(latParam), lng: parseFloat(lngParam), zoom: zoomParam ? parseFloat(zoomParam) : 10 }
      : null
  );
  const [refreshKey, setRefreshKey] = useState(0);
  const [filters, setFilters] = useState({
    categoryId: searchParams.get('categoryId') || '',
    severity: '',
    verifiedOnly: false,
    status: searchParams.get('status') || 'active',
  });

  // ─── Zones (polygon incidents) ───
  const [selectedZoneId, setSelectedZoneId] = useState(null);
  const [fitBounds, setFitBounds] = useState(null);
  const [showZones, setShowZones] = useState(true);
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

  // ─── Domain Filter / Legend ───
  const [domains, setDomains] = useState([]);
  const [activeDomainFilters, setActiveDomainFilters] = useState(new Set());

  // ─── Categories for edit form ───
  const [categories, setCategories] = useState([]);

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

  // Sync categoryId filter from URL params
  useEffect(() => {
    const cid = searchParams.get('categoryId');
    setFilters((prev) => ({ ...prev, categoryId: cid || '' }));
  }, [searchParams]);

  // ─── Smart Viewport Filtering ───
  const [viewportFiltering, setViewportFiltering] = useState(null);
  const [totalEventCount, setTotalEventCount] = useState(0);
  const viewportBoundsRef = useRef(null);
  const viewportFilteringRef = useRef(null);

  // ─── SSE Connection ───
  const esRef = useRef(null);

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

      const params1 = { dateFrom: dateRange.from, dateTo: dateRange.to, ...baseParams };
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
            dateFrom: dateRange.from,
            dateTo: dateRange.to,
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
  }, [dateRange.from, dateRange.to, filters.categoryId, filters.severity, filters.status, refreshKey]);


  // Filtered incidents (must be declared before any effect/callback that depends on polygonIncidents)
  const filteredIncidents = useMemo(() => {
    let result = incidents;
    if (filters.verifiedOnly) {
      result = result.filter((i) => i.verification_status === 'verified');
    }
    if (activeDomainFilters.size > 0) {
      result = result.filter((i) => !activeDomainFilters.has(i.domain_slug));
    }
    return result;
  }, [incidents, filters.verifiedOnly, activeDomainFilters]);

  // Point incidents are rendered as markers; polygons are rendered via the zones source
  const polygonIncidents = useMemo(
    () => filteredIncidents.filter((i) => i.geometry_type === 'polygon'),
    [filteredIncidents]
  );
  const pointIncidents = useMemo(
    () => filteredIncidents.filter((i) => i.geometry_type !== 'polygon'),
    [filteredIncidents]
  );

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

    const zone = polygonIncidents.find((z) => z.id === zoneIdFromUrl);
    if (zone && !zoneDeepLinkProcessed.current) {
      setSelectedZoneId(zone.id);
      setSelectedIncident(zone);
      // Only fly to the zone when the URL does not already carry a saved viewport.
      // This preserves the map position when the user returns from the full-page zone view.
      if (!hasViewportParams && zone.geometry?.coordinates?.[0]) {
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
    }
  }, [zoneIdFromUrl, polygonIncidents, hasViewportParams, setSearchParams]);

  // Fetch domains for legend
  useEffect(() => {
    getDomains()
      .then((res) => {
        setDomains(res.domains || []);
      })
      .catch(() => setDomains([]));
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

  // Viewport change handler
  const handleViewportChange = useCallback(({ bounds, center, zoom }) => {
    closeMapMenu();
    viewportBoundsRef.current = bounds;

    if (center && Number.isFinite(zoom)) {
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
      const params = {
        dateFrom: dateRange.from,
        dateTo: dateRange.to,
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
  }, [dateRange.from, dateRange.to, filters.categoryId, filters.severity, filters.status, closeMapMenu, setSearchParams, latParam, lngParam, zoomParam]);

  // Select incident
  const handleSelectIncident = useCallback((incident, opts = {}) => {
    setSelectedIncident(incident);
    setEditingZoneId(null);
    setEditingZoneVertices([]);
    setOriginalZoneVertices([]);

    if (incident?.geometry_type === 'polygon') {
      setSelectedZoneId(incident.id);
      if (!opts.skipFlyTo) {
        setFlyToCoords(null);
        if (incident.geometry?.coordinates?.[0]) {
          const coords = incident.geometry.coordinates[0];
          let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
          coords.forEach(([lng, lat]) => {
            minLng = Math.min(minLng, lng);
            minLat = Math.min(minLat, lat);
            maxLng = Math.max(maxLng, lng);
            maxLat = Math.max(maxLat, lat);
          });
          setFitBounds({ bounds: [[minLng, minLat], [maxLng, maxLat]], padding: 40 });
        } else {
          setFitBounds(null);
        }
      } else {
        setFlyToCoords(null);
        setFitBounds(null);
      }
    } else {
      setSelectedZoneId(null);
      if (!opts.skipFlyTo) {
        setFitBounds(null);
        const lat = parseFloat(incident?.latitude);
        const lng = parseFloat(incident?.longitude);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          setFlyToCoords({ lat, lng, zoom: 10 });
        } else {
          setFlyToCoords(null);
        }
      } else {
        setFlyToCoords(null);
        setFitBounds(null);
      }
    }

    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('incident', incident.id);
      next.delete('zone');
      return next;
    });
  }, [setSearchParams]);

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
    setFitBounds(null);
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
      setFlyToCoords(null);
      setFitBounds(null);
    },
    [setSearchParams]
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

  const handleNavigateToFullPage = useCallback(() => {
    if (!selectedIncident?.id) return;
    const map = mapRef.current?.getMap?.();
    if (map) {
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
    navigate(`/superadmin/incident/${selectedIncident.id}`);
  }, [navigate, selectedIncident?.id, setSearchParams]);

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

    // Reset ghost-fetch tracking when the requested incident changes
    if (lastIncidentIdRef.current !== incidentIdFromUrl) {
      ghostFetchAttempted.current = false;
      lastIncidentIdRef.current = incidentIdFromUrl;
    }

    const inList = incidents.find((i) => i.id === incidentIdFromUrl);
    if (inList) {
      handleSelectIncident(inList, { skipFlyTo: hasViewportParams });
      ghostFetchAttempted.current = true;
      return;
    }

    if (incidents.length > 0 && !ghostFetchAttempted.current) {
      ghostFetchAttempted.current = true;
      getIncident(incidentIdFromUrl)
        .then((res) => {
          if (res?.incident) {
            handleSelectIncident(res.incident, { skipFlyTo: hasViewportParams });
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
                  if (deletedIncident.geometry_type === 'polygon' && deletedIncident.geometry?.coordinates?.[0]) {
                    const coords = deletedIncident.geometry.coordinates[0];
                    let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
                    coords.forEach(([lng, lat]) => {
                      minLng = Math.min(minLng, lng);
                      minLat = Math.min(minLat, lat);
                      maxLng = Math.max(maxLng, lng);
                      maxLat = Math.max(maxLat, lat);
                    });
                    setFitBounds({ bounds: [[minLng, minLat], [maxLng, maxLat]], padding: 40 });
                    setGhostZone(deletedIncident);
                  } else {
                    const lat = parseFloat(deletedIncident.latitude);
                    const lng = parseFloat(deletedIncident.longitude);
                    if (Number.isFinite(lat) && Number.isFinite(lng)) {
                      setFlyToCoords({ lat, lng, zoom: 10 });
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
  }, [incidentIdFromUrl, incidents.length, handleSelectIncident, hasViewportParams, setSearchParams]);

  // ─── Zone selection ───
  const handleZoneClick = useCallback((zoneId) => {
    const zone = polygonIncidents.find((z) => z.id === zoneId);
    if (!zone) return;
    setSelectedZoneId(zoneId);
    setSelectedIncident(zone);
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
      next.delete('incident');
      return next;
    });
  }, [polygonIncidents, setSearchParams]);

  // ─── Drawing history helpers ───
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
    setSelectedDrawVertexIndex(null);
    pushToHistory(next, isPolygonClosedRef.current);
  }, [pushToHistory]);

  const handleDrawClose = useCallback(() => {
    setIsPolygonClosed(true);
    setShowZoneCreatePanel(true);
    setSelectedDrawVertexIndex(null);
    pushToHistory(drawVerticesRef.current, true);
  }, [pushToHistory]);

  const handleDrawCancel = useCallback(() => {
    setMapMode('pan');
    setDrawVertices([]);
    setIsPolygonClosed(false);
    setShowZoneCreatePanel(false);
    setSelectedDrawVertexIndex(null);
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
  }, [setSearchParams]);

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
      { label: 'Edit Incident', onClick: () => { setSelectedIncident(incident); setPointFormMode('edit'); closeMapMenu(); } },
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

  const handleResetToToday = useCallback(() => {
    setDateRange({ from: today, to: today });
  }, [today]);

  const handleLocationSelect = useCallback((result) => {
    const zoom = getZoomForLocation(result.type, result.class);
    setFlyToCoords({
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      zoom,
    });
  }, []);

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

  // Ghost incident / zone (selected item outside current date range)
  const ghostIncident = selectedIncident && !incidents.find((i) => i.id === selectedIncident.id)
    ? selectedIncident
    : null;
  const dateGhostZone = selectedIncident?.geometry_type === 'polygon' &&
    !polygonIncidents.find((z) => z.id === selectedIncident.id)
    ? selectedIncident
    : null;

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - var(--topbar-height))', overflow: 'hidden' }}>
      {/* Contextual banner */}
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
              {refParam === 'recyclebin'
                ? 'Showing incident from '
                : 'Showing incident from '}
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
      <div style={{ display: 'flex', flex: 1, alignItems: 'stretch', minHeight: 0, overflow: 'hidden' }}>
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
        <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
          <SuperadminMap
            ref={mapRef}
            incidents={filteredIncidents}
            zones={polygonIncidents}
            showZones={showZones}
            onZoneClick={handleZoneClick}
            selectedEventId={selectedIncident?.id}
            selectedZoneId={selectedZoneId}
            onEventClick={handleSelectIncident}
            onViewportChange={handleViewportChange}
            flyToCoords={flyToCoords}
            fitBounds={fitBounds}
            initialViewport={
              hasViewportParams
                ? { center: [parseFloat(lngParam), parseFloat(latParam)], zoom: parseFloat(zoomParam) }
                : null
            }
            ghostIncident={ghostIncident}
            ghostZone={ghostZone || dateGhostZone}
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

          <MapLegend
            domains={domains}
            activeDomainFilters={activeDomainFilters}
            onToggleDomain={handleToggleDomain}
            onShowAll={handleShowAllDomains}
            onHideAll={handleHideAllDomains}
          />

          {/* Drawing / edit toolbar overlay — below the top-center controls to avoid overlap */}
          <div
            style={{
              position: 'absolute',
              top: '80px',
              right: '12px',
              zIndex: 20,
            }}
          >
            {editingZoneId ? (
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
            ) : (
              <DrawingToolbar
                mode={mapMode}
                hasClosedPolygon={isPolygonClosed && drawVertices.length >= 3}
                selectedZoneId={selectedZoneId}
                onSetMode={handleSetMode}
                onSave={handleDrawClose}
                onCancel={handleDrawCancel}
                onEditZone={handleEditZone}
              />
            )}
          </div>

          {/* Map controls overlay — top center */}
          <div
            style={{
              position: 'absolute',
              top: '12px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 20,
            }}
          >
            <MapControls
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              onResetToToday={handleResetToToday}
              verifiedOnly={filters.verifiedOnly}
              onVerifiedOnlyChange={(v) => setFilters((f) => ({ ...f, verifiedOnly: v }))}
              status={filters.status}
              onStatusChange={(s) => setFilters((f) => ({ ...f, status: s }))}
            />
          </div>

          {/* Location search overlay — top left */}
          <div
            style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              width: '320px',
              zIndex: 15,
            }}
          >
            <LocationSearch
              onSelect={handleLocationSelect}
              viewbox={(() => {
                if (!viewportBoundsRef.current) return null;
                const [minLng, minLat, maxLng, maxLat] = viewportBoundsRef.current.split(',').map(Number);
                return `${minLng},${maxLat},${maxLng},${minLat}`;
              })()}
            />
          </div>

          {/* Incident counter overlay */}
          <div
            style={{
              position: 'absolute',
              top: '72px',
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
          </div>

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
                boxShadow: 'var(--shadow-md)',
                maxWidth: '90%',
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
          )}
        </div>

        {/* Right — Incident detail or zone creation panel */}
        {(selectedIncident || showZoneCreatePanel || pointFormMode) && (
          <div style={{ width: '630px', flexShrink: 0, minHeight: 0, background: 'var(--bg-surface)', borderLeft: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
            {pointFormMode ? (
              <IncidentForm
                initialData={pointFormMode === 'edit' ? selectedIncident : null}
                initialCoords={pointFormMode === 'create' ? pointFormCoords : null}
                categories={categories}
                onSubmit={handlePointFormSubmit}
                onCancel={handlePointFormCancel}
                submitting={submitting}
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
                        onFullDetails={() => navigate(`/superadmin/zone/${selectedIncidentDetail.incident.id}`)}
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
      </div>
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
    </>
  );
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
