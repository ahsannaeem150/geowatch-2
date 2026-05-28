import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Tags,
  Activity,
  Download,
  ChevronLeft,
  ChevronRight,
  Shield,
} from 'lucide-react';

const NAV_ITEMS = [
  { path: '/superadmin', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/superadmin/users', label: 'Users', icon: Users },
  { path: '/superadmin/audit', label: 'Audit Log', icon: ClipboardList },
  { path: '/superadmin/domains', label: 'Domains', icon: Tags },
  { path: '/superadmin/system', label: 'System', icon: Activity },
  { path: '/superadmin/export', label: 'Export', icon: Download },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const width = collapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)';

  return (
    <aside
      style={{
        width,
        minWidth: width,
        height: '100vh',
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        left: 0,
        top: 0,
        zIndex: 100,
        transition: 'width var(--transition-base), min-width var(--transition-base)',
      }}
    >
      {/* Logo */}
      <div
        style={{
          height: 'var(--topbar-height)',
          display: 'flex',
          alignItems: 'center',
          padding: collapsed ? '0 16px' : '0 20px',
          borderBottom: '1px solid var(--border-subtle)',
          gap: 12,
          overflow: 'hidden',
        }}
      >
        <Shield size={22} style={{ color: 'var(--primary)', flexShrink: 0 }} />
        {!collapsed && (
          <span
            style={{
              fontSize: 16,
              fontWeight: 600,
              letterSpacing: '-0.02em',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ color: 'var(--text-primary)' }}>Geo</span>
            <span className="console-gradient-text">Watch</span>
          </span>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 14px',
                borderRadius: 8,
                textDecoration: 'none',
                color: isActive ? 'var(--navy-200)' : 'var(--text-secondary)',
                background: isActive ? 'rgba(37, 99, 235, 0.12)' : 'transparent',
                border: isActive ? '1px solid rgba(37, 99, 235, 0.2)' : '1px solid transparent',
                fontSize: 14,
                fontWeight: 500,
                transition: 'all var(--transition-fast)',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'var(--bg-hover)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }
              }}
            >
              <Icon size={18} style={{ flexShrink: 0 }} />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        style={{
          height: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          border: 'none',
          borderTop: '1px solid var(--border-subtle)',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          transition: 'color var(--transition-fast)',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </aside>
  );
}
