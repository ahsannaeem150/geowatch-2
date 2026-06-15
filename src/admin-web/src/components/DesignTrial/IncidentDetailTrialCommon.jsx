import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  INCIDENT,
  TIMELINE,
  SOURCE_TYPE_LABELS,
  SOURCE_TYPE_ICONS,
  SEVERITY_LABELS,
  VERIFICATION,
  formatDate,
  formatTime,
  relativeTime,
  countSources,
  sourceCounts,
} from './IncidentDetailTrialData.js';
import { generateAuditData, findUser } from './SidebarTrial2Option1SuperAdminAudit.jsx';

export {
  INCIDENT,
  TIMELINE,
  SEVERITY_LABELS,
  VERIFICATION,
  SOURCE_TYPE_LABELS,
  SOURCE_TYPE_ICONS,
  formatDate,
  formatTime,
  relativeTime,
  countSources,
  sourceCounts,
};

/* ─── Inline icon helpers (no extra deps) ─── */
export const Icons = {
  chevronLeft: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),
  chevronRight: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  link: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  ),
  calendar: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  mapPin: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  external: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  ),
  xLogo: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  ),
  plus: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  edit: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  trash: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  pin: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C8.5 2 6 5 6 8c0 3.5 3 4.5 3 9h6c0-4.5 3-5.5 3-9 0-3-2.5-6-6-6z" />
      <path d="M9 21h6" />
    </svg>
  ),
  check: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  star: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  x: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  image: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  ),
};

/* ─── Sorting helpers ─── */
export function sortPinned(items = [], featuredId = null) {
  const priority = (item) => {
    if (item.featured || (featuredId && item.id === featuredId)) return 2;
    return item.pinned ? 1 : 0;
  };
  return [...items].sort((a, b) => priority(b) - priority(a));
}

