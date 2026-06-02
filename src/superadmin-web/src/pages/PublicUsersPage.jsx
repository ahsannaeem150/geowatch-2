import React, { useState, useEffect, useCallback } from 'react';
import { Search, Loader2, AlertTriangle } from 'lucide-react';
import { listPublicUsers, updatePublicUser } from '../services/api.js';
import { useEventSource } from '../hooks/useEventSource.js';
import PublicUserTable from '../components/PublicUsers/PublicUserTable.jsx';
import PublicUserDrawer from '../components/PublicUsers/PublicUserDrawer.jsx';

export default function PublicUsersPage() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 0 });
  const [filters, setFilters] = useState({ search: '', isActive: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [detailUserId, setDetailUserId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...(filters.search && { search: filters.search }),
        ...(filters.isActive !== '' && { isActive: filters.isActive }),
      };
      const data = await listPublicUsers(params);
      setUsers(data.users);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.message || 'Failed to load public users');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Real-time SSE: refresh public user list when users are created/updated
  const { connected } = useEventSource({
    onEvent: (data) => {
      if (['public_user_created', 'public_user_updated'].includes(data.type)) {
        fetchUsers();
      }
    },
  });

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPagination((p) => ({ ...p, page: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [filters.search, filters.isActive]);

  const handlePageChange = (page) => {
    setPagination((p) => ({ ...p, page }));
  };

  const handleToggleActive = async (user) => {
    try {
      await updatePublicUser(user.id, { isActive: !user.is_active });
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to update user');
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Public Users</h1>
            {connected && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 12,
                  background: 'var(--badge-green-bg)',
                  color: 'var(--badge-green-text)',
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'var(--success)',
                    animation: 'pulse 2s infinite',
                  }}
                />
                Live
              </span>
            )}
          </div>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>Manage Google-authenticated public users and their access</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 16px',
            background: 'var(--alert-error-bg)',
            border: '1px solid var(--alert-error-border)',
            borderRadius: 8,
            color: 'var(--danger)',
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          <AlertTriangle size={16} />
          {error}
          <button
            onClick={() => setError('')}
            style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 12 }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filters */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 16,
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 8,
            padding: '8px 14px',
            flex: 1,
            minWidth: 240,
            maxWidth: 360,
          }}
        >
          <Search size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: 13,
              fontFamily: 'var(--font-sans)',
              width: '100%',
            }}
          />
        </div>

        <select
          value={filters.isActive}
          onChange={(e) => setFilters((f) => ({ ...f, isActive: e.target.value }))}
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 8,
            padding: '9px 14px',
            color: 'var(--text-primary)',
            fontSize: 13,
            fontFamily: 'var(--font-sans)',
            outline: 'none',
            cursor: 'pointer',
            minWidth: 130,
          }}
        >
          <option value="">All statuses</option>
          <option value="true">Active</option>
          <option value="false">Banned</option>
        </select>
      </div>

      {/* Table */}
      <PublicUserTable
        users={users}
        pagination={pagination}
        loading={loading}
        onView={(user) => setDetailUserId(user.id)}
        onToggleActive={handleToggleActive}
        onPageChange={handlePageChange}
      />

      {/* Drawer */}
      {detailUserId && (
        <PublicUserDrawer
          userId={detailUserId}
          onClose={() => setDetailUserId(null)}
          onUpdate={() => fetchUsers()}
        />
      )}

      {/* Action loading overlay */}
      {actionLoading && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--backdrop)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 24px', background: 'var(--bg-elevated)', borderRadius: 10, border: '1px solid var(--border-default)' }}>
            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>Processing...</span>
          </div>
        </div>
      )}
    </div>
  );
}
