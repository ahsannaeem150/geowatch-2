import React, { useState, useEffect, useMemo, useRef } from 'react';
import { SEVERITY_SCALE, VERIFICATION_CONFIG } from '@shared/constants.js';
import { useCategories } from '@shared/hooks/useCategories.js';
import { EvidenceModal } from '../DesignTrial/SidebarTrial2Option1Base.jsx';
import {
  SOURCE_TYPE_LABELS,
  SOURCE_TYPE_ICONS,
  ALL_SOURCE_TYPES,
} from '../DesignTrial/IncidentDetailTrialData.js';
import { api } from '../../services/api.js';
import '../DesignTrial/IncidentDetailTrial.css';

const DEFAULT_HERO_IMAGE =
  'https://images.unsplash.com/photo-1562742382-d2a5c01dff21?auto=format&fit=crop&w=1600&q=80';

function dataUrlToFile(dataUrl, fileName = 'image.png') {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new File([u8arr], fileName, { type: mime });
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
        outline: 'none',
        resize: 'vertical',
        minHeight: 80,
        lineHeight: 1.5,
        transition: 'border-color 0.15s ease',
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
        padding: 16,
        marginBottom: 16,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          letterSpacing: '0.05em',
          marginBottom: 12,
        }}
      >
        {title}
      </div>
      {children}
    </div>
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
        <span
          style={{
            fontSize: 12,
            color: 'var(--text-secondary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {item.caption || 'Untitled media'}
        </span>
      </div>
    );
  } else if (type === 'x_post') {
    preview = (
      <span
        style={{
          fontSize: 12,
          color: 'var(--text-secondary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {item.tweetUrl || 'X post'}
      </span>
    );
  } else if (type === 'news_article') {
    preview = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, overflow: 'hidden' }}>
        <span
          style={{
            fontSize: 12,
            color: 'var(--text-primary)',
            fontWeight: 600,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {item.title || 'News article'}
        </span>
        <span
          style={{
            fontSize: 11,
            color: 'var(--text-muted)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {item.publisher || item.url || ''}
        </span>
      </div>
    );
  } else {
    preview = (
      <span
        style={{
          fontSize: 12,
          color: 'var(--text-secondary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {item.text || 'Admin note'}
      </span>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        background: 'var(--bg-primary)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <span style={{ fontSize: 16 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
          {label}
        </div>
        {preview}
      </div>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button
          type="button"
          onClick={onEdit}
          style={{
            padding: '4px 10px',
            fontSize: 12,
            fontWeight: 600,
            borderRadius: 6,
            border: '1px solid var(--border-subtle)',
            background: 'transparent',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
          }}
        >
          Edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          style={{
            padding: '4px 10px',
            fontSize: 12,
            fontWeight: 600,
            borderRadius: 6,
            border: '1px solid var(--border-subtle)',
            background: 'transparent',
            color: 'var(--danger)',
            cursor: 'pointer',
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export default function CreateIncidentSidebar({ initialCoords, onSuccess, onCancel }) {
  const { categories, domains, loading: catsLoading } = useCategories();
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [latitude, setLatitude] = useState(initialCoords?.lat?.toString() || '');
  const [longitude, setLongitude] = useState(initialCoords?.lng?.toString() || '');
  const [locationContext, setLocationContext] = useState(initialCoords?.locationContext || '');
  const [locationLoading, setLocationLoading] = useState(
    initialCoords && initialCoords.locationContext === undefined
  );

  const [domainId, setDomainId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [severity, setSeverity] = useState('3');
  const [verificationStatus, setVerificationStatus] = useState('unverified');
  const [startDate, setStartDate] = useState(toDatetimeLocal(new Date().toISOString()));
  const [endDate, setEndDate] = useState('');

  const [sources, setSources] = useState([]);
  const [modal, setModal] = useState(null); // { type, item? }

  const [heroImageFile, setHeroImageFile] = useState(null);
  const heroPreviewUrl = useMemo(() => {
    if (heroImageFile) return URL.createObjectURL(heroImageFile);
    return DEFAULT_HERO_IMAGE;
  }, [heroImageFile]);

  const heroObjectUrlRef = useRef(null);
  useEffect(() => {
    if (heroImageFile) {
      heroObjectUrlRef.current = heroPreviewUrl;
    }
    return () => {
      if (heroObjectUrlRef.current) {
        URL.revokeObjectURL(heroObjectUrlRef.current);
        heroObjectUrlRef.current = null;
      }
    };
  }, [heroPreviewUrl, heroImageFile]);

  // Set defaults and keep category valid when domain changes
  useEffect(() => {
    if (catsLoading || domains.length === 0) return;
    if (!domainId) {
      const firstDomain = domains[0];
      setDomainId(String(firstDomain.id));
      const cats = categories.filter((c) => c.domain_id === firstDomain.id);
      if (cats.length > 0) setCategoryId(String(cats[0].id));
    } else {
      const cats = categories.filter((c) => c.domain_id === Number(domainId));
      const valid = cats.some((c) => String(c.id) === categoryId);
      if (!valid && cats.length > 0) setCategoryId(String(cats[0].id));
    }
  }, [catsLoading, domains, categories, domainId, categoryId]);

  // Sync coordinates + location context from map double-click
  useEffect(() => {
    if (!initialCoords) return;
    setLatitude(initialCoords.lat.toFixed(6));
    setLongitude(initialCoords.lng.toFixed(6));
    if (initialCoords.locationContext === undefined) {
      setLocationLoading(true);
      setLocationContext('');
    } else {
      setLocationLoading(false);
      setLocationContext(initialCoords.locationContext || '');
    }
  }, [initialCoords?.lat, initialCoords?.lng, initialCoords?.locationContext]);

  const category = useMemo(
    () => categories.find((c) => String(c.id) === categoryId),
    [categories, categoryId]
  );

  const addSource = (type) => setModal({ type });
  const editSource = (item) => setModal({ type: detectSourceType(item), item });
  const closeModal = () => setModal(null);

  const saveSource = (itemOrItems) => {
    const items = Array.isArray(itemOrItems) ? itemOrItems : [itemOrItems];
    if (modal?.item) {
      setSources((prev) => prev.map((s) => (s.id === modal.item.id ? items[0] : s)));
    } else {
      setSources((prev) => [...prev, ...items]);
    }
    setModal(null);
  };

  const deleteSource = (id) => setSources((prev) => prev.filter((s) => s.id !== id));

  const buildPayloadSources = () => {
    const payloadSources = [];
    for (const item of sources) {
      const type = detectSourceType(item);
      if (type === 'media') {
        const url = item.url || '';
        // URL-based media becomes an image source; file-based media is uploaded separately.
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
  };

  const mediaFileSources = useMemo(
    () => sources.filter((s) => detectSourceType(s) === 'media' && (s.url || '').startsWith('data:')),
    [sources]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !categoryId || !domainId) return;

    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        categoryId: parseInt(categoryId, 10),
        severity: parseInt(severity, 10),
        startDate: new Date(startDate).toISOString(),
        endDate: endDate ? new Date(endDate).toISOString() : null,
        locationContext: locationContext.trim() || undefined,
        verificationStatus,
        sources: buildPayloadSources(),
      };

      const res = await api.createIncident(payload);
      let newIncident = res.data.incident;

      // Fetch detail to find the initial report update for uploads.
      const detailRes = await api.getIncident(newIncident.id);
      const initialReport = detailRes.data.timeline?.find((u) => u.type === 'report');
      const updateId = initialReport?.id;

      // Upload hero image if provided.
      if (heroImageFile) {
        try {
          const uploadRes = await api.uploadMedia(newIncident.id, heroImageFile, {
            updateId,
            caption: title.trim(),
          });
          await api.updateIncident(newIncident.id, { heroImageUrl: uploadRes.data.media.file_url });
          newIncident = { ...newIncident, hero_image_url: uploadRes.data.media.file_url };
        } catch (err) {
          console.warn('Hero image upload failed', err);
        }
      }

      // Upload any media file evidence.
      for (const item of mediaFileSources) {
        try {
          const file = dataUrlToFile(item.url, item.name || 'upload.png');
          await api.uploadMedia(newIncident.id, file, {
            updateId,
            caption: item.caption || '',
          });
        } catch (err) {
          console.warn('Media upload failed', err);
        }
      }

      onSuccess(newIncident);
    } catch (err) {
      alert(err.message || 'Failed to create incident');
    } finally {
      setSubmitting(false);
    }
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

        {/* Narrative */}
        <Section title="Incident narrative">
          <Field label="Headline">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. IAF AN-32 crashes in Assam, India"
              required
              disabled={submitting}
              onFocus={focusBorder}
              onBlur={blurBorder}
            />
          </Field>
          <Field label="Description" hint="This also becomes the initial report text. You can edit it later.">
            <TextArea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what happened, who is involved, and current status..."
              disabled={submitting}
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
                disabled={submitting}
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
                disabled={submitting}
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
              disabled={submitting || locationLoading}
              onFocus={focusBorder}
              onBlur={blurBorder}
            />
            {locationLoading && (
              <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>Locating…</p>
            )}
          </Field>
        </Section>

        {/* Classification */}
        <Section title="Classification">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Domain">
              <Select
                value={domainId}
                onChange={(e) => setDomainId(e.target.value)}
                required
                disabled={catsLoading || submitting}
              >
                {domains.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Category">
              <Select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
                disabled={catsLoading || submitting}
              >
                {categories
                  .filter((c) => c.domain_id === Number(domainId))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </Select>
            </Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 4 }}>
            <Field label="Severity">
              <Select value={severity} onChange={(e) => setSeverity(e.target.value)} disabled={submitting}>
                {SEVERITY_SCALE.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.value} — {s.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Verification">
              <Select
                value={verificationStatus}
                onChange={(e) => setVerificationStatus(e.target.value)}
                disabled={submitting}
              >
                {Object.entries(VERIFICATION_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>
                    {cfg.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          {/* Hero image */}
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
              alt="Hero preview"
              style={{
                width: 80,
                height: 50,
                objectFit: 'cover',
                borderRadius: 6,
                border: '1px solid var(--border-subtle)',
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>Hero image</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                Optional. Defaults to a category placeholder until you upload one.
              </div>
              <label
                style={{
                  display: 'inline-block',
                  marginTop: 6,
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--accent-light)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => setHeroImageFile(e.target.files?.[0] || null)}
                  disabled={submitting}
                />
                {heroImageFile ? 'Change image' : 'Upload image'}
              </label>
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
                disabled={submitting}
                onFocus={focusBorder}
                onBlur={blurBorder}
              />
            </Field>
            <Field label="End (optional)">
              <Input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={submitting}
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
                disabled={submitting}
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sources.map((item) => (
              <SourceListItem
                key={item.id}
                item={item}
                onEdit={() => editSource(item)}
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
          <button type="submit" className="id-btn-primary" style={{ flex: 1 }} disabled={submitting}>
            {submitting ? 'Creating…' : 'Create incident'}
          </button>
          <button
            type="button"
            className="id-btn"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </button>
        </div>
      </div>

      {modal && <EvidenceModal type={modal.type} item={modal.item} onClose={closeModal} onSave={saveSource} />}
    </form>
  );
}
