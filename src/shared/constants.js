// IntelMap24 Shared Constants
// Used by both user-web and admin-web

// Severity/verification colors are CSS tokens (design-tokens.css --sev-*/--ver-*) —
// the single source of truth. var() strings work in inline styles; JS contexts that
// do hex math or string-concat must resolve via getCssVar() from utils/cssVar.js.
export const SEVERITY_SCALE = [
  { value: 1, label: 'Minimal',  color: 'var(--sev-1)', radius: 6 },
  { value: 2, label: 'Low',      color: 'var(--sev-2)', radius: 8 },
  { value: 3, label: 'Moderate', color: 'var(--sev-3)', radius: 10 },
  { value: 4, label: 'Severe',   color: 'var(--sev-4)', radius: 12 },
  { value: 5, label: 'Critical', color: 'var(--sev-5)', radius: 14 },
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
};

export const API_BASE_URL =
  import.meta.env?.VITE_API_URL || 'http://localhost:3100/api/v1';

export const VERIFICATION_STATUS = {
  UNVERIFIED: 'unverified',
  VERIFIED:   'verified',
  DISPUTED:   'disputed',
  DEBUNKED:   'debunked',
};

export const VERIFICATION_CONFIG = {
  unverified: { label: 'Unverified', color: 'var(--ver-unverified)', icon: '?' },
  verified:   { label: 'Verified',   color: 'var(--ver-verified)', icon: '✓' },
  disputed:   { label: 'Disputed',   color: 'var(--ver-disputed)', icon: '⚠' },
  debunked:   { label: 'Debunked',   color: 'var(--ver-debunked)', icon: '✕' },
};

export const MARTIN_URL =
  import.meta.env?.VITE_MARTIN_URL || 'http://localhost:8080';
