import React from 'react';
import { Tags } from 'lucide-react';

export default function DomainsPage() {
  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Domains & Categories</h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Configure incident taxonomy</p>
      </div>

      <div
        className="console-card"
        style={{
          padding: '40px',
          textAlign: 'center',
          borderStyle: 'dashed',
        }}
      >
        <Tags size={40} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)' }}>
          Domain manager coming in Phase 7
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', maxWidth: 400, margin: '0 auto' }}>
          Drag-drop domain/category editor with color pickers, icon selectors, and severity schema configuration.
        </p>
      </div>
    </div>
  );
}
