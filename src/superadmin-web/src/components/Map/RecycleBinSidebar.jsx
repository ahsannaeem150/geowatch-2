import React, { useState, useEffect, useCallback } from 'react';
import { PanelLeftClose, X, ArrowLeft, ChevronLeft, ChevronRight, Search, Trash2, Clock } from 'lucide-react';
import { listDeletedIncidents } from '../../services/api.js';
import { formatDistanceToNow } from 'date-fns';

function toStartOfDayIso(date) {
  if (!date) return '';
  return new Date(`${date}T00:00:00.000Z`).toISOString();
}

function toEndOfDayIso(date) {
  if (!date) return '';
  return new Date(`${date}T23:59:59.999Z`).toISOString();
}

function getSeverityColor(severity) {
  const s = String(severity).toLowerCase();
  if (s === 'critical' || severity === 5) return '#f43f5e';
  if (s === 'high' || severity === 4) return '#f97316';
  if (s === 'medium' || severity === 3) return '#eab308';
  return '#22c55e';
}

export default function RecycleBinSidebar({
  selectedIncidentId,
  onIncidentClick,
  onToggleCollapse,
  onClose,
  onBackToRecycleBin,
}) {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState(null);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      const dateFromIso = toStartOfDayIso(dateFrom);
      const dateToIso = toEndOfDayIso(dateTo);
      if (dateFromIso) params.dateFrom = dateFromIso;
      if (dateToIso) params.dateTo = dateToIso;
      if (search.trim()) params.search = search.trim();

      const data = await listDeletedIncidents(params);
      setIncidents(data?.incidents || []);
      setPagination(data?.pagination || null);
    } catch (err) {
      console.error('Failed to load recycle bin:', err);
      setIncidents([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, [page, limit, dateFrom, dateTo, search]);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  const inputStyle = {
    width: '100%',
    padding: '6px 8px',
    background: 'var(--bg-input)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-sans)',
    fontSize: 12,
    outline: 'none',
  };

  const labelStyle = {
    display: 'block',
    fontSize: 10,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: 'var(--text-muted)',
    marginBottom: 4,
  };

  return (
    <div
      style={{
        width: '320px',
        minWidth: '320px',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-subtle)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          padding: '14px 16px',
          borderBottom: '1px solid var(--border-subtle)',
          flexShrink: 0,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--text-primary)',
            }}
          >
            <Trash2 size={14} style={{ color: 'var(--danger)' }} />
            <span>Recycle Bin</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            {pagination ? `${pagination.total} deleted` : `${incidents.length} deleted`}
          </div>
          {onBackToRecycleBin && (
            <button
              type="button"
              onClick={onBackToRecycleBin}
              title="Back to Recycle Bin"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                marginTop: 8,
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--navy-500)',
                background: 'linear-gradient(135deg, var(--navy-600), var(--navy-700))',
                color: '#fff',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
              }}
            >
              <ArrowLeft size={12} />
              Back to Recycle Bin
            </button>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Collapse sidebar"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
              background: 'transparent',
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            <PanelLeftClose size={14} />
          </button>
          <button
            type="button"
            onClick={onClose}
            title="Close recycle bin view"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
              background: 'transparent',
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          flexShrink: 0,
        }}
      >
        <div>
          <label style={labelStyle}>Search</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Title, description, location..."
              value={search}
              onChange={(e) => { setPage(1); setSearch(e.target.value); }}
              style={{ ...inputStyle, padding: '5px 8px' }}
            />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Date deleted</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setPage(1); setDateFrom(e.target.value); }}
              style={inputStyle}
            />
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>→</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setPage(1); setDateTo(e.target.value); }}
              style={inputStyle}
            />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Per page</label>
          <select
            value={limit}
            onChange={(e) => { setPage(1); setLimit(parseInt(e.target.value, 10)); }}
            style={inputStyle}
          >
            <option value={10}>10 / page</option>
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
          </select>
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0', color: 'var(--text-muted)', gap: 8 }}>
            <Trash2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: 13 }}>Loading recycle bin…</span>
          </div>
        ) : incidents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13 }}>
            No deleted incidents match your filters
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {incidents.map((incident) => {
              const isSelected = selectedIncidentId === incident.id;
              const sevColor = getSeverityColor(incident.severity);
              return (
                <button
                  key={incident.id}
                  type="button"
                  onClick={() => onIncidentClick?.(incident)}
                  style={{
                    width: '100%',
                    padding: 10,
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    background: isSelected ? 'var(--bg-hover)' : 'var(--bg-elevated)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-sans)',
                    color: 'inherit',
                    transition: 'background 0.15s ease, border-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-default)';
                    if (!isSelected) e.currentTarget.style.background = 'var(--bg-hover)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-subtle)';
                    e.currentTarget.style.background = isSelected ? 'var(--bg-hover)' : 'var(--bg-elevated)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        lineHeight: 1.4,
                        wordBreak: 'break-word',
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      {incident.title}
                    </div>
                    <span
                      style={{
                        flexShrink: 0,
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 'var(--radius-sm)',
                        background: `${sevColor}18`,
                        color: sevColor,
                        textTransform: 'uppercase',
                      }}
                    >
                      {incident.severity}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>
                    Deleted {formatDistanceToNow(new Date(incident.deleted_at), { addSuffix: true })}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    {incident.domain_name && (
                      <span style={{ fontSize: 10, color: incident.domain_color || 'var(--text-muted)', fontWeight: 600 }}>
                        {incident.domain_name}
                      </span>
                    )}
                    {incident.deleted_by_name && (
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        by {incident.deleted_by_name}
                      </span>
                    )}
                    <span style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                      <Clock size={10} />
                      {Math.max(0, Math.floor((30 * 24 * 60 * 60 * 1000 - (new Date() - new Date(incident.deleted_at))) / (24 * 60 * 60 * 1000)))}d left
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div
          style={{
            padding: '10px 16px',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 28,
                height: 28,
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                background: 'transparent',
                color: 'var(--text-muted)',
                cursor: page <= 1 ? 'not-allowed' : 'pointer',
                opacity: page <= 1 ? 0.5 : 1,
              }}
            >
              <ChevronLeft size={14} />
            </button>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
              Page {page} of {pagination.totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => (pagination && p < pagination.totalPages ? p + 1 : p))}
              disabled={page >= pagination.totalPages}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 28,
                height: 28,
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                background: 'transparent',
                color: 'var(--text-muted)',
                cursor: page >= pagination.totalPages ? 'not-allowed' : 'pointer',
                opacity: page >= pagination.totalPages ? 0.5 : 1,
              }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
