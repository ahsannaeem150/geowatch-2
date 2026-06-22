import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogOut, Palette } from 'lucide-react';
import GoogleSignInButton from '../GoogleSignInButton/GoogleSignInButton.jsx';
import ThemeToggle from '@shared/components/ThemeToggle.jsx';
import { useStyle } from '@shared/useStyle.js';
import { usePublicAuth } from '../../contexts/PublicAuthContext.jsx';

const STYLES = [
  { key: 'tactical', label: 'Tac', short: 'T' },
  { key: 'saas', label: 'SaaS', short: 'S' },
  { key: 'glass', label: 'Glass', short: 'G' },
];

export default function Header() {
  const location = useLocation();
  const { user, login, logout, isAuthenticated, loading: authLoading } = usePublicAuth();
  const { style, setStyle } = useStyle();
  const [scrolled, setScrolled] = useState(false);
  const [styleMenuOpen, setStyleMenuOpen] = useState(false);
  const styleMenuRef = useRef(null);
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    function handleClick(e) {
      if (styleMenuRef.current && !styleMenuRef.current.contains(e.target)) {
        setStyleMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
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
            borderRadius: 'var(--radius-sm)',
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

      {/* Right: Style toggle + Theme toggle + Auth */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Style toggle */}
        <div ref={styleMenuRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setStyleMenuOpen(!styleMenuOpen)}
            title="Interface style"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-elevated)',
              color: 'var(--text-secondary)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              textTransform: 'capitalize',
              transition: 'all var(--transition-fast)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-hover)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-subtle)';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            <Palette size={14} />
            <span>{STYLES.find((s) => s.key === style)?.label || style}</span>
          </button>

          {styleMenuOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                right: 0,
                width: 140,
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                padding: '4px',
                zIndex: 200,
                animation: 'fade-in 0.15s ease forwards',
              }}
            >
              {STYLES.map((s) => (
                <button
                  key={s.key}
                  onClick={() => {
                    setStyle(s.key);
                    setStyleMenuOpen(false);
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    background: style === s.key ? 'var(--bg-hover)' : 'transparent',
                    border: 'none',
                    color: style === s.key ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-sans)',
                    textTransform: 'capitalize',
                    transition: 'background var(--transition-fast)',
                  }}
                  onMouseEnter={(e) => {
                    if (style !== s.key) e.currentTarget.style.background = 'var(--bg-hover)';
                  }}
                  onMouseLeave={(e) => {
                    if (style !== s.key) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 10,
                      fontWeight: 700,
                      background: style === s.key ? 'var(--accent)' : 'var(--bg-hover)',
                      color: style === s.key ? '#fff' : 'var(--text-muted)',
                    }}
                  >
                    {s.short}
                  </span>
                  {s.label}
                </button>
              ))}
            </div>
          )}
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
