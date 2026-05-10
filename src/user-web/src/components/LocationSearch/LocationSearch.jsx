import React, { useState, useRef, useEffect, useCallback } from 'react';
import { parseCoordinates } from '../../utils/parseCoordinates.js';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'GeoWatch/1.0 (https://geowatch.local)';

const TYPE_LABELS = {
  city: 'City',
  town: 'Town',
  village: 'Village',
  suburb: 'Suburb',
  neighbourhood: 'Neighbourhood',
  residential: 'Residential',
  commercial: 'Commercial',
  industrial: 'Industrial',
  administrative: 'Admin',
  country: 'Country',
  state: 'State',
  county: 'County',
  region: 'Region',
  municipality: 'Municipality',
  district: 'District',
  borough: 'Borough',
  quarter: 'Quarter',
  street: 'Street',
  road: 'Road',
  square: 'Square',
  building: 'Building',
  house: 'House',
  yes: 'Building',
  peak: 'Peak',
  volcano: 'Volcano',
  river: 'River',
  lake: 'Lake',
  airport: 'Airport',
  station: 'Station',
  hospital: 'Hospital',
  school: 'School',
  university: 'University',
  place_of_worship: 'Worship',
  park: 'Park',
  farm: 'Farm',
  allotments: 'Allotments',
};

function formatType(type) {
  const label = TYPE_LABELS[type];
  if (label) return label;
  // Fallback: capitalize first letter
  return type ? type.charAt(0).toUpperCase() + type.slice(1) : '';
}

/**
 * Extract admin-level context from Nominatim structured address.
 * Shows only State/Province + Country for clean disambiguation.
 * E.g. { city: "Bahawalpur", state: "Punjab", country: "Pakistan" }
 *   → "Punjab, Pakistan"
 */
function extractContext(address, name) {
  if (!address) return '';
  const parts = [];

  // State / Province / Region
  if (address.state) parts.push(address.state);
  else if (address.province) parts.push(address.province);
  else if (address.region) parts.push(address.region);
  else if (address.county) parts.push(address.county);

  // Country
  if (address.country) parts.push(address.country);

  // Fallback: if we got nothing useful, use display_name parsing
  if (parts.length === 0) {
    return '';
  }

  return parts.join(', ');
}

function getTypeColor(type, cls) {
  const t = (type || '').toLowerCase();
  const c = (cls || '').toLowerCase();
  if (['country', 'continent'].includes(t)) return '#a855f7';
  if (['state', 'region', 'province'].includes(t)) return '#3b82f6';
  if (['city', 'town', 'municipality'].includes(t)) return '#f59e0b';
  if (['village', 'suburb', 'neighbourhood', 'quarter'].includes(t)) return '#14b8a6';
  if (['street', 'road', 'square', 'highway'].includes(t) || c === 'highway') return '#ef4444';
  if (['building', 'house', 'yes'].includes(t)) return '#6b7280';
  if (['river', 'lake', 'water'].includes(t)) return '#3b82f6';
  if (['park', 'farm', 'allotments'].includes(t)) return '#22c55e';
  if (['airport', 'station', 'bus_station'].includes(t)) return '#f97316';
  if (['hospital', 'school', 'university'].includes(t)) return '#ec4899';
  return '#6b7280';
}

