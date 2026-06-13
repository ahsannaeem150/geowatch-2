import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Loader2, AlertCircle, UserX, UserCheck, Bookmark, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { getPublicUser, updatePublicUser, getPublicUserActivity } from '../../services/api.js';
import ActivityTimeline from '../Audit/ActivityTimeline.jsx';
import { formatDistanceToNow } from 'date-fns';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'activity', label: 'Activity' },
  { key: 'saved', label: 'Saved Incidents' },
];

const ACTION_OPTIONS = [
  { value: '', label: 'All actions' },
  { value: 'public_user_login', label: 'Login' },
  { value: 'public_user_incident_saved', label: 'Saved incident' },
  { value: 'public_user_incident_unsaved', label: 'Unsaved incident' },
  { value: 'public_user_incident_viewed', label: 'Viewed incident' },
];

function toStartOfDayIso(date) {
  if (!date) return '';
  return new Date(`${date}T00:00:00.000Z`).toISOString();
}

function toEndOfDayIso(date) {
  if (!date) return '';
  return new Date(`${date}T23:59:59.999Z`).toISOString();
}

export default function PublicUserDrawer({ userId, onClose, onUpdate, initialTab, initialScroll, onIncidentClick }) {
  const [data, setData] = useState(null);
  const [activityData, setActivityData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(initialTab || 'overview');
  const contentRef = useRef(null);

  // Activity filters / pagination
  const [activityPage, setActivityPage] = useState(1);
  const [activityLimit, setActivityLimit] = useState(10);
  const [activityDateFrom, setActivityDateFrom] = useState('');
  const [activityDateTo, setActivityDateTo] = useState('');
  const [activityAction, setActivityAction] = useState('');
  const [activitySearch, setActivitySearch] = useState('');
  const [activityPagination, setActivityPagination] = useState(null);

  const [actionLoading, setActionLoading] = useState(false);

  const fetchActivity = useCallback(async () => {
    setActivityLoading(true);
    try {
      const params = { page: activityPage, limit: activityLimit };
      const dateFromIso = toStartOfDayIso(activityDateFrom);
      const dateToIso = toEndOfDayIso(activityDateTo);
      if (dateFromIso) params.dateFrom = dateFromIso;
      if (dateToIso) params.dateTo = dateToIso;
      if (activityAction) params.action = activityAction;
      if (activitySearch.trim()) params.search = activitySearch.trim();

      const actData = await getPublicUserActivity(userId, params);
      setActivityData(actData);
      setActivityPagination(actData?.pagination || null);
    } catch (err) {
      console.error('Failed to load activity:', err);
      setActivityData({ logs: [], stats: null, pagination: null });
      setActivityPagination(null);
    } finally {
      setActivityLoading(false);
    }
  }, [userId, activityPage, activityLimit, activityDateFrom, activityDateTo, activityAction, activitySearch]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const userData = await getPublicUser(userId);
      setData(userData);
    } catch (err) {
      setError(err.message || 'Failed to load public user');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  // Restore scroll position when returning from activity map view
  useEffect(() => {
    if (!loading && activeTab === (initialTab || 'overview') && initialScroll && contentRef.current) {
      requestAnimationFrame(() => {
        if (contentRef.current) {
          contentRef.current.scrollTop = initialScroll;
        }
      });
    }
  }, [loading, activeTab, initialTab, initialScroll]);

  const handleToggleActive = async () => {
    if (!data?.user) return;
    setActionLoading(true);
    try {
      await updatePublicUser(userId, { isActive: !data.user.is_active });
      await fetchData();
      onUpdate?.();
    } catch (err) {
      setError(err.message || 'Failed to update user');
    } finally {
      setActionLoading(false);
    }
  };

  const user = data?.user;
  const stats = data?.stats;
  const savedIncidents = data?.savedIncidents || [];
  const actStats = activityData?.stats;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'flex-end',
        animation: 'fadeIn 0.2s ease forwards',
      }}
    >
      {/* Backdrop */}
      <div
        style={{ position: 'absolute', inset: 0, background: 'var(--backdrop)' }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 480,
          height: '100vh',
          background: 'var(--bg-base)',
          borderLeft: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideInRight 0.25s ease forwards',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-surface)',
            flexShrink: 0,
          }}
        >
          <h2 style={{ fontSize: 15, fontWeight: 600 }}>Public User Details</h2>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, borderRadius: 6 }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div
          ref={contentRef}
          style={{ flex: 1, overflowY: 'auto', padding: '20px' }}
        >
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 12, color: 'var(--text-muted)' }}>
              <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
              Loading public user...
            </div>
          ) : error && !user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px', background: 'var(--alert-error-bg)', borderRadius: 'var(--radius-sm)', color: 'var(--danger)', fontSize: 13 }}>
              <AlertCircle size={16} /> {error}
            </div>
          ) : user && (
            <>
              {/* Profile */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt=""
                    style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                  />
                ) : (
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--navy-600), var(--navy-800))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 20,
                      fontWeight: 700,
                      color: '#fff',
                      flexShrink: 0,
                    }}
                  >
                    {user.full_name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{user.full_name || '—'}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{user.email}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 4, background: 'var(--badge-blue-bg)', color: 'var(--badge-blue-text)', textTransform: 'uppercase' }}>
                      {user.oauth_provider}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: user.is_active ? 'var(--success)' : 'var(--danger)' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: user.is_active ? 'var(--success)' : 'var(--danger)', boxShadow: user.is_active ? '0 0 6px var(--success)' : '0 0 6px var(--danger)' }} />
                      {user.is_active ? 'Active' : 'Banned'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', marginBottom: 20 }}>
                {TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    style={{
                      padding: '10px 14px',
                      fontSize: 13,
                      fontWeight: 600,
                      border: 'none',
                      background: 'transparent',
                      color: activeTab === tab.key ? 'var(--text-primary)' : 'var(--text-muted)',
                      borderBottom: activeTab === tab.key ? '2px solid var(--navy-400)' : '2px solid transparent',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-sans)',
                      transition: 'color var(--transition-fast)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeTab === 'overview' && (
                <>
                  {/* Error banner */}
                  {error && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'var(--alert-error-bg)', border: '1px solid var(--alert-error-border)', borderRadius: 'var(--radius-sm)', color: 'var(--danger)', fontSize: 13, marginBottom: 16 }}>
                      <AlertCircle size={16} /> {error}
                    </div>
                  )}

                  {/* Stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 24 }}>
                    <StatBox
                      label="Saved Incidents"
                      value={stats?.savedCount ?? 0}
                      icon={Bookmark}
                    />
                    <StatBox
                      label="Member Since"
                      value={new Date(user.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                    />
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                    {user.is_active ? (
                      <ActionBtn icon={UserX} label="Ban User" danger onClick={handleToggleActive} disabled={actionLoading} />
                    ) : (
                      <ActionBtn icon={UserCheck} label="Unban User" onClick={handleToggleActive} disabled={actionLoading} />
                    )}
                  </div>
                </>
              )}

              {activeTab === 'activity' && (
                <>
                  {/* Activity Stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
                    <StatBox label="Logins" value={actStats?.logins ?? 0} />
                    <StatBox label="Saves" value={actStats?.saves ?? 0} />
                    <StatBox label="Unsaves" value={actStats?.unsaves ?? 0} />
                    <StatBox label="Views" value={actStats?.views ?? 0} />
                    <StatBox
                      label="Last Active"
                      value={actStats?.lastActive ? formatDistanceToNow(new Date(actStats.lastActive), { addSuffix: true }) : '—'}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                      Activity Timeline
                    </h3>
                    {activityPagination && activityPagination.total > 0 && (
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {activityPagination.total} events
                      </span>
                    )}
                  </div>

                  {/* Activity filters */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 10,
                      marginBottom: 16,
                      padding: 12,
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ display: 'block', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 4 }}>Search</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                        <input
                          type="text"
                          placeholder="Action, incident, detail..."
                          value={activitySearch}
                          onChange={(e) => { setActivityPage(1); setActivitySearch(e.target.value); }}
                          style={{
                            flex: 1,
                            padding: '5px 8px',
                            background: 'var(--bg-input)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--text-primary)',
                            fontFamily: 'var(--font-sans)',
                            fontSize: 12,
                            outline: 'none',
                          }}
                        />
                      </div>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ display: 'block', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 4 }}>Date range</label>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input
                          type="date"
                          value={activityDateFrom}
                          onChange={(e) => { setActivityPage(1); setActivityDateFrom(e.target.value); }}
                          style={{
                            flex: 1,
                            padding: '6px 8px',
                            background: 'var(--bg-input)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--text-primary)',
                            fontFamily: 'var(--font-sans)',
                            fontSize: 12,
                            outline: 'none',
                          }}
                        />
                        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>→</span>
                        <input
                          type="date"
                          value={activityDateTo}
                          onChange={(e) => { setActivityPage(1); setActivityDateTo(e.target.value); }}
                          style={{
                            flex: 1,
                            padding: '6px 8px',
                            background: 'var(--bg-input)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--text-primary)',
                            fontFamily: 'var(--font-sans)',
                            fontSize: 12,
                            outline: 'none',
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 4 }}>Action</label>
                      <select
                        value={activityAction}
                        onChange={(e) => { setActivityPage(1); setActivityAction(e.target.value); }}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          background: 'var(--bg-input)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--text-primary)',
                          fontFamily: 'var(--font-sans)',
                          fontSize: 12,
                          outline: 'none',
                        }}
                      >
                        {ACTION_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 4 }}>Per page</label>
                      <select
                        value={activityLimit}
                        onChange={(e) => { setActivityPage(1); setActivityLimit(parseInt(e.target.value, 10)); }}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          background: 'var(--bg-input)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--text-primary)',
                          fontFamily: 'var(--font-sans)',
                          fontSize: 12,
                          outline: 'none',
                        }}
                      >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>
                  </div>

                  <ActivityTimeline
                    logs={activityData?.logs}
                    loading={activityLoading}
                    emptyMessage="No activity matches your filters"
                    actorName={user?.full_name}
                    getReturnTo={() => {
                      const scrollTop = contentRef.current?.scrollTop || 0;
                      return `/superadmin/public-users?drawer=${userId}&tab=${activeTab}&scroll=${scrollTop}`;
                    }}
                    publicUserId={user?.id}
                    onIncidentClick={onIncidentClick}
                  />

                  {/* Activity pagination */}
                  {activityPagination && activityPagination.totalPages > 1 && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                        marginTop: 16,
                        paddingTop: 16,
                        borderTop: '1px solid var(--border-subtle)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => setActivityPage((p) => Math.max(1, p - 1))}
                          disabled={activityPage <= 1}
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
                            cursor: activityPage <= 1 ? 'not-allowed' : 'pointer',
                            opacity: activityPage <= 1 ? 0.5 : 1,
                          }}
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                          Page {activityPage} of {activityPagination.totalPages}
                        </span>
                        <button
                          type="button"
                          onClick={() => setActivityPage((p) => (activityPagination && p < activityPagination.totalPages ? p + 1 : p))}
                          disabled={activityPage >= activityPagination.totalPages}
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
                            cursor: activityPage >= activityPagination.totalPages ? 'not-allowed' : 'pointer',
                            opacity: activityPage >= activityPagination.totalPages ? 0.5 : 1,
                          }}
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {activeTab === 'saved' && (
                <>
                  <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                    Saved Incidents · {savedIncidents.length}
                  </h3>
                  {savedIncidents.length === 0 ? (
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '16px 0' }}>No saved incidents</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {savedIncidents.map((incident) => (
                        <div
                          key={incident.id}
                          style={{
                            padding: '12px 14px',
                            background: 'var(--bg-surface)',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-subtle)',
                            cursor: 'pointer',
                            transition: 'all var(--transition-fast)',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'var(--border-default)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'var(--border-subtle)';
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                              {incident.title}
                            </div>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 600,
                                padding: '2px 8px',
                                borderRadius: 4,
                                background: `${incident.domain_color}18`,
                                color: incident.domain_color,
                                textTransform: 'uppercase',
                                letterSpacing: '0.03em',
                                flexShrink: 0,
                                marginLeft: 8,
                              }}
                            >
                              {incident.domain_name}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: 'var(--text-muted)' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span
                                style={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: '50%',
                                  background: incident.severity >= 4 ? '#ef4444' : incident.severity >= 3 ? '#f97316' : '#22c55e',
                                }}
                              />
                              Severity {incident.severity}
                            </span>
                            <span>·</span>
                            <span>Saved {formatDistanceToNow(new Date(incident.saved_at), { addSuffix: true })}</span>
                          </div>
                          {incident.notes && (
                            <div style={{ marginTop: 6, padding: '8px 10px', background: 'var(--bg-base)', borderRadius: 6, fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                              {incident.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

function StatBox({ label, value, icon: Icon }) {
  return (
    <div style={{ padding: '14px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
      {Icon && <Icon size={16} style={{ color: 'var(--navy-400)', marginBottom: 6 }} />}
      <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{label}</div>
    </div>
  );
}

function ActionBtn({ icon: Icon, label, onClick, danger, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 14px',
        borderRadius: 'var(--radius-sm)',
        border: danger ? '1px solid var(--alert-error-border)' : '1px solid var(--border-default)',
        background: danger ? 'var(--alert-error-bg)' : 'transparent',
        color: danger ? 'var(--danger)' : 'var(--text-secondary)',
        fontSize: 12,
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'var(--font-sans)',
        opacity: disabled ? 0.6 : 1,
        transition: 'all var(--transition-fast)',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = danger ? 'var(--hover-strong)' : 'var(--bg-hover)';
          e.currentTarget.style.color = danger ? 'var(--danger)' : 'var(--text-primary)';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = danger ? 'var(--alert-error-bg)' : 'transparent';
          e.currentTarget.style.color = danger ? 'var(--danger)' : 'var(--text-secondary)';
        }
      }}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}
