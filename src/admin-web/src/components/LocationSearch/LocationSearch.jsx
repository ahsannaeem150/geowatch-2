import React, { useState, useRef, useEffect, useCallback } from 'react';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'GeoWatch/1.0 (https://geowatch.local)';

export default function LocationSearch({ onSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchTimeoutRef = useRef(null);
  const containerRef = useRef(null);

  const searchNominatim = useCallback(async (q) => {
    if (!q.trim()) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    setLoading(true);
    try {
      const url = `${NOMINATIM_URL}?q=${encodeURIComponent(q)}&format=json&limit=5&addressdetails=0`;
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
      });
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
      setShowDropdown(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

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
  };

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
    background: 'rgba(15, 17, 23, 0.9)',
    backdropFilter: 'blur(8px)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    fontSize: '13px',
    fontFamily: 'var(--font-sans)',
    outline: 'none',
    transition: 'border-color 0.2s ease',
  };

  const dropdownStyle = {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    left: 0,
    right: 0,
    maxHeight: '240px',
    overflowY: 'auto',
    background: 'rgba(15, 17, 23, 0.95)',
    backdropFilter: 'blur(12px)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-sm)',
    zIndex: 20,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
  };

  const resultItemStyle = {
    padding: '10px 12px',
    fontSize: '12px',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    borderBottom: '1px solid rgba(42, 46, 59, 0.5)',
    lineHeight: 1.4,
    transition: 'background 0.15s ease',
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
          onKeyDown={(e) => {
            if (e.key === 'Enter' && results.length > 0) {
              handleSelect(results[0]);
            }
            if (e.key === 'Escape') {
              setShowDropdown(false);
            }
          }}
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
        <div style={dropdownStyle}>
          {results.length === 0 && query.trim() ? (
            <div style={{ padding: '12px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
              No locations found
            </div>
          ) : (
            results.map((result) => (
              <div
                key={result.place_id}
                onClick={() => handleSelect(result)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
                style={resultItemStyle}
              >
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>
                  {result.name || result.display_name.split(',')[0]}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {result.display_name}
                </div>
              </div>
            ))
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
