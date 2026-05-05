import React from 'react';
import { Button } from '@shared/components/Button.jsx';
import { Badge } from '@shared/components/Badge.jsx';
import { Skeleton, SkeletonBlock } from '@shared/components/Skeleton.jsx';
import { CATEGORY_COLORS, SEVERITY_SCALE } from '@shared/constants.js';

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
          GeoWatch
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>Design System Verification — User Website</p>
      </header>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h2 style={{ fontSize: 'var(--text-h3)', fontWeight: 600 }}>Buttons</h2>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="ghost">Ghost</Button>
          <Button disabled>Disabled</Button>
        </div>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h2 style={{ fontSize: 'var(--text-h3)', fontWeight: 600 }}>Category Badges</h2>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {Object.entries(CATEGORY_COLORS).map(([key]) => (
            <Badge key={key} category={key}>
              {key}
            </Badge>
          ))}
        </div>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h2 style={{ fontSize: 'var(--text-h3)', fontWeight: 600 }}>Severity Scale</h2>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {SEVERITY_SCALE.map((s) => (
            <Badge key={s.value} status={s.value >= 4 ? 'active' : 'resolved'}>
              {s.label} ({s.value})
            </Badge>
          ))}
        </div>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h2 style={{ fontSize: 'var(--text-h3)', fontWeight: 600 }}>Skeleton Loading</h2>
        <div style={{ maxWidth: '400px', padding: '16px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
          <SkeletonBlock lines={4} />
        </div>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h2 style={{ fontSize: 'var(--text-h3)', fontWeight: 600 }}>Typography & Colors</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p style={{ color: 'var(--text-primary)' }}>Text Primary — {CATEGORY_COLORS.conflict}</p>
          <p style={{ color: 'var(--text-secondary)' }}>Text Secondary</p>
          <p style={{ color: 'var(--text-muted)' }}>Text Muted</p>
          <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', background: 'var(--bg-input)', padding: '2px 6px', borderRadius: 'var(--radius-sm)' }}>
            JetBrains Mono — 13px data
          </code>
        </div>
      </section>
    </div>
  );
}
