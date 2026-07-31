import React from 'react';
import { SEVERITY_SCALE } from '../constants.js';
import { useTheme } from '../useTheme.js';
import { getSeverityBadgeColors } from '../utils/themeColors.js';

export function SeverityBadge({ level, wide = false, size = 'md', style = {} }) {
  const { theme } = useTheme();
  const sev = SEVERITY_SCALE.find((s) => s.value === level) || SEVERITY_SCALE[2];
  const colors = getSeverityBadgeColors(sev.color, theme);
  const sm = size === 'sm' && !wide;

  return (
    <span
      style={{
        display: sm ? 'inline-flex' : 'flex',
        alignItems: 'center',
        gap: wide ? '10px' : sm ? '5px' : '6px',
        justifyContent: 'flex-start',
        padding: wide ? '8px 14px' : sm ? '2px 8px' : '4px 10px',
        borderRadius: '6px',
        background: colors.background,
        border: colors.border,
        fontFamily: 'var(--font-sans)',
        lineHeight: 1,
        width: wide ? '100%' : 'auto',
        maxWidth: '100%',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: wide ? '10px' : sm ? '5px' : '6px',
        }}
      >
        <span
          style={{
            fontSize: wide ? '18px' : sm ? '12px' : '15px',
            fontWeight: 700,
            color: colors.color,
            letterSpacing: '-0.5px',
            minWidth: sm ? '8px' : '10px',
            textAlign: 'center',
          }}
        >
          {sev.value}
        </span>
        <span
          style={{
            width: '1px',
            height: wide ? '16px' : sm ? '10px' : '12px',
            background: colors.divider,
            borderRadius: '1px',
          }}
        />
      </span>
      <span
        style={{
          fontSize: wide ? '12px' : sm ? '9px' : '10px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: wide ? '1.2px' : sm ? '0.6px' : '0.8px',
          color: colors.color,
          maxWidth: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {sev.label}
      </span>
    </span>
  );
}
