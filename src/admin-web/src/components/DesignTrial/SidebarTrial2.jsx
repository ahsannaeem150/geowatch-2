import React, { useEffect, useMemo, useRef, useState } from 'react';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';

/* ─────────────────────────────────────────────────────────────────────────────
   SIDEBAR TRIAL 2 — Full incident page + compact sidebar preview.
   Route: /sidebarTrial2
   ───────────────────────────────────────────────────────────────────────────── */

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

const SOURCE_TYPE_LABELS = {
  media: 'Media',
  x_post: 'Posts',
  news_article: 'Articles',
  admin_note: 'Notes',
};

const SOURCE_TYPE_ICONS = {
  media: '📷',
  x_post: '𝕏',
  news_article: '📰',
  admin_note: '📝',
};

const ALL_SOURCE_TYPES = ['media', 'x_post', 'news_article', 'admin_note'];

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

function dateGroupLabel(iso) {
  const d = new Date(iso);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMMM d, yyyy');
}

/* ─── Dummy media ─── */
const makeImg = (id, seed, caption) => ({ id, type: 'image', url: `https://picsum.photos/seed/${seed}/800/500`, caption });

const MEDIA = {
  crash: [
    makeImg('c1', 'crashsite1', 'Wreckage near runway'),
    makeImg('c2', 'crashsite2', 'Emergency vehicles on scene'),
    makeImg('c3', 'crashsite3', 'Aircraft tail section'),
    makeImg('c4', 'crashsite4', 'Rescue workers approaching'),
  ],
  rescue: [
    makeImg('r1', 'rescue1', 'Rescue team at crash site'),
    makeImg('r2', 'rescue2', 'Helicopter overhead'),
  ],
  casualties: [
    makeImg('p1', 'pilot1', 'Flight Lieutenant Shubham Kumar'),
    makeImg('p2', 'pilot2', 'Agr Danish Alam'),
    makeImg('p3', 'pilot3', 'Squadron Leader Prashant Singh'),
    makeImg('p4', 'pilot4', 'Sergeant Jitendra Sharma'),
  ],
  officials: [
    makeImg('o1', 'official1', 'Air Officer Commanding at site'),
    makeImg('o2', 'official2', 'Wreath laying ceremony'),
  ],
};

const makeTweet = (id, author, handle, text, tweetUrl, avatarSeed) => ({
  id,
  type: 'x_post',
  author,
  handle,
  text,
  tweetUrl,
  authorAvatar: `https://picsum.photos/seed/${avatarSeed}/120/120`,
});

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
    'An Indian Air Force (IAF) An-32 transport aircraft crashed during landing at Air Force Station (AFS) Jorhat in Assam. The aircraft was carrying 13 personnel. Rescue operations were launched immediately amid poor weather conditions.',
};

