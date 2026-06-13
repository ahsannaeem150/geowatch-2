import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Loader2, AlertCircle, Check, KeyRound, UserX, UserCheck, Trash2, Edit3, Save, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { getUser, updateUser, resetUserPassword, deleteUser, getUserActivity } from '../../services/api.js';
import ActivityTimeline from '../Audit/ActivityTimeline.jsx';
import { formatDistanceToNow } from 'date-fns';

const ROLE_STYLES = {
  super_admin: { bg: 'var(--badge-amber-bg)', color: 'var(--badge-amber-text)', label: 'Super Admin' },
  admin: { bg: 'var(--badge-blue-bg)', color: 'var(--badge-blue-text)', label: 'Admin' },
};

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'activity', label: 'Activity' },
];

const ACTION_OPTIONS = [
  { value: '', label: 'All actions' },
  { value: 'incident_created', label: 'Incident created' },
  { value: 'incident_updated', label: 'Incident updated' },
  { value: 'incident_resolved', label: 'Incident resolved' },
  { value: 'incident_deleted', label: 'Incident deleted' },
  { value: 'incident_restored', label: 'Incident restored' },
  { value: 'source_added', label: 'Source added' },
  { value: 'timeline_added', label: 'Timeline update' },
  { value: 'user_login', label: 'Staff login' },
];

function toStartOfDayIso(date) {
  if (!date) return '';
  return new Date(`${date}T00:00:00.000Z`).toISOString();
}

function toEndOfDayIso(date) {
  if (!date) return '';
  return new Date(`${date}T23:59:59.999Z`).toISOString();
}

