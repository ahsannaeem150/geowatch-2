import React, { useEffect, useRef, useState } from 'react';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';

/* ─────────────────────────────────────────────────────────────────────────────
   Shared data + components for Sidebar Trial 2 option prototypes.
   ───────────────────────────────────────────────────────────────────────────── */

export const SEVERITY_LABELS = {
  1: { label: 'Minor', color: '#4ade80' },
  2: { label: 'Low', color: '#fbbf24' },
  3: { label: 'Moderate', color: '#fb923c' },
  4: { label: 'High', color: '#f87171' },
  5: { label: 'Critical', color: '#dc2626' },
};

export const VERIFICATION = {
  verified: { label: 'Verified', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  unverified: { label: 'Unverified', color: '#9ca3af', bg: 'rgba(156,163,175,0.12)' },
  disputed: { label: 'Disputed', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  debunked: { label: 'Debunked', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
};

export const SOURCE_TYPE_LABELS = {
  media: 'Media',
  x_post: 'Posts',
  news_article: 'Articles',
  admin_note: 'Notes',
};

export const SOURCE_TYPE_ICONS = {
  media: '📷',
  x_post: '𝕏',
  news_article: '📰',
  admin_note: '📝',
};

export function formatDate(iso) {
  if (!iso) return '—';
  return format(new Date(iso), 'MMM d, yyyy');
}

export function formatTime(iso) {
  if (!iso) return '';
  return format(new Date(iso), 'h:mm a');
}

export function relativeTime(iso) {
  if (!iso) return '';
  return formatDistanceToNow(new Date(iso), { addSuffix: true });
}

export function dateGroupLabel(iso) {
  const d = new Date(iso);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMMM d, yyyy');
}

export function countEvidence(event) {
  const s = event.sources || {};
  return (s.media?.length || 0) + (s.x_post?.length || 0) + (s.news_article?.length || 0) + (s.admin_note?.length || 0);
}

/* ─── Dummy media ─── */
export const makeImg = (id, seed, caption) => ({ id, type: 'image', url: `https://picsum.photos/seed/${seed}/800/500`, caption });

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
  statement: [
    makeImg('s1', 'iafstatement1', 'Wreckage close-up'),
    makeImg('s2', 'iafstatement2', 'Rescue operations continue'),
    makeImg('s3', 'iafstatement3', 'Officials at briefing'),
  ],
};

export const makeTweet = (id, author, handle, text, tweetUrl, avatarSeed, opts = {}) => ({
  id,
  type: 'x_post',
  author,
  handle,
  text,
  tweetUrl,
  authorAvatar: `https://picsum.photos/seed/${avatarSeed}/120/120`,
  pinned: opts.pinned ?? false,
  timestamp: opts.timestamp ?? null,
  archived: opts.archived ?? false,
  archiveUrl: opts.archiveUrl ?? '',
  archivedAt: opts.archivedAt ?? '',
  archiveReason: opts.archiveReason ?? '',
});

/* ─── Dummy incident ─── */
export const INCIDENT = {
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

/* ─── Dummy timeline ─── */
export const TIMELINE = [
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
        makeTweet('xp1', 'Aviation Spotter', '@aviationspotter', 'AN-32 crash reported at Jorhat. Rescue teams moving in.', 'https://x.com/aviationspotter/status/2000000000000000001', 'avspot', { timestamp: '2026-06-13T17:05:00Z' }),
        makeTweet('xp2', 'Jorhat News', '@jorhat_news', 'Loud explosion heard near air force station. Emergency sirens active.', 'https://x.com/jorhat_news/status/2000000000000000002', 'jorhat', { timestamp: '2026-06-13T17:08:00Z', archived: true, archiveUrl: '/archive/p1.png', archivedAt: '2026-06-14T00:00:00Z', archiveReason: 'Post deleted by author' }),
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
        makeTweet('xp6', 'Rescue Watch', '@rescue_watch', 'NDRF and IAF rescue personnel now on site. Weather slowing extraction.', 'https://x.com/rescue_watch/status/2000000000000000006', 'rescue', { timestamp: '2026-06-13T19:35:00Z' }),
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
        makeTweet('xp3', 'Indian Air Force', '@airforce_in', 'With deep regret, IAF confirms 5 personnel have lost their lives in the AN-32 crash at Jorhat. Rescue ops continue.', 'https://x.com/airforce_in/status/2000000000000000003', 'iaf', { timestamp: '2026-06-13T21:05:00Z' }),
        makeTweet('xp4', 'Defence Pro', '@defencepro', 'Five bodies recovered from AN-32 wreckage. Identification process underway.', 'https://x.com/defencepro/status/2000000000000000004', 'defpro', { timestamp: '2026-06-13T21:40:00Z', archived: true, archiveUrl: '/archive/p2.png', archivedAt: '2026-06-14T00:00:00Z', archiveReason: 'Post deleted by author' }),
        makeTweet('xp5', 'Rahul Reporter', '@rahul_reporter', 'Families of the crew have been informed. Station medical officer issued formal confirmation.', 'https://x.com/rahul_reporter/status/2000000000000000005', 'rahul', { timestamp: '2026-06-13T22:10:00Z' }),
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
        makeTweet('xp7', 'EAC IAF', '@eac_iaf', 'AOC-in-C EAC reached Jorhat to oversee operations and meet the bereaved families.', 'https://x.com/eac_iaf/status/2000000000000000007', 'eac', { timestamp: '2026-06-13T23:20:00Z' }),
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
  {
    id: 'e6',
    type: 'update',
    timestamp: '2026-06-14T06:15:00Z',
    summary: 'IAF releases detailed statement with images on the crash.',
    details: 'The Indian Air Force shares an official thread with photographs and a full statement on the Jorhat crash, rescue efforts, and next-of-kin support.',
    verification: 'verified',
    sources: {
      media: MEDIA.statement,
      x_post: [
        makeTweet('xp8', 'IAF_MCC', '@IAF_MCC', 'IAF statement on the AN-32 crash at Air Force Station Jorhat.', 'https://x.com/IAF_MCC/status/2065719865890205976', 'iafmcc', { pinned: true, timestamp: '2026-06-14T06:20:00Z' }),
        makeTweet('xp9', 'jack', '@jack', 'just setting up my twttr', 'https://x.com/jack/status/20', 'jack', { timestamp: '2026-06-14T06:25:00Z' }),
      ],
      news_article: [
        { id: 'na6', publisher: 'The Indian Express', title: 'IAF shares full statement, photos of Assam AN-32 crash', url: 'https://indianexpress.com' },
      ],
      admin_note: [
        { id: 'an5', author: 'Media Cell', text: 'Official X thread published at 11:45 IST. Includes high-resolution images and casualty update. The Media Cell will continue to release verified information as the court of inquiry progresses and next-of-kin notifications are completed.' },
      ],
    },
  },
];

/* ─── Icons ─── */
export const Icons = {
  chevronDown: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>,
  chevronUp: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 15 12 9 18 15" /></svg>,
  chevronLeft: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>,
  chevronRight: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>,
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
  pin: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C8.5 2 6 5 6 8c0 3.5 3 4.5 3 9h6c0-4.5 3-5.5 3-9 0-3-2.5-6-6-6z" /><path d="M9 21h6" /></svg>,
  star: <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>,
};

/* ─── UI primitives ─── */
export function Badge({ children, color = '#9ca3af', bg = 'rgba(156,163,175,0.12)' }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 999, background: bg, color, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
      {children}
    </span>
  );
}

export function Button({ children, onClick, variant = 'default', icon, small, fullWidth }) {
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
      style={{ width: fullWidth ? '100%' : undefined, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: small ? '6px 12px' : '10px 16px', borderRadius: 10, background: v.bg, color: v.color, border: v.border, fontSize: small ? 12 : 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)', transition: 'opacity 0.15s, transform 0.15s' }}
      onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      {icon && <span style={{ display: 'inline-flex' }}>{icon}</span>}
      {children}
    </button>
  );
}

export function sortPinned(arr) {
  if (!arr) return [];
  return [...arr].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
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

export function XEmbed({ tweetUrl, fallback }) {
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
      } catch { /* ignore */ }
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

export function ArticleCard({ article, isFeatured = false }) {
  const openLink = () => window.open(article.url, '_blank', 'noopener,noreferrer');

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={openLink}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLink(); } }}
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 14, color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: 10, transition: 'transform 0.15s, border-color 0.15s', outline: 'none' }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 10, background: 'var(--bg-hover)', color: 'var(--accent-light)' }}>{Icons.link}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.35 }}>{article.title}</div>
          {article.pinned && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 6px', borderRadius: 999, background: 'rgba(245,158,11,0.15)', color: '#fbbf24', fontSize: 9, fontWeight: 800, textTransform: 'uppercase' }}>
              {Icons.pin} Pinned
            </span>
          )}
          {isFeatured && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 6px', borderRadius: 999, background: 'rgba(245,158,11,0.15)', color: '#fbbf24', fontSize: 9, fontWeight: 800, textTransform: 'uppercase' }}>
              {Icons.star} Featured
            </span>
          )}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{article.publisher}</div>
      </div>
      {Icons.arrowRight}
    </div>
  );
}

