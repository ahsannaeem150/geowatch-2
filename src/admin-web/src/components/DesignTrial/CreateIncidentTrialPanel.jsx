import React, { useState, useEffect, useMemo } from 'react';
import { SEVERITY_SCALE, VERIFICATION_CONFIG } from '@shared/constants.js';
import { EvidenceModal } from './SidebarTrial2Option1Base.jsx';
import {
  SOURCE_TYPE_LABELS,
  SOURCE_TYPE_ICONS,
} from './IncidentDetailTrialData.js';

/* ─────────────────────────────────────────────────────────────────────────────
   Trial create-incident form for /sidebarTrial2/admin.
   Reuses the evidence modal from /incident-trial/admin so source inputs are
   identical. Visual / clickable prototype only. No backend calls.
   ───────────────────────────────────────────────────────────────────────────── */

const DEFAULT_HERO_IMAGE =
  'https://images.unsplash.com/photo-1562742382-d2a5c01dff21?auto=format&fit=crop&w=1600&q=80';

// Mock domains + categories. In production these come from the API and each
// category carries a hero_image_url set by superadmin.
const MOCK_DOMAINS = [
  { id: 'd1', name: 'Transport & Aviation', color: '#6366f1' },
  { id: 'd2', name: 'Maritime', color: '#0ea5e9' },
  { id: 'd3', name: 'Border & Territory', color: '#f59e0b' },
  { id: 'd4', name: 'Natural Disasters', color: '#10b981' },
  { id: 'd5', name: 'Conflict & Security', color: '#ef4444' },
];

const MOCK_CATEGORIES = [
  { id: 'c1', domainId: 'd1', name: 'Aviation Accident', slug: 'aviation-accident', color: '#9f1239', heroSeed: 'aviation' },
  { id: 'c2', domainId: 'd1', name: 'Airspace Violation', slug: 'airspace-violation', color: '#be185d', heroSeed: 'airspace' },
  { id: 'c3', domainId: 'd2', name: 'Vessel Incident', slug: 'vessel-incident', color: '#0369a1', heroSeed: 'vessel' },
  { id: 'c4', domainId: 'd2', name: 'Piracy', slug: 'piracy', color: '#075985', heroSeed: 'pirate' },
  { id: 'c5', domainId: 'd3', name: 'Border Clash', slug: 'border-clash', color: '#b45309', heroSeed: 'border' },
  { id: 'c6', domainId: 'd3', name: 'Troop Movement', slug: 'troop-movement', color: '#d97706', heroSeed: 'troop' },
  { id: 'c7', domainId: 'd4', name: 'Earthquake', slug: 'earthquake', color: '#047857', heroSeed: 'earthquake' },
  { id: 'c8', domainId: 'd4', name: 'Flood', slug: 'flood', color: '#059669', heroSeed: 'flood' },
  { id: 'c9', domainId: 'd5', name: 'Armed Clash', slug: 'armed-clash', color: '#b91c1c', heroSeed: 'conflict' },
  { id: 'c10', domainId: 'd5', name: 'Drone Strike', slug: 'drone-strike', color: '#991b1b', heroSeed: 'drone' },
];

const ALL_SOURCE_TYPES = ['media', 'x_post', 'news_article', 'admin_note'];

function categoryHeroUrl(category) {
  if (!category) return DEFAULT_HERO_IMAGE;
  return `https://picsum.photos/seed/${category.heroSeed}/1200/600`;
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
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

function Field({ label, children, hint }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label
        style={{
          display: 'block',
          fontSize: 11,
          fontWeight: 800,
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          marginBottom: 6,
          letterSpacing: '0.05em',
        }}
      >
        {label}
      </label>
      {children}
      {hint && (
        <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>{hint}</p>
      )}
    </div>
  );
}

function Input(props) {
  return (
    <input
      {...props}
      style={{
        width: '100%',
        padding: '10px 12px',
        borderRadius: 10,
        border: '1px solid var(--border-subtle)',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        fontSize: 14,
        outline: 'none',
        transition: 'border-color 0.15s ease',
        ...props.style,
      }}
    />
  );
}

function TextArea(props) {
  return (
    <textarea
      {...props}
      style={{
        width: '100%',
        padding: '10px 12px',
        borderRadius: 10,
        border: '1px solid var(--border-subtle)',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        fontSize: 14,
        minHeight: 96,
        resize: 'vertical',
        outline: 'none',
        transition: 'border-color 0.15s ease',
        lineHeight: 1.6,
        ...props.style,
      }}
    />
  );
}

function Select(props) {
  return (
    <select
      {...props}
      style={{
        width: '100%',
        padding: '10px 12px',
        borderRadius: 10,
        border: '1px solid var(--border-subtle)',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        fontSize: 14,
        outline: 'none',
        cursor: 'pointer',
        ...props.style,
      }}
    />
  );
}

