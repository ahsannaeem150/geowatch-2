import React from 'react';

export default function AboutPage() {
  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '64px 24px' }}>
      <h1
        style={{
          fontSize: '32px',
          fontWeight: 700,
          color: 'var(--text-primary)',
          marginBottom: '16px',
          letterSpacing: '-1px',
        }}
      >
        About GeoWatch
      </h1>

      <p style={{ fontSize: '16px', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '24px' }}>
        GeoWatch is a real-time conflict intelligence platform that monitors and maps global
        incidents as they unfold. From border clashes to diplomatic developments, protests to
        natural disasters — we track it all so you can understand the story behind the headlines.
      </p>

      <h2
        style={{
          fontSize: '18px',
          fontWeight: 700,
          color: 'var(--text-primary)',
          marginTop: '32px',
          marginBottom: '12px',
        }}
      >
        Data Sources
      </h2>
      <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '16px' }}>
        Our data comes from verified open-source channels including news reports, social media
        monitoring, satellite imagery analysis, and on-the-ground partner networks. Every incident
        is tagged with severity, category, location, and timeline updates.
      </p>

      <h2
        style={{
          fontSize: '18px',
          fontWeight: 700,
          color: 'var(--text-primary)',
          marginTop: '32px',
          marginBottom: '12px',
        }}
      >
        Coverage
      </h2>
      <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '16px' }}>
        GeoWatch currently monitors incidents across six categories: Conflict, Protest, Disaster,
        Diplomacy, Humanitarian, and Other. Events are tracked from initial report through
        resolution, with timeline updates providing context as situations develop.
      </p>

      <h2
        style={{
          fontSize: '18px',
          fontWeight: 700,
          color: 'var(--text-primary)',
          marginTop: '32px',
          marginBottom: '12px',
        }}
      >
        Methodology
      </h2>
      <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
        Each incident is assigned a severity score from 1 (Minimal) to 5 (Critical) based on
        factors including casualties, geographic spread, and geopolitical impact. Events remain
        active until marked resolved, with a 24-hour grace period for final updates.
      </p>
    </div>
  );
}
