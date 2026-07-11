import React from 'react';

/**
 * Floating banner shown when the selected incident/zone falls outside the
 * current date range. It is meant to be rendered as an absolute-positioned
 * child of the map viewport so `left: 50%` centers it on the visible map area.
 *
 * Props:
 * - ghostIncident: object (must have `title` and optionally `start_date`)
 * - actionButton: React node placed on the right (e.g. "Switch to this date" button)
 * - style: optional extra styles merged onto the root
 */
export default function GhostIncidentBanner({ ghostIncident, actionButton, style = {} }) {
  if (!ghostIncident) return null;

  const formattedDate = ghostIncident.start_date
    ? new Date(ghostIncident.start_date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'unknown date';

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 30,
        background: 'var(--bg-surface)',
        backdropFilter: 'blur(12px)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: '12px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        boxShadow: 'var(--shadow-md)',
        maxWidth: 'min(680px, calc(100% - 48px))',
        width: 'max-content',
        margin: '0 24px',
        flexWrap: 'wrap',
        ...style,
      }}
    >
      <div
        style={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          background: 'var(--text-muted)',
          opacity: 0.5,
          border: '2px dashed var(--text-muted)',
          flexShrink: 0,
        }}
      />
      <div style={{ minWidth: 0 }}>
        <p
          style={{
            fontSize: '12px',
            color: 'var(--text-secondary)',
            fontWeight: 500,
            margin: 0,
            lineHeight: 1.4,
          }}
        >
          <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
            {ghostIncident.title}
          </span>{' '}
          occurred on{' '}
          <span style={{ color: 'var(--accent-light)', fontWeight: 600 }}>
            {formattedDate}
          </span>
          {' — outside your current date range'}
        </p>
      </div>
      {actionButton && (
        <div style={{ flexShrink: 0, marginLeft: 'auto' }}>{actionButton}</div>
      )}
    </div>
  );
}
