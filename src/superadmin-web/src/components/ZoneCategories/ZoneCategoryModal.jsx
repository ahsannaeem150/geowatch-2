import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Check } from 'lucide-react';
import { createZoneCategory, updateZoneCategory } from '../../services/api.js';
import IconPicker from '../Domains/IconPicker.jsx';

export default function ZoneCategoryModal({ category, onClose, onSaved }) {
  const isEdit = !!category;
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    color: '#3b82f6',
    icon: 'shield',
    sortOrder: 0,
    isActive: true,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (category) {
      setForm({
        name: category.name || '',
        slug: category.slug || '',
        description: category.description || '',
        color: category.color || '#3b82f6',
        icon: category.icon || 'shield',
        sortOrder: category.sort_order ?? 0,
        isActive: category.is_active ?? true,
      });
    }
  }, [category]);

  const generateSlug = (name) => name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const handleNameChange = (value) => {
    const next = { ...form, name: value };
    if (!isEdit) {
      next.slug = generateSlug(value);
    }
    setForm(next);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const payload = {
        ...form,
        sortOrder: Number(form.sortOrder),
      };
      if (isEdit) {
        await updateZoneCategory(category.id, payload);
        setSuccess('Zone category updated successfully');
      } else {
        await createZoneCategory(payload);
        setSuccess('Zone category created successfully');
      }
      onSaved?.();
      setTimeout(() => onClose(), 800);
    } catch (err) {
      setError(err.message || 'Failed to save zone category');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--backdrop)',
        backdropFilter: 'blur(4px)',
        animation: 'fadeIn 0.2s ease forwards',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)',
          width: '100%',
          maxWidth: 480,
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: 'var(--shadow-lg)',
          animation: 'slideUp 0.2s ease forwards',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 600 }}>
            {isEdit ? 'Edit Zone Category' : 'Create Zone Category'}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 4,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'var(--alert-error-bg)', border: '1px solid var(--alert-error-border)', borderRadius: 'var(--radius-sm)', color: 'var(--danger)', fontSize: 13 }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}
          {success && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'var(--alert-success-bg)', border: '1px solid var(--alert-success-border)', borderRadius: 'var(--radius-sm)', color: 'var(--success)', fontSize: 13 }}>
              <Check size={16} /> {success}
            </div>
          )}

          <Field label="Name" value={form.name} onChange={handleNameChange} required />

          <Field
            label="Slug"
            value={form.slug}
            onChange={(v) => setForm({ ...form, slug: v })}
            required
            pattern="^[a-z0-9-]+$"
            disabled={isEdit}
          />

          <FieldArea label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} />

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
                Color
              </label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  style={{
                    width: 44,
                    height: 40,
                    padding: 2,
                    background: 'var(--bg-base)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                  }}
                />
                <input
                  type="text"
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  pattern="^#[0-9A-Fa-f]{6}$"
                  placeholder="#3b82f6"
                  style={{
                    flex: 1,
                    background: 'var(--bg-base)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '11px 14px',
                    color: 'var(--text-primary)',
                    fontSize: 14,
                    fontFamily: 'var(--font-mono)',
                    outline: 'none',
                  }}
                />
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
                Sort Order
              </label>
              <input
                type="number"
                min={0}
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value, 10) || 0 })}
                style={{
                  width: '100%',
                  background: 'var(--bg-base)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '11px 14px',
                  color: 'var(--text-primary)',
                  fontSize: 14,
                  fontFamily: 'var(--font-sans)',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Icon
            </label>
            <IconPicker value={form.icon} onChange={(v) => setForm({ ...form, icon: v })} />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, color: 'var(--text-secondary)' }}>
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              style={{ cursor: 'pointer', width: 16, height: 16, accentColor: 'var(--navy-500)' }}
            />
            Active (visible in dropdowns)
          </label>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              marginTop: 4,
              padding: '12px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: 'linear-gradient(135deg, var(--navy-600), var(--navy-700))',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              fontFamily: 'var(--font-sans)',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.7 : 1,
              boxShadow: '0 4px 14px var(--alert-info-border)',
            }}
          >
            {isLoading ? 'Saving…' : isEdit ? 'Update Zone Category' : 'Create Zone Category'}
          </button>
        </form>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function Field({ label, value, onChange, required, pattern, disabled }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        pattern={pattern}
        disabled={disabled}
        style={{
          background: 'var(--bg-base)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-sm)',
          padding: '11px 14px',
          color: 'var(--text-primary)',
          fontSize: 14,
          fontFamily: 'var(--font-sans)',
          outline: 'none',
          opacity: disabled ? 0.6 : 1,
          cursor: disabled ? 'not-allowed' : 'text',
        }}
        onFocus={(e) => {
          e.target.style.borderColor = 'var(--navy-500)';
          e.target.style.boxShadow = '0 0 0 3px var(--alert-info-bg)';
        }}
        onBlur={(e) => {
          e.target.style.borderColor = 'var(--border-default)';
          e.target.style.boxShadow = 'none';
        }}
      />
    </div>
  );
}

function FieldArea({ label, value, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        style={{
          background: 'var(--bg-base)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-sm)',
          padding: '11px 14px',
          color: 'var(--text-primary)',
          fontSize: 14,
          fontFamily: 'var(--font-sans)',
          outline: 'none',
          resize: 'vertical',
        }}
        onFocus={(e) => {
          e.target.style.borderColor = 'var(--navy-500)';
          e.target.style.boxShadow = '0 0 0 3px var(--alert-info-bg)';
        }}
        onBlur={(e) => {
          e.target.style.borderColor = 'var(--border-default)';
          e.target.style.boxShadow = 'none';
        }}
      />
    </div>
  );
}
