import React, { useState, useEffect } from 'react';
import { Button } from '@shared/components/Button.jsx';
import { useCategories } from '@shared/hooks/useCategories.js';

const ZONE_COLORS = [
  '#9f1239', '#dc2626', '#f59e0b', '#22c55e',
  '#3b82f6', '#a855f7', '#14b8a6', '#6b7280',
];

function calculatePolygonArea(coords) {
  if (coords.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < coords.length; i++) {
    const j = (i + 1) % coords.length;
    area += coords[i][0] * coords[j][1];
    area -= coords[j][0] * coords[i][1];
  }
  return Math.abs(area) / 2 * 111.32 * 111.32;
}

function formatArea(km2) {
  if (km2 < 1) {
    return `~${(km2 * 100).toFixed(1)} ha`;
  }
  if (km2 < 1000) {
    return `~${km2.toFixed(1)} km²`;
  }
  return `~${(km2 / 1000).toFixed(1)}k km²`;
}

export default function ZoneEditPanel({
  zone,
  vertexCount,
  onSave,
  onCancel,
  onDelete,
}) {
  const [name, setName] = useState(zone?.name || '');
  const [description, setDescription] = useState(zone?.description || '');
  const [category, setCategory] = useState(zone?.category || '');
  const [fillColor, setFillColor] = useState(zone?.fill_color || '#9f1239');
  const [submitting, setSubmitting] = useState(false);
  const { categories, loading: catsLoading } = useCategories();

  // Reset form when zone changes
  useEffect(() => {
    setName(zone?.name || '');
    setDescription(zone?.description || '');
    setCategory(zone?.category || '');
    setFillColor(zone?.fill_color || '#9f1239');
  }, [zone?.id]);

  // Area from the zone's original geometry (we don't have live editing vertices here)
  const areaKm2 = zone?.geometry?.coordinates?.[0]
    ? calculatePolygonArea(zone.geometry.coordinates[0])
    : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onSave?.({
        name: name.trim(),
        description: description.trim() || undefined,
        category: category || undefined,
        fillColor,
        strokeColor: fillColor,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (
      window.confirm(
        `Are you sure you want to delete "${zone?.name}"? This action cannot be undone.`
      )
    ) {
      onDelete?.();
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    fontSize: '13px',
    fontFamily: 'var(--font-sans)',
    background: 'var(--bg-deep)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    outline: 'none',
    transition: 'border-color 0.2s ease',
  };

  const labelStyle = {
    display: 'block',
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '6px',
  };

  return (
    <div className="panel-card" style={{ padding: '20px' }}>
      <h2
        style={{
          fontSize: '16px',
          fontWeight: 700,
          color: 'var(--text-primary)',
          margin: '0 0 16px 0',
          paddingBottom: '12px',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        Edit Zone
      </h2>

      <form onSubmit={handleSubmit}>
        {/* Name */}
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>
            Name <span style={{ color: 'var(--danger, #ef4444)' }}>*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Conflict Zone Alpha"
            style={inputStyle}
            required
            autoFocus
          />
        </div>

        {/* Description */}
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description of this zone..."
            rows={3}
            style={{ ...inputStyle, resize: 'vertical', minHeight: '60px' }}
          />
        </div>

        {/* Category */}
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={inputStyle}
            disabled={catsLoading}
          >
            <option value="">— Select category —</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.slug}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Color */}
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Zone Color</label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {ZONE_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setFillColor(c)}
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: c,
                  border: c === fillColor ? '3px solid var(--text-primary)' : '2px solid transparent',
                  cursor: 'pointer',
                  boxShadow: c === fillColor ? `0 0 8px ${c}` : 'none',
                  transition: 'all 0.15s ease',
                }}
                title={c}
              />
            ))}
          </div>
        </div>

        {/* Stats */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
            marginBottom: '20px',
            padding: '10px 12px',
            background: 'var(--bg-deep)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '12px',
            color: 'var(--text-secondary)',
          }}
        >
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Vertices: </span>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{vertexCount}</span>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Area: </span>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatArea(areaKm2)}</span>
          </div>
        </div>

        {/* Hint text */}
        <div
          style={{
            fontSize: '11px',
            color: 'var(--text-muted)',
            marginBottom: '16px',
            lineHeight: 1.5,
          }}
        >
          <span style={{ color: 'var(--warning, #f59e0b)', fontWeight: 600 }}>Tip:</span> Drag the
          white handles to reshape the polygon. Click the orange midpoints to add vertices.
          Double-click a white handle to delete it (minimum 3 vertices).
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
          <Button type="submit" variant="primary" disabled={!name.trim() || submitting}>
            {submitting ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        </div>

        {/* Delete */}
        <Button
          type="button"
          variant="ghost"
          onClick={handleDelete}
          disabled={submitting}
          style={{
            color: 'var(--danger, #ef4444)',
            borderColor: 'rgba(239, 68, 68, 0.3)',
            width: '100%',
          }}
        >
          Delete Zone
        </Button>
      </form>
    </div>
  );
}
