import React from 'react';

const CATEGORY_BADGE_STYLES = {
  conflict:     { background: 'rgba(239, 68, 68, 0.10)',  color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.30)' },
  protest:      { background: 'rgba(245, 158, 11, 0.10)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.30)' },
  disaster:     { background: 'rgba(168, 85, 247, 0.10)', color: '#a855f7', border: '1px solid rgba(168, 85, 247, 0.30)' },
  diplomacy:    { background: 'rgba(59, 130, 246, 0.10)',  color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.30)' },
  humanitarian: { background: 'rgba(20, 184, 166, 0.10)', color: '#14b8a6', border: '1px solid rgba(20, 184, 166, 0.30)' },
  other:        { background: 'rgba(107, 114, 128, 0.10)', color: '#6b7280', border: '1px solid rgba(107, 114, 128, 0.30)' },
};

const STATUS_BADGE_STYLES = {
  active:   { background: 'rgba(34, 197, 94, 0.10)',  color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.30)' },
  resolved: { background: 'rgba(107, 114, 128, 0.10)', color: '#6b7280', border: '1px solid rgba(107, 114, 128, 0.30)' },
  hidden:   { background: 'rgba(220, 38, 38, 0.10)',  color: '#dc2626', border: '1px solid rgba(220, 38, 38, 0.30)' },
};

export function Badge({ children, category, status, style = {} }) {
  const preset = category
    ? CATEGORY_BADGE_STYLES[category]
    : status
    ? STATUS_BADGE_STYLES[status]
    : { background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '3px 10px',
        borderRadius: 'var(--radius-pill)',
        fontSize: '11px',
        fontWeight: 700,
        letterSpacing: '0.6px',
        textTransform: 'uppercase',
        fontFamily: 'var(--font-sans)',
        ...preset,
        ...style,
      }}
    >
      {category && (
        <span
          style={{
            width: '5px',
            height: '5px',
            borderRadius: '50%',
            background: preset.color,
            flexShrink: 0,
          }}
        />
      )}
      {children}
    </span>
  );
}