/* ─── Dummy timeline with several beats ─── */
const TIMELINE = [
  {
    id: 'e1',
    type: 'report',
    timestamp: '2026-06-13T17:00:00Z',
    summary: 'Aircraft reported crashed at AFS Jorhat, Assam.',
    details: 'First reports emerged from local residents and aviation watchers about a crash during landing in poor weather.',
    verification: 'verified',
    sources: {
      media: MEDIA.crash,
      x_post: [
        makeTweet('xp1', 'Aviation Spotter', '@aviationspotter', 'AN-32 crash reported at Jorhat. Rescue teams moving in.', 'https://x.com/Twitter/status/20', 'avspot'),
        makeTweet('xp2', 'Jorhat News', '@jorhat_news', 'Loud explosion heard near air force station. Emergency sirens active.', 'https://x.com/Twitter/status/20', 'jorhat'),
      ],
      news_article: [
        { id: 'na1', publisher: 'The Hindu', title: 'IAF aircraft crashes in Assam, rescue operations on', url: 'https://www.thehindu.com' },
      ],
      admin_note: [
        { id: 'an1', author: 'Ops Desk', text: 'Initial alert received from station control at 17:02 IST. Aircraft last contact at 16:58.' },
      ],
    },
  },
  {
    id: 'e2',
    type: 'update',
    timestamp: '2026-06-13T19:30:00Z',
    summary: 'Rescue teams reach crash site amid poor weather.',
    details: 'Specialized rescue teams from the station and civil administration reached the site. Operations were hampered by rain and low visibility.',
    verification: 'verified',
    sources: {
      media: MEDIA.rescue,
      x_post: [
        makeTweet('xp6', 'Rescue Watch', '@rescue_watch', 'NDRF and IAF rescue personnel now on site. Weather slowing extraction.', 'https://x.com/Twitter/status/20', 'rescue'),
      ],
      news_article: [],
      admin_note: [
        { id: 'an3', author: 'Ops Desk', text: 'Rescue teams reached wreckage at 19:28 IST. Visibility 800m, intermittent rain.' },
      ],
    },
  },
  {
    id: 'e3',
    type: 'update',
    timestamp: '2026-06-13T21:02:00Z',
    summary: 'IAF confirms 5 casualties in the incident.',
    details: 'An official statement from the Indian Air Force confirmed that five personnel have been confirmed dead and the remaining are being treated at the station medical facility.',
    verification: 'verified',
    sources: {
      media: MEDIA.casualties,
      x_post: [
        makeTweet('xp3', 'Indian Air Force', '@airforce_in', 'With deep regret, IAF confirms 5 personnel have lost their lives in the AN-32 crash at Jorhat. Rescue ops continue.', 'https://x.com/Twitter/status/20', 'iaf'),
        makeTweet('xp4', 'Defence Pro', '@defencepro', 'Five bodies recovered from AN-32 wreckage. Identification process underway.', 'https://x.com/Twitter/status/20', 'defpro'),
        makeTweet('xp5', 'Rahul Reporter', '@rahul_reporter', 'Families of the crew have been informed. Station medical officer issued formal confirmation.', 'https://x.com/Twitter/status/20', 'rahul'),
      ],
      news_article: [
        { id: 'na2', publisher: 'The Hindu', title: 'IAF confirms five deaths in Assam AN-32 crash', url: 'https://www.thehindu.com' },
        { id: 'na3', publisher: 'NDTV', title: '5 Killed After Air Force Plane Crashes In Assam', url: 'https://www.ndtv.com' },
      ],
      admin_note: [
        { id: 'an2', author: 'Station Commander', text: 'Confirmed casualties via medical officer. Next of kin notification completed at 21:30 IST.' },
      ],
    },
  },
  {
    id: 'e4',
    type: 'update',
    timestamp: '2026-06-13T23:15:00Z',
    summary: 'Senior IAF officials visit the crash site.',
    details: 'The Air Officer Commanding-in-Chief of Eastern Air Command visited the site to review rescue and investigation efforts.',
    verification: 'verified',
    sources: {
      media: MEDIA.officials,
      x_post: [
        makeTweet('xp7', 'EAC IAF', '@eac_iaf', 'AOC-in-C EAC reached Jorhat to oversee operations and meet the bereaved families.', 'https://x.com/Twitter/status/20', 'eac'),
      ],
      news_article: [
        { id: 'na4', publisher: 'India Today', title: 'IAF chief visits Jorhat crash site, orders probe', url: 'https://www.indiatoday.in' },
      ],
      admin_note: [],
    },
  },
  {
    id: 'e5',
    type: 'update',
    timestamp: '2026-06-14T01:40:00Z',
    summary: 'Court of inquiry ordered into the crash.',
    details: 'A court of inquiry has been ordered to determine the cause of the accident. Preliminary focus is on weather and landing approach.',
    verification: 'unverified',
    sources: {
      media: [],
      x_post: [],
      news_article: [
        { id: 'na5', publisher: 'The Print', title: 'Court of inquiry ordered after IAF AN-32 crash in Assam', url: 'https://theprint.in' },
      ],
      admin_note: [
        { id: 'an4', author: 'Ops Desk', text: 'Investigation board constituted. Black box recovery expected at first light.' },
      ],
    },
  },
];

/* ─── Icons ─── */
const Icons = {
  chevronDown: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>,
  chevronUp: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 15 12 9 18 15" /></svg>,
  chevronLeft: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>,
  link: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>,
  image: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>,
  plus: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
  edit: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>,
  trash: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>,
  check: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
  x: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
  arrowRight: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>,
  calendar: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
  mapPin: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>,
  hash: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="9" x2="20" y2="9" /><line x1="4" y1="15" x2="20" y2="15" /><line x1="10" y1="3" x2="8" y2="21" /><line x1="16" y1="3" x2="14" y2="21" /></svg>,
};

/* ─── UI primitives ─── */
function Badge({ children, color = '#9ca3af', bg = 'rgba(156,163,175,0.12)' }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 999, background: bg, color, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
      {children}
    </span>
  );
}

function Button({ children, onClick, variant = 'default', icon, small, fullWidth }) {
  const variants = {
    default: { bg: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' },
    primary: { bg: 'linear-gradient(135deg, var(--accent-light), var(--accent))', color: '#fff', border: 'none' },
    ghost: { bg: 'transparent', color: 'var(--text-muted)', border: '1px solid transparent' },
    outline: { bg: 'transparent', color: 'var(--accent-light)', border: '1px solid var(--accent)' },
  };
  const v = variants[variant];
  return (
    <button
      onClick={onClick}
      style={{ width: fullWidth ? '100%' : undefined, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: small ? '6px 12px' : '10px 16px', borderRadius: 10, background: v.bg, color: v.color, border: v.border, fontSize: small ? 12 : 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)', transition: 'opacity 0.15s' }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.88')}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
    >
      {icon && <span style={{ display: 'inline-flex' }}>{icon}</span>}
      {children}
    </button>
  );
}

