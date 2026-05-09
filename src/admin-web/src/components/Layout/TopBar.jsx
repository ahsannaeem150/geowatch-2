import React from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { Button } from '@shared/components/Button.jsx';
import { Badge } from '@shared/components/Badge.jsx';

export default function TopBar({ onAddEvent, dateRange, onDateRangeChange, onResetToToday }) {
  const { user, logout } = useAuth();
  const today = new Date().toISOString().slice(0, 10);
  const isLive = dateRange.from === today && dateRange.to === today;

  const inputStyle = {
    background: 'var(--bg-input)',
    border: isLive ? '1px solid var(--border-subtle)' : '1px solid rgba(255, 170, 50, 0.4)',
    borderRadius: 'var(--radius-sm)',
    padding: '5px 8px',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-mono)',
    fontSize: '12px',
    outline: 'none',
    cursor: 'pointer',
    width: '146px',
    transition: 'border-color 0.2s ease',
  };

  return (
    <header
      style={{
        height: '60px',
        background: 'rgba(15, 17, 23, 0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        flexShrink: 0,
        zIndex: 100,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '2px',
              background: 'var(--accent-cyan)',
              boxShadow: '0 0 8px rgba(0, 212, 255, 0.5)',
            }}
          />
          <h1
            style={{
              fontSize: '20px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '-0.5px',
            }}
          >
            GeoWatch
          </h1>
        </div>
        <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Admin</span>

        {/* Date Range Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '12px' }}>
          <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>From</label>
          <input
            type="date"
            value={dateRange.from}
            onChange={(e) => onDateRangeChange?.({ ...dateRange, from: e.target.value })}
            style={inputStyle}
          />
          <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 600 }}>→</span>
          <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>To</label>
          <input
            type="date"
            value={dateRange.to}
            onChange={(e) => onDateRangeChange?.({ ...dateRange, to: e.target.value })}
            style={inputStyle}
          />

          {/* Today button */}
          <button
            onClick={onResetToToday}
            disabled={isLive}
            style={{
              marginLeft: '4px',
              padding: '5px 12px',
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
              background: isLive ? 'var(--bg-deep)' : 'var(--bg-input)',
              color: isLive ? 'var(--text-muted)' : 'var(--accent-cyan)',
              cursor: isLive ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            Today
          </button>
        </div>
      </div>

      {/* Center: Mode Indicator Pill */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 18px',
          borderRadius: 'var(--radius-sm)',
          background: isLive ? 'rgba(0, 212, 255, 0.1)' : 'rgba(255, 170, 50, 0.1)',
          border: `1px solid ${isLive ? 'rgba(0, 212, 255, 0.35)' : 'rgba(255, 170, 50, 0.35)'}`,
        }}
      >
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: isLive ? 'var(--accent-cyan)' : '#ffaa32',
            boxShadow: isLive ? '0 0 10px rgba(0, 212, 255, 0.6)' : 'none',
            animation: isLive ? 'pulse 2s ease-in-out infinite' : 'none',
          }}
        />
        <span
          style={{
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '1px',
            color: isLive ? 'var(--accent-cyan)' : '#ffaa32',
          }}
        >
          {isLive ? 'LIVE MODE' : 'HISTORIC MODE'}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 12px',
            background: 'var(--bg-input)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: user?.role === 'super_admin' ? 'var(--accent-cyan)' : 'var(--warning)',
            }}
          />
          <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            {user?.full_name || user?.email}
          </span>
          <Badge category={user?.role === 'super_admin' ? 'diplomacy' : 'protest'}>
            {user?.role === 'super_admin' ? 'Super Admin' : 'Admin'}
          </Badge>
        </div>

        <Button variant="primary" size="sm" onClick={onAddEvent}>
          + Add Event
        </Button>
        <Button variant="ghost" size="sm" onClick={logout}>
          Logout
        </Button>
      </div>
    </header>
  );
}
