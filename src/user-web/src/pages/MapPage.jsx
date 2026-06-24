import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api.js';
import { API_BASE_URL } from '@shared/constants.js';
import UserMap from '../components/Map/UserMap.jsx';
import MapControls from '../components/Map/MapControls.jsx';
import LocationSearch from '../components/LocationSearch/LocationSearch.jsx';
import IncidentSidebar from '../components/IncidentList/IncidentSidebar.jsx';
import LiveActivityFeed from '../components/LiveActivity/LiveActivityFeed.jsx';
import TickerBar from '../components/Ticker/TickerBar.jsx';
import AwayBanner from '../components/AwayBanner/AwayBanner.jsx';
import MapLegend from '@shared/components/MapLegend.jsx';
import MapContextMenu from '@shared/components/MapContextMenu.jsx';
import { useMapContextMenu } from '@shared/hooks/useMapContextMenu.js';
import { usePublicAuth } from '../contexts/PublicAuthContext.jsx';
import { useSignInModal } from '../contexts/SignInModalContext.jsx';

const LS_KEY = 'geowatch_last_seen';
const MAX_ACTIVITIES = 50;

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
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const [dateRange, setDateRange] = useState({ from: today, to: today });
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [flyToCoords, setFlyToCoords] = useState(
    hasViewportParams
      ? { lat: parseFloat(latParam), lng: parseFloat(lngParam), zoom: parseFloat(zoomParam) }
      : null
  );
  const [filters, setFilters] = useState({
    categoryId: searchParams.get('categoryId') || '',
    severity: '',
    verifiedOnly: false,
  });

  // ─── Domain Filter / Legend ───
  const [domains, setDomains] = useState([]);
  const [activeDomainFilters, setActiveDomainFilters] = useState(new Set());
  const [showZones, setShowZones] = useState(true);
  const [fitBounds, setFitBounds] = useState(null);

  // Ghost fetch tracking
  const ghostFetchAttempted = useRef(false);

  // Sync categoryId filter from URL params
  useEffect(() => {
    const cid = searchParams.get('categoryId');
    setFilters((prev) => ({ ...prev, categoryId: cid || '' }));
  }, [searchParams]);

  // ─── Smart Viewport Filtering ───
  const [viewportFiltering, setViewportFiltering] = useState(null); // null = unknown, true = on, false = off
  const [totalEventCount, setTotalEventCount] = useState(0);
  const viewportBoundsRef = useRef(null);
  const viewportFilteringRef = useRef(null);

  // ─── Saved Incidents ───
  const { isAuthenticated } = usePublicAuth();
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

  const [sidebarTab, setSidebarTab] = useState('events'); // 'events' | 'saved'
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // ─── Live Activity ───
  const [activities, setActivities] = useState([]);
  const [feedCollapsed, setFeedCollapsed] = useState(false);
  const [lastSeenTimestamp, setLastSeenTimestamp] = useState(getLastSeen());
  const [showAwayBanner, setShowAwayBanner] = useState(false);
  const [awayStats, setAwayStats] = useState({ newEvents: 0, updatedEvents: 0 });

  const esRef = useRef(null);
  const selectedIncidentRef = useRef(null);
  const skipNextZoneFitRef = useRef(false);
  const zoneGhostFetchAttempted = useRef(false);

  // Detail refresh key — increments when SSE triggers an update for selected incident
  const [detailRefreshKey, setDetailRefreshKey] = useState(0);

  // Keep ref in sync with state for SSE handler
  useEffect(() => {
    selectedIncidentRef.current = selectedIncident;
  }, [selectedIncident]);

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

      // Point incidents: marker category/severity filters apply
      const pointParams = { dateFrom: dateRange.from, dateTo: dateRange.to, ...baseParams };
      // Polygon zones: date filter applies; marker category filters do not
      const zoneParams = { dateFrom: dateRange.from, dateTo: dateRange.to, geometryType: 'polygon' };

      // Step 1: Fetch counts without viewport
      const [pointRes, zoneRes] = await Promise.all([
        api.getIncidents(pointParams),
        api.getIncidents(zoneParams),
      ]);

      if (cancelled) return;
      const pointCount = pointRes.data.count || 0;
      const zoneCount = zoneRes.data.count || 0;
      setTotalEventCount(pointCount + zoneCount);

      if (pointCount <= 100) {
        // Light load: show all points and zones, no viewport filtering needed
        setIncidents([...(pointRes.data.incidents || []), ...(zoneRes.data.incidents || [])]);
        setViewportFiltering(false);
        viewportFilteringRef.current = false;
        setLoading(false);
      } else {
        // Heavy load: enable viewport filtering
        setViewportFiltering(true);
        viewportFilteringRef.current = true;

        // Step 2: If viewport bounds are already known, fetch visible points and zones
        if (viewportBoundsRef.current) {
          const [pointRes2, zoneRes2] = await Promise.all([
            api.getIncidents({ ...pointParams, viewport: viewportBoundsRef.current }),
            api.getIncidents({ ...zoneParams, viewport: viewportBoundsRef.current }),
          ]);
          if (cancelled) return;
          setIncidents([...(pointRes2.data.incidents || []), ...(zoneRes2.data.incidents || [])]);
          setTotalEventCount((pointRes2.data.count || 0) + (zoneRes2.data.count || 0));
        } else {
          // Bounds not ready yet — show the first batch temporarily
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

  // Fetch domains for legend
  useEffect(() => {
    api.getDomains()
      .then((res) => {
        setDomains(res.data.domains || []);
      })
      .catch(() => setDomains([]));
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
      // Keep existing state on error — don't clear user's saves
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refreshSaves();
  }, [refreshSaves]);

  // Separate point and polygon incidents for the map
  const pointIncidents = useMemo(() => {
    return incidents.filter((i) => i.geometry_type !== 'polygon' && !activeDomainFilters.has(i.domain_slug));
  }, [incidents, activeDomainFilters]);

  const polygonIncidents = useMemo(() => {
    return incidents.filter((i) => i.geometry_type === 'polygon');
  }, [incidents]);

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

  // ─── Handle viewport bounds changes from the map ───
  const handleViewportChange = useCallback(({ bounds, center, zoom }) => {
    closeMapMenu();
    viewportBoundsRef.current = bounds;

    // Persist viewport in the URL so back-navigation restores the map view
    if (center && Number.isFinite(zoom)) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('lat', center.lat.toFixed(6));
          next.set('lng', center.lng.toFixed(6));
          next.set('zoom', zoom.toFixed(2));
          // If the user just cleared the selection, don't let a lingering map
          // animation restore the incident/zone param.
          if (!selectedIncidentRef.current) {
            next.delete('incident');
            next.delete('zone');
          }
          return next;
        },
        { replace: true }
      );
    }

    // If viewport filtering is already active, re-fetch points and zones with new bounds
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
  }, [dateRange.from, dateRange.to, filters.categoryId, filters.severity, setSearchParams]);

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

        // Skip initial comment/heartbeat
        if (!payload.type) return;

        // Skip deletion incidents — users don't need to see admin deletions
        if (payload.type === 'incident_deleted' || payload.type === 'timeline_deleted') {
          // Still update the incidents list if an incident was deleted
          if (payload.type === 'incident_deleted') {
            setIncidents((prev) => prev.filter((ev) => ev.id !== payload.incidentId));
          }
          return;
        }

        setActivities((prev) => {
          // Deduplicate: skip if the most recent activity is identical (same type + incidentId within 2s)
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

        // If the activity is about an incident we know, refresh it in our list
        if (payload.incident) {
          setIncidents((prev) => {
            const exists = prev.find((ev) => ev.id === payload.incident.id);
            if (exists) {
              // Merge payload with existing data so we don't lose joined fields (domain_color, etc.)
              return prev.map((ev) => (ev.id === payload.incident.id ? { ...ev, ...payload.incident } : ev));
            }
            return [payload.incident, ...prev];
          });
        }

        // NEW: If this event affects the currently selected incident, refresh detail
        const currentSelected = selectedIncidentRef.current;
        const affectedIncidentId = payload.incidentId || payload.incident?.id;
        if (currentSelected?.id && affectedIncidentId === currentSelected.id) {
          // Update selectedIncident with payload data if available
          if (payload.incident) {
            setSelectedIncident(payload.incident);
          }
          // Always trigger a detail refresh (for timeline events that don't include full incident)
          api.getIncident(currentSelected.id)
            .then((res) => {
              if (res.data?.incident) {
                setSelectedIncident(res.data.incident);
                // Also update in the incidents list
                setIncidents((prev) =>
                  prev.map((i) => (i.id === currentSelected.id ? res.data.incident : i))
                );
                // Trigger detail view re-render with flash
                setDetailRefreshKey((k) => k + 1);
              }
            })
            .catch(() => {
              // Silent fail — detail will still show old data
            });
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
          // Only show if away > 30s
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

  // ─── Handlers ───
  const handleSelectIncident = useCallback(
    (incident, opts = {}) => {
      setSelectedIncident(incident);
      setFitBounds(null);

      const isPolygon = incident.geometry_type === 'polygon';

      if (!opts.skipFlyTo) {
        if (isPolygon) {
          if (skipNextZoneFitRef.current) {
            skipNextZoneFitRef.current = false;
          } else if (incident.geometry?.coordinates?.[0]) {
            const coords = incident.geometry.coordinates[0];
            let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
            coords.forEach(([lng, lat]) => {
              minLng = Math.min(minLng, lng);
              minLat = Math.min(minLat, lat);
              maxLng = Math.max(maxLng, lng);
              maxLat = Math.max(maxLat, lat);
            });
            setFitBounds({ bounds: [[minLng, minLat], [maxLng, maxLat]], padding: 40 });
          }
        } else {
          setFlyToCoords({
            lat: parseFloat(incident.latitude),
            lng: parseFloat(incident.longitude),
            zoom: 10,
          });
        }
      } else {
        setFlyToCoords(null);
      }

      // Update URL to make incident / zone shareable, preserving other params
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
    [setSearchParams]
  );

  const handleSelectEventFromActivity = useCallback(
    (incidentId, incidentData) => {
      if (incidentData && incidentData.latitude && incidentData.longitude) {
        handleSelectIncident(incidentData);
        return;
      }
      // Try to find in current incidents list
      const found = incidents.find((i) => i.id === incidentId);
      if (found) {
        handleSelectIncident(found);
        return;
      }
      // Fetch from API as fallback
      api
        .getIncident(incidentId)
        .then((res) => {
          if (res.data?.incident) handleSelectIncident(res.data.incident);
        })
        .catch(() => {
          console.warn('Could not fetch incident', incidentId);
        });
    },
    [incidents, handleSelectIncident]
  );

  const handleBack = useCallback(() => {
    // Stop any in-flight map animation so a viewport update doesn't overwrite
    // the cleared selection in the same React batch.
    const map = mapRef.current?.getMap?.();
    if (map && typeof map.stop === 'function') {
      map.stop();
    }

    selectedIncidentRef.current = null;
    setSelectedIncident(null);
    setFitBounds(null);
    setFlyToCoords(null);

    // Clear incident / zone from URL while preserving other params
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('incident');
        next.delete('zone');
        return next;
      },
      { replace: true }
    );
  }, [setSearchParams, setFitBounds, setFlyToCoords]);

  const handleNavigateToFullPage = useCallback(
    (incidentId) => {
      // Capture the current map viewport so the back button returns to the same view
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
      if (
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        Number.isFinite(zoom)
      ) {
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

    // If a zone is currently selected, do not auto-switch to a stale incident id
    if (selectedIncident?.geometry_type === 'polygon') return;

    const inList = incidents.find((i) => i.id === incidentIdFromUrl);
    if (inList) {
      handleSelectIncident(inList, { skipFlyTo: hasViewportParams });
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
            handleSelectIncident(res.data.incident, { skipFlyTo: hasViewportParams });
          }
        })
        .catch(() => {
          // Incident not found or deleted — clean up URL
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
      handleSelectIncident(inList, { skipFlyTo: hasViewportParams });
      zoneGhostFetchAttempted.current = true;
      return;
    }

    if (incidents.length > 0 && !zoneGhostFetchAttempted.current) {
      zoneGhostFetchAttempted.current = true;
      api
        .getIncident(zoneIdFromUrl)
        .then((res) => {
          if (res.data?.incident) {
            handleSelectIncident(res.data.incident, { skipFlyTo: hasViewportParams });
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

  const handleCenterMapHere = useCallback((lng, lat) => {
    mapRef.current?.centerAt(lng, lat);
    closeMapMenu();
  }, [closeMapMenu]);

  const handleResetMapView = useCallback(() => {
    mapRef.current?.resetView();
    closeMapMenu();
  }, [closeMapMenu]);

  const handleSaveChange = useCallback(async (incidentId, isSaved) => {
    // Optimistic update for instant UI feedback
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
    // Refetch to ensure consistency (notes, saved_at, ghost incidents)
    await refreshSaves();
  }, [incidents, refreshSaves]);
  const handleToggleSave = useCallback(async (incidentId) => {
    const isSaved = savedIds.has(incidentId);
    await handleSaveChange(incidentId, !isSaved);
    closeMapMenu();
  }, [savedIds, handleSaveChange, closeMapMenu]);

  const buildEmptyMenuItems = useCallback((latLng) => {
    if (!latLng) return [];
    const { lat, lng } = latLng;
    return [
      { label: 'Center Map Here', onClick: () => handleCenterMapHere(lng, lat) },
      { label: 'Copy Coordinates', onClick: () => copyCoordinates(lat, lng) },
      { label: 'Reset Map View', onClick: handleResetMapView },
    ];
  }, [handleCenterMapHere, copyCoordinates, handleResetMapView]);

  const buildIncidentMenuItems = useCallback((incident) => {
    if (!incident) return [];
    const isSaved = savedIds.has(incident.id);
    return [
      { label: 'View Details', onClick: () => { handleSelectIncident(incident); closeMapMenu(); } },
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
  }, [savedIds, isAuthenticated, handleSelectIncident, handleToggleSave, copyLink, closeMapMenu, openSignInModal]);

  const buildZoneMenuItems = useCallback((zone) => {
    if (!zone) return [];
    const isSaved = savedIds.has(zone.id);
    return [
      { label: 'View Zone Details', onClick: () => { handleSelectIncident(zone); closeMapMenu(); } },
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
  }, [savedIds, isAuthenticated, handleSelectIncident, handleToggleSave, copyLink, closeMapMenu, openSignInModal]);

  const handleLocationSelect = useCallback((result) => {
    const zoom = getZoomForLocation(result.type, result.class);
    setFlyToCoords({
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      zoom,
    });
  }, []);

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
    setFeedCollapsed(false);
    handleMarkAllRead();
    setShowAwayBanner(false);
  }, [handleMarkAllRead]);

  const handleToggleCollapse = useCallback(() => {
    setFeedCollapsed((prev) => !prev);
  }, []);

  const handleToggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      // Resize map once the sidebar width has changed
      requestAnimationFrame(() => {
        mapRef.current?.getMap()?.resize();
      });
      return next;
    });
  }, []);

  const handleSwitchToIncidentDate = (incident) => {
    const incidentDate = incident.start_date
      ? (() => {
          const d = new Date(incident.start_date);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        })()
      : today;
    setDateRange({ from: incidentDate, to: incidentDate });
  };

  // Filter point incidents by verification status (domain filter already applied in pointIncidents)
  const visibleIncidents = useMemo(() => {
    if (!filters.verifiedOnly) return pointIncidents;
    return pointIncidents.filter((i) => i.verification_status === 'verified');
  }, [pointIncidents, filters.verifiedOnly]);

  // Filter saved incidents with same rules
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

  // Determine if selected incident is a "ghost" (outside current date range).
  // Points only — polygon ghosts are rendered via the zone SVG overlay.
  const ghostIncident = selectedIncident &&
    selectedIncident.geometry_type !== 'polygon' &&
    !incidents.find((i) => i.id === selectedIncident.id)
    ? selectedIncident
    : null;
  const ghostZone = selectedIncident?.geometry_type === 'polygon' &&
    !polygonIncidents.find((z) => z.id === selectedIncident.id)
    ? selectedIncident
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)' }}>
      {/* Main content row */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left — Live Activity Feed */}
        <LiveActivityFeed
          activities={activities}
          onSelectEvent={handleSelectEventFromActivity}
          isCollapsed={feedCollapsed}
          onToggleCollapse={handleToggleCollapse}
          unreadCount={unreadCount}
          onMarkAllRead={handleMarkAllRead}
        />

        {/* Center — Map */}
        <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
          <UserMap
            ref={mapRef}
            incidents={visibleIncidents}
            zones={polygonIncidents}
            selectedEventId={selectedIncident?.geometry_type !== 'polygon' ? selectedIncident?.id : null}
            selectedZoneId={selectedIncident?.geometry_type === 'polygon' ? selectedIncident?.id : null}
            onEventClick={handleSelectIncident}
            onZoneClick={handleSelectIncident}
            onViewportChange={handleViewportChange}
            flyToCoords={flyToCoords}
            fitBounds={fitBounds}
            initialViewport={
              hasViewportParams
                ? { center: [parseFloat(lngParam), parseFloat(latParam)], zoom: parseFloat(zoomParam) }
                : null
            }
            ghostIncident={ghostIncident}
            ghostZone={ghostZone}
            showZones={showZones}
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

          <MapLegend
            domains={domains}
            activeDomainFilters={activeDomainFilters}
            onToggleDomain={handleToggleDomain}
            onShowAll={handleShowAllDomains}
            onHideAll={handleHideAllDomains}
            showZones={showZones}
            onToggleZones={handleToggleZones}
          />

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

          {/* Ghost incident banner — outside current date range */}
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
                  background: 'var(--text-muted)',
                  border: '2px dashed var(--text-muted)',
                  flexShrink: 0,
                }}
              />
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.4 }}>
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

        {/* Right — Incident sidebar */}
        <div
          style={{
            width: sidebarCollapsed ? '44px' : '630px',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            transition: 'width 0.2s ease',
          }}
        >
          <IncidentSidebar
            incidents={
              isAuthenticated && sidebarTab === 'saved'
                ? visibleSavedIncidents
                : uniqueById([...visibleIncidents, ...(showZones ? polygonIncidents : [])])
            }
            selectedIncident={selectedIncident}
            onSelectEvent={handleSelectIncident}
            onBack={handleBack}
            onNavigateToFullPage={handleNavigateToFullPage}
            loading={loading}
            filters={filters}
            onFilterChange={setFilters}
            detailRefreshKey={detailRefreshKey}
            tab={isAuthenticated ? sidebarTab : 'events'}
            onTabChange={isAuthenticated ? setSidebarTab : undefined}
            savedIds={savedIds}
            onSaveChange={handleSaveChange}
            savedCount={savedIncidents.length}
            isCollapsed={sidebarCollapsed}
            onToggleCollapse={handleToggleSidebar}
          />
        </div>
      </div>

      {/* Bottom — Ticker bar */}
      <TickerBar activities={activities} onSelectEvent={handleSelectEventFromActivity} />

    </div>
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
