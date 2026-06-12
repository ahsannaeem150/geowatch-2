import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Button } from '@shared/components/Button.jsx';
import { SEVERITY_SCALE } from '@shared/constants.js';
import { useZoneCategories } from '@shared/hooks/useZoneCategories.js';

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
  if (km2 < 1) return `~${(km2 * 100).toFixed(1)} ha`;
  if (km2 < 1000) return `~${km2.toFixed(1)} km²`;
  return `~${(km2 / 1000).toFixed(1)}k km²`;
}

function ensureClosedRing(ring) {
  if (!ring || ring.length === 0) return ring;
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) return ring;
  return [...ring, first];
}

export default function ZoneForm({
  geometry,
  initialData,
  onSubmit,
  onCancel,
  submitting,
}) {
  const isEdit = !!initialData;
  const { categories, loading: catsLoading } = useZoneCategories();

  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [zoneCategoryId, setZoneCategoryId] = useState('');
  const [severity, setSeverity] = useState(initialData?.severity?.toString() || '3');
  const [status, setStatus] = useState(initialData?.status || 'active');
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
  const [sources, setSources] = useState([
    { sourceType: 'admin_note', sourceUrl: '', description: '', verificationStatus: 'unverified' },
  ]);

  useEffect(() => {
    if (isEdit && initialData?.zone_category_id != null) {
      setZoneCategoryId(String(initialData.zone_category_id));
    } else if (!isEdit && categories.length > 0) {
      setZoneCategoryId(String(categories[0].id));
    }
  }, [isEdit, initialData?.zone_category_id, categories]);

  useEffect(() => {
    if (isEdit && initialData?.sources) {
      setSources(initialData.sources);
    }
  }, [isEdit, initialData?.sources]);

  const ring = geometry?.coordinates?.[0] ? ensureClosedRing(geometry.coordinates[0]) : [];
  const vertexCount = ring.length - (ring.length > 0 ? 1 : 0);
  const areaKm2 = calculatePolygonArea(ring);

  const handleAddSource = () => {
    setSources([...sources, { sourceType: 'admin_note', sourceUrl: '', description: '', verificationStatus: 'unverified' }]);
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
      title: title.trim(),
      description: description.trim() || undefined,
      zoneCategoryId: parseInt(zoneCategoryId, 10),
      severity: parseInt(severity, 10),
      status,
      startDate: new Date(startDate).toISOString(),
      endDate: endDate ? new Date(endDate).toISOString() : null,
      ...(isEdit
        ? {}
        : {
            sources: sources
              .filter((s) => s.sourceUrl?.trim() || s.description?.trim())
              .map((s) => ({
                sourceType: s.sourceType,
                verificationStatus: s.verificationStatus || 'unverified',
                ...(s.sourceUrl?.trim() ? { sourceUrl: s.sourceUrl.trim() } : {}),
                ...(s.description?.trim() ? { description: s.description.trim() } : {}),
              })),
          }),
    };

    if (!isEdit) {
      payload.geometryType = 'polygon';
      payload.geometry = { type: 'Polygon', coordinates: [ring] };
    }

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
          {isEdit ? 'Edit Zone' : 'Create New Zone'}
        </h3>
      </div>

      {/* Core Info */}
      <div style={sectionBox}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={labelBase}>Zone Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={500}
              style={inputBase}
              placeholder="e.g., No-Fly Zone Over Eastern Region"
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
              placeholder="Detailed description of the zone..."
              onFocus={(e) => (e.target.style.borderColor = 'var(--accent-light)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border-subtle)')}
            />
          </div>
        </div>
      </div>

      {/* Classification */}
      <div style={sectionBox}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={labelBase}>Zone Category</label>
            <select
              value={zoneCategoryId}
              onChange={(e) => setZoneCategoryId(e.target.value)}
              required
              disabled={catsLoading}
              style={inputBase}
            >
              <option value="">— Select zone category —</option>
              {categories.map((cat) => (
                <option key={cat.id} value={String(cat.id)}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={labelBase}>Severity</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                style={inputBase}
              >
                {SEVERITY_SCALE.map((level) => (
                  <option key={level.value} value={String(level.value)}>
                    {level.value} — {level.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelBase}>Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={inputBase}
              >
                <option value="active">Active</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={labelBase}>Start Date</label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                style={inputBase}
              />
            </div>
            <div>
              <label style={labelBase}>End Date</label>
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={inputBase}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Geometry Stats */}
      <div style={sectionBox}>
        <label style={labelBase}>Polygon Geometry</label>
        <div
          style={{
            display: 'flex',
            gap: '16px',
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
      </div>

      {/* Sources — only editable when creating a new zone */}
      {!isEdit && (
      <div style={sectionBox}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <label style={{ ...labelBase, marginBottom: 0 }}>Sources</label>
          <Button type="button" variant="ghost" size="sm" onClick={handleAddSource}>
            + Add Source
          </Button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {sources.map((source, index) => (
            <div key={index} style={{ padding: '12px', background: 'var(--bg-deep)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                <select
                  value={source.sourceType}
                  onChange={(e) => handleSourceChange(index, 'sourceType', e.target.value)}
                  style={{ ...inputBase, flex: '0 0 130px' }}
                >
                  <option value="x_post">X Post</option>
                  <option value="news_article">News Article</option>
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                  <option value="admin_note">Admin Note</option>
                </select>
                <input
                  type="text"
                  value={source.sourceUrl}
                  onChange={(e) => handleSourceChange(index, 'sourceUrl', e.target.value)}
                  placeholder="URL (optional)"
                  style={inputBase}
                />
                <select
                  value={source.verificationStatus}
                  onChange={(e) => handleSourceChange(index, 'verificationStatus', e.target.value)}
                  style={{ ...inputBase, flex: '0 0 130px' }}
                >
                  <option value="unverified">Unverified</option>
                  <option value="verified">Verified</option>
                  <option value="disputed">Disputed</option>
                  <option value="debunked">Debunked</option>
                </select>
                <button
                  type="button"
                  onClick={() => handleRemoveSource(index)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--danger)',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  Remove
                </button>
              </div>
              <textarea
                value={source.description}
                onChange={(e) => handleSourceChange(index, 'description', e.target.value)}
                placeholder="Description or note..."
                rows={2}
                style={{ ...inputBase, resize: 'vertical' }}
              />
            </div>
          ))}
        </div>
      </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
        <Button type="submit" variant="primary" disabled={submitting || !title.trim()}>
          {submitting ? 'Saving…' : isEdit ? 'Update Zone' : 'Create Zone'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
