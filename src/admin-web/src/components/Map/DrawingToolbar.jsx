import React from 'react';

export default function DrawingToolbar({
  mode = 'pan',
  hasClosedPolygon = false,
  selectedZoneId = null,
  onSetMode,
  onSave,
  onCancel,
  onEditZone,
}) {
  const isPolygon = mode === 'polygon';

  const btnBase = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '8px 14px',
    fontSize: '12px',
    fontWeight: 600,
    letterSpacing: '0.3px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-subtle)',
    background: 'var(--bg-elevated)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap',
    userSelect: 'none',
  };

  const btnActive = {
    ...btnBase,
    background: 'var(--accent)',
    color: '#f2f2f2',
    borderColor: 'var(--accent-light)',
    boxShadow: '0 0 12px var(--accent-glow)',
  };

  const btnDisabled = {
    ...btnBase,
    opacity: 0.4,
    cursor: 'not-allowed',
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: '12px',
        right: '12px',
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px',
        background: 'var(--bg-surface)',
        backdropFilter: 'blur(12px)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-lg)',
      }}
    >
      {/* Pan mode */}
      <button
        type="button"
        style={mode === 'pan' ? btnActive : btnBase}
        onClick={() => onSetMode?.('pan')}
        title="Pan mode"
      >
        <span>👆</span>
        <span>Pan</span>
      </button>

      {/* Edit Zone — visible when a zone is selected and not drawing */}
      {mode === 'pan' && selectedZoneId && (
        <button
          type="button"
          style={{ ...btnBase, background: 'rgba(245,158,11,0.15)', color: '#f59e0b', borderColor: '#f59e0b' }}
          onClick={() => onEditZone?.()}
          title="Edit selected zone"
        >
          <span>✎</span>
          <span>Edit Zone</span>
        </button>
      )}

      {/* Polygon mode */}
      <button
        type="button"
        style={isPolygon ? btnActive : btnBase}
        onClick={() => onSetMode?.('polygon')}
        title="Draw polygon zone"
      >
        <span>⬡</span>
        <span>Polygon</span>
      </button>

      {/* Save — only active when polygon is closed */}
      <button
        type="button"
        style={hasClosedPolygon ? { ...btnBase, background: 'var(--success-bg, rgba(34,197,94,0.15))', color: 'var(--success, #22c55e)', borderColor: 'var(--success, #22c55e)' } : btnDisabled}
        onClick={() => hasClosedPolygon && onSave?.()}
        disabled={!hasClosedPolygon}
        title="Save zone"
      >
        <span>✓</span>
        <span>Save</span>
      </button>

      {/* Cancel — only visible during polygon drawing */}
      {isPolygon && (
        <button
          type="button"
          style={{ ...btnBase, color: 'var(--danger, #ef4444)', borderColor: 'rgba(239,68,68,0.4)' }}
          onClick={() => onCancel?.()}
          title="Cancel drawing"
        >
          <span>✕</span>
          <span>Cancel</span>
        </button>
      )}
    </div>
  );
}
