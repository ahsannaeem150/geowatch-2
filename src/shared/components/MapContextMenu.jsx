import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Shared map context menu.
 *
 * Props:
 * - items: Array of menu items. Each item can be:
 *     { label, onClick, danger?: boolean, disabled?: boolean, icon?: ReactNode }
 *   Or a separator:
 *     { type: 'separator' }
 * - position: { x, y } in client coordinates.
 * - onClose: called when the menu should close.
 */
export default function MapContextMenu({ items = [], position, onClose }) {
  const menuRef = useRef(null);
  const [adjusted, setAdjusted] = useState(null);

  // Measure the rendered menu and adjust so it stays inside the viewport.
  useLayoutEffect(() => {
    if (!menuRef.current || !position) return;
    const rect = menuRef.current.getBoundingClientRect();
    const x = Math.min(position.x, window.innerWidth - rect.width - 8);
    const y = Math.min(position.y, window.innerHeight - rect.height - 8);
    setAdjusted({
      x: Math.max(8, x),
      y: Math.max(8, y),
    });
  }, [position]);

  // Close on click outside or Escape.
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const renderItem = (item, index) => {
    if (item.type === 'separator') {
      return (
        <div
          key={`sep-${index}`}
          style={{
            margin: '4px 10px',
            borderTop: '1px solid var(--border-subtle)',
          }}
        />
      );
    }

    const { label, onClick, danger = false, disabled = false, icon = null } = item;

    return (
      <button
        key={`item-${index}`}
        type="button"
        disabled={disabled}
        onClick={(e) => {
          if (!disabled) {
            onClick?.(e);
          }
          onClose();
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          padding: '8px 14px',
          textAlign: 'left',
          background: 'transparent',
          border: 'none',
          color: danger ? 'var(--danger)' : 'var(--text-primary)',
          fontSize: '13px',
          fontFamily: 'var(--font-sans)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.4 : 1,
          transition: 'background var(--transition-fast)',
        }}
        onMouseEnter={(e) => {
          if (!disabled) {
            e.currentTarget.style.background = 'var(--bg-elevated)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
      >
        {icon && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              marginRight: '8px',
              color: 'inherit',
            }}
          >
            {icon}
          </span>
        )}
        {label}
      </button>
    );
  };

  if (!position) return null;

  const left = adjusted ? adjusted.x : position.x;
  const top = adjusted ? adjusted.y : position.y;

  return createPortal(
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        left,
        top,
        zIndex: 9999,
        minWidth: '160px',
        maxWidth: '280px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-sm)',
        boxShadow: 'var(--shadow-lg)',
        padding: '4px 0',
        visibility: adjusted ? 'visible' : 'hidden',
        userSelect: 'none',
        overflow: 'hidden',
      }}
    >
      {items.map(renderItem)}
    </div>,
    document.body
  );
}
