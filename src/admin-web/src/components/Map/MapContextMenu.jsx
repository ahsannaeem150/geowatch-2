import React, { useRef, useEffect } from 'react';

export default function MapContextMenu({ items, position, onClose }) {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        zIndex: 100,
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-sm)',
        boxShadow: 'var(--shadow-lg)',
        padding: '4px 0',
        minWidth: '140px',
        fontSize: '13px',
        userSelect: 'none',
      }}
    >
      {items.map((item, i) => (
        <button
          key={i}
          onClick={item.onClick}
          style={{
            display: 'block',
            width: '100%',
            padding: '8px 14px',
            textAlign: 'left',
            background: 'none',
            border: 'none',
            color: item.danger ? 'var(--danger, #ef4444)' : 'var(--text-primary)',
            fontSize: '13px',
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--bg-elevated)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'none';
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
