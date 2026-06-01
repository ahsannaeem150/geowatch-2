import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import ThemeToggle from '@shared/components/ThemeToggle.jsx';
import { usePublicAuth } from '../../contexts/PublicAuthContext.jsx';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function Header() {
  const location = useLocation();
  const { user, login, logout, isAuthenticated, loading: authLoading } = usePublicAuth();
  const [scrolled, setScrolled] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [googleFailed, setGoogleFailed] = useState(false);
  const [loginError, setLoginError] = useState('');
  const googleButtonRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  useLayoutEffect(() => {
    if (!GOOGLE_CLIENT_ID || isAuthenticated) return;

    let interval;
    let timeout;

    const tryRender = () => {
      if (!googleButtonRef.current) return false;
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse,
        });
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: 'outline',
          size: 'medium',
          text: 'signin_with',
          shape: 'pill',
          width: '160',
        });
        setGoogleReady(true);
        setGoogleFailed(false);
        return true;
      }
      return false;
    };

    // Try immediately in case script is already loaded
    if (tryRender()) return;

    // Poll every 200ms until Google script loads
    interval = setInterval(() => {
      if (tryRender()) {
        clearInterval(interval);
        clearTimeout(timeout);
      }
    }, 200);

    // Give up after 8 seconds and show fallback
    timeout = setTimeout(() => {
      clearInterval(interval);
      setGoogleFailed(true);
    }, 8000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
      // Force-remove any Google-rendered DOM to prevent stale buttons
      if (googleButtonRef.current) {
        googleButtonRef.current.innerHTML = '';
      }
    };
  }, [isAuthenticated, handleCredentialResponse]);

  const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/map', label: 'Map' },
    { path: '/about', label: 'About' },
  ];

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
      <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '8px',
            background: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '13px',
            fontWeight: 700,
            color: '#f2f2f2',
            fontFamily: 'var(--font-mono)',
          }}
        >
          G
        </div>
        <span style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
          GeoWatch
        </span>
      </Link>

      {/* Nav */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
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

      {/* Right: Theme toggle + Auth */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.full_name || user.email}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '1px solid var(--border-subtle)',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'var(--accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#f2f2f2',
                  }}
                >
                  {(user.full_name || user.email).charAt(0).toUpperCase()}
                </div>
              )}
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
              <button
                onClick={logout}
                title="Sign out"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '28px',
                  height: '28px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-hover)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-muted)';
                }}
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : GOOGLE_CLIENT_ID ? (
            <div ref={googleButtonRef} style={{ height: '32px', display: 'flex', alignItems: 'center' }} />
          ) : (
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Sign-in not configured</div>
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

          {!isAuthenticated && !authLoading && googleFailed && (
            <div
              style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
                maxWidth: '160px',
                lineHeight: 1.4,
              }}
              title="Google Sign-In could not load. Check your ad blocker or network connection."
            >
              Sign-in unavailable
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
