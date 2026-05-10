import React from 'react';
import { Badge } from '@shared/components/Badge.jsx';
import { SeverityBadge } from '@shared/components/SeverityBadge.jsx';
import { CATEGORY_LABELS } from '@shared/constants.js';
import { format } from 'date-fns';

export default function EventListItem({ event, isSelected, onClick }) {
  const dateStr = event.start_date
    ? format(new Date(event.start_date), 'MMM d, yyyy')
    : 'Unknown date';

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
        <Badge category={event.category}>{CATEGORY_LABELS[event.category]}</Badge>
        <SeverityBadge level={event.severity} />
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
        {event.title}
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
        {event.description || 'No description available.'}
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
        <span>📍 {event.location_context || `${parseFloat(event.latitude).toFixed(2)}, ${parseFloat(event.longitude).toFixed(2)}`}</span>
        <span>·</span>
        <span>{dateStr}</span>
      </div>
    </div>
  );
}
