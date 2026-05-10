import React from 'react';
import { SEVERITY_SCALE } from '../constants.js';

export function SeverityBadge({ level, wide = false, style = {} }) {
  const sev = SEVERITY_SCALE.find((s) => s.value === level) || SEVERITY_SCALE[2];

  return (
    <span
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: wide ? '10px' : '6px',
        justifyContent: 'flex-start',
        padding: wide ? '8px 14px' : '4px 10px',
        borderRadius: '6px',
        background: `${sev.color}10`,
        border: `1px solid ${sev.color}30`,
        fontFamily: 'var(--font-sans)',
        lineHeight: 1,
        width: wide ? '100%' : 'auto',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: wide ? '10px' : '6px',
        }}
      >
        <span
          style={{
            fontSize: wide ? '18px' : '15px',
            fontWeight: 700,
            color: sev.color,
            letterSpacing: '-0.5px',
            minWidth: '10px',
            textAlign: 'center',
          }}
        >
          {sev.value}
        </span>
        <span
          style={{
            width: '1px',
            height: wide ? '16px' : '12px',
            background: `${sev.color}40`,
            borderRadius: '1px',
          }}
        />
      </span>
      <span
        style={{
          fontSize: wide ? '12px' : '10px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: wide ? '1.2px' : '0.8px',
          color: sev.color,
        }}
      >
        {sev.label}
      </span>
    </span>
  );
}
