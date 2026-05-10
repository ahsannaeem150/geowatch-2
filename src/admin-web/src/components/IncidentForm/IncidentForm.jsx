import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Button } from '@shared/components/Button.jsx';
import { CATEGORY_LABELS, SEVERITY_SCALE } from '@shared/constants.js';

export default function IncidentForm({
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
  const [locationContext, setLocationContext] = useState(initialData?.location_context || initialCoords?.locationContext || '');
  const [locationLoading, setLocationLoading] = useState(false);
  const [category, setCategory] = useState(initialData?.category || 'conflict');
  const [severity, setSeverity] = useState(initialData?.severity?.toString() || '3');
  const [startDate, setStartDate] = useState(
    initialData?.start_date
      ? format(new Date(initialData.start_date), "yyyy-MM-dd'T'HH:mm")
      : format(new Date(), "yyyy-MM-dd'T'HH:mm")
  );
  const [endDate, setEndDate] = useState(
    initialData?.end_date
      ? format(new Date(initialData.end_date), "yyyy-MM-dd'T'HH:mm")
      : ''
  );
  const [sources, setSources] = useState([{ sourceType: 'admin_note', sourceUrl: '', description: '' }]);

  useEffect(() => {
    if (initialCoords) {
      setLatitude(initialCoords.lat.toFixed(6));
      setLongitude(initialCoords.lng.toFixed(6));
      if (initialCoords.locationContext === undefined) {
        // Still loading — reverse geocode hasn't returned yet
        setLocationLoading(true);
        setLocationContext('');
      } else {
        // Loading done — either success (string) or failure (null)
        setLocationLoading(false);
        setLocationContext(initialCoords.locationContext || '');
      }
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
      startDate: new Date(startDate).toISOString(),
      endDate: endDate ? new Date(endDate).toISOString() : null,
      locationContext: locationContext || undefined,
      sources: sources
        .filter((s) => s.sourceUrl?.trim() || s.description?.trim())
        .map((s) => ({
          sourceType: s.sourceType,
          ...(s.sourceUrl?.trim() ? { sourceUrl: s.sourceUrl.trim() } : {}),
          ...(s.description?.trim() ? { description: s.description.trim() } : {}),
        })),
    };
    onSubmit(payload);
  };

  const inputBase = {
    background: 'var(--bg-input)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 12px',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-sans)',
    fontSize: '13px',
    outline: 'none',
    width: '100%',
    transition: 'border-color 0.15s ease',
  };

  const labelBase = {
    fontSize: '11px',
    color: 'var(--text-muted)',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
    marginBottom: '6px',
    display: 'block',
  };

  const sectionBox = {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-lg)',
    padding: '16px',
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
        <div style={{ width: '3px', height: '20px', background: 'var(--accent)', borderRadius: '2px' }} />
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
          {isEdit ? 'Edit Incident' : 'Create New Incident'}
        </h3>
      </div>

      {/* Core Info */}
      <div style={sectionBox}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={labelBase}>Incident Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={500}
              style={inputBase}
              placeholder="e.g. Border Tensions Near Donbas"
              onFocus={(e) => (e.target.style.borderColor = 'var(--accent-light)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border-subtle)')}
            />
          </div>

          <div>
            <label style={labelBase}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              style={{ ...inputBase, resize: 'vertical', lineHeight: 1.6 }}
              placeholder="Detailed description of the incident..."
              onFocus={(e) => (e.target.style.borderColor = 'var(--accent-light)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border-subtle)')}
            />
          </div>
        </div>
      </div>

      {/* Location */}
      <div style={sectionBox}>
        <label style={labelBase}>Coordinates</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <input
            type="number"
            step="any"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            required
            style={inputBase}
            placeholder="Latitude"
            onFocus={(e) => (e.target.style.borderColor = 'var(--accent-light)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--border-subtle)')}
          />
          <input
            type="number"
            step="any"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            required
            style={inputBase}
            placeholder="Longitude"
            onFocus={(e) => (e.target.style.borderColor = 'var(--accent-light)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--border-subtle)')}
          />
        </div>
        {/* Location context badge */}
        <div
          style={{
            marginTop: '8px',
            padding: '8px 12px',
            background: locationContext ? 'rgba(159, 18, 57, 0.08)' : 'var(--bg-deep)',
            border: `1px solid ${locationContext ? 'rgba(159, 18, 57, 0.25)' : 'var(--border-subtle)'}`,},{
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            minHeight: '36px',
          }}
        >
          <span style={{ fontSize: '13px' }}>📍</span>
          {locationLoading && !locationContext ? (
            <span
              style={{
                display: 'inline-block',
                width: '14px',
                height: '14px',
                border: '2px solid var(--border-subtle)',
                borderTopColor: 'var(--accent-light)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
          ) : locationContext ? (
            <span style={{ fontSize: '12px', color: 'var(--accent-light)', fontWeight: 500 }}>
              {locationContext}
            </span>
          ) : (
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Locating...
            </span>
          )}
        </div>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
          Double-click the map to auto-fill coordinates
        </p>
      </div>

      {/* Classification */}
      <div style={sectionBox}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={labelBase}>Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
              style={{ ...inputBase, cursor: 'pointer' }}
            >
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelBase}>Severity</label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              required
              style={{ ...inputBase, cursor: 'pointer' }}
            >
              {SEVERITY_SCALE.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.value} — {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Dates */}
      <div style={sectionBox}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={labelBase}>Start Date & Time</label>
            <input
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              style={inputBase}
            />
          </div>
          <div>
            <label style={labelBase}>End Date & Time (optional)</label>
            <input
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={inputBase}
            />
          </div>
        </div>
      </div>

      {/* Sources */}
      {!isEdit && (
        <div style={sectionBox}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <label style={{ ...labelBase, marginBottom: 0 }}>Sources</label>
            <Button type="button" variant="ghost" size="sm" onClick={handleAddSource}>
              + Add Source
            </Button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {sources.map((src, i) => (
              <div key={i} style={{ background: 'var(--bg-deep)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <select
                    value={src.sourceType}
                    onChange={(e) => handleSourceChange(i, 'sourceType', e.target.value)}
                    style={{ ...inputBase, flex: 1 }}
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
                    style={{ ...inputBase, marginBottom: '8px' }}
                  />
                )}
                <textarea
                  value={src.description}
                  onChange={(e) => handleSourceChange(i, 'description', e.target.value)}
                  placeholder="Description or context"
                  rows={2}
                  style={{ ...inputBase, resize: 'vertical' }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? 'Saving...' : isEdit ? 'Update Incident' : 'Create Incident'}
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
