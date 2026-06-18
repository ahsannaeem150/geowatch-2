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
} from 'lucide-react';
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
import { countSources, sourceCounts } from '@shared/components/incident-detail/IncidentUtils.js';

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

function defaultAvatar(name) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'X')}&background=random&color=fff&size=64`;
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
    } else if (state === 'indefinite') {
      relative = 'Active · no scheduled end';
    } else if (end) {
      relative = `Ends ${formatDistanceToNowStrict(end, { addSuffix: true })}`;
      remainingMs = end.getTime() - nowDate.getTime();
    } else {
      relative = 'Ongoing';
    }

    const totalMs = start && end ? end.getTime() - start.getTime() : null;
    const elapsedMs = start ? Math.max(0, nowDate.getTime() - start.getTime()) : null;
    let elapsedProgress = 0;
    let remainingProgress = 0;

    if (state === 'expired') {
      elapsedProgress = 100;
      remainingProgress = 0;
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

    return { state, start, end, relative, remainingMs, elapsedMs, elapsedProgress, remainingProgress };
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
  const { state, start, end, relative, remainingMs, remainingProgress } = useZoneTimeState(startDate, endDate);

  const startLabel = start ? format(start, 'MMM d, h:mm a') : '—';
  const endLabel = end ? format(end, 'MMM d, h:mm a') : 'No expiry';

  const color =
    state === 'active' || state === 'indefinite'
      ? '#22c55e'
      : state === 'upcoming'
      ? '#3b82f6'
      : '#6b7280';

  const statusLabel =
    state === 'active' ? 'Active' : state === 'upcoming' ? 'Upcoming' : state === 'expired' ? 'Expired' : 'Indefinite';

  const countdown =
    state === 'upcoming' ? (
      <span>Starts in {formatDurationCompact(remainingMs)}</span>
    ) : state === 'active' && end ? (
      <span>{formatDurationCompact(remainingMs)} remaining</span>
    ) : state === 'indefinite' ? (
      <span>Until further notice</span>
    ) : state === 'expired' ? (
      <span>Ended</span>
    ) : (
      <span>{relative}</span>
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
            <div
              className="zone-meter__fill"
              style={{ width: `${remainingProgress}%`, background: color }}
            />
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
  const ring = geometry?.coordinates?.[0];
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
  const vertices = useMemo(() => countVertices(geometry?.coordinates?.[0]), [geometry]);
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

/* ───────────────── Evidence helpers ───────────────── */

export function toEvidenceSources(sourcesArray = []) {
  const out = { media: [], x_post: [], news_article: [], admin_note: [] };
  for (const s of sourcesArray) {
    const base = { id: s.id || `${s.type}-${Math.random().toString(36).slice(2, 10)}`, pinned: !!s.pinned };
    switch (s.type) {
      case 'media':
        out.media.push({
          ...base,
          type: 'image',
          url: s.url || s.thumbnailUrl || '/uploads/test-static.webp',
          caption: s.caption || '',
        });
        break;
      case 'x_post':
        out.x_post.push({
          ...base,
          tweetUrl: s.tweetUrl || 'https://x.com/jack/status/20',
          text: s.text || '',
          author: s.author || 'Unknown',
          handle: s.handle || '',
          authorAvatar: s.avatarUrl || defaultAvatar(s.author),
          timestamp: s.timestamp || new Date().toISOString(),
          archived: !!s.archived,
          archiveUrl: s.archiveUrl,
        });
        break;
      case 'official':
      case 'news_article':
        out.news_article.push({
          ...base,
          title: s.title || '',
          publisher: s.publisher || '',
          url: s.url || '#',
        });
        break;
      case 'admin_note':
        out.admin_note.push({
          ...base,
          author: s.author || 'Admin',
          text: s.text || '',
        });
        break;
      default:
        break;
    }
  }
  return out;
}

export function buildEvidenceEvent(event) {
  return { ...event, sources: toEvidenceSources(event.sources) };
}

function createEvidenceItem(type, fields) {
  const id = `${type}-${Math.random().toString(36).slice(2, 10)}`;
  switch (type) {
    case 'media':
      return { id, type: 'image', url: fields.url, caption: fields.caption || '', pinned: false };
    case 'x_post':
      return {
        id,
        tweetUrl: fields.tweetUrl || 'https://x.com/jack/status/20',
        text: fields.text || '',
        author: fields.author || 'Unknown',
        handle: fields.handle || '',
        authorAvatar: defaultAvatar(fields.author),
        timestamp: new Date().toISOString(),
        pinned: false,
      };
    case 'news_article':
      return {
        id,
        title: fields.title || '',
        publisher: fields.publisher || '',
        url: fields.url || '#',
        pinned: false,
      };
    case 'admin_note':
      return { id, author: fields.author || 'Admin', text: fields.text || '', pinned: false };
    default:
      return null;
  }
}

export function useZoneTrialEvents(initialEvents = []) {
  const [events, setEvents] = useState(() => initialEvents.map(buildEvidenceEvent));
  const [featuredItems, setFeaturedItems] = useState({});

  useEffect(() => {
    setEvents(initialEvents.map(buildEvidenceEvent));
    setFeaturedItems({});
  }, [initialEvents]);

  const updateEventSources = useCallback((eventId, updater) => {
    setEvents((prev) =>
      prev.map((ev) => (ev.id === eventId ? { ...ev, sources: updater(ev.sources) } : ev))
    );
  }, []);

  const reset = useCallback((next = []) => {
    setEvents(next.map(buildEvidenceEvent));
    setFeaturedItems({});
  }, []);

  const pin = useCallback(
    (eventId, sourceType, itemId, pinned) => {
      updateEventSources(eventId, (sources) => ({
        ...sources,
        [sourceType]: sources[sourceType].map((item) =>
          item.id === itemId ? { ...item, pinned } : item
        ),
      }));
    },
    [updateEventSources]
  );

  const feature = useCallback((eventId, { sourceType, sourceId }) => {
    setFeaturedItems((prev) => {
      const current = prev[eventId];
      if (
        current &&
        current.sourceType === sourceType &&
        (current.sourceId === sourceId || current.itemId === sourceId)
      ) {
        const next = { ...prev };
        delete next[eventId];
        return next;
      }
      return { ...prev, [eventId]: { sourceType, sourceId } };
    });
  }, []);

  const deleteItem = useCallback(
    (eventId, sourceType, itemId) => {
      updateEventSources(eventId, (sources) => ({
        ...sources,
        [sourceType]: sources[sourceType].filter((item) => item.id !== itemId),
      }));
      setFeaturedItems((prev) => {
        const current = prev[eventId];
        if (
          current &&
          current.sourceType === sourceType &&
          (current.sourceId === itemId || current.itemId === itemId)
        ) {
          const next = { ...prev };
          delete next[eventId];
          return next;
        }
        return prev;
      });
    },
    [updateEventSources]
  );

  const add = useCallback(
    (eventId, sourceType) => {
      let fields = {};
      if (sourceType === 'media') {
        const url = window.prompt('Media URL:', 'https://images.unsplash.com/photo-1500320821405-8fc1732209ca?w=800');
        if (!url) return;
        const caption = window.prompt('Caption:') || '';
        fields = { url, caption };
      } else if (sourceType === 'x_post') {
        const tweetUrl = window.prompt('Tweet URL:', 'https://x.com/jack/status/20');
        if (!tweetUrl) return;
        const text = window.prompt('Post text:') || '';
        const author = window.prompt('Author name:') || 'Unknown';
        const handle = window.prompt('Handle (e.g. @account):') || '';
        fields = { tweetUrl, text, author, handle };
      } else if (sourceType === 'news_article') {
        const title = window.prompt('Article title:');
        if (!title) return;
        const publisher = window.prompt('Publisher:') || '';
        const url = window.prompt('Article URL:') || '#';
        fields = { title, publisher, url };
      } else if (sourceType === 'admin_note') {
        const author = window.prompt('Author:') || 'Admin';
        const text = window.prompt('Note text:');
        if (!text) return;
        fields = { author, text };
      }
      const item = createEvidenceItem(sourceType, fields);
      if (!item) return;
      updateEventSources(eventId, (sources) => ({
        ...sources,
        [sourceType]: [...sources[sourceType], item],
      }));
    },
    [updateEventSources]
  );

  const edit = useCallback(
    (eventId, sourceType, item) => {
      let next = { ...item };
      if (sourceType === 'media') {
        const url = window.prompt('Media URL:', item.url);
        if (url === null) return;
        const caption = window.prompt('Caption:', item.caption || '') || '';
        next = { ...item, url, caption };
      } else if (sourceType === 'x_post') {
        const tweetUrl = window.prompt('Tweet URL:', item.tweetUrl);
        if (tweetUrl === null) return;
        const text = window.prompt('Post text:', item.text) || '';
        const author = window.prompt('Author name:', item.author) || 'Unknown';
        const handle = window.prompt('Handle:', item.handle) || '';
        next = { ...item, tweetUrl, text, author, handle };
      } else if (sourceType === 'news_article') {
        const title = window.prompt('Article title:', item.title);
        if (title === null) return;
        const publisher = window.prompt('Publisher:', item.publisher) || '';
        const url = window.prompt('Article URL:', item.url) || '#';
        next = { ...item, title, publisher, url };
      } else if (sourceType === 'admin_note') {
        const author = window.prompt('Author:', item.author) || 'Admin';
        const text = window.prompt('Note text:', item.text);
        if (text === null) return;
        next = { ...item, author, text };
      }
      updateEventSources(eventId, (sources) => ({
        ...sources,
        [sourceType]: sources[sourceType].map((x) => (x.id === item.id ? next : x)),
      }));
    },
    [updateEventSources]
  );

  return { events, featuredItems, reset, pin, feature, deleteItem, add, edit };
}

export function findFeaturedItem(sources, featuredItem) {
  if (!featuredItem) return null;
  const list = sources?.[featuredItem.sourceType];
  const item = list?.find((x) => x.id === (featuredItem.sourceId || featuredItem.itemId));
  return item ? { sourceType: featuredItem.sourceType, item } : null;
}

function EvidenceTypeChips({ sources }) {
  const counts = sourceCounts(sources);
  const chips = [];
  if (counts.media)
    chips.push(
      <span key="media" className="zone-evidence-chip">
        <ImageIcon size={10} /> {counts.media} media
      </span>
    );
  if (counts.x_post)
    chips.push(
      <span key="x_post" className="zone-evidence-chip">
        <MessageSquare size={10} /> {counts.x_post} posts
      </span>
    );
  if (counts.news_article)
    chips.push(
      <span key="news_article" className="zone-evidence-chip">
        <Newspaper size={10} /> {counts.news_article} articles
      </span>
    );
  if (counts.admin_note)
    chips.push(
      <span key="admin_note" className="zone-evidence-chip">
        <FileText size={10} /> {counts.admin_note} notes
      </span>
    );
  return <div className="zone-evidence-chips">{chips}</div>;
}

function FeaturedPreview({ sourceType, item }) {
  if (!item) return null;
  if (sourceType === 'media') {
    return (
      <div className="zone-featured-preview zone-featured-preview--media">
        <span className="zone-featured-preview__badge">
          <Star size={10} /> Featured
        </span>
        <img src={item.url} alt={item.caption} loading="lazy" />
        {item.caption && <span className="zone-featured-preview__caption">{item.caption}</span>}
      </div>
    );
  }
  let body = null;
  if (sourceType === 'x_post') body = item.text;
  if (sourceType === 'news_article') body = item.title;
  if (sourceType === 'admin_note') body = item.text;
  if (!body) return null;
  return (
    <div className="zone-featured-preview">
      <span className="zone-featured-preview__badge">
        <Star size={10} /> Featured
      </span>
      <p className="zone-featured-preview__text">{body}</p>
    </div>
  );
}

export function TimelineEvent({ event, isLast, onOpenEvidence, featuredItem }) {
  const total = countSources(event.sources);
  const featured = useMemo(
    () => findFeaturedItem(event.sources, featuredItem),
    [event.sources, featuredItem]
  );
  const hasEvidence = total > 0;

  return (
    <div className="zone-timeline-event">
      <div className="zone-timeline-event__line">
        <div className="zone-timeline-event__dot" />
        {!isLast && <div className="zone-timeline-event__stem" />}
      </div>
      <div
        className={`zone-timeline-event__content ${hasEvidence ? 'zone-timeline-event--clickable' : ''}`}
        onClick={hasEvidence ? () => onOpenEvidence?.(event) : undefined}
      >
        <div className="zone-timeline-event__date">
          <Calendar size={12} />
          {format(new Date(event.updateDate), 'MMM d, h:mm a')}
        </div>
        <h3 className="zone-timeline-event__title">{event.summary}</h3>
        <p className="zone-timeline-event__text">{event.details}</p>
        {featured && <FeaturedPreview sourceType={featured.sourceType} item={featured.item} />}
        {hasEvidence && (
          <div className="zone-timeline-event__footer">
            <EvidenceTypeChips sources={event.sources} />
            <button
              className="zone-evidence__toggle"
              onClick={(e) => {
                e.stopPropagation();
                onOpenEvidence?.(event);
              }}
            >
              Inspect evidence
              <span className="zone-evidence__count">{total}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────────────── Evidence drawer / modal ───────────────── */

function ZoneEvidenceView({ event, featuredItem, onPin, onFeature, onDelete, onAdd, onEdit }) {
  const [activeTab, setActiveTab] = useState('all');
  const [lightbox, setLightbox] = useState(null);

  return (
    <>
      <div className="zone-evidence-view">
        <EvidenceBundle
          event={event}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onMediaClick={(items, idx) => setLightbox({ items, idx })}
          mode="admin"
          onAddEvidence={onAdd}
          onEditEvidence={onEdit}
          onDeleteEvidence={onDelete}
          onPinEvidence={onPin}
          onFeatureEvidence={onFeature}
          featuredItem={featuredItem}
        />
      </div>
      {lightbox && (
        <Lightbox items={lightbox.items} startIndex={lightbox.idx} onClose={() => setLightbox(null)} />
      )}
    </>
  );
}

export function ZoneEvidenceDrawer({ event, featuredItem, onClose, ...actions }) {
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
          <h3 className="zone-drawer__title">Evidence & sources</h3>
          <button className="zone-drawer__close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="zone-drawer__body">
          <ZoneEvidenceView event={event} featuredItem={featuredItem} {...actions} />
        </div>
      </div>
    </div>
  );
}

export function ZoneEvidenceModal({ event, featuredItem, onClose, ...actions }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div className="zone-modal-overlay" onClick={onClose}>
      <div className="zone-modal" onClick={(e) => e.stopPropagation()}>
        <div className="zone-modal__header">
          <h3 className="zone-modal__title">Sources & evidence</h3>
          <button className="zone-modal__close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="zone-modal__body">
          <ZoneEvidenceView event={event} featuredItem={featuredItem} {...actions} />
        </div>
      </div>
    </div>
  );
}

export { ArrowLeft, MapPin, Calendar, Ruler };
