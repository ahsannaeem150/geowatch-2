import React, { useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { Icons } from './IncidentIcons.jsx';
import { SEVERITY_LABELS, VERIFICATION, formatDate, formatTime } from './IncidentUtils.js';
import { Badge } from './IncidentBadges.jsx';
import EvidenceRail from './EvidenceRail.jsx';
import Lightbox from './Lightbox.jsx';

const DEFAULT_HERO_IMAGE =
  'https://images.unsplash.com/photo-1562742382-d2a5c01dff21?auto=format&fit=crop&w=1600&q=80';

const ROLE_META = {
  user: { label: 'Public view', color: '#38bdf8', accent: '#0ea5e9', accentLight: '#38bdf8' },
  admin: { label: 'Admin', color: '#9f1239', accent: '#5a011c', accentLight: '#9f1239' },
  superadmin: { label: 'Superadmin', color: '#9f1239', accent: '#5a011c', accentLight: '#9f1239' },
};

function toDatetimeLocal(iso) {
  if (!iso) return '';
  try {
    return format(new Date(iso), "yyyy-MM-dd'T'HH:mm");
  } catch {
    return '';
  }
}

function fromDatetimeLocal(value) {
  if (!value) return null;
  return new Date(value).toISOString();
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
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
    </div>
  );
}

function Input(props) {
  return (
    <input
      {...props}
      style={{
        width: '100%',
        padding: '9px 11px',
        borderRadius: 10,
        border: '1px solid var(--border-subtle)',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        fontSize: 14,
        outline: 'none',
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
        padding: '9px 11px',
        borderRadius: 10,
        border: '1px solid var(--border-subtle)',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        fontSize: 14,
        minHeight: 90,
        resize: 'vertical',
        outline: 'none',
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
        padding: '9px 11px',
        borderRadius: 10,
        border: '1px solid var(--border-subtle)',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        fontSize: 14,
        outline: 'none',
        ...props.style,
      }}
    />
  );
}

