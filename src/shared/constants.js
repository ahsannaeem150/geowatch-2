// GeoWatch Shared Constants
// Used by both user-web and admin-web

export const CATEGORY_COLORS = {
  conflict: '#ef4444',
  protest: '#f59e0b',
  disaster: '#a855f7',
  diplomacy: '#3b82f6',
  humanitarian: '#14b8a6',
  other: '#6b7280',
};

export const CATEGORY_LABELS = {
  conflict: 'Conflict',
  protest: 'Protest',
  disaster: 'Disaster',
  diplomacy: 'Diplomacy',
  humanitarian: 'Humanitarian',
  other: 'Other',
};

export const SEVERITY_SCALE = [
  { value: 1, label: 'Minimal',  color: '#4ade80' },
  { value: 2, label: 'Low',      color: '#fbbf24' },
  { value: 3, label: 'Moderate', color: '#fb923c' },
  { value: 4, label: 'Severe',   color: '#f87171' },
  { value: 5, label: 'Critical', color: '#dc2626' },
];

export const EVENT_STATUS = {
  active: 'active',
  resolved: 'resolved',
  hidden: 'hidden',
};

export const SOURCE_TYPES = {
  x_post: 'x_post',
  news_article: 'news_article',
  image: 'image',
  video: 'video',
  admin_note: 'admin_note',
};

export const USER_ROLES = {
  super_admin: 'super_admin',
  admin: 'admin',
  viewer: 'viewer',
};

export const API_BASE_URL =
  import.meta.env?.VITE_API_URL || 'http://localhost:3000/api/v1';

export const MARTIN_URL =
  import.meta.env?.VITE_MARTIN_URL || 'http://localhost:8080';
