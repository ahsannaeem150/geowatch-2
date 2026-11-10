import React from 'react';

export function Skeleton({ width = '100%', height = '16px', style = {} }) {
  return (
    <div
      aria-hidden="true"
      className="im24-skeleton"
      style={{
        width,
        height,
        borderRadius: 'var(--radius-sm)',
        ...style,
      }}
    />
  );
}

export function SkeletonBlock({ lines = 3, gap = '8px', style = {} }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap, ...style }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} height={i === 0 ? '20px' : '14px'} width={i === lines - 1 ? '60%' : '100%'} />
      ))}
    </div>
  );
}
