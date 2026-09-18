// IntelMap24 mobile — shared constants.
// Mirrors src/shared/constants.js (web). Keep values in sync manually,
// or wire Metro watchFolders to import @shared directly (decided in P1).

export const API_BASE_URL = 'http://10.0.2.2:3100/api/v1'; // Android emulator → host localhost
export const MARTIN_URL = 'http://10.0.2.2:8080';

// From Google Cloud console → OAuth web client ID; required by
// @react-native-google-signin so Google returns an idToken for the backend.
export const GOOGLE_WEB_CLIENT_ID = 'PASTE_GOOGLE_WEB_CLIENT_ID.apps.googleusercontent.com';

export const SEVERITY_LEVELS = [1, 2, 3, 4, 5];

// Placeholder severities (mirrors the mobile UI prototype; real labels come from the backend later)
export const SEVERITIES = [
  { n: 1, name: 'Minimal', color: '#4ade80' },
  { n: 2, name: 'Low', color: '#fbbf24' },
  { n: 3, name: 'Moderate', color: '#fb923c' },
  { n: 4, name: 'Severe', color: '#f87171' },
  { n: 5, name: 'Critical', color: '#dc2626' },
];
export const SEVERITY_NAMES = SEVERITIES.map((s) => s.name);

// Incident domains (mirrors the mobile UI prototype). `slug` matches the
// backend `domains.slug` taxonomy (docs/migrations/add-domains-and-categories.sql)
// and keys layer visibility + client-side filtering against incident.domain_slug.
export const DOMAINS = [
  { code: 'cr', name: 'Conflict', slug: 'conflict', color: '#ef4444' },
  { code: 'bo', name: 'Terrorism & Asymmetric', slug: 'terrorism-asymmetric', color: '#f59e0b' },
  { code: 'ct', name: 'Counter-Terrorism & Security Ops', slug: 'counter-terrorism', color: '#f87171' },
  { code: 'cu', name: 'Civil Unrest', slug: 'civil-unrest', color: '#fbbf24' },
  { code: 'mp', name: 'Military Posture & Movement', slug: 'military-posture', color: '#9ca3af' },
  { code: 'nh', name: 'Natural Hazard', slug: 'natural-hazard', color: '#60a5fa' },
  { code: 'ii', name: 'Infrastructure & Industrial', slug: 'infrastructure', color: '#c4b5fd' },
  { code: 'he', name: 'Health Emergency', slug: 'health-emergency', color: '#22c55e' },
  { code: 'hm', name: 'Humanitarian & Migration', slug: 'humanitarian', color: '#facc15' },
  { code: 'pg', name: 'Political & Governance', slug: 'political', color: '#2dd4bf' },
  { code: 'ci', name: 'Cyber & Information', slug: 'cyber', color: '#38bdf8' },
  { code: 'ma', name: 'Maritime', slug: 'maritime', color: '#3b82f6' },
  { code: 'es', name: 'Economic Shock', slug: 'economic', color: '#a3e635' },
  { code: 'en', name: 'Environmental', slug: 'environmental', color: '#4ade80' },
  { code: 'cw', name: 'CBRN & WMD', slug: 'cbrn-wmd', color: '#7f1d1d' },
  { code: 'ta', name: 'Transport & Aviation', slug: 'transport', color: '#a78bfa' },
  { code: 'in', name: 'Intelligence', slug: 'intelligence', color: '#818cf8' },
];

// Zone overlay categories (mirrors the mobile UI prototype). `slug` matches the
// backend `zone_categories.slug` taxonomy (seeds.sql); incident rows carry no
// zone-category slug, so zones are matched by `zone_category_name` → `name`.
export const ZONE_OVERLAYS = [
  { code: 'nt', name: 'NOTAM', slug: 'notam', color: '#a78bfa' },
  { code: 'nm', name: 'NOTMAR', slug: 'notmar', color: '#60a5fa' },
  { code: 'cu', name: 'Curfew', slug: 'curfew', color: '#fbbf24' },
  { code: 'nf', name: 'No-Fly Zone', slug: 'no-fly-zone', color: '#ef4444' },
  { code: 'me', name: 'Maritime Exclusion Zone', slug: 'maritime-exclusion-zone', color: '#3b82f6' },
  { code: 'pa', name: 'Protest Area', slug: 'protest-area', color: '#f59e0b' },
  { code: 'ev', name: 'Evacuation Zone', slug: 'evacuation-zone', color: '#4ade80' },
  { code: 'sh', name: 'Shelter-in-Place', slug: 'shelter-in-place', color: '#2dd4bf' },
];

export const EVENT_STATUSES = ['active', 'resolved'];

export const VERIFICATION_STATUSES = ['unverified', 'verified', 'disputed', 'debunked'];

export const USER_ROLES = ['public_user'];

// Token storage keys
export const STORAGE_KEYS = {
  JWT: 'intelmap24_jwt',
  USER: 'intelmap24_user',
  THEME: 'intelmap24_mobile_theme',
  REDUCE_MOTION: 'intelmap24_mobile_reduce_motion',
  LAYERS: 'intelmap24_mobile_layers',
};