export function AdminNoteCard({ note, isFeatured = false }) {
  const [expanded, setExpanded] = useState(false);
  const TRUNCATE_AT = 140;
  const isLong = note.text.length > TRUNCATE_AT;
  const displayText = expanded || !isLong ? note.text : `${note.text.slice(0, TRUNCATE_AT)}…`;

  return (
    <div style={{ padding: 14, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.18)', borderRadius: 14, marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: '#fbbf24', letterSpacing: '0.05em', marginBottom: 6 }}>
        {SOURCE_TYPE_ICONS.admin_note} Admin note · {note.author}
        {note.pinned && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginLeft: 4, padding: '2px 6px', borderRadius: 999, background: 'rgba(245,158,11,0.2)', color: '#fbbf24', fontSize: 9 }}>
            {Icons.pin} Pinned
          </span>
        )}
        {isFeatured && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginLeft: 4, padding: '2px 6px', borderRadius: 999, background: 'rgba(245,158,11,0.2)', color: '#fbbf24', fontSize: 9 }}>
            {Icons.star} Featured
          </span>
        )}
      </div>
      <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{displayText}</div>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          style={{ marginTop: 8, padding: 0, background: 'transparent', border: 'none', color: 'var(--accent-light)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
        >
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}
    </div>
  );
}