function Section({ title, children }) {
  return (
    <div
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: 18,
        marginBottom: 16,
      }}
    >
      {title && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 14,
          }}
        >
          <div style={{ width: 3, height: 16, background: 'var(--accent)', borderRadius: 2 }} />
          <h4 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.02em' }}>
            {title}
          </h4>
        </div>
      )}
      {children}
    </div>
  );
}

export default function CreateIncidentTrialPanel() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [latitude, setLatitude] = useState('26.3342');
  const [longitude, setLongitude] = useState('93.2428');
  const [locationContext, setLocationContext] = useState('');
  const [domainId, setDomainId] = useState(MOCK_DOMAINS[0].id);
  const [categoryId, setCategoryId] = useState(MOCK_CATEGORIES[0].id);
  const [severity, setSeverity] = useState('3');
  const [verificationStatus, setVerificationStatus] = useState('unverified');
  const [startDate, setStartDate] = useState(toDatetimeLocal(new Date().toISOString()));
  const [endDate, setEndDate] = useState('');
  const [sources, setSources] = useState([]);
  const [modal, setModal] = useState(null); // { type, item? }

  const domain = useMemo(() => MOCK_DOMAINS.find((d) => d.id === domainId) || MOCK_DOMAINS[0], [domainId]);
  const categoriesInDomain = useMemo(
    () => MOCK_CATEGORIES.filter((c) => c.domainId === domainId),
    [domainId]
  );
  const category = useMemo(
    () => MOCK_CATEGORIES.find((c) => c.id === categoryId) || categoriesInDomain[0] || MOCK_CATEGORIES[0],
    [categoryId, categoriesInDomain]
  );

  // Keep category valid when domain changes
  useEffect(() => {
    if (!categoriesInDomain.some((c) => c.id === categoryId)) {
      setCategoryId(categoriesInDomain[0]?.id || MOCK_CATEGORIES[0].id);
    }
  }, [domainId, categoriesInDomain, categoryId]);

  const heroPreviewUrl = useMemo(() => categoryHeroUrl(category), [category]);

  const addSource = (type) => {
    setModal({ type });
  };

  const editSource = (item, type) => {
    setModal({ type, item });
  };

  const closeModal = () => setModal(null);

  const saveSource = (itemOrItems) => {
    const items = Array.isArray(itemOrItems) ? itemOrItems : [itemOrItems];
    if (modal?.item) {
      // Editing a single item: replace it
      setSources((prev) => prev.map((s) => (s.id === modal.item.id ? items[0] : s)));
    } else {
      setSources((prev) => [...prev, ...items]);
    }
    setModal(null);
  };

  const deleteSource = (id) => {
    setSources((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // eslint-disable-next-line no-console
    console.log('Trial create-incident payload:', {
      title,
      description,
      latitude,
      longitude,
      locationContext,
      domainId,
      categoryId,
      severity,
      verificationStatus,
      startDate: fromDatetimeLocal(startDate),
      endDate: endDate ? fromDatetimeLocal(endDate) : null,
      heroImageUrl: heroPreviewUrl,
      sources,
    });
    window.alert('This is a visual prototype. No incident was created.');
  };

  const focusBorder = (e) => {
    e.currentTarget.style.borderColor = 'var(--accent-light)';
  };
  const blurBorder = (e) => {
    e.currentTarget.style.borderColor = 'var(--border-subtle)';
  };

  return (
    <form className="id-create-panel" onSubmit={handleSubmit}>
      <div className="id-create-panel__scroll">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, var(--accent-light), var(--accent))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
            }}
          >
            +
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>Create incident</h2>
            <p style={{ margin: 2, fontSize: 12, color: 'var(--text-muted)' }}>New incident entry form</p>
          </div>
        </div>

        {/* Headline + description */}
        <Section title="Incident narrative">
          <Field label="Headline">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. IAF AN-32 crashes in Assam, India"
              required
              onFocus={focusBorder}
              onBlur={blurBorder}
            />
          </Field>
          <Field label="Description" hint="This also becomes the initial report text. You can edit it later.">
            <TextArea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what happened, who is involved, and current status..."
              onFocus={focusBorder}
              onBlur={blurBorder}
            />
          </Field>
        </Section>

        {/* Location */}
        <Section title="Location">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Latitude">
              <Input
                type="number"
                step="any"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                required
                placeholder="Latitude"
                onFocus={focusBorder}
                onBlur={blurBorder}
              />
            </Field>
            <Field label="Longitude">
              <Input
                type="number"
                step="any"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                required
                placeholder="Longitude"
                onFocus={focusBorder}
                onBlur={blurBorder}
              />
            </Field>
          </div>
          <Field label="Location context">
            <Input
              value={locationContext}
              onChange={(e) => setLocationContext(e.target.value)}
              placeholder="e.g. Air Force Station Jorhat, Assam, India"
              onFocus={focusBorder}
              onBlur={blurBorder}
            />
          </Field>
        </Section>

        {/* Classification */}
        <Section title="Classification">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Domain">
              <Select value={domainId} onChange={(e) => setDomainId(e.target.value)}>
                {MOCK_DOMAINS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Category">
              <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                {categoriesInDomain.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 4 }}>
            <Field label="Severity">
              <Select value={severity} onChange={(e) => setSeverity(e.target.value)}>
                {SEVERITY_SCALE.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.value} — {s.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Verification">
              <Select value={verificationStatus} onChange={(e) => setVerificationStatus(e.target.value)}>
                {Object.entries(VERIFICATION_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>
                    {cfg.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          {/* Hero preview tied to selected category */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginTop: 14,
              padding: 10,
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <img
              src={heroPreviewUrl}
              alt="Category hero preview"
              style={{
                width: 80,
                height: 50,
                objectFit: 'cover',
                borderRadius: 6,
                border: '1px solid var(--border-subtle)',
                flexShrink: 0,
              }}
            />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>Hero image</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                Auto-applied from {category.name}. Override in Edit incident.
              </div>
            </div>
          </div>
        </Section>

        {/* Timing */}
        <Section title="Timing">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Start">
              <Input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                onFocus={focusBorder}
                onBlur={blurBorder}
              />
            </Field>
            <Field label="End (optional)">
              <Input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                onFocus={focusBorder}
                onBlur={blurBorder}
              />
            </Field>
          </div>
        </Section>

        {/* Sources / evidence */}
        <Section title="Initial-report evidence">
          <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Add sources that will be attached to the automatically-created initial report.
          </p>

          {/* Add-source toolbar */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              padding: 10,
              background: 'var(--bg-primary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              marginBottom: 14,
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-muted)',
                alignSelf: 'center',
                marginRight: 4,
              }}
            >
              Add:
            </span>
            {ALL_SOURCE_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => addSource(type)}
                className="id-create-source-btn"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '7px 11px',
                  borderRadius: 999,
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-elevated)',
                  color: 'var(--text-secondary)',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{SOURCE_TYPE_ICONS[type]}</span>
                {SOURCE_TYPE_LABELS[type]}
              </button>
            ))}
          </div>

          {/* Source list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sources.map((item) => (
              <SourceListItem
                key={item.id}
                item={item}
                onEdit={() => editSource(item, detectSourceType(item))}
                onDelete={() => deleteSource(item.id)}
              />
            ))}
            {sources.length === 0 && (
              <div
                style={{
                  textAlign: 'center',
                  padding: '28px 16px',
                  color: 'var(--text-muted)',
                  fontSize: 13,
                  border: '1px dashed var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                No evidence added yet. Use the buttons above.
              </div>
            )}
          </div>
        </Section>

        {/* Actions */}
        <div
          style={{
            display: 'flex',
            gap: 10,
            paddingTop: 4,
            paddingBottom: 30,
          }}
        >
          <button type="submit" className="id-btn-primary" style={{ flex: 1 }}>
            Create incident
          </button>
          <button
            type="button"
            className="id-btn"
            onClick={() => {
              setTitle('');
              setDescription('');
              setSources([]);
              setHeroMode('default');
            }}
          >
            Reset
          </button>
        </div>
      </div>

      {modal && (
        <EvidenceModal type={modal.type} item={modal.item} onClose={closeModal} onSave={saveSource} />
      )}
    </form>
  );
}

