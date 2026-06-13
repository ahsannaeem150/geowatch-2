import React, { useState, useMemo } from 'react';
import { format, formatDistanceToNow } from 'date-fns';

/* ─────────────────────────────────────────────────────────────────────────────
   SIDEBAR TRIAL — Proposed unified incident-detail sidebar for admin + user.
   Route: /sidebarTrial
   ───────────────────────────────────────────────────────────────────────────── */

/* ─── Dummy media ─── */
const MEDIA = {
  pilots: [
    { id: 'p1', url: 'https://picsum.photos/seed/pilot1/400/300', caption: 'Fit Lt Shubham Kumar', type: 'image' },
    { id: 'p2', url: 'https://picsum.photos/seed/pilot2/400/300', caption: 'Agr Danish Alam', type: 'image' },
    { id: 'p3', url: 'https://picsum.photos/seed/pilot3/400/300', caption: 'Sqn Ldr Prashant Singh', type: 'image' },
    { id: 'p4', url: 'https://picsum.photos/seed/pilot4/400/300', caption: 'Sgt Jitendra Sharma', type: 'image' },
  ],
  crashSite: [
    { id: 'c1', url: 'https://picsum.photos/seed/crash1/600/340', caption: 'Wreckage near runway', type: 'image' },
    { id: 'c2', url: 'https://picsum.photos/seed/crash2/600/340', caption: 'Rescue vehicles on scene', type: 'image' },
  ],
  casualties: [
    { id: 'ca1', url: 'https://picsum.photos/seed/casualty1/500/320', caption: 'Official statement board', type: 'image' },
  ],
  rescue: [
    { id: 'r1', url: 'https://picsum.photos/seed/rescue1/500/320', caption: 'Rescue team at site', type: 'image' },
  ],
  video: [
    { id: 'v1', url: 'https://picsum.photos/seed/video1/600/340', caption: 'Amateur footage of crash site', type: 'video' },
  ],
};

/* ─── Dummy incident ─── */
const INCIDENT = {
  id: 'inc-001',
  title: 'IAF AN-32 crashes in Assam, India',
  domain: 'Transport & Aviation',
  category: 'Aviation Accident',
  severity: 3,
  status: 'active',
  verification: 'verified',
  startDate: '2026-06-13T12:03:00Z',
  endDate: null,
  createdAt: '2026-06-13T21:01:00Z',
  location: 'Air Force Station Jorhat, Assam, India',
  coordinates: '26.3342, 93.2428',
  description:
    'An Indian Air Force (IAF) An-32 transport aircraft reportedly crashed during landing at Air Force Station (AFS) Jorhat in Assam. The aircraft was carrying 13 personnel. Rescue operations were launched immediately amid poor weather conditions.',
};

/* ─── Dummy unified timeline (story spine) ─── */
const INITIAL_TIMELINE = [
  {
    id: 'e1',
    type: 'update',
    timestamp: '2026-06-13T21:02:00Z',
    summary: 'IAF confirms 5 casualties in the incident.',
    details:
      'An official statement from the Indian Air Force confirmed that five personnel have been confirmed dead and the remaining are being treated at the station medical facility.',
    media: MEDIA.casualties,
  },
  {
    id: 'e2',
    type: 'source',
    sourceType: 'x_post',
    timestamp: '2026-06-13T19:45:00Z',
    author: '@airforce_in',
    authorAvatar: 'https://picsum.photos/seed/iaf/120/120',
    summary: 'Official IAF X post confirming the crash and rescue efforts.',
    text: 'An AN-32 aircraft of the IAF crashed during landing at AFS Jorhat today. Rescue ops are underway. Further details awaited.',
    url: 'https://x.com/airforce_in/status/1234567890',
    verification: 'verified',
    media: MEDIA.pilots,
  },
  {
    id: 'e3',
    type: 'source',
    sourceType: 'news_article',
    timestamp: '2026-06-13T18:20:00Z',
    publisher: 'The Hindu',
    title: 'IAF AN-32 aircraft crashes in Assam, rescue operations on',
    summary: 'Local news report from the first hour after the crash.',
    url: 'https://www.thehindu.com/news/national/iaf-an-32-crashes-assam',
    verification: 'unverified',
  },
  {
    id: 'e4',
    type: 'media_drop',
    timestamp: '2026-06-13T17:10:00Z',
    summary: 'Amateur video and photos from the crash site emerge.',
    details: 'Footage shared by local residents shows the wreckage near the runway and emergency vehicles responding.',
    media: [...MEDIA.crashSite, ...MEDIA.video],
  },
  {
    id: 'e5',
    type: 'update',
    timestamp: '2026-06-13T15:30:00Z',
    summary: 'Rescue teams reach the crash site amid poor weather.',
    details:
      'Specialized rescue teams from the station and civil administration reached the site. Operations were hampered by rain and low visibility.',
    media: MEDIA.rescue,
  },
  {
    id: 'e6',
    type: 'status_change',
    timestamp: '2026-06-13T15:00:00Z',
    from: 'unverified',
    to: 'verified',
    reason: 'Official confirmation received from IAF spokesperson.',
  },
];

