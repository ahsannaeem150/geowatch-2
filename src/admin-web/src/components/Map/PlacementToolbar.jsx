import React from 'react';
import { MapPin, MapPinOff, X } from 'lucide-react';

export default function PlacementToolbar({ markerCoords = null, onClear, onCancel }) {
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

  // Coords can arrive as strings (Postgres DECIMAL) — parseFloat before fixed
  const lat = markerCoords ? parseFloat(markerCoords.lat) : null;
  const lng = markerCoords ? parseFloat(markerCoords.lng) : null;
  const readout =
    markerCoords && Number.isFinite(lat) && Number.isFinite(lng)
      ? `${lat.toFixed(4)}, ${lng.toFixed(4)}`
      : 'No point placed';

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
            <MapPin size={15} />
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
              Place incident
            </div>
            {/* Fixed ch width so the toolbar never resizes as the readout
                changes ("No point placed" → "-90.0000, -180.0000") */}
            <div
              style={{
                fontSize: '10px',
                color: 'var(--text-muted)',
                lineHeight: 1.3,
                marginTop: '1px',
                width: '20ch',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                textAlign: 'left',
              }}
            >
              {readout}
            </div>
          </div>
        </div>

        <div style={divider} />

        {/* Clear / Cancel */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <button
            type="button"
            style={iconBtn(!markerCoords)}
            onClick={() => markerCoords && onClear?.()}
            disabled={!markerCoords}
            title="Clear point"
          >
            <MapPinOff size={14} />
          </button>
          <button
            type="button"
            style={cancelBtn}
            onClick={() => onCancel?.()}
            title="Cancel placement (Esc)"
          >
            <X size={13} />
            <span>Cancel</span>
          </button>
        </div>
      </div>

      {/* Hint line — fixed ch width (longest hint wins, no per-state resize) */}
      <div
        style={{
          fontSize: '10px',
          color: 'var(--text-muted)',
          textAlign: 'left',
          letterSpacing: '0.2px',
          paddingBottom: '2px',
          width: '44ch',
          maxWidth: '100%',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {markerCoords
          ? 'Drag to adjust, or click elsewhere to move'
          : 'Click on the map to place the incident'}
      </div>
    </div>
  );
}
