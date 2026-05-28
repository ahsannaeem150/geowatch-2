import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Loader2, AlertTriangle } from 'lucide-react';
import { listUsers, updateUser, deleteUser } from '../services/api.js';
import UserTable from '../components/Users/UserTable.jsx';
import CreateUserModal from '../components/Users/CreateUserModal.jsx';
import UserDetailDrawer from '../components/Users/UserDetailDrawer.jsx';
import BulkActionBar from '../components/Users/BulkActionBar.jsx';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 0 });
  const [filters, setFilters] = useState({ search: '', role: '', isActive: '' });
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [detailUserId, setDetailUserId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        sortBy,
        sortOrder,
        ...(filters.search && { search: filters.search }),
        ...(filters.role && { role: filters.role }),
        ...(filters.isActive !== '' && { isActive: filters.isActive }),
      };
      const data = await listUsers(params);
      setUsers(data.users);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, sortBy, sortOrder, filters]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPagination((p) => ({ ...p, page: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [filters.search, filters.role, filters.isActive]);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const handleSelect = (id, checked) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(new Set(users.map((u) => u.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handlePageChange = (page) => {
    setPagination((p) => ({ ...p, page }));
  };

  const handleToggleActive = async (user) => {
    try {
      await updateUser(user.id, { isActive: !user.is_active });
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to update user');
    }
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`Permanently delete ${user.full_name}?`)) return;
    try {
      await deleteUser(user.id);
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to delete user');
    }
  };

  const handleBulkAction = async (action) => {
    setActionLoading(true);
    const ids = Array.from(selectedIds);
    try {
      for (const id of ids) {
        if (action === 'deactivate') await updateUser(id, { isActive: false });
        else if (action === 'activate') await updateUser(id, { isActive: true });
        else if (action === 'delete') await deleteUser(id);
      }
      setSelectedIds(new Set());
      fetchUsers();
    } catch (err) {
      setError(err.message || `Bulk ${action} failed`);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Users</h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Manage platform users, roles, and access</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 18px',
            borderRadius: 8,
            border: 'none',
            background: 'linear-gradient(135deg, var(--navy-600), var(--navy-700))',
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
            boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 6px 20px rgba(37, 99, 235, 0.4)')}
          onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '0 4px 14px rgba(37, 99, 235, 0.3)')}
        >
          <Plus size={16} />
          Create user
        </button>
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 16px',
            background: 'rgba(244, 63, 94, 0.08)',
            border: '1px solid rgba(244, 63, 94, 0.2)',
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
          value={filters.role}
          onChange={(e) => setFilters((f) => ({ ...f, role: e.target.value }))}
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
          <option value="">All roles</option>
          <option value="super_admin">Super Admin</option>
          <option value="admin">Admin</option>
          <option value="viewer">Viewer</option>
        </select>

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
          <option value="false">Inactive</option>
        </select>
      </div>

      {/* Table */}
      <UserTable
        users={users}
        pagination={pagination}
        sortBy={sortBy}
        sortOrder={sortOrder}
        selectedIds={selectedIds}
        loading={loading}
        onSort={handleSort}
        onSelect={handleSelect}
        onSelectAll={handleSelectAll}
        onView={(user) => setDetailUserId(user.id)}
        onResetPassword={(user) => setDetailUserId(user.id)}
        onToggleActive={handleToggleActive}
        onDelete={handleDelete}
        onPageChange={handlePageChange}
      />

      {/* Modals / Drawers */}
      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => { setShowCreateModal(false); fetchUsers(); }}
        />
      )}

      {detailUserId && (
        <UserDetailDrawer
          userId={detailUserId}
          onClose={() => setDetailUserId(null)}
          onUpdate={() => fetchUsers()}
          onDelete={() => { setDetailUserId(null); fetchUsers(); }}
        />
      )}

      {/* Bulk action bar */}
      <BulkActionBar
        count={selectedIds.size}
        onDeactivate={() => handleBulkAction('deactivate')}
        onActivate={() => handleBulkAction('activate')}
        onDelete={() => {
          if (window.confirm(`Delete ${selectedIds.size} users?`)) {
            handleBulkAction('delete');
          }
        }}
        onClear={() => setSelectedIds(new Set())}
      />

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
            background: 'rgba(0, 0, 0, 0.4)',
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