function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {tabs.map((tab) => {
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            style={{
              padding: '6px 12px',
              borderRadius: 999,
              border: 'none',
              background: isActive ? 'var(--bg-hover)' : 'transparent',
              color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {tab.icon && <span style={{ marginRight: 5 }}>{tab.icon}</span>}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}


/* ─── X / Twitter embed ─── */
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

function XEmbed({ tweetUrl, fallback }) {
  const ref = useRef(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const render = async () => {
      try {
        const twttr = await loadTwitterScript();
        if (!ref.current || cancelled) return;
        await twttr.widgets.load(ref.current);
        if (!cancelled) setLoaded(true);
      } catch {
        // ignore — fallback remains visible
      }
    };
    render();
    return () => { cancelled = true; };
  }, [tweetUrl]);

  return (
    <div style={{ minHeight: 180 }}>
      <blockquote
        ref={ref}
        className="twitter-tweet"
        data-theme="dark"
        style={{ margin: 0, opacity: loaded ? 1 : 0, transition: 'opacity 0.3s', position: loaded ? 'relative' : 'absolute', width: '100%' }}
      >
        <a href={tweetUrl} target="_blank" rel="noreferrer">{fallback}</a>
      </blockquote>
      {!loaded && (
        <div style={{ padding: 16, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          Loading post…
        </div>
      )}
    </div>
  );
}

function XPostCard({ post, embed = false }) {
  if (embed) {
    return <XEmbed tweetUrl={post.tweetUrl} fallback={post.text} />;
  }
  return (
    <div style={{ padding: 14, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 14, marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <img src={post.authorAvatar} alt={post.author} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{post.author}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{post.handle} · X</div>
        </div>
      </div>
      <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{post.text}</div>
      {post.tweetUrl && (
        <a href={post.tweetUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 10, fontSize: 12, color: 'var(--accent-light)', textDecoration: 'none' }}>
          {Icons.link} View post
        </a>
      )}
    </div>
  );
}

function ArticleCard({ article }) {
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noreferrer"
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 14, color: 'var(--text-secondary)', textDecoration: 'none', marginBottom: 10, transition: 'transform 0.15s, border-color 0.15s' }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 10, background: 'var(--bg-hover)', color: 'var(--accent-light)' }}>{Icons.link}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.35 }}>{article.title}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{article.publisher}</div>
      </div>
      {Icons.arrowRight}
    </a>
  );
}

function AdminNoteCard({ note }) {
  return (
    <div style={{ padding: 14, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.18)', borderRadius: 14, marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: '#fbbf24', marginBottom: 6, letterSpacing: '0.05em' }}>
        {SOURCE_TYPE_ICONS.admin_note} Admin note · {note.author}
      </div>
      <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{note.text}</div>
    </div>
  );
}

/* ─── Media components ─── */
function MediaThumb({ item, onClick, overlay }) {
  return (
    <button
      onClick={() => onClick?.(item)}
      style={{ position: 'relative', border: 'none', padding: 0, borderRadius: 12, overflow: 'hidden', cursor: 'pointer', background: 'var(--bg-elevated)', aspectRatio: '16 / 10' }}
    >
      <img src={item.url} alt={item.caption} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.25s' }} onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.03)')} onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')} />
      {overlay && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 20, fontWeight: 800 }}>
          {overlay}
        </div>
      )}
      {item.caption && !overlay && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '8px 10px', background: 'linear-gradient(transparent, rgba(0,0,0,0.85))', color: '#fff', fontSize: 11, fontWeight: 700, textAlign: 'left' }}>
          {item.caption}
        </div>
      )}
    </button>
  );
}

function MediaGrid({ items, onItemClick, maxVisible = 4 }) {
  if (!items?.length) return null;
  const visible = items.slice(0, maxVisible);
  const remaining = items.length - maxVisible;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
      {visible.map((item, idx) => (
        <MediaThumb
          key={item.id}
          item={item}
          onClick={onItemClick}
          overlay={idx === maxVisible - 1 && remaining > 0 ? `+${remaining}` : undefined}
        />
      ))}
    </div>
  );
}

function Lightbox({ item, onClose }) {
  if (!item) return null;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ position: 'relative', maxWidth: '92vw', maxHeight: '92vh' }}>
        <img src={item.url} alt={item.caption} style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: 16, display: 'block' }} />
        <div style={{ color: '#fff', marginTop: 12, fontSize: 14, textAlign: 'center', fontWeight: 600 }}>{item.caption}</div>
      </div>
    </div>
  );
}

