import React, { useCallback, useEffect, useId, useMemo, useState } from 'react';
import {
  Plane,
  Hexagon,
  Anchor,
  Lock,
  AlertTriangle,
  Ship,
  Megaphone,
  Flag,
  Home,
  MapPin,
  Calendar,
  Ruler,
  Share2,
  Bookmark,
  ArrowLeft,
  ExternalLink,
  FileText,
  MessageSquare,
  Newspaper,
  Image as ImageIcon,
  X,
  Star,
  Pencil,
  Trash2,
  ChevronDown,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { format, formatDistanceToNowStrict, intervalToDuration } from 'date-fns';
import { Badge } from '@shared/components/Badge.jsx';
import { SeverityBadge } from '@shared/components/SeverityBadge.jsx';
import {
  buildPolygonSvgProjection,
  formatArea,
  formatLength,
  countVertices,
} from '@shared/utils/zoneGeometry.js';
import EvidenceBundle from '@shared/components/incident-detail/EvidenceBundle.jsx';
import Lightbox from '@shared/components/incident-detail/Lightbox.jsx';
import { countSources, sourceCounts, sortPinned } from '@shared/components/incident-detail/IncidentUtils.js';
import { Icons } from '@shared/components/incident-detail/IncidentIcons.jsx';
import { ArticleCard, AdminNoteCard } from '@shared/components/incident-detail/SourceCards.jsx';
import { XEmbed, ArchivedPost, ArchiveLightbox } from '@shared/components/incident-detail/XPostCompactList.jsx';
import { VERIFICATION_CONFIG } from '@shared/constants.js';

const ICON_MAP = {
  plane: Plane,
  anchor: Anchor,
  lock: Lock,
  'alert-triangle': AlertTriangle,
  ship: Ship,
  megaphone: Megaphone,
  flag: Flag,
  home: Home,
};

export const ALL_SOURCE_TYPES = [
  { key: 'media', label: 'Media', icon: '🖼️' },
  { key: 'x_post', label: 'X Post', icon: '𝕏' },
  { key: 'news_article', label: 'News Article', icon: '📰' },
  { key: 'admin_note', label: 'Admin Note', icon: '📝' },
];

export function detectSourceType(item) {
  if (item.type === 'image' || item.type === 'video' || item.fileType != null) return 'media';
  if (item.tweetUrl !== undefined) return 'x_post';
  if (item.publisher !== undefined) return 'news_article';
  if (item.text !== undefined) return 'admin_note';
  return 'media';
}

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function calculatePolygonAreaKm2(ring) {
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
  return (Math.abs(area) / 2) * 111.32 * 111.32;
}

export function toDatetimeLocal(iso) {
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

export function fromDatetimeLocal(value) {
  if (!value) return null;
  return new Date(value).toISOString();
}

export function ZoneCategoryBadge({ name, color, icon = 'hexagon' }) {
  const Icon = ICON_MAP[icon] || Hexagon;
  return (
    <Badge color={color} style={{ textTransform: 'uppercase' }}>
      <Icon size={12} />
      {name || 'Zone'}
    </Badge>
  );
}

export function VerificationBadge({ status }) {
  const color =
    status === 'verified'
      ? '#22c55e'
      : status === 'disputed'
      ? '#f59e0b'
      : status === 'debunked'
      ? '#ef4444'
      : '#9ca3af';
  const label =
    status === 'verified'
      ? 'Verified'
      : status === 'disputed'
      ? 'Disputed'
      : status === 'debunked'
      ? 'Debunked'
      : 'Unverified';
  return <Badge color={color}>{label}</Badge>;
}

export function StatusBadge({ status }) {
  const color = status === 'active' ? '#22c55e' : '#6b7280';
  return <Badge color={color}>{status}</Badge>;
}

function useNow(interval = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(id);
  }, [interval]);
  return now;
}

