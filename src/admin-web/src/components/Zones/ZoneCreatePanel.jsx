import React, { useState, useEffect } from 'react';
import { Button } from '@shared/components/Button.jsx';
import { useCategories } from '@shared/hooks/useCategories.js';
import { api } from '../../services/api.js';

function calculatePolygonArea(coords) {
  // coords: [[lng, lat], [lng, lat], ...] (closed or open)
  if (coords.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < coords.length; i++) {
    const j = (i + 1) % coords.length;
    area += coords[i][0] * coords[j][1];
    area -= coords[j][0] * coords[i][1];
  }
  // Convert to approximate square kilometers
  // 1 degree ≈ 111.32 km at equator; we use a rough average
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

export default function ZoneCreatePanel({
  geometry,
  vertexCount,
  onSubmit,
  onCancel,
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { categories, loading: catsLoading } = useCategories();

  const areaKm2 = geometry?.coordinates?.[0] ? calculatePolygonArea([...geometry.coordinates[0], geometry.coordinates[0][0]]) : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || submitting) return;

    // Ensure the polygon ring is closed (first == last coordinate)
    const ring = geometry?.coordinates?.[0] ? [...geometry.coordinates[0]] : [];
    if (ring.length > 0) {
      const first = ring[0];
      const last = ring[ring.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        ring.push(first);
      }
    }

    setSubmitting(true);
    try {
      const res = await api.createZone({
        name: name.trim(),
        description: description.trim() || undefined,
        geometry: { type: 'Polygon', coordinates: [ring] },
        category: category || undefined,
      });
      onSubmit?.(res.data?.zone);
    } catch (err) {
      alert(err.message || 'Failed to create zone');
    } finally {
      setSubmitting(false);
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
        Create New Zone
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

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <Button type="submit" variant="primary" disabled={!name.trim() || submitting}>
            {submitting ? 'Creating...' : 'Create Zone'}
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
