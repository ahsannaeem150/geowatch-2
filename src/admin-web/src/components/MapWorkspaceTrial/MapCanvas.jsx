import React from 'react';
import { Map as MapIcon, MousePointer2 } from 'lucide-react';

export default function MapCanvas({ label = 'Map Canvas', hint = 'Empty background for layout trial' }) {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: `
          radial-gradient(ellipse 80% 60% at 50% 10%, var(--accent-glow) 0%, transparent 55%),
          radial-gradient(ellipse 60% 40% at 80% 80%, var(--info-glow) 0%, transparent 50%),
          var(--bg-deep)
        `,
        overflow: 'hidden',
      }}
    >
      {/* Grid overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(var(--border-subtle) 1px, transparent 1px),
            linear-gradient(90deg, var(--border-subtle) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          pointerEvents: 'none',
        }}
      />

      {/* Crosshair center */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '120px',
          height: '120px',
          border: '1px dashed var(--border-default)',
          borderRadius: '50%',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '8px',
          height: '8px',
          background: 'var(--accent)',
          borderRadius: '50%',
          boxShadow: '0 0 20px var(--accent)',
          pointerEvents: 'none',
        }}
      />

      {/* Placeholder label */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          color: 'var(--text-muted)',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            margin: '0 auto 16px',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MapIcon size={32} />
        </div>
        <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-secondary)' }}>
          {label}
        </div>
        <div style={{ fontSize: '13px', marginTop: '6px' }}>{hint}</div>
        <div
          style={{
            marginTop: '20px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '12px',
          }}
        >
          <MousePointer2 size={12} />
          Map interactions disabled in layout trial
        </div>
      </div>

      {/* Fake coordinate readout */}
      <div
        style={{
          position: 'absolute',
          bottom: '16px',
          left: '16px',
          padding: '8px 12px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '11px',
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-muted)',
          pointerEvents: 'none',
        }}
      >
        LAT 34.0522 · LNG -118.2437 · ZOOM 6
      </div>
    </div>
  );
}
