import React, { useState, useEffect, useCallback } from 'react';
import {
  Trash2,
  RotateCcw,
  AlertTriangle,
  RefreshCw,
  Clock,
  MapPin,
  AlertCircle,
  Search,
  Shield,
} from 'lucide-react';
import { listDeletedIncidents, restoreIncident, purgeIncident } from '../services/api.js';
import { useEventSource } from '../hooks/useEventSource.js';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function daysRemaining(deletedAt) {
  const deleted = new Date(deletedAt);
  const now = new Date();
  const diffMs = now - deleted;
  const days = Math.floor((30 * 24 * 60 * 60 * 1000 - diffMs) / (24 * 60 * 60 * 1000));
  return Math.max(0, days);
}

export default function RecycleBinPage() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState({});
  const [liveFlash, setLiveFlash] = useState(false);

  const fetchDeleted = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listDeletedIncidents();
      setIncidents(data?.incidents || []);
    } catch (err) {
      setError(err.message || 'Failed to load recycle bin');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeleted();
  }, [fetchDeleted]);

  // Real-time SSE: refresh when incidents are deleted/restored
  const handleSseEvent = useCallback((event) => {
    if (event.type === 'incident_deleted' || event.type === 'incident_created') {
      fetchDeleted();
      setLiveFlash(true);
      setTimeout(() => setLiveFlash(false), 1200);
    }
  }, [fetchDeleted]);

  const { connected } = useEventSource({ onEvent: handleSseEvent });

  const handleRestore = async (id) => {
    setActionLoading((prev) => ({ ...prev, [id]: 'restore' }));
    try {
      await restoreIncident(id);
      setIncidents((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      setError(err.message || 'Failed to restore incident');
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: null }));
    }
  };

  const handlePurge = async (id) => {
    setActionLoading((prev) => ({ ...prev, [id]: 'purge' }));
    try {
      await purgeIncident(id);
      setIncidents((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      setError(err.message || 'Failed to purge incident');
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: null }));
    }
  };

  const filtered = incidents.filter((i) => {
    const q = search.toLowerCase();
    return (
      i.title?.toLowerCase().includes(q) ||
      i.description?.toLowerCase().includes(q) ||
      i.category_name?.toLowerCase().includes(q) ||
      i.domain_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Recycle Bin</h1>
            {connected && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 12,
                  background: liveFlash ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.1)',
                  color: '#22c55e',
                  transition: 'background 0.3s',
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#22c55e',
                    animation: 'pulse 2s infinite',
                  }}
                />
                Live
              </span>
            )}
          </div>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>
            Deleted incidents are retained for 30 days before permanent removal
          </p>
        </div>
        <button
          onClick={fetchDeleted}
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
            background: 'rgba(244, 63, 94, 0.08)',
            border: '1px solid rgba(244, 63, 94, 0.2)',
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

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 14px',
            borderRadius: 8,
            border: '1px solid var(--border-default)',
            background: 'var(--bg-elevated)',
            maxWidth: 400,
          }}
        >
          <Search size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search deleted incidents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: 14,
              fontFamily: 'var(--font-sans)',
            }}
          />
        </div>
      </div>

      {/* Stats bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          padding: '10px 0',
          marginBottom: 8,
          fontSize: 12,
          color: 'var(--text-muted)',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Trash2 size={14} />
          {incidents.length} deleted
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <AlertCircle size={14} />
          {incidents.filter((i) => daysRemaining(i.deleted_at) <= 3).length} expiring soon (≤3 days)
        </span>
        {filtered.length !== incidents.length && (
          <span>{filtered.length} matching search</span>
        )}
      </div>

      {/* Table */}
      <div
        style={{
          background: 'var(--bg-surface)',
          borderRadius: 10,
          border: '1px solid var(--border-subtle)',
          overflow: 'hidden',
        }}
      >
        {filtered.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              padding: '60px 20px',
              color: 'var(--text-muted)',
            }}
          >
            <Trash2 size={40} style={{ opacity: 0.3 }} />
            <p style={{ fontSize: 15, fontWeight: 500 }}>
              {search ? 'No incidents match your search' : 'Recycle bin is empty'}
            </p>
            <p style={{ fontSize: 13 }}>
              {search ? 'Try a different search term' : 'Deleted incidents will appear here for 30 days'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg-elevated)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid var(--border-subtle)' }}>Incident</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid var(--border-subtle)' }}>Category</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid var(--border-subtle)' }}>Severity</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid var(--border-subtle)' }}>Deleted</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid var(--border-subtle)' }}>By</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid var(--border-subtle)' }}>Days Left</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid var(--border-subtle)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((incident) => {
                  const daysLeft = daysRemaining(incident.deleted_at);
                  const isActionLoading = actionLoading[incident.id];
                  return (
                    <tr
                      key={incident.id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        transition: 'background var(--transition-fast)',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{incident.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <MapPin size={11} />
                          {parseFloat(incident.latitude)?.toFixed(4)}, {parseFloat(incident.longitude)?.toFixed(4)}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              background: incident.domain_color || '#6366f1',
                            }}
                          />
                          <span>{incident.category_name}</span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 14 }}>{incident.domain_name}</div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '3px 10px',
                            borderRadius: 12,
                            fontSize: 12,
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            background:
                              incident.severity === 'critical'
                                ? 'rgba(244, 63, 94, 0.12)'
                                : incident.severity === 'high'
                                ? 'rgba(249, 115, 22, 0.12)'
                                : incident.severity === 'medium'
                                ? 'rgba(234, 179, 8, 0.12)'
                                : 'rgba(34, 197, 94, 0.12)',
                            color:
                              incident.severity === 'critical'
                                ? '#f43f5e'
                                : incident.severity === 'high'
                                ? '#f97316'
                                : incident.severity === 'medium'
                                ? '#eab308'
                                : '#22c55e',
                          }}
                        >
                          {incident.severity}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {formatDate(incident.deleted_at)}
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                        {incident.deleted_by_name || incident.deleted_by_email || 'Unknown'}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '3px 10px',
                            borderRadius: 12,
                            fontSize: 12,
                            fontWeight: 600,
                            background: daysLeft <= 3 ? 'rgba(244, 63, 94, 0.12)' : 'rgba(99, 102, 241, 0.12)',
                            color: daysLeft <= 3 ? '#f43f5e' : '#818cf8',
                          }}
                        >
                          <Clock size={11} />
                          {daysLeft}d
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => handleRestore(incident.id)}
                            disabled={!!isActionLoading}
                            title="Restore"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '6px 12px',
                              borderRadius: 6,
                              border: '1px solid rgba(34, 197, 94, 0.3)',
                              background: 'rgba(34, 197, 94, 0.08)',
                              color: '#22c55e',
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: isActionLoading ? 'not-allowed' : 'pointer',
                              opacity: isActionLoading ? 0.5 : 1,
                              fontFamily: 'var(--font-sans)',
                            }}
                            onMouseEnter={(e) => { if (!isActionLoading) { e.currentTarget.style.background = 'rgba(34, 197, 94, 0.15)'; } }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(34, 197, 94, 0.08)'; }}
                          >
                            <RotateCcw size={13} />
                            {isActionLoading === 'restore' ? 'Restoring...' : 'Restore'}
                          </button>
                          <button
                            onClick={() => handlePurge(incident.id)}
                            disabled={!!isActionLoading}
                            title="Permanently Delete"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '6px 12px',
                              borderRadius: 6,
                              border: '1px solid rgba(244, 63, 94, 0.3)',
                              background: 'rgba(244, 63, 94, 0.08)',
                              color: '#f43f5e',
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: isActionLoading ? 'not-allowed' : 'pointer',
                              opacity: isActionLoading ? 0.5 : 1,
                              fontFamily: 'var(--font-sans)',
                            }}
                            onMouseEnter={(e) => { if (!isActionLoading) { e.currentTarget.style.background = 'rgba(244, 63, 94, 0.15)'; } }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(244, 63, 94, 0.08)'; }}
                          >
                            <Trash2 size={13} />
                            {isActionLoading === 'purge' ? 'Purging...' : 'Purge'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
