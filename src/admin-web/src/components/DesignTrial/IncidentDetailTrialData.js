/* ─────────────────────────────────────────────────────────────────────────────
   Shared dummy incident + timeline for the five incident-detail sidebar options.
   Mirrors the rich shape already used in SidebarTrial2.jsx (media, posts,
   articles and admin notes attached to each update).
   ───────────────────────────────────────────────────────────────────────────── */

export const INCIDENT = {
  id: 'inc-001',
  title: 'IAF AN-32 crashes in Assam, India',
  domain: 'Transport & Aviation',
  domainColor: '#6366f1',
  category: 'Aviation Accident',
  categoryColor: '#9f1239',
  categoryId: 'cat-148',
  zoneCategoryId: 'zone-av-09',
  severity: 3,
  status: 'active',
  verification: 'verified',
  startDate: '2026-06-13T12:03:00Z',
  endDate: null,
  createdAt: '2026-06-13T11:58:00Z',
  updatedAt: '2026-06-13T23:20:00Z',
  createdBy: 'u1',
  createdByName: 'System Administrator',
  createdByEmail: 'admin@geowatch.local',
  createdByRole: 'superadmin',
  resolvedAt: null,
  resolvedBy: null,
  deletedAt: null,
  deletedBy: null,
  deletedByName: null,
  originalStatus: null,
  purgedAt: null,
  geometryType: 'point',
  location: 'Air Force Station Jorhat, Assam, India',
  locationContext: 'Air Force Station Jorhat, Assam, India',
  coordinates: '26.3342, 93.2428',
  areaSqM: null,
  perimeterM: null,
  description:
    'An Indian Air Force (IAF) An-32 transport aircraft crashed during landing at Air Force Station (AFS) Jorhat in Assam. The aircraft was carrying 13 personnel. Rescue operations were launched immediately amid poor weather conditions.',
};

const makeImg = (id, seed, caption) => ({
  id,
  type: 'image',
  url: `https://picsum.photos/seed/${seed}/800/500`,
  caption,
});

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

const makeTweet = (
  id,
  author,
  handle,
  text,
  tweetUrl,
  avatarSeed,
  timestamp = null,
  archived = false,
  archiveUrl = null,
  archivedAt = null,
  archiveReason = null
) => ({
  id,
  type: 'x_post',
  author,
  handle,
  text,
  tweetUrl,
  authorAvatar: `https://picsum.photos/seed/${avatarSeed}/120/120`,
  timestamp,
  archived,
  archiveUrl,
  archivedAt,
  archiveReason,
});

