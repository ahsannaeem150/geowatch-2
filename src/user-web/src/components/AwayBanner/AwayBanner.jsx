import React from 'react';

export default function AwayBanner({ newEventsCount, updatedEventsCount, onJumpToNew, onDismiss }) {
  const total = newEventsCount + updatedEventsCount;
  if (total === 0) return null;

  const parts = [];
  if (newEventsCount > 0) parts.push(`${newEventsCount} new incident${newEventsCount !== 1 ? 's' : ''}`);
  if (updatedEventsCount > 0) parts.push(`${updatedEventsCount} updated incident${updatedEventsCount !== 1 ? 's' : ''}`);

  return (
    <div
      style={{
        position: 'absolute',
        top: '72px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 50,
        background: 'var(--bg-surface)',
        border: '1px solid var(--accent-light)',
        borderRadius: 'var(--radius-lg)',
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        boxShadow: 'var(--shadow-lg), 0 0 20px var(--accent-glow)',
        animation: 'slideDown 0.3s ease-out',
      }}
    >
      <div
        style={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          background: 'var(--danger-light)',
          boxShadow: '0 0 10px var(--accent-glow-strong)',
          animation: 'pulse 2s ease-in-out infinite',
          flexShrink: 0,
        }}
      />

      <div>
        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
          While you were away
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
          {parts.join(' · ')}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={onJumpToNew}
          style={{
            padding: '6px 14px',
            fontSize: '12px',
            fontWeight: 700,
            background: 'var(--accent)',
            color: 'var(--text-on-accent)',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--accent-light)';
            e.currentTarget.style.boxShadow = '0 4px 16px var(--accent-glow-strong)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--accent)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          Jump to new
        </button>

        <button
          onClick={onDismiss}
          style={{
            fontSize: '16px',
            color: 'var(--text-muted)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            lineHeight: 1,
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
