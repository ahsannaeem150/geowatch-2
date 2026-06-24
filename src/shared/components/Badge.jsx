import React from 'react';
import { useTheme } from '../useTheme.js';
import { getBadgeColors } from '../utils/themeColors.js';

const STATUS_BADGE_STYLES = {
  active:   { background: 'rgba(34, 197, 94, 0.10)',  color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.30)' },
  resolved: { background: 'rgba(107, 114, 128, 0.10)', color: '#6b7280', border: '1px solid rgba(107, 114, 128, 0.30)' },
  hidden:   { background: 'rgba(220, 38, 38, 0.10)',  color: '#dc2626', border: '1px solid rgba(220, 38, 38, 0.30)' },
};

export function Badge({ children, color, status, style = {} }) {
  const { theme } = useTheme();

  let preset;
  if (color) {
    preset = getBadgeColors(color, theme);
  } else if (status) {
    preset = STATUS_BADGE_STYLES[status];
  } else {
    preset = { background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' };
  }

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
        maxWidth: '100%',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        ...preset,
        ...style,
      }}
    >
      {color && (
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
