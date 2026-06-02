import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Check } from 'lucide-react';
import { createCategory, updateCategory } from '../../services/api.js';

const DEFAULT_SCHEMA = {
  type: 'scale',
  levels: [
    { value: 1, label: 'Low', color: 'var(--success)' },
    { value: 2, label: 'Medium', color: '#f59e0b' },
    { value: 3, label: 'High', color: '#f43f5e' },
    { value: 4, label: 'Critical', color: '#7f1d1d' },
  ],
};

function formatSchema(schema) {
  if (!schema) return JSON.stringify(DEFAULT_SCHEMA, null, 2);
  if (typeof schema === 'string') {
    try { return JSON.stringify(JSON.parse(schema), null, 2); } catch { return JSON.stringify(DEFAULT_SCHEMA, null, 2); }
  }
  return JSON.stringify(schema, null, 2);
}

export default function CategoryModal({ category, domains, onClose, onSaved }) {
  const isEdit = !!category;
  const [form, setForm] = useState({
    domainId: '',
    name: '',
    description: '',
    severitySchema: JSON.stringify(DEFAULT_SCHEMA, null, 2),
    defaultSeverity: '2',
    requiresLocation: false,
    requiresPhoto: false,
    requiresVideo: false,
  });
  const [schemaError, setSchemaError] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (category) {
      setForm({
        domainId: String(category.domain_id ?? ''),
        name: category.name || '',
        description: category.description || '',
        severitySchema: formatSchema(category.severity_schema),
        defaultSeverity: category.default_severity || '2',
        requiresLocation: category.requires_location ?? false,
        requiresPhoto: category.requires_photo ?? false,
        requiresVideo: category.requires_video ?? false,
      });
    } else if (domains.length > 0) {
      setForm((f) => ({ ...f, domainId: String(domains[0].id) }));
    }
  }, [category, domains]);

  const validateSchema = (text) => {
    try {
      JSON.parse(text);
      setSchemaError('');
      return true;
    } catch (err) {
      setSchemaError('Invalid JSON: ' + err.message);
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateSchema(form.severitySchema)) return;

    setIsLoading(true);
    try {
      const payload = {
        ...form,
        domainId: parseInt(form.domainId, 10),
        severitySchema: JSON.parse(form.severitySchema),
        sortOrder: 0,
      };
      if (isEdit) {
        await updateCategory(category.id, payload);
        setSuccess('Category updated successfully');
      } else {
        await createCategory(payload);
        setSuccess('Category created successfully');
      }
      onSaved?.();
      setTimeout(() => onClose(), 800);
    } catch (err) {
      setError(err.message || 'Failed to save category');
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
          borderRadius: 14,
          width: '100%',
          maxWidth: 560,
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
            {isEdit ? 'Edit Category' : 'Create Category'}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'var(--alert-error-bg)', border: '1px solid var(--alert-error-border)', borderRadius: 8, color: 'var(--danger)', fontSize: 13 }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}
          {success && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'var(--alert-success-bg)', border: '1px solid var(--alert-success-border)', borderRadius: 8, color: 'var(--success)', fontSize: 13 }}>
              <Check size={16} /> {success}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Domain
            </label>
            <select
              value={form.domainId}
              onChange={(e) => setForm({ ...form, domainId: e.target.value })}
              required
              disabled={isEdit}
              style={{
                background: 'var(--bg-base)',
                border: '1px solid var(--border-default)',
                borderRadius: 8,
                padding: '11px 14px',
                color: 'var(--text-primary)',
                fontSize: 14,
                fontFamily: 'var(--font-sans)',
                outline: 'none',
                cursor: isEdit ? 'not-allowed' : 'pointer',
                opacity: isEdit ? 0.6 : 1,
              }}
            >
              <option value="">Select a domain…</option>
              {domains.map((d) => (
                <option key={d.id} value={String(d.id)}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
          <FieldArea label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Severity Schema (JSON)
            </label>
            <textarea
              value={form.severitySchema}
              onChange={(e) => {
                setForm({ ...form, severitySchema: e.target.value });
                setSchemaError('');
              }}
              onBlur={(e) => validateSchema(e.target.value)}
              rows={8}
              spellCheck={false}
              style={{
                background: 'var(--bg-base)',
                border: `1px solid ${schemaError ? 'var(--danger)' : 'var(--border-default)'}`,
                borderRadius: 8,
                padding: '11px 14px',
                color: 'var(--text-primary)',
                fontSize: 13,
                fontFamily: 'var(--font-mono)',
                outline: 'none',
                resize: 'vertical',
                lineHeight: 1.5,
              }}
              onFocus={(e) => {
                if (!schemaError) {
                  e.target.style.borderColor = 'var(--navy-500)';
                  e.target.style.boxShadow = '0 0 0 3px var(--alert-info-bg)';
                }
              }}
            />
            {schemaError && (
              <span style={{ fontSize: 12, color: 'var(--danger)' }}>{schemaError}</span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Default Severity" value={form.defaultSeverity} onChange={(v) => setForm({ ...form, defaultSeverity: v })} />
          </div>

          <div style={{ display: 'flex', gap: 20, paddingTop: 4 }}>
            <CheckRow label="Requires Location" checked={form.requiresLocation} onChange={(v) => setForm({ ...form, requiresLocation: v })} />
            <CheckRow label="Requires Photo" checked={form.requiresPhoto} onChange={(v) => setForm({ ...form, requiresPhoto: v })} />
            <CheckRow label="Requires Video" checked={form.requiresVideo} onChange={(v) => setForm({ ...form, requiresVideo: v })} />
          </div>

          <button
            type="submit"
            disabled={isLoading || !!schemaError}
            style={{
              marginTop: 4,
              padding: '12px',
              borderRadius: 8,
              border: 'none',
              background: 'linear-gradient(135deg, var(--navy-600), var(--navy-700))',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              fontFamily: 'var(--font-sans)',
              cursor: isLoading || schemaError ? 'not-allowed' : 'pointer',
              opacity: isLoading || schemaError ? 0.7 : 1,
              boxShadow: '0 4px 14px var(--alert-info-border)',
            }}
          >
            {isLoading ? 'Saving…' : isEdit ? 'Update Category' : 'Create Category'}
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

function Field({ label, value, onChange, required }) {
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
        style={{
          background: 'var(--bg-base)',
          border: '1px solid var(--border-default)',
          borderRadius: 8,
          padding: '11px 14px',
          color: 'var(--text-primary)',
          fontSize: 14,
          fontFamily: 'var(--font-sans)',
          outline: 'none',
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
        rows={2}
        style={{
          background: 'var(--bg-base)',
          border: '1px solid var(--border-default)',
          borderRadius: 8,
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

function CheckRow({ label, checked, onChange }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, color: 'var(--text-secondary)' }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ cursor: 'pointer', width: 16, height: 16, accentColor: 'var(--navy-500)' }}
      />
      {label}
    </label>
  );
}
