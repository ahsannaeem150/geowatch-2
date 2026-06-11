import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Loader2, AlertTriangle, Edit3, Trash2, Shield,
} from 'lucide-react';
import {
  listZoneCategories, deleteZoneCategory,
} from '../services/api.js';
import { getIconComponent } from '../components/Domains/IconPicker.jsx';
import ZoneCategoryModal from '../components/ZoneCategories/ZoneCategoryModal.jsx';

export default function ZoneCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [modal, setModal] = useState(null); // null | { mode:'create' } | { mode:'edit', category }
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listZoneCategories();
      setCategories(data);
    } catch (err) {
      setError(err.message || 'Failed to load zone categories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteZoneCategory(deleteConfirm.id);
      await fetchData();
    } catch (err) {
      setError(err.message || 'Failed to delete zone category');
    } finally {
      setDeleteConfirm(null);
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Zone Categories</h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Manage polygon zone taxonomy</p>
        </div>
        <button
          onClick={() => setModal({ mode: 'create' })}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 18px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: 'linear-gradient(135deg, var(--navy-600), var(--navy-700))',
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            fontFamily: 'var(--font-sans)',
            cursor: 'pointer',
            boxShadow: '0 4px 14px var(--alert-info-border)',
          }}
        >
          <Plus size={16} /> New Zone Category
        </button>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: 'var(--alert-error-bg)', border: '1px solid var(--alert-error-border)', borderRadius: 'var(--radius-sm)', color: 'var(--danger)', fontSize: 14, marginBottom: 20 }}>
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {loading && categories.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 12, color: 'var(--text-muted)' }}>
          <Loader2 size={20} className="spin" /> Loading zone categories…
        </div>
      ) : categories.length === 0 ? (
        <div className="console-card" style={{ padding: '48px', textAlign: 'center', borderStyle: 'dashed' }}>
          <Shield size={40} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)' }}>No zone categories yet</h2>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', maxWidth: 400, margin: '0 auto 20px' }}>
            Create your first zone category to classify polygon zones on the map.
          </p>
          <button
            onClick={() => setModal({ mode: 'create' })}
            style={{
              padding: '10px 18px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-default)',
              background: 'var(--bg-base)',
              color: 'var(--text-primary)',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Create Zone Category
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              onEdit={() => setModal({ mode: 'edit', category })}
              onDelete={() => setDeleteConfirm(category)}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <ZoneCategoryModal
          category={modal.mode === 'edit' ? modal.category : null}
          onClose={() => setModal(null)}
          onSaved={fetchData}
        />
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <DeleteConfirmModal
          name={deleteConfirm.name}
          onConfirm={handleDelete}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
}

function CategoryCard({ category, onEdit, onDelete }) {
  const Icon = getIconComponent(category.icon);

  return (
    <div className="console-card" style={{ overflow: 'hidden' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '16px 20px',
        }}
      >
        {/* Color Swatch */}
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 'var(--radius-md)',
            background: category.color || '#3b82f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: `0 0 12px ${(category.color || '#3b82f6') + '40'}`,
          }}
        >
          {Icon ? <Icon size={20} color="#fff" /> : <Shield size={20} color="#fff" />}
        </div>

        {/* Category Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
              {category.name}
            </h3>
            <span
              style={{
                fontSize: 11,
                color: 'var(--text-muted)',
                background: 'var(--bg-base)',
                padding: '2px 8px',
                borderRadius: 4,
                fontFamily: 'var(--font-mono)',
                textTransform: 'lowercase',
              }}
            >
              {category.slug}
            </span>
            {!category.is_active && (
              <span
                style={{
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  background: 'var(--bg-base)',
                  padding: '2px 8px',
                  borderRadius: 4,
                  fontWeight: 600,
                }}
              >
                Inactive
              </span>
            )}
          </div>
          {category.description && (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {category.description}
            </p>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <ActionBtn onClick={onEdit} title="Edit zone category">
            <Edit3 size={15} />
          </ActionBtn>
          <ActionBtn onClick={onDelete} title="Delete zone category" danger>
            <Trash2 size={15} />
          </ActionBtn>
        </div>
      </div>
    </div>
  );
}

function ActionBtn({ children, onClick, title, danger }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 30,
        height: 30,
        borderRadius: 6,
        border: 'none',
        background: 'transparent',
        color: danger ? 'var(--danger)' : 'var(--text-muted)',
        cursor: 'pointer',
        transition: 'background var(--transition-fast), color var(--transition-fast)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = danger ? 'rgba(244, 63, 94, 0.1)' : 'var(--bg-active)';
        e.currentTarget.style.color = danger ? 'var(--danger)' : 'var(--text-primary)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = danger ? 'var(--danger)' : 'var(--text-muted)';
      }}
    >
      {children}
    </button>
  );
}

function DeleteConfirmModal({ name, onConfirm, onCancel }) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--backdrop)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)',
          width: '100%',
          maxWidth: 400,
          padding: '24px',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <AlertTriangle size={22} color="var(--danger)" />
          <h3 style={{ fontSize: 16, fontWeight: 600 }}>Delete zone category?</h3>
        </div>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.5 }}>
          Are you sure you want to delete <strong style={{ color: 'var(--text-primary)' }}>{name}</strong>?
          This cannot be undone if active zones reference this category.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            disabled={loading}
            style={{
              padding: '10px 16px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-default)',
              background: 'transparent',
              color: 'var(--text-primary)',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            style={{
              padding: '10px 16px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: 'var(--danger)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
