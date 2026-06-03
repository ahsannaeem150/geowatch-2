import React, { useState, useEffect } from 'react';
import { Search, X, Download, Filter } from 'lucide-react';
import { listUsers, listPublicUsers } from '../../services/api.js';
import { getAuditActionColor } from '../../utils/audit-colors.js';

const DEFAULT_ACTION_OPTIONS = [
  'user_login',
  'user_created',
  'user_updated',
  'user_activated',
  'user_deactivated',
  'user_deleted',
  'user_password_reset',
  'incident_created',
  'incident_updated',
  'incident_resolved',
  'incident_deleted',
  'incident_restored',
  'incident_purged',
  'source_added',
  'source_updated',
  'source_deleted',
  'timeline_added',
  'timeline_updated',
  'timeline_deleted',
  'public_user_banned',
  'public_user_unbanned',
];

const DEFAULT_TARGET_OPTIONS = ['user', 'incident', 'source', 'timeline', 'public_user'];

export default function AuditFilters({
  filters,
  onChange,
  onExport,
  canExport,
  actionOptions = DEFAULT_ACTION_OPTIONS,
  targetOptions = DEFAULT_TARGET_OPTIONS,
  userFilterMode = 'staff',
  userFilterLabel = 'All users',
}) {
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  useEffect(() => {
    setUsersLoading(true);
    const fetcher = userFilterMode === 'public' ? listPublicUsers : listUsers;
    const params = userFilterMode === 'public'
      ? { limit: 100, sortBy: 'full_name', sortOrder: 'asc' }
      : { limit: 100, sortBy: 'full_name', sortOrder: 'asc' };
    fetcher(params)
      .then((data) => {
        const list = userFilterMode === 'public' ? (data.users || []) : (data.users || []);
        setUsers(list);
      })
      .catch(() => setUsers([]))
      .finally(() => setUsersLoading(false));
  }, [userFilterMode]);

  const hasActiveFilters = filters.action || filters.userId || filters.targetType || filters.dateFrom || filters.dateTo;

  const clearAll = () => {
    onChange({ action: '', userId: '', targetType: '', dateFrom: '', dateTo: '' });
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        marginBottom: 16,
      }}
    >
      {/* Main filter row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {/* Action filter */}
        <div style={{ position: 'relative', minWidth: 160 }}>
          <select
            value={filters.action}
            onChange={(e) => onChange({ ...filters, action: e.target.value })}
            style={{
              width: '100%',
              appearance: 'none',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '9px 32px 9px 14px',
              color: 'var(--text-primary)',
              fontSize: 13,
              fontFamily: 'var(--font-sans)',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="">All actions</option>
            {actionOptions.map((action) => (
              <option key={action} value={action}>
                {action.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
          <Filter size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
        </div>

        {/* User filter */}
        <div style={{ position: 'relative', minWidth: 180 }}>
          <select
            value={filters.userId}
            onChange={(e) => onChange({ ...filters, userId: e.target.value })}
            disabled={usersLoading}
            style={{
              width: '100%',
              appearance: 'none',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '9px 32px 9px 14px',
              color: 'var(--text-primary)',
              fontSize: 13,
              fontFamily: 'var(--font-sans)',
              outline: 'none',
              cursor: usersLoading ? 'not-allowed' : 'pointer',
              opacity: usersLoading ? 0.6 : 1,
            }}
          >
            <option value="">{userFilterLabel}</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.full_name} ({user.email})
              </option>
            ))}
          </select>
          <Search size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
        </div>

        {/* Target type filter */}
        <div style={{ position: 'relative', minWidth: 140 }}>
          <select
            value={filters.targetType}
            onChange={(e) => onChange({ ...filters, targetType: e.target.value })}
            style={{
              width: '100%',
              appearance: 'none',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '9px 32px 9px 14px',
              color: 'var(--text-primary)',
              fontSize: 13,
              fontFamily: 'var(--font-sans)',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="">All targets</option>
            {targetOptions.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <Filter size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
        </div>

        {/* Date from */}
        <input
          type="date"
          value={filters.dateFrom ? filters.dateFrom.slice(0, 10) : ''}
          onChange={(e) => onChange({ ...filters, dateFrom: e.target.value ? `${e.target.value}T00:00:00` : '' })}
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 12px',
            color: 'var(--text-primary)',
            fontSize: 13,
            fontFamily: 'var(--font-sans)',
            outline: 'none',
            colorScheme: 'dark',
          }}
        />
        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>→</span>
        {/* Date to */}
        <input
          type="date"
          value={filters.dateTo ? filters.dateTo.slice(0, 10) : ''}
          onChange={(e) => onChange({ ...filters, dateTo: e.target.value ? `${e.target.value}T23:59:59` : '' })}
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 12px',
            color: 'var(--text-primary)',
            fontSize: 13,
            fontFamily: 'var(--font-sans)',
            outline: 'none',
            colorScheme: 'dark',
          }}
        />

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {hasActiveFilters && (
            <button
              onClick={clearAll}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '8px 14px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-default)',
                background: 'transparent',
                color: 'var(--text-muted)',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--border-strong)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border-default)'; }}
            >
              <X size={14} />
              Clear
            </button>
          )}

          <button
            onClick={onExport}
            disabled={!canExport}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: canExport ? 'linear-gradient(135deg, var(--navy-600), var(--navy-700))' : 'var(--bg-hover)',
              color: canExport ? '#fff' : 'var(--text-disabled)',
              fontSize: 13,
              fontWeight: 600,
              cursor: canExport ? 'pointer' : 'not-allowed',
              fontFamily: 'var(--font-sans)',
            }}
          >
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Active filter pills */}
      {hasActiveFilters && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {filters.action && (
            <FilterPill
              label={filters.action.replace(/_/g, ' ')}
              color={getAuditActionColor(filters.action)}
              onRemove={() => onChange({ ...filters, action: '' })}
            />
          )}
          {filters.userId && users.find((u) => u.id === filters.userId) && (
            <FilterPill
              label={users.find((u) => u.id === filters.userId).full_name}
              onRemove={() => onChange({ ...filters, userId: '' })}
            />
          )}
          {filters.targetType && (
            <FilterPill
              label={`Target: ${filters.targetType}`}
              onRemove={() => onChange({ ...filters, targetType: '' })}
            />
          )}
          {(filters.dateFrom || filters.dateTo) && (
            <FilterPill
              label={`${filters.dateFrom ? filters.dateFrom.slice(0, 10) : 'start'} → ${filters.dateTo ? filters.dateTo.slice(0, 10) : 'now'}`}
              onRemove={() => onChange({ ...filters, dateFrom: '', dateTo: '' })}
            />
          )}
        </div>
      )}
    </div>
  );
}

function FilterPill({ label, color, onRemove }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        borderRadius: 'var(--radius-sm)',
        background: color ? `${color}15` : 'var(--bg-hover)',
        border: color ? `1px solid ${color}30` : '1px solid var(--border-default)',
        color: color || 'var(--text-secondary)',
        fontSize: 12,
        fontWeight: 500,
      }}
    >
      {label}
      <button
        onClick={onRemove}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'inherit',
          cursor: 'pointer',
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          opacity: 0.7,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = 0.7)}
      >
        <X size={12} />
      </button>
    </span>
  );
}
