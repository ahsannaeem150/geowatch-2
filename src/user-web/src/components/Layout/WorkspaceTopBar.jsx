import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  LogOut,
  ChevronDown,
  Zap,
  Command,
  List,
  Hexagon,
} from 'lucide-react';
import GoogleSignInButton from '../GoogleSignInButton/GoogleSignInButton.jsx';
import { usePublicAuth } from '../../contexts/PublicAuthContext.jsx';
import TopBarDateControl from './TopBarDateControl.jsx';
import TopBarModePill from './TopBarModePill.jsx';

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
  isLiveMode = true,
  onOpenSearch,
  onOpenAdvancedSearch,
  onToggleFocusMode,
  isFocusMode,
  compactMode,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, login, logout, isAuthenticated, loading: authLoading } = usePublicAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [loginError, setLoginError] = useState('');
  const iconSize = (n) => (compactMode ? Math.round(n * 0.9) : n);

  // Slim mode: below ~1640px viewport the full bar would overflow, so the
  // search box narrows, the Advanced button goes icon-only, and the mode pill
  // + date control switch to compact labels.
  const [slim, setSlim] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 1640px)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1640px)');
    const onChange = (e) => setSlim(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // ─── Collapsible public nav (hidden by default; brand click reveals) ───
  const [navOpen, setNavOpen] = useState(false);
  const [brandPulse, setBrandPulse] = useState(false);
  const navClusterRef = useRef(null);
  const PEEK_KEY = 'geowatch_user_nav_peeked';
  const markPeeked = useCallback(() => {
    try { localStorage.setItem(PEEK_KEY, '1'); } catch {}
  }, []);

  // First-visit auto-peek: pulse the brand, reveal the nav briefly, then hide
  // it and never auto-peek again. Any interaction ends the peek early.
  useEffect(() => {
    let seen = false;
    try { seen = localStorage.getItem(PEEK_KEY) === '1'; } catch {}
    if (seen) return;
    setBrandPulse(true);
    const t1 = setTimeout(() => setNavOpen(true), 1200);
    const t2 = setTimeout(() => {
      setNavOpen(false);
      setBrandPulse(false);
      markPeeked();
    }, 3700);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [markPeeked]);

  // Outside click collapses the nav
  useEffect(() => {
    if (!navOpen) return;
    const onDocDown = (e) => {
      if (navClusterRef.current && !navClusterRef.current.contains(e.target)) {
        setNavOpen(false);
        setBrandPulse(false);
        markPeeked();
      }
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, [navOpen, markPeeked]);

  const toggleNav = () => {
    markPeeked();
    setBrandPulse(false);
    setNavOpen((o) => !o);
  };

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
      {/* Left: brand + nav + search (flex:1 so the center cluster stays centered) */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 'calc(8px * var(--admin-ui-scale))' }}>
        <div ref={navClusterRef} style={{ display: 'flex', alignItems: 'center', gap: 'calc(10px * var(--admin-ui-scale))' }}>
          <button
            type="button"
            onClick={toggleNav}
            title={navOpen ? 'Hide navigation' : 'Show navigation'}
            aria-expanded={navOpen}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'calc(10px * var(--admin-ui-scale))',
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
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
                animation: brandPulse ? 'wt-brand-pulse 1.1s ease-in-out infinite' : 'none',
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
          </button>

          {/* Public nav links — hidden by default, staggered reveal on brand click */}
          <AnimatePresence>
            {navOpen && (
              <motion.nav
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={{
                  visible: { transition: { staggerChildren: 0.055 } },
                  exit: { transition: { staggerChildren: 0.03, staggerDirection: -1 } },
                }}
                style={{ display: 'flex', alignItems: 'center', gap: 'calc(4px * var(--admin-ui-scale))', marginLeft: 'calc(4px * var(--admin-ui-scale))' }}
              >
                {[
                  { to: '/', label: 'Home' },
                  { to: '/map', label: 'Map' },
                  { to: '/about', label: 'About' },
                ].map((link) => (
                  <motion.span
                    key={link.to}
                    variants={{
                      hidden: { width: 0, opacity: 0 },
                      visible: { width: 'auto', opacity: 1, transition: { duration: 0.18, ease: 'easeOut' } },
                      exit: { width: 0, opacity: 0, transition: { duration: 0.12, ease: 'easeIn' } },
                    }}
                    style={{ display: 'inline-flex', overflow: 'hidden', whiteSpace: 'nowrap' }}
                  >
                    <Link
                      to={link.to}
                      style={navLinkStyle(location.pathname === link.to)}
                      onClick={() => setNavOpen(false)}
                    >
                      {link.label}
                    </Link>
                  </motion.span>
                ))}
              </motion.nav>
            )}
          </AnimatePresence>
        </div>

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
            minWidth: slim ? 'calc(150px * var(--admin-ui-scale))' : 'calc(220px * var(--admin-ui-scale))',
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
          {!slim && <span>Advanced</span>}
        </button>
      </div>

      {/* Center: mode pill + date control (true center via balanced flex sides) */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 'calc(12px * var(--admin-ui-scale))' }}>
        <TopBarModePill
          slim={slim}
          isLiveMode={isLiveMode}
          dateRange={dateRange}
          onResetToToday={onResetToToday}
        />

        <TopBarDateControl
          slim={slim}
          dateRange={dateRange}
          onDateRangeChange={onDateRangeChange}
          onResetToToday={onResetToToday}
        />
      </div>

      {/* Right: actions + auth */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 'calc(10px * var(--admin-ui-scale))' }}>
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

        <button style={actionBtn} onClick={() => navigate('/incidents')} title="Incidents directory">
          <List size={iconSize(13)} />
          Incidents
        </button>

        <button style={actionBtn} onClick={() => navigate('/zones')} title="Zones directory">
          <Hexagon size={iconSize(13)} />
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
                {user?.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt=""
                    style={{
                      width: 'calc(24px * var(--admin-ui-scale))',
                      height: 'calc(24px * var(--admin-ui-scale))',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '2px solid var(--border-subtle)',
                      flexShrink: 0,
                    }}
                  />
                ) : (
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
                )}
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
                    {user?.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt=""
                        style={{
                          width: 'calc(34px * var(--admin-ui-scale))',
                          height: 'calc(34px * var(--admin-ui-scale))',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '2px solid var(--border-subtle)',
                          flexShrink: 0,
                        }}
                      />
                    ) : (
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
                    )}
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

      <style>{`
        @keyframes wt-brand-pulse {
          0%, 100% { box-shadow: 0 0 20px var(--accent-glow-strong); }
          50% { box-shadow: 0 0 34px var(--accent-glow-strong), 0 0 14px var(--accent-light); }
        }
      `}</style>
    </header>
  );
}