/* ─── Evidence bundle panel inside an event card ─── */
function EvidenceBundle({ event, activeTab, onTabChange, onMediaClick, embedPosts }) {
  const sources = event.sources || {};
  const counts = {
    all: Object.values(sources).flat().length,
    media: sources.media?.length || 0,
    x_post: sources.x_post?.length || 0,
    news_article: sources.news_article?.length || 0,
    admin_note: sources.admin_note?.length || 0,
  };

  const tabs = [
    { key: 'all', label: `All (${counts.all})`, icon: '⊕' },
    { key: 'media', label: `${SOURCE_TYPE_ICONS.media} Media (${counts.media})` },
    { key: 'x_post', label: `${SOURCE_TYPE_ICONS.x_post} Posts (${counts.x_post})` },
    { key: 'news_article', label: `${SOURCE_TYPE_ICONS.news_article} Articles (${counts.news_article})` },
    { key: 'admin_note', label: `${SOURCE_TYPE_ICONS.admin_note} Notes (${counts.admin_note})` },
  ].filter((t) => {
    if (t.key === 'all') return counts.all > 0;
    return counts[t.key] > 0;
  });

  const renderSection = (type, title, Component) => {
    const items = sources[type];
    if (!items?.length) return null;
    return (
      <div key={type} style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10, letterSpacing: '0.06em' }}>
          {SOURCE_TYPE_ICONS[type]} {title} ({items.length})
        </div>
        {type === 'media' ? (
          <MediaGrid items={items} onItemClick={onMediaClick} />
        ) : (
          items.map((item) => <Component key={item.id} {...{ [type === 'x_post' ? 'post' : type === 'news_article' ? 'article' : 'note']: item }} embed={type === 'x_post' ? embedPosts : undefined} />)
        )}
      </div>
    );
  };

  return (
    <div style={{ marginTop: 14 }}>
      <TabBar tabs={tabs} active={activeTab} onChange={onTabChange} />
      <div style={{ marginTop: 12 }}>
        {activeTab === 'all' && (
          <div>
            {counts.media > 0 && renderSection('media', SOURCE_TYPE_LABELS.media, null)}
            {counts.x_post > 0 && renderSection('x_post', SOURCE_TYPE_LABELS.x_post, XPostCard)}
            {counts.news_article > 0 && renderSection('news_article', SOURCE_TYPE_LABELS.news_article, ArticleCard)}
            {counts.admin_note > 0 && renderSection('admin_note', SOURCE_TYPE_LABELS.admin_note, AdminNoteCard)}
          </div>
        )}
        {activeTab === 'media' && renderSection('media', SOURCE_TYPE_LABELS.media, null)}
        {activeTab === 'x_post' && renderSection('x_post', SOURCE_TYPE_LABELS.x_post, XPostCard)}
        {activeTab === 'news_article' && renderSection('news_article', SOURCE_TYPE_LABELS.news_article, ArticleCard)}
        {activeTab === 'admin_note' && renderSection('admin_note', SOURCE_TYPE_LABELS.admin_note, AdminNoteCard)}
      </div>
    </div>
  );
}


/* ─── Compact sidebar evidence summary ─── */
function EvidenceSummary({ sources }) {
  const counts = {
    media: sources.media?.length || 0,
    x_post: sources.x_post?.length || 0,
    news_article: sources.news_article?.length || 0,
    admin_note: sources.admin_note?.length || 0,
  };
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const parts = [];
  if (counts.media) parts.push(`${counts.media} image${counts.media > 1 ? 's' : ''}`);
  if (counts.x_post) parts.push(`${counts.x_post} post${counts.x_post > 1 ? 's' : ''}`);
  if (counts.news_article) parts.push(`${counts.news_article} article${counts.news_article > 1 ? 's' : ''}`);
  if (counts.admin_note) parts.push(`${counts.admin_note} note${counts.admin_note > 1 ? 's' : ''}`);
  if (!parts.length) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
      <span>📎</span>
      <span>{total} evidence: {parts.join(', ')}</span>
    </div>
  );
}

