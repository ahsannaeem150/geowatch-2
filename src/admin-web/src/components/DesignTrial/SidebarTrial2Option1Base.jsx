import React, { useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import {
  INCIDENT,
  TIMELINE,
  Icons,
  Badge,
  formatDate,
  formatTime,
  countEvidence,
  XPostCarousel,
  ArticleCard,
  AdminNoteCard,
  MediaGrid,
  Lightbox,
  VERIFICATION,
  SEVERITY_LABELS,
  sortPinned,
  SOURCE_TYPE_ICONS,
  SOURCE_TYPE_LABELS,
  makeImg,
  makeTweet,
} from './SidebarTrialShared.jsx';
import './SidebarTrial2Option1.css';

/* ─────────────────────────────────────────────────────────────────────────────
   Option 1 Base — Sticky Evidence Rail
   Shared core for user, admin, and superadmin variants.
   ───────────────────────────────────────────────────────────────────────────── */

const DEFAULT_HERO_IMAGE =
  'https://images.unsplash.com/photo-1562742382-d2a5c01dff21?auto=format&fit=crop&w=1600&q=80';

const ROLE_META = {
  user: { label: 'Public view', color: '#38bdf8', accent: '#0ea5e9', accentLight: '#38bdf8' },
  admin: { label: 'Admin', color: '#9f1239', accent: '#5a011c', accentLight: '#9f1239' },
  superadmin: { label: 'Superadmin', color: '#9f1239', accent: '#5a011c', accentLight: '#9f1239' },
};

const ALL_SOURCE_TYPES = ['media', 'x_post', 'news_article', 'admin_note'];

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
    return format(new Date(iso), "yyyy-MM-dd'T'HH:mm");
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

/* ─── Hero ─── */
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
            {Icons.mapPin} {incident.location}
          </span>
          <span className="opt1-hero-meta-item">
            {Icons.calendar} {formatDate(incident.startDate)}
          </span>
          <span className="opt1-hero-meta-item">
            {Icons.hash} {incident.category}
          </span>
        </div>
        <h1 className="opt1-hero-title">{incident.title}</h1>
        <p className="opt1-hero-desc">{incident.description}</p>
      </div>
    </div>
  );
}

/* ─── Admin toolbar (inline on cards) ─── */
function AdminInlineButton({ icon, label, onClick, variant = 'default', title }) {
  const variants = {
    default: { bg: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' },
    danger: { bg: 'rgba(239,68,68,0.12)', color: 'var(--danger-light)', border: '1px solid rgba(239,68,68,0.25)' },
    pin: { bg: 'rgba(245,158,11,0.12)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.25)' },
  };
  const v = variants[variant];
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '4px 8px',
        borderRadius: 8,
        background: v.bg,
        color: v.color,
        border: v.border,
        fontSize: 11,
        fontWeight: 700,
        cursor: 'pointer',
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function EvidenceToolbar({ item, onEdit, onDelete, onPin, kind = 'item' }) {
  return (
    <div className="opt1-evidence-toolbar">
      <AdminInlineButton
        icon={Icons.pin}
        label={item.pinned ? 'Unpin' : 'Pin'}
        variant={item.pinned ? 'pin' : 'default'}
        title={item.pinned ? 'Unpin this item' : 'Pin this item'}
        onClick={onPin}
      />
      <AdminInlineButton icon={Icons.edit} label="Edit" title="Edit" onClick={onEdit} />
      <AdminInlineButton icon={Icons.trash} label="Delete" variant="danger" title="Delete" onClick={onDelete} />
    </div>
  );
}


/* ─── Editable evidence cards ─── */
function EditableMediaThumb({ item, onClick, onEdit, onDelete, onPin }) {
  return (
    <div className="opt1-media-wrap">
      <div
        role="button"
        tabIndex={0}
        onClick={() => onClick?.(item)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick?.(item);
          }
        }}
        className="opt1-media-thumb"
      >
        <img src={item.url} alt={item.caption} className="opt1-media-thumb__img" />
        {item.pinned && (
          <span className="opt1-pinned-badge opt1-pinned-badge--thumb">
            {Icons.pin} Pinned
          </span>
        )}
        {item.caption && (
          <div className="opt1-media-caption">{item.caption}</div>
        )}
      </div>
      <EvidenceToolbar item={item} onEdit={onEdit} onDelete={onDelete} onPin={onPin} />
    </div>
  );
}

