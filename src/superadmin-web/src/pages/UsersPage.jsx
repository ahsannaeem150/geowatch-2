import React from 'react';
import { Users } from 'lucide-react';

export default function UsersPage() {
  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Users</h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Manage platform users, roles, and access</p>
      </div>

      <div
        className="console-card"
        style={{
          padding: '40px',
          textAlign: 'center',
          borderStyle: 'dashed',
        }}
      >
        <Users size={40} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)' }}>
          User management coming in Phase 5
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', maxWidth: 400, margin: '0 auto' }}>
          Full user table with search, filters, sorting, bulk actions, role assignment, and activity history drawers.
        </p>
      </div>
    </div>
  );
}
