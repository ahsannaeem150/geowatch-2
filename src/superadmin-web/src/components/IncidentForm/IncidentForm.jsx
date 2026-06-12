import React, { useState, useEffect } from 'react';
import { SEVERITY_SCALE } from '@shared/constants.js';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'resolved', label: 'Resolved' },
];

export default function IncidentForm({
  initialData = null,
  initialCoords = null,
  categories = [],
  onSubmit,
  onCancel,
  submitting = false,
}) {
  const isEdit = !!initialData;

  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [latitude, setLatitude] = useState(
    initialData?.latitude?.toString() || initialCoords?.lat?.toString() || ''
  );
  const [longitude, setLongitude] = useState(
    initialData?.longitude?.toString() || initialCoords?.lng?.toString() || ''
  );
  const [categoryId, setCategoryId] = useState(initialData?.category_id?.toString() || '');
  const [severity, setSeverity] = useState(initialData?.severity?.toString() || '3');
  const [status, setStatus] = useState(initialData?.status || 'active');
  const [startDate, setStartDate] = useState(
    initialData?.start_date ? new Date(initialData.start_date).toISOString().slice(0, 16) : ''
  );
  const [endDate, setEndDate] = useState(
    initialData?.end_date ? new Date(initialData.end_date).toISOString().slice(0, 16) : ''
  );
  const [locationContext, setLocationContext] = useState(initialData?.location_context || '');

  // Keep coords in sync if initialCoords changes (create mode)
  useEffect(() => {
    if (initialCoords && !isEdit) {
      setLatitude(initialCoords.lat.toString());
      setLongitude(initialCoords.lng.toString());
    }
  }, [initialCoords, isEdit]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      title,
      description: description || undefined,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      categoryId: categoryId ? parseInt(categoryId, 10) : undefined,
      severity: parseInt(severity, 10),
      status,
      startDate: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
      endDate: endDate ? new Date(endDate).toISOString() : null,
      locationContext: locationContext || undefined,
    };
    onSubmit(payload);
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    background: 'var(--bg-input)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-sans)',
    fontSize: '13px',
    outline: 'none',
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '6px',
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: 'var(--text-secondary)',
  };

  return (
    <div style={{ padding: '20px', overflowY: 'auto', height: '100%' }}>
      <h2
        style={{
          margin: '0 0 20px',
          fontSize: 'var(--text-h2)',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-sans)',
        }}
      >
        {isEdit ? 'Edit Incident' : 'Create Incident'}
      </h2>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            style={inputStyle}
            placeholder="Incident title"
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            style={{ ...inputStyle, resize: 'vertical' }}
            placeholder="Brief description"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <div>
            <label style={labelStyle}>Latitude *</label>
            <input
              type="number"
              step="any"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              required
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Longitude *</label>
            <input
              type="number"
              step="any"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              required
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Category</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            style={inputStyle}
          >
            <option value="">Select category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <div>
            <label style={labelStyle}>Severity *</label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              required
              style={inputStyle}
            >
              {SEVERITY_SCALE.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={inputStyle}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Start Date *</label>
          <input
            type="datetime-local"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>End Date</label>
          <input
            type="datetime-local"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>Location Context</label>
          <input
            type="text"
            value={locationContext}
            onChange={(e) => setLocationContext(e.target.value)}
            style={inputStyle}
            placeholder="e.g. Kyiv, Ukraine"
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            style={{
              padding: '9px 18px',
              fontSize: '13px',
              fontWeight: 600,
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
              background: 'transparent',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: '9px 18px',
              fontSize: '13px',
              fontWeight: 600,
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: 'var(--accent)',
              color: '#f2f2f2',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Incident'}
          </button>
        </div>
      </form>
    </div>
  );
}