/* ─── Event card for compact sidebar ─── */
function EventCard({ event, isAdmin, onEditEvent, onDeleteEvent, onSetVerification, onLightbox, onOpenFull }) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  const ver = VERIFICATION[event.verification] || VERIFICATION.unverified;
  const typeLabel = event.type === 'report' ? 'Initial report' : 'Update';
  const typeColor = event.type === 'report' ? '#818cf8' : '#38bdf8';
  const firstTwoImages = event.sources?.media?.slice(0, 2) || [];

  return (
    <div style={{ position: 'relative', paddingLeft: 20 }}>
      <div style={{ position: 'absolute', left: 0, top: 6, width: 10, height: 10, borderRadius: '50%', background: typeColor, border: '2px solid var(--bg-primary)' }} />
      <div style={{ position: 'absolute', left: 4, top: 18, bottom: -18, width: 2, background: 'var(--border-subtle)' }} />

      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: 14, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: typeColor, letterSpacing: '0.06em' }}>{typeLabel}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>• {relativeTime(event.timestamp)}</span>
              <Badge color={ver.color} bg={ver.bg}>{ver.label}</Badge>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.4 }}>{event.summary}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginTop: 4 }}>{event.details}</div>
          </div>

          {isAdmin && (
            <div style={{ display: 'flex', gap: 5 }}>
              <button onClick={() => onSetVerification?.(event.id)} title="Toggle verification" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 8, background: ver.bg, color: ver.color, border: 'none', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>{Icons.check} Verify</button>
              <button onClick={() => onEditEvent?.(event)} title="Edit" style={{ padding: 5, borderRadius: 8, background: 'var(--bg-hover)', color: 'var(--text-muted)', border: 'none', cursor: 'pointer' }}>{Icons.edit}</button>
              <button onClick={() => onDeleteEvent?.(event.id)} title="Delete" style={{ padding: 5, borderRadius: 8, background: 'var(--bg-hover)', color: 'var(--danger-light)', border: 'none', cursor: 'pointer' }}>{Icons.trash}</button>
            </div>
          )}
        </div>

        {!expanded && (
          <div style={{ marginTop: 10 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>
              {firstTwoImages.length > 0 && (
                <div style={{ width: 120, flexShrink: 0 }}>
                  <MediaGrid items={firstTwoImages} onItemClick={onLightbox} maxVisible={2} />
                </div>
              )}
              <div style={{ flex: 1 }}>
                <EvidenceSummary sources={event.sources} />
                <button onClick={() => setExpanded(true)} style={{ marginTop: 10, padding: '6px 10px', borderRadius: 999, background: 'var(--bg-hover)', color: 'var(--accent-light)', border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Review evidence {Icons.chevronDown}
                </button>
              </div>
            </div>
          </div>
        )}

        {expanded && (
          <div style={{ marginTop: 10, borderTop: '1px solid var(--border-subtle)', paddingTop: 10 }}>
            <EvidenceBundle event={event} activeTab={activeTab} onTabChange={setActiveTab} onMediaClick={onLightbox} />
            <button onClick={() => setExpanded(false)} style={{ marginTop: 8, padding: '4px 8px', borderRadius: 8, background: 'var(--bg-hover)', color: 'var(--text-muted)', border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              Collapse {Icons.chevronUp}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Compact sidebar components ─── */
function LatestUpdateHero({ event, onLightbox, onOpenFull }) {
  const ver = VERIFICATION[event?.verification] || VERIFICATION.unverified;
  if (!event) return null;
  return (
    <div style={{ background: 'linear-gradient(180deg, rgba(56,189,248,0.08) 0%, transparent 100%)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: 16, marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Badge color={ver.color} bg={ver.bg}>{ver.label}</Badge>
        <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: '#38bdf8', letterSpacing: '0.06em' }}>Latest update</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{relativeTime(event.timestamp)}</span>
      </div>
      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>{event.summary}</div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 10 }}>{event.details}</div>
      {event.sources?.media?.length > 0 && (
        <div style={{ maxWidth: 220, marginBottom: 12 }}>
          <MediaGrid items={event.sources.media} onItemClick={onLightbox} maxVisible={3} />
        </div>
      )}
      <Button onClick={onOpenFull} variant="primary" fullWidth icon={Icons.arrowRight}>View full incident</Button>
    </div>
  );
}

function CompactSidebar({ incident, events, isAdmin, onLightbox, onOpenFull }) {
  const sorted = useMemo(() => [...events].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)), [events]);
  const latest = sorted[0];
  const rest = sorted.slice(1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        <div style={{ paddingBottom: 14, borderBottom: '1px solid var(--border-subtle)', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            <Badge color={SEVERITY_LABELS[incident.severity].color} bg={`${SEVERITY_LABELS[incident.severity].color}1f`}>{SEVERITY_LABELS[incident.severity].label}</Badge>
            <Badge color={VERIFICATION[incident.verification].color} bg={VERIFICATION[incident.verification].bg}>{VERIFICATION[incident.verification].label}</Badge>
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px', lineHeight: 1.25 }}>{incident.title}</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, fontSize: 11, color: 'var(--text-muted)' }}>
            <span>{Icons.mapPin} {incident.location}</span>
            <span>{Icons.calendar} {formatDate(incident.startDate)}</span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55, margin: '10px 0 0' }}>{incident.description}</p>
        </div>

        <LatestUpdateHero event={latest} onLightbox={onLightbox} onOpenFull={onOpenFull} />

        <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 10 }}>Earlier updates ({rest.length})</div>
        {rest.map((event) => (
          <EventCard key={event.id} event={event} isAdmin={isAdmin} onLightbox={onLightbox} onOpenFull={onOpenFull} />
        ))}
      </div>
    </div>
  );
}


/* ─── Full incident page ─── */
function FilterChip({ label, active, count, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 14px',
        borderRadius: 999,
        border: '1px solid',
        borderColor: active ? 'var(--accent)' : 'var(--border-subtle)',
        background: active ? 'rgba(14,165,233,0.12)' : 'var(--bg-elevated)',
        color: active ? 'var(--accent-light)' : 'var(--text-secondary)',
        fontSize: 13,
        fontWeight: 700,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      {label}
      {typeof count === 'number' && (
        <span style={{ padding: '2px 6px', borderRadius: 999, background: active ? 'rgba(14,165,233,0.2)' : 'var(--bg-hover)', fontSize: 11 }}>{count}</span>
      )}
    </button>
  );
}

function countEventsWithType(events, type) {
  return events.filter((e) => (e.sources?.[type]?.length || 0) > 0).length;
}

function filterEventsByType(events, type) {
  if (type === 'all') return events;
  return events.filter((e) => (e.sources?.[type]?.length || 0) > 0);
}

function FullTimelineEvent({ event, isAdmin, onMediaClick, onSetVerification, onEdit, onDelete }) {
  const [activeTab, setActiveTab] = useState('all');
  const ver = VERIFICATION[event.verification] || VERIFICATION.unverified;
  const typeLabel = event.type === 'report' ? 'Initial report' : 'Update';
  const typeColor = event.type === 'report' ? '#818cf8' : '#38bdf8';

  return (
    <div style={{ position: 'relative', paddingLeft: 28, marginBottom: 32 }}>
      <div style={{ position: 'absolute', left: 0, top: 8, width: 14, height: 14, borderRadius: '50%', background: typeColor, border: '3px solid var(--bg-primary)', boxShadow: '0 0 0 3px rgba(56,189,248,0.15)' }} />
      <div style={{ position: 'absolute', left: 6, top: 26, bottom: -32, width: 2, background: 'var(--border-subtle)' }} />

      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 18, padding: 22, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: typeColor, letterSpacing: '0.06em' }}>{typeLabel}</span>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{formatDate(event.timestamp)} · {formatTime(event.timestamp)}</span>
              <Badge color={ver.color} bg={ver.bg}>{ver.label}</Badge>
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.3 }}>{event.summary}</h3>
            <p style={{ margin: 0, fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.65 }}>{event.details}</p>
          </div>

          {isAdmin && (
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button onClick={() => onSetVerification?.(event.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 8, background: ver.bg, color: ver.color, border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>{Icons.check} Verify</button>
              <button onClick={() => onEdit?.(event)} style={{ padding: 6, borderRadius: 8, background: 'var(--bg-hover)', color: 'var(--text-muted)', border: 'none', cursor: 'pointer' }}>{Icons.edit}</button>
              <button onClick={() => onDelete?.(event.id)} style={{ padding: 6, borderRadius: 8, background: 'var(--bg-hover)', color: 'var(--danger-light)', border: 'none', cursor: 'pointer' }}>{Icons.trash}</button>
            </div>
          )}
        </div>

        <EvidenceBundle event={event} activeTab={activeTab} onTabChange={setActiveTab} onMediaClick={onMediaClick} embedPosts />
      </div>
    </div>
  );
}