/* ─── Media components ─── */
export function MediaThumb({ item, onClick, overlay, featured = false }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick?.(item)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(item); } }}
      style={{ position: 'relative', border: 'none', padding: 0, borderRadius: 12, overflow: 'hidden', cursor: 'pointer', background: 'var(--bg-elevated)', aspectRatio: '16 / 10', outline: 'none' }}
    >
      <img src={item.url} alt={item.caption} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.25s' }} onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.03)')} onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')} />

      {item.pinned && (
        <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 2 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 7px', borderRadius: 999, background: 'rgba(245,158,11,0.9)', color: '#fff', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            {Icons.pin} Pinned
          </span>
        </div>
      )}

      {featured && (
        <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 2 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 7px', borderRadius: 999, background: 'rgba(245,158,11,0.9)', color: '#fff', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            {Icons.star} Featured
          </span>
        </div>
      )}

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
    </div>
  );
}

export function MediaGrid({ items, onItemClick, maxVisible = 4, featuredId = null }) {
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
          featured={featuredId === item.id}
          overlay={idx === maxVisible - 1 && remaining > 0 ? `+${remaining}` : undefined}
        />
      ))}
    </div>
  );
}

export function Lightbox({ items, index, onClose, onPrev, onNext }) {
  if (!items?.length) return null;
  const item = items[index];
  if (!item) return null;

  const hasPrev = index > 0;
  const hasNext = index < items.length - 1;

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft' && hasPrev) onPrev();
      else if (e.key === 'ArrowRight' && hasNext) onNext();
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hasPrev, hasNext, onClose, onPrev, onNext]);

  const stop = (e) => e.stopPropagation();

  const navStyle = {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.12)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#fff',
    cursor: 'pointer',
    transition: '0.15s',
    zIndex: 2,
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={stop} style={{ position: 'relative', maxWidth: '92vw', maxHeight: '92vh' }}>
        {hasPrev && (
          <button
            type="button"
            className="opt1-lightbox-prev"
            onClick={onPrev}
            style={{ ...navStyle, left: -64 }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.22)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
          >
            {Icons.chevronLeft}
          </button>
        )}
        <img src={item.url} alt={item.caption} style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: 16, display: 'block' }} />
        {hasNext && (
          <button
            type="button"
            className="opt1-lightbox-next"
            onClick={onNext}
            style={{ ...navStyle, right: -64 }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.22)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
          >
            {Icons.chevronRight}
          </button>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 600 }}>
            {index + 1} / {items.length}
          </div>
          <div style={{ color: '#fff', fontSize: 14, textAlign: 'center', fontWeight: 600 }}>{item.caption}</div>
        </div>
      </div>
    </div>
  );
}

