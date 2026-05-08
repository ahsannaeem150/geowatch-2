import React from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { Button } from '@shared/components/Button.jsx';
import { Badge } from '@shared/components/Badge.jsx';

export default function TopBar({ onAddEvent, selectedDate, onDateChange }) {
  const { user, logout } = useAuth();

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

        {/* Date Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '16px' }}>
          <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>Date:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => onDateChange?.(e.target.value)}
            style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 10px',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              outline: 'none',
              cursor: 'pointer',
            }}
          />
        </div>
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
