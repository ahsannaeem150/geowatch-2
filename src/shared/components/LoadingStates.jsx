import React from 'react';
import { Skeleton } from './Skeleton.jsx';

export function InlineLoading({ label = 'Loading…', style = {} }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        color: 'var(--text-muted)',
        fontSize: 12,
        fontFamily: 'var(--font-sans)',
        ...style,
      }}
    >
      <span className="im24-inline-spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function MapLoadingIndicator({ loading, hasData = false }) {
  if (!loading) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'absolute',
        top: 'calc(66px * var(--admin-ui-scale, 1))',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 35,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '7px 11px',
        borderRadius: 'var(--radius-pill)',
        border: '1px solid var(--border-default)',
        background: 'var(--bg-glass)',
        color: 'var(--text-secondary)',
        boxShadow: 'var(--shadow-sm)',
        backdropFilter: 'blur(12px)',
        fontSize: 11,
        fontFamily: 'var(--font-sans)',
        pointerEvents: 'none',
      }}
    >
      <span className="im24-inline-spinner" aria-hidden="true" />
      {hasData ? 'Updating incidents…' : 'Loading incidents…'}
    </div>
  );
}

export function ResultCardSkeleton({ rows = 6 }) {
  return (
    <div
      role="status"
      aria-label="Searching incidents"
      aria-busy="true"
      style={{ display: 'flex', flexDirection: 'column', gap: 'calc(6px * var(--admin-ui-scale, 1))' }}
    >
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          style={{
            position: 'relative',
            padding: 'calc(10px * var(--admin-ui-scale, 1))',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            background: 'var(--bg-input)',
            overflow: 'hidden',
          }}
        >
          <Skeleton height="12px" width={`${68 + (i % 3) * 9}%`} style={{ marginBottom: 10 }} />
          <Skeleton height="9px" width="42%" style={{ marginBottom: 12 }} />
          <div style={{ display: 'flex', gap: 6 }}>
            <Skeleton height="18px" width="64px" style={{ borderRadius: 'var(--radius-pill)' }} />
            <Skeleton height="18px" width="54px" style={{ borderRadius: 'var(--radius-pill)' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TableSkeletonRows({ rows = 7, columns = 6 }) {
  return Array.from({ length: rows }, (_, row) => (
    <tr key={row} aria-hidden={row === 0 ? undefined : true}>
      {Array.from({ length: columns }, (_, column) => (
        <td key={column} style={{ padding: '13px 14px', borderBottom: '1px solid var(--border-subtle)' }}>
          {column === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Skeleton width="20px" height="20px" style={{ borderRadius: '50%', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <Skeleton height="11px" width={`${62 + (row % 3) * 10}%`} style={{ marginBottom: 7 }} />
                <Skeleton height="9px" width="48%" />
              </div>
            </div>
          ) : (
            <Skeleton height="11px" width={`${52 + ((row + column) % 4) * 10}%`} />
          )}
        </td>
      ))}
    </tr>
  ));
}

export function ListSkeleton({ rows = 6 }) {
  return (
    <div role="status" aria-label="Loading items" aria-busy="true" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '16px 18px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            background: 'var(--bg-surface)',
          }}
        >
          <Skeleton width="34px" height="34px" style={{ borderRadius: 10, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <Skeleton height="13px" width={`${46 + (i % 4) * 10}%`} style={{ marginBottom: 9 }} />
            <Skeleton height="10px" width="72%" />
          </div>
          <Skeleton width="70px" height="24px" style={{ borderRadius: 'var(--radius-pill)' }} />
        </div>
      ))}
    </div>
  );
}

export function StatsSkeleton({ count = 4 }) {
  return (
    <div role="status" aria-label="Loading statistics" aria-busy="true" style={{ display: 'grid', gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))`, gap: 16 }}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="console-card" style={{ padding: 20 }}>
          <Skeleton height="11px" width="48%" style={{ marginBottom: 18 }} />
          <Skeleton height="30px" width="38%" />
        </div>
      ))}
    </div>
  );
}

export function ActivitySkeleton({ rows = 5 }) {
  return (
    <div role="status" aria-label="Loading activity" aria-busy="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <Skeleton width="68px" height="22px" style={{ borderRadius: 'var(--radius-pill)', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <Skeleton height="12px" width={`${54 + (i % 3) * 13}%`} style={{ marginBottom: 8 }} />
            <Skeleton height="9px" width="36%" />
          </div>
          <Skeleton height="9px" width="58px" />
        </div>
      ))}
    </div>
  );
}
