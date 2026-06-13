import React, { useState, useEffect, useCallback } from 'react';
import { PanelLeftClose, X, ChevronLeft, ChevronRight, ArrowLeft, Search } from 'lucide-react';
import ActivityTimeline from './ActivityTimeline.jsx';
import {
  getUserActivity,
  getPublicUserActivity,
  getUserActivityPageForIncident,
  getPublicUserActivityPageForIncident,
} from '../../services/api.js';

const ACTION_OPTIONS = [
  { value: '', label: 'All actions' },
  { value: 'incident_created', label: 'Incident created' },
  { value: 'incident_updated', label: 'Incident updated' },
  { value: 'incident_resolved', label: 'Incident resolved' },
  { value: 'incident_deleted', label: 'Incident deleted' },
  { value: 'incident_restored', label: 'Incident restored' },
  { value: 'public_user_incident_saved', label: 'Saved incident' },
  { value: 'public_user_incident_unsaved', label: 'Unsaved incident' },
  { value: 'public_user_incident_viewed', label: 'Viewed incident' },
  { value: 'source_added', label: 'Source added' },
  { value: 'timeline_added', label: 'Timeline update' },
  { value: 'user_login', label: 'Staff login' },
  { value: 'public_user_login', label: 'Public login' },
];

function toStartOfDayIso(date) {
  if (!date) return '';
  return new Date(`${date}T00:00:00.000Z`).toISOString();
}

function toEndOfDayIso(date) {
  if (!date) return '';
  return new Date(`${date}T23:59:59.999Z`).toISOString();
}

export default function ActivityInspectorSidebar({
  staffUserId,
  publicUserId,
  actorName,
  selectedIncidentId,
  selectionKey = 0,
  onIncidentClick,
  onToggleCollapse,
  onClose,
  onBackToProfile,
}) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState(null);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [action, setAction] = useState('');
  const [search, setSearch] = useState('');

  const isStaff = Boolean(staffUserId);
  const userId = staffUserId || publicUserId;

  const fetchLogs = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    const params = { page, limit };
    const dateFromIso = toStartOfDayIso(dateFrom);
    const dateToIso = toEndOfDayIso(dateTo);
    if (dateFromIso) params.dateFrom = dateFromIso;
    if (dateToIso) params.dateTo = dateToIso;
    if (action) params.action = action;
    if (search.trim()) params.search = search.trim();

    try {
      const data = isStaff ? await getUserActivity(userId, params) : await getPublicUserActivity(userId, params);
      setLogs(data?.logs || []);
      setPagination(data?.pagination || null);
    } catch (err) {
      console.error('Failed to load activity logs:', err);
      setLogs([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, [userId, isStaff, page, limit, dateFrom, dateTo, action, search]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // When an incident is selected from elsewhere (e.g. the creator profile
  // drawer), figure out which page it lives on, clear filters so it is
  // guaranteed to appear, jump to that page, and let ActivityTimeline scroll
  // to it once the logs load.
  useEffect(() => {
    if (!selectedIncidentId || !userId) return;

    // If the incident is already on the current page, ActivityTimeline will
    // scroll to it; no need to clear filters or jump pages.
    const isAlreadyVisible = logs.some((log) => log.target_id === selectedIncidentId);
    if (isAlreadyVisible) return;

    // Clear filters so the incident is not hidden by a previous filter, then
    // ask the backend which page it lives on.
    setDateFrom('');
    setDateTo('');
    setAction('');
    setSearch('');

    const findPage = async () => {
      try {
        const params = { incidentId: selectedIncidentId, limit };
        const data = isStaff
          ? await getUserActivityPageForIncident(userId, params)
          : await getPublicUserActivityPageForIncident(userId, params);
        if (data?.page) {
          setPage(data.page);
        }
      } catch (err) {
        console.error('Failed to find activity page for incident:', err);
      }
    };

    findPage();
  }, [selectedIncidentId, selectionKey, userId, isStaff, limit]);

  const handleDateFromChange = (e) => {
    setPage(1);
    setDateFrom(e.target.value);
  };

  const handleDateToChange = (e) => {
    setPage(1);
    setDateTo(e.target.value);
  };

  const handleActionChange = (e) => {
    setPage(1);
    setAction(e.target.value);
  };

  const handleSearchChange = (e) => {
    setPage(1);
    setSearch(e.target.value);
  };

  const handleLimitChange = (e) => {
    setPage(1);
    setLimit(parseInt(e.target.value, 10));
  };

  const goToPrevious = () => setPage((p) => Math.max(1, p - 1));
  const goToNext = () => setPage((p) => (pagination && p < pagination.totalPages ? p + 1 : p));

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
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {actorName ? `${actorName}'s Activity` : 'Activity'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            {pagination ? `${pagination.total} events` : `${logs.length} events`}
          </div>
          {onBackToProfile && (
            <button
              type="button"
              onClick={onBackToProfile}
              title="Back to profile"
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
              Back to Profile
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
            title="Close activity view"
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
              placeholder="Action, incident, detail..."
              value={search}
              onChange={handleSearchChange}
              style={{ ...inputStyle, padding: '5px 8px' }}
            />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Date range</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="date"
              value={dateFrom}
              onChange={handleDateFromChange}
              style={inputStyle}
              placeholder="From"
            />
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>→</span>
            <input
              type="date"
              value={dateTo}
              onChange={handleDateToChange}
              style={inputStyle}
              placeholder="To"
            />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Action</label>
          <select value={action} onChange={handleActionChange} style={inputStyle}>
            {ACTION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Timeline */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        <ActivityTimeline
          logs={logs}
          loading={loading}
          emptyMessage="No activity matches your filters"
          actorName={actorName}
          onIncidentClick={onIncidentClick}
          selectedIncidentId={selectedIncidentId}
        />
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
              onClick={goToPrevious}
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
              onClick={goToNext}
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

          <select
            value={limit}
            onChange={handleLimitChange}
            style={{ ...inputStyle, width: 'auto', minWidth: '70px' }}
          >
            <option value={10}>10 / page</option>
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
          </select>
        </div>
      )}
    </div>
  );
}
