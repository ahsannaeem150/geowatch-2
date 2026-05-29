import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import TopBar from './TopBar.jsx';
import AdminMap from '../Map/AdminMap.jsx';
import IncidentForm from '../IncidentForm/IncidentForm.jsx';
import IncidentDetailPanel from '../IncidentDetail/IncidentDetailPanel.jsx';
import LocationSearch from '../LocationSearch/LocationSearch.jsx';
import SearchModal from '../SearchModal/SearchModal.jsx';
import AdminLiveFeed from '../LiveActivity/AdminLiveFeed.jsx';
import MapLegend from '@shared/components/MapLegend.jsx';
import { reverseGeocode } from '../../utils/reverseGeocode.js';
import { api } from '../../services/api.js';
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
  const [panelMode, setPanelMode] = useState('empty'); // 'empty' | 'detail' | 'form'
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [markerCoords, setMarkerCoords] = useState(null);
  const [flyToCoords, setFlyToCoords] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [toast, setToast] = useState(null);

  // Search modal state
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchModalQuery, setSearchModalQuery] = useState('');
  const [resolveTrigger, setResolveTrigger] = useState(0);

  // Smart viewport filtering state
  const [viewportFiltering, setViewportFiltering] = useState(null);
  const [totalEventCount, setTotalEventCount] = useState(0);
  const viewportBoundsRef = useRef(null);
  const viewportFilteringRef = useRef(null);

  // ─── URL Sharing (Deep-linking) ───
  const [searchParams, setSearchParams] = useSearchParams();
  const incidentIdFromUrl = searchParams.get('incident');
  const ghostFetchAttempted = useRef(false);

  // ─── Domain Filter / Legend ───
  const [domains, setDomains] = useState([]);
  const [activeDomainFilters, setActiveDomainFilters] = useState(new Set());

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
    // Legend multi-domain filter
    if (activeDomainFilters.size > 0) {
      result = result.filter((i) => activeDomainFilters.has(i.domain_slug));
    }
    return result;
  }, [incidents, activeDomainFilter, activeDomainFilters]);

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

  // Handle viewport bounds changes from the map
  const handleViewportChange = useCallback((bounds) => {
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
  }, [dateRange.from, dateRange.to]);

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

    reverseGeocode(coords.lat, coords.lng).then((locationContext) => {
      setMarkerCoords((prev) => {
        if (!prev) return null;
        return { ...prev, locationContext: locationContext || null };
      });
    });
  }, []);

  const handleEventClick = useCallback((incident) => {
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

  const handleResetToToday = () => {
    setDateRange({ from: today, to: today });
  };

  const handleEditFromDetail = (incident) => {
    setIsEditing(true);
    setPanelMode('form');
  };

  const handleClosePanel = () => {
    setPanelMode('empty');
    setSelectedIncident(null);
    setMarkerCoords(null);
    setIsEditing(false);
    // Clear incident from URL while preserving other params
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('incident');
      return next;
    });
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

  const handleSubmit = async (payload) => {
    setSubmitting(true);
    try {
      if (isEditing && selectedIncident) {
        await api.updateIncident(selectedIncident.id, payload);
        setSelectedIncident((prev) => ({ ...prev, ...payload, start_date: payload.startDate, end_date: payload.endDate }));
        setIsEditing(false);
        setPanelMode('detail');
      } else {
        const res = await api.createIncident(payload);
        const newIncident = res.data.incident;
        setSelectedIncident(newIncident);
        setPanelMode('detail');
        setMarkerCoords(null);

        if (newIncident.end_date) {
          const graceEnd = new Date(new Date(newIncident.end_date).getTime() + 24 * 60 * 60 * 1000);
          if (graceEnd < new Date()) {
            setToast({
              message: 'Incident added successfully. It has already ended — use the date range picker to view it on the map.',
              type: 'info',
            });
          }
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

  // Determine what to show in the right panel
  const renderPanel = () => {
    if (panelMode === 'detail' && selectedIncident) {
      return (
        <IncidentDetailPanel
          incidentId={selectedIncident.id}
          onEdit={handleEditFromDetail}
          onClose={handleClosePanel}
          onResolve={(id) => {
            setRefreshKey((k) => k + 1);
            // Keep panel open but refresh data
          }}
          resolveTrigger={resolveTrigger}
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

  const isPanelOpen = panelMode !== 'empty';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'radial-gradient(ellipse 80% 55% at 50% -5%, #1a0a0e 0%, var(--bg-deep) 55%)' }}>
      <TopBar
        onAddEvent={handleAddIncident}
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
          // Trigger the resolve modal in the detail panel
          setResolveTrigger((t) => t + 1);
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
            incidents={filteredIncidents}
            selectedEventId={selectedIncident?.id}
            onEventClick={handleEventClick}
            onMapDblClick={handleMapDblClick}
            onViewportChange={handleViewportChange}
            flyToCoords={flyToCoords}
            markerCoords={markerCoords}
            ghostIncident={ghostIncident}
            newIncidentIds={newIncidentIds}
          />

          <MapLegend
            domains={domains}
            activeDomainFilters={activeDomainFilters}
            onToggleDomain={handleToggleDomain}
            onShowAll={handleShowAllDomains}
            onHideAll={handleHideAllDomains}
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
                  border: '2px dashed rgba(255,255,255,0.4)',
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
                  background: 'rgba(159, 18, 57, 0.1)',
                  color: 'var(--accent-light)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(159, 18, 57, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(159, 18, 57, 0.1)';
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
              <span style={{ color: 'var(--accent-light)', fontWeight: 700 }}>{filteredIncidents.length}</span>
              {' incidents visible'}
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
            style={{
              width: '630px',
              overflowY: 'auto',
              padding: '20px',
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
