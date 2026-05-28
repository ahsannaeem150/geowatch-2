import React from 'react';
import { Activity } from 'lucide-react';

export default function SystemPage() {
  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>System Health</h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Monitor platform infrastructure</p>
      </div>

      <div
        className="console-card"
        style={{
          padding: '40px',
          textAlign: 'center',
          borderStyle: 'dashed',
        }}
      >
        <Activity size={40} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)' }}>
          System monitoring coming in Phase 8
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', maxWidth: 400, margin: '0 auto' }}>
          Service status grid, DB metrics, API latency charts, incident distribution, and storage usage.
        </p>
      </div>
    </div>
  );
}
