import React, { useEffect, useMemo, useState } from 'react';
import { Hexagon } from 'lucide-react';
import { SEVERITY_SCALE, VERIFICATION_CONFIG } from '@shared/constants.js';
import { useZoneCategories } from '@shared/hooks/useZoneCategories.js';
import {
  PolygonMiniMap,
  ALL_SOURCE_TYPES,
  ZoneSourceModal,
  ZoneSourceListItem,
  ZoneCreateField,
  ZoneCreateSection,
  calculatePolygonAreaKm2,
  countVertices,
  detectSourceType,
  formatArea,
  toDatetimeLocal,
  fromDatetimeLocal,
} from './ZoneTrialCommon.jsx';
import './ZoneTrialCreatePage.css';
import RightPanelCollapseButton from '../RightPanelCollapseButton.jsx';

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'resolved', label: 'Resolved' },
];

function ensureClosedRing(ring) {
  if (!ring || ring.length === 0) return ring;
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) return ring;
  return [...ring, first];
}

function buildPayloadSources(sources) {
  const payloadSources = [];
  for (const item of sources) {
    const type = detectSourceType(item);
    if (type === 'media') {
      const url = item.url || '';
      if (url.startsWith('http')) {
        payloadSources.push({
          sourceType: 'image',
          sourceUrl: url,
          description: item.caption || '',
          displayOrder: 0,
        });
      }
    } else if (type === 'x_post') {
      payloadSources.push({
        sourceType: 'x_post',
        sourceUrl: item.tweetUrl || '',
        description: item.text || '',
        displayOrder: 0,
      });
    } else if (type === 'news_article') {
      payloadSources.push({
        sourceType: 'news_article',
        sourceUrl: item.url || '',
        description: [item.title, item.publisher].filter(Boolean).join(' · '),
        displayOrder: 0,
      });
    } else if (type === 'admin_note') {
      payloadSources.push({
        sourceType: 'admin_note',
        description: item.text || '',
        displayOrder: 0,
      });
    }
  }
  return payloadSources;
}

