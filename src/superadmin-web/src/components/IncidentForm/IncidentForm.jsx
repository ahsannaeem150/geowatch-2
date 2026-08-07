import React, { useState, useEffect, useRef } from 'react';
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
  onCoordsChange,
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

  // Keep coords in sync when the map marker is placed/moved/dragged
  // (initialCoords changes from the map side, create and edit mode alike).
  // When the marker is CLEARED (initialCoords goes non-null → null), clear the
  // fields symmetrically — placement only ever fills lat/lng. The ref guard
  // keeps edit mode's first render (initialCoords still null while MapPage's
  // effect is about to set it) from wiping the initialData-derived values.
  const hadCoordsRef = useRef(!!initialCoords);
  useEffect(() => {
    if (initialCoords) {
      hadCoordsRef.current = true;
      setLatitude(initialCoords.lat.toFixed(6));
      setLongitude(initialCoords.lng.toFixed(6));
    } else if (hadCoordsRef.current) {
      hadCoordsRef.current = false;
      setLatitude('');
      setLongitude('');
    }
  }, [initialCoords]);

  const coordsValid =
    latitude.trim() !== '' && longitude.trim() !== '' &&
    Number.isFinite(parseFloat(latitude)) && Number.isFinite(parseFloat(longitude));

  // Two-way sync: valid typed coords move/drop the map marker.
  const handleLatChange = (e) => {
    const v = e.target.value;
    setLatitude(v);
    const la = parseFloat(v);
    const lo = parseFloat(longitude);
    if (Number.isFinite(la) && Number.isFinite(lo)) onCoordsChange?.(la, lo);
  };
  const handleLngChange = (e) => {
    const v = e.target.value;
    setLongitude(v);
    const la = parseFloat(latitude);
    const lo = parseFloat(v);
    if (Number.isFinite(la) && Number.isFinite(lo)) onCoordsChange?.(la, lo);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!coordsValid) return;
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
              onChange={handleLatChange}
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
              onChange={handleLngChange}
              required
              style={inputStyle}
            />
          </div>
        </div>
        {!coordsValid && (
          <p style={{ margin: '-8px 0 16px', fontSize: 11, color: 'var(--warning)', lineHeight: 1.4 }}>
            Place the marker on the map or enter coordinates
          </p>
        )}

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
            disabled={submitting || !coordsValid}
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
              opacity: submitting || !coordsValid ? 0.6 : 1,
            }}
          >
            {submitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Incident'}
          </button>
        </div>
      </form>
    </div>
  );
}
