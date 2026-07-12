import React, { useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Search,
  Map as MapIcon,
  LogOut,
  ChevronDown,
  Zap,
  Command,
  Minimize2,
  ShieldCheck,
} from 'lucide-react';
import GoogleSignInButton from '../GoogleSignInButton/GoogleSignInButton.jsx';
import { usePublicAuth } from '../../contexts/PublicAuthContext.jsx';

function getInitials(user) {
  const full = user?.fullName || user?.full_name || '';
  if (full) {
    const parts = full.trim().split(/\s+/);
    const first = parts[0]?.[0] || '';
    const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return `${first}${last}`.toUpperCase() || 'U';
  }
  const email = user?.email || '';
  return email ? email[0].toUpperCase() : 'U';
}

function getDisplayName(user) {
  return user?.fullName || user?.full_name || user?.email || 'User';
}

export default function WorkspaceTopBar({
  dateRange,
  onDateRangeChange,
  onResetToToday,
  onOpenSearch,
  onOpenAdvancedSearch,
  onToggleFocusMode,
  isFocusMode,
  onOpenZones,
  compactMode,
  onToggleCompactMode,
  verifiedOnly,
  onToggleVerifiedOnly,
}) {
  const location = useLocation();
  const { user, login, logout, isAuthenticated, loading: authLoading } = usePublicAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [loginError, setLoginError] = useState('');
  const iconSize = (n) => (compactMode ? Math.round(n * 0.9) : n);

  const displayName = useMemo(() => getDisplayName(user), [user]);
  const initials = useMemo(() => getInitials(user), [user]);

  const actionBtn = {
    display: 'flex',
    alignItems: 'center',
    gap: 'calc(5px * var(--admin-ui-scale))',
    padding: 'calc(5px * var(--admin-ui-scale)) calc(8px * var(--admin-ui-scale))',
    fontSize: 'calc(11px * var(--admin-ui-scale))',
    fontWeight: 700,
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-subtle)',
    background: 'var(--bg-input)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  };

  const navLinkStyle = (isActive) => ({
    padding: 'calc(5px * var(--admin-ui-scale)) calc(10px * var(--admin-ui-scale))',
    borderRadius: 'var(--radius-sm)',
    fontSize: 'calc(12px * var(--admin-ui-scale))',
    fontWeight: 600,
    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
    background: isActive ? 'var(--bg-elevated)' : 'transparent',
    textDecoration: 'none',
    transition: 'all 0.15s ease',
  });

  const handleCredentialResponse = async (response) => {
    setLoginError('');
    try {
      await login(response.credential);
    } catch (err) {
      console.error('Google login failed:', err);
      setLoginError(err.message || 'Sign-in failed. Please try again.');
    }
  };

  return (
    <header
      style={{
        height: 'var(--admin-topbar-height)',
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 calc(12px * var(--admin-ui-scale))',
        flexShrink: 0,
        zIndex: 100,
      }}
    >
      {/* Left: brand + nav + search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(8px * var(--admin-ui-scale))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(10px * var(--admin-ui-scale))' }}>
          <div
            style={{
              width: 'calc(28px * var(--admin-ui-scale))',
              height: 'calc(28px * var(--admin-ui-scale))',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 'calc(12px * var(--admin-ui-scale))',
              fontWeight: 700,
              color: 'var(--text-on-accent)',
              boxShadow: '0 0 20px var(--accent-glow-strong)',
              flexShrink: 0,
            }}
          >
            G
          </div>
          <span
            style={{
              fontSize: 'calc(15px * var(--admin-ui-scale))',
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '-0.3px',
            }}
          >
            GeoWatch
          </span>
        </div>

        {/* Public nav links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 'calc(4px * var(--admin-ui-scale))', marginLeft: 'calc(4px * var(--admin-ui-scale))' }}>
          <Link to="/" style={navLinkStyle(location.pathname === '/')}>Home</Link>
          <Link to="/map" style={navLinkStyle(location.pathname === '/map')}>Map</Link>
          <Link to="/about" style={navLinkStyle(location.pathname === '/about')}>About</Link>
        </nav>

        <div style={{ width: 'calc(1px * var(--admin-ui-scale))', height: 'calc(20px * var(--admin-ui-scale))', background: 'var(--border-subtle)', margin: '0 calc(4px * var(--admin-ui-scale))' }} />

        {/* Search trigger */}
        <button
          onClick={() => onOpenSearch?.()}
          title="Search incidents (⌘K)"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'calc(8px * var(--admin-ui-scale))',
            padding: 'calc(6px * var(--admin-ui-scale)) calc(10px * var(--admin-ui-scale))',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-muted)',
            fontSize: 'calc(13px * var(--admin-ui-scale))',
            cursor: 'pointer',
            minWidth: 'calc(220px * var(--admin-ui-scale))',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent-light)';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-subtle)';
            e.currentTarget.style.color = 'var(--text-muted)';
          }}
        >
          <Search size={iconSize(15)} />
          <span style={{ flex: 1, textAlign: 'left' }}>Search incidents and locations…</span>
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'calc(2px * var(--admin-ui-scale))',
              fontSize: 'calc(11px * var(--admin-ui-scale))',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-muted)',
              background: 'var(--bg-surface)',
              padding: 'calc(2px * var(--admin-ui-scale)) calc(6px * var(--admin-ui-scale))',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <Command size={iconSize(10)} />
            <span>K</span>
          </span>
        </button>

        <button
          onClick={() => onOpenAdvancedSearch?.()}
          title="Open advanced search page"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'calc(6px * var(--admin-ui-scale))',
            padding: 'calc(5px * var(--admin-ui-scale)) calc(8px * var(--admin-ui-scale))',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-secondary)',
            fontSize: 'calc(11px * var(--admin-ui-scale))',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent-light)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-subtle)';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          <Search size={iconSize(13)} />
          <span>Advanced</span>
        </button>
      </div>

      {/* Center: mode + date + verified filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(12px * var(--admin-ui-scale))' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'calc(8px * var(--admin-ui-scale))',
            padding: 'calc(5px * var(--admin-ui-scale)) calc(8px * var(--admin-ui-scale))',
            borderRadius: 'var(--radius-sm)',
            fontSize: 'calc(11px * var(--admin-ui-scale))',
            fontWeight: 700,
            letterSpacing: '1px',
            background: 'var(--alert-error-bg)',
            border: '1px solid var(--alert-error-border)',
            color: 'var(--badge-red-text)',
          }}
        >
          <span
            style={{
              width: 'calc(6px * var(--admin-ui-scale))',
              height: 'calc(6px * var(--admin-ui-scale))',
              borderRadius: '50%',
              background: 'currentColor',
              boxShadow: '0 0 10px currentColor',
              animation: 'pulse 2s ease-in-out infinite',
            }}
          />
          LIVE MODE
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(8px * var(--admin-ui-scale))' }}>
          <input
            type="date"
            value={dateRange.from}
            onChange={(e) => onDateRangeChange?.({ from: e.target.value, to: dateRange.to })}
            style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: 'calc(5px * var(--admin-ui-scale)) calc(8px * var(--admin-ui-scale))',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
              fontSize: 'calc(11px * var(--admin-ui-scale))',
              outline: 'none',
              cursor: 'pointer',
              width: 'calc(124px * var(--admin-ui-scale))',
            }}
          />
          <span style={{ color: 'var(--text-muted)', fontSize: 'calc(11px * var(--admin-ui-scale))' }}>→</span>
          <input
            type="date"
            value={dateRange.to}
            onChange={(e) => onDateRangeChange?.({ from: dateRange.from, to: e.target.value })}
            style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: 'calc(5px * var(--admin-ui-scale)) calc(8px * var(--admin-ui-scale))',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
              fontSize: 'calc(11px * var(--admin-ui-scale))',
              outline: 'none',
              cursor: 'pointer',
              width: 'calc(124px * var(--admin-ui-scale))',
            }}
          />
          <button
            onClick={onResetToToday}
            style={{
              padding: 'calc(5px * var(--admin-ui-scale)) calc(10px * var(--admin-ui-scale))',
              fontSize: 'calc(10px * var(--admin-ui-scale))',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-input)',
              color: 'var(--accent-light)',
              cursor: 'pointer',
            }}
          >
            Today
          </button>
        </div>

        <button
          onClick={onToggleVerifiedOnly}
          title="Show only verified incidents"
          style={{
            ...actionBtn,
            color: verifiedOnly ? 'var(--accent-light)' : 'var(--text-secondary)',
            borderColor: verifiedOnly ? 'var(--accent-light)' : 'var(--border-subtle)',
          }}
        >
          <ShieldCheck size={iconSize(13)} />
          <span>Verified{verifiedOnly ? ' only' : ''}</span>
        </button>
      </div>

      {/* Right: actions + auth */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(10px * var(--admin-ui-scale))' }}>
        <button
          onClick={onToggleCompactMode}
          title={compactMode ? 'Switch to default size' : 'Switch to compact mode'}
          style={{
            ...actionBtn,
            color: compactMode ? 'var(--accent-light)' : 'var(--text-secondary)',
            borderColor: compactMode ? 'var(--accent-light)' : 'var(--border-subtle)',
          }}
        >
          <Minimize2 size={iconSize(13)} />
          <span>{compactMode ? 'Normal' : 'Compact'}</span>
        </button>

        <button
          onClick={onToggleFocusMode}
          title="Toggle focus mode"
          style={{
            ...actionBtn,
            color: isFocusMode ? 'var(--accent-light)' : 'var(--text-secondary)',
            borderColor: isFocusMode ? 'var(--accent-light)' : 'var(--border-subtle)',
          }}
        >
          <Zap size={iconSize(14)} />
          {isFocusMode ? 'Exit Focus' : 'Focus'}
        </button>

        <button style={actionBtn} onClick={onOpenZones}>
          <MapIcon size={iconSize(13)} />
          Zones
        </button>

        {/* Auth area */}
        <div style={{ position: 'relative' }}>
          {authLoading ? (
            <div
              style={{
                width: 'calc(28px * var(--admin-ui-scale))',
                height: 'calc(28px * var(--admin-ui-scale))',
                borderRadius: '50%',
                background: 'var(--bg-hover)',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
          ) : isAuthenticated && user ? (
            <>
              <button
                onClick={() => setUserMenuOpen((p) => !p)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'calc(6px * var(--admin-ui-scale))',
                  padding: 'calc(2px * var(--admin-ui-scale)) calc(2px * var(--admin-ui-scale)) calc(2px * var(--admin-ui-scale)) calc(10px * var(--admin-ui-scale))',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-secondary)',
                  fontSize: 'calc(11px * var(--admin-ui-scale))',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-hover)';
                  e.currentTarget.style.background = 'var(--bg-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  e.currentTarget.style.background = 'var(--bg-input)';
                }}
              >
                <span
                  style={{
                    maxWidth: 'calc(160px * var(--admin-ui-scale))',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {displayName}
                </span>
                <ChevronDown
                  size={iconSize(12)}
                  style={{
                    transition: 'transform 0.15s ease',
                    transform: userMenuOpen ? 'rotate(180deg)' : 'none',
                  }}
                />
                <div
                  style={{
                    width: 'calc(24px * var(--admin-ui-scale))',
                    height: 'calc(24px * var(--admin-ui-scale))',
                    borderRadius: '50%',
                    background: 'var(--accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 'calc(9px * var(--admin-ui-scale))',
                    fontWeight: 700,
                    color: 'var(--text-on-accent)',
                    border: '2px solid var(--border-subtle)',
                    flexShrink: 0,
                  }}
                >
                  {initials}
                </div>
              </button>

              {userMenuOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    width: 'calc(240px * var(--admin-ui-scale))',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-md)',
                    padding: 'calc(14px * var(--admin-ui-scale))',
                    boxShadow: 'var(--shadow-lg)',
                    zIndex: 200,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(12px * var(--admin-ui-scale))', marginBottom: 'calc(14px * var(--admin-ui-scale))' }}>
                    <div
                      style={{
                        width: 'calc(34px * var(--admin-ui-scale))',
                        height: 'calc(34px * var(--admin-ui-scale))',
                        borderRadius: '50%',
                        background: 'var(--accent)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 'calc(11px * var(--admin-ui-scale))',
                        fontWeight: 700,
                        color: 'var(--text-on-accent)',
                        border: '2px solid var(--border-subtle)',
                        flexShrink: 0,
                      }}
                    >
                      {initials}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 'calc(12px * var(--admin-ui-scale))', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {displayName}
                      </div>
                      <div
                        style={{
                          fontSize: 'calc(11px * var(--admin-ui-scale))',
                          color: 'var(--text-muted)',
                          marginTop: 'calc(2px * var(--admin-ui-scale))',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {user?.email || ''}
                      </div>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                    <button
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 'calc(8px * var(--admin-ui-scale))',
                        padding: 'calc(8px * var(--admin-ui-scale)) calc(12px * var(--admin-ui-scale))',
                        fontSize: 'calc(13px * var(--admin-ui-scale))',
                        fontWeight: 700,
                        color: 'var(--text-secondary)',
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--bg-hover)';
                        e.currentTarget.style.borderColor = 'var(--border-hover)';
                        e.currentTarget.style.color = 'var(--text-primary)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'var(--bg-input)';
                        e.currentTarget.style.borderColor = 'var(--border-subtle)';
                        e.currentTarget.style.color = 'var(--text-secondary)';
                      }}
                      onClick={() => {
                        setUserMenuOpen(false);
                        logout?.();
                      }}
                    >
                      <LogOut size={iconSize(14)} />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <GoogleSignInButton onCredential={handleCredentialResponse} buttonWidth="160" />
          )}

          {loginError && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                right: 0,
                fontSize: '11px',
                color: 'var(--danger)',
                maxWidth: '180px',
                lineHeight: 1.4,
                background: 'var(--bg-surface)',
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                boxShadow: 'var(--shadow-md)',
                zIndex: 200,
              }}
            >
              {loginError}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
