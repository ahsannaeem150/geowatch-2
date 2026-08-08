import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import BrandLogo from '../Brand/BrandLogo.jsx';

const PEEK_KEY = 'intelmap24_user_nav_peeked';

/**
 * Shared brand home cluster: mark tile + IntelMap24 wordmark (click → home)
 * with hover/focus-peeked public nav links (Home/Map/About). Used by both the
 * map workspace top bar and the Power Search panel so the behavior and markup
 * stay in sync. markHeight keeps each surface's own sizing.
 */
export default function BrandHomeLink({ markHeight = 32 }) {
  const location = useLocation();
  const navigate = useNavigate();

  // ─── Collapsible public nav (hidden by default; brand hover/focus reveals,
  // brand click navigates home) ───
  const [navOpen, setNavOpen] = useState(false);
  const navClusterRef = useRef(null);
  const revealTimerRef = useRef(null);
  const hideTimerRef = useRef(null);
  const markPeeked = useCallback(() => {
    try { localStorage.setItem(PEEK_KEY, '1'); } catch {}
  }, []);

  const clearNavTimers = useCallback(() => {
    clearTimeout(revealTimerRef.current);
    clearTimeout(hideTimerRef.current);
  }, []);
  useEffect(() => () => clearNavTimers(), [clearNavTimers]);

  // First-visit auto-peek: reveal the nav briefly so users discover it exists,
  // then hide it and never auto-peek again. Any interaction ends it early.
  useEffect(() => {
    let seen = false;
    try { seen = localStorage.getItem(PEEK_KEY) === '1'; } catch {}
    if (seen) return;
    const t1 = setTimeout(() => setNavOpen(true), 1200);
    const t2 = setTimeout(() => {
      setNavOpen(false);
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
        markPeeked();
      }
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, [navOpen, markPeeked]);

  // Hover-intent reveal (~175ms so quick passes don't flicker); mouse-leave
  // hides after a short grace period.
  const revealNav = useCallback(() => {
    markPeeked();
    clearNavTimers();
    revealTimerRef.current = setTimeout(() => setNavOpen(true), 175);
  }, [markPeeked, clearNavTimers]);

  const scheduleHideNav = useCallback(() => {
    clearTimeout(revealTimerRef.current);
    hideTimerRef.current = setTimeout(() => setNavOpen(false), 250);
  }, []);

  const revealNavNow = useCallback(() => {
    markPeeked();
    clearNavTimers();
    setNavOpen(true);
  }, [markPeeked, clearNavTimers]);

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

  return (
    <div
      ref={navClusterRef}
      style={{ display: 'flex', alignItems: 'center', gap: 'calc(10px * var(--admin-ui-scale))' }}
      onMouseEnter={revealNav}
      onMouseLeave={scheduleHideNav}
      onFocusCapture={revealNavNow}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) scheduleHideNav();
      }}
    >
      <button
        type="button"
        onClick={() => navigate('/')}
        title="IntelMap24 home — hover for navigation"
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
        <BrandLogo
          variant="mark"
          height={markHeight}
          className="bhl-mark"
          style={{
            height: `calc(${markHeight}px * var(--admin-ui-scale))`,
            flexShrink: 0,
            borderRadius: 'var(--radius-md)',
          }}
        />
        <span
          style={{
            fontSize: 'calc(15px * var(--admin-ui-scale))',
            fontWeight: 700,
            letterSpacing: '-0.3px',
            color: 'var(--text-primary)',
            whiteSpace: 'nowrap',
          }}
        >
          IntelMap24
        </span>
      </button>

      {/* Public nav links — hidden by default, staggered reveal on brand hover/focus */}
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

      {/* Mark glow — token-based by default; light theme needs a stronger stop
          (its --accent-glow-strong is too faint to read as a glow). */}
      <style>{`
        .bhl-mark { filter: drop-shadow(0 0 6px var(--accent-glow-strong)); }
        [data-theme="light"] .bhl-mark { filter: drop-shadow(0 0 8px rgba(20, 184, 166, 0.55)); }
      `}</style>
    </div>
  );
}
