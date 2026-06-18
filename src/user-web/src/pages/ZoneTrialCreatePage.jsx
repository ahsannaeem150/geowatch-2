import React, { useEffect, useMemo, useState } from 'react';
import './ZoneTrialCreatePage.css';
import { SEVERITY_SCALE, VERIFICATION_CONFIG } from '@shared/constants.js';
import { formatArea, countVertices } from '@shared/utils/zoneGeometry.js';
import { PolygonMiniMap } from './ZoneTrialCommon.jsx';
import { Hexagon, Plane, Lock, Ship, AlertTriangle, X } from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────────
   Trial create-zone sidebar for /trial/zone-create.
   Fresh user-web UI for creating polygon incidents. Visual prototype only.
   ───────────────────────────────────────────────────────────────────────────── */

const MOCK_ZONE_CATEGORIES = [
  { id: 'notam', name: 'NOTAM', color: '#6366f1', icon: Plane },
  { id: 'curfew', name: 'Curfew', color: '#7c3aed', icon: Lock },
  { id: 'no-fly', name: 'No-Fly Zone', color: '#ef4444', icon: Plane },
  { id: 'maritime', name: 'Maritime Restriction', color: '#0ea5e9', icon: Ship },
  { id: 'restricted', name: 'Restricted Area', color: '#f59e0b', icon: AlertTriangle },
];

const ALL_SOURCE_TYPES = [
  { key: 'media', label: 'Media', icon: '🖼️' },
  { key: 'x_post', label: 'X Post', icon: '𝕏' },
  { key: 'news_article', label: 'News Article', icon: '📰' },
  { key: 'admin_note', label: 'Admin Note', icon: '📝' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'resolved', label: 'Resolved' },
];

// Dummy polygon for the preview mini-map (Karachi NOTAM shape)
const DUMMY_POLYGON = {
  type: 'Polygon',
  coordinates: [
    [
      [67.005, 24.82],
      [67.095, 24.82],
      [67.12, 24.875],
      [67.085, 24.92],
      [67.03, 24.935],
      [66.98, 24.895],
      [66.965, 24.85],
      [67.005, 24.82],
    ],
  ],
};

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function toDatetimeLocal(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const offset = d.getTimezoneOffset() * 60000;
    const local = new Date(d.getTime() - offset);
    return local.toISOString().slice(0, 16);
  } catch {
    return '';
  }
}

function fromDatetimeLocal(value) {
  if (!value) return null;
  return new Date(value).toISOString();
}

function calculatePolygonAreaKm2(ring) {
  if (!ring || ring.length < 3) return 0;
  const closed =
    ring[ring.length - 1][0] === ring[0][0] && ring[ring.length - 1][1] === ring[0][1]
      ? ring
      : [...ring, ring[0]];
  let area = 0;
  for (let i = 0; i < closed.length - 1; i++) {
    const [x1, y1] = closed[i];
    const [x2, y2] = closed[i + 1];
    area += x1 * y2 - x2 * y1;
  }
  // Rough conversion from degree² to km²
  return Math.abs(area) / 2 * 111.32 * 111.32;
}

function Field({ label, children, hint }) {
  return (
    <div className="zone-create-field">
      <label className="zone-create-field__label">{label}</label>
      {children}
      {hint && <p className="zone-create-field__hint">{hint}</p>}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="zone-create-section">
      {title && (
        <div className="zone-create-section__header">
          <div className="zone-create-section__accent" />
          <h4 className="zone-create-section__title">{title}</h4>
        </div>
      )}
      {children}
    </div>
  );
}

