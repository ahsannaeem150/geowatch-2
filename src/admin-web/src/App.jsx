import React from 'react';
import { Button } from '@shared/components/Button.jsx';
import { Badge } from '@shared/components/Badge.jsx';
import { SkeletonBlock } from '@shared/components/Skeleton.jsx';
import { CATEGORY_COLORS } from '@shared/constants.js';

export default function App() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-deep)',
        padding: '40px',
        display: 'flex',
        flexDirection: 'column',
        gap: '32px',
      }}
    >
      <header>
        <h1 style={{ fontSize: 'var(--text-h1)', fontWeight: 700, color: 'var(--accent-cyan)', letterSpacing: '-0.5px' }}>
          GeoWatch Admin
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>Design System Verification — Admin Dashboard</p>
      </header>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h2 style={{ fontSize: 'var(--text-h3)', fontWeight: 600 }}>Admin Actions</h2>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Button variant="primary">Add Event</Button>
          <Button variant="secondary">Filter Map</Button>
          <Button variant="danger">Delete Selected</Button>
          <Button variant="ghost">Cancel</Button>
        </div>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h2 style={{ fontSize: 'var(--text-h3)', fontWeight: 600 }}>Event Categories</h2>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {Object.entries(CATEGORY_COLORS).map(([key, color]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: color, display: 'inline-block' }} />
              <Badge category={key}>{key}</Badge>
            </div>
          ))}
        </div>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h2 style={{ fontSize: 'var(--text-h3)', fontWeight: 600 }}>Data Loading State</h2>
        <div style={{ maxWidth: '500px', padding: '16px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
          <SkeletonBlock lines={5} />
        </div>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h2 style={{ fontSize: 'var(--text-h3)', fontWeight: 600 }}>Status Indicators</h2>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Badge status="active">Active</Badge>
          <Badge status="resolved">Resolved</Badge>
          <Badge status="hidden">Hidden</Badge>
        </div>
      </section>
    </div>
  );
}
