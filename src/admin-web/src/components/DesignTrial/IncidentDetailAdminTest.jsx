import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import './IncidentDetailTrial.css';
import {
  INCIDENT,
  TIMELINE,
  Icons,
  SummaryCard,
  TimelineItem,
  UpdateHeader,
  EvidencePreview,
  EvidenceBundle,
  VerificationBadge,
  Lightbox,
  formatDate,
  formatTime,
  relativeTime,
  countSources,
  sourceCounts,
  SourceCountChips,
  SEVERITY_LABELS,
  VERIFICATION,
  SOURCE_TYPE_LABELS,
  SOURCE_TYPE_ICONS,
  StatusHistory,
  DebugMetadata,
  CopyButton,
  parseCoordinates,
  MetaRow,
  StatTile,
  XEmbed,
  XPostCard,
  ArticleCard,
  AdminNoteCard,
  MediaThumb,
} from './IncidentDetailTrialCommon.jsx';
import { AuditLogPanel, UserProfileDrawer, Drawer } from './SidebarTrial2Option1SuperAdminAudit.jsx';

/* ─────────────────────────────────────────────────────────────────────────────
   Final incident-detail sidebar.
   Supports user, admin, and superadmin modes. Admin mode adds full incident,
   event, and evidence management inside the 630px sidebar.
   Route: /sidebarTrial2 (user), /sidebarTrial2/admin, /sidebarTrial2/superadmin
   ───────────────────────────────────────────────────────────────────────────── */

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

/* ─── Form primitives ─── */
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
          <button type="button" className="id-btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="id-btn-primary" onClick={onSubmit} disabled={submitDisabled}>
            {submitLabel}
          </button>
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

