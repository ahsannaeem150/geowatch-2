import React from 'react';
import { ChevronUp, ChevronDown, ArrowLeft, ArrowRight, Eye, KeyRound, UserX, UserCheck, Trash2, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const ROLE_STYLES = {
  super_admin: { bg: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', label: 'Super Admin' },
  admin: { bg: 'rgba(37, 99, 235, 0.12)', color: '#3b82f6', label: 'Admin' },
};

function RoleBadge({ role }) {
  const style = ROLE_STYLES[role] || ROLE_STYLES.admin;
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: 11,
        fontWeight: 600,
        padding: '3px 10px',
        borderRadius: 4,
        background: style.bg,
        color: style.color,
        textTransform: 'uppercase',
        letterSpacing: '0.03em',
      }}
    >
      {style.label}
    </span>
  );
}

function StatusBadge({ isActive }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: isActive ? 'var(--success)' : 'var(--text-muted)' }}>
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: isActive ? 'var(--success)' : 'var(--text-muted)',
          boxShadow: isActive ? '0 0 6px var(--success)' : 'none',
        }}
      />
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
}

function SortIcon({ column, sortBy, sortOrder }) {
  if (sortBy !== column) return <ChevronUp size={14} style={{ color: 'var(--text-disabled)', opacity: 0.4 }} />;
  return sortOrder === 'asc'
    ? <ChevronUp size={14} style={{ color: 'var(--navy-400)' }} />
    : <ChevronDown size={14} style={{ color: 'var(--navy-400)' }} />;
}

export default function UserTable({
  users,
  pagination,
  sortBy,
  sortOrder,
  selectedIds,
  loading,
  onSort,
  onSelect,
  onSelectAll,
  onView,
  onResetPassword,
  onToggleActive,
  onDelete,
  onPageChange,
}) {
  const allSelected = users.length > 0 && users.every((u) => selectedIds.has(u.id));
  const someSelected = users.some((u) => selectedIds.has(u.id)) && !allSelected;

  const headers = [
    { key: null, label: '', width: 40 },
    { key: 'full_name', label: 'Name', width: 'auto' },
    { key: 'email', label: 'Email', width: 'auto' },
    { key: 'role', label: 'Role', width: 120 },
    { key: 'is_active', label: 'Status', width: 100 },
    { key: 'last_login_at', label: 'Last Login', width: 140 },
    { key: 'created_at', label: 'Created', width: 140 },
    { key: null, label: 'Actions', width: 140 },
  ];

  return (
    <div>
      {/* Table */}
      <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)' }}>
              {headers.map((h) => (
                <th
                  key={h.label}
                  onClick={() => h.key && onSort(h.key)}
                  style={{
                    padding: '12px 14px',
                    textAlign: 'left',
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    cursor: h.key ? 'pointer' : 'default',
                    whiteSpace: 'nowrap',
                    width: h.width,
                    userSelect: 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {h.label === '' ? (
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(el) => { if (el) el.indeterminate = someSelected; }}
                        onChange={(e) => onSelectAll(e.target.checked)}
                        style={{ cursor: 'pointer' }}
                      />
                    ) : (
                      <>
                        {h.label}
                        {h.key && <SortIcon column={h.key} sortBy={sortBy} sortOrder={sortOrder} />}
                      </>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={headers.length} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px', display: 'block' }} />
                  Loading users...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={headers.length} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const isSelected = selectedIds.has(user.id);
                return (
                  <tr
                    key={user.id}
                    style={{
                      background: isSelected ? 'rgba(37, 99, 235, 0.06)' : 'transparent',
                      borderBottom: '1px solid var(--border-subtle)',
                      transition: 'background var(--transition-fast)',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'var(--bg-hover)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <td style={{ padding: '10px 14px' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => onSelect(user.id, e.target.checked)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{user.full_name}</div>
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                      {user.email}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <RoleBadge role={user.role} />
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <StatusBadge isActive={user.is_active} />
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: 12 }}>
                      {user.last_login_at
                        ? formatDistanceToNow(new Date(user.last_login_at), { addSuffix: true })
                        : 'Never'}
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <ActionButton icon={Eye} onClick={() => onView(user)} title="View details" />
                        <ActionButton icon={KeyRound} onClick={() => onResetPassword(user)} title="Reset password" />
                        {user.is_active ? (
                          <ActionButton icon={UserX} onClick={() => onToggleActive(user)} title="Deactivate" color="var(--warning)" />
                        ) : (
                          <ActionButton icon={UserCheck} onClick={() => onToggleActive(user)} title="Activate" color="var(--success)" />
                        )}
                        <ActionButton icon={Trash2} onClick={() => onDelete(user)} title="Delete" color="var(--danger)" />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
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
              <ArrowLeft size={14} />
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
              <ArrowRight size={14} />
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