function detectSourceType(item) {
  if (item.type === 'image' || item.type === 'video') return 'media';
  if (item.type === 'x_post') return 'x_post';
  if (item.publisher !== undefined) return 'news_article';
  if (item.text !== undefined) return 'admin_note';
  return 'media';
}

function SourceListItem({ item, onEdit, onDelete }) {
  const type = detectSourceType(item);
  const icon = SOURCE_TYPE_ICONS[type];
  const label = SOURCE_TYPE_LABELS[type];

  let preview = null;
  if (type === 'media') {
    preview = (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <img
          src={item.url}
          alt={item.caption}
          style={{ width: 64, height: 44, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border-subtle)' }}
        />
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.caption || 'Untitled media'}
        </span>
      </div>
    );
  } else if (type === 'x_post') {
    preview = (
      <span style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {item.tweetUrl || 'X post'}
      </span>
    );
  } else if (type === 'news_article') {
    preview = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, overflow: 'hidden' }}>
        <span style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.title || 'Untitled article'}
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.publisher || 'Unknown publisher'}
        </span>
      </div>
    );
  } else if (type === 'admin_note') {
    preview = (
      <span style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {item.text || 'Empty note'}
      </span>
    );
  }

  return (
    <div
      style={{
        background: 'var(--bg-primary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 11,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: 'var(--text-primary)',
          }}
        >
          <span style={{ fontSize: 13 }}>{icon}</span>
          {label}
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            onClick={onEdit}
            style={{
              padding: '4px 8px',
              borderRadius: 6,
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-elevated)',
              color: 'var(--text-secondary)',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            style={{
              padding: '4px 8px',
              borderRadius: 6,
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-elevated)',
              color: 'var(--danger-light)',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Delete
          </button>
        </div>
      </div>
      {preview}
    </div>
  );
}
