import React from 'react';
import { ClipboardList } from 'lucide-react';

export default function AuditPage() {
  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Audit Log</h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Immutable record of all platform actions</p>
      </div>

      <div
        className="console-card"
        style={{
          padding: '40px',
          textAlign: 'center',
          borderStyle: 'dashed',
        }}
      >
        <ClipboardList size={40} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)' }}>
          Audit log viewer coming in Phase 6
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', maxWidth: 400, margin: '0 auto' }}>
          Infinite-scroll table with advanced filters, color-coded actions, real-time indicator, and CSV/JSON export.
        </p>
      </div>
    </div>
  );
}
