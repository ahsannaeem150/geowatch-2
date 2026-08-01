import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { RotateCcw } from 'lucide-react';

/**
 * TopBarModePill — the single stateful center pill of the workspace top bar.
 *
 * LIVE state (range is exactly today): red pulsing dot + ticking clock
 * embedded in the pill (`LIVE · FRI 31 JUL · 14:32:05`; slim `● LIVE 14:32:05`).
 *
 * HISTORIC state (any non-live range): amber static dot + amber pill with a
 * compact range label, plus a "Back to LIVE" return button at the right end —
 * the pill body is clickable too, and `T` (outside inputs) returns to live.
 */

function parseISODate(v) {
  return new Date(`${v}T00:00:00`);
}

function historicLabel(dateRange) {
  if (!dateRange?.from || !dateRange?.to) return 'ALL TIME';
  const from = parseISODate(dateRange.from);
  const to = parseISODate(dateRange.to);
  if (dateRange.from === dateRange.to) return format(from, 'd MMM yyyy').toUpperCase();
  const sameYear = from.getFullYear() === to.getFullYear();
  const sameMonth = sameYear && from.getMonth() === to.getMonth();
  if (sameMonth) {
    return `${format(from, 'MMM d').toUpperCase()}–${format(to, 'd')} ${format(to, 'yyyy')}`;
  }
  if (sameYear) {
    return `${format(from, 'MMM d').toUpperCase()} – ${format(to, 'MMM d').toUpperCase()} ${format(to, 'yyyy')}`;
  }
  return `${format(from, 'd MMM yyyy').toUpperCase()} – ${format(to, 'd MMM yyyy').toUpperCase()}`;
}

function historicShortLabel(dateRange) {
  if (!dateRange?.from || !dateRange?.to) return 'ALL';
  const from = parseISODate(dateRange.from);
  const to = parseISODate(dateRange.to);
  if (dateRange.from === dateRange.to) return format(from, 'd MMM').toUpperCase();
  const sameMonth = from.getFullYear() === to.getFullYear() && from.getMonth() === to.getMonth();
  if (sameMonth) return `${format(from, 'MMM').toUpperCase()} ${format(from, 'd')}–${format(to, 'd')}`;
  return `${format(from, 'd MMM').toUpperCase()}–${format(to, 'd MMM').toUpperCase()}`;
}

export default function TopBarModePill({ slim = false, isLiveMode = true, dateRange, onResetToToday }) {
  const [now, setNow] = useState(() => new Date());

  // Ticking clock (lives inside the live pill)
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // `T` anywhere outside text inputs → back to live
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 't' && e.key !== 'T') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target;
      const tag = el?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el?.isContentEditable) return;
      onResetToToday?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onResetToToday]);

  const base = {
    display: 'flex',
    alignItems: 'center',
    gap: 'calc(7px * var(--admin-ui-scale))',
    padding: 'calc(5px * var(--admin-ui-scale)) calc(9px * var(--admin-ui-scale))',
    borderRadius: 'var(--radius-sm)',
    fontFamily: 'var(--font-mono)',
    fontSize: 'calc(11px * var(--admin-ui-scale))',
    fontVariantNumeric: 'tabular-nums',
    fontWeight: 700,
    letterSpacing: '0.8px',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    transition: 'all 0.2s ease',
  };

  const dot = {
    width: 'calc(6px * var(--admin-ui-scale))',
    height: 'calc(6px * var(--admin-ui-scale))',
    borderRadius: '50%',
    flexShrink: 0,
  };

  if (isLiveMode) {
    const time = format(now, 'HH:mm:ss');
    return (
      <div
        className="tbm tbm-live"
        style={{
          ...base,
          background: 'var(--alert-error-bg)',
          border: '1px solid var(--alert-error-border)',
          color: 'var(--badge-red-text)',
        }}
        title="Live mode — showing today"
      >
        <span
          style={{
            ...dot,
            background: 'currentColor',
            boxShadow: '0 0 10px currentColor',
            animation: 'pulse 2s ease-in-out infinite',
          }}
        />
        <span>
          {slim
            ? `LIVE ${time}`
            : `LIVE · ${format(now, 'EEE d MMM').toUpperCase()} · ${time}`}
        </span>
      </div>
    );
  }

  return (
    <div
      className="tbm tbm-historic"
      style={{
        ...base,
        background: 'var(--alert-warning-bg)',
        border: '1px solid var(--alert-warning-border)',
        color: 'var(--warning)',
      }}
    >
      <span style={{ ...dot, background: 'var(--warning)' }} />
      <span
        role="button"
        tabIndex={0}
        title="Return to live mode (T)"
        onClick={() => onResetToToday?.()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onResetToToday?.();
          }
        }}
        style={{ cursor: 'pointer' }}
      >
        {slim ? `HIST ${historicShortLabel(dateRange)}` : `HISTORIC · ${historicLabel(dateRange)}`}
      </span>
      <button
        type="button"
        onClick={() => onResetToToday?.()}
        title="Return to live mode (T)"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'calc(4px * var(--admin-ui-scale))',
          marginLeft: 'calc(2px * var(--admin-ui-scale))',
          paddingLeft: 'calc(8px * var(--admin-ui-scale))',
          background: 'transparent',
          border: 'none',
          borderLeft: '1px solid var(--alert-warning-border)',
          color: 'inherit',
          fontFamily: 'var(--font-sans)',
          fontSize: 'calc(9px * var(--admin-ui-scale))',
          fontWeight: 800,
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        <RotateCcw size={9} />
        {!slim && 'LIVE'}
      </button>
    </div>
  );
}
