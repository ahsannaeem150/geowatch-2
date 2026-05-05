// GeoWatch Shared Constants
// Used by both user-web and admin-web

export const CATEGORY_COLORS = {
  conflict: '#ff4757',
  protest: '#ffa502',
  disaster: '#a55eea',
  diplomacy: '#1e90ff',
  humanitarian: '#26de81',
  other: '#778ca3',
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
  { value: 1, label: 'Minimal', radius: 6 },
  { value: 2, label: 'Low', radius: 8 },
  { value: 3, label: 'Moderate', radius: 10 },
  { value: 4, label: 'High', radius: 12 },
  { value: 5, label: 'Critical', radius: 14 },
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