function Modal({ title, children, onClose, onSubmit, submitLabel = 'Save', submitDisabled = false }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 11000,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 560,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 18,
          padding: 22,
          maxHeight: '85vh',
          overflow: 'auto',
          boxShadow: '0 24px 70px rgba(0,0,0,0.45)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}>{title}</h3>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            {Icons.x}
          </button>
        </div>
        {children}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 14px',
              borderRadius: 10,
              background: 'transparent',
              border: '1px solid transparent',
              color: 'var(--text-muted)',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          {onSubmit && (
            <button
              type="button"
              disabled={submitDisabled}
              onClick={onSubmit}
              style={{
                padding: '8px 16px',
                borderRadius: 10,
                background: 'linear-gradient(135deg, var(--accent-light), var(--accent))',
                border: 'none',
                color: '#fff',
                fontSize: 13,
                fontWeight: 700,
                cursor: submitDisabled ? 'not-allowed' : 'pointer',
                opacity: submitDisabled ? 0.6 : 1,
              }}
            >
              {submitLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Toast({ message, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 2200);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 12000,
        padding: '10px 16px',
        borderRadius: 12,
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
        color: 'var(--text-primary)',
        fontSize: 13,
        fontWeight: 700,
        boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
      }}
    >
      {message}
    </div>
  );
}

function Hero({ incident, heroImage, mode }) {
  const sev = SEVERITY_LABELS[incident.severity] || SEVERITY_LABELS[3];
  const ver = VERIFICATION[incident.verification] || VERIFICATION.unverified;
  const role = ROLE_META[mode];

  return (
    <div className="opt1-hero">
      <div
        className="opt1-hero-bg"
        style={{ backgroundImage: `url(${heroImage?.url || DEFAULT_HERO_IMAGE})` }}
      />
      <div className="opt1-hero-overlay" />
      <div className="opt1-hero-content">
        <div className="opt1-hero-meta">
          <span className="opt1-hero-meta-item">
            <span className="opt1-live-dot" style={{ background: role.color, boxShadow: `0 0 0 0 ${role.color}` }} />{' '}
            {incident.status}
          </span>
          <span className="opt1-hero-meta-item">{sev.label}</span>
          <span className="opt1-hero-meta-item" style={{ color: ver.color }}>
            {ver.label}
          </span>
          <span className="opt1-hero-meta-item">
            {Icons.mapPin} {incident.locationContext || incident.location}
          </span>
          <span className="opt1-hero-meta-item">
            {Icons.calendar} {formatDate(incident.startDate)}
          </span>
          <span className="opt1-hero-meta-item">
            {Icons.hash} {incident.domain || incident.categoryName || incident.category}
          </span>
        </div>
        <h1 className="opt1-hero-title">{incident.title}</h1>
        <p className="opt1-hero-desc">{incident.description}</p>
      </div>
    </div>
  );
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function IncidentEditModal({ incident, onClose, onSave }) {
  const [form, setForm] = useState({ ...incident });
  const [heroMode, setHeroMode] = useState('url');
  const [heroPreview, setHeroPreview] = useState(incident.heroImageUrl || DEFAULT_HERO_IMAGE);
  const patch = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleHeroFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    setHeroPreview(dataUrl);
    patch('heroImageUrl', dataUrl);
  };

  const handleHeroUrl = (url) => {
    setHeroPreview(url);
    patch('heroImageUrl', url);
  };

  const switchBtn = (key, label) => (
    <button
      type="button"
      onClick={() => setHeroMode(key)}
      style={{
        padding: '6px 12px',
        borderRadius: 999,
        border: '1px solid',
        borderColor: heroMode === key ? 'var(--accent)' : 'var(--border-subtle)',
        background: heroMode === key ? 'var(--accent)' : 'transparent',
        color: heroMode === key ? '#fff' : 'var(--text-secondary)',
        fontSize: 12,
        fontWeight: 700,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );

  return (
    <Modal title="Edit incident" onClose={onClose} onSubmit={() => onSave(form)}>
      <Field label="Title">
        <Input value={form.title || ''} onChange={(e) => patch('title', e.target.value)} />
      </Field>
      <Field label="Description">
        <TextArea value={form.description || ''} onChange={(e) => patch('description', e.target.value)} />
      </Field>
      <Field label="Header image">
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          {switchBtn('file', 'Upload image')}
          {switchBtn('url', 'Image URL')}
        </div>
        {heroMode === 'file' ? (
          <Input type="file" accept="image/*" onChange={handleHeroFile} />
        ) : (
          <Input value={form.heroImageUrl || ''} onChange={(e) => handleHeroUrl(e.target.value)} placeholder="https://..." />
        )}
        {heroPreview && (
          <div style={{ marginTop: 10, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-subtle)', maxHeight: 160 }}>
            <img src={heroPreview} alt="Header preview" style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }} />
          </div>
        )}
      </Field>
      <Field label="Location">
        <Input value={form.locationContext || form.location || ''} onChange={(e) => patch('locationContext', e.target.value)} />
      </Field>
      <Field label="Category">
        <Input value={form.categoryName || form.category || ''} onChange={(e) => patch('categoryName', e.target.value)} />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Severity">
          <Select value={form.severity || 3} onChange={(e) => patch('severity', Number(e.target.value))}>
            {Object.entries(SEVERITY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Status">
          <Select value={form.status || 'active'} onChange={(e) => patch('status', e.target.value)}>
            <option value="active">Active</option>
            <option value="resolved">Resolved</option>
            <option value="archived">Archived</option>
          </Select>
        </Field>
      </div>
      <Field label="Verification">
        <Select value={form.verification || 'unverified'} onChange={(e) => patch('verification', e.target.value)}>
          {Object.keys(VERIFICATION).map((k) => (
            <option key={k} value={k}>
              {VERIFICATION[k].label}
            </option>
          ))}
        </Select>
      </Field>
    </Modal>
  );
}

function EventModal({ event, onClose, onSave }) {
  const isEdit = !!event;
  const [form, setForm] = useState({
    type: event?.type || 'update',
    timestamp: event?.timestamp || event?.updateDate || new Date().toISOString(),
    summary: event?.summary || '',
    details: event?.details || '',
    verification: event?.verification || event?.verificationStatus || 'verified',
  });
  const patch = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Modal title={isEdit ? 'Edit update' : 'Add update'} onClose={onClose} onSubmit={() => onSave(form)}>
      <Field label="Type">
        <Select value={form.type} onChange={(e) => patch('type', e.target.value)}>
          <option value="report">Initial report</option>
          <option value="update">Update</option>
        </Select>
      </Field>
      <Field label="Timestamp">
        <Input
          type="datetime-local"
          value={toDatetimeLocal(form.timestamp)}
          onChange={(e) => patch('timestamp', fromDatetimeLocal(e.target.value))}
        />
      </Field>
      <Field label="Summary">
        <Input value={form.summary} onChange={(e) => patch('summary', e.target.value)} />
      </Field>
      <Field label="Details">
        <TextArea value={form.details} onChange={(e) => patch('details', e.target.value)} />
      </Field>
      <Field label="Verification">
        <Select value={form.verification} onChange={(e) => patch('verification', e.target.value)}>
          {Object.keys(VERIFICATION).map((k) => (
            <option key={k} value={k}>
              {VERIFICATION[k].label}
            </option>
          ))}
        </Select>
      </Field>
    </Modal>
  );
}

function Option1TopBar({ mode, onBack, onEditIncident, onAddEvent, extraActions }) {
  const role = ROLE_META[mode];
  const isAdmin = mode === 'admin' || mode === 'superadmin';

  return (
    <div className="opt1-topbar">
      <div className="opt1-topbar-inner">
        <div className="opt1-topbar-left">
          <button type="button" className="opt1-back-link" onClick={onBack}>
            {Icons.chevronLeft} Back
          </button>
          <div className="opt1-topbar-title">Incident details</div>
          <span
            className="opt1-role-badge"
            style={{ background: `${role.color}1f`, color: role.color, borderColor: `${role.color}33` }}
          >
            {role.label}
          </span>
        </div>

        <div className="opt1-topbar-right">
          {isAdmin && (
            <>
              <button type="button" className="opt1-topbar-btn" onClick={onEditIncident}>
                {Icons.edit} Edit incident
              </button>
              <button type="button" className="opt1-topbar-btn opt1-topbar-btn--primary" onClick={onAddEvent}>
                {Icons.plus} Add update
              </button>
            </>
          )}
          {extraActions}
        </div>
      </div>
    </div>
  );
}

export default function IncidentDetailPage({
  incident,
  timeline,
  mode = 'user',
  onBack,
  onCopyIncidentLink,
  onUpdateIncident,
  onResolveIncident,
  onDeleteIncident,
  onRestoreIncident,
  onPurgeIncident,
  onAddUpdate,
  onEditUpdate,
  onDeleteUpdate,
  onAddEvidence,
  onEditEvidence,
  onDeleteEvidence,
  onPinEvidence,
  onFeatureEvidence,
  onClearFeatureEvidence,
  onArchiveSource,
  onCheckSource,
  onAutoCheck,
  onOpenAudit,
  onViewCreator,
  rightSidebar,
  railExtraTabs,
}) {
  const isAdmin = mode === 'admin' || mode === 'superadmin';
  const isSuper = mode === 'superadmin';
  const role = ROLE_META[mode];

  const [activeId, setActiveId] = useState(timeline?.[0]?.id);
  const [featuredItems, setFeaturedItems] = useState({});
  const [lightbox, setLightbox] = useState({ open: false, items: [], index: 0 });
  const [progress, setProgress] = useState(0);
  const [lineProgress, setLineProgress] = useState(0);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);

  const itemRefs = useRef({});
  const timelineRef = useRef(null);

  const sorted = useMemo(() => [...(timeline || [])].sort((a, b) => new Date(a.timestamp || a.updateDate) - new Date(b.timestamp || b.updateDate)), [timeline]);
  const activeIndex = useMemo(() => sorted.findIndex((e) => e.id === activeId), [sorted, activeId]);
  const activeEvent = sorted[activeIndex] || sorted[0];

  useEffect(() => {
    if (activeEvent && !activeId) setActiveId(activeEvent.id);
  }, [activeEvent, activeId]);

  const notify = (message) => setToast({ message });

  const setFeaturedItem = (eventId, { sourceType, sourceId }) => {
    setFeaturedItems((prev) => ({ ...prev, [eventId]: { sourceType, sourceId } }));
    onFeatureEvidence?.(eventId, { sourceType, sourceId });
  };

  const clearFeaturedItem = (eventId) => {
    setFeaturedItems((prev) => {
      const next = { ...prev };
      delete next[eventId];
      return next;
    });
    onClearFeatureEvidence?.(eventId);
  };

  useEffect(() => {
    const computePageProgress = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      return max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) * 100 : 0;
    };

    const computeLineProgress = () => {
      if (!timelineRef.current) return computePageProgress();
      const targetY = window.innerHeight * 0.35;
      let lineIdx = 0;
      sorted.forEach((event, idx) => {
        const eventEl = itemRefs.current[event.id];
        if (!eventEl) return;
        if (eventEl.getBoundingClientRect().top <= targetY) lineIdx = idx;
      });
      const lineEl = itemRefs.current[sorted[lineIdx]?.id];
      const nextEvent = sorted[lineIdx + 1];
      const nextEl = nextEvent ? itemRefs.current[nextEvent.id] : null;
      let fraction = 0;
      if (lineEl && nextEl) {
        const lineTop = lineEl.getBoundingClientRect().top;
        const nextTop = nextEl.getBoundingClientRect().top;
        const span = nextTop - lineTop;
        fraction = span > 0 ? Math.max(0, Math.min(1, (targetY - lineTop) / span)) : 0;
      }
      const total = Math.max(1, sorted.length - 1);
      const eventProgress = ((lineIdx + fraction) / total) * 100;
      return Math.max(eventProgress, computePageProgress());
    };

    const onScroll = () => {
      setProgress(computePageProgress());
      setLineProgress(computeLineProgress());
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [sorted]);

  useEffect(() => {
    const onKey = (e) => {
      if (lightbox.open) return;
      if (document.querySelector('[role="dialog"]')) return;
      if (document.querySelector('[data-drawer="true"]')) return;
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        goTo(Math.min(sorted.length - 1, activeIndex + 1));
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        goTo(Math.max(0, activeIndex - 1));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeIndex, sorted.length, lightbox.open]);

  const goTo = (idx) => {
    const event = sorted[idx];
    if (!event) return;
    setActiveId(event.id);
    const el = itemRefs.current[event.id];
    if (!el) return;
    const itemTarget = window.scrollY + el.getBoundingClientRect().top - window.innerHeight * 0.35;
    let targetScroll = itemTarget;
    const railEl = document.querySelector('.opt1-rail');
    if (railEl) {
      const railTarget = Math.max(0, railEl.offsetTop - 80);
      targetScroll = Math.max(itemTarget, railTarget);
    }
    window.scrollTo({ top: targetScroll, behavior: 'smooth' });
  };

  const handleMediaClick = (item) => {
    const media = activeEvent?.sources?.media || [];
    const index = media.findIndex((m) => m.id === item.id);
    setLightbox({ open: true, items: media, index: Math.max(0, index) });
  };

  return (
    <div
      className={`option1-root option1-root--${mode}`}
      data-role={mode}
      style={{
        width: '100%',
        minHeight: '100vh',
        overflow: 'visible',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-sans)',
        '--accent': role.accent,
        '--accent-light': role.accentLight,
      }}
    >
      <Option1TopBar
        mode={mode}
        onBack={onBack}
        onEditIncident={() => setModal({ type: 'incident' })}
        onAddEvent={() => setModal({ type: 'event' })}
        extraActions={
          isSuper && onCopyIncidentLink ? (
            <button type="button" className="opt1-topbar-btn" onClick={() => onCopyIncidentLink(incident.id)}>
              {Icons.link} Copy link
            </button>
          ) : null
        }
      />

      <div className="opt1-progress-bar" style={{ width: `${progress}%` }} />

      <main className="opt1-main">
        <div style={{ maxWidth: rightSidebar ? 1580 : 1400, margin: '0 auto', padding: rightSidebar ? '0 16px 80px' : '0 24px 80px' }}>
          <Hero incident={incident} heroImage={{ url: incident.heroImageUrl || DEFAULT_HERO_IMAGE }} mode={mode} />

          <div className="opt1-section-title">Story timeline</div>
          <div
            className="opt1-grid"
            style={rightSidebar ? { gridTemplateColumns: 'minmax(0, 1.2fr) 340px 360px', gap: 22 } : undefined}
          >
            <div className="opt1-timeline" ref={timelineRef}>
              <div className="opt1-timeline-track">
                <div className="opt1-timeline-progress" style={{ height: `${lineProgress}%` }} />
              </div>

              {sorted.map((event, idx) => {
                const ver = VERIFICATION[event.verification || event.verificationStatus] || VERIFICATION.unverified;
                const isActive = activeId === event.id;
                const typeColor = event.type === 'report' ? '#818cf8' : '#38bdf8';
                return (
                  <div
                    key={event.id}
                    ref={(el) => (itemRefs.current[event.id] = el)}
                    data-id={event.id}
                    onClick={() => goTo(idx)}
                    className={`opt1-event ${isActive ? 'opt1-event--active' : ''}`}
                    style={{ animationDelay: `${idx * 80}ms` }}
                  >
                    {isAdmin && (
                      <div className="opt1-event-controls">
                        <Select
                          value={event.verification || event.verificationStatus}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            onEditUpdate?.(event.id, { verification: e.target.value });
                            e.target.blur();
                          }}
                          style={{ maxWidth: 130, padding: '4px 8px', fontSize: 12 }}
                        >
                          {Object.keys(VERIFICATION).map((k) => (
                            <option key={k} value={k}>
                              {VERIFICATION[k].label}
                            </option>
                          ))}
                        </Select>
                        <button
                          type="button"
                          className="opt1-event-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setModal({ type: 'event', event });
                          }}
                        >
                          {Icons.edit}
                        </button>
                        <button
                          type="button"
                          className="opt1-event-btn opt1-event-btn--danger"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteUpdate?.(event.id);
                          }}
                        >
                          {Icons.trash}
                        </button>
                      </div>
                    )}
                    <div className="opt1-event-dot" />
                    <div className="opt1-event-type" style={{ color: typeColor }}>
                      {event.type === 'report' ? 'Initial report' : 'Update'}
                    </div>
                    <div className="opt1-event-head">
                      <span className="opt1-event-date">
                        {formatDate(event.timestamp || event.updateDate)} · {formatTime(event.timestamp || event.updateDate)}
                      </span>
                      <Badge color={ver.color}>{ver.label}</Badge>
                    </div>
                    <h3 className="opt1-event-title">{event.summary}</h3>
                    <p className="opt1-event-desc">{event.details}</p>
                  </div>
                );
              })}
            </div>

            <EvidenceRail
              event={activeEvent}
              mode={mode}
              onMediaClick={handleMediaClick}
              onPrev={() => goTo(activeIndex - 1)}
              onNext={() => goTo(activeIndex + 1)}
              hasPrev={activeIndex > 0}
              hasNext={activeIndex < sorted.length - 1}
              onAddEvidence={onAddEvidence}
              onEditEvidence={onEditEvidence}
              onDeleteEvidence={onDeleteEvidence}
              onPinEvidence={onPinEvidence}
              onFeatureEvidence={setFeaturedItem}
              onClearFeature={clearFeaturedItem}
              onArchiveSource={onArchiveSource}
              onCheckSource={onCheckSource}
              onAutoCheck={onAutoCheck}
              featuredItem={featuredItems[activeEvent?.id] || activeEvent?.featuredItem}
              extraTabs={railExtraTabs}
            />
            {rightSidebar && (
              <aside
                className="opt1-rail"
                style={{ position: 'sticky', top: 80, alignSelf: 'start', maxHeight: 'calc(100vh - 110px)', overflowY: 'auto', paddingRight: 6 }}
              >
                {rightSidebar}
              </aside>
            )}
          </div>
        </div>
      </main>

      {lightbox.open && (
        <Lightbox
          items={lightbox.items}
          startIndex={lightbox.index}
          onClose={() => setLightbox((s) => ({ ...s, open: false }))}
        />
      )}

      {modal?.type === 'incident' && (
        <IncidentEditModal
          incident={incident}
          onClose={() => setModal(null)}
          onSave={(patch) => {
            onUpdateIncident?.(patch);
            setModal(null);
          }}
        />
      )}

      {modal?.type === 'event' && (
        <EventModal
          event={modal.event}
          onClose={() => setModal(null)}
          onSave={(form) => {
            if (modal.event) {
              onEditUpdate?.(modal.event.id, form);
            } else {
              onAddUpdate?.(form);
            }
            setModal(null);
          }}
        />
      )}

      {toast && <Toast message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}
