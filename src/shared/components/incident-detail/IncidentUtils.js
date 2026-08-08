import { format, formatDistanceToNow } from 'date-fns';

// Colors are CSS tokens (design-tokens.css --sev-*/--ver-*) — single source of truth.
// var() strings work in inline styles; JS doing hex math must resolve via getCssVar()
// (themeColors.js badge helpers do this internally via resolveColor).
export const SEVERITY_LABELS = {
  1: { label: 'Minor', color: 'var(--sev-1)' },
  2: { label: 'Low', color: 'var(--sev-2)' },
  3: { label: 'Moderate', color: 'var(--sev-3)' },
  4: { label: 'High', color: 'var(--sev-4)' },
  5: { label: 'Critical', color: 'var(--sev-5)' },
};

export const VERIFICATION = {
  verified: { label: 'Verified', color: 'var(--ver-verified)', bg: 'color-mix(in srgb, var(--ver-verified) 12%, transparent)' },
  unverified: { label: 'Unverified', color: 'var(--ver-unverified)', bg: 'color-mix(in srgb, var(--ver-unverified) 12%, transparent)' },
  disputed: { label: 'Disputed', color: 'var(--ver-disputed)', bg: 'color-mix(in srgb, var(--ver-disputed) 12%, transparent)' },
  debunked: { label: 'Debunked', color: 'var(--ver-debunked)', bg: 'color-mix(in srgb, var(--ver-debunked) 12%, transparent)' },
};

export const SOURCE_TYPE_LABELS = {
  media: 'Media',
  x_post: 'Posts',
  news_article: 'Articles',
  admin_note: 'Notes',
};

export const ALL_SOURCE_TYPES = ['media', 'x_post', 'news_article', 'admin_note'];

export function formatDate(iso) {
  if (!iso) return '—';
  try {
    return format(new Date(iso), 'MMM d, yyyy');
  } catch {
    return '—';
  }
}

export function formatTime(iso) {
  if (!iso) return '';
  try {
    return format(new Date(iso), 'h:mm a');
  } catch {
    return '';
  }
}

export function relativeTime(iso) {
  if (!iso) return '';
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return '';
  }
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

export function countEvidence(event) {
  return countSources(event?.sources);
}

export function sortPinned(items = [], featuredId = null) {
  const priority = (item) => {
    if (item.featured || (featuredId && item.id === featuredId)) return 2;
    return item.pinned ? 1 : 0;
  };
  return [...items].sort((a, b) => priority(b) - priority(a));
}

export function parseCoordinates(str) {
  if (!str) return null;
  const [lat, lng] = String(str).split(',').map((s) => parseFloat(s.trim()));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}