export default function ZoneEditorSidebar({ geometry, initialData, onSubmit, onCancel, submitting, onCollapse }) {
  const isEdit = !!initialData;
  const { categories, loading: catsLoading } = useZoneCategories();

  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [categoryId, setCategoryId] = useState('');
  const [severity, setSeverity] = useState(String(initialData?.severity ?? 3));
  const [status, setStatus] = useState(initialData?.status || 'active');
  const [verification, setVerification] = useState(initialData?.verification || 'unverified');
  const [startDate, setStartDate] = useState(
    toDatetimeLocal(initialData?.startDate || new Date().toISOString())
  );
  const [endDate, setEndDate] = useState(toDatetimeLocal(initialData?.endDate));
  const [sources, setSources] = useState([]);
  const [modal, setModal] = useState(null);

  useEffect(() => {
    if (isEdit && initialData?.zoneCategoryId != null) {
      setCategoryId(String(initialData.zoneCategoryId));
    } else if (!isEdit && categories.length > 0) {
      setCategoryId(String(categories[0].id));
    }
  }, [isEdit, initialData?.zoneCategoryId, categories]);

  const category = useMemo(
    () => categories.find((c) => String(c.id) === String(categoryId)) || categories[0],
    [categories, categoryId]
  );

  const ring = geometry?.coordinates?.[0] || [];
  const closedRing = useMemo(() => ensureClosedRing(ring), [ring]);
  const vertexCount = useMemo(() => countVertices(ring), [ring]);
  const areaKm2 = useMemo(() => calculatePolygonAreaKm2(ring), [ring]);

  const addSource = (type) => setModal({ type });
  const editSource = (item) => setModal({ type: detectSourceType(item), item });
  const closeModal = () => setModal(null);

  const saveSource = (itemOrItems) => {
    const items = Array.isArray(itemOrItems) ? itemOrItems : [itemOrItems];
    if (modal?.item) {
      setSources((prev) =>
        prev.map((s) => (s.id === modal.item.id ? { ...items[0], id: s.id } : s))
      );
    } else {
      setSources((prev) => [...prev, ...items.map((item) => ({ ...item, id: uid() }))]);
    }
    setModal(null);
  };

  const deleteSource = (id) => {
    setSources((prev) => prev.filter((s) => s.id !== id));
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategoryId(categories.length > 0 ? String(categories[0].id) : '');
    setSeverity('3');
    setStatus('active');
    setVerification('unverified');
    setStartDate(toDatetimeLocal(new Date().toISOString()));
    setEndDate('');
    setSources([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !categoryId) return;

    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      zoneCategoryId: parseInt(categoryId, 10),
      severity: parseInt(severity, 10),
      status,
      verificationStatus: verification,
      startDate: fromDatetimeLocal(startDate),
      endDate: endDate ? fromDatetimeLocal(endDate) : null,
    };

    const mediaFiles = sources.filter((s) => detectSourceType(s) === 'media' && (s.url || '').startsWith('data:'));
    const payloadSources = buildPayloadSources(sources);

    if (!isEdit) {
      payload.geometryType = 'polygon';
      payload.geometry = { type: 'Polygon', coordinates: [closedRing] };
      payload.sources = payloadSources;
    }

    await onSubmit({ payload, sources: payloadSources, mediaFiles });
  };

  return (
    <aside className="zone-create-sidebar" style={{ borderRight: 'none', borderLeft: '1px solid var(--border-subtle)' }}>
      <form className="zone-create-form" onSubmit={handleSubmit}>
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

        <div
          className="zone-create-form__scroll"
          style={
            onCollapse
              ? { padding: '0 calc(28px * var(--admin-ui-scale)) calc(28px * var(--admin-ui-scale))' }
              : undefined
          }
        >
          <div
            className="zone-create-header"
            style={{
              paddingTop: 'calc(12px * var(--admin-ui-scale))',
              marginBottom: 'calc(16px * var(--admin-ui-scale))',
            }}
          >
            <div className="zone-create-header__icon">
              <Hexagon size={20} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 className="zone-create-header__title">
                {isEdit ? 'Edit zone' : 'Create zone'}
              </h1>
              <p className="zone-create-header__subtitle">
                {isEdit ? 'Update zone metadata' : 'New polygon incident entry form'}
              </p>
            </div>
          </div>

          <ZoneCreateSection title="Zone narrative">
            <ZoneCreateField label="Zone title">
              <input
                className="zone-create-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., No-Fly Zone Over Eastern Region"
                required
                disabled={submitting}
              />
            </ZoneCreateField>
            <ZoneCreateField label="Description" hint="This becomes the initial report text.">
              <textarea
                className="zone-create-input zone-create-input--textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the restriction, affected area, and current status..."
                disabled={submitting}
              />
            </ZoneCreateField>
          </ZoneCreateSection>

          <ZoneCreateSection title="Classification">
            <ZoneCreateField label="Zone category">
              <select
                className="zone-create-input"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
                disabled={catsLoading || submitting}
              >
                <option value="">— Select zone category —</option>
                {categories.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name}
                  </option>
                ))}
              </select>
            </ZoneCreateField>
            <div className="zone-create-row">
              <ZoneCreateField label="Severity">
                <select
                  className="zone-create-input"
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  disabled={submitting}
                >
                  {SEVERITY_SCALE.map((s) => (
                    <option key={s.value} value={String(s.value)}>
                      {s.value} — {s.label}
                    </option>
                  ))}
                </select>
              </ZoneCreateField>
              <ZoneCreateField label="Status">
                <select
                  className="zone-create-input"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  disabled={submitting}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </ZoneCreateField>
            </div>
            <ZoneCreateField label="Verification">
              <select
                className="zone-create-input"
                value={verification}
                onChange={(e) => setVerification(e.target.value)}
                disabled={submitting}
              >
                {Object.entries(VERIFICATION_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>
                    {cfg.label}
                  </option>
                ))}
              </select>
            </ZoneCreateField>
          </ZoneCreateSection>

          <ZoneCreateSection title="Timing">
            <div className="zone-create-row">
              <ZoneCreateField label="Start date">
                <input
                  className="zone-create-input"
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  disabled={submitting}
                />
              </ZoneCreateField>
              <ZoneCreateField label="End date (optional)">
                <input
                  className="zone-create-input"
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  disabled={submitting}
                />
              </ZoneCreateField>
            </div>
          </ZoneCreateSection>

          <ZoneCreateSection title="Polygon geometry">
            <div className="zone-create-map">
              <PolygonMiniMap
                geometry={{ type: 'Polygon', coordinates: [closedRing] }}
                color={category?.color || '#6366f1'}
                animated
              />
            </div>
            <div className="zone-create-geo-stats">
              <div>
                <span className="zone-create-geo-stats__label">Vertices:</span>
                <span className="zone-create-geo-stats__value">{vertexCount}</span>
              </div>
              <div>
                <span className="zone-create-geo-stats__label">Area:</span>
                <span className="zone-create-geo-stats__value">{formatArea(areaKm2 * 1_000_000)}</span>
              </div>
            </div>
          </ZoneCreateSection>

          {!isEdit && (
            <ZoneCreateSection title="Initial-report evidence">
              <p className="zone-create-field__hint" style={{ marginTop: 0 }}>
                Add sources that will be attached to the automatically-created initial report.
              </p>
              <div className="zone-create-source-toolbar">
                <span className="zone-create-source-toolbar__label">Add:</span>
                {ALL_SOURCE_TYPES.map((type) => (
                  <button
                    key={type.key}
                    type="button"
                    className="zone-create-source-btn"
                    onClick={() => addSource(type.key)}
                    disabled={submitting}
                  >
                    <span>{type.icon}</span>
                    {type.label}
                  </button>
                ))}
              </div>
              <div className="zone-create-source-list">
                {sources.map((item) => (
                  <ZoneSourceListItem
                    key={item.id}
                    item={item}
                    onEdit={() => editSource(item)}
                    onDelete={() => deleteSource(item.id)}
                  />
                ))}
                {sources.length === 0 && (
                  <div className="zone-create-source-empty">
                    No evidence added yet. Use the buttons above.
                  </div>
                )}
              </div>
            </ZoneCreateSection>
          )}

          <div className="zone-create-actions">
            <button type="submit" className="zone-create-btn zone-create-btn--primary" disabled={submitting}>
              {submitting ? (isEdit ? 'Saving…' : 'Creating…') : isEdit ? 'Save changes' : 'Create zone'}
            </button>
            {!isEdit && (
              <button type="button" className="zone-create-btn" onClick={resetForm} disabled={submitting}>
                Reset
              </button>
            )}
            <button type="button" className="zone-create-btn" onClick={onCancel} disabled={submitting}>
              Cancel
            </button>
          </div>
        </div>
      </form>

      {modal && (
        <ZoneSourceModal type={modal.type} item={modal.item} onClose={closeModal} onSave={saveSource} />
      )}
    </aside>
  );
}