/* ─── Theme wrapper ─── */
export function ThemeShell({ children, theme = 'dark', scrollable = false }) {
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

  const baseStyle = scrollable
    ? { width: '100%', minHeight: '100vh', overflow: 'visible', display: 'flex', flexDirection: 'column' }
    : { width: '100vw', height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' };

  return (
    <div
      style={{
        ...baseStyle,
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-sans)',
        ...themeStyles[theme],
      }}
    >
      {children}
    </div>
  );
}

export function TopBar({ title, theme, setTheme, backTo, className = '' }) {
  return (
    <div className={className} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', zIndex: 200 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {backTo && (
          <a href={backTo} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 8, background: 'var(--bg-hover)', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 12, fontWeight: 700 }}>
            {Icons.chevronLeft} Back
          </a>
        )}
        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>{title}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>Theme</span>
          <select value={theme} onChange={(e) => setTheme(e.target.value)} style={{ padding: '5px 8px', borderRadius: 8, background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', fontSize: 12 }}>
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </div>
      </div>
    </div>
  );
}

/* ─── Common header for full incident page variants ─── */
export function IncidentHero({ incident }) {
  const sev = SEVERITY_LABELS[incident.severity] || SEVERITY_LABELS[3];
  const ver = VERIFICATION[incident.verification] || VERIFICATION.unverified;
  return (
    <div style={{ padding: '28px 0', borderBottom: '1px solid var(--border-subtle)', marginBottom: 24 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <Badge color={sev.color} bg={`${sev.color}1f`}>{sev.label}</Badge>
        <Badge color={ver.color} bg={ver.bg}>{ver.label}</Badge>
        <Badge color="#38bdf8" bg="rgba(56,189,248,0.12)">{incident.status}</Badge>
      </div>
      <h1 style={{ margin: '0 0 14px', fontSize: 32, fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
        {incident.title}
      </h1>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, fontSize: 14, color: 'var(--text-secondary)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{Icons.mapPin} {incident.location}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{Icons.calendar} {formatDate(incident.startDate)} · {formatTime(incident.startDate)}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{Icons.hash} {incident.category}</span>
      </div>
      <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.65, margin: '16px 0 0', maxWidth: 820 }}>{incident.description}</p>
    </div>
  );
}