export function useZoneTimeState(startDate, endDate) {
  const now = useNow();
  return useMemo(() => {
    const nowDate = new Date(now);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    let state = 'active';
    if (!start || nowDate < start) state = 'upcoming';
    else if (end && nowDate > end) state = 'expired';
    else if (!end) state = 'indefinite';

    let remainingMs = null;
    let relative = '';

    if (state === 'upcoming' && start) {
      relative = `Starts ${formatDistanceToNowStrict(start, { addSuffix: true })}`;
      remainingMs = start.getTime() - nowDate.getTime();
    } else if (state === 'expired' && end) {
      relative = `Expired ${formatDistanceToNowStrict(end, { addSuffix: true })}`;
    } else if (state === 'expired' && start && end) {
      relative = `Lasted ${formatDurationCompact(end.getTime() - start.getTime())}`;
    } else if (state === 'indefinite') {
      relative = 'Active · no scheduled end';
    } else if (end) {
      relative = `Ends ${formatDistanceToNowStrict(end, { addSuffix: true })}`;
      remainingMs = end.getTime() - nowDate.getTime();
    } else {
      relative = 'Ongoing';
    }

    const totalMs = start && end ? end.getTime() - start.getTime() : null;
    const durationMs = totalMs;
    const elapsedMs = start ? Math.max(0, nowDate.getTime() - start.getTime()) : null;
    let elapsedProgress = 0;
    let remainingProgress = 0;

    if (state === 'expired') {
      elapsedProgress = 100;
      remainingProgress = 100;
    } else if (state === 'upcoming') {
      elapsedProgress = 0;
      remainingProgress = 100;
    } else if (state === 'indefinite') {
      elapsedProgress = 100;
      remainingProgress = 100;
    } else if (totalMs && start && end) {
      const elapsed = nowDate.getTime() - start.getTime();
      const remaining = end.getTime() - nowDate.getTime();
      elapsedProgress = Math.min(100, Math.max(0, (elapsed / totalMs) * 100));
      remainingProgress = Math.min(100, Math.max(0, (remaining / totalMs) * 100));
    }

    return { state, start, end, relative, remainingMs, elapsedMs, durationMs, elapsedProgress, remainingProgress };
  }, [startDate, endDate, now]);
}

function formatDurationCompact(ms) {
  if (ms == null || ms <= 0) return null;
  const duration = intervalToDuration({ start: 0, end: ms });
  const parts = [];
  if (duration.days) parts.push(`${duration.days}d`);
  if (duration.hours) parts.push(`${duration.hours}h`);
  if (duration.minutes && parts.length < 2) parts.push(`${duration.minutes}m`);
  if (duration.seconds && parts.length < 2) parts.push(`${duration.seconds}s`);
  return parts.slice(0, 2).join(' ') || '< 1m';
}

