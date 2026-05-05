import React from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { Button } from '@shared/components/Button.jsx';
import { Badge } from '@shared/components/Badge.jsx';

export default function TopBar({ onAddEvent }) {
  const { user, logout } = useAuth();

  return (
    <header
      style={{
        height: '56px',
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <h1
          style={{
            fontSize: '18px',
            fontWeight: 700,
            color: 'var(--accent-cyan)',
            letterSpacing: '-0.3px',
          }}
        >
          GeoWatch
        </h1>
        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>/</span>
        <span style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 500 }}>
          Admin Dashboard
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Badge category={user?.role === 'super_admin' ? 'diplomacy' : 'protest'}>
          {user?.role === 'super_admin' ? 'Super Admin' : 'Admin'}
        </Badge>
        <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
          {user?.full_name || user?.email}
        </span>
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