/* ─── Shared helpers ─── */

const SEVERITY_LABELS = {
  1: { label: 'Minor', color: '#4ade80' },
  2: { label: 'Low', color: '#fbbf24' },
  3: { label: 'Moderate', color: '#fb923c' },
  4: { label: 'High', color: '#f87171' },
  5: { label: 'Critical', color: '#dc2626' },
};

const VERIFICATION = {
  verified: { label: 'Verified', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  unverified: { label: 'Unverified', color: '#9ca3af', bg: 'rgba(156,163,175,0.12)' },
  disputed: { label: 'Disputed', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  debunked: { label: 'Debunked', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
};

function formatDate(iso) {
  if (!iso) return '—';
  return format(new Date(iso), 'MMM d, yyyy');
}

function formatTime(iso) {
  if (!iso) return '';
  return format(new Date(iso), 'h:mm a');
}

function relativeTime(iso) {
  if (!iso) return '';
  return formatDistanceToNow(new Date(iso), { addSuffix: true });
}

function className(...list) {
  return list.filter(Boolean).join(' ');
}

/* ─── Inline SVG icons ─── */
const Icons = {
  chevronDown: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  chevronUp: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 15 12 9 18 15" />
    </svg>
  ),
  link: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  ),
  image: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  ),
  video: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3" />
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
  check: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  x: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  sort: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <polyline points="19 12 12 19 5 12" />
    </svg>
  ),
};

/* ─── Small shared UI primitives ─── */

function Badge({ children, color = '#9ca3af', bg = 'rgba(156,163,175,0.12)' }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 8px',
        borderRadius: 'var(--radius-pill)',
        background: bg,
        color,
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.03em',
      }}
    >
      {children}
    </span>
  );
}

function SectionTitle({ children, count, action }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--text-muted)',
        }}
      >
        {children}
        {typeof count === 'number' && (
          <span
            style={{
              padding: '2px 6px',
              borderRadius: 'var(--radius-pill)',
              background: 'var(--bg-elevated)',
              color: 'var(--text-secondary)',
              fontSize: 10,
            }}
          >
            {count}
          </span>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

function Button({ children, onClick, variant = 'default', icon, small }) {
  const variants = {
    default: {
      bg: 'var(--bg-elevated)',
      color: 'var(--text-secondary)',
      border: '1px solid var(--border-subtle)',
    },
    primary: {
      bg: 'linear-gradient(135deg, var(--accent-light), var(--accent))',
      color: '#fff',
      border: 'none',
    },
    ghost: {
      bg: 'transparent',
      color: 'var(--text-muted)',
      border: '1px solid transparent',
    },
    danger: {
      bg: 'var(--alert-error-bg)',
      color: 'var(--danger-light)',
      border: '1px solid var(--alert-error-border)',
    },
  };
  const v = variants[variant];
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: small ? '5px 10px' : '8px 14px',
        borderRadius: 'var(--radius-md)',
        background: v.bg,
        color: v.color,
        border: v.border,
        fontSize: small ? 11 : 12,
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily: 'var(--font-sans)',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
    >
      {icon && <span style={{ display: 'inline-flex' }}>{icon}</span>}
      {children}
    </button>
  );
}

/* ─── Media grid / lightbox ─── */

function MediaThumb({ item, onClick }) {
  return (
    <button
      onClick={() => onClick?.(item)}
      style={{
        position: 'relative',
        border: 'none',
        padding: 0,
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        cursor: 'pointer',
        background: 'var(--bg-elevated)',
        aspectRatio: '4 / 3',
      }}
    >
      <img
        src={item.url}
        alt={item.caption}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
      {item.type === 'video' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.4)',
          }}
        >
          <div style={{ color: '#fff' }}>{Icons.video}</div>
        </div>
      )}
      {item.caption && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '6px 8px',
            background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
            color: '#fff',
            fontSize: 10,
            fontWeight: 600,
            textAlign: 'left',
          }}
        >
          {item.caption}
        </div>
      )}
    </button>
  );
}

