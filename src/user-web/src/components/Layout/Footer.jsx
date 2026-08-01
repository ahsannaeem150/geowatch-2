import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity } from 'lucide-react';
import { API_BASE_URL } from '@shared/constants.js';

export default function Footer() {
  // Live backend health — polled from the public /health endpoint
  const [health, setHealth] = useState('checking'); // 'checking' | 'ok' | 'down'
  useEffect(() => {
    let cancelled = false;
    const ping = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/health`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        if (!cancelled) setHealth('ok');
      } catch {
        if (!cancelled) setHealth('down');
      }
    };
    ping();
    const t = setInterval(ping, 60000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  const statusStyle =
    health === 'ok'
      ? {
          background: 'var(--alert-success-bg)',
          border: '1px solid var(--alert-success-border)',
          color: 'var(--success)',
        }
      : {
          background: 'var(--bg-input)',
          border: '1px solid var(--border-subtle)',
          color: 'var(--text-muted)',
        };
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
          backgroundImage: 'linear-gradient(var(--hover-subtle) 1px, transparent 1px), linear-gradient(90deg, var(--hover-subtle) 1px, transparent 1px)',
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
              borderRadius: 'var(--radius-sm)',
              background: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--text-on-accent)',
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
          <Link to="/incidents" style={{ fontSize: '13px', color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.15s ease' }}>
            Incidents
          </Link>
          <Link to="/zones" style={{ fontSize: '13px', color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.15s ease' }}>
            Zones
          </Link>
          <Link to="/about" style={{ fontSize: '13px', color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.15s ease' }}>
            About
          </Link>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            title={health === 'ok' ? 'Backend API reachable' : health === 'down' ? 'Backend API unreachable' : 'Checking backend API…'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              ...statusStyle,
              borderRadius: 'var(--radius-pill)',
              fontSize: '11px',
              fontWeight: 600,
              fontFamily: 'var(--font-mono)',
              transition: 'all 0.3s ease',
            }}
          >
            <Activity size={10} />
            {health === 'ok' ? 'Operational' : health === 'down' ? 'Unreachable' : 'Checking…'}
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, fontFamily: 'var(--font-mono)' }}>
            v1.0.0
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
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
          Real-time conflict intelligence. Data sourced from open channels and verified reports.
        </p>
        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '8px 0 0', fontFamily: 'var(--font-mono)' }}>
          © 2026 GeoWatch
        </p>
      </div>
    </footer>
  );
}
