import React from 'react';
import { Loader2, Eye, UserX, UserCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

function StatusBadge({ isActive }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: isActive ? 'var(--success)' : 'var(--danger)' }}>
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: isActive ? 'var(--success)' : 'var(--danger)',
          boxShadow: isActive ? '0 0 6px var(--success)' : '0 0 6px var(--danger)',
        }}
      />
      {isActive ? 'Active' : 'Banned'}
    </span>
  );
}

export default function PublicUserTable({
  users,
  pagination,
  loading,
  onView,
  onToggleActive,
  onPageChange,
}) {
  return (
    <div>
      <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)' }}>
              {[
                { label: 'Name', width: 'auto' },
                { label: 'Email', width: 'auto' },
                { label: 'Provider', width: 100 },
                { label: 'Status', width: 100 },
                { label: 'Created', width: 140 },
                { label: 'Actions', width: 100 },
              ].map((h) => (
                <th
                  key={h.label}
                  style={{
                    padding: '12px 14px',
                    textAlign: 'left',
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    whiteSpace: 'nowrap',
                    width: h.width,
                  }}
                >
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px', display: 'block' }} />
                  Loading public users...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No public users found
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr
                  key={user.id}
                  style={{
                    borderBottom: '1px solid var(--border-subtle)',
                    transition: 'background var(--transition-fast)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bg-hover)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt=""
                          style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--navy-600), var(--navy-800))',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 11,
                            fontWeight: 600,
                            color: '#fff',
                          }}
                        >
                          {user.full_name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                      )}
                      <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                        {user.full_name || '—'}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    {user.email}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        color: 'var(--text-muted)',
                        letterSpacing: '0.03em',
                      }}
                    >
                      {user.oauth_provider}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <StatusBadge isActive={user.is_active} />
                  </td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <ActionButton icon={Eye} onClick={() => onView(user)} title="View details" />
                      {user.is_active ? (
                        <ActionButton icon={UserX} onClick={() => onToggleActive(user)} title="Ban" color="var(--danger)" />
                      ) : (
                        <ActionButton icon={UserCheck} onClick={() => onToggleActive(user)} title="Unban" color="var(--success)" />
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 4px',
            marginTop: 4,
          }}
        >
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Showing {(pagination.page - 1) * pagination.limit + 1}–
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} users
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <PageButton
              disabled={pagination.page <= 1}
              onClick={() => onPageChange(pagination.page - 1)}
            >
              ‹
            </PageButton>
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
              <PageButton
                key={page}
                active={page === pagination.page}
                onClick={() => onPageChange(page)}
              >
                {page}
              </PageButton>
            ))}
            <PageButton
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => onPageChange(pagination.page + 1)}
            >
              ›
            </PageButton>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

function ActionButton({ icon: Icon, onClick, title, color = 'var(--text-muted)' }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 28,
        height: 28,
        borderRadius: 6,
        border: 'none',
        background: 'transparent',
        color,
        cursor: 'pointer',
        transition: 'all var(--transition-fast)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--bg-hover)';
        e.currentTarget.style.color = color === 'var(--text-muted)' ? 'var(--text-primary)' : color;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = color;
      }}
    >
      <Icon size={14} />
    </button>
  );
}

function PageButton({ children, onClick, disabled, active }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 30,
        height: 30,
        padding: '0 8px',
        borderRadius: 6,
        border: 'none',
        background: active ? 'var(--navy-600)' : 'transparent',
        color: active ? '#fff' : disabled ? 'var(--text-disabled)' : 'var(--text-secondary)',
        fontSize: 13,
        fontWeight: 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'var(--font-sans)',
        transition: 'all var(--transition-fast)',
      }}
      onMouseEnter={(e) => {
        if (!disabled && !active) {
          e.currentTarget.style.background = 'var(--bg-hover)';
          e.currentTarget.style.color = 'var(--text-primary)';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !active) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'var(--text-secondary)';
        }
      }}
    >
      {children}
    </button>
  );
}