export const TIMELINE = [
  {
    id: 'e1',
    type: 'report',
    timestamp: '2026-06-13T17:00:00Z',
    summary: 'Aircraft reported crashed at AFS Jorhat, Assam.',
    details:
      'First reports emerged from local residents and aviation watchers about a crash during landing in poor weather.',
    verification: 'verified',
    sources: {
      media: MEDIA.crash,
      x_post: [
        makeTweet(
          'xp1',
          'Aviation Spotter',
          '@aviationspotter',
          'AN-32 crash reported at Jorhat. Rescue teams moving in.',
          'https://x.com/Twitter/status/20',
          'avspot',
          '2026-06-13T17:00:00Z',
          true,
          '/archive/p1.png',
          '2026-06-14T00:00:00Z',
          'Original post deleted by author'
        ),
        makeTweet(
          'xp2',
          'IAF MCC',
          '@IAF_MCC',
          'An Indian Air Force (IAF) AN-32 aircraft met with an accident today at Air Force Station Jorhat, Assam. Rescue operations have been launched. More details awaited.',
          'https://x.com/IAF_MCC/status/2065719865890205976',
          'iafmcc',
          '2026-06-13T17:00:00Z'
        ),
      ],
      news_article: [
        {
          id: 'na1',
          publisher: 'The Hindu',
          title: 'IAF aircraft crashes in Assam, rescue operations on',
          url: 'https://www.thehindu.com',
        },
      ],
      admin_note: [
        {
          id: 'an1',
          author: 'Ops Desk',
          text: 'Initial alert received from station control at 17:02 IST. Aircraft last contact at 16:58.',
        },
      ],
    },
  },
  {
    id: 'e2',
    type: 'update',
    timestamp: '2026-06-13T19:30:00Z',
    summary: 'Rescue teams reach crash site amid poor weather.',
    details:
      'Specialized rescue teams from the station and civil administration reached the site. Operations were hampered by rain and low visibility.',
    verification: 'verified',
    sources: {
      media: MEDIA.rescue,
      x_post: [
        makeTweet(
          'xp6',
          'Rescue Watch',
          '@rescue_watch',
          'NDRF and IAF rescue personnel now on site. Weather slowing extraction.',
          'https://x.com/Twitter/status/20',
          'rescue',
          '2026-06-13T19:30:00Z'
        ),
      ],
      news_article: [],
      admin_note: [
        {
          id: 'an3',
          author: 'Ops Desk',
          text: 'Rescue teams reached wreckage at 19:28 IST. Visibility 800m, intermittent rain.',
        },
      ],
    },
  },
  {
    id: 'e3',
    type: 'update',
    timestamp: '2026-06-13T21:02:00Z',
    summary: 'IAF confirms 5 casualties in the incident.',
    details:
      'An official statement from the Indian Air Force confirmed that five personnel have been confirmed dead and the remaining are being treated at the station medical facility.',
    verification: 'verified',
    sources: {
      media: MEDIA.casualties,
      x_post: [
        makeTweet(
          'xp3',
          'Indian Air Force',
          '@airforce_in',
          'With deep regret, IAF confirms 5 personnel have lost their lives in the AN-32 crash at Jorhat. Rescue ops continue.',
          'https://x.com/Twitter/status/20',
          'iaf',
          '2026-06-13T21:02:00Z'
        ),
        makeTweet(
          'xp4',
          'Defence Pro',
          '@defencepro',
          'Five bodies recovered from AN-32 wreckage. Identification process underway.',
          'https://x.com/Twitter/status/20',
          'defpro',
          '2026-06-13T21:02:00Z'
        ),
        makeTweet(
          'xp5',
          'Rahul Reporter',
          '@rahul_reporter',
          'Families of the crew have been informed. Station medical officer issued formal confirmation.',
          'https://x.com/Twitter/status/20',
          'rahul',
          '2026-06-13T21:02:00Z'
        ),
      ],
      news_article: [
        {
          id: 'na2',
          publisher: 'The Hindu',
          title: 'IAF confirms five deaths in Assam AN-32 crash',
          url: 'https://www.thehindu.com',
        },
        {
          id: 'na3',
          publisher: 'NDTV',
          title: '5 Killed After Air Force Plane Crashes In Assam',
          url: 'https://www.ndtv.com',
        },
      ],
      admin_note: [
        {
          id: 'an2',
          author: 'Station Commander',
          text: 'Confirmed casualties via medical officer. Next of kin notification completed at 21:30 IST.',
        },
      ],
    },
  },
  {
    id: 'e4',
    type: 'update',
    timestamp: '2026-06-13T23:15:00Z',
    summary: 'Senior IAF officials visit the crash site.',
    details:
      'The Air Officer Commanding-in-Chief of Eastern Air Command visited the site to review rescue and investigation efforts.',
    verification: 'verified',
    sources: {
      media: MEDIA.officials,
      x_post: [
        makeTweet(
          'xp7',
          'EAC IAF',
          '@eac_iaf',
          'AOC-in-C EAC reached Jorhat to oversee operations and meet the bereaved families.',
          'https://x.com/Twitter/status/20',
          'eac',
          '2026-06-13T23:15:00Z'
        ),
      ],
      news_article: [
        {
          id: 'na4',
          publisher: 'India Today',
          title: 'IAF chief visits Jorhat crash site, orders probe',
          url: 'https://www.indiatoday.in',
        },
      ],
      admin_note: [],
    },
  },
  {
    id: 'e5',
    type: 'update',
    timestamp: '2026-06-14T01:40:00Z',
    summary: 'Court of inquiry ordered into the crash.',
    details:
      'A court of inquiry has been ordered to determine the cause of the accident. Preliminary focus is on weather and landing approach.',
    verification: 'unverified',
    sources: {
      media: [],
      x_post: [],
      news_article: [
        {
          id: 'na5',
          publisher: 'The Print',
          title: 'Court of inquiry ordered after IAF AN-32 crash in Assam',
          url: 'https://theprint.in',
        },
      ],
      admin_note: [
        {
          id: 'an4',
          author: 'Ops Desk',
          text: 'Investigation board constituted. Black box recovery expected at first light.',
        },
      ],
    },
  },
];

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

export const ALL_SOURCE_TYPES = ['media', 'x_post', 'news_article', 'admin_note'];

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

export function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function relativeTime(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function countSources(sources) {
  if (!sources) return 0;
  return (
    (sources.media?.length || 0) +
    (sources.x_post?.length || 0) +
    (sources.news_article?.length || 0) +
    (sources.admin_note?.length || 0)
  );
}

export function sourceCounts(sources) {
  return {
    media: sources?.media?.length || 0,
    x_post: sources?.x_post?.length || 0,
    news_article: sources?.news_article?.length || 0,
    admin_note: sources?.admin_note?.length || 0,
  };
}
