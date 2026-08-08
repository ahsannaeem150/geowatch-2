import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Bookmark, ChevronDown } from 'lucide-react';
import GoogleSignInButton from '../GoogleSignInButton/GoogleSignInButton.jsx';
import ThemeToggle from '@shared/components/ThemeToggle.jsx';
import { useStyle } from '@shared/useStyle.js';
import { usePublicAuth } from '../../contexts/PublicAuthContext.jsx';
import { api } from '../../services/api.js';
import BrandLogo from '../Brand/BrandLogo.jsx';

const STYLES = [
  { key: 'tactical', label: 'Tac', short: 'T' },
  { key: 'saas', label: 'SaaS', short: 'S' },
];

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, login, logout, isAuthenticated, loading: authLoading } = usePublicAuth();
  const { style, setStyle } = useStyle();
  const [scrolled, setScrolled] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileMenuRef = useRef(null);
  const [loginError, setLoginError] = useState('');
  const [savedCount, setSavedCount] = useState(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Saved-incident count for the profile menu badge (lightweight, public auth)
  useEffect(() => {
    if (!isAuthenticated) {
      setSavedCount(null);
      return;
    }
    let cancelled = false;
    api
      .listSavedIncidents()
      .then((res) => {
        if (!cancelled) setSavedCount((res.data?.incidents || []).length);
      })
      .catch(() => {
        if (!cancelled) setSavedCount(null);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  // Close the profile menu on outside click / Escape
  useEffect(() => {
    if (!profileOpen) return;
    const onDocDown = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setProfileOpen(false);
    };
    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [profileOpen]);

  const handleCredentialResponse = useCallback(
    async (response) => {
      setLoginError('');
      try {
        await login(response.credential);
      } catch (err) {
        console.error('Google login failed:', err);
        setLoginError(err.message || 'Sign-in failed. Please try again.');
      }
    },
    [login]
  );

  const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/map', label: 'Map' },
    { path: '/about', label: 'About' },
  ];

  const avatar = (size, ring = false) =>
    user?.avatar_url ? (
      <img
        src={user.avatar_url}
        alt={user.full_name || user.email}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          border: ring ? '2px solid var(--accent-subtle-border)' : '1px solid var(--border-subtle)',
          boxShadow: ring ? '0 0 0 2px var(--accent-subtle-bg)' : 'none',
        }}
      />
    ) : (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: 'var(--accent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size * 0.42,
          fontWeight: 700,
          color: 'var(--text-on-accent)',
          border: ring ? '2px solid var(--accent-subtle-border)' : '1px solid var(--border-subtle)',
          boxShadow: ring ? '0 0 0 2px var(--accent-subtle-bg)' : 'none',
        }}
      >
        {(user?.full_name || user?.email || 'U').charAt(0).toUpperCase()}
      </div>
    );

  return (
    <header
      style={{
        height: '56px',
        background: scrolled ? 'var(--bg-glass)' : 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(12px)' : 'none',
        transition: 'background 0.3s ease, backdrop-filter 0.3s ease',
      }}
    >
      {/* Logo */}
      <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
        <BrandLogo variant="full" height={44} />
      </Link>

      {/* Nav — absolutely centered so unequal side-cluster widths (logged-in
          vs logged-out) can't pull it off-center */}
      <nav
        style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        {navLinks.map((link) => {
          const isActive = location.pathname === link.path;
          return (
            <Link
              key={link.path}
              to={link.path}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13px',
                fontWeight: 600,
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                background: isActive ? 'var(--bg-elevated)' : 'transparent',
                textDecoration: 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Right: Style picker + Theme toggle + Auth */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Segmented style picker with sliding thumb */}
        <div
          role="radiogroup"
          aria-label="Interface style"
          title="Interface style"
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: 2,
            gap: 2,
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          {STYLES.map((s) => {
            const active = style === s.key;
            return (
              <button
                key={s.key}
                role="radio"
                aria-checked={active}
                onClick={() => setStyle(s.key)}
                title={`${s.label} interface`}
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '4px 9px',
                  border: 'none',
                  borderRadius: 'calc(var(--radius-sm) - 2px)',
                  background: 'transparent',
                  color: active ? 'var(--accent-light)' : 'var(--text-muted)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                  transition: 'color 0.15s ease',
                }}
              >
                {active && (
                  <motion.span
                    layoutId="header-style-thumb"
                    transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'var(--accent-subtle-bg)',
                      border: '1px solid var(--accent-subtle-border)',
                      borderRadius: 'calc(var(--radius-sm) - 2px)',
                    }}
                  />
                )}
                <span
                  style={{
                    position: 'relative',
                    width: 16,
                    height: 16,
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    fontWeight: 700,
                    background: active ? 'var(--accent)' : 'var(--bg-hover)',
                    color: active ? 'var(--text-on-accent)' : 'var(--text-muted)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {s.short}
                </span>
                <span style={{ position: 'relative' }}>{s.label}</span>
              </button>
            );
          })}
        </div>

        <ThemeToggle />

        {/* Key forces complete DOM remount on auth change — prevents Google's button from persisting */}
        <div key={isAuthenticated ? 'authed' : 'guest'} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {authLoading ? (
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: 'var(--bg-hover)',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
          ) : isAuthenticated && user ? (
            <div ref={profileMenuRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setProfileOpen((p) => !p)}
                aria-haspopup="menu"
                aria-expanded={profileOpen}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '3px 6px 3px 10px',
                  background: profileOpen ? 'var(--bg-hover)' : 'transparent',
                  border: '1px solid',
                  borderColor: profileOpen ? 'var(--border-default)' : 'transparent',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'var(--text-secondary)',
                    maxWidth: '120px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {user.full_name || user.email}
                </span>
                <ChevronDown
                  size={13}
                  style={{
                    color: 'var(--text-muted)',
                    transition: 'transform 0.15s ease',
                    transform: profileOpen ? 'rotate(180deg)' : 'none',
                  }}
                />
                {avatar(28)}
              </button>

              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92, y: -6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: -6 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    role="menu"
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      right: 0,
                      transformOrigin: 'top right',
                      width: 264,
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-default)',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: 'var(--shadow-lg)',
                      padding: 6,
                      zIndex: 200,
                    }}
                  >
                    {/* Identity header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 10px 12px' }}>
                      {avatar(38, true)}
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: '13px',
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {user.full_name || 'User'}
                        </div>
                        <div
                          style={{
                            fontSize: '11px',
                            color: 'var(--text-muted)',
                            marginTop: 2,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {user.email}
                        </div>
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '0 4px' }} />

                    {/* Saved incidents */}
                    <button
                      role="menuitem"
                      onClick={() => {
                        setProfileOpen(false);
                        navigate('/map?drawer=saved');
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '9px 10px',
                        marginTop: 4,
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        background: 'transparent',
                        color: 'var(--text-secondary)',
                        fontSize: '13px',
                        fontWeight: 600,
                        fontFamily: 'var(--font-sans)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--bg-hover)';
                        e.currentTarget.style.color = 'var(--text-primary)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'var(--text-secondary)';
                      }}
                    >
                      <Bookmark size={15} />
                      <span style={{ flex: 1, textAlign: 'left' }}>Saved incidents</span>
                      {savedCount !== null && (
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            fontFamily: 'var(--font-mono)',
                            color: 'var(--accent-light)',
                            background: 'var(--accent-subtle-bg)',
                            border: '1px solid var(--accent-subtle-border)',
                            borderRadius: 'var(--radius-pill)',
                            padding: '1px 7px',
                          }}
                        >
                          {savedCount}
                        </span>
                      )}
                    </button>

                    <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '4px 4px 0' }} />

                    {/* Sign out */}
                    <button
                      role="menuitem"
                      onClick={() => {
                        setProfileOpen(false);
                        logout?.();
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '9px 10px',
                        marginTop: 4,
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        background: 'transparent',
                        color: 'var(--danger)',
                        fontSize: '13px',
                        fontWeight: 600,
                        fontFamily: 'var(--font-sans)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--alert-error-bg)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <LogOut size={15} />
                      Sign out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <GoogleSignInButton onCredential={handleCredentialResponse} buttonWidth="160" />
          )}

          {loginError && (
            <div
              style={{
                fontSize: '11px',
                color: 'var(--danger)',
                maxWidth: '180px',
                lineHeight: 1.4,
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