function MediaGrid({ items, onItemClick }) {
  if (!items?.length) return null;
  const count = items.length;
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: count === 1 ? '1fr' : 'repeat(2, 1fr)',
        gap: 8,
        marginTop: 10,
      }}
    >
      {items.map((item) => (
        <MediaThumb key={item.id} item={item} onClick={onItemClick} />
      ))}
    </div>
  );
}

function Lightbox({ item, onClose }) {
  if (!item) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(0,0,0,0.92)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
        <img
          src={item.url}
          alt={item.caption}
          style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: 'var(--radius-lg)' }}
        />
        <div style={{ color: '#fff', marginTop: 10, fontSize: 13, textAlign: 'center' }}>{item.caption}</div>
      </div>
    </div>
  );
}

/* ─── Source preview card ─── */

function SourcePreview({ event }) {
  if (event.sourceType === 'x_post') {
    return (
      <div
        style={{
          marginTop: 10,
          padding: 12,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <img
            src={event.authorAvatar}
            alt={event.author}
            style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }}
          />
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{event.author}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>X (Twitter)</div>
          </div>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{event.text}</div>
      </div>
    );
  }

  if (event.sourceType === 'news_article') {
    return (
      <a
        href={event.url}
        target="_blank"
        rel="noreferrer"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginTop: 10,
          padding: 12,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--text-secondary)',
          textDecoration: 'none',
        }}
      >
        <span style={{ color: 'var(--text-muted)' }}>{Icons.link}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{event.title}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{event.publisher}</div>
        </div>
      </a>
    );
  }

  return null;
}

/* ─── Timeline event types ─── */

function TimelineIcon({ event }) {
  const size = 28;
  const base = {
    width: size,
    height: size,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  };
  if (event.type === 'update') {
    return (
      <div style={{ ...base, background: 'rgba(59,130,246,0.15)', color: '#60a5fa' }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>U</span>
      </div>
    );
  }
  if (event.type === 'source') {
    return (
      <div style={{ ...base, background: 'rgba(139,92,246,0.15)', color: '#a78bfa' }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>S</span>
      </div>
    );
  }
  if (event.type === 'media_drop') {
    return (
      <div style={{ ...base, background: 'rgba(245,158,11,0.15)', color: '#fbbf24' }}>
        {Icons.image}
      </div>
    );
  }
  return (
    <div style={{ ...base, background: 'rgba(34,197,94,0.15)', color: '#4ade80' }}>
      <span style={{ fontSize: 13, fontWeight: 700 }}>✓</span>
    </div>
  );
}

function EventTypeLabel({ event }) {
  const labels = {
    update: 'Update',
    source: 'Source',
    media_drop: 'Media',
    status_change: 'Status',
  };
  const colors = {
    update: '#60a5fa',
    source: '#a78bfa',
    media_drop: '#fbbf24',
    status_change: '#4ade80',
  };
  return (
    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: colors[event.type] }}>
      {labels[event.type]}
    </span>
  );
}