export default function UserDetailDrawer({ userId, onClose, onUpdate, onDelete, initialTab, initialScroll }) {
  const [data, setData] = useState(null);
  const [activityData, setActivityData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(initialTab || 'overview');
  const contentRef = useRef(null);

  // Activity filters / pagination
  const [activityPage, setActivityPage] = useState(1);
  const [activityLimit, setActivityLimit] = useState(25);
  const [activityDateFrom, setActivityDateFrom] = useState('');
  const [activityDateTo, setActivityDateTo] = useState('');
  const [activityAction, setActivityAction] = useState('');
  const [activityPagination, setActivityPagination] = useState(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [tempPassword, setTempPassword] = useState(null);
  const [isResetting, setIsResetting] = useState(false);

  const fetchActivity = useCallback(async () => {
    setActivityLoading(true);
    try {
      const params = { page: activityPage, limit: activityLimit };
      const dateFromIso = toStartOfDayIso(activityDateFrom);
      const dateToIso = toEndOfDayIso(activityDateTo);
      if (dateFromIso) params.dateFrom = dateFromIso;
      if (dateToIso) params.dateTo = dateToIso;
      if (activityAction) params.action = activityAction;

      const actData = await getUserActivity(userId, params);
      setActivityData(actData);
      setActivityPagination(actData?.pagination || null);
    } catch (err) {
      console.error('Failed to load activity:', err);
      setActivityData({ logs: [], stats: null, pagination: null });
      setActivityPagination(null);
    } finally {
      setActivityLoading(false);
    }
  }, [userId, activityPage, activityLimit, activityDateFrom, activityDateTo, activityAction]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const userData = await getUser(userId);
      setData(userData);
      setEditForm({
        fullName: userData.user.full_name,
        role: userData.user.role,
        isActive: userData.user.is_active,
      });
    } catch (err) {
      setError(err.message || 'Failed to load user');
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
      // Defer so the DOM has settled and content height is final
      requestAnimationFrame(() => {
        if (contentRef.current) {
          contentRef.current.scrollTop = initialScroll;
        }
      });
    }
  }, [loading, activeTab, initialTab, initialScroll]);

  const handleSave = async () => {
    setIsSaving(true);
    setError('');
    try {
      const body = {};
      if (editForm.fullName !== data.user.full_name) body.fullName = editForm.fullName;
      if (editForm.role !== data.user.role) body.role = editForm.role;
      if (editForm.isActive !== data.user.is_active) body.isActive = editForm.isActive;

      if (Object.keys(body).length === 0) {
        setIsEditing(false);
        return;
      }

      await updateUser(userId, body);
      await fetchData();
      setIsEditing(false);
      onUpdate?.();
    } catch (err) {
      setError(err.message || 'Failed to update user');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetPassword = async () => {
    setIsResetting(true);
    try {
      const result = await resetUserPassword(userId);
      setTempPassword(result.tempPassword);
    } catch (err) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setIsResetting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteUser(userId);
      onDelete?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to delete user');
      setShowDeleteConfirm(false);
    }
  };

  const user = data?.user;
  const stats = data?.stats;
  const roleStyle = ROLE_STYLES[user?.role] || ROLE_STYLES.admin;
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
          <h2 style={{ fontSize: 15, fontWeight: 600 }}>User Details</h2>
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
              Loading user...
            </div>
          ) : error && !user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px', background: 'var(--alert-error-bg)', borderRadius: 'var(--radius-sm)', color: 'var(--danger)', fontSize: 13 }}>
              <AlertCircle size={16} /> {error}
            </div>
          ) : user && (
            <>
              {/* Profile */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, var(--navy-600), var(--navy-800))`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                    fontWeight: 700,
                    color: '#fff',
                    flexShrink: 0,
                  }}
                >
                  {user.full_name?.charAt(0)?.toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {isEditing ? (
                    <input
                      value={editForm.fullName}
                      onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                      style={{
                        background: 'var(--bg-base)',
                        border: '1px solid var(--border-default)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '8px 12px',
                        color: 'var(--text-primary)',
                        fontSize: 16,
                        fontWeight: 600,
                        fontFamily: 'var(--font-sans)',
                        width: '100%',
                        outline: 'none',
                      }}
                    />
                  ) : (
                    <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{user.full_name}</div>
                  )}
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{user.email}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                    {isEditing ? (
                      <select
                        value={editForm.role}
                        onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                        style={{
                          background: 'var(--bg-base)',
                          border: '1px solid var(--border-default)',
                          borderRadius: 6,
                          padding: '6px 10px',
                          color: 'var(--text-primary)',
                          fontSize: 13,
                          fontFamily: 'var(--font-sans)',
                          outline: 'none',
                        }}
                      >
                        <option value="admin">Admin</option>
                        <option value="super_admin">Super Admin</option>
                      </select>
                    ) : (
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 4, background: roleStyle.bg, color: roleStyle.color, textTransform: 'uppercase' }}>
                        {roleStyle.label}
                      </span>
                    )}
                    {isEditing ? (
                      <select
                        value={editForm.isActive ? 'true' : 'false'}
                        onChange={(e) => setEditForm({ ...editForm, isActive: e.target.value === 'true' })}
                        style={{
                          background: 'var(--bg-base)',
                          border: '1px solid var(--border-default)',
                          borderRadius: 6,
                          padding: '6px 10px',
                          color: 'var(--text-primary)',
                          fontSize: 13,
                          fontFamily: 'var(--font-sans)',
                          outline: 'none',
                        }}
                      >
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                      </select>
                    ) : (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: user.is_active ? 'var(--success)' : 'var(--text-muted)' }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: user.is_active ? 'var(--success)' : 'var(--text-muted)', boxShadow: user.is_active ? '0 0 6px var(--success)' : 'none' }} />
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    )}
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
                      padding: '10px 16px',
                      fontSize: 13,
                      fontWeight: 600,
                      border: 'none',
                      background: 'transparent',
                      color: activeTab === tab.key ? 'var(--text-primary)' : 'var(--text-muted)',
                      borderBottom: activeTab === tab.key ? '2px solid var(--navy-400)' : '2px solid transparent',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-sans)',
                      transition: 'color var(--transition-fast)',
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

                  {/* Temp password */}
                  {tempPassword && (
                    <div style={{ padding: '12px 14px', background: 'rgba(37, 99, 235, 0.08)', border: '1px solid var(--alert-info-border)', borderRadius: 'var(--radius-sm)', marginBottom: 16 }}>
                      <div style={{ fontSize: 12, color: 'var(--navy-400)', fontWeight: 600, marginBottom: 4 }}>Temporary Password Generated</div>
                      <div style={{ fontSize: 14, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', wordBreak: 'break-all' }}>{tempPassword}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Share this securely with the user. It will not be shown again.</div>
                    </div>
                  )}

                  {/* Stats */}
                  {stats && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
                      <StatBox label="Incidents" value={stats.incidentsCreated} />
                      <StatBox label="Resolved" value={stats.incidentsResolved} />
                      <StatBox label="Sources" value={stats.sourcesAdded} />
                      <StatBox label="Timeline" value={stats.timelineUpdates} />
                      <StatBox label="Audit" value={stats.auditEntries} />
                      <StatBox label="Member Since" value={new Date(user.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })} />
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
                    {isEditing ? (
                      <>
                        <ActionBtn icon={Save} label="Save" primary onClick={handleSave} disabled={isSaving} />
                        <ActionBtn icon={XCircle} label="Cancel" onClick={() => { setIsEditing(false); setEditForm({ fullName: user.full_name, role: user.role, isActive: user.is_active }); }} />
                      </>
                    ) : (
                      <>
                        <ActionBtn icon={Edit3} label="Edit" onClick={() => setIsEditing(true)} />
                        <ActionBtn icon={KeyRound} label="Reset Password" onClick={handleResetPassword} disabled={isResetting} />
                        {user.is_active ? (
                          <ActionBtn icon={UserX} label="Deactivate" danger onClick={async () => { await updateUser(userId, { isActive: false }); fetchData(); onUpdate?.(); }} />
                        ) : (
                          <ActionBtn icon={UserCheck} label="Activate" onClick={async () => { await updateUser(userId, { isActive: true }); fetchData(); onUpdate?.(); }} />
                        )}
                        <ActionBtn icon={Trash2} label="Delete" danger onClick={() => setShowDeleteConfirm(true)} />
                      </>
                    )}
                  </div>

                  {/* Delete confirm */}
                  {showDeleteConfirm && (
                    <div style={{ padding: '14px', background: 'var(--alert-error-bg)', border: '1px solid var(--alert-error-border)', borderRadius: 'var(--radius-sm)', marginBottom: 20 }}>
                      <div style={{ fontSize: 13, color: 'var(--danger)', fontWeight: 600, marginBottom: 6 }}>Permanently delete this user?</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>This action cannot be undone. If the user has created content, deletion will be blocked.</div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={handleDelete} style={{ padding: '8px 14px', borderRadius: 6, border: 'none', background: 'var(--danger)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Delete</button>
                        <button onClick={() => setShowDeleteConfirm(false)} style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid var(--border-default)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {activeTab === 'activity' && (
                <>
                  {/* Activity Stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
                    <StatBox label="Incidents Created" value={actStats?.incidentsCreated ?? 0} />
                    <StatBox label="Resolved" value={actStats?.incidentsResolved ?? 0} />
                    <StatBox label="Sources Added" value={actStats?.sourcesAdded ?? 0} />
                    <StatBox label="Timeline Updates" value={actStats?.timelineUpdates ?? 0} />
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
                      return `/superadmin/users?drawer=${userId}&tab=${activeTab}&scroll=${scrollTop}`;
                    }}
                    staffUserId={user?.id}
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

function StatBox({ label, value }) {
  return (
    <div style={{ padding: '12px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{label}</div>
    </div>
  );
}

function ActionBtn({ icon: Icon, label, onClick, primary, danger, disabled }) {
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
        border: primary ? 'none' : danger ? '1px solid var(--alert-error-border)' : '1px solid var(--border-default)',
        background: primary ? 'linear-gradient(135deg, var(--navy-600), var(--navy-700))' : danger ? 'var(--alert-error-bg)' : 'transparent',
        color: primary ? '#fff' : danger ? 'var(--danger)' : 'var(--text-secondary)',
        fontSize: 12,
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'var(--font-sans)',
        opacity: disabled ? 0.6 : 1,
        transition: 'all var(--transition-fast)',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={(e) => {
        if (!disabled && !primary) {
          e.currentTarget.style.background = danger ? 'var(--hover-strong)' : 'var(--bg-hover)';
          e.currentTarget.style.color = danger ? 'var(--danger)' : 'var(--text-primary)';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !primary) {
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
