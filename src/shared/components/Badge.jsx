import React from 'react';
import { useTheme } from '../useTheme.js';
import { getBadgeColors } from '../utils/themeColors.js';

const STATUS_COLORS = {
  active: '#22c55e',
  resolved: '#6b7280',
  hidden: '#dc2626',
};

export function Badge({ children, color, status, style = {} }) {
  const { theme } = useTheme();

  let preset;
  if (color) {
    preset = getBadgeColors(color, theme);
  } else if (status) {
    preset = getBadgeColors(STATUS_COLORS[status], theme);
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
