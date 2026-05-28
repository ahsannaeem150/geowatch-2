import React from 'react';
import { LayoutDashboard, Users, ClipboardList, Activity } from 'lucide-react';

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="console-card" style={{ padding: '20px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
        <Icon size={18} style={{ color }} />
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
        {value}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Dashboard</h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Platform overview and system status</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
        <StatCard label="Total Users" value="—" icon={Users} color="var(--navy-400)" />
        <StatCard label="Incidents Today" value="—" icon={Activity} color="var(--success)" />
        <StatCard label="Audit Events" value="—" icon={ClipboardList} color="var(--warning)" />
        <StatCard label="System Status" value="—" icon={LayoutDashboard} color="var(--info)" />
      </div>

      <div
        className="console-card"
        style={{
          padding: '40px',
          textAlign: 'center',
          borderStyle: 'dashed',
        }}
      >
        <LayoutDashboard size={40} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)' }}>
          Dashboard widgets coming in Phase 5
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', maxWidth: 400, margin: '0 auto' }}>
          Real-time KPI cards, activity sparklines, recent audit feed, and system status indicators will be wired here.
        </p>
      </div>
    </div>
  );
}
