import React from 'react';
import DatePicker from '../DatePicker/DatePicker.jsx';

export default function MapControls({ dateRange, onDateRangeChange, onResetToToday, verifiedOnly, onVerifiedOnlyChange }) {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const isLive = dateRange.from === today && dateRange.to === today;

  const handleFromSelect = (date) => {
    let newTo = dateRange.to;
    if (date < today && dateRange.to === today) {
      newTo = date;
    } else if (date > dateRange.to) {
      newTo = date;
    }
    onDateRangeChange?.({ from: date, to: newTo });
  };

  const handleToSelect = (date) => {
    let newFrom = dateRange.from;
    if (date < dateRange.from) {
      newFrom = date;
    }
    onDateRangeChange?.({ from: newFrom, to: date });
  };

  const inputStyle = {
    background: 'var(--bg-input)',
    border: isLive ? '1px solid var(--border-subtle)' : '1px solid var(--alert-warning-border)',
    borderRadius: 'var(--radius-sm)',
    padding: '5px 8px',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-mono)',
    fontSize: '12px',
    outline: 'none',
    cursor: 'pointer',
    width: '120px',
    transition: 'border-color 0.2s ease',
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 16px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      {/* Mode indicator */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '5px 14px',
          borderRadius: 'var(--radius-sm)',
          background: isLive ? 'var(--alert-error-bg)' : 'var(--alert-warning-bg)',
          border: `1px solid ${isLive ? 'var(--alert-error-border)' : 'var(--alert-warning-border)'}`,
        }}
      >
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: isLive ? 'var(--danger-light)' : 'var(--warning)',
            boxShadow: isLive ? '0 0 10px var(--accent-glow-strong)' : 'none',
            animation: isLive ? 'pulse 2s ease-in-out infinite' : 'none',
          }}
        />
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '1px',
            color: isLive ? 'var(--danger-light)' : 'var(--warning)',
          }}
        >
          {isLive ? 'LIVE MODE' : 'HISTORIC MODE'}
        </span>
      </div>

      {/* Divider */}
      <div style={{ width: '1px', height: '24px', background: 'var(--border-subtle)' }} />

      {/* Date range */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>From</label>
        <DatePicker value={dateRange.from} onSelect={handleFromSelect} placeholder="From" style={inputStyle} />
        <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 600 }}>→</span>
        <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>To</label>
        <DatePicker value={dateRange.to} onSelect={handleToSelect} placeholder="To" style={inputStyle} />
      </div>

      {/* Today button */}
      <button
        onClick={onResetToToday}
        disabled={isLive}
        style={{
          padding: '5px 12px',
          fontSize: '11px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)',
          background: isLive ? 'var(--bg-deep)' : 'var(--bg-input)',
          color: isLive ? 'var(--text-muted)' : 'var(--accent-light)',
          cursor: isLive ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
        }}
      >
        Today
      </button>

      {/* Divider */}
      <div style={{ width: '1px', height: '24px', background: 'var(--border-subtle)' }} />

      {/* Verified only toggle */}
      <button
        onClick={() => onVerifiedOnlyChange?.(!verifiedOnly)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '5px 12px',
          fontSize: '11px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          borderRadius: 'var(--radius-sm)',
          border: `1px solid ${verifiedOnly ? '#22c55e' : 'var(--border-subtle)'}`,
          background: verifiedOnly ? 'var(--alert-success-bg)' : 'var(--bg-input)',
          color: verifiedOnly ? '#22c55e' : 'var(--text-muted)',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
      >
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: verifiedOnly ? '#22c55e' : 'var(--text-muted)',
            opacity: verifiedOnly ? 1 : 0.4,
          }}
        />
        Verified Only
      </button>
    </div>
  );
}
