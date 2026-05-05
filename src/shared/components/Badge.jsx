import React from 'react';

const CATEGORY_BADGE_STYLES = {
  conflict: { background: 'rgba(255, 71, 87, 0.15)', color: '#ff4757', border: '1px solid rgba(255, 71, 87, 0.3)' },
  protest: { background: 'rgba(255, 165, 2, 0.15)', color: '#ffa502', border: '1px solid rgba(255, 165, 2, 0.3)' },
  disaster: { background: 'rgba(165, 94, 234, 0.15)', color: '#a55eea', border: '1px solid rgba(165, 94, 234, 0.3)' },
  diplomacy: { background: 'rgba(30, 144, 255, 0.15)', color: '#1e90ff', border: '1px solid rgba(30, 144, 255, 0.3)' },
  humanitarian: { background: 'rgba(38, 222, 129, 0.15)', color: '#26de81', border: '1px solid rgba(38, 222, 129, 0.3)' },
  other: { background: 'rgba(119, 140, 163, 0.15)', color: '#778ca3', border: '1px solid rgba(119, 140, 163, 0.3)' },
};

const STATUS_BADGE_STYLES = {
  active: { background: 'rgba(46, 213, 115, 0.15)', color: '#2ed573', border: '1px solid rgba(46, 213, 115, 0.3)' },
  resolved: { background: 'rgba(119, 140, 163, 0.15)', color: '#778ca3', border: '1px solid rgba(119, 140, 163, 0.3)' },
  hidden: { background: 'rgba(255, 71, 87, 0.15)', color: '#ff4757', border: '1px solid rgba(255, 71, 87, 0.3)' },
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
        padding: '2px 10px',
        borderRadius: 'var(--radius-sm)',
        fontSize: 'var(--text-caption)',
        fontWeight: 500,
        letterSpacing: '0.3px',
        textTransform: 'uppercase',
        ...preset,
        ...style,
      }}
    >
      {children}
    </span>
  );
}