function VerificationToggle({ status, onChange, readOnly }) {
  const options = ['verified', 'unverified', 'disputed', 'debunked'];
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {options.map((opt) => {
        const active = status === opt;
        const cfg = VERIFICATION[opt];
        return (
          <button
            key={opt}
            disabled={readOnly}
            onClick={() => onChange?.(opt)}
            style={{
              padding: '3px 8px',
              borderRadius: 'var(--radius-pill)',
              border: 'none',
              background: active ? cfg.bg : 'transparent',
              color: active ? cfg.color : 'var(--text-muted)',
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              cursor: readOnly ? 'default' : 'pointer',
            }}
          >
            {active && <span style={{ marginRight: 3 }}>{Icons.check}</span>}
            {cfg.label}
          </button>
        );
      })}
    </div>
  );
}

/* ─── Admin timeline event card ─── */

function AdminTimelineEvent({ event, expanded, onToggle, onVerificationChange, onEdit, onDelete }) {
  const ver = VERIFICATION[event.verification || 'unverified'];
  const hasMedia = event.media && event.media.length > 0;

  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        padding: '14px 0',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <TimelineIcon event={event} />

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <EventTypeLabel event={event} />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {formatDate(event.timestamp)} · {formatTime(event.timestamp)}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>({relativeTime(event.timestamp)})</span>
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text-primary)',
                lineHeight: 1.4,
              }}
            >
              {event.summary}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            {event.type === 'source' && <Badge color={ver.color} bg={ver.bg}>{ver.label}</Badge>}
            <button
              onClick={onToggle}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 24,
                height: 24,
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: 'transparent',
                color: 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              {expanded ? Icons.chevronUp : Icons.chevronDown}
            </button>
          </div>
        </div>

        {/* Collapsed preview */}
        {!expanded && (
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
            {event.type === 'source' && event.sourceType === 'x_post' && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>@{event.author}</span>
            )}
            {hasMedia && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                {Icons.image} {event.media.length} media
              </span>
            )}
          </div>
        )}

        {/* Expanded body */}
        {expanded && (
          <div style={{ marginTop: 10 }}>
            {event.details && (
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 10 }}>
                {event.details}
              </div>
            )}

            {event.type === 'source' && (
              <>
                <SourcePreview event={event} />
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
                    Verification
                  </div>
                  <VerificationToggle status={event.verification || 'unverified'} onChange={onVerificationChange} />
                </div>
              </>
            )}

            {event.type === 'status_change' && (
              <div
                style={{
                  marginTop: 10,
                  padding: 10,
                  background: 'var(--bg-elevated)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                }}
              >
                Changed from <strong>{event.from}</strong> to <strong>{event.to}</strong>
                {event.reason && <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-muted)' }}>Reason: {event.reason}</div>}
              </div>
            )}

            {hasMedia && <MediaGrid items={event.media} />}

            {/* Admin actions */}
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <Button small variant="ghost" icon={Icons.edit} onClick={onEdit}>
                Edit
              </Button>
              <Button small variant="danger" icon={Icons.trash} onClick={onDelete}>
                Delete
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── User timeline event card ─── */

function UserTimelineEvent({ event, expanded, onToggle, onMediaClick }) {
  const ver = VERIFICATION[event.verification || 'unverified'];
  const hasMedia = event.media && event.media.length > 0;

  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        padding: '12px 0',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <TimelineIcon event={event} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2, flexWrap: 'wrap' }}>
          <EventTypeLabel event={event} />
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{relativeTime(event.timestamp)}</span>
          {event.type === 'source' && <Badge color={ver.color} bg={ver.bg}>{ver.label}</Badge>}
        </div>

        <div
          onClick={onToggle}
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text-primary)',
            lineHeight: 1.4,
            cursor: 'pointer',
          }}
        >
          {event.summary}
        </div>

        {expanded && (
          <div style={{ marginTop: 8 }}>
            {event.details && (
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 8 }}>
                {event.details}
              </div>
            )}
            {event.type === 'source' && <SourcePreview event={event} />}
            {hasMedia && <MediaGrid items={event.media} onItemClick={onMediaClick} />}
          </div>
        )}

        {(event.details || hasMedia || event.type === 'source') && (
          <button
            onClick={onToggle}
            style={{
              marginTop: 6,
              padding: 0,
              border: 'none',
              background: 'transparent',
              color: 'var(--text-muted)',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {expanded ? 'Show less' : 'Show more'}
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Latest update hero (user sidebar) ─── */

function LatestUpdateHero({ event, onMediaClick }) {
  if (!event) return null;
  return (
    <div
      style={{
        padding: 16,
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        marginBottom: 20,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <Badge color="#fff" bg="var(--accent-light)">Latest</Badge>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{relativeTime(event.timestamp)}</span>
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.35, marginBottom: 8 }}>
        {event.summary}
      </div>
      {event.details && (
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 10 }}>
          {event.details}
        </div>
      )}
      {event.media?.length > 0 && <MediaGrid items={event.media} onItemClick={onMediaClick} />}
    </div>
  );
}

/* ─── Modals (mock) ─── */

function Modal({ title, children, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'var(--backdrop)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 440,
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</div>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
            {Icons.x}
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function AddSourceModal({ onClose, onAdd }) {
  const [sourceType, setSourceType] = useState('x_post');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');

  const handleSubmit = () => {
    onAdd({
      type: 'source',
      sourceType,
      timestamp: new Date().toISOString(),
      summary: sourceType === 'x_post' ? 'New X post added' : 'New article added',
      text,
      url,
      author: '@source',
      authorAvatar: 'https://picsum.photos/seed/newsource/120/120',
      verification: 'unverified',
      media: [],
    });
    onClose();
  };

  return (
    <Modal title="Add source" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Source type</label>
          <select
            value={sourceType}
            onChange={(e) => setSourceType(e.target.value)}
            style={{
              width: '100%',
              marginTop: 6,
              padding: '8px 10px',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-sans)',
            }}
          >
            <option value="x_post">X post</option>
            <option value="news_article">News article</option>
            <option value="admin_note">Admin note</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Text / note</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            style={{
              width: '100%',
              marginTop: 6,
              padding: '8px 10px',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-sans)',
              resize: 'vertical',
            }}
          />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>URL</label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            style={{
              width: '100%',
              marginTop: 6,
              padding: '8px 10px',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-sans)',
            }}
          />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Attach media</label>
          <div
            style={{
              marginTop: 6,
              padding: '16px',
              border: '1px dashed var(--border-hover)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-muted)',
              fontSize: 12,
              textAlign: 'center',
            }}
          >
            Click or drag files to upload
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit}>Add source</Button>
        </div>
      </div>
    </Modal>
  );
}

