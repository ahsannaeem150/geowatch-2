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
    padding: '8px 14px',
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
    flexShrink: 0,
    userSelect: 'none',
  };

  const iconBtn = (disabled) => ({
    ...btnBase,
    padding: '8px 10px',
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

  const divider = {
    width: '1px',
    alignSelf: 'stretch',
    background: 'var(--border-subtle)',
    flexShrink: 0,
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
        gap: '8px',
        padding: '10px 16px 8px',
        background: 'var(--bg-surface)',
        backdropFilter: 'blur(12px)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        maxWidth: 'calc(100% - 48px)',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <div
            style={{
              width: '30px',
              height: '30px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--accent-subtle-bg)',
              color: 'var(--accent-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Hexagon size={15} />
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
              Draw zone
            </div>
            {/* Fixed ch width so the toolbar never resizes as the readout
                changes ("Pick a tool to start" → "64 vertices · 43024.2k km²") */}
            <div
              style={{
                fontSize: '10px',
                color: 'var(--text-muted)',
                lineHeight: 1.3,
                marginTop: '1px',
                width: '27ch',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                textAlign: 'left',
              }}
            >
              {vertexCount > 0
                ? `${vertexCount} ${vertexCount === 1 ? 'vertex' : 'vertices'}${areaText ? ` · ${areaText}` : ''}`
                : 'Pick a tool to start'}
            </div>
          </div>
        </div>

        <div style={divider} />

        {/* Segmented tool switch */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            flexShrink: 0,
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
                  padding: '6px 12px',
                  gap: '6px',
                  border: 'none',
                  background: active ? 'var(--accent-subtle-bg)' : 'transparent',
                  color: active ? 'var(--accent-light)' : 'var(--text-secondary)',
                }}
              >
                <Icon size={13} />
                <span>{label}</span>
                <span style={{ fontSize: '9px', opacity: 0.6, fontWeight: 800, marginLeft: '2px' }}>{kbd}</span>
              </button>
            );
          })}
        </div>

        <div style={divider} />

        {/* Undo / Redo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <button
            type="button"
            style={iconBtn(!canUndo)}
            onClick={() => canUndo && onUndo?.()}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={14} />
          </button>
          <button
            type="button"
            style={iconBtn(!canRedo)}
            onClick={() => canRedo && onRedo?.()}
            disabled={!canRedo}
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 size={14} />
          </button>
        </div>

        <div style={divider} />

        {/* Save / Cancel */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
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

      {/* Hint line — fixed ch width (longest hint wins, no per-tool resize) */}
      <div
        style={{
          fontSize: '10px',
          color: 'var(--text-muted)',
          textAlign: 'left',
          letterSpacing: '0.2px',
          paddingBottom: '2px',
          width: '78ch',
          maxWidth: '100%',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {TOOL_HINTS[tool] || TOOL_HINTS.polygon}
      </div>
    </div>
  );
}
