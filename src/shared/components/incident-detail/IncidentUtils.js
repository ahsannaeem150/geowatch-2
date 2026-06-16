import { format, formatDistanceToNow } from 'date-fns';

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
