import React from 'react';
import { Download } from 'lucide-react';

export default function ExportPage() {
  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Data Export</h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Export platform data for analysis and backup</p>
      </div>

      <div
        className="console-card"
        style={{
          padding: '40px',
          textAlign: 'center',
          borderStyle: 'dashed',
        }}
      >
        <Download size={40} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)' }}>
          Data export coming in Phase 8
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', maxWidth: 400, margin: '0 auto' }}>
          Select data type, date range, filters, format (CSV/JSON/GeoJSON), preview first rows, and download.
        </p>
      </div>
    </div>
  );
}
