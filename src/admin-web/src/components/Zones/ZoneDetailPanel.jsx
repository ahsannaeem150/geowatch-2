import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@shared/components/Button.jsx';
import { api } from '../../services/api.js';

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

const SEVERITY_LABELS = {
  1: 'Minimal',
  2: 'Low',
  3: 'Moderate',
  4: 'High',
  5: 'Severe',
};

const SEVERITY_COLORS = {
  1: '#22c55e',
  2: '#84cc16',
  3: '#f59e0b',
  4: '#f97316',
  5: '#ef4444',
};

export default function ZoneDetailPanel({
  zone,
  onBack,
  onEdit,
  onDelete,
  onSelectIncident,
  onColorChange,
}) {
  const [incidents, setIncidents] = useState([]);
  const [loadingIncidents, setLoadingIncidents] = useState(false);
  const [colorUpdating, setColorUpdating] = useState(false);

  const color = zone?.fill_color || '#9f1239';
  const areaKm2 = zone?.geometry?.coordinates?.[0]
    ? calculatePolygonArea(zone.geometry.coordinates[0])
    : 0;

  useEffect(() => {
    if (!zone?.id) return;
    setLoadingIncidents(true);
    api.getZoneIncidents(zone.id)
      .then((res) => {
        setIncidents(res.data?.incidents || []);
      })
      .catch(() => {
        setIncidents([]);
      })
      .finally(() => {
        setLoadingIncidents(false);
      });
  }, [zone?.id]);

  const handleColorClick = useCallback(async (newColor) => {
    if (!zone?.id || colorUpdating) return;
    setColorUpdating(true);
    try {
      await api.updateZone(zone.id, {
        fillColor: newColor,
        strokeColor: newColor,
      });
      onColorChange?.(newColor);
    } catch (err) {
      console.error('Failed to update zone color:', err);
    } finally {
      setColorUpdating(false);
    }
  }, [zone?.id, colorUpdating, onColorChange]);

  const handleDelete = () => {
    if (
      window.confirm(
        `Are you sure you want to delete "${zone?.name}"? This action cannot be undone.`
      )
    ) {
      onDelete?.();
    }
  };

  return (
    <div className="panel-card" style={{ padding: '20px' }}>
      {/* Back button */}
      <button
        onClick={onBack}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--accent-light)',
          fontSize: '12px',
          fontWeight: 600,
          cursor: 'pointer',
          padding: '0 0 12px 0',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        ‹ Back to Zones
      </button>

      {/* Zone name */}
      <h2
        style={{
          fontSize: '18px',
          fontWeight: 700,
          color: 'var(--text-primary)',
          margin: '0 0 12px 0',
        }}
      >
        {zone?.name}
      </h2>

      {/* Color bar */}
      <div
        style={{
          height: '4px',
          width: '100%',
          background: color,
          borderRadius: '2px',
          marginBottom: '16px',
          boxShadow: `0 0 8px ${color}40`,
        }}
      />

      {/* Metadata grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        <MetaCard
          label="Incidents"
          value={`${incidents.length} inside`}
          icon="📍"
        />
        <MetaCard
          label="Area"
          value={formatArea(areaKm2)}
          icon="📐"
        />
        {zone?.category && (
          <MetaCard
            label="Category"
            value={zone.category}
            icon="🏷️"
          />
        )}
        {zone?.description && (
          <MetaCard
            label="Description"
            value={zone.description.length > 40 ? zone.description.slice(0, 40) + '…' : zone.description}
            icon="📝"
          />
        )}
      </div>

      {/* Color customization */}
      <div style={{ marginBottom: '16px' }}>
        <label
          style={{
            display: 'block',
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '8px',
          }}
        >
          Zone Color
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {ZONE_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => handleColorClick(c)}
              disabled={colorUpdating}
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: c,
                border: c === color ? '3px solid var(--text-primary)' : '2px solid transparent',
                cursor: colorUpdating ? 'not-allowed' : 'pointer',
                opacity: colorUpdating ? 0.5 : 1,
                boxShadow: c === color ? `0 0 8px ${c}` : 'none',
                transition: 'all 0.15s ease',
              }}
              title={c}
            />
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <Button variant="primary" size="sm" onClick={onEdit}>
          Edit Zone
        </Button>
        <Button variant="ghost" size="sm" onClick={handleDelete}>
          <span style={{ color: 'var(--danger, #ef4444)' }}>Delete Zone</span>
        </Button>
      </div>

      {/* Divider */}
      <div
        style={{
          height: '1px',
          background: 'var(--border-subtle)',
          marginBottom: '16px',
        }}
      />

      {/* Incidents list */}
      <h3
        style={{
          fontSize: '14px',
          fontWeight: 700,
          color: 'var(--text-primary)',
          margin: '0 0 12px 0',
        }}
      >
        Incidents in this zone
      </h3>

      {loadingIncidents ? (
        <div style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '20px 0' }}>
          Loading incidents...
        </div>
      ) : incidents.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '20px 0' }}>
          No incidents inside this zone.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {incidents.map((incident) => {
            const sevLabel = SEVERITY_LABELS[incident.severity] || 'Unknown';
            const sevColor = SEVERITY_COLORS[incident.severity] || '#6b7280';
            const dateStr = incident.start_date
              ? new Date(incident.start_date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : '';

            return (
              <button
                key={incident.id}
                onClick={() => onSelectIncident?.(incident)}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '10px 12px',
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
                {/* Severity dot */}
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: sevColor,
                    marginTop: '5px',
                    flexShrink: 0,
                  }}
                />

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
                    {incident.title}
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      marginTop: '3px',
                      display: 'flex',
                      gap: '8px',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span style={{ color: sevColor, fontWeight: 600 }}>{sevLabel}</span>
                    {incident.domain_name && (
                      <span style={{ color: incident.domain_color || 'var(--text-muted)' }}>
                        {incident.domain_name}
                      </span>
                    )}
                    {dateStr && <span>{dateStr}</span>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MetaCard({ label, value, icon }) {
  return (
    <div
      style={{
        padding: '10px 12px',
        background: 'var(--bg-deep)',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, marginBottom: '4px' }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
        {value}
      </div>
    </div>
  );
}
