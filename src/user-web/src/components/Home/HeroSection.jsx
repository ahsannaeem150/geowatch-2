import React from 'react';
import { Link } from 'react-router-dom';

export default function HeroSection() {
  return (
    <section
      style={{
        background: 'radial-gradient(ellipse 80% 55% at 50% -5%, #1a0a0e 0%, var(--bg-deep) 55%)',
        padding: '80px 24px 64px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '5px 14px',
            background: 'rgba(159, 18, 57, 0.12)',
            border: '1px solid rgba(159, 18, 57, 0.25)',
            borderRadius: 'var(--radius-pill)',
            marginBottom: '24px',
          }}
        >
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: 'var(--danger-light)',
              boxShadow: '0 0 8px var(--accent-glow-strong)',
            }}
          />
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              color: 'var(--accent-light)',
            }}
          >
            Live Monitoring Active
          </span>
        </div>

        <h1
          style={{
            fontSize: 'clamp(36px, 6vw, 52px)',
            fontWeight: 700,
            color: 'var(--text-primary)',
            lineHeight: 1.1,
            letterSpacing: '-1.5px',
            marginBottom: '16px',
          }}
        >
          Conflict Intelligence,
          <br />
          <span style={{ color: 'var(--accent-light)' }}>Mapped in Real Time</span>
        </h1>

        <p
          style={{
            fontSize: '18px',
            color: 'var(--text-secondary)',
            lineHeight: 1.7,
            maxWidth: '560px',
            margin: '0 auto 36px',
          }}
        >
          Track conflicts, protests, and disasters as they unfold. GeoWatch monitors
          global incidents so you can understand the story behind the headlines.
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            to="/map"
            style={{
              padding: '12px 28px',
              background: 'var(--accent)',
              color: '#f2f2f2',
              fontSize: '14px',
              fontWeight: 600,
              borderRadius: 'var(--radius-sm)',
              textDecoration: 'none',
              transition: 'all 0.2s ease',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>🗺️</span>
            Explore the Map
          </Link>
          <Link
            to="/about"
            style={{
              padding: '12px 28px',
              background: 'transparent',
              color: 'var(--text-secondary)',
              fontSize: '14px',
              fontWeight: 600,
              borderRadius: 'var(--radius-sm)',
              textDecoration: 'none',
              border: '1px solid var(--border-subtle)',
              transition: 'all 0.2s ease',
            }}
          >
            Learn More
          </Link>
        </div>
      </div>
    </section>
  );
}
