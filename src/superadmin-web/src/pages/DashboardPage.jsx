import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Activity,
  ClipboardList,
  LayoutDashboard,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  ArrowRight,
  Zap,
  UserPlus,
  Download,
} from 'lucide-react';
import { listUsers, getIncidents, getAuditSummary, getSystemHealth, listAuditLogs } from '../services/api.js';
import { useEventSource } from '../hooks/useEventSource.js';
import { formatDistanceToNow } from 'date-fns';
import { getAuditActionColor } from '../utils/audit-colors.js';

function KPICard({ label, value, subtext, icon: Icon, color, loading, onClick }) {
  return (
    <div
      className="console-card"
      style={{
        padding: '20px 24px',
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden',
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (onClick) e.currentTarget.style.borderColor = 'var(--border-strong)';
      }}
      onMouseLeave={(e) => {
        if (onClick) e.currentTarget.style.borderColor = 'var(--border-subtle)';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </span>
        <Icon size={18} style={{ color, opacity: 0.9 }} />
      </div>
      <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1.2 }}>
        {loading ? '—' : value}
      </div>
      {subtext && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
          {subtext}
        </div>
      )}
    </div>
  );
}

function StatusDot({ status }) {
  const colors = {
    healthy: 'var(--success)',
    degraded: 'var(--warning)',
    unhealthy: 'var(--danger)',
  };
  return (
    <span
      style={{
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: colors[status] || 'var(--text-muted)',
        boxShadow: `0 0 6px ${colors[status] || 'var(--text-muted)'}`,
      }}
    />
  );
}

function AuditBadge({ action }) {
  const color = getAuditActionColor(action);
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        padding: '3px 8px',
        borderRadius: 4,
        background: `${color}18`,
        color,
        fontFamily: 'var(--font-mono)',
      }}
    >
      {action.replace(/_/g, ' ')}
    </span>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    incidentsToday: 0,
    auditEventsToday: 0,
    systemStatus: 'unknown',
  });
  const [recentLogs, setRecentLogs] = useState([]);
  const [systemDetails, setSystemDetails] = useState(null);
  const [liveIndicator, setLiveIndicator] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [usersRes, incidentsRes, auditSummary, health, logsRes] = await Promise.all([
        listUsers({ limit: 1 }),
        getIncidents({ date: today }),
        getAuditSummary(),
        getSystemHealth(),
        listAuditLogs({ limit: 10 }),
      ]);

      setMetrics({
        totalUsers: usersRes.pagination?.total || 0,
        incidentsToday: incidentsRes.count || 0,
        auditEventsToday: auditSummary.totalToday || 0,
        systemStatus: health.status || 'unknown',
      });
      setSystemDetails(health);
      setRecentLogs(logsRes.logs || []);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time SSE: refresh dashboard when incidents change
  const { connected } = useEventSource({
    onEvent: (data) => {
      const refreshTypes = ['incident_created', 'incident_updated', 'incident_deleted', 'incident_resolved', 'timeline_added', 'source_added'];
      if (refreshTypes.includes(data.type)) {
        fetchData();
        setLiveIndicator(true);
        setTimeout(() => setLiveIndicator(false), 1500);
      }
    },
  });

  const systemStatusLabel = metrics.systemStatus === 'healthy' ? 'Healthy' : metrics.systemStatus === 'degraded' ? 'Degraded' : 'Unhealthy';
  const systemStatusColor = metrics.systemStatus === 'healthy' ? 'var(--success)' : metrics.systemStatus === 'degraded' ? 'var(--warning)' : 'var(--danger)';

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Dashboard</h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Platform overview and system status</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {connected && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 11,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: liveIndicator ? 'var(--success)' : 'var(--text-muted)',
                transition: 'color 0.3s ease',
                padding: '4px 10px',
                borderRadius: 6,
                background: liveIndicator ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                border: liveIndicator ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid transparent',
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: 'var(--success)',
                  boxShadow: liveIndicator ? '0 0 8px var(--success)' : 'none',
                  transition: 'box-shadow 0.3s ease',
                  animation: 'pulse-dot 2s ease-in-out infinite',
                }}
              />
              Live
            </span>
          )}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => navigate('/superadmin/users')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid var(--border-default)',
              background: 'var(--bg-elevated)',
              color: 'var(--text-secondary)',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            <UserPlus size={15} />
            Create user
          </button>
          <button
            onClick={() => navigate('/superadmin/export')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid var(--border-default)',
              background: 'var(--bg-elevated)',
              color: 'var(--text-secondary)',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            <Download size={15} />
            Export
          </button>
        </div>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: '12px 16px',
            background: 'rgba(244, 63, 94, 0.08)',
            border: '1px solid rgba(244, 63, 94, 0.2)',
            borderRadius: 8,
            color: 'var(--danger)',
            fontSize: 13,
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16, marginBottom: 28 }}>
        <KPICard
          label="Total Users"
          value={metrics.totalUsers}
          icon={Users}
          color="var(--navy-400)"
          loading={loading}
          onClick={() => navigate('/superadmin/users')}
        />
        <KPICard
          label="Incidents Today"
          value={metrics.incidentsToday}
          subtext={today}
          icon={Activity}
          color="var(--success)"
          loading={loading}
        />
        <KPICard
          label="Audit Events Today"
          value={metrics.auditEventsToday}
          icon={ClipboardList}
          color="var(--warning)"
          loading={loading}
          onClick={() => navigate('/superadmin/audit')}
        />
        <KPICard
          label="System Status"
          value={systemStatusLabel}
          subtext={systemDetails && `DB: ${systemDetails.services?.database?.status} · SSE: ${systemDetails.services?.sse?.clients} clients`}
          icon={metrics.systemStatus === 'healthy' ? ShieldCheck : metrics.systemStatus === 'degraded' ? ShieldAlert : AlertTriangle}
          color={systemStatusColor}
          loading={loading}
          onClick={() => navigate('/superadmin/system')}
        />
      </div>

      {/* Recent Activity */}
      <div className="console-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Zap size={16} style={{ color: 'var(--navy-400)' }} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>Recent Activity</span>
          </div>
          <button
            onClick={() => navigate('/superadmin/audit')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              background: 'transparent',
              border: 'none',
              color: 'var(--navy-400)',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
          >
            View all <ArrowRight size={12} />
          </button>
        </div>

        <div style={{ padding: '4px 0' }}>
          {loading ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
              Loading recent activity...
            </div>
          ) : recentLogs.length === 0 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
              No activity recorded yet
            </div>
          ) : (
            recentLogs.map((log) => (
              <div
                key={log.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 20px',
                  borderBottom: '1px solid var(--border-subtle)',
                  transition: 'background var(--transition-fast)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <AuditBadge action={log.action} />
                  <div>
                    <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                      {log.user_email || 'System'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>
                      {log.target_type} {log.target_id?.slice(0, 8)}...
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