function EditableMediaGrid({ items, onItemClick, onEdit, onDelete, onPin }) {
  if (!items?.length) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
      {items.map((item) => (
        <EditableMediaThumb
          key={item.id}
          item={item}
          onClick={onItemClick}
          onEdit={() => onEdit(item)}
          onDelete={() => onDelete(item.id)}
          onPin={() => onPin(item.id)}
        />
      ))}
    </div>
  );
}

function EditableArticleCard({ article, onEdit, onDelete, onPin }) {
  const openLink = () => window.open(article.url, '_blank', 'noopener,noreferrer');
  return (
    <div className="opt1-editable-card">
      <EvidenceToolbar item={article} onEdit={onEdit} onDelete={onDelete} onPin={onPin} />
      <div
        role="link"
        tabIndex={0}
        onClick={openLink}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openLink();
          }
        }}
        className="opt1-article-card"
      >
        <span className="opt1-article-icon">{Icons.link}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.35 }}>
              {article.title}
            </div>
            {article.pinned && (
              <span className="opt1-pinned-badge opt1-pinned-badge--inline">
                {Icons.pin} Pinned
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{article.publisher}</div>
        </div>
        {Icons.arrowRight}
      </div>
    </div>
  );
}

function EditableAdminNoteCard({ note, onEdit, onDelete, onPin }) {
  const [expanded, setExpanded] = useState(false);
  const TRUNCATE_AT = 140;
  const isLong = note.text.length > TRUNCATE_AT;
  const displayText = expanded || !isLong ? note.text : `${note.text.slice(0, TRUNCATE_AT)}…`;

  return (
    <div className="opt1-editable-card opt1-note-card">
      <EvidenceToolbar item={note} onEdit={onEdit} onDelete={onDelete} onPin={onPin} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: '#fbbf24', letterSpacing: '0.05em', marginBottom: 6 }}>
        {SOURCE_TYPE_ICONS.admin_note} Admin note · {note.author}
        {note.pinned && <span className="opt1-pinned-badge opt1-pinned-badge--inline">{Icons.pin} Pinned</span>}
      </div>
      <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{displayText}</div>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="opt1-read-more"
        >
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}
    </div>
  );
}

