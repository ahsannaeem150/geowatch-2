import React, { useState, useEffect, useCallback } from 'react';
import { X, Loader2, AlertCircle, UserX, UserCheck, Bookmark } from 'lucide-react';
import { getPublicUser, updatePublicUser, getPublicUserActivity } from '../../services/api.js';
import ActivityTimeline from '../Audit/ActivityTimeline.jsx';
import { formatDistanceToNow } from 'date-fns';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'activity', label: 'Activity' },
  { key: 'saved', label: 'Saved Incidents' },
];

export default function PublicUserDrawer({ userId, onClose, onUpdate }) {
  const [data, setData] = useState(null);
  const [activityData, setActivityData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setActivityLoading(true);
    setError('');
    try {
      const [userData, actData] = await Promise.all([
        getPublicUser(userId),
        getPublicUserActivity(userId),
      ]);
      setData(userData);
      setActivityData(actData);
    } catch (err) {
      setError(err.message || 'Failed to load public user');
    } finally {
      setLoading(false);
      setActivityLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
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

                  <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                    Activity Timeline
                  </h3>
                  <ActivityTimeline
                    logs={activityData?.logs}
                    loading={activityLoading}
                    emptyMessage="No activity recorded yet"
                    actorName={user?.full_name}
                    returnPath="/superadmin/public-users"
                  />
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