export function EffectiveWindowMeter({ startDate, endDate, compact = false }) {
  const { state, start, end, remainingMs, durationMs, remainingProgress } = useZoneTimeState(startDate, endDate);

  const startLabel = start ? format(start, 'MMM d, h:mm a') : '—';
  const endLabel = end ? format(end, 'MMM d, h:mm a') : 'No expiry';

  const color =
    state === 'active' || state === 'indefinite'
      ? '#22c55e'
      : state === 'upcoming'
      ? '#3b82f6'
      : '#6b7280';

  const statusLabel =
    state === 'active' ? 'Active' : state === 'upcoming' ? 'Upcoming' : state === 'expired' ? 'Finished' : 'Indefinite';

  const countdown =
    state === 'upcoming' ? (
      <span>Starts in {formatDurationCompact(remainingMs)}</span>
    ) : state === 'active' && end ? (
      <span>{formatDurationCompact(remainingMs)} remaining</span>
    ) : state === 'indefinite' ? (
      <span>Until further notice</span>
    ) : state === 'expired' ? (
      <span>Lasted {formatDurationCompact(durationMs)}</span>
    ) : (
      <span>{format(start, 'MMM d, h:mm a')}</span>
    );

  return (
    <div className={`zone-meter ${compact ? 'zone-meter--compact' : ''} zone-meter--${state}`}>
      <div className="zone-meter__bar">
        <div className="zone-meter__bar-content">
          <div className="zone-meter__main">
            <span className="zone-meter__status" style={{ color }}>
              <span className="zone-meter__dot" style={{ background: color }} />
              {statusLabel}
            </span>
            <span className="zone-meter__countdown">{countdown}</span>
          </div>
          <div className="zone-meter__track">
            <div className="zone-meter__fill" style={{ width: `${remainingProgress}%`, background: color }} />
          </div>
          <div className="zone-meter__dates">
            <span>{startLabel}</span>
            <span>{endLabel}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ZoneNeonMap({
  geometry,
  color = '#6366f1',
  width = 320,
  height = 180,
  padding = 16,
  gridSize = 32,
  glowStd = 4,
  strokeWidth = 1.5,
  className,
  preserveAspectRatio = 'xMidYMid meet',
  showGrid = true,
  showCentroid = true,
  animated = false,
  ringCount = 3,
  pulseDuration = 6,
}) {
  const uid = useId().replace(/:/g, '');
  const ring = Array.isArray(geometry?.coordinates?.[0]) ? geometry.coordinates[0] : null;
  const projection = useMemo(
    () => (ring ? buildPolygonSvgProjection(ring, width, height, padding) : null),
    [ring, width, height, padding]
  );

  if (!projection) return null;

  const pathId = `zone-neon-path-${uid}`;
  const gradId = `zone-neon-grad-${uid}`;
  const glowId = `zone-neon-glow-${uid}`;
  const gridId = `zone-neon-grid-${uid}`;
  const cx = projection.width / 2;
  const cy = projection.height / 2;
  const r = Math.max(projection.width, projection.height) / 2;
  const [centroidX, centroidY] = projection.centroid;
  const totalDuration = ringCount * pulseDuration;

  return (
    <svg
      className={`${className || ''} ${animated ? 'zone-neon-map--animated' : ''}`.trim()}
      viewBox={projection.viewBox}
      preserveAspectRatio={preserveAspectRatio}
    >
      <defs>
        {animated && <path id={pathId} d={projection.path} />}
        <radialGradient
          id={gradId}
          cx={animated ? '50%' : cx}
          cy={animated ? '50%' : cy}
          r={animated ? '50%' : r}
          gradientUnits={animated ? 'objectBoundingBox' : 'userSpaceOnUse'}
        >
          {animated ? (
            <>
              <stop offset="0%" stopColor={color} stopOpacity="0" />
              <stop offset="35%" stopColor={color} stopOpacity="0.02" />
              <stop offset="60%" stopColor={color} stopOpacity="0.06" />
              <stop offset="85%" stopColor={color} stopOpacity="0.10" />
              <stop offset="100%" stopColor={color} stopOpacity="0.14" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor={color} stopOpacity="0.03" />
              <stop offset="55%" stopColor={color} stopOpacity="0.06" />
              <stop offset="85%" stopColor={color} stopOpacity="0.14" />
              <stop offset="100%" stopColor={color} stopOpacity="0.22" />
            </>
          )}
        </radialGradient>
        <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={animated ? 2.5 : glowStd} result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {showGrid && (
          <pattern id={gridId} width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
            <path
              d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
              fill="none"
              stroke="rgba(255,255,255,0.04)"
              strokeWidth={1}
            />
          </pattern>
        )}
      </defs>

      {showGrid && <rect width="100%" height="100%" fill={`url(#${gridId})`} />}

      {animated ? (
        <>
          <use href={`#${pathId}`} fill={`url(#${gradId})`} stroke="none" />
          <use
            href={`#${pathId}`}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
            filter={`url(#${glowId})`}
            className="zone-mini-map__base"
          />
          {Array.from({ length: ringCount }, (_, i) => (
            <use
              key={i}
              href={`#${pathId}`}
              fill="none"
              stroke={color}
              strokeWidth={2}
              strokeLinejoin="round"
              filter={`url(#${glowId})`}
              className="zone-mini-map__ring"
              style={{
                '--pulse-delay': `${i * pulseDuration}s`,
                '--pulse-duration': `${totalDuration}s`,
                transformOrigin: `${centroidX}px ${centroidY}px`,
              }}
            />
          ))}
        </>
      ) : (
        <path
          d={projection.path}
          fill={`url(#${gradId})`}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
          filter={`url(#${glowId})`}
          className="zone-mini-map__path"
        />
      )}

      {showCentroid && !animated && (
        <circle
          cx={centroidX}
          cy={centroidY}
          r={Math.max(3, strokeWidth * 2)}
          fill={color}
          stroke="#fff"
          strokeWidth={1.5}
          className="zone-mini-map__centroid"
        />
      )}
    </svg>
  );
}

export function PolygonMiniMap({ geometry, color = '#6366f1', title, large = false, animated = false }) {
  return (
    <div className={`zone-mini-map ${large ? 'zone-mini-map--large' : ''} ${animated ? 'zone-mini-map--animated' : ''}`}>
      <ZoneNeonMap
        geometry={geometry}
        color={color}
        width={large ? 720 : 586}
        height={large ? 420 : 200}
        padding={22}
        gridSize={large ? 48 : 32}
        glowStd={large ? 5 : 4}
        strokeWidth={1.5}
        className="zone-mini-map__svg"
        showGrid={!animated}
        showCentroid={!animated}
        animated={animated}
        ringCount={3}
        pulseDuration={6}
      />
      {title && <div className="zone-mini-map__title">{title}</div>}
    </div>
  );
}

export function ZoneStatGrid({ areaSqM, perimeterM, geometry, radiusM, geometryType = 'polygon' }) {
  const ring = Array.isArray(geometry?.coordinates?.[0]) ? geometry.coordinates[0] : null;
  const vertices = useMemo(() => countVertices(ring), [ring]);
  const isCircle = geometryType === 'circle' || radiusM != null;
  return (
    <div className="zone-stats-grid">
      <div className="zone-stat">
        <div className="zone-stat__value">{formatArea(areaSqM)}</div>
        <div className="zone-stat__label">Area</div>
      </div>
      <div className="zone-stat">
        <div className="zone-stat__value">{formatLength(perimeterM)}</div>
        <div className="zone-stat__label">{isCircle ? 'Circumference' : 'Perimeter'}</div>
      </div>
      <div className="zone-stat">
        <div className="zone-stat__value">{isCircle ? formatLength(radiusM) : vertices}</div>
        <div className="zone-stat__label">{isCircle ? 'Radius' : 'Vertices'}</div>
      </div>
    </div>
  );
}

export function ZoneActions({ onFullDetails, onShare, onSave, isSaved }) {
  return (
    <div className="zone-actions">
      <button className="zone-btn zone-btn--primary" onClick={onFullDetails}>
        Full details
        <ExternalLink size={13} />
      </button>
      <button className="zone-btn" onClick={onShare}>
        <Share2 size={13} />
        Share
      </button>
      <button className={`zone-btn zone-btn--save ${isSaved ? 'saved' : ''}`} onClick={onSave}>
        <Bookmark size={13} />
        {isSaved ? 'Saved' : 'Save'}
      </button>
    </div>
  );
}

/* ───────────────── Featured items hook ───────────────── */

export function useZoneFeaturedItems(timeline = []) {
  const [featuredItems, setFeaturedItems] = useState(() => {
    const map = {};
    for (const ev of timeline) {
      if (ev.featuredItem) {
        map[ev.id] = {
          sourceType: ev.featuredItem.sourceType,
          sourceId: ev.featuredItem.sourceId || ev.featuredItem.itemId,
        };
      }
    }
    return map;
  });

  useEffect(() => {
    const map = {};
    for (const ev of timeline) {
      if (ev.featuredItem) {
        map[ev.id] = {
          sourceType: ev.featuredItem.sourceType,
          sourceId: ev.featuredItem.sourceId || ev.featuredItem.itemId,
        };
      }
    }
    setFeaturedItems(map);
  }, [timeline]);

  const feature = useCallback((eventId, { sourceType, sourceId }) => {
    setFeaturedItems((prev) => {
      const current = prev[eventId];
      if (current && current.sourceType === sourceType && current.sourceId === sourceId) {
        const next = { ...prev };
        delete next[eventId];
        return next;
      }
      return { ...prev, [eventId]: { sourceType, sourceId } };
    });
  }, []);

  return { featuredItems, feature };
}

/* ───────────────── Timeline event ───────────────── */

export function findFeaturedItem(sources, featuredItem) {
  if (!featuredItem) return null;
  const list = sources?.[featuredItem.sourceType];
  const item = list?.find((x) => x.id === (featuredItem.sourceId || featuredItem.itemId));
  return item ? { sourceType: featuredItem.sourceType, item } : null;
}

function ZoneSourceCountChips({ sources, counts: countsProp }) {
  const counts = countsProp || sourceCounts(sources);
  const types = [
    { key: 'x_post', icon: '𝕏', label: 'Posts' },
    { key: 'news_article', icon: '📰', label: 'Articles' },
    { key: 'admin_note', icon: '📝', label: 'Notes' },
    { key: 'media', icon: '📷', label: 'Media' },
  ];
  if (types.every((t) => !counts[t.key])) return null;
  return (
    <div className="id-source-chips">
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

function ZoneFeaturedItemContent({ sourceType, item, onMediaClick, onArchivedOpen }) {
  if (sourceType === 'media') {
    return (
      <button type="button" className="id-featured-media" onClick={() => onMediaClick?.([item], 0)}>
        <img src={item.url} alt={item.caption} loading="lazy" />
        {item.caption && <div className="id-featured-media__caption">{item.caption}</div>}
      </button>
    );
  }
  if (sourceType === 'x_post') {
    if (item.archived) {
      return (
        <div className="id-featured-embed">
          <ArchivedPost post={item} onOpen={() => onArchivedOpen?.(item)} />
        </div>
      );
    }
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

function ZoneTwitterMediaGrid({ sources, onMediaClick, onOpenDrawer }) {
  const counts = sourceCounts(sources);
  const allMedia = sources?.media || [];
  const totalMedia = allMedia.length;

  if (totalMedia === 0) {
    return (
      <div className="id-evidence-count-row">
        <ZoneSourceCountChips counts={counts} />
        <button
          type="button"
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
    );
  }

  const sortedMedia = sortPinned(allMedia);
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
            {idx === 3 && hasMore && <span className="id-twitter-grid__overlay">+{totalMedia - 4}</span>}
          </button>
        ))}
      </div>
      <div className="id-evidence-count-row">
        <ZoneSourceCountChips counts={counts} />
        <button
          type="button"
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

function ZoneFeaturedSection({ event, featuredItem, onMediaClick, onFeature, isAdmin, onOpenDrawer }) {
  const featured = findFeaturedItem(event.sources, featuredItem);
  const [archivedLightbox, setArchivedLightbox] = useState(null);
  if (!featured) return null;
  return (
    <>
      <div className="id-featured-block">
        <div className="id-featured-block__header">
          <span className="id-featured-block__label">{Icons.star} Featured</span>
          {isAdmin && (
            <div className="id-featured-block__actions">
              <button
                type="button"
                className="id-featured-block__change"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenDrawer?.(event);
                }}
              >
                Change
              </button>
              <button
                type="button"
                className="id-featured-block__remove"
                onClick={(e) => {
                  e.stopPropagation();
                  onFeature?.(event.id, { sourceType: featured.sourceType, sourceId: featured.item.id });
                }}
              >
                Remove
              </button>
            </div>
          )}
        </div>
        <div className="id-featured-block__body">
          <ZoneFeaturedItemContent
            sourceType={featured.sourceType}
            item={featured.item}
            onMediaClick={onMediaClick}
            onArchivedOpen={setArchivedLightbox}
          />
        </div>
      </div>
      <div className="id-featured-meta">
        <ZoneSourceCountChips sources={event.sources} />
        <button
          type="button"
          className="id-btn-ghost"
          onClick={(e) => {
            e.stopPropagation();
            onOpenDrawer?.(event);
          }}
        >
          Inspect {Icons.chevronRight}
        </button>
      </div>
      {archivedLightbox && (
        <ArchiveLightbox post={archivedLightbox} onClose={() => setArchivedLightbox(null)} portal />
      )}
    </>
  );
}

export function TimelineEvent({
  event,
  isLast,
  onOpenEvidence,
  featuredItem,
  isAdmin = false,
  variant = 'sidebar',
  isActive = false,
  onEditUpdate,
  onDeleteUpdate,
  onVerificationChange,
  onFeature,
}) {
  const total = countSources(event.sources);
  const featured = useMemo(
    () => findFeaturedItem(event.sources, featuredItem),
    [event.sources, featuredItem]
  );
  const hasEvidence = total > 0;
  const [lightbox, setLightbox] = useState(null);
  const [editUpdate, setEditUpdate] = useState(false);
  const isRail = variant === 'rail';

  const handleDelete = (e) => {
    e.stopPropagation();
    if (window.confirm('Delete this update? This cannot be undone.')) {
      onDeleteUpdate?.(event.id);
    }
  };

  const handleSaveUpdate = (form) => {
    onEditUpdate?.(event.id, form);
    setEditUpdate(false);
  };

  return (
    <div className="zone-timeline-event">
      <div className="zone-timeline-event__line">
        <div className={`zone-timeline-event__dot ${isActive ? 'zone-timeline-event__dot--active' : ''}`} />
        {!isLast && <div className="zone-timeline-event__stem" />}
      </div>
      <div
        className={`zone-timeline-event__content ${hasEvidence || isRail ? 'zone-timeline-event--clickable' : ''} ${
          isActive ? 'zone-timeline-event--active' : ''
        } ${isRail ? 'zone-timeline-event--rail' : ''}`}
        onClick={() => onOpenEvidence?.(event)}
      >
        {isAdmin && (
          <div className="zone-timeline-event__top">
            <div className="zone-timeline-event__meta">
              <span className="zone-timeline-event__type">
                {event.type === 'report' || event.type === 'initial' ? 'Initial report' : 'Update'}
              </span>
              <span className="zone-timeline-event__date">
                <Calendar size={12} />
                {format(new Date(event.updateDate), 'MMM d, h:mm a')}
              </span>
            </div>
            <div className="zone-timeline-event__actions">
              <VerificationBadge status={event.verificationStatus || 'unverified'} />
              <div className="zone-timeline-event__select-wrap">
                <select
                  className="zone-timeline-event__select"
                  value={event.verificationStatus || 'unverified'}
                  onChange={(e) => {
                    e.stopPropagation();
                    onVerificationChange?.(event.id, e.target.value);
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <option value="unverified">Unverified</option>
                  <option value="verified">Verified</option>
                  <option value="disputed">Disputed</option>
                  <option value="debunked">Debunked</option>
                </select>
                <ChevronDown size={12} className="zone-timeline-event__select-icon" />
              </div>
              <button
                type="button"
                className="zone-timeline-event__btn"
                title="Edit"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditUpdate(true);
                }}
              >
                <Pencil size={13} />
              </button>
              <button
                type="button"
                className="zone-timeline-event__btn zone-timeline-event__btn--danger"
                title="Delete"
                onClick={handleDelete}
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        )}

        {!isAdmin && (
          <div className="zone-timeline-event__date">
            <Calendar size={12} />
            {format(new Date(event.updateDate), 'MMM d, h:mm a')}
          </div>
        )}

        <h3 className="zone-timeline-event__title">{event.summary}</h3>
        <p className="zone-timeline-event__text">{event.details}</p>

        {!isRail && featured && (
          <ZoneFeaturedSection
            event={event}
            featuredItem={featuredItem}
            onMediaClick={(items, idx) => setLightbox({ items, idx })}
            onFeature={onFeature}
            isAdmin={isAdmin}
            onOpenDrawer={onOpenEvidence}
          />
        )}
        {!isRail && !featured && hasEvidence && (
          <ZoneTwitterMediaGrid
            sources={event.sources}
            onMediaClick={(items, idx) => setLightbox({ items, idx })}
            onOpenDrawer={() => onOpenEvidence?.(event)}
          />
        )}

        {isRail && hasEvidence && (
          <div className="zone-timeline-event__footer">
            <span className="zone-timeline-event__count">{total} evidence items →</span>
          </div>
        )}
      </div>
      {lightbox && <Lightbox items={lightbox.items} startIndex={lightbox.idx} onClose={() => setLightbox(null)} />}
      {editUpdate && (
        <UpdateFormModal update={event} onClose={() => setEditUpdate(false)} onSave={handleSaveUpdate} />
      )}
    </div>
  );
}

export function ZoneEvidenceRail({
  event,
  featuredItem,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  onPin,
  onFeature,
  onDelete,
  onAdd,
  onEdit,
  onCheck,
  onEditUpdate,
  onDeleteUpdate,
}) {
  const total = countSources(event.sources);
  const featured = findFeaturedItem(event.sources, featuredItem);
  const [lightbox, setLightbox] = useState(null);

  return (
    <>
      <div className="zone-evidence-rail__card">
        <div className="zone-evidence-rail__header">
          <div>
            <h3 className="zone-evidence-rail__title">{event.summary || 'Update'}</h3>
            <div className="zone-evidence-rail__meta">
              {format(new Date(event.updateDate), 'MMM d, h:mm a')} · {total} evidence items
            </div>
          </div>
          <VerificationBadge status={event.verificationStatus || 'unverified'} />
        </div>

        {featured && (
          <div className="id-featured-block" style={{ marginBottom: 16 }}>
            <div className="id-featured-block__header">
              <span className="id-featured-block__label">{Icons.star} Featured</span>
              <button
                type="button"
                className="id-featured-block__remove"
                onClick={() => onFeature?.(event.id, { sourceType: featured.sourceType, sourceId: featured.item.id })}
              >
                Remove
              </button>
            </div>
            <div className="id-featured-block__body">
              <ZoneFeaturedItemContent
                sourceType={featured.sourceType}
                item={featured.item}
                onMediaClick={(items, idx) => setLightbox({ items, idx })}
              />
            </div>
          </div>
        )}

        <ZoneEvidenceView
          event={event}
          featuredItem={featuredItem}
          onPin={onPin}
          onFeature={onFeature}
          onDelete={onDelete}
          onAdd={onAdd}
          onEdit={onEdit}
          onCheck={onCheck}
          onEditUpdate={onEditUpdate}
          onDeleteUpdate={onDeleteUpdate}
          mediaLayout="grid-carousel"
          autoScrollFeatured={false}
          showUpdateHeader={false}
        />

        <div className="zone-evidence-rail__nav">
          <button type="button" className="zone-evidence-rail__nav-btn" onClick={onPrev} disabled={!hasPrev}>
            ← Prev
          </button>
          <button type="button" className="zone-evidence-rail__nav-btn" onClick={onNext} disabled={!hasNext}>
            Next →
          </button>
        </div>
      </div>
      {lightbox && <Lightbox items={lightbox.items} startIndex={lightbox.idx} onClose={() => setLightbox(null)} />}
    </>
  );
}

/* ───────────────── Evidence source modal (add / edit) ───────────────── */

export function ZoneSourceModal({ type, item, onClose, onSave }) {
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
    setFileItems((prev) => prev.map((it, i) => (i === idx ? { ...it, caption } : it)));
  };

  const handleSave = () => {
    if (type === 'media' && !isEdit && mediaMode === 'file') {
      const newItems = fileItems.map((it) => ({
        type: 'image',
        url: it.dataUrl,
        caption: it.caption,
        name: it.name,
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
            <ZoneCreateField label="Image URL">
              <input
                className="zone-create-input"
                type="text"
                value={form.url || ''}
                onChange={(e) => patch('url', e.target.value)}
                placeholder="https://..."
              />
            </ZoneCreateField>
            <ZoneCreateField label="Caption">
              <input
                className="zone-create-input"
                type="text"
                value={form.caption || ''}
                onChange={(e) => patch('caption', e.target.value)}
              />
            </ZoneCreateField>
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
                  {fileItems.map((it, idx) => (
                    <div key={idx} className="zone-create-file-card">
                      <img src={it.dataUrl} alt={it.name} />
                      <div className="zone-create-file-card__body">
                        <label className="zone-create-file-card__label">✎ Caption</label>
                        <input
                          type="text"
                          value={it.caption}
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
      <ZoneCreateField label="Tweet URL">
        <input
          className="zone-create-input"
          type="text"
          value={form.tweetUrl || ''}
          onChange={(e) => patch('tweetUrl', e.target.value)}
          placeholder="https://x.com/..."
        />
      </ZoneCreateField>
    ),
    news_article: (
      <>
        <ZoneCreateField label="Title">
          <input
            className="zone-create-input"
            type="text"
            value={form.title || ''}
            onChange={(e) => patch('title', e.target.value)}
          />
        </ZoneCreateField>
        <ZoneCreateField label="Publisher">
          <input
            className="zone-create-input"
            type="text"
            value={form.publisher || ''}
            onChange={(e) => patch('publisher', e.target.value)}
          />
        </ZoneCreateField>
        <ZoneCreateField label="URL">
          <input
            className="zone-create-input"
            type="text"
            value={form.url || ''}
            onChange={(e) => patch('url', e.target.value)}
            placeholder="https://..."
          />
        </ZoneCreateField>
      </>
    ),
    admin_note: (
      <ZoneCreateField label="Note">
        <textarea
          className="zone-create-input zone-create-input--textarea"
          value={form.text || ''}
          onChange={(e) => patch('text', e.target.value)}
        />
      </ZoneCreateField>
    ),
  };

  const label = ALL_SOURCE_TYPES.find((t) => t.key === type)?.label || 'Source';
  const canSubmit = type !== 'media' || isEdit || mediaMode === 'url' || fileItems.length > 0;

  const modal = (
    <div className="zone-modal-overlay" onClick={onClose}>
      <div className="zone-modal" onClick={(e) => e.stopPropagation()}>
        <div className="zone-modal__header">
          <h3 className="zone-modal__title">{isEdit ? 'Edit' : 'Add'} {label}</h3>
          <button type="button" className="zone-modal__close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="zone-modal__body">{fields[type]}</div>
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

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : modal;
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

/* ───────────────── Update form modal ───────────────── */

export function UpdateFormModal({ update, onClose, onSave }) {
  const isEdit = !!update;
  const [summary, setSummary] = useState(update?.summary || '');
  const [details, setDetails] = useState(update?.details || '');
  const [timestamp, setTimestamp] = useState(
    toDatetimeLocal(update?.updateDate || new Date().toISOString())
  );
  const [type, setType] = useState(update?.type || 'update');
  const [verification, setVerification] = useState(update?.verificationStatus || 'unverified');

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSave = () => {
    onSave({
      summary: summary.trim(),
      details: details.trim(),
      timestamp: fromDatetimeLocal(timestamp) || new Date().toISOString(),
      type,
      verification,
    });
  };

  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  const modal = (
    <div className="zone-modal-overlay" onClick={onClose}>
      <div className="zone-modal" onClick={(e) => e.stopPropagation()}>
        <div className="zone-modal__header">
          <h3 className="zone-modal__title">{isEdit ? 'Edit update' : 'Add update'}</h3>
          <button type="button" className="zone-modal__close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="zone-modal__body">
          <ZoneCreateField label="Summary">
            <input
              className="zone-create-input"
              type="text"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Short update headline"
            />
          </ZoneCreateField>
          <ZoneCreateField label="Details">
            <textarea
              className="zone-create-input zone-create-input--textarea"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Update details..."
            />
          </ZoneCreateField>
          <div className="zone-create-row">
            <ZoneCreateField label="Timestamp">
              <input
                className="zone-create-input"
                type="datetime-local"
                value={timestamp}
                onChange={(e) => setTimestamp(e.target.value)}
              />
            </ZoneCreateField>
            <ZoneCreateField label="Type">
              <select className="zone-create-input" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="update">Update</option>
                <option value="report">Report</option>
              </select>
            </ZoneCreateField>
          </div>
          <ZoneCreateField label="Verification">
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
          </ZoneCreateField>
        </div>
        <div className="zone-modal__footer">
          <button type="button" className="zone-create-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="zone-create-btn zone-create-btn--primary"
            onClick={handleSave}
            disabled={!summary.trim()}
          >
            {isEdit ? 'Save changes' : 'Add update'}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : modal;
}

/* ───────────────── Evidence view / drawer / modal ───────────────── */

function ZoneEvidenceView({
  event,
  featuredItem,
  onClose,
  onPin,
  onFeature,
  onDelete,
  onAdd,
  onEdit,
  onCheck,
  onEditUpdate,
  onDeleteUpdate,
  wideCarousel,
  mediaLayout,
  autoScrollFeatured = true,
  showUpdateHeader = true,
}) {
  const [activeTab, setActiveTab] = useState('all');
  const [lightbox, setLightbox] = useState(null);
  const [sourceModal, setSourceModal] = useState(null);
  const [updateModal, setUpdateModal] = useState(false);

  const handleAdd = (eventId, sourceType) => {
    setSourceModal({ eventId, sourceType });
  };

  const handleEdit = (eventId, sourceType, item) => {
    setSourceModal({ eventId, sourceType, item });
  };

  const handleSaveSource = (itemOrItems) => {
    if (!sourceModal) return;
    const { eventId, sourceType, item } = sourceModal;
    if (item) {
      onEdit?.(eventId, sourceType, Array.isArray(itemOrItems) ? itemOrItems[0] : itemOrItems);
    } else {
      onAdd?.(eventId, sourceType, itemOrItems);
    }
    setSourceModal(null);
  };

  const handleSaveUpdate = (form) => {
    onEditUpdate?.(event.id, form);
    setUpdateModal(false);
  };

  const handleDeleteUpdate = () => {
    if (window.confirm('Delete this update? This cannot be undone.')) {
      onDeleteUpdate?.(event.id);
      onClose?.();
    }
  };

  return (
    <>
      <div className="zone-evidence-view">
        {showUpdateHeader && (
          <div className="zone-update-header">
            <div className="zone-update-header__meta">
              <span className="zone-update-header__date">
                {format(new Date(event.updateDate), 'MMM d, h:mm a')}
              </span>
              <h4 className="zone-update-header__title">{event.summary || 'Update'}</h4>
            </div>
            {(onEditUpdate || onDeleteUpdate) && (
              <div className="zone-update-header__actions">
                {onEditUpdate && (
                  <button type="button" className="zone-btn zone-btn--small" onClick={() => setUpdateModal(true)}>
                    Edit update
                  </button>
                )}
                {onDeleteUpdate && (
                  <button
                    type="button"
                    className="zone-btn zone-btn--small zone-btn--danger"
                    onClick={handleDeleteUpdate}
                  >
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        )}
        <EvidenceBundle
          event={event}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onMediaClick={(items, idx) => setLightbox({ items, idx })}
          mode="admin"
          onAddEvidence={handleAdd}
          onEditEvidence={handleEdit}
          onDeleteEvidence={onDelete}
          onPinEvidence={onPin}
          onFeatureEvidence={onFeature}
          onAutoCheck={onCheck}
          featuredItem={featuredItem}
          mediaItemWidth={wideCarousel ? null : 300}
          mediaLayout={mediaLayout}
          autoScrollFeatured={autoScrollFeatured}
        />
      </div>
      {lightbox && <Lightbox items={lightbox.items} startIndex={lightbox.idx} onClose={() => setLightbox(null)} />}
      {sourceModal && (
        <ZoneSourceModal
          type={sourceModal.sourceType}
          item={sourceModal.item}
          onClose={() => setSourceModal(null)}
          onSave={handleSaveSource}
        />
      )}
      {updateModal && (
        <UpdateFormModal update={event} onClose={() => setUpdateModal(false)} onSave={handleSaveUpdate} />
      )}
    </>
  );
}

export function ZoneEvidenceDrawer({
  event,
  featuredItem,
  onClose,
  onEditUpdate,
  onDeleteUpdate,
  ...actions
}) {
  const handleClose = () => onClose?.();
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div className="zone-drawer-overlay" onClick={onClose}>
      <div className="zone-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="zone-drawer__header">
          <h3 className="zone-drawer__title">Update & evidence</h3>
          <button className="zone-drawer__close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="zone-drawer__body">
          <ZoneEvidenceView
            event={event}
            featuredItem={featuredItem}
            onClose={handleClose}
            onEditUpdate={onEditUpdate}
            onDeleteUpdate={onDeleteUpdate}
            wideCarousel
            {...actions}
          />
        </div>
      </div>
    </div>
  );
}

export function ZoneEvidenceModal({
  event,
  featuredItem,
  onClose,
  onEditUpdate,
  onDeleteUpdate,
  ...actions
}) {
  const handleClose = () => onClose?.();
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div className="zone-modal-overlay" onClick={onClose}>
      <div className="zone-modal zone-modal--evidence" onClick={(e) => e.stopPropagation()}>
        <div className="zone-modal__header">
          <h3 className="zone-modal__title">Update & evidence</h3>
          <button className="zone-modal__close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="zone-modal__body">
          <ZoneEvidenceView
            event={event}
            featuredItem={featuredItem}
            onClose={handleClose}
            onEditUpdate={onEditUpdate}
            onDeleteUpdate={onDeleteUpdate}
            wideCarousel
            {...actions}
          />
        </div>
      </div>
    </div>
  );
}

/* ───────────────── Shared small helpers for create sidebar ───────────────── */

export function ZoneCreateField({ label, children, hint }) {
  return (
    <div className="zone-create-field">
      <label className="zone-create-field__label">{label}</label>
      {children}
      {hint && <p className="zone-create-field__hint">{hint}</p>}
    </div>
  );
}

export function ZoneCreateSection({ title, children }) {
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

export function ZoneSourceListItem({ item, onEdit, onDelete }) {
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

export { ArrowLeft, MapPin, Calendar, Ruler };
export { countVertices, formatArea, formatLength };
