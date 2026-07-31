import React from 'react';
import { Hexagon, MousePointer2, Circle, Undo2, Redo2, Check, X } from 'lucide-react';

const TOOLS = [
  { id: 'pan', label: 'Pan', kbd: 'V', Icon: MousePointer2 },
  { id: 'polygon', label: 'Polygon', kbd: 'P', Icon: Hexagon },
  { id: 'circle', label: 'Circle', kbd: 'C', Icon: Circle },
];

const TOOL_HINTS = {
  pan: 'Drag to pan the map · V/P/C switch tool · Esc cancel',
  polygon: 'Click to add vertex · Double-click or Enter to finish · Ctrl+Z undo · Esc cancel',
  circle: 'Click center, drag to set radius · Click again to finish · Esc cancel',
};

export default function DrawingToolbar({
  tool = 'polygon',
  onToolChange,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onCancel,
  onSave,
  vertexCount = 0,
  areaText = null,
  isClosed = false,
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

  const iconBtn = (disabled) => ({
    ...btnBase,
    padding: '7px 9px',
    opacity: disabled ? 0.4 : 1,
    cursor: disabled ? 'not-allowed' : 'pointer',
  });

  const canSave = isClosed || vertexCount >= 3;

  const saveBtn = canSave
    ? {
        ...btnBase,
        background: 'var(--success-bg, rgba(34,197,94,0.15))',
        color: 'var(--success, #22c55e)',
        border: '1px solid var(--success, #22c55e)',
      }
    : {
        ...btnBase,
        opacity: 0.45,
        cursor: 'not-allowed',
      };

  const cancelBtn = {
    ...btnBase,
    color: 'var(--danger, #ef4444)',
    border: '1px solid rgba(239,68,68,0.4)',
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
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: '6px',
        padding: '8px 12px',
        background: 'var(--bg-surface)',
        backdropFilter: 'blur(12px)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Title */}
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
              {vertexCount > 0
                ? `${vertexCount} ${vertexCount === 1 ? 'vertex' : 'vertices'}${areaText ? ` · ${areaText}` : ''}`
                : 'Pick a tool to start'}
            </div>
          </div>
        </div>

        {/* Segmented tool switch */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            padding: '2px',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          {TOOLS.map(({ id, label, kbd, Icon }) => {
            const active = tool === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onToolChange?.(id)}
                title={`${label} (${kbd})`}
                style={{
                  ...btnBase,
                  padding: '5px 10px',
                  gap: '5px',
                  border: 'none',
                  background: active ? 'var(--accent-subtle-bg)' : 'transparent',
                  color: active ? 'var(--accent-light)' : 'var(--text-secondary)',
                }}
              >
                <Icon size={13} />
                <span>{label}</span>
                <span style={{ fontSize: '9px', opacity: 0.6, fontWeight: 800 }}>{kbd}</span>
              </button>
            );
          })}
        </div>

        {/* Undo / Redo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            type="button"
            style={iconBtn(!canUndo)}
            onClick={() => canUndo && onUndo?.()}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={13} />
          </button>
          <button
            type="button"
            style={iconBtn(!canRedo)}
            onClick={() => canRedo && onRedo?.()}
            disabled={!canRedo}
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 size={13} />
          </button>
        </div>

        {/* Save / Cancel */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            style={cancelBtn}
            onClick={() => onCancel?.()}
            title="Cancel drawing (Esc)"
          >
            <X size={13} />
            <span>Cancel</span>
          </button>
          <button
            type="button"
            style={saveBtn}
            onClick={() => canSave && onSave?.()}
            disabled={!canSave}
            title="Save zone"
          >
            <Check size={13} />
            <span>Save</span>
          </button>
        </div>
      </div>

      {/* Hint line */}
      <div
        style={{
          fontSize: '10px',
          color: 'var(--text-muted)',
          textAlign: 'center',
          letterSpacing: '0.2px',
        }}
      >
        {TOOL_HINTS[tool] || TOOL_HINTS.polygon}
      </div>
    </div>
  );
}