/* ─── Evidence rail ─── */
function EvidenceRail({
  event,
  mode,
  onMediaClick,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  onAddEvidence,
  onEditItem,
  onDeleteItem,
  onPinItem,
  extraTabs = [],
}) {
  if (!event) return null;
  const isAdmin = mode === 'admin' || mode === 'superadmin';
  const [filter, setFilter] = useState('all');
  const [postIdx, setPostIdx] = useState(0);

  useEffect(() => {
    setPostIdx(0);
  }, [event?.id]);
  const sources = event.sources || {};
  const ver = VERIFICATION[event.verification] || VERIFICATION.unverified;

  const media = useMemo(() => sortPinned(sources.media || []), [sources.media]);
  const posts = useMemo(() => sortPinned(sources.x_post || []), [sources.x_post]);
  const articles = useMemo(() => sortPinned(sources.news_article || []), [sources.news_article]);
  const notes = useMemo(() => sortPinned(sources.admin_note || []), [sources.admin_note]);

  const counts = {
    all: media.length + posts.length + articles.length + notes.length,
    media: media.length,
    x_post: posts.length,
    news_article: articles.length,
    admin_note: notes.length,
  };

  const tabs = [
    { key: 'all', label: 'All', icon: '⊕' },
    { key: 'media', label: SOURCE_TYPE_LABELS.media, icon: SOURCE_TYPE_ICONS.media },
    { key: 'x_post', label: SOURCE_TYPE_LABELS.x_post, icon: SOURCE_TYPE_ICONS.x_post },
    { key: 'news_article', label: SOURCE_TYPE_LABELS.news_article, icon: SOURCE_TYPE_ICONS.news_article },
    { key: 'admin_note', label: SOURCE_TYPE_LABELS.admin_note, icon: SOURCE_TYPE_ICONS.admin_note },
    ...extraTabs.map((t) => ({ key: t.key, label: t.label, icon: t.icon })),
  ];

  extraTabs.forEach((t) => {
    counts[t.key] = t.count ?? 0;
  });

  const show = (key) => filter === 'all' || filter === key;
  const isEmpty = counts[filter] === 0;

  const defaultOrder = ['media', 'x_post', 'news_article', 'admin_note'];
  const pinnedSet = new Set(
    defaultOrder.filter((key) => {
      const list = { media, x_post: posts, news_article: articles, admin_note: notes }[key];
      return list.some((item) => item.pinned);
    })
  );
  const categoryOrder = [
    ...defaultOrder.filter((key) => pinnedSet.has(key)),
    ...defaultOrder.filter((key) => !pinnedSet.has(key)),
  ];

  const SectionHeader = ({ typeKey, count }) => (
    <div className="opt1-bento-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span>
        {SOURCE_TYPE_ICONS[typeKey]} {SOURCE_TYPE_LABELS[typeKey]} ({count})
      </span>
      {isAdmin && (
        <button
          type="button"
          className="opt1-mini-add"
          onClick={() => onAddEvidence(event.id, typeKey)}
        >
          {Icons.plus} Add
        </button>
      )}
    </div>
  );

  const renderSection = (key) => {
    if (!show(key)) return null;
    const map = {
      media: {
        count: media.length,
        render: () =>
          isAdmin ? (
            <EditableMediaGrid
              items={media}
              onItemClick={onMediaClick}
              onEdit={(item) => onEditItem(event.id, 'media', item)}
              onDelete={(id) => onDeleteItem(event.id, 'media', id)}
              onPin={(id) => onPinItem(event.id, 'media', id)}
            />
          ) : (
            <MediaGrid items={media} onItemClick={onMediaClick} maxVisible={4} />
          ),
      },
      x_post: {
        count: posts.length,
        render: () => {
          const activePost = posts[postIdx];
          return (
            <div>
              {isAdmin && activePost && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                  <EvidenceToolbar
                    item={activePost}
                    onEdit={() => onEditItem(event.id, 'x_post', activePost)}
                    onDelete={() => onDeleteItem(event.id, 'x_post', activePost.id)}
                    onPin={() => onPinItem(event.id, 'x_post', activePost.id)}
                  />
                </div>
              )}
              <XPostCarousel posts={posts} value={postIdx} onChange={setPostIdx} />
            </div>
          );
        },
      },
      news_article: {
        count: articles.length,
        render: () =>
          isAdmin ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {articles.map((article) => (
                <EditableArticleCard
                  key={article.id}
                  article={article}
                  onEdit={() => onEditItem(event.id, 'news_article', article)}
                  onDelete={() => onDeleteItem(event.id, 'news_article', article.id)}
                  onPin={() => onPinItem(event.id, 'news_article', article.id)}
                />
              ))}
            </div>
          ) : (
            articles.map((article) => <ArticleCard key={article.id} article={article} />)
          ),
      },
      admin_note: {
        count: notes.length,
        render: () =>
          isAdmin ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {notes.map((note) => (
                <EditableAdminNoteCard
                  key={note.id}
                  note={note}
                  onEdit={() => onEditItem(event.id, 'admin_note', note)}
                  onDelete={() => onDeleteItem(event.id, 'admin_note', note.id)}
                  onPin={() => onPinItem(event.id, 'admin_note', note.id)}
                />
              ))}
            </div>
          ) : (
            notes.map((note) => <AdminNoteCard key={note.id} note={note} />)
          ),
      },
    };
    const section = map[key];
    if (section.count === 0) return null;
    return (
      <div key={key} className="opt1-bento-cell opt1-bento-cell--wide">
        <SectionHeader typeKey={key} count={section.count} />
        {key === 'news_article' || key === 'admin_note' ? (
          <div className="opt1-bento-scroll">{section.render()}</div>
        ) : (
          section.render()
        )}
      </div>
    );
  };

  return (
    <div className="opt1-rail">
      <div className="opt1-rail-card opt1-rail-card--enter" key={event.id}>
        <div className="opt1-rail-header">
          <div>
            <div className="opt1-rail-title">{event.summary}</div>
            <div className="opt1-rail-sub">
              {formatDate(event.timestamp)} · {formatTime(event.timestamp)} · {countEvidence(event)} evidence items
            </div>
          </div>
          <Badge color={ver.color} bg={ver.bg}>
            {ver.label}
          </Badge>
        </div>

        <div className="opt1-filter-tabs" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={filter === tab.key}
              onClick={() => setFilter(tab.key)}
              className={`opt1-filter-tab ${filter === tab.key ? 'opt1-filter-tab--active' : ''}`}
            >
              <span className="opt1-filter-tab__icon">{tab.icon}</span>
              <span className="opt1-filter-tab__label">{tab.label}</span>
              <span className="opt1-filter-tab__count">{counts[tab.key]}</span>
            </button>
          ))}
        </div>

        <div className="opt1-bento">
          {categoryOrder.map((key) => renderSection(key))}

          {(() => {
            const activeExtra = extraTabs.find((t) => t.key === filter);
            if (!activeExtra) return null;
            return (
              <div key={activeExtra.key} className="opt1-bento-cell opt1-bento-cell--wide">
                <div className="opt1-bento-label">{activeExtra.label}</div>
                <div className="opt1-bento-scroll">{activeExtra.render?.()}</div>
              </div>
            );
          })()}

          {isEmpty && (
            <div className="opt1-empty-state">
              No {filter === 'all' ? 'evidence' : SOURCE_TYPE_LABELS[filter].toLowerCase()} for this update.
              {isAdmin && (
                <button
                  type="button"
                  className="opt1-empty-add"
                  onClick={() => onAddEvidence(event.id, filter === 'all' ? 'media' : filter)}
                >
                  {Icons.plus} Add {filter === 'all' ? 'evidence' : SOURCE_TYPE_LABELS[filter]}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="opt1-rail-nav">
          <button onClick={onPrev} disabled={!hasPrev}>
            {Icons.chevronLeft} Prev
          </button>
          <button onClick={onNext} disabled={!hasNext}>
            Next {Icons.chevronRight}
          </button>
        </div>
      </div>
    </div>
  );
}


/* ─── Modals ─── */
function IncidentEditModal({ incident, onClose, onSave }) {
  const [form, setForm] = useState({ ...incident });
  const [heroMode, setHeroMode] = useState('url');
  const [heroPreview, setHeroPreview] = useState(incident.heroImage || DEFAULT_HERO_IMAGE);
  const patch = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleHeroFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    setHeroPreview(dataUrl);
    patch('heroImage', dataUrl);
  };

  const handleHeroUrl = (url) => {
    setHeroPreview(url);
    patch('heroImage', url);
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
        <Input value={form.title} onChange={(e) => patch('title', e.target.value)} />
      </Field>
      <Field label="Description">
        <TextArea value={form.description} onChange={(e) => patch('description', e.target.value)} />
      </Field>
      <Field label="Header image">
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          {switchBtn('file', 'Upload image')}
          {switchBtn('url', 'Image URL')}
        </div>
        {heroMode === 'file' ? (
          <Input type="file" accept="image/*" onChange={handleHeroFile} />
        ) : (
          <Input
            value={form.heroImage || ''}
            onChange={(e) => handleHeroUrl(e.target.value)}
            placeholder="https://..."
          />
        )}
        {heroPreview && (
          <div style={{ marginTop: 10, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-subtle)', maxHeight: 160 }}>
            <img src={heroPreview} alt="Header preview" style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }} />
          </div>
        )}
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
  switch (type) {
    case 'media':
      return { id: uid(), type: 'image', url: '', caption: '', pinned: false };
    case 'x_post':
      return makeTweet(uid(), 'X', '@x', 'Embedded post', '', uid(), false);
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

  /* Media upload state */
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '14px 0 10px', fontSize: 12, color: 'var(--text-muted)' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: '50%', background: 'var(--accent)', color: '#fff', fontSize: 10, fontWeight: 800 }}>
                    {Icons.edit}
                  </span>
                  {fileItems.length} file{fileItems.length > 1 ? 's' : ''} selected. Add or edit captions below.
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  {fileItems.map((item, idx) => (
                    <div key={idx} style={{ background: 'var(--bg-primary)', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                      <img src={item.dataUrl} alt={item.name} style={{ width: '100%', height: 84, objectFit: 'cover', display: 'block' }} />
                      <div style={{ padding: '8px 10px 10px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em', marginBottom: 6 }}>
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
                          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                          onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
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
      <Field label="Note">
        <TextArea value={form.text || ''} onChange={(e) => patch('text', e.target.value)} />
      </Field>
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

/* ─── Top bar with admin controls ─── */
function Option1TopBar({ mode, theme, setTheme, onEditIncident, onAddEvent, extraActions }) {
  const role = ROLE_META[mode];
  const isAdmin = mode === 'admin' || mode === 'superadmin';

  return (
    <div className="opt1-topbar">
      <div className="opt1-topbar-inner">
        <div className="opt1-topbar-left">
          <a href="/sidebarTrial2" className="opt1-back-link">
            {Icons.chevronLeft} Back
          </a>
          <div className="opt1-topbar-title">Option 1 — Sticky Evidence Rail</div>
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
          <div className="opt1-theme-switch">
            <span>Theme</span>
            <select value={theme} onChange={(e) => setTheme(e.target.value)}>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main base page ─── */
export default function SidebarTrial2Option1Base({
  mode = 'user',
  topBarExtra,
  rightSidebar,
  railExtraTabs,
}) {
  const isAdmin = mode === 'admin' || mode === 'superadmin';
  const isSuper = mode === 'superadmin';
  const role = ROLE_META[mode];

  const [theme, setTheme] = useState('dark');
  const [incident, setIncident] = useState({ ...INCIDENT, heroImage: DEFAULT_HERO_IMAGE });
  const [events, setEvents] = useState([...TIMELINE]);
  const [activeId, setActiveId] = useState(events[0]?.id);
  const [lightbox, setLightbox] = useState({ open: false, items: [], index: 0 });
  const [progress, setProgress] = useState(0);
  const [lineProgress, setLineProgress] = useState(0);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);

  const itemRefs = useRef({});
  const timelineRef = useRef(null);

  const sorted = useMemo(() => [...events].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)), [events]);
  const activeIndex = useMemo(() => sorted.findIndex((e) => e.id === activeId), [sorted, activeId]);
  const activeEvent = sorted[activeIndex] || sorted[0];

  const notify = (message) => setToast({ message });

  /* ─── Evidence mutations ─── */
  const mutateSources = (eventId, sourceType, updater) => {
    setEvents((prev) =>
      prev.map((e) => {
        if (e.id !== eventId) return e;
        const list = e.sources?.[sourceType] || [];
        return { ...e, sources: { ...e.sources, [sourceType]: updater(list) } };
      })
    );
  };

  const addEvidence = (eventId, sourceType, itemOrItems) => {
    const items = Array.isArray(itemOrItems) ? itemOrItems : [itemOrItems];
    mutateSources(eventId, sourceType, (list) => [...list, ...items]);
    notify(`${SOURCE_TYPE_LABELS[sourceType]} added`);
  };

  const updateEvidence = (eventId, sourceType, item) => {
    mutateSources(eventId, sourceType, (list) => list.map((x) => (x.id === item.id ? { ...item } : x)));
    notify(`${SOURCE_TYPE_LABELS[sourceType]} updated`);
  };

  const deleteEvidence = (eventId, sourceType, itemId) => {
    if (!window.confirm(`Delete this ${SOURCE_TYPE_LABELS[sourceType]}?`)) return;
    mutateSources(eventId, sourceType, (list) => list.filter((x) => x.id !== itemId));
    notify(`${SOURCE_TYPE_LABELS[sourceType]} deleted`);
  };

  const togglePin = (eventId, sourceType, itemId) => {
    mutateSources(eventId, sourceType, (list) =>
      list.map((x) => (x.id === itemId ? { ...x, pinned: !x.pinned } : x))
    );
  };

  /* ─── Event mutations ─── */
  const addEvent = (payload) => {
    const newEvent = {
      id: uid(),
      ...payload,
      sources: { media: [], x_post: [], news_article: [], admin_note: [] },
    };
    setEvents((prev) => [...prev, newEvent]);
    setActiveId(newEvent.id);
    notify('Update added');
  };

  const updateEvent = (id, patch) => {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
    notify('Update saved');
  };

  const deleteEvent = (id) => {
    if (!window.confirm('Delete this story update?')) return;
    setEvents((prev) => {
      const next = prev.filter((e) => e.id !== id);
      if (activeId === id) {
        const sortedNext = [...next].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        setActiveId(sortedNext[0]?.id || null);
      }
      return next;
    });
    notify('Update deleted');
  };

  const changeEventVerification = (id, verification) => {
    updateEvent(id, { verification });
  };

  /* ─── Superadmin incident actions ─── */
  const deleteIncident = () => {
    if (!window.confirm('This will permanently delete the incident. Continue?')) return;
    notify('Incident deleted (demo)');
  };

  /* ─── Scroll & progress ─── */
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

  /* ─── Keyboard nav ─── */
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
    const targetOffset = window.innerHeight * 0.35;
    window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().top - targetOffset, behavior: 'smooth' });
  };

  return (
    <div
      className={`option1-root option1-root--${mode}`}
      data-theme={theme}
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
        theme={theme}
        setTheme={setTheme}
        onEditIncident={() => setModal({ type: 'incident' })}
        onAddEvent={() => setModal({ type: 'event' })}
        extraActions={topBarExtra}
      />

      <div className="opt1-progress-bar" style={{ width: `${progress}%` }} />

      <main className="opt1-main">
        <div style={{ maxWidth: rightSidebar ? 1580 : 1240, margin: '0 auto', padding: rightSidebar ? '0 16px 80px' : '0 24px 80px' }}>
          <Hero incident={incident} heroImage={{ url: incident.heroImage || DEFAULT_HERO_IMAGE }} mode={mode} />

          <div className="opt1-section-title">Story timeline</div>
          <div
            className="opt1-grid"
            style={rightSidebar ? { gridTemplateColumns: 'minmax(0, 1.2fr) 340px 360px', gap: 22 } : undefined}
          >
            {/* Left: timeline */}
            <div className="opt1-timeline" ref={timelineRef}>
              <div className="opt1-timeline-track">
                <div className="opt1-timeline-progress" style={{ height: `${lineProgress}%` }} />
              </div>

              {sorted.map((event, idx) => {
                const ver = VERIFICATION[event.verification] || VERIFICATION.unverified;
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
                          value={event.verification}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            changeEventVerification(event.id, e.target.value);
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
                            deleteEvent(event.id);
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
                        {formatDate(event.timestamp)} · {formatTime(event.timestamp)}
                      </span>
                      <Badge color={ver.color} bg={ver.bg}>
                        {ver.label}
                      </Badge>
                    </div>
                    <h3 className="opt1-event-title">{event.summary}</h3>
                    <p className="opt1-event-desc">{event.details}</p>
                    <div className="opt1-event-footer">
                      <span>{countEvidence(event)} evidence items</span>
                      <span style={{ color: 'var(--accent-light)' }}>→</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right: sticky evidence rail */}
            <EvidenceRail
              event={activeEvent}
              mode={mode}
              onMediaClick={(item) => {
                const media = activeEvent.sources?.media || [];
                const index = media.findIndex((m) => m.id === item.id);
                setLightbox({ open: true, items: media, index: Math.max(0, index) });
              }}
              onPrev={() => goTo(activeIndex - 1)}
              onNext={() => goTo(activeIndex + 1)}
              hasPrev={activeIndex > 0}
              hasNext={activeIndex < sorted.length - 1}
              onAddEvidence={(eventId, sourceType) => setModal({ type: 'evidence', eventId, sourceType })}
              onEditItem={(eventId, sourceType, item) => setModal({ type: 'item', eventId, sourceType, item })}
              onDeleteItem={deleteEvidence}
              onPinItem={togglePin}
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
          index={lightbox.index}
          onClose={() => setLightbox((s) => ({ ...s, open: false }))}
          onPrev={() => setLightbox((s) => ({ ...s, index: Math.max(0, s.index - 1) }))}
          onNext={() => setLightbox((s) => ({ ...s, index: Math.min(s.items.length - 1, s.index + 1) }))}
        />
      )}

      {modal?.type === 'incident' && (
        <IncidentEditModal
          incident={incident}
          onClose={() => setModal(null)}
          onSave={(patch) => {
            setIncident((prev) => ({ ...prev, ...patch }));
            notify('Incident updated');
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

      {isAdmin && (
        <button
          type="button"
          onClick={deleteIncident}
          style={{
            position: 'fixed',
            bottom: 20,
            left: 20,
            zIndex: 900,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            borderRadius: 10,
            background: 'rgba(239,68,68,0.12)',
            color: 'var(--danger-light)',
            border: '1px solid rgba(239,68,68,0.25)',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {Icons.trash} Delete incident
        </button>
      )}

      {isAdmin && (
        <button
          type="button"
          onClick={() => setModal({ type: 'event' })}
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 900,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '12px 18px',
            borderRadius: 999,
            background: 'linear-gradient(135deg, var(--accent-light), var(--accent))',
            color: '#fff',
            border: 'none',
            fontSize: 13,
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 8px 28px rgba(0,0,0,0.35)',
          }}
        >
          {Icons.plus} Add update
        </button>
      )}

      {toast && <Toast message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}

export { EvidenceRail };