function AddUpdateModal({ onClose, onAdd }) {
  const [summary, setSummary] = useState('');
  const [details, setDetails] = useState('');

  const handleSubmit = () => {
    onAdd({
      type: 'update',
      timestamp: new Date().toISOString(),
      summary,
      details,
      media: [],
    });
    onClose();
  };

  return (
    <Modal title="Add update" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Summary</label>
          <input
            type="text"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            style={{
              width: '100%',
              marginTop: 6,
              padding: '8px 10px',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-sans)',
            }}
          />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Details</label>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={3}
            style={{
              width: '100%',
              marginTop: 6,
              padding: '8px 10px',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-sans)',
              resize: 'vertical',
            }}
          />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Attach media</label>
          <div
            style={{
              marginTop: 6,
              padding: '16px',
              border: '1px dashed var(--border-hover)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-muted)',
              fontSize: 12,
              textAlign: 'center',
            }}
          >
            Click or drag files to upload
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit}>Add update</Button>
        </div>
      </div>
    </Modal>
  );
}

/* ─── Admin sidebar ─── */

function AdminSidebar({ timeline, setTimeline }) {
  const [expanded, setExpanded] = useState({ e1: true });
  const [sortOrder, setSortOrder] = useState('desc');
  const [lightboxItem, setLightboxItem] = useState(null);
  const [addSourceOpen, setAddSourceOpen] = useState(false);
  const [addUpdateOpen, setAddUpdateOpen] = useState(false);

  const sortedTimeline = useMemo(() => {
    const copy = [...timeline];
    copy.sort((a, b) =>
      sortOrder === 'desc'
        ? new Date(b.timestamp) - new Date(a.timestamp)
        : new Date(a.timestamp) - new Date(b.timestamp)
    );
    return copy;
  }, [timeline, sortOrder]);

  const toggle = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleVerificationChange = (id, newStatus) => {
    setTimeline((prev) =>
      prev.map((ev) => (ev.id === id ? { ...ev, verification: newStatus } : ev))
    );
  };

  const handleAddEvent = (event) => {
    const newEvent = { ...event, id: `new-${Date.now()}` };
    setTimeline((prev) => [newEvent, ...prev]);
  };

  const handleEdit = (event) => alert(`Edit event: ${event.summary}`);
  const handleDelete = (event) => {
    if (confirm(`Delete "${event.summary}"?`)) {
      setTimeline((prev) => prev.filter((e) => e.id !== event.id));
    }
  };

  return (
    <div
      style={{
        width: 460,
        minWidth: 460,
        height: '100vh',
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 28px' }}>
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            <Badge color="#a78bfa" bg="rgba(139,92,246,0.12)">{INCIDENT.domain}</Badge>
            <Badge color="#9ca3af" bg="rgba(156,163,175,0.12)">{INCIDENT.category}</Badge>
            <Badge color={VERIFICATION[INCIDENT.verification].color} bg={VERIFICATION[INCIDENT.verification].bg}>
              {VERIFICATION[INCIDENT.verification].label}
            </Badge>
            <Badge color="#4ade80" bg="rgba(34,197,94,0.12)">{INCIDENT.status}</Badge>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px', lineHeight: 1.25 }}>
            {INCIDENT.title}
          </h1>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{INCIDENT.coordinates}</div>
        </div>

        {/* Meta grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 10,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              padding: 12,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
              Severity
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: SEVERITY_LABELS[INCIDENT.severity].color,
                }}
              >
                {INCIDENT.severity}
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: SEVERITY_LABELS[INCIDENT.severity].color }}>
                {SEVERITY_LABELS[INCIDENT.severity].label}
              </span>
            </div>
          </div>

          <div
            style={{
              padding: 12,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
              Start
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{formatDate(INCIDENT.startDate)}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatTime(INCIDENT.startDate)}</div>
          </div>

          <div
            style={{
              padding: 12,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
              End
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{INCIDENT.endDate ? formatDate(INCIDENT.endDate) : 'Ongoing'}</div>
          </div>

          <div
            style={{
              padding: 12,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
              Created
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{formatDate(INCIDENT.createdAt)}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatTime(INCIDENT.createdAt)}</div>
          </div>
        </div>

        {/* Description */}
        <div
          style={{
            padding: 14,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 24,
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
            Description
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{INCIDENT.description}</div>
        </div>

        {/* Timeline header */}
        <SectionTitle
          count={timeline.length}
          action={
            <button
              onClick={() => setSortOrder((o) => (o === 'desc' ? 'asc' : 'desc'))}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 8px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                background: 'transparent',
                color: 'var(--text-muted)',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {Icons.sort} {sortOrder === 'desc' ? 'Latest first' : 'Oldest first'}
            </button>
          }
        >
          Story / Timeline
        </SectionTitle>

        {/* Add buttons */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <Button variant="primary" icon={Icons.plus} onClick={() => setAddSourceOpen(true)}>
            Add source
          </Button>
          <Button variant="default" icon={Icons.plus} onClick={() => setAddUpdateOpen(true)}>
            Add update
          </Button>
          <Button variant="default" icon={Icons.image}>
            Add media
          </Button>
        </div>

        {/* Timeline */}
        <div>
          {sortedTimeline.map((event) => (
            <AdminTimelineEvent
              key={event.id}
              event={event}
              expanded={!!expanded[event.id]}
              onToggle={() => toggle(event.id)}
              onVerificationChange={(status) => handleVerificationChange(event.id, status)}
              onEdit={() => handleEdit(event)}
              onDelete={() => handleDelete(event)}
            />
          ))}
        </div>
      </div>

      {/* Bottom actions */}
      <div
        style={{
          padding: '14px 20px',
          borderTop: '1px solid var(--border-subtle)',
          background: 'var(--bg-surface)',
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <Button variant="primary">Resolve</Button>
        <Button variant="default">Edit incident</Button>
        <Button variant="danger">Delete</Button>
        <Button variant="ghost">Close</Button>
      </div>

      {addSourceOpen && (
        <AddSourceModal onClose={() => setAddSourceOpen(false)} onAdd={handleAddEvent} />
      )}
      {addUpdateOpen && (
        <AddUpdateModal onClose={() => setAddUpdateOpen(false)} onAdd={handleAddEvent} />
      )}
      <Lightbox item={lightboxItem} onClose={() => setLightboxItem(null)} />
    </div>
  );
}

/* ─── User sidebar ─── */

function UserSidebar({ timeline }) {
  const [expanded, setExpanded] = useState({});
  const [lightboxItem, setLightboxItem] = useState(null);

  const sortedTimeline = useMemo(() => {
    return [...timeline].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [timeline]);

  const latestUpdate = sortedTimeline.find((e) => e.type === 'update') || sortedTimeline[0];

  const toggle = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div
      style={{
        width: 420,
        minWidth: 420,
        height: '100vh',
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 28px' }}>
        {/* Header */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            <Badge color="#a78bfa" bg="rgba(139,92,246,0.12)">{INCIDENT.domain}</Badge>
            <Badge color={VERIFICATION[INCIDENT.verification].color} bg={VERIFICATION[INCIDENT.verification].bg}>
              {VERIFICATION[INCIDENT.verification].label}
            </Badge>
            <Badge color="#4ade80" bg="rgba(34,197,94,0.12)">{INCIDENT.status}</Badge>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px', lineHeight: 1.25 }}>
            {INCIDENT.title}
          </h1>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{INCIDENT.location}</div>
        </div>

        {/* Compact meta */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 10,
            marginBottom: 20,
          }}
        >
          <div style={{ padding: 10, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Severity</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: SEVERITY_LABELS[INCIDENT.severity].color }}>
              {INCIDENT.severity} · {SEVERITY_LABELS[INCIDENT.severity].label}
            </div>
          </div>
          <div style={{ padding: 10, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Started</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{formatDate(INCIDENT.startDate)}</div>
          </div>
        </div>

        {/* Description */}
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 22 }}>
          {INCIDENT.description}
        </div>

        {/* Latest update hero */}
        <LatestUpdateHero event={latestUpdate} onMediaClick={setLightboxItem} />

        {/* Timeline */}
        <SectionTitle count={timeline.length}>Story timeline</SectionTitle>
        <div>
          {sortedTimeline.map((event) => (
            <UserTimelineEvent
              key={event.id}
              event={event}
              expanded={!!expanded[event.id]}
              onToggle={() => toggle(event.id)}
              onMediaClick={setLightboxItem}
            />
          ))}
        </div>
      </div>

      <Lightbox item={lightboxItem} onClose={() => setLightboxItem(null)} />
    </div>
  );
}

/* ─── Main trial page ─── */

export default function SidebarTrial() {
  const [adminTimeline, setAdminTimeline] = useState(INITIAL_TIMELINE);
  const [userTimeline] = useState(INITIAL_TIMELINE);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: 'var(--bg-deep)',
        display: 'flex',
        overflow: 'hidden',
      }}
    >
      <AdminSidebar timeline={adminTimeline} setTimeline={setAdminTimeline} />

      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          color: 'var(--text-muted)',
          gap: 16,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-secondary)' }}>
          Trial canvas — proposed unified sidebar
        </div>
        <div style={{ fontSize: 13, textAlign: 'center', maxWidth: 480, lineHeight: 1.6 }}>
          Left: <strong>Admin sidebar</strong> with full editing, verification, and inline media.<br />
          Right: <strong>User sidebar</strong> with the latest update highlighted and a scannable story timeline.
        </div>
      </div>

      <UserSidebar timeline={userTimeline} />
    </div>
  );
}
