import React from 'react';
import { Hexagon, Check, X } from 'lucide-react';

export default function DrawingToolbar({
  hasClosedPolygon = false,
  onSave,
  onCancel,
}) {
  const btnBase = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '7px 14px',
    fontSize: '12px',
    fontWeight: 700,
    letterSpacing: '0.3px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-default)',
    background: 'var(--bg-input)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap',
    userSelect: 'none',
  };

  const saveBtn = hasClosedPolygon
    ? {
        ...btnBase,
        background: 'var(--success-bg, rgba(34,197,94,0.15))',
        color: 'var(--success, #22c55e)',
        borderColor: 'var(--success, #22c55e)',
      }
    : {
        ...btnBase,
        opacity: 0.45,
        cursor: 'not-allowed',
      };

  const cancelBtn = {
    ...btnBase,
    color: 'var(--danger, #ef4444)',
    borderColor: 'rgba(239,68,68,0.4)',
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: '12px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '8px 12px',
        background: 'var(--bg-surface)',
        backdropFilter: 'blur(12px)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div
          style={{
            width: '28px',
            height: '28px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--accent-subtle-bg)',
            color: 'var(--accent-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Hexagon size={14} />
        </div>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Draw zone
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
            Click the map to add points · close the shape to save
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          type="button"
          style={saveBtn}
          onClick={() => hasClosedPolygon && onSave?.()}
          disabled={!hasClosedPolygon}
          title="Save zone"
        >
          <Check size={13} />
          <span>Save</span>
        </button>

        <button
          type="button"
          style={cancelBtn}
          onClick={() => onCancel?.()}
          title="Cancel drawing"
        >
          <X size={13} />
          <span>Cancel</span>
        </button>
      </div>
    </div>
  );
}
