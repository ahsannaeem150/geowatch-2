import React, { useState, useMemo } from 'react';
import { Button } from '@shared/components/Button.jsx';

const ZONE_COLORS = [
  '#9f1239', '#dc2626', '#f59e0b', '#22c55e',
  '#3b82f6', '#a855f7', '#14b8a6', '#6b7280',
];

function calculatePolygonArea(coords) {
  if (coords.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < coords.length; i++) {
    const j = (i + 1) % coords.length;
    area += coords[i][0] * coords[j][1];
    area -= coords[j][0] * coords[i][1];
  }
  return Math.abs(area) / 2 * 111.32 * 111.32;
}

function formatArea(km2) {
  if (km2 < 1) return `~${(km2 * 100).toFixed(1)} ha`;
  if (km2 < 1000) return `~${km2.toFixed(1)} km²`;
  return `~${(km2 / 1000).toFixed(1)}k km²`;
}

export default function ZoneManagementPanel({
  zones = [],
  onSelectZone,
  onNewZone,
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredZones = useMemo(() => {
    if (!searchQuery.trim()) return zones;
    const q = searchQuery.trim().toLowerCase();
    return zones.filter((z) =>
      (z.name || '').toLowerCase().includes(q) ||
      (z.description || '').toLowerCase().includes(q) ||
      (z.category || '').toLowerCase().includes(q)
    );
  }, [zones, searchQuery]);

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    fontSize: '13px',
    fontFamily: 'var(--font-sans)',
    background: 'var(--bg-deep)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    outline: 'none',
    transition: 'border-color 0.2s ease',
  };

  return (
    <div className="panel-card" style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h2
          style={{
            fontSize: '16px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            margin: 0,
          }}
        >
          Zones
        </h2>
        <Button variant="primary" size="sm" onClick={onNewZone}>
          + New Zone
        </Button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: '16px' }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search zones..."
          style={inputStyle}
        />
      </div>

      {/* Zone count */}
      <div
        style={{
          fontSize: '12px',
          color: 'var(--text-muted)',
          marginBottom: '12px',
        }}
      >
        {filteredZones.length} zone{filteredZones.length !== 1 ? 's' : ''}
        {searchQuery.trim() && ` matching "${searchQuery.trim()}"`}
      </div>

      {/* Zone list */}
      <div style={{ flex: 1, overflowY: 'auto', margin: '0 -20px', padding: '0 20px' }}>
        {filteredZones.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: 'var(--text-muted)',
              fontSize: '13px',
            }}
          >
            {searchQuery.trim() ? 'No zones match your search.' : 'No zones yet. Click "+ New Zone" to create one.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredZones.map((zone) => {
              const color = zone.fill_color || '#9f1239';
              const areaKm2 = zone.geometry?.coordinates?.[0]
                ? calculatePolygonArea(zone.geometry.coordinates[0])
                : 0;
              const incidentCount = parseInt(zone.incident_count, 10) || 0;

              return (
                <button
                  key={zone.id}
                  onClick={() => onSelectZone?.(zone)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 14px',
                    background: 'var(--bg-deep)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent-light)';
                    e.currentTarget.style.background = 'var(--bg-elevated)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-subtle)';
                    e.currentTarget.style.background = 'var(--bg-deep)';
                  }}
                >
                  {/* Color swatch */}
                  <div
                    style={{
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      background: color,
                      flexShrink: 0,
                      border: '2px solid var(--bg-surface)',
                      boxShadow: `0 0 6px ${color}40`,
                    }}
                  />

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {zone.name}
                    </div>
                    <div
                      style={{
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                        marginTop: '2px',
                        display: 'flex',
                        gap: '10px',
                        alignItems: 'center',
                      }}
                    >
                      {zone.category && (
                        <span
                          style={{
                            textTransform: 'capitalize',
                            background: 'var(--bg-surface)',
                            padding: '1px 6px',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '10px',
                            fontWeight: 600,
                          }}
                        >
                          {zone.category}
                        </span>
                      )}
                      <span>{incidentCount} incident{incidentCount !== 1 ? 's' : ''}</span>
                      <span>·</span>
                      <span>{formatArea(areaKm2)}</span>
                    </div>
                  </div>

                  {/* Chevron */}
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px', flexShrink: 0 }}>›</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