export default function LocationSearch({ onSelect, viewbox }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const searchTimeoutRef = useRef(null);
  const containerRef = useRef(null);
  const itemRefs = useRef([]);

  const searchNominatim = useCallback(async (q) => {
    if (!q.trim()) {
      setResults([]);
      setShowDropdown(false);
      setHighlightedIndex(-1);
      return;
    }

    // Check if input is coordinates
    const coords = parseCoordinates(q);
    if (coords) {
      setResults([
        {
          _isCoordinates: true,
          lat: coords.lat,
          lon: coords.lng,
          display_name: `${Math.abs(coords.lat).toFixed(6)}°${coords.lat >= 0 ? 'N' : 'S'}, ${Math.abs(coords.lng).toFixed(6)}°${coords.lng >= 0 ? 'E' : 'W'}`,
          name: `${coords.format} Coordinates`,
          type: 'coordinates',
          class: 'coordinates',
        },
      ]);
      setShowDropdown(true);
      setHighlightedIndex(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let url = `${NOMINATIM_URL}?q=${encodeURIComponent(q)}&format=json&limit=8&addressdetails=1`;
      if (viewbox) {
        url += `&viewbox=${encodeURIComponent(viewbox)}&bounded=0`;
      }
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
      });
      const data = await res.json();
      const arr = Array.isArray(data) ? data : [];
      setResults(arr);
      setShowDropdown(true);
      setHighlightedIndex(arr.length > 0 ? 0 : -1);
    } catch {
      setResults([]);
      setHighlightedIndex(-1);
    } finally {
      setLoading(false);
    }
  }, [viewbox]);

  const handleQueryChange = (value) => {
    setQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      searchNominatim(value);
    }, 400);
  };

  const handleSelect = (result) => {
    onSelect?.(result);
    setQuery('');
    setResults([]);
    setShowDropdown(false);
    setHighlightedIndex(-1);
  };

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (!showDropdown || results.length === 0) {
      if (e.key === 'Escape') {
        setShowDropdown(false);
        setHighlightedIndex(-1);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = highlightedIndex < results.length - 1 ? highlightedIndex + 1 : 0;
      setHighlightedIndex(next);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = highlightedIndex > 0 ? highlightedIndex - 1 : results.length - 1;
      setHighlightedIndex(prev);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < results.length) {
        handleSelect(results[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      setHighlightedIndex(-1);
    }
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && itemRefs.current[highlightedIndex]) {
      itemRefs.current[highlightedIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [highlightedIndex]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  const inputStyle = {
    width: '100%',
    padding: '8px 32px 8px 12px',
    background: 'var(--bg-surface)',
    backdropFilter: 'blur(8px)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    fontSize: '13px',
    fontFamily: 'var(--font-sans)',
    outline: 'none',
    transition: 'border-color 0.2s ease',
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setShowDropdown(true);
          }}
          placeholder="Search location..."
          style={inputStyle}
          onKeyDown={handleKeyDown}
        />
        <div
          style={{
            position: 'absolute',
            right: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '13px',
            color: 'var(--text-muted)',
            pointerEvents: 'none',
          }}
        >
          {loading ? (
            <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span>
          ) : (
            '🔍'
          )}
        </div>
      </div>

      {showDropdown && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            maxHeight: '340px',
            overflowY: 'auto',
            background: 'var(--bg-surface)',
            backdropFilter: 'blur(16px)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            zIndex: 20,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
          }}
        >
          {/* Header with result count */}
          {results.length > 0 && (
            <div
              style={{
                padding: '8px 12px',
                borderBottom: '1px solid rgba(42, 46, 59, 0.5)',
                fontSize: '11px',
                color: 'var(--text-muted)',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
              }}
            >
              {results.length} location{results.length !== 1 ? 's' : ''} found
            </div>
          )}

          {results.length === 0 && query.trim() ? (
            <div
              style={{
                padding: '16px',
                fontSize: '12px',
                color: 'var(--text-muted)',
                textAlign: 'center',
              }}
            >
              No locations found
            </div>
          ) : (
            results.map((result, index) => {
              const isHighlighted = highlightedIndex === index;
              const isCoords = result._isCoordinates;

              if (isCoords) {
                return (
                  <div
                    key="coords"
                    ref={(el) => (itemRefs.current[index] = el)}
                    onClick={() => handleSelect(result)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    style={{
                      padding: '10px 12px',
                      cursor: 'pointer',
                      borderBottom: '1px solid rgba(42, 46, 59, 0.4)',
                      background: isHighlighted ? 'var(--bg-hover)' : 'transparent',
                      transition: 'background 0.12s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                    }}
                  >
                    <span style={{ fontSize: '14px', flexShrink: 0 }}>📍</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          color: 'var(--accent-light)',
                          fontSize: '13px',
                          marginBottom: '2px',
                        }}
                      >
                        Fly to coordinates
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          color: 'var(--text-muted)',
                        }}
                      >
                        {result.display_name} · {result.name}
                      </div>
                    </div>
                  </div>
                );
              }

              const typeColor = getTypeColor(result.type, result.class);
              const typeLabel = formatType(result.type);
              const name = result.name || result.display_name.split(',')[0];
              const context = extractContext(result.address, name);

              return (
                <div
                  key={result.place_id}
                  ref={(el) => (itemRefs.current[index] = el)}
                  onClick={() => handleSelect(result)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  title={result.display_name}
                  style={{
                    padding: '10px 12px',
                    cursor: 'pointer',
                    borderBottom: '1px solid rgba(42, 46, 59, 0.4)',
                    background: isHighlighted ? 'var(--bg-hover)' : 'transparent',
                    transition: 'background 0.12s ease',
                  }}
                >
                  {/* Line 1: Name + Type badge */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '3px',
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {name}
                    </span>
                    {typeLabel && (
                      <span
                        style={{
                          fontSize: '9px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          color: typeColor,
                          background: `${typeColor}18`,
                          border: `1px solid ${typeColor}40`,
                          padding: '1px 6px',
                          borderRadius: 'var(--radius-sm)',
                          flexShrink: 0,
                        }}
                      >
                        {typeLabel}
                      </span>
                    )}
                  </div>
                  {/* Line 2: Hierarchical context */}
                  {context && (
                    <div
                      style={{
                        fontSize: '12px',
                        color: 'var(--text-muted)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {context}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* OpenStreetMap attribution */}
      <div
        style={{
          marginTop: '4px',
          fontSize: '9px',
          color: 'var(--text-muted)',
          textAlign: 'right',
          opacity: 0.7,
        }}
      >
        Search by{' '}
        <a
          href="https://openstreetmap.org"
          target="_blank"
          rel="noreferrer"
          style={{ color: 'var(--text-muted)', textDecoration: 'none' }}
        >
          OpenStreetMap
        </a>
      </div>
    </div>
  );
}
