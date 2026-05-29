import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
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

const LS_KEY = 'geowatch_last_seen';
const MAX_ACTIVITIES = 50;

function getLastSeen() {
  const raw = localStorage.getItem(LS_KEY);
  return raw ? parseInt(raw, 10) : Date.now();
}

function setLastSeen(ts) {
  localStorage.setItem(LS_KEY, String(ts));
}

export default function MapPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const incidentIdFromUrl = searchParams.get('incident');

  // ─── Date & filters ───
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const [dateRange, setDateRange] = useState({ from: today, to: today });
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [flyToCoords, setFlyToCoords] = useState(null);
  const [filters, setFilters] = useState({
    categoryId: searchParams.get('categoryId') || '',
    severity: '',
    verifiedOnly: false,
  });

  // ─── Domain Filter / Legend ───
  const [domains, setDomains] = useState([]);
  const [activeDomainFilters, setActiveDomainFilters] = useState(new Set());

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

  // ─── Live Activity ───
  const [activities, setActivities] = useState([]);
  const [feedCollapsed, setFeedCollapsed] = useState(false);
  const [lastSeenTimestamp, setLastSeenTimestamp] = useState(getLastSeen());
  const [showAwayBanner, setShowAwayBanner] = useState(false);
  const [awayStats, setAwayStats] = useState({ newEvents: 0, updatedEvents: 0 });

  const esRef = useRef(null);
  const selectedIncidentRef = useRef(null);

  // Detail refresh key — increments when SSE triggers an update for selected incident
  const [detailRefreshKey, setDetailRefreshKey] = useState(0);

  // Keep ref in sync with state for SSE handler
  useEffect(() => {
    selectedIncidentRef.current = selectedIncident;
  }, [selectedIncident]);

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

      // Step 1: Fetch without viewport to count total incidents for this date range
      const params1 = { dateFrom: dateRange.from, dateTo: dateRange.to, ...baseParams };
      const res1 = await api.getIncidents(params1);

      if (cancelled) return;
      setTotalEventCount(res1.data.count);

      if (res1.data.count <= 100) {
        // Light load: show all incidents, no viewport filtering needed
        setIncidents(res1.data.incidents || []);
        setViewportFiltering(false);
        viewportFilteringRef.current = false;
        setLoading(false);
      } else {
        // Heavy load: enable viewport filtering
        setViewportFiltering(true);
        viewportFilteringRef.current = true;

        // Step 2: If viewport bounds are already known, fetch with them
        if (viewportBoundsRef.current) {
          const params2 = {
            dateFrom: dateRange.from,
            dateTo: dateRange.to,
            viewport: viewportBoundsRef.current,
            ...baseParams,
          };
          const res2 = await api.getIncidents(params2);
          if (cancelled) return;
          setIncidents(res2.data.incidents || []);
          setTotalEventCount(res2.data.count);
        } else {
          // Bounds not ready yet — show the first batch temporarily
          setIncidents(res1.data.incidents || []);
        }
        setLoading(false);
      }
    };

    doFetch();

    return () => {
      cancelled = true;
    };
  }, [dateRange.from, dateRange.to, filters.categoryId, filters.severity]);

  // ─── Handle incident ID from URL — robust deep-linking with ghost support ───
  useEffect(() => {
    if (!incidentIdFromUrl) {
      ghostFetchAttempted.current = false;
      return;
    }

    const inList = incidents.find((i) => i.id === incidentIdFromUrl);
    if (inList) {
      handleSelectIncident(inList);
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
            setSelectedIncident(res.data.incident);
            setFlyToCoords({
              lat: parseFloat(res.data.incident.latitude),
              lng: parseFloat(res.data.incident.longitude),
              zoom: 10,
            });
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
  }, [incidentIdFromUrl, incidents.length]);

  // Fetch domains for legend
  useEffect(() => {
    api.getDomains()
      .then((res) => {
        setDomains(res.data.domains || []);
      })
      .catch(() => setDomains([]));
  }, []);

  // Filtered incidents for map
  const filteredIncidents = useMemo(() => {
    if (activeDomainFilters.size === 0) return incidents;
    return incidents.filter((i) => !activeDomainFilters.has(i.domain_slug));
  }, [incidents, activeDomainFilters]);

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

  // ─── Handle viewport bounds changes from the map ───
  const handleViewportChange = useCallback((bounds) => {
    viewportBoundsRef.current = bounds;

    // If viewport filtering is already active, re-fetch with new bounds
    if (viewportFilteringRef.current === true) {
      const params = {
        dateFrom: dateRange.from,
        dateTo: dateRange.to,
        viewport: bounds,
      };
      if (filters.categoryId) params.categoryId = filters.categoryId;
      if (filters.severity) params.severity = filters.severity;

      api
        .getIncidents(params)
        .then((res) => {
          setIncidents(res.data.incidents || []);
          setTotalEventCount(res.data.count);
        })
        .catch(() => setIncidents([]));
    }
  }, [dateRange.from, dateRange.to, filters.categoryId, filters.severity]);

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
    (incident) => {
      setSelectedIncident(incident);
      setFlyToCoords({
        lat: parseFloat(incident.latitude),
        lng: parseFloat(incident.longitude),
        zoom: 10,
      });
      // Update URL to make incident shareable, preserving other params
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('incident', incident.id);
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
    setSelectedIncident(null);
    // Clear incident from URL while preserving other params
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('incident');
      return next;
    });
  }, [setSearchParams]);

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

  const handleSwitchToIncidentDate = (incident) => {
    const incidentDate = incident.start_date
      ? (() => {
          const d = new Date(incident.start_date);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        })()
      : today;
    setDateRange({ from: incidentDate, to: incidentDate });
  };

  // Filter incidents by verification status and domain legend
  const visibleIncidents = useMemo(() => {
    let result = incidents;
    if (filters.verifiedOnly) {
      result = result.filter((i) => i.verification_status === 'verified' || i.verification_status === 'confirmed');
    }
    if (activeDomainFilters.size > 0) {
      result = result.filter((i) => !activeDomainFilters.has(i.domain_slug));
    }
    return result;
  }, [incidents, filters.verifiedOnly, activeDomainFilters]);

  // Determine if selected incident is a "ghost" (outside current date range)
  const ghostIncident = selectedIncident && !incidents.find((i) => i.id === selectedIncident.id)
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
            incidents={visibleIncidents}
            selectedEventId={selectedIncident?.id}
            onEventClick={handleSelectIncident}
            onViewportChange={handleViewportChange}
            flyToCoords={flyToCoords}
            ghostIncident={ghostIncident}
          />

          <MapLegend
            domains={domains}
            activeDomainFilters={activeDomainFilters}
            onToggleDomain={handleToggleDomain}
            onShowAll={handleShowAllDomains}
            onHideAll={handleHideAllDomains}
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
        <div style={{ width: '630px', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
          <IncidentSidebar
            incidents={visibleIncidents}
            selectedIncident={selectedIncident}
            onSelectEvent={handleSelectIncident}
            onBack={handleBack}
            loading={loading}
            filters={filters}
            onFilterChange={setFilters}
            detailRefreshKey={detailRefreshKey}
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
