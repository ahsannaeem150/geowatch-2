import React from 'react';
import { Link } from 'react-router-dom';
import { Activity } from 'lucide-react';

export default function Footer() {
  return (
    <footer
      style={{
        borderTop: '1px solid var(--border-subtle)',
        background: 'var(--bg-surface)',
        padding: '40px 24px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle grid texture */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'linear-gradient(rgba(159, 18, 57, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(159, 18, 57, 0.02) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '6px',
              background: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: 700,
              color: '#f2f2f2',
              fontFamily: 'var(--font-mono)',
            }}
          >
            G
          </div>
          <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
            GeoWatch
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
          <Link to="/map" style={{ fontSize: '13px', color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.15s ease' }}>
            Map
          </Link>
          <Link to="/about" style={{ fontSize: '13px', color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.15s ease' }}>
            About
          </Link>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            API Docs
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              background: 'rgba(34, 197, 94, 0.08)',
              border: '1px solid rgba(34, 197, 94, 0.2)',
              borderRadius: 'var(--radius-pill)',
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--success)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <Activity size={10} />
            Operational
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, fontFamily: 'var(--font-mono)' }}>
            v1.0.4
          </p>
        </div>
      </div>

      <div
        style={{
          maxWidth: '1200px',
          margin: '24px auto 0',
          paddingTop: '20px',
          borderTop: '1px solid var(--border-subtle)',
          textAlign: 'center',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
          Real-time conflict intelligence. Data sourced from open channels and verified reports.
        </p>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '8px 0 0', fontFamily: 'var(--font-mono)' }}>
          © 2026 GeoWatch
        </p>
      </div>
    </footer>
  );
}
