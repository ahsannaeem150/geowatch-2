import React, { useState } from 'react';

const VARIANT_STYLES = {
  primary: {
    background: 'var(--accent)',
    color: '#f2f2f2',
    border: 'none',
    hoverBg: 'var(--accent-light)',
    hoverShadow: '0 4px 24px var(--accent-glow-strong)',
  },
  secondary: {
    background: 'transparent',
    color: 'var(--accent-light)',
    border: '1px solid rgba(159, 18, 57, 0.5)',
    hoverBg: 'rgba(90, 1, 28, 0.12)',
    hoverShadow: 'none',
  },
  danger: {
    background: 'var(--danger)',
    color: '#fff',
    border: 'none',
    hoverBg: '#b91c1c',
    hoverShadow: '0 4px 16px var(--danger-glow)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border-subtle)',
    hoverBg: 'var(--bg-hover)',
    hoverShadow: 'none',
  },
};

const SIZE_STYLES = {
  sm: { padding: '6px 12px', fontSize: '12px' },
  md: { padding: '9px 18px', fontSize: '13px' },
  lg: { padding: '14px 24px', fontSize: '16px' },
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
  type = 'button',
  style = {},
}) {
  const [hovered, setHovered] = useState(false);
  const v = VARIANT_STYLES[variant] || VARIANT_STYLES.primary;
  const s = SIZE_STYLES[size] || SIZE_STYLES.md;

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...s,
        borderRadius: 'var(--radius-sm)',
        fontFamily: 'var(--font-sans)',
        fontWeight: 600,
        letterSpacing: '0.2px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all var(--transition-base)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        border: v.border,
        background: hovered && !disabled ? v.hoverBg : v.background,
        color: v.color,
        boxShadow: hovered && !disabled ? v.hoverShadow : 'none',
        transform: hovered && !disabled ? 'translateY(-1px)' : 'none',
        outline: 'none',
        ...style,
      }}
    >
      {children}
    </button>
  );
}
