import React from 'react';

const VARIANT_STYLES = {
  primary: {
    background: 'var(--accent-cyan)',
    color: '#0f1117',
    border: 'none',
  },
  secondary: {
    background: 'transparent',
    color: 'var(--accent-cyan)',
    border: '1px solid var(--accent-cyan)',
  },
  danger: {
    background: 'var(--danger)',
    color: '#fff',
    border: 'none',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border-subtle)',
  },
};

const SIZE_STYLES = {
  sm: { padding: '6px 12px', fontSize: '12px' },
  md: { padding: '10px 18px', fontSize: '14px' },
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
  const variantStyle = VARIANT_STYLES[variant] || VARIANT_STYLES.primary;
  const sizeStyle = SIZE_STYLES[size] || SIZE_STYLES.md;

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={{
        ...variantStyle,
        ...sizeStyle,
        borderRadius: 'var(--radius-sm)',
        fontFamily: 'var(--font-sans)',
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all var(--transition-fast)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {children}
    </button>
  );
}
