import React from 'react';
import { AlertTriangle, ArrowLeft, RotateCcw } from 'lucide-react';
import { Skeleton, SkeletonBlock } from '@shared/components/Skeleton.jsx';

/**
 * Loading/error states for the superadmin-web full detail pages
 * (/superadmin/incident/:id, /superadmin/zone/:id). Loading mirrors the
 * page's hero + body shape; error mirrors the tui-state card pattern.
 */

export function DetailLoadingSkeleton() {
  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '48px 24px', width: '100%' }}>
      {/* Badge row */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
        <Skeleton width="72px" height="22px" style={{ borderRadius: 'var(--radius-pill)' }} />
        <Skeleton width="96px" height="22px" style={{ borderRadius: 'var(--radius-pill)' }} />
        <Skeleton width="60px" height="22px" style={{ borderRadius: 'var(--radius-pill)' }} />
      </div>

      {/* Hero title + location line */}
      <Skeleton height="34px" width="72%" style={{ marginBottom: '12px' }} />
      <Skeleton height="15px" width="44%" style={{ marginBottom: '26px' }} />

      {/* Meta rows */}
      {['82%', '64%', '74%'].map((w, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <Skeleton width="16px" height="16px" style={{ borderRadius: '50%', flexShrink: 0 }} />
          <Skeleton height="13px" width={w} />
        </div>
      ))}

      {/* Media strip */}
      <div style={{ display: 'flex', gap: '10px', margin: '24px 0' }}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} height="96px" style={{ flex: 1 }} />
        ))}
      </div>

      {/* Body lines */}
      <SkeletonBlock lines={4} gap="10px" />
    </div>
  );
}

const stateBtn = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '7px 14px',
  fontSize: '12px',
  fontWeight: 700,
  fontFamily: 'var(--font-sans)',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border-subtle)',
  background: 'var(--bg-input)',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
};

export function DetailErrorState({ title, message, onRetry, onBack }) {
  return (
    <div style={{ maxWidth: '460px', margin: '64px auto', padding: '0 24px' }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '8px',
          padding: '36px 28px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        <AlertTriangle size={26} style={{ color: 'var(--danger)' }} />
        <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>{title}</p>
        <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          {onRetry && (
            <button
              type="button"
              style={stateBtn}
              onClick={onRetry}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent-light)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              <RotateCcw size={12} />
              Retry
            </button>
          )}
          {onBack && (
            <button
              type="button"
              style={stateBtn}
              onClick={onBack}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent-light)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              <ArrowLeft size={12} />
              Back
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
