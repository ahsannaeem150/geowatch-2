import React, { useCallback, useEffect } from 'react';
import { AlertTriangle, ArrowLeft, RotateCcw } from 'lucide-react';
import { registerRecoveryRetry, retryFailedRequests } from '../utils/recovery.js';

function useRecoveryRetry(onRetry, retryScope) {
  const coordinated = retryScope !== 'local';
  useEffect(() => {
    if (!onRetry || !coordinated) return undefined;
    return registerRecoveryRetry(onRetry);
  }, [onRetry, coordinated]);

  return useCallback(() => {
    if (coordinated) return retryFailedRequests(onRetry);
    return onRetry?.();
  }, [onRetry, coordinated]);
}

const actionBase = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 7,
  minHeight: 34,
  padding: '7px 13px',
  borderRadius: 'var(--radius-md)',
  fontSize: 12,
  fontWeight: 700,
  fontFamily: 'var(--font-sans)',
  cursor: 'pointer',
  transition: 'background 0.15s ease, border-color 0.15s ease, color 0.15s ease',
};

export function ErrorState({
  title = 'Something went wrong',
  message = 'The data could not be loaded. Check your connection and try again.',
  onRetry,
  onBack,
  retryLabel = 'Retry',
  backLabel = 'Back',
  variant = 'panel',
  retryScope = 'coordinated',
  style = {},
}) {
  const inline = variant === 'inline' || variant === 'compact';
  const handleRetry = useRecoveryRetry(onRetry, retryScope);
  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        display: 'flex',
        flexDirection: inline ? 'row' : 'column',
        alignItems: inline ? 'flex-start' : 'center',
        justifyContent: 'center',
        gap: inline ? 10 : 9,
        width: 'auto',
        boxSizing: 'border-box',
        padding: variant === 'page' ? '42px 28px' : inline ? '12px 14px' : '28px 22px',
        minHeight: variant === 'page' ? 320 : 0,
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        color: 'var(--text-secondary)',
        textAlign: inline ? 'left' : 'center',
        ...style,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: inline ? 30 : 42,
          height: inline ? 30 : 42,
          flexShrink: 0,
          borderRadius: inline ? 'var(--radius-md)' : 'var(--radius-lg)',
          background: 'var(--alert-error-bg)',
          border: '1px solid var(--alert-error-border)',
          color: 'var(--danger)',
        }}
      >
        <AlertTriangle size={inline ? 15 : 20} strokeWidth={1.8} />
      </div>
      <div style={{ flex: inline ? 1 : '0 0 auto', minWidth: 0 }}>
        <div style={{ color: 'var(--text-primary)', fontSize: inline ? 12 : 15, fontWeight: 750, lineHeight: 1.4 }}>
          {title}
        </div>
        <div style={{ marginTop: 4, color: 'var(--text-secondary)', fontSize: inline ? 11 : 12, lineHeight: 1.55, maxWidth: 460 }}>
          {message}
        </div>
        {(onRetry || onBack) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: inline ? 'flex-start' : 'center', gap: 8, marginTop: inline ? 10 : 16 }}>
            {onRetry && (
              <button type="button" onClick={handleRetry} style={{ ...actionBase, background: 'var(--accent)', border: '1px solid var(--accent)', color: 'var(--text-on-accent)' }}>
                <RotateCcw size={13} aria-hidden="true" />
                {retryLabel}
              </button>
            )}
            {onBack && (
              <button type="button" onClick={onBack} style={{ ...actionBase, background: 'var(--bg-input)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>
                <ArrowLeft size={13} aria-hidden="true" />
                {backLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function ErrorBanner({ message, onRetry, retryLabel = 'Retry', retryScope = 'coordinated', style = {} }) {
  const handleRetry = useRecoveryRetry(onRetry, retryScope);
  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        padding: '9px 11px',
        background: 'var(--alert-error-bg)',
        border: '1px solid var(--alert-error-border)',
        borderRadius: 'var(--radius-md)',
        color: 'var(--text-secondary)',
        fontSize: 11,
        lineHeight: 1.45,
        ...style,
      }}
    >
      <AlertTriangle size={14} color="var(--danger)" aria-hidden="true" style={{ flexShrink: 0 }} />
      <span style={{ flex: 1, minWidth: 0 }}>{message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={handleRetry}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            flexShrink: 0,
            padding: '4px 8px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-primary)',
            fontSize: 10,
            fontWeight: 700,
            fontFamily: 'var(--font-sans)',
            cursor: 'pointer',
          }}
        >
          <RotateCcw size={11} aria-hidden="true" />
          {retryLabel}
        </button>
      )}
    </div>
  );
}
