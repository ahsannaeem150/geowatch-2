import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, AlertTriangle, RefreshCw } from 'lucide-react';
import { listAuditLogs } from '../services/api.js';
import { useEventSource } from '../hooks/useEventSource.js';
import { exportToCsv } from '../utils/csv-export.js';
import AuditFilters from '../components/Audit/AuditFilters.jsx';
import AuditTable from '../components/Audit/AuditTable.jsx';

export default function SystemActivityPage() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [filters, setFilters] = useState({ action: '', userId: '', targetType: '', dateFrom: '', dateTo: '', realm: 'system' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [liveFlash, setLiveFlash] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        realm: 'system',
        ...(filters.action && { action: filters.action }),
        ...(filters.userId && { userId: filters.userId }),
        ...(filters.targetType && { targetType: filters.targetType }),
        ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
        ...(filters.dateTo && { dateTo: filters.dateTo }),
      };
      const data = await listAuditLogs(params);
      setLogs(data.logs || []);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Real-time SSE: refresh audit log when any platform event occurs
  const { connected } = useEventSource({
    onEvent: () => {
      fetchLogs();
      setLiveFlash(true);
      setTimeout(() => setLiveFlash(false), 1200);
    },
  });

  // Reset to page 1 when filters change
  useEffect(() => {
    setPagination((p) => ({ ...p, page: 1 }));
  }, [filters.action, filters.userId, filters.targetType, filters.dateFrom, filters.dateTo]);

  const handleExport = () => {
    if (logs.length === 0) return;
    const rows = logs.map((log) => ({
      time: log.created_at,
      user_email: log.user_email || 'system',
      user_name: log.user_full_name || '',
      action: log.action,
      target_type: log.target_type || '',
      target_id: log.target_id || '',
      details: JSON.stringify(log.details || {}),
      ip_address: log.ip_address || '',
      user_agent: log.user_agent || '',
    }));
    const timestamp = new Date().toISOString().slice(0, 10);
    exportToCsv(rows, `geowatch-audit-${timestamp}.csv`);
  };

  const handleUserClick = (userId) => {
    setFilters((f) => ({ ...f, userId }));
  };

  const handleTargetClick = (targetType, targetId) => {
    if (targetType === 'user') {
      navigate(`/superadmin/users`);
    } else if (targetType === 'incident') {
      // Could navigate to incident detail in admin-web
      // For now, just filter audit by this target
      setFilters((f) => ({ ...f, targetType, targetId }));
    } else {
      setFilters((f) => ({ ...f, targetType, targetId }));
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>System Activity</h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Immutable record of staff actions on the platform</p>
        </div>
        <button
          onClick={fetchLogs}
          disabled={loading}
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
            cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-sans)',
            opacity: loading ? 0.6 : 1,
          }}
          onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.color = 'var(--text-primary)'; } }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
        >
          <RefreshCw size={14} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 16px',
            background: 'var(--alert-error-bg)',
            border: '1px solid var(--alert-error-border)',
            borderRadius: 8,
            color: 'var(--danger)',
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          <AlertTriangle size={16} />
          {error}
          <button
            onClick={() => setError('')}
            style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 12 }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filters */}
      <AuditFilters
        filters={filters}
        onChange={setFilters}
        onExport={handleExport}
        canExport={logs.length > 0}
      />

      {/* Summary bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '10px 0',
          marginBottom: 8,
          fontSize: 12,
          color: 'var(--text-muted)',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Shield size={14} />
          {pagination.total} total entries
        </span>
        {logs.length > 0 && (
          <span>
            Showing page {pagination.page} of {pagination.totalPages}
          </span>
        )}
      </div>

      {/* Table */}
      <AuditTable
        logs={logs}
        pagination={pagination}
        loading={loading}
        onPageChange={(page) => setPagination((p) => ({ ...p, page }))}
        onUserClick={handleUserClick}
        onTargetClick={handleTargetClick}
      />
    </div>
  );
}
