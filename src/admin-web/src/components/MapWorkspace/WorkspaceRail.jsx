import React from 'react';

export default function WorkspaceRail({ items, activeId, onSelect }) {
  return (
    <div
      style={{
        width: '64px',
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-default)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '12px 0',
        gap: '8px',
        zIndex: 50,
      }}
    >
      {items.map((item) => {
        const Icon = item.icon;
        const active = activeId === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onSelect(active ? null : item.id)}
            title={item.label}
            style={{
              position: 'relative',
              width: '44px',
              height: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: active ? 'var(--accent-subtle-bg)' : 'transparent',
              color: active ? 'var(--accent-light)' : 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (!active) {
                e.currentTarget.style.background = 'var(--bg-hover)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }
            }}
            onMouseLeave={(e) => {
              if (!active) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }
            }}
          >
            <Icon size={20} />
            {item.badge > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  minWidth: '16px',
                  height: '16px',
                  padding: '0 4px',
                  borderRadius: '8px',
                  background: 'var(--accent-light)',
                  color: 'var(--text-on-accent)',
                  fontSize: '10px',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 0 2px var(--bg-surface)',
                }}
              >
                {item.badge > 9 ? '9+' : item.badge}
              </span>
            )}
            {item.overdue && !item.badge && (
              <span
                style={{
                  position: 'absolute',
                  top: '6px',
                  right: '6px',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: 'var(--accent-light)',
                  boxShadow: '0 0 0 2px var(--bg-surface)',
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
