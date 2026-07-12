import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  X,
  Command,
  MapPin,
  Clock,
  Navigation,
  Star,
} from 'lucide-react';
import { SeverityBadge } from '@shared/components/SeverityBadge.jsx';
import { getIncidentDomainColor } from '@shared/utils/themeColors.js';
import { useTheme } from '@shared/useTheme.js';

const RECENTS_KEY = 'geowatch_user_command_palette_recents';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlight(text, query) {
  if (!query.trim()) return <span>{text}</span>;
  const parts = text.split(new RegExp(`(${escapeRegExp(query)})`, 'gi'));
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark
            key={i}
            style={{
              background: 'var(--accent)',
              color: 'var(--text-on-accent)',
              borderRadius: '2px',
              padding: '0 2px',
              fontWeight: 700,
            }}
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

function timeAgoLabel(dateValue) {
  if (!dateValue) return '';
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return '';
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return `${Math.floor(diffH / 24)}d ago`;
}

function parseCoordinates(query) {
  const match = query.match(/^\s*(-?\d+(?:\.\d+)?)\s*[|,\s]\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (!match) return null;
  const lat = parseFloat(match[1]);
  const lng = parseFloat(match[2]);
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
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

export default function UserCommandPalette({
  isOpen,
  onClose,
  incidents = [],
  savedIds = new Set(),
  onSelectIncident,
  onSelectLocation,
}) {
  const { theme } = useTheme();
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [locationResults, setLocationResults] = useState([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [recents, setRecents] = useState([]);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const savedSet = useMemo(() => (savedIds instanceof Set ? savedIds : new Set(savedIds || [])), [savedIds]);

  useEffect(() => {
    if (!isOpen) return;
    try {
      const raw = localStorage.getItem(RECENTS_KEY);
      if (raw) setRecents(JSON.parse(raw));
    } catch {
      // ignore
    }
    setHighlightedIndex(0);
    setLocationResults([]);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const coordinateHit = useMemo(() => parseCoordinates(query), [query]);

  const filteredIncidents = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return incidents
      .filter((inc) => {
        const text = `${inc.title || ''} ${inc.location_context || inc.location || ''} ${inc.domain_name || inc.category_name || ''}`.toLowerCase();
        return text.includes(q);
      })
      .slice(0, 8);
  }, [incidents, query]);

  useEffect(() => {
    const q = query.trim();
    if (!q || coordinateHit) {
      setLocationResults([]);
      return;
    }
    if (q.length < 2) {
      setLocationResults([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLocationLoading(true);
      try {
        const url = `${NOMINATIM_URL}?format=json&q=${encodeURIComponent(q)}&limit=5&addressdetails=1`;
        const res = await fetch(url, { signal: controller.signal, headers: { 'Accept-Language': 'en' } });
        const data = await res.json();
        setLocationResults(Array.isArray(data) ? data : []);
      } catch {
        setLocationResults([]);
      } finally {
        setLocationLoading(false);
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, coordinateHit]);

  const allItems = useMemo(() => {
    const items = [];
    if (coordinateHit) {
      items.push({
        type: 'coordinate',
        id: 'coordinate-hit',
        label: `${coordinateHit.lat.toFixed(5)}, ${coordinateHit.lng.toFixed(5)}`,
        sublabel: 'Go to coordinates',
        lat: coordinateHit.lat,
        lng: coordinateHit.lng,
        zoom: 16,
      });
    }
    filteredIncidents.forEach((inc) => {
      items.push({ type: 'incident', id: inc.id, incident: inc });
    });
    locationResults.forEach((loc, idx) => {
      items.push({
        type: 'location',
        id: `loc-${idx}`,
        label: loc.display_name,
        sublabel: `${loc.type || ''} · ${loc.class || ''}`.replace(/^\s*·\s*|\s*·\s*$/g, ''),
        lat: parseFloat(loc.lat),
        lng: parseFloat(loc.lon),
        locationType: loc.type,
        locationClass: loc.class,
      });
    });
    return items;
  }, [coordinateHit, filteredIncidents, locationResults]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [query]);

  function pushRecent(term) {
    if (!term.trim()) return;
    const next = [term, ...recents.filter((x) => x !== term)].slice(0, 5);
    setRecents(next);
    try {
      localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  function handleSelect(item) {
    if (!item) return;
    if (item.type === 'incident') {
      pushRecent(item.incident.title || query);
      onSelectIncident?.(item.incident);
    } else if (item.type === 'location' || item.type === 'coordinate') {
      pushRecent(item.label);
      const zoom = item.zoom ?? getZoomForLocation(item.locationType, item.locationClass);
      onSelectLocation?.({ lat: item.lat, lng: item.lng, zoom });
    }
    onClose?.();
  }

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((i) => (i + 1) % Math.max(1, allItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((i) => (i - 1 + Math.max(1, allItems.length)) % Math.max(1, allItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = allItems[highlightedIndex];
      handleSelect(item);
    }
  }

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'var(--backdrop)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 'calc(8vh * var(--admin-ui-scale))',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(680px, 92vw)',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '80vh',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'calc(12px * var(--admin-ui-scale))',
            padding: 'calc(14px * var(--admin-ui-scale)) calc(16px * var(--admin-ui-scale))',
            borderBottom: '1px solid var(--border-default)',
          }}
        >
          <Search size={20} color="var(--text-muted)" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search incidents, places, or coordinates…"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: 'calc(16px * var(--admin-ui-scale))',
            }}
          />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'calc(4px * var(--admin-ui-scale))',
              fontSize: 'calc(11px * var(--admin-ui-scale))',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-muted)',
              background: 'var(--bg-surface)',
              padding: 'calc(3px * var(--admin-ui-scale)) calc(7px * var(--admin-ui-scale))',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <Command size={10} />
            <span>K</span>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {!query.trim() && recents.length > 0 && (
            <div style={{ padding: 'calc(12px * var(--admin-ui-scale))' }}>
              <div
                style={{
                  fontSize: 'calc(11px * var(--admin-ui-scale))',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  color: 'var(--text-muted)',
                  marginBottom: 'calc(8px * var(--admin-ui-scale))',
                }}
              >
                Recent searches
              </div>
              {recents.map((term, idx) => (
                <button
                  key={term}
                  onClick={() => { setQuery(term); inputRef.current?.focus(); }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'calc(10px * var(--admin-ui-scale))',
                    padding: 'calc(8px * var(--admin-ui-scale))',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    borderRadius: 'var(--radius-sm)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <Clock size={14} />
                  <span>{term}</span>
                </button>
              ))}
            </div>
          )}

          {!query.trim() && recents.length === 0 && (
            <div
              style={{
                padding: 'calc(40px * var(--admin-ui-scale))',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: 'calc(13px * var(--admin-ui-scale))',
              }}
            >
              Type to search incidents, places, or coordinates (e.g. 34.52, 69.18).
            </div>
          )}

          {query.trim() && allItems.length === 0 && !locationLoading && (
            <div
              style={{
                padding: 'calc(40px * var(--admin-ui-scale))',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: 'calc(13px * var(--admin-ui-scale))',
              }}
            >
              No results for “{query}”.
            </div>
          )}

          {query.trim() && (
            <div style={{ padding: 'calc(8px * var(--admin-ui-scale))' }}>
              {allItems.map((item, idx) => {
                const active = idx === highlightedIndex;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'calc(12px * var(--admin-ui-scale))',
                      padding: 'calc(10px * var(--admin-ui-scale))',
                      background: active ? 'var(--accent-subtle-bg)' : 'transparent',
                      border: 'none',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    {item.type === 'incident' && (
                      <>
                        <span
                          style={{
                            width: 'calc(8px * var(--admin-ui-scale))',
                            height: 'calc(8px * var(--admin-ui-scale))',
                            borderRadius: '50%',
                            background: getIncidentDomainColor(item.incident, theme),
                            flexShrink: 0,
                          }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 'calc(13px * var(--admin-ui-scale))', fontWeight: 700 }}>
                            {highlight(item.incident.title || 'Untitled', query)}
                          </div>
                          <div style={{ fontSize: 'calc(11px * var(--admin-ui-scale))', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            {item.incident.location_context || item.incident.location || 'Unknown location'} · {timeAgoLabel(item.incident.created_at)}
                          </div>
                        </div>
                        <SeverityBadge level={item.incident.severity} />
                        {savedSet.has(item.incident.id) && <Star size={14} color="var(--accent-light)" fill="var(--accent-light)" />}
                      </>
                    )}
                    {(item.type === 'location' || item.type === 'coordinate') && (
                      <>
                        <MapPin size={16} color="var(--text-secondary)" />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 'calc(13px * var(--admin-ui-scale))', fontWeight: 700 }}>
                            {highlight(item.label, query)}
                          </div>
                          {item.sublabel && (
                            <div style={{ fontSize: 'calc(11px * var(--admin-ui-scale))', color: 'var(--text-secondary)', marginTop: '2px' }}>
                              {item.sublabel}
                            </div>
                          )}
                        </div>
                        <Navigation size={14} color="var(--text-muted)" />
                      </>
                    )}
                  </button>
                );
              })}
              {locationLoading && (
                <div style={{ padding: 'calc(12px * var(--admin-ui-scale))', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'calc(12px * var(--admin-ui-scale))' }}>
                  Searching places…
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
