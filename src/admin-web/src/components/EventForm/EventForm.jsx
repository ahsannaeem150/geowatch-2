import React, { useState, useEffect } from 'react';
import { Button } from '@shared/components/Button.jsx';
import { Badge } from '@shared/components/Badge.jsx';
import { CATEGORY_LABELS, SEVERITY_SCALE } from '@shared/constants.js';

export default function EventForm({
  initialCoords,
  initialData,
  onSubmit,
  onCancel,
  submitting,
}) {
  const isEdit = !!initialData;

  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [latitude, setLatitude] = useState(initialData?.latitude?.toString() || initialCoords?.lat?.toString() || '');
  const [longitude, setLongitude] = useState(initialData?.longitude?.toString() || initialCoords?.lng?.toString() || '');
  const [category, setCategory] = useState(initialData?.category || 'conflict');
  const [severity, setSeverity] = useState(initialData?.severity?.toString() || '3');
  const [startDate, setStartDate] = useState(initialData?.start_date?.slice(0, 10) || new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(initialData?.end_date?.slice(0, 10) || '');
  const [sources, setSources] = useState([{ sourceType: 'admin_note', sourceUrl: '', description: '' }]);

  useEffect(() => {
    if (initialCoords) {
      setLatitude(initialCoords.lat.toFixed(6));
      setLongitude(initialCoords.lng.toFixed(6));
    }
  }, [initialCoords]);

  const handleAddSource = () => {
    setSources([...sources, { sourceType: 'admin_note', sourceUrl: '', description: '' }]);
  };

  const handleSourceChange = (index, field, value) => {
    const next = [...sources];
    next[index][field] = value;
    setSources(next);
  };

  const handleRemoveSource = (index) => {
    setSources(sources.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      title,
      description: description || undefined,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      category,
      severity: parseInt(severity, 10),
      startDate,
      endDate: endDate || null,
      sources: sources.filter((s) => s.sourceUrl || s.description),
    };
    onSubmit(payload);
  };

  const inputStyle = {
    background: 'var(--bg-input)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 12px',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-sans)',
    fontSize: 'var(--text-body)',
    outline: 'none',
    width: '100%',
  };

  const labelStyle = {
    fontSize: 'var(--text-caption)',
    color: 'var(--text-secondary)',
    fontWeight: 500,
    marginBottom: '6px',
    display: 'block',
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h3 style={{ fontSize: 'var(--text-h3)', fontWeight: 600, color: 'var(--text-primary)' }}>
        {isEdit ? 'Edit Event' : 'Create New Event'}
      </h3>

      <div>
        <label style={labelStyle}>Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={500}
          style={inputStyle}
          placeholder="Event title"
        />
      </div>

      <div>
        <label style={labelStyle}>Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          style={{ ...inputStyle, resize: 'vertical' }}
          placeholder="Detailed description"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <label style={labelStyle}>Latitude</label>
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
          <label style={labelStyle}>Longitude</label>
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <label style={labelStyle}>Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            style={{ ...inputStyle, cursor: 'pointer' }}
          >
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Severity</label>
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            required
            style={{ ...inputStyle, cursor: 'pointer' }}
          >
            {SEVERITY_SCALE.map((s) => (
              <option key={s.value} value={s.value}>
                {s.value} — {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <label style={labelStyle}>Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>End Date (optional)</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>

      {!isEdit && (
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>Sources</label>
            <Button type="button" variant="ghost" size="sm" onClick={handleAddSource}>
              + Add Source
            </Button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {sources.map((src, i) => (
              <div key={i} style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <select
                    value={src.sourceType}
                    onChange={(e) => handleSourceChange(i, 'sourceType', e.target.value)}
                    style={{ ...inputStyle, flex: 1 }}
                  >
                    <option value="admin_note">Admin Note</option>
                    <option value="x_post">X / Twitter Post</option>
                    <option value="news_article">News Article</option>
                  </select>
                  {sources.length > 1 && (
                    <Button type="button" variant="danger" size="sm" onClick={() => handleRemoveSource(i)}>
                      ×
                    </Button>
                  )}
                </div>
                {src.sourceType === 'x_post' && (
                  <input
                    type="url"
                    value={src.sourceUrl}
                    onChange={(e) => handleSourceChange(i, 'sourceUrl', e.target.value)}
                    placeholder="https://x.com/..."
                    style={{ ...inputStyle, marginBottom: '8px' }}
                  />
                )}
                <textarea
                  value={src.description}
                  onChange={(e) => handleSourceChange(i, 'description', e.target.value)}
                  placeholder="Description or context"
                  rows={2}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? 'Saving...' : isEdit ? 'Update Event' : 'Create Event'}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
