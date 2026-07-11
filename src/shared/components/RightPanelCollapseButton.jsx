import React from 'react';
import { ChevronRight } from 'lucide-react';

export default function RightPanelCollapseButton({
  onClick,
  title = 'Collapse sidebar',
  style = {},
  iconSize = 14,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        width: 24,
        height: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-sm)',
        color: 'var(--text-muted)',
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'all 0.15s ease',
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--accent-light)';
        e.currentTarget.style.color = 'var(--text-secondary)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-subtle)';
        e.currentTarget.style.color = 'var(--text-muted)';
      }}
    >
      <ChevronRight size={iconSize} />
    </button>
  );
}
