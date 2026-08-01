import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../useTheme.js';

/**
 * ThemeToggle — neumorphic animated theme switch (shared across all apps).
 * Embossed pill track + raised thumb that slides with a spring; the thumb
 * carries the active theme's icon with a soft glow (crimson accent in both
 * light and dark mode — the site's identity color). All structural colors
 * come from the design tokens so it adapts to every app/theme/style.
 */
export default function ThemeToggle({ size = 18 }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const trackW = Math.round(size * 3); // 54px at size 18
  const trackH = Math.round(size * 1.56); // 28px at size 18
  const thumbD = trackH - 6;
  const travel = trackW - thumbD - 6;
  const sideIconSize = Math.round(size * 0.67);
  const thumbIconSize = Math.round(size * 0.78);

  // Glow always uses the site's crimson accent, both themes.
  const glowColor = 'var(--accent)';
  const glowShadow = 'var(--accent-glow-strong)';

  const trackShadow = isDark
    ? 'inset 0 2px 4px rgba(0, 0, 0, 0.45), inset 0 -1px 2px rgba(255, 255, 255, 0.05)'
    : 'inset 0 1px 3px rgba(31, 20, 16, 0.2), inset 0 -1px 1px rgba(255, 255, 255, 0.75)';
  const thumbShadow = isDark
    ? '0 2px 5px rgba(0, 0, 0, 0.55), inset 0 1px 1px rgba(255, 255, 255, 0.1)'
    : '0 1px 3px rgba(31, 20, 16, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.85)';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-pressed={isDark}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        position: 'relative',
        width: trackW,
        height: trackH,
        borderRadius: trackH,
        border: '1px solid var(--border-subtle)',
        background: 'var(--bg-input)',
        boxShadow: trackShadow,
        cursor: 'pointer',
        padding: 0,
        flexShrink: 0,
        transition: 'background-color 0.2s ease, border-color 0.2s ease',
      }}
    >
      {/* Side guide icons (the thumb covers the active one) */}
      <span
        style={{
          position: 'absolute',
          left: 5,
          top: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          color: 'var(--text-muted)',
          pointerEvents: 'none',
        }}
      >
        <Sun size={sideIconSize} />
      </span>
      <span
        style={{
          position: 'absolute',
          right: 5,
          top: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          color: 'var(--text-muted)',
          pointerEvents: 'none',
        }}
      >
        <Moon size={sideIconSize} />
      </span>

      {/* Raised sliding thumb with the active icon */}
      <motion.span
        initial={false}
        animate={{ x: isDark ? travel : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        style={{
          position: 'absolute',
          top: 2,
          left: 3,
          width: thumbD,
          height: thumbD,
          borderRadius: '50%',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          boxShadow: thumbShadow,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AnimatePresence initial={false}>
          <motion.span
            key={theme}
            initial={{ opacity: 0, rotate: -90, scale: 0.4 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 90, scale: 0.4 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: glowColor,
              filter: `drop-shadow(0 0 3px ${glowShadow})`,
            }}
          >
            {isDark ? <Moon size={thumbIconSize} /> : <Sun size={thumbIconSize} />}
          </motion.span>
        </AnimatePresence>
      </motion.span>
    </button>
  );
}
