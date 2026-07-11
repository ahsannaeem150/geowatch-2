import React from 'react';

export default function WorkspaceRail({ items, activeId, onSelect, compactMode }) {
  return (
    <div
      style={{
        width: 'var(--admin-rail-width)',
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-default)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 'calc(12px * var(--admin-ui-scale)) 0',
        gap: 'calc(8px * var(--admin-ui-scale))',
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
              width: 'calc(44px * var(--admin-ui-scale))',
              height: 'calc(44px * var(--admin-ui-scale))',
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
            <Icon size={compactMode ? 18 : 20} />
            {item.badge > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: 'calc(4px * var(--admin-ui-scale))',
                  right: 'calc(4px * var(--admin-ui-scale))',
                  minWidth: 'calc(16px * var(--admin-ui-scale))',
                  height: 'calc(16px * var(--admin-ui-scale))',
                  padding: '0 calc(4px * var(--admin-ui-scale))',
                  borderRadius: 'calc(8px * var(--admin-ui-scale))',
                  background: 'var(--accent-light)',
                  color: 'var(--text-on-accent)',
                  fontSize: 'calc(10px * var(--admin-ui-scale))',
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
                  top: 'calc(6px * var(--admin-ui-scale))',
                  right: 'calc(6px * var(--admin-ui-scale))',
                  width: 'calc(8px * var(--admin-ui-scale))',
                  height: 'calc(8px * var(--admin-ui-scale))',
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