export default function ZoneTrialCreatePage() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState(MOCK_ZONE_CATEGORIES[0].id);
  const [severity, setSeverity] = useState('3');
  const [status, setStatus] = useState('active');
  const [verification, setVerification] = useState('verified');
  const [startDate, setStartDate] = useState(toDatetimeLocal(new Date().toISOString()));
  const [endDate, setEndDate] = useState('');
  const [sources, setSources] = useState([]);
  const [modal, setModal] = useState(null);

  const category = useMemo(
    () => MOCK_ZONE_CATEGORIES.find((c) => c.id === categoryId) || MOCK_ZONE_CATEGORIES[0],
    [categoryId]
  );

  const ring = DUMMY_POLYGON.coordinates[0];
  const vertexCount = countVertices(ring);
  const areaKm2 = calculatePolygonAreaKm2(ring);

  const addSource = (type) => setModal({ type });
  const editSource = (item) => setModal({ type: detectSourceType(item), item });
  const closeModal = () => setModal(null);

  const saveSource = (itemOrItems) => {
    const items = Array.isArray(itemOrItems) ? itemOrItems : [itemOrItems];
    if (modal?.item) {
      setSources((prev) => prev.map((s) => (s.id === modal.item.id ? { ...items[0], id: s.id } : s)));
    } else {
      setSources((prev) => [...prev, ...items.map((item) => ({ ...item, id: uid() }))]);
    }
    setModal(null);
  };

  const deleteSource = (id) => {
    setSources((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      zoneCategoryId: categoryId,
      zoneCategoryName: category.name,
      zoneCategoryColor: category.color,
      severity: parseInt(severity, 10),
      status,
      verification,
      startDate: fromDatetimeLocal(startDate),
      endDate: endDate ? fromDatetimeLocal(endDate) : null,
      geometryType: 'polygon',
      geometry: DUMMY_POLYGON,
      areaSqM: areaKm2 * 1_000_000,
      perimeterM: 0,
      sources,
    };
    // eslint-disable-next-line no-console
    console.log('Trial create-zone payload:', payload);
    window.alert('This is a visual prototype. No zone was created.');
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategoryId(MOCK_ZONE_CATEGORIES[0].id);
    setSeverity('3');
    setStatus('active');
    setVerification('verified');
    setStartDate(toDatetimeLocal(new Date().toISOString()));
    setEndDate('');
    setSources([]);
  };

  return (
    <div className="zone-create-page">
      <aside className="zone-create-sidebar">
        <form className="zone-create-form" onSubmit={handleSubmit}>
          <div className="zone-create-form__scroll">
            {/* Header */}
            <div className="zone-create-header">
              <div className="zone-create-header__icon">
                <Hexagon size={20} />
              </div>
              <div>
                <h1 className="zone-create-header__title">Create zone</h1>
                <p className="zone-create-header__subtitle">New polygon incident entry form</p>
              </div>
            </div>

            {/* Core info */}
            <Section title="Zone narrative">
              <Field label="Zone title">
                <input
                  className="zone-create-input"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., No-Fly Zone Over Eastern Region"
                  required
                />
              </Field>
              <Field label="Description" hint="This becomes the initial report text.">
                <textarea
                  className="zone-create-input zone-create-input--textarea"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the restriction, affected area, and current status..."
                />
              </Field>
            </Section>

            {/* Classification */}
            <Section title="Classification">
              <Field label="Zone category">
                <select
                  className="zone-create-input"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  {MOCK_ZONE_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="zone-create-row">
                <Field label="Severity">
                  <select
                    className="zone-create-input"
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                  >
                    {SEVERITY_SCALE.map((s) => (
                      <option key={s.value} value={String(s.value)}>
                        {s.value} — {s.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Status">
                  <select
                    className="zone-create-input"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Verification">
                <select
                  className="zone-create-input"
                  value={verification}
                  onChange={(e) => setVerification(e.target.value)}
                >
                  {Object.entries(VERIFICATION_CONFIG).map(([key, cfg]) => (
                    <option key={key} value={key}>
                      {cfg.label}
                    </option>
                  ))}
                </select>
              </Field>
            </Section>

            {/* Timing */}
            <Section title="Timing">
              <div className="zone-create-row">
                <Field label="Start date">
                  <input
                    className="zone-create-input"
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </Field>
                <Field label="End date (optional)">
                  <input
                    className="zone-create-input"
                    type="datetime-local"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </Field>
              </div>
            </Section>

            {/* Polygon preview */}
            <Section title="Polygon geometry">
              <div className="zone-create-map">
                <PolygonMiniMap
                  geometry={DUMMY_POLYGON}
                  color={category.color}
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
              <p className="zone-create-field__hint">
                This is a dummy polygon for the trial preview. In production the admin will draw the zone on the map.
              </p>
            </Section>

            {/* Sources */}
            <Section title="Initial-report evidence">
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
                  >
                    <span>{type.icon}</span>
                    {type.label}
                  </button>
                ))}
              </div>
              <div className="zone-create-source-list">
                {sources.map((item) => (
                  <SourceListItem
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
            </Section>

            {/* Actions */}
            <div className="zone-create-actions">
              <button type="submit" className="zone-create-btn zone-create-btn--primary">
                Create zone
              </button>
              <button type="button" className="zone-create-btn" onClick={resetForm}>
                Reset
              </button>
            </div>
          </div>
        </form>
      </aside>

      <div className="zone-create-backdrop" />

      {modal && (
        <SourceModal type={modal.type} item={modal.item} onClose={closeModal} onSave={saveSource} />
      )}
    </div>
  );
}

function detectSourceType(item) {
  if (item.type === 'image' || item.type === 'video') return 'media';
  if (item.tweetUrl !== undefined) return 'x_post';
  if (item.publisher !== undefined) return 'news_article';
  return 'admin_note';
}

function SourceListItem({ item, onEdit, onDelete }) {
  const type = detectSourceType(item);
  const meta = ALL_SOURCE_TYPES.find((t) => t.key === type) || ALL_SOURCE_TYPES[3];

  let preview = null;
  if (type === 'media') {
    preview = (
      <div className="zone-source-item__preview">
        <img src={item.url} alt={item.caption} />
        <span>{item.caption || item.name || 'Untitled media'}</span>
      </div>
    );
  } else if (type === 'x_post') {
    preview = <span className="zone-source-item__text">{item.tweetUrl || 'X post'}</span>;
  } else if (type === 'news_article') {
    preview = (
      <div className="zone-source-item__preview zone-source-item__preview--stack">
        <span className="zone-source-item__title">{item.title || 'Untitled article'}</span>
        <span className="zone-source-item__text">{item.publisher || item.url || 'Unknown publisher'}</span>
      </div>
    );
  } else {
    preview = (
      <div className="zone-source-item__preview zone-source-item__preview--stack">
        {item.author && <span className="zone-source-item__title">{item.author}</span>}
        <span className="zone-source-item__text">{item.text || 'Empty note'}</span>
      </div>
    );
  }

  return (
    <div className="zone-source-item">
      <div className="zone-source-item__header">
        <span className="zone-source-item__type">
          <span>{meta.icon}</span>
          {meta.label}
        </span>
        <div className="zone-source-item__actions">
          <button type="button" className="zone-source-item__action" onClick={onEdit}>
            Edit
          </button>
          <button type="button" className="zone-source-item__action zone-source-item__action--danger" onClick={onDelete}>
            Delete
          </button>
        </div>
      </div>
      {preview}
    </div>
  );
}

function SourceModal({ type, item, onClose, onSave }) {
  const isEdit = !!item;
  const [form, setForm] = useState(() => sourceDefaults(type, item));
  const [mediaMode, setMediaMode] = useState(isEdit ? 'url' : 'file');
  const [fileItems, setFileItems] = useState([]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const patch = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const switchBtn = (key, label) => (
    <button
      type="button"
      className={`zone-create-switch ${mediaMode === key ? 'zone-create-switch--active' : ''}`}
      onClick={() => setMediaMode(key)}
    >
      {label}
    </button>
  );

  const handleMediaFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const items = await Promise.all(
      files.map(async (file) => ({
        dataUrl: await readFileAsDataUrl(file),
        name: file.name,
        caption: file.name.replace(/\.[^/.]+$/, ''),
      }))
    );
    setFileItems(items);
  };

  const updateFileCaption = (idx, caption) => {
    setFileItems((prev) => prev.map((item, i) => (i === idx ? { ...item, caption } : item)));
  };

  const handleSave = () => {
    if (type === 'media' && !isEdit && mediaMode === 'file') {
      const newItems = fileItems.map((item) => ({
        type: 'image',
        url: item.dataUrl,
        caption: item.caption,
        name: item.name,
        pinned: false,
      }));
      onSave(newItems);
      return;
    }
    onSave(form);
  };

  const fields = {
    media: (
      <>
        {!isEdit && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            {switchBtn('file', 'Upload files')}
            {switchBtn('url', 'Image URL')}
          </div>
        )}
        {isEdit || mediaMode === 'url' ? (
          <>
            <Field label="Image URL">
              <input
                className="zone-create-input"
                type="text"
                value={form.url || ''}
                onChange={(e) => patch('url', e.target.value)}
                placeholder="https://..."
              />
            </Field>
            <Field label="Caption">
              <input
                className="zone-create-input"
                type="text"
                value={form.caption || ''}
                onChange={(e) => patch('caption', e.target.value)}
              />
            </Field>
          </>
        ) : (
          <>
            <input
              className="zone-create-input"
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleMediaFiles}
            />
            {fileItems.length > 0 && (
              <>
                <div className="zone-create-file-summary">
                  <span className="zone-create-file-summary__badge">✎</span>
                  {fileItems.length} file{fileItems.length > 1 ? 's' : ''} selected. Add or edit captions below.
                </div>
                <div className="zone-create-file-grid">
                  {fileItems.map((item, idx) => (
                    <div key={idx} className="zone-create-file-card">
                      <img src={item.dataUrl} alt={item.name} />
                      <div className="zone-create-file-card__body">
                        <label className="zone-create-file-card__label">✎ Caption</label>
                        <input
                          type="text"
                          value={item.caption}
                          onChange={(e) => updateFileCaption(idx, e.target.value)}
                          placeholder="Write a caption…"
                          className="zone-create-file-card__input"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </>
    ),
    x_post: (
      <Field label="Tweet URL">
        <input
          className="zone-create-input"
          type="text"
          value={form.tweetUrl || ''}
          onChange={(e) => patch('tweetUrl', e.target.value)}
          placeholder="https://x.com/..."
        />
      </Field>
    ),
    news_article: (
      <>
        <Field label="Title">
          <input
            className="zone-create-input"
            type="text"
            value={form.title || ''}
            onChange={(e) => patch('title', e.target.value)}
          />
        </Field>
        <Field label="Publisher">
          <input
            className="zone-create-input"
            type="text"
            value={form.publisher || ''}
            onChange={(e) => patch('publisher', e.target.value)}
          />
        </Field>
        <Field label="URL">
          <input
            className="zone-create-input"
            type="text"
            value={form.url || ''}
            onChange={(e) => patch('url', e.target.value)}
            placeholder="https://..."
          />
        </Field>
      </>
    ),
    admin_note: (
      <Field label="Note">
        <textarea
          className="zone-create-input zone-create-input--textarea"
          value={form.text || ''}
          onChange={(e) => patch('text', e.target.value)}
        />
      </Field>
    ),
  };

  const label = ALL_SOURCE_TYPES.find((t) => t.key === type)?.label || 'Source';
  const canSubmit = type !== 'media' || isEdit || mediaMode === 'url' || fileItems.length > 0;

  return (
    <div className="zone-modal-overlay" onClick={onClose}>
      <div className="zone-modal" onClick={(e) => e.stopPropagation()}>
        <div className="zone-modal__header">
          <h3 className="zone-modal__title">{isEdit ? 'Edit' : 'Add'} {label}</h3>
          <button type="button" className="zone-modal__close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="zone-modal__body">
          {fields[type]}
        </div>
        <div className="zone-modal__footer">
          <button type="button" className="zone-create-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="zone-create-btn zone-create-btn--primary"
            onClick={handleSave}
            disabled={!canSubmit}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function sourceDefaults(type, item) {
  if (item) return { ...item };
  switch (type) {
    case 'media':
      return { url: '', caption: '', name: '', fileType: 'image' };
    case 'x_post':
      return { tweetUrl: '', text: '', author: '', handle: '' };
    case 'news_article':
      return { title: '', publisher: '', url: '' };
    case 'admin_note':
      return { author: 'Admin', text: '' };
    default:
      return {};
  }
}
