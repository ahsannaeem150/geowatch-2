import React, { useEffect, useRef, useState } from 'react';
import { Navigation, Search, X, MapPin } from 'lucide-react';

const LOCATIONS = [
  { id: 'loc1', name: 'Kabul, Afghanistan', detail: 'Capital city', lat: 34.52, lng: 69.18 },
  { id: 'loc2', name: 'Eastern Province, Iraq', detail: 'Province', lat: 30.05, lng: 47.95 },
  { id: 'loc3', name: 'Damascus, Syria', detail: 'Capital city', lat: 33.51, lng: 36.28 },
  { id: 'loc4', name: 'Red Sea corridor', detail: 'Maritime route', lat: 20.35, lng: 38.5 },
  { id: 'loc5', name: 'Tehran, Iran', detail: 'Capital city', lat: 35.7, lng: 51.4 },
  { id: 'loc6', name: 'Najaf, Iraq', detail: 'City', lat: 31.95, lng: 44.35 },
];

export default function MapGeocoder() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!selected) return;
    const timer = setTimeout(() => setSelected(null), 3000);
    return () => clearTimeout(timer);
  }, [selected]);

  const suggestions = query.trim()
    ? LOCATIONS.filter((l) => l.name.toLowerCase().includes(query.toLowerCase()))
    : LOCATIONS;

  function selectLocation(loc) {
    setSelected(loc);
    setQuery('');
    setOpen(false);
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: '16px',
        left: '80px',
        zIndex: 40,
      }}
    >
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          title="Search location"
          style={{
            width: '40px',
            height: '40px',
            borderRadius: 'var(--radius-md)',
            background: 'color-mix(in srgb, var(--bg-surface) 92%, transparent)',
            backdropFilter: 'blur(8px)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-md)',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent-light)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-subtle)';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          <Navigation size={18} />
        </button>
      ) : (
        <div
          style={{
            width: '280px',
            background: 'color-mix(in srgb, var(--bg-surface) 96%, transparent)',
            backdropFilter: 'blur(12px)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
            overflow: 'hidden',
            animation: 'geo-fade-in 0.15s ease-out',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <Search size={16} color="var(--text-muted)" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Fly to location..."
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-primary)',
                fontSize: '14px',
              }}
            />
            <button
              onClick={() => setOpen(false)}
              style={{
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              <X size={14} />
            </button>
          </div>
          <div style={{ maxHeight: '240px', overflowY: 'auto', padding: '6px' }}>
            {suggestions.map((loc) => (
              <button
                key={loc.id}
                onClick={() => selectLocation(loc)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 10px',
                  background: 'transparent',
                  border: '1px solid transparent',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.12s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-hover)';
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = 'transparent';
                }}
              >
                <MapPin size={14} color="var(--info)" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{loc.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{loc.detail}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {selected && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            left: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-md)',
            fontSize: '12px',
            color: 'var(--text-secondary)',
            animation: 'geo-fade-in 0.15s ease-out',
            whiteSpace: 'nowrap',
          }}
        >
          <Navigation size={14} color="var(--accent-light)" />
          <span>
            Centered on <strong style={{ color: 'var(--text-primary)' }}>{selected.name}</strong>
          </span>
        </div>
      )}

      <style>{`
        @keyframes geo-fade-in {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
