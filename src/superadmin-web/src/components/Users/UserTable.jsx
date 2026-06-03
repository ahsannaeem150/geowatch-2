import React, { useState, useRef, useEffect } from 'react';
import { ChevronUp, ChevronDown, ArrowLeft, ArrowRight, KeyRound, UserX, UserCheck, Trash2, Loader2, MoreHorizontal } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const ROLE_STYLES = {
  super_admin: { bg: 'var(--badge-amber-bg)', color: 'var(--badge-amber-text)', label: 'Super Admin' },
  admin: { bg: 'var(--badge-blue-bg)', color: 'var(--badge-blue-text)', label: 'Admin' },
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
        borderRadius: 'var(--radius-sm)',
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
      <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
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
                      background: isSelected ? 'var(--hover-subtle)' : 'transparent',
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
                      <span
                        onClick={() => onView(user)}
                        style={{
                          fontWeight: 500,
                          color: 'var(--text-primary)',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.textDecoration = 'underline';
                          e.currentTarget.style.color = 'var(--navy-400)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.textDecoration = 'none';
                          e.currentTarget.style.color = 'var(--text-primary)';
                        }}
                      >
                        {user.full_name}
                      </span>
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
                      <RowActionsMenu
                        user={user}
                        onResetPassword={onResetPassword}
                        onToggleActive={onToggleActive}
                        onDelete={onDelete}
                      />
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

function RowActionsMenu({ user, onResetPassword, onToggleActive, onDelete }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div style={{ position: 'relative' }} ref={menuRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        title="More actions"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 28,
          height: 28,
          borderRadius: 'var(--radius-sm)',
          border: 'none',
          background: open ? 'var(--bg-hover)' : 'transparent',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          transition: 'all var(--transition-fast)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--bg-hover)';
          e.currentTarget.style.color = 'var(--text-primary)';
        }}
        onMouseLeave={(e) => {
          if (!open) {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--text-muted)';
          }
        }}
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 4px)',
            zIndex: 50,
            minWidth: 160,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            boxShadow: 'var(--shadow-md)',
            padding: '4px',
            fontSize: 13,
          }}
        >
          <MenuItem
            icon={KeyRound}
            label="Reset password"
            onClick={() => {
              onResetPassword(user);
              setOpen(false);
            }}
          />
          <MenuItem
            icon={user.is_active ? UserX : UserCheck}
            label={user.is_active ? 'Deactivate' : 'Activate'}
            color={user.is_active ? 'var(--warning)' : 'var(--success)'}
            onClick={() => {
              onToggleActive(user);
              setOpen(false);
            }}
          />
          <div style={{ height: 1, background: 'var(--border-subtle)', margin: '4px 0' }} />
          <MenuItem
            icon={Trash2}
            label="Delete"
            color="var(--danger)"
            onClick={() => {
              onDelete(user);
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon: Icon, label, onClick, color = 'var(--text-primary)' }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        padding: '8px 12px',
        borderRadius: 6,
        border: 'none',
        background: 'transparent',
        color,
        fontSize: 13,
        fontFamily: 'var(--font-sans)',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background var(--transition-fast)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--bg-hover)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
      }}
    >
      <Icon size={14} />
      <span>{label}</span>
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