function FullIncidentPage({ incident, events, isAdmin, onClose, onMediaClick, onSetVerification, onEdit, onDelete }) {
  const [filter, setFilter] = useState('all');
  const scrollRef = useRef(null);

  const sortedEvents = useMemo(() => [...events].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)), [events]);
  const filteredEvents = useMemo(() => filterEventsByType(sortedEvents, filter), [sortedEvents, filter]);
  const heroImage = incident.sources?.media?.[0] || sortedEvents.find((e) => e.sources?.media?.length)?.sources.media[0];
  const allMedia = useMemo(() => sortedEvents.flatMap((e) => e.sources?.media || []), [sortedEvents]);

  const grouped = useMemo(() => {
    const map = new Map();
    filteredEvents.forEach((e) => {
      const label = dateGroupLabel(e.timestamp);
      if (!map.has(label)) map.set(label, []);
      map.get(label).push(e);
    });
    return Array.from(map.entries());
  }, [filteredEvents]);

  const filterCounts = {
    all: sortedEvents.length,
    media: countEventsWithType(sortedEvents, 'media'),
    x_post: countEventsWithType(sortedEvents, 'x_post'),
    news_article: countEventsWithType(sortedEvents, 'news_article'),
    admin_note: countEventsWithType(sortedEvents, 'admin_note'),
  };

  const sev = SEVERITY_LABELS[incident.severity] || SEVERITY_LABELS[3];
  const ver = VERIFICATION[incident.verification] || VERIFICATION.unverified;

  const jumpToLatest = () => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  };

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 100, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      {/* Sticky top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(11,13,18,0.85)', backdropFilter: 'blur(10px)' }}>
        <button onClick={onClose} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 10, background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          {Icons.chevronLeft} Back to map
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{incident.title}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{incident.location}</div>
        </div>
        <Button onClick={jumpToLatest} variant="outline" small icon={Icons.chevronDown}>Jump to latest</Button>
      </div>

      {/* Scrollable content */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: 980, margin: '0 auto', padding: '28px 24px 60px' }}>

          {/* Hero header */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
              <Badge color={sev.color} bg={`${sev.color}1f`}>{sev.label}</Badge>
              <Badge color={ver.color} bg={ver.bg}>{ver.label}</Badge>
              <Badge color="#38bdf8" bg="rgba(56,189,248,0.12)">{incident.status}</Badge>
            </div>
            <h1 style={{ margin: '0 0 14px', fontSize: 34, fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
              {incident.title}
            </h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, fontSize: 14, color: 'var(--text-secondary)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{Icons.mapPin} {incident.location}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{Icons.calendar} {formatDate(incident.startDate)} · {formatTime(incident.startDate)}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{Icons.hash} {incident.category}</span>
            </div>
          </div>

          {/* Hero media + description grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20, marginBottom: 32 }}>
            <div>
              {heroImage ? (
                <div style={{ borderRadius: 20, overflow: 'hidden', border: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
                  <img src={heroImage.url} alt={heroImage.caption} style={{ width: '100%', height: 300, objectFit: 'cover', display: 'block' }} />
                  <div style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)' }}>{heroImage.caption}</div>
                </div>
              ) : (
                <div style={{ height: 300, borderRadius: 20, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No media available</div>
              )}
              {allMedia.length > 1 && (
                <div style={{ display: 'flex', gap: 8, marginTop: 10, overflowX: 'auto', paddingBottom: 4 }}>
                  {allMedia.slice(1, 6).map((img) => (
                    <button key={img.id} onClick={() => onMediaClick(img)} style={{ flexShrink: 0, width: 90, height: 60, borderRadius: 10, overflow: 'hidden', border: 'none', padding: 0, cursor: 'pointer' }}>
                      <img src={img.url} alt={img.caption} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </button>
                  ))}
                  {allMedia.length > 6 && (
                    <button onClick={() => onMediaClick(allMedia[6])} style={{ flexShrink: 0, width: 90, height: 60, borderRadius: 10, background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      +{allMedia.length - 6}
                    </button>
                  )}
                </div>
              )}
            </div>

            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 20, padding: 22 }}>
              <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 10 }}>About this incident</div>
              <p style={{ margin: 0, fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{incident.description}</p>
              <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ padding: 12, background: 'var(--bg-primary)', borderRadius: 12 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Status</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', textTransform: 'capitalize' }}>{incident.status}</div>
                </div>
                <div style={{ padding: 12, background: 'var(--bg-primary)', borderRadius: 12 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Severity</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: sev.color }}>{sev.label}</div>
                </div>
                <div style={{ padding: 12, background: 'var(--bg-primary)', borderRadius: 12 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Domain</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{incident.domain}</div>
                </div>
                <div style={{ padding: 12, background: 'var(--bg-primary)', borderRadius: 12 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>First reported</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{relativeTime(incident.createdAt)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Filter bar */}
          <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-primary)', padding: '12px 0', marginBottom: 18, borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>Story timeline</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <FilterChip label="All" count={filterCounts.all} active={filter === 'all'} onClick={() => setFilter('all')} />
                <FilterChip label="Media" count={filterCounts.media} active={filter === 'media'} onClick={() => setFilter('media')} />
                <FilterChip label="Posts" count={filterCounts.x_post} active={filter === 'x_post'} onClick={() => setFilter('x_post')} />
                <FilterChip label="Articles" count={filterCounts.news_article} active={filter === 'news_article'} onClick={() => setFilter('news_article')} />
                <FilterChip label="Notes" count={filterCounts.admin_note} active={filter === 'admin_note'} onClick={() => setFilter('admin_note')} />
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div>
            {grouped.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No updates match this filter.</div>
            )}
            {grouped.map(([label, groupEvents]) => (
              <div key={label} style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                  <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
                  <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>{label}</span>
                  <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
                </div>
                {groupEvents.map((event) => (
                  <FullTimelineEvent
                    key={event.id}
                    event={event}
                    isAdmin={isAdmin}
                    onMediaClick={onMediaClick}
                    onSetVerification={onSetVerification}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}


/* ─── Modals ─── */
function Modal({ title, children, onClose, onSubmit, submitLabel }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 11000, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 520, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 18, padding: 22, maxHeight: '85vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>{Icons.x}</button>
        </div>
        {children}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
          <Button onClick={onClose} variant="ghost">Cancel</Button>
          {onSubmit && <Button onClick={onSubmit} variant="primary">{submitLabel || 'Save'}</Button>}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6, letterSpacing: '0.05em' }}>{label}</label>
      {children}
    </div>
  );
}

function Input(props) {
  return <input {...props} style={{ width: '100%', padding: '9px 11px', borderRadius: 10, border: '1px solid var(--border-subtle)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 14, outline: 'none', ...props.style }} />;
}

function TextArea(props) {
  return <textarea {...props} style={{ width: '100%', padding: '9px 11px', borderRadius: 10, border: '1px solid var(--border-subtle)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 14, minHeight: 90, resize: 'vertical', outline: 'none', ...props.style }} />;
}

function AddEventModal({ onClose, onSave }) {
  const [type, setType] = useState('update');
  const [summary, setSummary] = useState('');
  const [details, setDetails] = useState('');
  const [verification, setVerification] = useState('verified');

  return (
    <Modal title="Add story beat" onClose={onClose} onSubmit={() => onSave({ type, summary, details, verification })}>
      <Field label="Type">
        <select value={type} onChange={(e) => setType(e.target.value)} style={{ width: '100%', padding: 9, borderRadius: 10, border: '1px solid var(--border-subtle)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 14 }}>
          <option value="report">Initial report</option>
          <option value="update">Update</option>
        </select>
      </Field>
      <Field label="Summary"><Input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="e.g. IAF confirms casualties" /></Field>
      <Field label="Details"><TextArea value={details} onChange={(e) => setDetails(e.target.value)} placeholder="What happened?" /></Field>
      <Field label="Verification">
        <select value={verification} onChange={(e) => setVerification(e.target.value)} style={{ width: '100%', padding: 9, borderRadius: 10, border: '1px solid var(--border-subtle)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 14 }}>
          {Object.keys(VERIFICATION).map((k) => <option key={k} value={k}>{VERIFICATION[k].label}</option>)}
        </select>
      </Field>
    </Modal>
  );
}


/* ─── Page shell ─── */
export default function SidebarTrial2() {
  const [theme, setTheme] = useState('dark');
  const [role, setRole] = useState('admin');
  const [events, setEvents] = useState(TIMELINE);
  const [lightboxItem, setLightboxItem] = useState(null);
  const [fullPageOpen, setFullPageOpen] = useState(false);
  const [modal, setModal] = useState(null);

  const isAdmin = role === 'admin';

  const handleAddEvent = (payload) => {
    const newEvent = {
      id: `e${Date.now()}`,
      type: payload.type,
      timestamp: new Date().toISOString(),
      summary: payload.summary,
      details: payload.details,
      verification: payload.verification,
      sources: { media: [], x_post: [], news_article: [], admin_note: [] },
    };
    setEvents((prev) => [...prev, newEvent]);
    setModal(null);
  };

  const handleEditEvent = (event) => {
    window.alert(`Edit "${event.summary}" — modal placeholder`);
  };

  const handleDeleteEvent = (id) => {
    if (!window.confirm('Delete this story beat?')) return;
    setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  const handleSetVerification = (id) => {
    setEvents((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        const keys = Object.keys(VERIFICATION);
        const idx = keys.indexOf(e.verification);
        const next = keys[(idx + 1) % keys.length];
        return { ...e, verification: next };
      })
    );
  };

  const themeStyles = {
    dark: {
      '--bg-primary': '#0b0d12',
      '--bg-elevated': '#14161f',
      '--bg-hover': '#1f2330',
      '--text-primary': '#f1f5f9',
      '--text-secondary': '#94a3b8',
      '--text-muted': '#64748b',
      '--border-subtle': 'rgba(148,163,184,0.14)',
      '--accent': '#0ea5e9',
      '--accent-light': '#38bdf8',
      '--font-sans': 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      '--danger-light': '#f87171',
    },
    light: {
      '--bg-primary': '#ffffff',
      '--bg-elevated': '#f8fafc',
      '--bg-hover': '#f1f5f9',
      '--text-primary': '#0f172a',
      '--text-secondary': '#475569',
      '--text-muted': '#94a3b8',
      '--border-subtle': 'rgba(15,23,42,0.10)',
      '--accent': '#0284c7',
      '--accent-light': '#0ea5e9',
      '--font-sans': 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      '--danger-light': '#dc2626',
    },
  };

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-sans)',
        ...themeStyles[theme],
      }}
    >
      {/* Top control bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', zIndex: 200 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>
          Sidebar Trial 2 — Full incident page ({role})
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>Role</span>
            <select value={role} onChange={(e) => setRole(e.target.value)} style={{ padding: '5px 8px', borderRadius: 8, background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', fontSize: 12 }}>
              <option value="admin">Admin</option>
              <option value="user">Public user</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>Theme</span>
            <select value={theme} onChange={(e) => setTheme(e.target.value)} style={{ padding: '5px 8px', borderRadius: 8, background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', fontSize: 12 }}>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main stage */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', overflow: 'hidden' }}>
        {/* Fake map */}
        <div style={{ flex: 1, background: theme === 'dark' ? '#050609' : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 18, fontWeight: 700 }}>
          Fake map canvas
        </div>

        {/* Compact sidebar */}
        <div style={{ width: 420, minWidth: 340, maxWidth: '40vw', borderLeft: '1px solid var(--border-subtle)', background: 'var(--bg-primary)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {isAdmin && (
            <div style={{ padding: 12, borderBottom: '1px solid var(--border-subtle)', display: 'flex', gap: 8 }}>
              <Button onClick={() => setModal('event')} variant="primary" small icon={Icons.plus}>Add beat</Button>
            </div>
          )}
          <CompactSidebar
            incident={INCIDENT}
            events={events}
            isAdmin={isAdmin}
            onLightbox={setLightboxItem}
            onOpenFull={() => setFullPageOpen(true)}
          />
        </div>

        {/* Full incident page overlay */}
        {fullPageOpen && (
          <FullIncidentPage
            incident={INCIDENT}
            events={events}
            isAdmin={isAdmin}
            onClose={() => setFullPageOpen(false)}
            onMediaClick={setLightboxItem}
            onSetVerification={handleSetVerification}
            onEdit={handleEditEvent}
            onDelete={handleDeleteEvent}
          />
        )}
      </div>

      {modal === 'event' && <AddEventModal onClose={() => setModal(null)} onSave={handleAddEvent} />}
      {lightboxItem && <Lightbox item={lightboxItem} onClose={() => setLightboxItem(null)} />}
    </div>
  );
}
