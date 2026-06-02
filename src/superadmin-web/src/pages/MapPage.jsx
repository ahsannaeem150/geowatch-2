import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getIncidents, getIncident, getDomains, listAllCategories } from '../services/api.js';
import { API_BASE_URL } from '@shared/constants.js';
import SuperadminMap from '../components/Map/SuperadminMap.jsx';
import MapControls from '../components/Map/MapControls.jsx';
import LocationSearch from '../components/LocationSearch/LocationSearch.jsx';
import IncidentDetailPanel from '../components/Map/IncidentDetailPanel.jsx';
import MapLegend from '@shared/components/MapLegend.jsx';

export default function MapPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const incidentIdFromUrl = searchParams.get('incident');

  // ─── Deep-link params ───
  const dateParam = searchParams.get('date');
  const fromParam = searchParams.get('from');
  const toParam = searchParams.get('to');
  const latParam = searchParams.get('lat');
  const lngParam = searchParams.get('lng');
  const zoomParam = searchParams.get('zoom');
  const refParam = searchParams.get('ref');
  const actorParam = searchParams.get('actor');
  const returnToParam = searchParams.get('returnTo');

  // ─── Date & filters ───
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const initialFrom = dateParam || fromParam || today;
  const initialTo = dateParam || toParam || today;
  const [dateRange, setDateRange] = useState({ from: initialFrom, to: initialTo });
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState(null);
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

  // Show contextual banner when coming from activity timeline with an incident
  const showContextBanner = refParam === 'activity' && incidentIdFromUrl;

  // ─── Domain Filter / Legend ───
  const [domains, setDomains] = useState([]);
  const [activeDomainFilters, setActiveDomainFilters] = useState(new Set());

  // ─── Categories for edit form ───
  const [categories, setCategories] = useState([]);

  // Ghost fetch tracking
  const ghostFetchAttempted = useRef(false);

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

  // ─── Handle incident ID from URL — deep-linking with ghost support ───
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

    if (incidents.length > 0 && !ghostFetchAttempted.current) {
      ghostFetchAttempted.current = true;
      getIncident(incidentIdFromUrl)
        .then((res) => {
          if (res?.incident) {
            setSelectedIncident(res.incident);
            setFlyToCoords({
              lat: parseFloat(res.incident.latitude),
              lng: parseFloat(res.incident.longitude),
              zoom: 10,
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
    }
  }, [incidentIdFromUrl, incidents.length]);

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

  // Filtered incidents
  const filteredIncidents = useMemo(() => {
    let result = incidents;
    if (filters.verifiedOnly) {
      result = result.filter((i) => i.verification_status === 'verified' || i.verification_status === 'confirmed');
    }
    if (activeDomainFilters.size > 0) {
      result = result.filter((i) => !activeDomainFilters.has(i.domain_slug));
    }
    return result;
  }, [incidents, filters.verifiedOnly, activeDomainFilters]);

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
  const handleViewportChange = useCallback((bounds) => {
    viewportBoundsRef.current = bounds;

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
  }, [dateRange.from, dateRange.to, filters.categoryId, filters.severity, filters.status]);

  // Select incident
  const handleSelectIncident = useCallback((incident) => {
    setSelectedIncident(incident);
    setFlyToCoords({
      lat: parseFloat(incident.latitude),
      lng: parseFloat(incident.longitude),
      zoom: 10,
    });
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('incident', incident.id);
      return next;
    });
  }, [setSearchParams]);

  const handleBack = useCallback(() => {
    setSelectedIncident(null);
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
    } else {
      handleDismissContext();
    }
  }, [returnToParam, navigate, handleDismissContext]);

  const handleSwitchToIncidentDate = (incident) => {
    const incidentDate = incident.start_date
      ? (() => {
          const d = new Date(incident.start_date);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        })()
      : today;
    setDateRange({ from: incidentDate, to: incidentDate });
  };

  // Ghost incident
  const ghostIncident = selectedIncident && !incidents.find((i) => i.id === selectedIncident.id)
    ? selectedIncident
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - var(--topbar-height))' }}>
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
              Showing incident from{' '}
              <span style={{ fontWeight: 700 }}>
                {actorParam ? `${actorParam}'s activity` : 'activity timeline'}
              </span>
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <button
              onClick={handleBackToProfile}
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
              ← Back to profile
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
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Center — Map */}
        <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
          <SuperadminMap
            incidents={filteredIncidents}
            selectedEventId={selectedIncident?.id}
            onEventClick={handleSelectIncident}
            onViewportChange={handleViewportChange}
            flyToCoords={flyToCoords}
            ghostIncident={ghostIncident}
            adminMode={true}
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
            </div>
          )}
        </div>

        {/* Right — Incident detail panel */}
        {selectedIncident && (
          <div style={{ width: '480px', flexShrink: 0, background: 'var(--bg-surface)', borderLeft: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <IncidentDetailPanel
              incident={selectedIncident}
              onBack={handleBack}
              adminMode={true}
              onRefresh={() => {
                setRefreshKey((k) => k + 1);
              }}
              categories={categories}
            />
          </div>
        )}
      </div>
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