/* ─── Badges ─── */
export function Badge({ children, color, className = 'id-badge' }) {
  const preset = color
    ? { background: `${color}18`, color, border: `1px solid ${color}40` }
    : { background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' };
  return (
    <span
      className={className}
      style={{
        ...preset,
        boxSizing: 'border-box',
      }}
    >
      {color && <span className="id-status-dot" style={{ background: preset.color }} />}
      {children}
    </span>
  );
}

export function SeverityBadge({ level }) {
  const cfg = SEVERITY_LABELS[level] || SEVERITY_LABELS[3];
  return (
    <span
      className="id-badge--severity"
      style={{ background: `${cfg.color}10`, border: `1px solid ${cfg.color}30`, color: cfg.color }}
    >
      <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.5px' }}>{level}</span>
      <span style={{ width: 1, height: 12, background: `${cfg.color}40`, borderRadius: 1 }} />
      <span>{cfg.label}</span>
    </span>
  );
}

export function VerificationBadge({ status }) {
  const cfg = VERIFICATION[status] || VERIFICATION.unverified;
  return <Badge color={cfg.color}>{cfg.label}</Badge>;
}

export function StatusBadge({ status }) {
  const color = status === 'active' ? '#22c55e' : '#6b7280';
  return <Badge color={color}>{status}</Badge>;
}

export function SaveButton({ saved = false }) {
  return (
    <button type="button" title={saved ? 'Saved' : 'Save incident'} className={`id-save ${saved ? 'saved' : ''}`}>
      {saved ? '★' : '☆'}
    </button>
  );
}

/* ─── Summary card ─── */
export function SummaryCard({ incident, children, onTitleClick, mode = 'user' }) {
  const sev = SEVERITY_LABELS[incident.severity] || SEVERITY_LABELS[3];
  const roleMeta =
    mode === 'superadmin'
      ? { label: 'Superadmin', color: '#6366f1' }
      : mode === 'admin'
      ? { label: 'Admin', color: '#9f1239' }
      : null;
  return (
    <div className="id-summary">
      <div className="id-summary__row">
        <Badge color={incident.domainColor || incident.categoryColor || '#9f1239'}>{incident.domain || incident.category}</Badge>
        <StatusBadge status={incident.status} />
        <VerificationBadge status={incident.verification} />
        <SeverityBadge level={incident.severity} />
        {roleMeta && <Badge color={roleMeta.color}>{roleMeta.label}</Badge>}
      </div>

      <div className="id-summary__title-row">
        <h1 className="id-summary__title">
          {onTitleClick ? (
            <button onClick={onTitleClick} className="id-summary__title-link">
              {incident.title}
            </button>
          ) : (
            incident.title
          )}
        </h1>
        <SaveButton saved />
      </div>

      <div className="id-summary__meta">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          {Icons.mapPin} {incident.location}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          {Icons.calendar} {formatDate(incident.startDate)} · {formatTime(incident.startDate)}
        </span>
      </div>

      <p className="id-summary__desc">{incident.description}</p>

      {children}
    </div>
  );
}

/* ─── Timeline helpers ─── */
export function TimelineItem({ event, index, total, children }) {
  const isFirst = index === 0;
  const isLast = index === total - 1;
  return (
    <div className="id-timeline-item">
      <div className="id-timeline-spine">
        {!isFirst && <div className="id-timeline-line" />}
        <div className={`id-timeline-dot ${isFirst ? 'id-timeline-dot--latest' : ''}`} />
        {!isLast && <div className="id-timeline-line" />}
      </div>
      <div className="id-timeline-content">{children}</div>
    </div>
  );
}

export function UpdateHeader({ event }) {
  const typeColor = event.type === 'report' ? 'var(--accent-light)' : 'var(--text-muted)';
  const typeLabel = event.type === 'report' ? 'Initial report' : 'Update';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
      <span
        style={{
          fontSize: 10,
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.8px',
          color: typeColor,
        }}
      >
        {typeLabel}
      </span>
      <span style={{ fontSize: 12, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
        {formatTime(event.timestamp)}
      </span>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
        · {relativeTime(event.timestamp)}
      </span>
      <span style={{ marginLeft: 'auto' }}>
        <VerificationBadge status={event.verification} />
      </span>
    </div>
  );
}

/* ─── Compact source count chips ─── */
export function SourceCountChips({ sources, counts: countsProp, className = '' }) {
  const counts = countsProp || sourceCounts(sources);
  const types = [
    { key: 'x_post', icon: SOURCE_TYPE_ICONS.x_post, label: 'Posts' },
    { key: 'news_article', icon: SOURCE_TYPE_ICONS.news_article, label: 'Articles' },
    { key: 'admin_note', icon: SOURCE_TYPE_ICONS.admin_note, label: 'Notes' },
    { key: 'media', icon: SOURCE_TYPE_ICONS.media, label: 'Media' },
  ];
  if (types.every((t) => !counts[t.key])) return null;
  return (
    <div className={`id-source-chips ${className}`}>
      {types.map((type) =>
        counts[type.key] > 0 ? (
          <span key={type.key} className="id-source-chip" title={`${counts[type.key]} ${type.label}`}>
            <span className="id-source-chip__icon">{type.icon}</span>
            <span className="id-source-chip__count">{counts[type.key]}</span>
          </span>
        ) : null
      )}
    </div>
  );
}

/* ─── Evidence preview ─── */
export function EvidencePreview({ sources, onMediaClick, onOpenDrawer }) {
  const counts = sourceCounts(sources);
  const media = sources?.media || [];
  const total = countSources(sources);
  if (!total) return null;

  return (
    <div className="id-update-card__actions">
      {media.length > 0 && (
        <div className="id-preview-thumbs">
          {media.slice(0, 2).map((m, idx) => (
            <button
              key={m.id}
              className="id-preview-thumb"
              onClick={(e) => {
                e.stopPropagation();
                onMediaClick?.(media, idx);
              }}
            >
              <img src={m.url} alt={m.caption} />
            </button>
          ))}
          {media.length > 2 && (
            <button
              className="id-preview-more"
              onClick={(e) => {
                e.stopPropagation();
                onMediaClick?.(media, 0);
              }}
            >
              +{media.length - 2}
            </button>
          )}
        </div>
      )}

      <div className="id-evidence-count-row">
        <SourceCountChips counts={counts} />
        <button
          className="id-btn-ghost"
          style={{ marginLeft: 'auto' }}
          onClick={(e) => {
            e.stopPropagation();
            onOpenDrawer?.();
          }}
        >
          Inspect {Icons.chevronRight}
        </button>
      </div>
    </div>
  );
}

/* ─── Carousel with keyboard support ─── */
export function Carousel({ items, renderItem, itemWidth, gap = 10, keyboard = true }) {
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);

  const goNext = useCallback(() => {
    setIndex((i) => (i + 1) % items.length);
  }, [items.length]);

  const goPrev = useCallback(() => {
    setIndex((i) => (i - 1 + items.length) % items.length);
  }, [items.length]);

  useEffect(() => {
    if (!keyboard || !hovered) return;
    const onKey = (e) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [keyboard, hovered, goNext, goPrev]);

  if (!items?.length) return null;

  const trackStyle = itemWidth
    ? { transform: `translateX(calc(-${index} * (${itemWidth}px + ${gap}px)))` }
    : { transform: `translateX(-${index * 100}%)` };

  return (
    <div
      className="id-carousel"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="id-carousel__track" style={trackStyle}>
        {items.map((item, i) => (
          <div
            key={item.id ?? i}
            className="id-carousel__item"
            style={itemWidth ? { flex: `0 0 ${itemWidth}px` } : { width: '100%', flexShrink: 0 }}
          >
            {renderItem(item, i)}
          </div>
        ))}
      </div>

      {items.length > 1 && (
        <>
          <button
            className="id-carousel__btn id-carousel__btn--prev"
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            aria-label="Previous"
          >
            {Icons.chevronLeft}
          </button>
          <button
            className="id-carousel__btn id-carousel__btn--next"
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            aria-label="Next"
          >
            {Icons.chevronRight}
          </button>
          <div className="id-carousel__counter">
            {index + 1} / {items.length}
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Admin inline toolbar for evidence items ─── */
function EvidenceToolbar({ item, onEdit, onDelete, onPin, onFeature, featured }) {
  return (
    <div className="id-evidence-toolbar">
      {onFeature && (
        <button
          type="button"
          className={featured ? 'id-evidence-toolbar__btn id-evidence-toolbar__btn--feature active' : 'id-evidence-toolbar__btn'}
          onClick={onFeature}
          title={featured ? 'Remove from update card' : 'Feature this item in the update card'}
        >
          {Icons.star} {featured ? 'Featured' : 'Feature'}
        </button>
      )}
      <button
        type="button"
        className={item.pinned ? 'id-evidence-toolbar__btn id-evidence-toolbar__btn--pin active' : 'id-evidence-toolbar__btn'}
        onClick={onPin}
        title={item.pinned ? 'Unpin from top' : 'Pin to top of this list'}
      >
        {Icons.pin} {item.pinned ? 'Pinned' : 'Pin to top'}
      </button>
      <button type="button" className="id-evidence-toolbar__btn" onClick={onEdit}>
        {Icons.edit} Edit
      </button>
      <button type="button" className="id-evidence-toolbar__btn id-evidence-toolbar__btn--danger" onClick={onDelete}>
        {Icons.trash} Delete
      </button>
    </div>
  );
}

function AdminMediaThumb({ item, onClick, onEdit, onDelete, onPin, onFeature, featured }) {
  return (
    <div className="id-admin-media" data-featured={featured || undefined}>
      <button type="button" className="id-media-thumb id-media-thumb--carousel" onClick={() => onClick?.(item)}>
        <img src={item.url} alt={item.caption} />
        {featured && (
          <span className="id-featured-badge">
            {Icons.star} Featured
          </span>
        )}
        {item.pinned && !featured && (
          <span className="id-pinned-badge">
            {Icons.pin} Pinned
          </span>
        )}
        {item.caption && <div className="id-media-thumb__caption">{item.caption}</div>}
      </button>
      <div className="id-admin-media__toolbar">
        {onFeature && (
          <button
            type="button"
            className={featured ? 'feature active' : 'feature'}
            onClick={onFeature}
            title={featured ? 'Remove from update card' : 'Feature in update card'}
          >
            {Icons.star}
          </button>
        )}
        <button
          type="button"
          className={item.pinned ? 'pin active' : 'pin'}
          onClick={onPin}
          title={item.pinned ? 'Unpin from top' : 'Pin to top'}
        >
          {Icons.pin}
        </button>
        <button type="button" onClick={onEdit} title="Edit">
          {Icons.edit}
        </button>
        <button type="button" className="danger" onClick={onDelete} title="Delete">
          {Icons.trash}
        </button>
      </div>
    </div>
  );
}

function EditableArticleCard({ article, onEdit, onDelete, onPin, onFeature, featured }) {
  return (
    <div className={`id-editable-card ${featured ? 'id-editable-card--featured' : ''}`} data-featured={featured || undefined}>
      <EvidenceToolbar item={article} onEdit={onEdit} onDelete={onDelete} onPin={onPin} onFeature={onFeature} featured={featured} />
      <a href={article.url} target="_blank" rel="noreferrer" className="id-article">
        <span className="id-article__icon">{Icons.link}</span>
        <div className="id-article__body">
          <div className="id-article__title">{article.title}</div>
          <div className="id-article__pub">{article.publisher}</div>
        </div>
        {Icons.external}
      </a>
    </div>
  );
}

function EditableAdminNoteCard({ note, onEdit, onDelete, onPin, onFeature, featured }) {
  const [expanded, setExpanded] = useState(false);
  const TRUNCATE_AT = 140;
  const isLong = note.text.length > TRUNCATE_AT;
  const displayText = expanded || !isLong ? note.text : `${note.text.slice(0, TRUNCATE_AT)}…`;

  return (
    <div className={`id-editable-card id-note ${featured ? 'id-editable-card--featured' : ''}`} data-featured={featured || undefined}>
      <EvidenceToolbar item={note} onEdit={onEdit} onDelete={onDelete} onPin={onPin} onFeature={onFeature} featured={featured} />
      <div className="id-note__label">
        {SOURCE_TYPE_ICONS.admin_note} Admin note · {note.author}
      </div>
      <div className="id-note__text">{displayText}</div>
      {isLong && (
        <button type="button" className="id-note__more" onClick={() => setExpanded((v) => !v)}>
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}
    </div>
  );
}

/* ─── Evidence bundle (drawer) ─── */
export function EvidenceBundle({
  event,
  activeTab,
  onTabChange,
  onMediaClick,
  mode = 'user',
  onAddEvidence,
  onEditItem,
  onDeleteItem,
  onPinItem,
  featuredItem,
  onFeatureItem,
}) {
  const isAdmin = mode === 'admin' || mode === 'superadmin';
  const sources = event.sources || {};

  const isFeatured = (type, item) =>
    featuredItem && featuredItem.sourceType === type && featuredItem.itemId === item.id;
  const defaultOrder = ['media', 'x_post', 'news_article', 'admin_note'];

  // Pinned items sort first inside each category; categories with pinned items
  // sort first in the "All" view, matching the full admin page behaviour.
  const sortedByType = useMemo(() => {
    const out = {};
    defaultOrder.forEach((key) => {
      const featuredId = featuredItem?.sourceType === key ? featuredItem.itemId : null;
      out[key] = sortPinned(sources[key], featuredId);
    });
    return out;
  }, [sources, featuredItem]);

  const counts = sourceCounts(sortedByType);
  const total = countSources(sortedByType);

  const categoryOrder = useMemo(() => {
    const priority = (key) => {
      if (featuredItem?.sourceType === key) return 2;
      if (sortedByType[key]?.some((x) => x.pinned)) return 1;
      return 0;
    };
    return [...defaultOrder].sort((a, b) => priority(b) - priority(a));
  }, [sortedByType, featuredItem]);

  const tabs = [
    { key: 'all', label: `All (${total})` },
    { key: 'media', label: `${SOURCE_TYPE_ICONS.media} Media (${counts.media})` },
    { key: 'x_post', label: `${SOURCE_TYPE_ICONS.x_post} Posts (${counts.x_post})` },
    { key: 'news_article', label: `${SOURCE_TYPE_ICONS.news_article} Articles (${counts.news_article})` },
    { key: 'admin_note', label: `${SOURCE_TYPE_ICONS.admin_note} Notes (${counts.admin_note})` },
  ].filter((t) => {
    if (t.key === 'all') return total > 0;
    return counts[t.key] > 0;
  });

  const AddEvidenceBar = () => (
    <div className="id-drawer-add-bar">
      <span className="id-drawer-add-bar__label">Add evidence</span>
      {defaultOrder.map((type) => (
        <button
          key={type}
          type="button"
          className="id-drawer-add-bar__btn"
          onClick={() => onAddEvidence?.(event.id, type)}
          title={`Add ${SOURCE_TYPE_LABELS[type]}`}
        >
          {SOURCE_TYPE_ICONS[type]} {Icons.plus} {SOURCE_TYPE_LABELS[type]}
        </button>
      ))}
    </div>
  );

  const SectionTitle = ({ type, title, count, featured, pinned }) => (
    <div className="id-evidence-section__title">
      <span>
        {SOURCE_TYPE_ICONS[type]} {title} ({count})
        {featured && <span className="id-section-badge id-section-badge--featured">{Icons.star} Featured</span>}
        {!featured && pinned && <span className="id-section-badge id-section-badge--pinned">{Icons.pin} Pinned</span>}
      </span>
      {isAdmin && (
        <button type="button" className="id-evidence-section__add" onClick={() => onAddEvidence?.(event.id, type)}>
          {Icons.plus} Add
        </button>
      )}
    </div>
  );

  const renderSection = (type, title) => {
    const items = sortedByType[type];
    if (!items?.length) return null;
    const hasFeatured = items.some((item) => isFeatured(type, item));
    const hasPinned = items.some((item) => item.pinned);
    return (
      <div className="id-evidence-section" key={type}>
        <SectionTitle type={type} title={title} count={items.length} featured={hasFeatured} pinned={hasPinned} />
        {type === 'media' ? (
          <Carousel
            items={items}
            itemWidth={300}
            gap={12}
            renderItem={(item) =>
              isAdmin ? (
                <AdminMediaThumb
                  item={item}
                  onClick={() => onMediaClick?.(items, items.indexOf(item))}
                  onEdit={() => onEditItem?.(event.id, 'media', item)}
                  onDelete={() => onDeleteItem?.(event.id, 'media', item.id)}
                  onPin={() => onPinItem?.(event.id, 'media', item.id)}
                  onFeature={() => onFeatureItem?.(event.id, 'media', item.id)}
                  featured={isFeatured('media', item)}
                />
              ) : (
                <MediaThumb item={item} onClick={() => onMediaClick?.(items, items.indexOf(item))} carousel />
              )
            }
          />
        ) : type === 'x_post' ? (
          <XPostCompactList
            posts={items}
            mode={mode}
            onEditItem={(item) => onEditItem?.(event.id, 'x_post', item)}
            onDeleteItem={(itemId) => onDeleteItem?.(event.id, 'x_post', itemId)}
            onPinItem={(itemId) => onPinItem?.(event.id, 'x_post', itemId)}
            onFeatureItem={(itemId) => onFeatureItem?.(event.id, 'x_post', itemId)}
            featuredId={featuredItem?.sourceType === 'x_post' ? featuredItem.itemId : null}
          />
        ) : type === 'news_article' ? (
          <div className="id-editable-list">
            {items.map((item) =>
              isAdmin ? (
                <EditableArticleCard
                  key={item.id}
                  article={item}
                  onEdit={() => onEditItem?.(event.id, 'news_article', item)}
                  onDelete={() => onDeleteItem?.(event.id, 'news_article', item.id)}
                  onPin={() => onPinItem?.(event.id, 'news_article', item.id)}
                  onFeature={() => onFeatureItem?.(event.id, 'news_article', item.id)}
                  featured={isFeatured('news_article', item)}
                />
              ) : (
                <ArticleCard key={item.id} article={item} />
              )
            )}
          </div>
        ) : (
          <div className="id-editable-list">
            {items.map((item) =>
              isAdmin ? (
                <EditableAdminNoteCard
                  key={item.id}
                  note={item}
                  onEdit={() => onEditItem?.(event.id, 'admin_note', item)}
                  onDelete={() => onDeleteItem?.(event.id, 'admin_note', item.id)}
                  onPin={() => onPinItem?.(event.id, 'admin_note', item.id)}
                  onFeature={() => onFeatureItem?.(event.id, 'admin_note', item.id)}
                  featured={isFeatured('admin_note', item)}
                />
              ) : (
                <AdminNoteCard key={item.id} note={item} />
              )
            )}
          </div>
        )}
      </div>
    );
  };

  // Scroll the featured item into view when the drawer/tab changes.
  useEffect(() => {
    if (!featuredItem) return;
    const timer = setTimeout(() => {
      const el = document.querySelector('[data-featured="true"]');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [featuredItem?.sourceType, featuredItem?.itemId, activeTab]);

  return (
    <div>
      {isAdmin && <AddEvidenceBar />}

      {tabs.length > 1 && (
        <div className="id-evidence-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`id-evidence-tab ${activeTab === tab.key ? 'active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {total === 0 ? (
        <div className="id-evidence-empty">No evidence attached to this update.</div>
      ) : (
        <>
          {activeTab === 'all' && categoryOrder.map((type) => counts[type] > 0 && renderSection(type, SOURCE_TYPE_LABELS[type]))}
          {activeTab === 'media' && renderSection('media', SOURCE_TYPE_LABELS.media)}
          {activeTab === 'x_post' && renderSection('x_post', SOURCE_TYPE_LABELS.x_post)}
          {activeTab === 'news_article' && renderSection('news_article', SOURCE_TYPE_LABELS.news_article)}
          {activeTab === 'admin_note' && renderSection('admin_note', SOURCE_TYPE_LABELS.admin_note)}
        </>
      )}
    </div>
  );
}

/* ─── Media components ─── */
export function MediaThumb({ item, onClick, carousel }) {
  return (
    <button className={`id-media-thumb ${carousel ? 'id-media-thumb--carousel' : ''}`} onClick={() => onClick?.(item)}>
      <img src={item.url} alt={item.caption} />
      {item.caption && <div className="id-media-thumb__caption">{item.caption}</div>}
    </button>
  );
}

export function MediaGrid({ items, onItemClick }) {
  if (!items?.length) return null;
  return (
    <div className="id-media-grid">
      {items.map((item) => (
        <MediaThumb key={item.id} item={item} onClick={onItemClick} />
      ))}
    </div>
  );
}

/* ─── Lightbox with keyboard navigation ─── */
export function Lightbox({ items, startIndex = 0, onClose }) {
  const [index, setIndex] = useState(startIndex);
  const current = items[index];

  const goNext = useCallback(() => {
    setIndex((i) => (i + 1) % items.length);
  }, [items.length]);

  const goPrev = useCallback(() => {
    setIndex((i) => (i - 1 + items.length) % items.length);
  }, [items.length]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose, goNext, goPrev]);

  if (!current) return null;

  return (
    <div className="id-lightbox" onClick={onClose}>
      <button className="id-lightbox__close" aria-label="Close">
        ×
      </button>

      {items.length > 1 && (
        <>
          <button
            className="id-lightbox__nav id-lightbox__nav--prev"
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            aria-label="Previous"
          >
            {Icons.chevronLeft}
          </button>
          <button
            className="id-lightbox__nav id-lightbox__nav--next"
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            aria-label="Next"
          >
            {Icons.chevronRight}
          </button>
        </>
      )}

      <div className="id-lightbox__content" onClick={(e) => e.stopPropagation()}>
        <img src={current.url} alt={current.caption} />
        {current.caption && <div className="id-lightbox__caption">{current.caption}</div>}
        {items.length > 1 && (
          <div className="id-lightbox__counter">
            {index + 1} / {items.length}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Twitter / X embed loader ─── */
let twitterScriptPromise = null;
function loadTwitterScript() {
  if (twitterScriptPromise) return twitterScriptPromise;
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.twttr?.widgets) return Promise.resolve(window.twttr);
  twitterScriptPromise = new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://platform.twitter.com/widgets.js';
    script.async = true;
    script.charset = 'utf-8';
    script.onload = () => resolve(window.twttr);
    document.body.appendChild(script);
  });
  return twitterScriptPromise;
}

function getTweetId(url) {
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/').filter(Boolean);
    const idx = parts.indexOf('status');
    if (idx !== -1 && parts[idx + 1]) return parts[idx + 1];
  } catch {
    // ignore
  }
  return null;
}

export function XEmbed({ post }) {
  const ref = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const tweetId = getTweetId(post.tweetUrl);

  if (!tweetId) {
    return <XPostCard post={post} />;
  }

  useEffect(() => {
    let cancelled = false;
    const render = async () => {
      try {
        const twttr = await loadTwitterScript();
        if (!ref.current || cancelled) return;
        await twttr.widgets.load(ref.current);
        if (!cancelled) setLoaded(true);
      } catch {
        // ignore
      }
    };
    render();
    return () => {
      cancelled = true;
    };
  }, [post.tweetUrl]);

  return (
    <div className="id-x-embed">
      <blockquote
        ref={ref}
        className="twitter-tweet"
        data-theme="dark"
        data-conversation="none"
      >
        <a href={post.tweetUrl} target="_blank" rel="noreferrer">
          {post.text}
        </a>
      </blockquote>
      {!loaded && (
        <div className="id-x-embed__loader">
          {SOURCE_TYPE_ICONS.x_post} Loading post…
        </div>
      )}
    </div>
  );
}

/* ─── Archived post screenshot ─── */
function ArchivedPost({ post, onOpen }) {
  if (!post.archiveUrl) return null;
  return (
    <div className="id-x-archive">
      <div className="id-x-archive__badge">Archived</div>
      <button
        type="button"
        className="id-x-archive__img-btn"
        onClick={onOpen}
        aria-label="View archived screenshot"
      >
        <img
          src={post.archiveUrl}
          alt={`Archived post by ${post.author}`}
          className="id-x-archive__img"
          loading="lazy"
        />
      </button>
    </div>
  );
}

/* ─── Archived screenshot lightbox ─── */
function ArchiveLightbox({ post, onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!post) return null;
  return (
    <div className="id-x-lightbox" onClick={onClose}>
      <button
        type="button"
        className="id-x-lightbox__close"
        onClick={onClose}
        aria-label="Close"
      >
        ×
      </button>
      <div className="id-x-lightbox__notice">
        Original tweet unavailable · showing archived screenshot
      </div>
      <div className="id-x-lightbox__content" onClick={(e) => e.stopPropagation()}>
        <img src={post.archiveUrl} alt={`Archived post by ${post.author}`} />
      </div>
    </div>
  );
}

/* ─── Compact X-post list (final Option 2) ─── */
export function XPostCompactList({ posts, pageSize = 5, mode = 'user', onEditItem, onDeleteItem, onPinItem, onFeatureItem, featuredId }) {
  const isAdmin = mode === 'admin' || mode === 'superadmin';
  const sortedPosts = useMemo(() => sortPinned(posts, featuredId), [posts, featuredId]);
  const [openIds, setOpenIds] = useState(new Set());
  const [renderedIds, setRenderedIds] = useState(new Set());
  const [query, setQuery] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [page, setPage] = useState(1);
  const [lightbox, setLightbox] = useState(null);

  const filtered = useMemo(
    () =>
      sortedPosts.filter(
        (p) =>
          p.author.toLowerCase().includes(query.toLowerCase()) ||
          p.handle.toLowerCase().includes(query.toLowerCase()) ||
          p.text.toLowerCase().includes(query.toLowerCase())
      ),
    [sortedPosts, query]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagePosts = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const allPageOpen = pagePosts.length > 0 && pagePosts.every((p) => openIds.has(p.id));

  useEffect(() => {
    setPage(1);
  }, [query]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  // Auto-expand pinned and featured posts so users don't have to click them open.
  useEffect(() => {
    const priorityIds = sortedPosts
      .filter((p) => p.pinned || p.id === featuredId)
      .map((p) => p.id);
    if (!priorityIds.length) return;
    setOpenIds((prev) => new Set([...prev, ...priorityIds]));
    setRenderedIds((prev) => new Set([...prev, ...priorityIds]));
  }, [sortedPosts, featuredId]);

  const openAll = () => {
    const next = new Set(openIds);
    pagePosts.forEach((p) => next.add(p.id));
    setOpenIds(next);
    setRenderedIds((prev) => new Set([...prev, ...pagePosts.map((p) => p.id)]));
  };

  const collapseAll = () => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      pagePosts.forEach((p) => next.delete(p.id));
      return next;
    });
  };

  const toggle = (id) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setRenderedIds((prev) => new Set(prev).add(id));
  };

  const copyLink = async (post) => {
    try {
      await navigator.clipboard.writeText(post.tweetUrl);
      setCopiedId(post.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="id-x-compact">
      <div className="id-x-compact__toolbar">
        <input
          type="text"
          className="id-x-compact__search"
          placeholder="Search posts…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          className="id-x-compact__collapse"
          onClick={openAll}
          disabled={allPageOpen}
        >
          Open all
        </button>
        <button
          className="id-x-compact__collapse"
          onClick={collapseAll}
          disabled={openIds.size === 0}
        >
          Collapse all
        </button>
      </div>

      <div className="id-x-compact__list">
        {pagePosts.map((post) => {
          const isOpen = openIds.has(post.id);
          return (
            <div key={post.id} className={`id-x-compact__item ${isOpen ? 'open' : ''}`} data-featured={featuredId === post.id || undefined}>
              <button className="id-x-compact__summary" onClick={() => toggle(post.id)}>
                <img src={post.authorAvatar} alt={post.author} className="id-x-compact__avatar" loading="lazy" />
                <span className="id-x-compact__main">
                  <span className="id-x-compact__top">
                    <span className="id-x-compact__author-line">
                      <span className="id-x-compact__name">{post.author}</span>
                      <span className="id-x-compact__handle">{post.handle}</span>
                      {featuredId === post.id && <span className="id-x-compact__featured" title="Featured in update card">{Icons.star}</span>}
                      {post.pinned && featuredId !== post.id && <span className="id-x-compact__pinned" title="Pinned to top">{Icons.pin}</span>}
                    </span>
                    <span className="id-x-compact__time">{relativeTime(post.timestamp)}</span>
                    {isAdmin && (
                      <span className="id-x-compact__admin">
                        {onFeatureItem && (
                          <button
                            type="button"
                            className={featuredId === post.id ? 'feature active' : 'feature'}
                            onClick={(e) => {
                              e.stopPropagation();
                              onFeatureItem?.(post.id);
                            }}
                            title={featuredId === post.id ? 'Remove from update card' : 'Feature in update card'}
                          >
                            {Icons.star}
                          </button>
                        )}
                        <button
                          type="button"
                          className={post.pinned ? 'pin active' : 'pin'}
                          onClick={(e) => {
                            e.stopPropagation();
                            onPinItem?.(post.id);
                          }}
                          title={post.pinned ? 'Unpin from top' : 'Pin to top'}
                        >
                          {Icons.pin}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditItem?.(post);
                          }}
                          title="Edit"
                        >
                          {Icons.edit}
                        </button>
                        <button
                          type="button"
                          className="danger"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteItem?.(post.id);
                          }}
                          title="Delete"
                        >
                          {Icons.trash}
                        </button>
                      </span>
                    )}
                    <span className="id-x-compact__chevron">{isOpen ? '▲' : '▼'}</span>
                  </span>
                </span>
              </button>

              {renderedIds.has(post.id) && !post.archived && (
                <div className="id-x-compact__embed" style={{ display: isOpen ? 'block' : 'none' }}>
                  <XEmbed post={post} />
                  {isOpen && (
                    <div className="id-x-compact__actions">
                      <a
                        className="id-x-compact__action"
                        href={post.tweetUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {Icons.external} Open on X
                      </a>
                      <button className="id-x-compact__action" onClick={() => copyLink(post)}>
                        {Icons.link} {copiedId === post.id ? 'Copied!' : 'Copy link'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {isOpen && post.archived && (
                <div className="id-x-compact__embed">
                  <ArchivedPost post={post} onOpen={() => setLightbox(post)} />
                  <div className="id-x-compact__actions">
                    <a
                      className="id-x-compact__action"
                      href={post.tweetUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {Icons.external} Try original
                    </a>
                    <button className="id-x-compact__action" onClick={() => copyLink(post)}>
                      {Icons.link} {copiedId === post.id ? 'Copied!' : 'Copy link'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="id-x-compact__empty">No posts match “{query}”</div>
      ) : (
        totalPages > 1 && (
          <div className="id-x-compact__pagination">
            <button
              className="id-x-compact__collapse"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
            >
              Previous
            </button>
            <span className="id-x-compact__page-info">
              {safePage} / {totalPages}
            </span>
            <button
              className="id-x-compact__collapse"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
            >
              Next
            </button>
          </div>
        )
      )}

      {lightbox && <ArchiveLightbox post={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}

/* ─── Source cards ─── */
export function XPostCard({ post }) {
  return (
    <div className="id-post">
      <div className="id-post__author">
        <img src={post.authorAvatar} alt={post.author} className="id-post__avatar" loading="lazy" />
        <div>
          <div className="id-post__name">{post.author}</div>
          <div className="id-post__handle">
            {post.handle} · {SOURCE_TYPE_ICONS.x_post}
          </div>
        </div>
      </div>
      <div className="id-post__text">{post.text}</div>
      {post.tweetUrl && (
        <a href={post.tweetUrl} target="_blank" rel="noreferrer" className="id-post__link">
          {Icons.link} View post
        </a>
      )}
    </div>
  );
}


export function ArticleCard({ article }) {
  return (
    <a href={article.url} target="_blank" rel="noreferrer" className="id-article">
      <span className="id-article__icon">{Icons.link}</span>
      <div className="id-article__body">
        <div className="id-article__title">{article.title}</div>
        <div className="id-article__pub">{article.publisher}</div>
      </div>
      {Icons.external}
    </a>
  );
}

export function AdminNoteCard({ note }) {
  return (
    <div className="id-note">
      <div className="id-note__label">
        {SOURCE_TYPE_ICONS.admin_note} Admin note · {note.author}
      </div>
      <div className="id-note__text">{note.text}</div>
    </div>
  );
}

/* ─── Superadmin helpers ─── */
export function CopyButton({ text, label = 'Copy', compact = false }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`id-copy-btn ${compact ? 'id-copy-btn--compact' : ''}`}
      title="Copy to clipboard"
    >
      {copied ? 'Copied' : label}
    </button>
  );
}

export function MetaRow({ icon: Icon, label, children }) {
  return (
    <div className="id-meta-row">
      {Icon && <Icon className="id-meta-row__icon" />}
      <div className="id-meta-row__body">
        <span className="id-meta-row__label">{label}</span>
        <div className="id-meta-row__value">{children}</div>
      </div>
    </div>
  );
}

export function StatTile({ value, label }) {
  return (
    <div className="id-stat-tile">
      <div className="id-stat-tile__value">{value}</div>
      <div className="id-stat-tile__label">{label}</div>
    </div>
  );
}

export function parseCoordinates(str) {
  if (!str) return null;
  const [lat, lng] = String(str).split(',').map((s) => parseFloat(s.trim()));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

const STATUS_ACTION_META = {
  incident_created: { label: 'Created', color: '#22c55e', icon: '◎' },
  incident_updated: { label: 'Edited', color: '#38bdf8', icon: '✎' },
  incident_resolved: { label: 'Resolved', color: '#eab308', icon: '✓' },
  incident_deleted: { label: 'Moved to Recycle Bin', color: '#f43f5e', icon: '🗑' },
  incident_restored: { label: 'Restored', color: '#22c55e', icon: '↺' },
  incident_purged: { label: 'Permanently deleted', color: '#6b7280', icon: '✕' },
  verification_changed: { label: 'Verification changed', color: '#f59e0b', icon: '◉' },
  access_changed: { label: 'Access changed', color: '#f472b6', icon: '🔒' },
};

export function StatusHistory({ incident, events, onUserClick }) {
  const [open, setOpen] = useState(false);
  const { logs } = useMemo(() => generateAuditData(incident, events || TIMELINE), [incident, events]);

  const lifecycleLogs = [
    ...(incident.createdAt
      ? [
          {
            id: 'lifecycle-created',
            action: 'incident_created',
            timestamp: incident.createdAt,
            actorId: incident.createdBy,
            actorName: incident.createdByName,
          },
        ]
      : []),
    ...(incident.status === 'resolved' && incident.resolvedAt
      ? [
          {
            id: 'lifecycle-resolved',
            action: 'incident_resolved',
            timestamp: incident.resolvedAt,
            actorId: incident.resolvedBy,
            actorName: findUser(incident.resolvedBy)?.name,
          },
        ]
      : []),
    ...(incident.status === 'deleted' && incident.deletedAt
      ? [
          {
            id: 'lifecycle-deleted',
            action: 'incident_deleted',
            timestamp: incident.deletedAt,
            actorId: incident.deletedBy,
            actorName: incident.deletedByName || findUser(incident.deletedBy)?.name,
          },
        ]
      : []),
    ...(incident.status === 'purged' && incident.purgedAt
      ? [
          {
            id: 'lifecycle-purged',
            action: 'incident_purged',
            timestamp: incident.purgedAt,
            actorId: incident.deletedBy,
            actorName: incident.deletedByName || findUser(incident.deletedBy)?.name,
          },
        ]
      : []),
    ...logs.filter((l) => ['incident_updated', 'verification_changed', 'access_changed'].includes(l.action)),
  ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  if (lifecycleLogs.length === 0) return null;

  return (
    <div className="id-status-history">
      <button type="button" className="id-status-history__header" onClick={() => setOpen((v) => !v)}>
        <span>
          Status History <span className="id-status-history__count">{lifecycleLogs.length}</span>
        </span>
        <span className="id-status-history__chevron">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="id-status-history__list">
          {lifecycleLogs.map((log, idx) => {
            const meta = STATUS_ACTION_META[log.action] || { label: log.action, color: '#94a3b8', icon: '•' };
            const actor = log.actorName || findUser(log.actorId)?.name || log.actorId || 'System';
            return (
              <div key={log.id} className="id-status-history__item">
                <div className="id-status-history__dot" style={{ color: meta.color, background: `${meta.color}1a`, borderColor: meta.color }}>
                  {meta.icon}
                </div>
                <div className="id-status-history__content">
                  <div className="id-status-history__top">
                    <span className="id-status-history__label">{meta.label}</span>
                    <span className="id-status-history__time">{relativeTime(log.timestamp)}</span>
                  </div>
                  <div className="id-status-history__sub">
                    {formatDate(log.timestamp)} · {formatTime(log.timestamp)}
                    {log.actorId && (
                      <>
                        {' · by '}
                        <button type="button" className="id-status-history__actor" onClick={() => onUserClick?.(log.actorId)}>
                          {actor}
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {idx !== lifecycleLogs.length - 1 && <div className="id-status-history__line" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function DebugMetadata({ incident }) {
  const [open, setOpen] = useState(false);
  const coords = parseCoordinates(incident.coordinates);
  return (
    <div className="id-debug-meta">
      <button type="button" className="id-debug-meta__header" onClick={() => setOpen((v) => !v)}>
        <span>Debug Metadata</span>
        <span className="id-debug-meta__chevron">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="id-debug-meta__body">
          <div className="id-debug-meta__grid">
            <div className="id-debug-meta__field">
              <span>Incident ID</span>
              <span>{incident.id}</span>
            </div>
            <div className="id-debug-meta__field">
              <span>Created by</span>
              <span>{incident.createdByName || incident.createdBy || '—'}</span>
            </div>
            <div className="id-debug-meta__field">
              <span>Created at</span>
              <span>{formatDate(incident.createdAt)} · {formatTime(incident.createdAt)}</span>
            </div>
            <div className="id-debug-meta__field">
              <span>Updated at</span>
              <span>{incident.updatedAt ? `${formatDate(incident.updatedAt)} · ${formatTime(incident.updatedAt)}` : '—'}</span>
            </div>
            <div className="id-debug-meta__field">
              <span>Category ID</span>
              <span>{incident.categoryId || '—'}</span>
            </div>
            <div className="id-debug-meta__field">
              <span>Zone category ID</span>
              <span>{incident.zoneCategoryId || '—'}</span>
            </div>
            <div className="id-debug-meta__field">
              <span>Geometry</span>
              <span>{incident.geometryType || 'Point'}</span>
            </div>
            <div className="id-debug-meta__field">
              <span>Verification override</span>
              <span>{incident.verificationOverride || 'none'}</span>
            </div>
          </div>
          <div className="id-debug-meta__raw">
            <div className="id-debug-meta__raw-row">
              <span>Incident ID</span>
              <span>{incident.id}</span>
              <CopyButton text={incident.id} compact />
            </div>
            <div className="id-debug-meta__raw-row">
              <span>Created by ID</span>
              <span>{incident.createdBy || '—'}</span>
              <CopyButton text={incident.createdBy || ''} compact />
            </div>
            {coords && (
              <div className="id-debug-meta__raw-row">
                <span>Coordinates</span>
                <span>{coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}</span>
                <CopyButton text={`${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`} compact />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
