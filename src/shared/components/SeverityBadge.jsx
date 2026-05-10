import React from 'react';
import { SEVERITY_SCALE } from '../constants.js';

export function SeverityBadge({ level, style = {} }) {
  const sev = SEVERITY_SCALE.find((s) => s.value === level) || SEVERITY_SCALE[2];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        borderRadius: '6px',
        background: `${sev.color}10`,
        border: `1px solid ${sev.color}30`,
        fontFamily: 'var(--font-sans)',
        lineHeight: 1,
        ...style,
      }}
    >
      <span
        style={{
          fontSize: '15px',
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
          height: '12px',
          background: `${sev.color}40`,
          borderRadius: '1px',
        }}
      />
      <span
        style={{
          fontSize: '10px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.8px',
          color: sev.color,
        }}
      >
        {sev.label}
      </span>
    </span>
  );
}
