import React from 'react';
import { Badge } from '@shared/components/Badge.jsx';
import { SeverityBadge } from '@shared/components/SeverityBadge.jsx';
import { VERIFICATION_CONFIG } from '@shared/constants.js';
import SaveButton from '../SaveButton/SaveButton.jsx';
import { Hexagon } from 'lucide-react';

import { format } from 'date-fns';

function calculatePolygonArea(coords) {
  if (!coords || coords.length < 3) return 0;
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

export default function IncidentListItem({ incident, isSelected, onClick, isSaved, onSaveChange }) {
  const dateStr = incident.start_date
    ? format(new Date(incident.start_date), 'MMM d, yyyy')
    : 'Unknown date';

  const isPolygon = incident.geometry_type === 'polygon';
  const ring = incident.geometry?.coordinates?.[0] || [];
  const vertexCount = Math.max(0, ring.length - 1);
  const areaKm2 = calculatePolygonArea(ring);

  return (
    <div
      onClick={onClick}
      style={{
        padding: '14px 16px',
        background: isSelected ? 'var(--bg-elevated)' : 'transparent',
        borderLeft: isSelected ? '3px solid var(--accent-light)' : '3px solid transparent',
        borderBottom: '1px solid var(--border-subtle)',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
      onMouseEnter={(e) => {
        if (!isSelected) e.currentTarget.style.background = 'var(--bg-hover)';
      }}
      onMouseLeave={(e) => {
        if (!isSelected) e.currentTarget.style.background = 'transparent';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
        {isPolygon && incident.zone_category_name ? (
          <Badge color={incident.zone_category_color || '#6366f1'}>
            <Hexagon size={10} /> {incident.zone_category_name}
          </Badge>
        ) : (
          <Badge color={incident.domain_color}>{incident.category_name}</Badge>
        )}
        <SeverityBadge level={incident.severity} />
        {incident.verification_status && (
          <VerificationBadge status={incident.verification_status} />
        )}
        <div style={{ marginLeft: 'auto' }}>
          <SaveButton incidentId={incident.id} initialSaved={isSaved} onChange={onSaveChange} />
        </div>
      </div>

      <h4
        style={{
          fontSize: '14px',
          fontWeight: 600,
          color: 'var(--text-primary)',
          margin: '0 0 6px',
          lineHeight: 1.4,
        }}
      >
        {incident.title}
      </h4>

      <p
        style={{
          fontSize: '12px',
          color: 'var(--text-secondary)',
          margin: '0 0 8px',
          lineHeight: 1.5,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {incident.description || 'No description available.'}
      </p>

      <div
        style={{
          fontSize: '11px',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <span>
          {isPolygon
            ? `⬡ ${formatArea(areaKm2)} · ${vertexCount} vertices`
            : `📍 ${incident.location_context || `${parseFloat(incident.latitude).toFixed(2)}, ${parseFloat(incident.longitude).toFixed(2)}`}`}
        </span>
        <span>·</span>
        <span>{dateStr}</span>
      </div>
    </div>
  );
}

function VerificationBadge({ status }) {
  const cfg = VERIFICATION_CONFIG[status] || VERIFICATION_CONFIG.unverified;
  return (
    <span
      style={{
        fontSize: '10px',
        fontWeight: 700,
        color: cfg.color,
        background: `${cfg.color}15`,
        padding: '2px 8px',
        borderRadius: 'var(--radius-pill)',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
      }}
    >
      {cfg.icon} {cfg.label}
    </span>
  );
}
