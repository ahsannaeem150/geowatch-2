import React, { useState, useEffect, useCallback } from 'react';
import { X, Loader2, AlertCircle, Check, KeyRound, UserX, UserCheck, Trash2, Edit3, Save, XCircle } from 'lucide-react';
import { getUser, updateUser, resetUserPassword, deleteUser, listAuditLogs } from '../../services/api.js';
import { formatDistanceToNow } from 'date-fns';

const ROLE_STYLES = {
  super_admin: { bg: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', label: 'Super Admin' },
  admin: { bg: 'rgba(37, 99, 235, 0.12)', color: '#3b82f6', label: 'Admin' },
};

export default function UserDetailDrawer({ userId, onClose, onUpdate, onDelete }) {
  const [data, setData] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [tempPassword, setTempPassword] = useState(null);
  const [isResetting, setIsResetting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [userData, logsData] = await Promise.all([
        getUser(userId),
        listAuditLogs({ userId, limit: 20 }),
      ]);
      setData(userData);
      setEditForm({
        fullName: userData.user.full_name,
        role: userData.user.role,
        isActive: userData.user.is_active,
      });
      setAuditLogs(logsData.logs || []);
    } catch (err) {
      setError(err.message || 'Failed to load user');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
        style={{ position: 'absolute', inset: 0, background: 'rgba(0, 0, 0, 0.5)' }}
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
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 12, color: 'var(--text-muted)' }}>
              <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
              Loading user...
            </div>
          ) : error && !user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px', background: 'rgba(244, 63, 94, 0.08)', borderRadius: 8, color: 'var(--danger)', fontSize: 13 }}>
              <AlertCircle size={16} /> {error}
            </div>
          ) : user && (
            <>
              {/* Profile */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
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
                        borderRadius: 6,
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

              {/* Error banner */}
              {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'rgba(244, 63, 94, 0.08)', border: '1px solid rgba(244, 63, 94, 0.2)', borderRadius: 8, color: 'var(--danger)', fontSize: 13, marginBottom: 16 }}>
                  <AlertCircle size={16} /> {error}
                </div>
              )}

              {/* Temp password */}
              {tempPassword && (
                <div style={{ padding: '12px 14px', background: 'rgba(37, 99, 235, 0.08)', border: '1px solid rgba(37, 99, 235, 0.2)', borderRadius: 8, marginBottom: 16 }}>
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
                <div style={{ padding: '14px', background: 'rgba(244, 63, 94, 0.06)', border: '1px solid rgba(244, 63, 94, 0.2)', borderRadius: 8, marginBottom: 20 }}>
                  <div style={{ fontSize: 13, color: 'var(--danger)', fontWeight: 600, marginBottom: 6 }}>Permanently delete this user?</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>This action cannot be undone. If the user has created content, deletion will be blocked.</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={handleDelete} style={{ padding: '8px 14px', borderRadius: 6, border: 'none', background: 'var(--danger)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Delete</button>
                    <button onClick={() => setShowDeleteConfirm(false)} style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid var(--border-default)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                  </div>
                </div>
              )}

              {/* Recent Audit */}
              <div>
                <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Recent Activity</h3>
                {auditLogs.length === 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '16px 0' }}>No recent activity</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {auditLogs.map((log) => (
                      <div key={log.id} style={{ padding: '10px 12px', background: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--navy-400)' }}>{log.action.replace(/_/g, ' ')}</span>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}</span>
                        </div>
                        {log.target_type && (
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                            {log.target_type} {log.target_id?.slice(0, 12)}...
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
    <div style={{ padding: '12px', background: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
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
        borderRadius: 8,
        border: primary ? 'none' : danger ? '1px solid rgba(244, 63, 94, 0.3)' : '1px solid var(--border-default)',
        background: primary ? 'linear-gradient(135deg, var(--navy-600), var(--navy-700))' : danger ? 'rgba(244, 63, 94, 0.08)' : 'transparent',
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
          e.currentTarget.style.background = danger ? 'rgba(244, 63, 94, 0.15)' : 'var(--bg-hover)';
          e.currentTarget.style.color = danger ? 'var(--danger)' : 'var(--text-primary)';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !primary) {
          e.currentTarget.style.background = danger ? 'rgba(244, 63, 94, 0.08)' : 'transparent';
          e.currentTarget.style.color = danger ? 'var(--danger)' : 'var(--text-secondary)';
        }
      }}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}