/* ─── Modals ─── */
function IncidentEditModal({ incident, onClose, onSave }) {
  const [form, setForm] = useState({ ...incident });
  const patch = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Modal title="Edit incident" onClose={onClose} onSubmit={() => onSave(form)}>
      <Field label="Title">
        <Input value={form.title} onChange={(e) => patch('title', e.target.value)} />
      </Field>
      <Field label="Description">
        <TextArea value={form.description} onChange={(e) => patch('description', e.target.value)} />
      </Field>
      <Field label="Location">
        <Input value={form.location} onChange={(e) => patch('location', e.target.value)} />
      </Field>
      <Field label="Category">
        <Input value={form.category} onChange={(e) => patch('category', e.target.value)} />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Severity">
          <Select value={form.severity} onChange={(e) => patch('severity', Number(e.target.value))}>
            {Object.entries(SEVERITY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Status">
          <Select value={form.status} onChange={(e) => patch('status', e.target.value)}>
            <option value="active">Active</option>
            <option value="resolved">Resolved</option>
            <option value="archived">Archived</option>
          </Select>
        </Field>
      </div>
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

function EventModal({ event, onClose, onSave }) {
  const isEdit = !!event;
  const [form, setForm] = useState({
    type: event?.type || 'update',
    timestamp: event?.timestamp || new Date().toISOString(),
    summary: event?.summary || '',
    details: event?.details || '',
    verification: event?.verification || 'verified',
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

function evidenceDefaults(type) {
  const seed = Math.random().toString(36).slice(2, 8);
  switch (type) {
    case 'media':
      return { id: uid(), type: 'image', url: '', caption: '', pinned: false };
    case 'x_post':
      return {
        id: uid(),
        type: 'x_post',
        author: 'X',
        handle: '@x',
        text: 'Embedded post',
        tweetUrl: '',
        authorAvatar: `https://picsum.photos/seed/${seed}/120/120`,
        timestamp: new Date().toISOString(),
        archived: false,
      };
    case 'news_article':
      return { id: uid(), publisher: '', title: '', url: '', pinned: false };
    case 'admin_note':
      return { id: uid(), author: 'Admin', text: '', pinned: false };
    default:
      return {};
  }
}

function EvidenceModal({ type, item, onClose, onSave }) {
  const isEdit = !!item;
  const [form, setForm] = useState(item ? { ...item } : evidenceDefaults(type));
  const patch = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const [mediaMode, setMediaMode] = useState(isEdit ? 'url' : 'file');
  const [fileItems, setFileItems] = useState([]);

  const switchBtn = (key, label) => (
    <button
      type="button"
      onClick={() => setMediaMode(key)}
      style={{
        padding: '6px 12px',
        borderRadius: 999,
        border: '1px solid',
        borderColor: mediaMode === key ? 'var(--accent)' : 'var(--border-subtle)',
        background: mediaMode === key ? 'var(--accent)' : 'transparent',
        color: mediaMode === key ? '#fff' : 'var(--text-secondary)',
        fontSize: 12,
        fontWeight: 700,
        cursor: 'pointer',
      }}
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
        id: uid(),
        type: 'image',
        url: item.dataUrl,
        caption: item.caption,
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
              <Input value={form.url || ''} onChange={(e) => patch('url', e.target.value)} placeholder="https://..." />
            </Field>
            <Field label="Caption">
              <Input value={form.caption || ''} onChange={(e) => patch('caption', e.target.value)} />
            </Field>
          </>
        ) : (
          <>
            <Input type="file" accept="image/*" multiple onChange={handleMediaFiles} />
            {fileItems.length > 0 && (
              <>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    margin: '14px 0 10px',
                    fontSize: 12,
                    color: 'var(--text-muted)',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: 'var(--accent)',
                      color: '#fff',
                      fontSize: 10,
                      fontWeight: 800,
                    }}
                  >
                    {Icons.edit}
                  </span>
                  {fileItems.length} file{fileItems.length > 1 ? 's' : ''} selected. Add or edit captions below.
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  {fileItems.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: 'var(--bg-primary)',
                        borderRadius: 12,
                        overflow: 'hidden',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <img src={item.dataUrl} alt={item.name} style={{ width: '100%', height: 84, objectFit: 'cover', display: 'block' }} />
                      <div style={{ padding: '8px 10px 10px' }}>
                        <label
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            fontSize: 10,
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            color: 'var(--text-muted)',
                            letterSpacing: '0.04em',
                            marginBottom: 6,
                          }}
                        >
                          {Icons.edit} Caption
                        </label>
                        <input
                          type="text"
                          value={item.caption}
                          onChange={(e) => updateFileCaption(idx, e.target.value)}
                          placeholder="Write a caption…"
                          style={{
                            width: '100%',
                            padding: '7px 9px',
                            borderRadius: 8,
                            border: '1px solid var(--border-subtle)',
                            background: 'var(--bg-elevated)',
                            color: 'var(--text-primary)',
                            fontSize: 12,
                            outline: 'none',
                          }}
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = 'var(--accent)';
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = 'var(--border-subtle)';
                          }}
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
        <Input value={form.tweetUrl || ''} onChange={(e) => patch('tweetUrl', e.target.value)} placeholder="https://x.com/..." />
      </Field>
    ),
    news_article: (
      <>
        <Field label="Title">
          <Input value={form.title || ''} onChange={(e) => patch('title', e.target.value)} />
        </Field>
        <Field label="Publisher">
          <Input value={form.publisher || ''} onChange={(e) => patch('publisher', e.target.value)} />
        </Field>
        <Field label="URL">
          <Input value={form.url || ''} onChange={(e) => patch('url', e.target.value)} placeholder="https://..." />
        </Field>
      </>
    ),
    admin_note: (
      <>
        <Field label="Author">
          <Input value={form.author || ''} onChange={(e) => patch('author', e.target.value)} />
        </Field>
        <Field label="Note">
          <TextArea value={form.text || ''} onChange={(e) => patch('text', e.target.value)} />
        </Field>
      </>
    ),
  };

  const canSubmit = type !== 'media' || isEdit || mediaMode === 'url' || fileItems.length > 0;

  return (
    <Modal
      title={isEdit ? `Edit ${SOURCE_TYPE_LABELS[type]}` : `Add ${SOURCE_TYPE_LABELS[type]}`}
      onClose={onClose}
      onSubmit={handleSave}
      submitDisabled={!canSubmit}
    >
      {fields[type]}
    </Modal>
  );
}

export default function IncidentDetailAdminTest({ onOpenAudit, onViewCreator }) {
  const mode = 'admin';
  const isAdmin = true;
  const isSuper = false;
  const navigate = useNavigate();

  const [incident, setIncident] = useState({ ...INCIDENT });
  const [events, setEvents] = useState([...TIMELINE]);
  const [drawerEvent, setDrawerEvent] = useState(null);
  const [drawerTab, setDrawerTab] = useState('all');
  const [lightbox, setLightbox] = useState(null);
  const [copied, setCopied] = useState(false);
  const [modal, setModal] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [toast, setToast] = useState(null);
  const [featuredItems, setFeaturedItems] = useState({});

  const notify = useCallback((message) => setToast({ message }), []);

  const setFeaturedItem = useCallback((eventId, sourceType, itemId) => {
    setFeaturedItems((prev) => {
      const current = prev[eventId];
      if (current && current.sourceType === sourceType && current.itemId === itemId) {
        const next = { ...prev };
        delete next[eventId];
        return next;
      }
      return { ...prev, [eventId]: { sourceType, itemId } };
    });
  }, []);

  const clearFeaturedItem = useCallback((eventId) => {
    setFeaturedItems((prev) => {
      const next = { ...prev };
      delete next[eventId];
      return next;
    });
  }, []);

  const findFeaturedItem = useCallback((event, featured) => {
    if (!featured || !event?.sources) return null;
    const list = event.sources[featured.sourceType];
    return list?.find((x) => x.id === featured.itemId) || null;
  }, []);

  const nowIso = () => new Date().toISOString();
  const currentUser = { id: 'u1', name: 'System Administrator' };

  /* ─── Evidence mutations ─── */
  const mutateSources = useCallback((eventId, sourceType, updater) => {
    setEvents((prev) =>
      prev.map((e) => {
        if (e.id !== eventId) return e;
        const list = e.sources?.[sourceType] || [];
        return { ...e, sources: { ...e.sources, [sourceType]: updater(list) } };
      })
    );
  }, []);

  const addEvidence = useCallback(
    (eventId, sourceType, itemOrItems) => {
      const items = Array.isArray(itemOrItems) ? itemOrItems : [itemOrItems];
      mutateSources(eventId, sourceType, (list) => [...list, ...items]);
      notify(`${SOURCE_TYPE_LABELS[sourceType]} added`);
    },
    [mutateSources, notify]
  );

  const updateEvidence = useCallback(
    (eventId, sourceType, item) => {
      mutateSources(eventId, sourceType, (list) => list.map((x) => (x.id === item.id ? { ...item } : x)));
      notify(`${SOURCE_TYPE_LABELS[sourceType]} updated`);
    },
    [mutateSources, notify]
  );

  const deleteEvidence = useCallback(
    (eventId, sourceType, itemId) => {
      if (!window.confirm(`Delete this ${SOURCE_TYPE_LABELS[sourceType]}?`)) return;
      mutateSources(eventId, sourceType, (list) => list.filter((x) => x.id !== itemId));
      notify(`${SOURCE_TYPE_LABELS[sourceType]} deleted`);
    },
    [mutateSources, notify]
  );

  const togglePin = useCallback(
    (eventId, sourceType, itemId) => {
      mutateSources(eventId, sourceType, (list) =>
        list.map((x) => (x.id === itemId ? { ...x, pinned: !x.pinned } : x))
      );
    },
    [mutateSources]
  );

  /* ─── Event mutations ─── */
  const addEvent = useCallback(
    (payload) => {
      const newEvent = {
        id: uid(),
        ...payload,
        sources: { media: [], x_post: [], news_article: [], admin_note: [] },
      };
      setEvents((prev) => [...prev, newEvent]);
      notify('Update added');
    },
    [notify]
  );

  const updateEvent = useCallback(
    (id, patch) => {
      setEvents((prev) =>
        prev.map((e) => {
          if (e.id !== id) return e;
          return { ...e, ...patch };
        })
      );
      // refresh drawer event if it's the one being edited
      setDrawerEvent((current) => (current?.id === id ? { ...current, ...patch } : current));
      notify('Update saved');
    },
    [notify]
  );

  const deleteEvent = useCallback(
    (id) => {
      if (!window.confirm('Delete this story update?')) return;
      setEvents((prev) => prev.filter((e) => e.id !== id));
      setDrawerEvent((current) => (current?.id === id ? null : current));
      notify('Update deleted');
    },
    [notify]
  );

  /* ─── Incident mutations ─── */
  const updateIncident = useCallback(
    (patch) => {
      setIncident((prev) => ({ ...prev, ...patch, updatedAt: nowIso() }));
      notify('Incident updated');
    },
    [notify]
  );

  const resolveIncidentFunc = useCallback(() => {
    setIncident((prev) => ({
      ...prev,
      status: 'resolved',
      endDate: nowIso(),
      resolvedAt: nowIso(),
      resolvedBy: currentUser.id,
      updatedAt: nowIso(),
    }));
    setConfirm(null);
    notify('Incident resolved');
  }, [notify]);

  const softDeleteIncident = useCallback(() => {
    setIncident((prev) => ({
      ...prev,
      status: 'deleted',
      originalStatus: prev.status === 'deleted' ? prev.originalStatus : prev.status,
      deletedAt: nowIso(),
      deletedBy: currentUser.id,
      deletedByName: currentUser.name,
      updatedAt: nowIso(),
    }));
    setConfirm(null);
    notify('Incident moved to Recycle Bin');
  }, [notify]);

  const restoreIncidentFunc = useCallback(() => {
    setIncident((prev) => ({
      ...prev,
      status: prev.originalStatus || 'active',
      originalStatus: null,
      deletedAt: null,
      deletedBy: null,
      deletedByName: null,
      purgedAt: null,
      updatedAt: nowIso(),
    }));
    setConfirm(null);
    notify('Incident restored');
  }, [notify]);

  const purgeIncidentFunc = useCallback(() => {
    setIncident((prev) => ({
      ...prev,
      status: 'purged',
      purgedAt: nowIso(),
      updatedAt: nowIso(),
    }));
    setConfirm(null);
    notify('Incident permanently deleted');
  }, [notify]);

  /* ─── UI helpers ─── */
  const goFullDetails = useCallback(() => navigate(`/dashboard?incident=${incident.id}`), [navigate, incident.id]);

  const handleCopyLink = useCallback(() => {
    const url = `${window.location.origin}/dashboard?incident=${incident.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [incident.id]);

  const openDrawer = useCallback((event, startingTab = 'all') => {
    setDrawerEvent(event);
    setDrawerTab(startingTab);
  }, []);

  const closeDrawer = useCallback(() => setDrawerEvent(null), []);

  const openLightbox = useCallback((items, startIndex = 0) => {
    setLightbox({ items, startIndex });
  }, []);

  const closeLightbox = useCallback(() => setLightbox(null), []);

  useEffect(() => {
    if (!drawerEvent || lightbox) return;
    const onKey = (e) => {
      if (e.key === 'Escape') closeDrawer();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawerEvent, lightbox, closeDrawer]);

  // keep the open drawer in sync when evidence/event mutations happen
  useEffect(() => {
    if (!drawerEvent) return;
    const updated = events.find((e) => e.id === drawerEvent.id);
    if (updated && updated !== drawerEvent) setDrawerEvent(updated);
  }, [events, drawerEvent?.id]);

  const initialReport = events[0];
  const updates = events.slice(1);

  const totalSources = events.reduce((sum, e) => sum + countSources(e.sources), 0);
  const totalUpdates = events.length;
  const totalPosts = events.reduce((sum, e) => sum + (e.sources?.x_post?.length || 0), 0);
  const coords = parseCoordinates(incident.coordinates);
  const isDeleted = incident.status === 'deleted';
  const isPurged = incident.status === 'purged';
  const isResolved = incident.status === 'resolved';
  const isReadOnly = isDeleted || isPurged;

  return (
    <div className={`id-trial-page ${isSuper ? 'id-trial-page--superadmin' : ''}`}>
      <div className="id-fake-map">
        <div className="id-fake-map-grid" />
        <div className="id-fake-map-markers">
          <span style={{ left: '24%', top: '34%' }} />
          <span style={{ left: '42%', top: '28%' }} />
          <span style={{ left: '54%', top: '46%' }} />
          <span style={{ left: '66%', top: '30%' }} />
          <span style={{ left: '44%', top: '62%' }} />
          <span style={{ left: '72%', top: '58%' }} />
        </div>
        <div className="id-fake-map-label">Selected incident</div>
      </div>

      <aside className="id-sidebar">
        <div className="id-sidebar__scroll">
          <SummaryCard incident={incident} onTitleClick={goFullDetails} mode={mode}>
            <div className="id-summary__actions">
              <button className="id-btn-primary" onClick={goFullDetails}>
                {Icons.external} Full details
              </button>
              <button className="id-btn" onClick={handleCopyLink}>
                {copied ? 'Copied!' : 'Copy incident link'}
              </button>
            </div>

            {isSuper && (
              <div className="id-summary-stats">
                <StatTile value={totalSources} label="Sources" />
                <StatTile value={totalUpdates} label="Updates" />
                <StatTile value={totalPosts} label="Posts" />
              </div>
            )}

            {isSuper && (
              <div className="id-summary-meta">
                <MetaRow label="Location">{incident.locationContext || incident.location}</MetaRow>
                {coords && (
                  <MetaRow label="Coordinates">
                    <span className="id-mono">
                      {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
                    </span>
                    <CopyButton text={`${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`} />
                  </MetaRow>
                )}
                <MetaRow label="Started">{formatDate(incident.startDate)} · {formatTime(incident.startDate)}</MetaRow>
                {incident.endDate && <MetaRow label="Ended">{formatDate(incident.endDate)} · {formatTime(incident.endDate)}</MetaRow>}
                <MetaRow label="Category">
                  <span style={{ color: incident.categoryColor, fontWeight: 700 }}>{incident.category}</span>
                  {' · '}
                  {incident.domain}
                </MetaRow>
                <MetaRow label="Created by">
                  <button
                    type="button"
                    className="id-creator-link"
                    onClick={() => onViewCreator?.(incident.createdBy)}
                  >
                    {incident.createdByName || incident.createdBy}
                    {incident.createdByEmail && <span className="id-creator-email">{incident.createdByEmail}</span>}
                  </button>
                </MetaRow>
              </div>
            )}

            {isPurged && (
              <div className="id-banner id-banner--purged">
                <div className="id-banner__title">This incident has been permanently deleted.</div>
                {incident.purgedAt && <div>Purged {formatDate(incident.purgedAt)} · {formatTime(incident.purgedAt)}</div>}
                {incident.originalStatus && <div>Original status: {incident.originalStatus}</div>}
              </div>
            )}

            {isDeleted && (
              <div className="id-banner id-banner--deleted">
                <div className="id-banner__title">This incident has been moved to the Recycle Bin.</div>
                {incident.deletedAt && <div>Deleted {formatDate(incident.deletedAt)} · {formatTime(incident.deletedAt)}</div>}
                {incident.deletedByName && <div>Deleted by {incident.deletedByName}</div>}
                {incident.originalStatus && <div>Original status: {incident.originalStatus}</div>}
                <div className="id-banner__actions">
                  <button type="button" className="id-btn" onClick={() => setConfirm({ type: 'restore' })}>
                    ↺ Restore
                  </button>
                  <button type="button" className="id-btn-danger" onClick={() => setConfirm({ type: 'purge' })}>
                    {Icons.trash} Purge permanently
                  </button>
                </div>
              </div>
            )}

            {isAdmin && !isReadOnly && (
              <div className="id-admin-bar">
                <button className="id-admin-bar__btn" onClick={() => setModal({ type: 'incident' })}>
                  {Icons.edit} Edit incident
                </button>
                <button className="id-admin-bar__btn id-admin-bar__btn--primary" onClick={() => setModal({ type: 'event' })}>
                  {Icons.plus} Add update
                </button>
                {incident.status === 'active' && (
                  <button className="id-admin-bar__btn id-admin-bar__btn--warning" onClick={() => setConfirm({ type: 'resolve' })}>
                    ✓ Resolve
                  </button>
                )}
                <button className="id-admin-bar__btn id-admin-bar__btn--danger" onClick={() => setConfirm({ type: 'delete' })}>
                  {Icons.trash} Delete incident
                </button>
                {isSuper && (
                  <>
                    <button className="id-admin-bar__btn" onClick={() => onOpenAudit?.()}>
                      📋 Audit log
                    </button>
                    <button className="id-admin-bar__btn" onClick={() => onViewCreator?.(incident.createdBy)}>
                      {Icons.external} View creator
                    </button>
                  </>
                )}
              </div>
            )}

            {isSuper && <StatusHistory incident={incident} events={events} onUserClick={onViewCreator} />}
            {isSuper && <DebugMetadata incident={incident} />}
          </SummaryCard>

          <div className="id-section-title">Initial Report</div>

          <TimelineItem event={initialReport} index={0} total={events.length}>
            <InitialReportCard
              event={initialReport}
              isAdmin={isAdmin}
              featuredItem={featuredItems[initialReport.id]}
              onSetFeature={openDrawer}
              onClearFeature={() => clearFeaturedItem(initialReport.id)}
              onOpenDrawer={openDrawer}
              onOpenLightbox={openLightbox}
            />
          </TimelineItem>

          <div className="id-section-title">Updates</div>
          {updates.map((event, idx) => (
            <TimelineItem key={event.id} event={event} index={idx + 1} total={events.length}>
              <UpdateCard
                event={event}
                isAdmin={isAdmin}
                featuredItem={featuredItems[event.id]}
                onSetFeature={openDrawer}
                onClearFeature={() => clearFeaturedItem(event.id)}
                onOpenDrawer={openDrawer}
                onOpenLightbox={openLightbox}
              />
            </TimelineItem>
          ))}

          <div style={{ height: 40 }} />
        </div>
      </aside>

      {drawerEvent && (
        <>
          <div className="id-drawer-overlay" onClick={closeDrawer} />
          <div className="id-drawer">
            <div className="id-drawer__header">
              <div>
                <h3 className="id-drawer__title">{drawerEvent.summary}</h3>
                <div className="id-drawer__meta">
                  {formatTime(drawerEvent.timestamp)} · {relativeTime(drawerEvent.timestamp)}
                </div>
              </div>
              <button className="id-drawer__close" onClick={closeDrawer} aria-label="Close">
                ×
              </button>
            </div>

            <div className="id-drawer__body">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                <VerificationBadge status={drawerEvent.verification} />
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.8px',
                    color: drawerEvent.type === 'report' ? 'var(--accent-light)' : 'var(--text-muted)',
                  }}
                >
                  {drawerEvent.type === 'report' ? 'Initial report' : 'Update'}
                </span>
              </div>

              {isAdmin && !isReadOnly && (
                <div className="id-drawer-admin">
                  <Select
                    value={drawerEvent.verification}
                    onChange={(e) => updateEvent(drawerEvent.id, { verification: e.target.value })}
                    style={{ maxWidth: 140, padding: '5px 9px', fontSize: 12 }}
                    disabled={isReadOnly}
                  >
                    {Object.keys(VERIFICATION).map((k) => (
                      <option key={k} value={k}>
                        {VERIFICATION[k].label}
                      </option>
                    ))}
                  </Select>
                  <button
                    type="button"
                    className="id-drawer-admin__btn"
                    onClick={() => setModal({ type: 'event', event: drawerEvent })}
                    disabled={isReadOnly}
                  >
                    {Icons.edit} Edit
                  </button>
                  <button
                    type="button"
                    className="id-drawer-admin__btn id-drawer-admin__btn--danger"
                    onClick={() => deleteEvent(drawerEvent.id)}
                    disabled={isReadOnly}
                  >
                    {Icons.trash} Delete
                  </button>
                </div>
              )}

              <p
                style={{
                  fontSize: 14,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.7,
                  margin: '0 0 22px',
                }}
              >
                {drawerEvent.details}
              </p>

              <EvidenceBundle
                event={drawerEvent}
                activeTab={drawerTab}
                onTabChange={setDrawerTab}
                onMediaClick={openLightbox}
                mode={mode}
                onAddEvidence={(eventId, sourceType) => setModal({ type: 'evidence', eventId, sourceType })}
                onEditItem={(eventId, sourceType, item) => setModal({ type: 'item', eventId, sourceType, item })}
                onDeleteItem={deleteEvidence}
                onPinItem={togglePin}
                featuredItem={featuredItems[drawerEvent.id]}
                onFeatureItem={setFeaturedItem}
              />
            </div>
          </div>
        </>
      )}

      {lightbox && <Lightbox items={lightbox.items} startIndex={lightbox.startIndex} onClose={closeLightbox} />}

      {modal?.type === 'incident' && (
        <IncidentEditModal
          incident={incident}
          onClose={() => setModal(null)}
          onSave={(patch) => {
            updateIncident(patch);
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
              updateEvent(modal.event.id, form);
            } else {
              addEvent(form);
            }
            setModal(null);
          }}
        />
      )}

      {modal?.type === 'evidence' && (
        <EvidenceModal
          type={modal.sourceType}
          onClose={() => setModal(null)}
          onSave={(item) => {
            addEvidence(modal.eventId, modal.sourceType, item);
            setModal(null);
          }}
        />
      )}

      {modal?.type === 'item' && (
        <EvidenceModal
          type={modal.sourceType}
          item={modal.item}
          onClose={() => setModal(null)}
          onSave={(item) => {
            updateEvidence(modal.eventId, modal.sourceType, item);
            setModal(null);
          }}
        />
      )}

      {confirm?.type === 'resolve' && (
        <Modal title="Resolve incident" onClose={() => setConfirm(null)} onSubmit={resolveIncidentFunc} submitLabel="Resolve">
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Mark <strong>{incident.title}</strong> as resolved? It will be hidden from the live map and moved to historic view.
          </p>
        </Modal>
      )}

      {confirm?.type === 'delete' && (
        <Modal title="Move to Recycle Bin" onClose={() => setConfirm(null)} onSubmit={softDeleteIncident} submitLabel="Move to Recycle Bin">
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Move <strong>{incident.title}</strong> to the Recycle Bin? It will be hidden from all views but can be restored later.
          </p>
        </Modal>
      )}

      {confirm?.type === 'restore' && (
        <Modal title="Restore incident" onClose={() => setConfirm(null)} onSubmit={restoreIncidentFunc} submitLabel="Restore">
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Restore <strong>{incident.title}</strong> to its original status? It will reappear on the live map.
          </p>
        </Modal>
      )}

      {confirm?.type === 'purge' && (
        <Modal title="Permanently delete" onClose={() => setConfirm(null)} onSubmit={purgeIncidentFunc} submitLabel="Purge permanently">
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Permanently delete <strong>{incident.title}</strong>? This action cannot be undone and the record will be purged from the Recycle Bin.
          </p>
        </Modal>
      )}

      {toast && <Toast message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}

function findItemByFeature(sources, featured) {
  if (!featured || !sources) return null;
  const list = sources[featured.sourceType];
  return list?.find((x) => x.id === featured.itemId) || null;
}

function FeaturedItemContent({ sourceType, item, onMediaClick }) {
  if (sourceType === 'media') {
    return (
      <button type="button" className="id-featured-media" onClick={() => onMediaClick?.([item], 0)}>
        <img src={item.url} alt={item.caption} loading="lazy" />
        {item.caption && <div className="id-featured-media__caption">{item.caption}</div>}
      </button>
    );
  }
  if (sourceType === 'x_post') {
    return (
      <div className="id-featured-embed">
        <XEmbed post={item} />
      </div>
    );
  }
  if (sourceType === 'news_article') {
    return <ArticleCard article={item} />;
  }
  if (sourceType === 'admin_note') {
    return <AdminNoteCard note={item} />;
  }
  return null;
}

function FeaturedSection({ event, featuredItem, onMediaClick, onClearFeature, isAdmin, onOpenDrawer }) {
  const item = findItemByFeature(event.sources, featuredItem);
  if (!item) return null;
  return (
    <>
      <div className="id-featured-block">
        <div className="id-featured-block__header">
          <span className="id-featured-block__label">{Icons.star} Featured</span>
          {isAdmin && (
            <div className="id-featured-block__actions">
              <button type="button" className="id-featured-block__change" onClick={(e) => { e.stopPropagation(); onOpenDrawer(event, 'all'); }}>
                Change
              </button>
              <button type="button" className="id-featured-block__remove" onClick={(e) => { e.stopPropagation(); onClearFeature(); }}>
                Remove
              </button>
            </div>
          )}
        </div>
        <div className="id-featured-block__body">
          <FeaturedItemContent sourceType={featuredItem.sourceType} item={item} onMediaClick={onMediaClick} />
        </div>
      </div>
      <div className="id-featured-meta">
        <SourceCountChips sources={event.sources} />
        <button
          type="button"
          className="id-btn-ghost"
          onClick={(e) => { e.stopPropagation(); onOpenDrawer(event, 'all'); }}
        >
          Inspect {Icons.chevronRight}
        </button>
      </div>
    </>
  );
}

function FeatureTrigger({ event, onSetFeature }) {
  if (countSources(event.sources) === 0) return null;
  return (
    <button
      type="button"
      className="id-feature-trigger"
      onClick={(e) => {
        e.stopPropagation();
        onSetFeature(event, 'all');
      }}
    >
      {Icons.star} Set featured item
    </button>
  );
}

function TwitterMediaGrid({ sources, onMediaClick, onOpenDrawer }) {
  const counts = sourceCounts(sources);
  const allMedia = sources?.media || [];
  const totalMedia = allMedia.length;

  if (totalMedia === 0) {
    return (
      <div className="id-evidence-count-row">
        <SourceCountChips counts={counts} />
        <button
          type="button"
          className="id-btn-ghost"
          style={{ marginLeft: 'auto' }}
          onClick={(e) => { e.stopPropagation(); onOpenDrawer?.(); }}
        >
          Inspect {Icons.chevronRight}
        </button>
      </div>
    );
  }

  // Pinned media first, then preserve upload order.
  const sortedMedia = [...allMedia].sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned));
  const display = sortedMedia.slice(0, 4);
  const hasMore = totalMedia > 4;
  const gridClass = `id-twitter-grid id-twitter-grid--${display.length === 4 && hasMore ? 'more' : display.length}`;

  return (
    <div className="id-update-card__media">
      <div className={gridClass}>
        {display.map((item, idx) => (
          <button
            key={item.id}
            type="button"
            className="id-twitter-grid__cell"
            onClick={(e) => {
              e.stopPropagation();
              onMediaClick?.(sortedMedia, idx);
            }}
          >
            <img src={item.url} alt={item.caption} loading="lazy" />
            {idx === 3 && hasMore && (
              <span className="id-twitter-grid__overlay">+{totalMedia - 4}</span>
            )}
          </button>
        ))}
      </div>
      <div className="id-evidence-count-row">
        <SourceCountChips counts={counts} />
        <button
          type="button"
          className="id-btn-ghost"
          style={{ marginLeft: 'auto' }}
          onClick={(e) => { e.stopPropagation(); onOpenDrawer?.(); }}
        >
          Inspect {Icons.chevronRight}
        </button>
      </div>
    </div>
  );
}

function InitialReportCard({ event, isAdmin, featuredItem, onSetFeature, onClearFeature, onOpenDrawer, onOpenLightbox }) {
  return (
    <div className="id-latest" onClick={() => onOpenDrawer(event, 'all')}>
      <UpdateHeader event={event} />
      <h3 className="id-update-card__title">{event.summary}</h3>
      <p className="id-update-card__text">{event.details}</p>
      {isAdmin && !featuredItem && <FeatureTrigger event={event} onSetFeature={onSetFeature} />}
      {featuredItem ? (
        <FeaturedSection
          event={event}
          featuredItem={featuredItem}
          onMediaClick={onOpenLightbox}
          onClearFeature={onClearFeature}
          isAdmin={isAdmin}
          onOpenDrawer={onOpenDrawer}
        />
      ) : (
        <TwitterMediaGrid sources={event.sources} onMediaClick={onOpenLightbox} onOpenDrawer={() => onOpenDrawer(event, 'all')} />
      )}
    </div>
  );
}

function UpdateCard({ event, isAdmin, featuredItem, onSetFeature, onClearFeature, onOpenDrawer, onOpenLightbox }) {
  return (
    <div className="id-update-card" onClick={() => onOpenDrawer(event, 'all')}>
      <div className="id-update-card__body">
        <UpdateHeader event={event} />
        <h3 className="id-update-card__title">{event.summary}</h3>
        <p className="id-update-card__text">
          {event.details.length > 130 ? event.details.slice(0, 130) + '…' : event.details}
        </p>
        {isAdmin && !featuredItem && <FeatureTrigger event={event} onSetFeature={onSetFeature} />}
        {featuredItem ? (
          <FeaturedSection
            event={event}
            featuredItem={featuredItem}
            onMediaClick={onOpenLightbox}
            onClearFeature={onClearFeature}
            isAdmin={isAdmin}
            onOpenDrawer={onOpenDrawer}
          />
        ) : (
          <TwitterMediaGrid sources={event.sources} onMediaClick={onOpenLightbox} onOpenDrawer={() => onOpenDrawer(event, 'all')} />
        )}
      </div>
    </div>
  );
}
