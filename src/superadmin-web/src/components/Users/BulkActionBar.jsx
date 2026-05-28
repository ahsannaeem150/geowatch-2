import React from 'react';
import { UserX, UserCheck, Trash2, X } from 'lucide-react';

export default function BulkActionBar({ count, onDeactivate, onActivate, onDelete, onClear }) {
  if (count === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 500,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 20px',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-default)',
        borderRadius: 10,
        boxShadow: 'var(--shadow-lg)',
        animation: 'slideUp 0.2s ease forwards',
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
        {count} selected
      </span>
      <div style={{ width: 1, height: 20, background: 'var(--border-subtle)' }} />
      <BulkBtn icon={UserX} label="Deactivate" onClick={onDeactivate} />
      <BulkBtn icon={UserCheck} label="Activate" onClick={onActivate} />
      <BulkBtn icon={Trash2} label="Delete" danger onClick={onDelete} />
      <div style={{ width: 1, height: 20, background: 'var(--border-subtle)' }} />
      <button
        onClick={onClear}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          padding: 4,
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
        }}
        title="Clear selection"
      >
        <X size={16} />
      </button>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(10px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}

function BulkBtn({ icon: Icon, label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '7px 12px',
        borderRadius: 6,
        border: danger ? '1px solid rgba(244, 63, 94, 0.3)' : '1px solid var(--border-default)',
        background: danger ? 'rgba(244, 63, 94, 0.08)' : 'transparent',
        color: danger ? 'var(--danger)' : 'var(--text-secondary)',
        fontSize: 12,
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily: 'var(--font-sans)',
        whiteSpace: 'nowrap',
        transition: 'all var(--transition-fast)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = danger ? 'rgba(244, 63, 94, 0.15)' : 'var(--bg-hover)';
        e.currentTarget.style.color = danger ? 'var(--danger)' : 'var(--text-primary)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = danger ? 'rgba(244, 63, 94, 0.08)' : 'transparent';
        e.currentTarget.style.color = danger ? 'var(--danger)' : 'var(--text-secondary)';
      }}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}
