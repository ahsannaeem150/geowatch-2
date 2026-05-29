import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, ChevronDown, LogOut, User } from 'lucide-react';
import ThemeToggle from '@shared/components/ThemeToggle.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';

export default function TopBar() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const roleLabel = user?.role === 'super_admin' ? 'Super Admin' : user?.role === 'admin' ? 'Admin' : 'Viewer';
  const roleColor = user?.role === 'super_admin' ? 'var(--navy-400)' : 'var(--text-muted)';

  return (
    <header
      style={{
        height: 'var(--topbar-height)',
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      {/* Search */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 8,
          padding: '8px 14px',
          width: 320,
          transition: 'border-color var(--transition-fast)',
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
        onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
      >
        <Search size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        <input
          type="text"
          placeholder="Search users, incidents, audit logs..."
          style={{
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--text-primary)',
            fontSize: 13,
            fontFamily: 'var(--font-sans)',
            width: '100%',
          }}
        />
      </div>

      {/* Right section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Theme toggle + Notification bell */}
        <ThemeToggle />
        <button
          style={{
            position: 'relative',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: 6,
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          <Bell size={18} />
          <span
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
              width: 7,
              height: 7,
              background: 'var(--danger)',
              borderRadius: '50%',
              border: '2px solid var(--bg-base)',
            }}
          />
        </button>

        {/* User dropdown */}
        <div ref={menuRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              padding: '6px 10px',
              borderRadius: 8,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--navy-600), var(--navy-800))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {user?.full_name?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <div style={{ textAlign: 'left', lineHeight: 1.3 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{user?.full_name || 'Admin'}</div>
              <div style={{ fontSize: 11, color: roleColor, fontWeight: 500 }}>{roleLabel}</div>
            </div>
            <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
          </button>

          {menuOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: 200,
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                borderRadius: 10,
                boxShadow: 'var(--shadow-lg)',
                padding: '6px',
                zIndex: 200,
                animation: 'fadeIn 0.15s ease forwards',
              }}
            >
              <div
                style={{
                  padding: '10px 12px',
                  borderBottom: '1px solid var(--border-subtle)',
                  marginBottom: 4,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 500 }}>{user?.full_name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{user?.email}</div>
              </div>
              <button
                onClick={logout}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: 6,
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--danger)',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                  transition: 'background var(--transition-fast)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(244, 63, 94, 0.08)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <LogOut size={16} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
