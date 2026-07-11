import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Button } from '@shared/components/Button.jsx';
import { SEVERITY_SCALE, VERIFICATION_CONFIG } from '@shared/constants.js';
import { useCategories } from '@shared/hooks/useCategories.js';
import RightPanelCollapseButton from '@shared/components/RightPanelCollapseButton.jsx';

export default function IncidentForm({
  initialCoords,
  initialData,
  onSubmit,
  onCancel,
  submitting,
  onCollapse,
}) {
  const isEdit = !!initialData;
  const { categories, domains, loading: catsLoading, getCategoryById, getCategoriesByDomain } = useCategories();

  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [latitude, setLatitude] = useState(initialData?.latitude?.toString() || initialCoords?.lat?.toString() || '');
  const [longitude, setLongitude] = useState(initialData?.longitude?.toString() || initialCoords?.lng?.toString() || '');
  const [locationContext, setLocationContext] = useState(initialData?.location_context || initialCoords?.locationContext || '');
  const [locationLoading, setLocationLoading] = useState(false);
  const [domainId, setDomainId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [severity, setSeverity] = useState(initialData?.severity?.toString() || '3');
  const [verificationStatus, setVerificationStatus] = useState(initialData?.verification_status || 'unverified');
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
  const [heroImageFile, setHeroImageFile] = useState(null);

  // Set initial domain/category for edit mode once categories load
  useEffect(() => {
    if (isEdit && initialData?.category_id != null && categories.length > 0 && !domainId) {
      const cat = getCategoryById(initialData.category_id);
      if (cat) {
        setDomainId(String(cat.domain_id));
        setCategoryId(String(initialData.category_id));
      }
    }
  }, [isEdit, initialData?.category_id, categories, getCategoryById, domainId]);

  // Set defaults for create mode once domains load
  useEffect(() => {
    if (!isEdit && domains.length > 0 && !domainId) {
      const firstDomain = domains[0];
      setDomainId(String(firstDomain.id));
      const cats = getCategoriesByDomain(firstDomain.id);
      if (cats.length > 0) {
        setCategoryId(String(cats[0].id));
      }
    }
  }, [isEdit, domains, domainId, getCategoriesByDomain]);

  // When domain changes, ensure selected category belongs to that domain
  useEffect(() => {
    if (domainId && categories.length > 0) {
      const cats = getCategoriesByDomain(parseInt(domainId, 10));
      if (cats.length > 0) {
        const currentInDomain = cats.some((c) => String(c.id) === categoryId);
        if (!currentInDomain) {
          setCategoryId(String(cats[0].id));
        }
      }
    }
  }, [domainId, categories, getCategoriesByDomain]);

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
      categoryId: parseInt(categoryId, 10),
      severity: parseInt(severity, 10),
      startDate: new Date(startDate).toISOString(),
      endDate: endDate ? new Date(endDate).toISOString() : null,
      locationContext: locationContext || undefined,
      verificationStatus,
      sources: sources
        .filter((s) => s.sourceUrl?.trim() || s.description?.trim())
        .map((s) => ({
          sourceType: s.sourceType,

          ...(s.sourceUrl?.trim() ? { sourceUrl: s.sourceUrl.trim() } : {}),
          ...(s.description?.trim() ? { description: s.description.trim() } : {}),
        })),
    };
    onSubmit(payload, { heroImageFile });
  };

  const inputBase = {
    background: 'var(--bg-input)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-sm)',
    padding: 'calc(10px * var(--admin-ui-scale)) calc(12px * var(--admin-ui-scale))',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-sans)',
    fontSize: 'calc(13px * var(--admin-ui-scale))',
    outline: 'none',
    width: '100%',
    transition: 'border-color 0.15s ease',
  };

  const labelBase = {
    fontSize: 'calc(11px * var(--admin-ui-scale))',
    color: 'var(--text-muted)',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
    marginBottom: 'calc(6px * var(--admin-ui-scale))',
    display: 'block',
  };

  const sectionBox = {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-lg)',
    padding: 'calc(16px * var(--admin-ui-scale))',
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'calc(16px * var(--admin-ui-scale))' }}>
      {onCollapse && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            height: 'calc(38px * var(--admin-ui-scale))',
            padding: '0 calc(16px * var(--admin-ui-scale))',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-surface)',
            flexShrink: 0,
          }}
        >
          <RightPanelCollapseButton onClick={onCollapse} />
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(10px * var(--admin-ui-scale))', padding: 'calc(12px * var(--admin-ui-scale)) calc(16px * var(--admin-ui-scale))', marginBottom: 'calc(4px * var(--admin-ui-scale))' }}>
        <div style={{ width: 'calc(3px * var(--admin-ui-scale))', height: 'calc(20px * var(--admin-ui-scale))', background: 'var(--accent)', borderRadius: '2px' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ margin: 0, fontSize: 'calc(16px * var(--admin-ui-scale))', fontWeight: 700, color: 'var(--text-primary)' }}>
            {isEdit ? 'Edit Incident' : 'Create New Incident'}
          </h3>
        </div>
      </div>

      {/* Core Info */}
      <div style={sectionBox}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(14px * var(--admin-ui-scale))' }}>
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'calc(12px * var(--admin-ui-scale))' }}>
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
            marginTop: 'calc(8px * var(--admin-ui-scale))',
            padding: 'calc(8px * var(--admin-ui-scale)) calc(12px * var(--admin-ui-scale))',
            background: locationContext ? 'var(--accent-subtle-bg)' : 'var(--bg-deep)',
            border: `1px solid ${locationContext ? 'var(--accent-subtle-border)' : 'var(--border-subtle)'}`,
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: 'calc(8px * var(--admin-ui-scale))',
            minHeight: '36px',
          }}
        >
          <span style={{ fontSize: 'calc(13px * var(--admin-ui-scale))' }}>📍</span>
          {locationLoading && !locationContext ? (
            <span
              style={{
                display: 'inline-block',
                width: 'calc(14px * var(--admin-ui-scale))',
                height: 'calc(14px * var(--admin-ui-scale))',
                border: '2px solid var(--border-subtle)',
                borderTopColor: 'var(--accent-light)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
          ) : locationContext ? (
            <span style={{ fontSize: 'calc(12px * var(--admin-ui-scale))', color: 'var(--accent-light)', fontWeight: 500 }}>
              {locationContext}
            </span>
          ) : (
            <span style={{ fontSize: 'calc(12px * var(--admin-ui-scale))', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Locating...
            </span>
          )}
        </div>
        <p style={{ fontSize: 'calc(11px * var(--admin-ui-scale))', color: 'var(--text-muted)', marginTop: 'calc(6px * var(--admin-ui-scale))' }}>
          Double-click the map to auto-fill coordinates
        </p>
      </div>

      {/* Classification */}
      <div style={sectionBox}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'calc(12px * var(--admin-ui-scale))' }}>
          <div>
            <label style={labelBase}>Domain</label>
            <select
              value={domainId}
              onChange={(e) => setDomainId(e.target.value)}
              required
              disabled={catsLoading}
              style={{ ...inputBase, cursor: 'pointer' }}
            >
              {domains.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelBase}>Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
              disabled={catsLoading}
              style={{ ...inputBase, cursor: 'pointer' }}
            >
              {getCategoriesByDomain(parseInt(domainId, 10)).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'calc(12px * var(--admin-ui-scale))', marginTop: 'calc(12px * var(--admin-ui-scale))' }}>
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
          <div>
            <label style={labelBase}>Verification</label>
            <select
              value={verificationStatus}
              onChange={(e) => setVerificationStatus(e.target.value)}
              style={{ ...inputBase, cursor: 'pointer' }}
            >
              {Object.entries(VERIFICATION_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>
                  {cfg.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Dates */}
      <div style={sectionBox}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'calc(12px * var(--admin-ui-scale))' }}>
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

      {/* Hero image */}
      {!isEdit && (
        <div style={sectionBox}>
          <label style={labelBase}>Hero Image (optional)</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setHeroImageFile(e.target.files?.[0] || null)}
            style={inputBase}
          />
          {heroImageFile && (
            <p style={{ fontSize: 'calc(12px * var(--admin-ui-scale))', color: 'var(--text-secondary)', marginTop: 'calc(8px * var(--admin-ui-scale))' }}>
              Selected: {heroImageFile.name}
            </p>
          )}
        </div>
      )}

      {/* Sources */}
      {!isEdit && (
        <div style={sectionBox}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'calc(12px * var(--admin-ui-scale))' }}>
            <label style={{ ...labelBase, marginBottom: 0 }}>Sources</label>
            <Button type="button" variant="ghost" size="sm" onClick={handleAddSource}>
              + Add Source
            </Button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(10px * var(--admin-ui-scale))' }}>
            {sources.map((src, i) => (
              <div key={i} style={{ background: 'var(--bg-deep)', padding: 'calc(12px * var(--admin-ui-scale))', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', gap: 'calc(8px * var(--admin-ui-scale))', marginBottom: 'calc(8px * var(--admin-ui-scale))' }}>
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
                    style={{ ...inputBase, marginBottom: 'calc(8px * var(--admin-ui-scale))' }}
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

      <div style={{ display: 'flex', gap: 'calc(10px * var(--admin-ui-scale))', marginTop: 'calc(4px * var(--admin-ui-scale))' }}>
        <Button type="submit" variant="primary" disabled={submitting || catsLoading}>
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
