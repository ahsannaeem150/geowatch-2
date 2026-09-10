// IntelMap24 mobile — shared constants.
// Mirrors src/shared/constants.js (web). Keep values in sync manually,
// or wire Metro watchFolders to import @shared directly (decided in P1).

export const API_BASE_URL = 'http://10.0.2.2:3100/api/v1'; // Android emulator → host localhost
export const MARTIN_URL = 'http://10.0.2.2:8080';

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

// Placeholder incident domains (mirrors the mobile UI prototype; real data comes from the backend later)
export const DOMAINS = [
  { code: 'cr', name: 'Conflict', color: '#ef4444' },
  { code: 'bo', name: 'Terrorism & Asymmetric', color: '#f59e0b' },
  { code: 'ct', name: 'Counter-Terrorism & Security Ops', color: '#f87171' },
  { code: 'cu', name: 'Civil Unrest', color: '#fbbf24' },
  { code: 'mp', name: 'Military Posture & Movement', color: '#9ca3af' },
  { code: 'nh', name: 'Natural Hazard', color: '#60a5fa' },
  { code: 'ii', name: 'Infrastructure & Industrial', color: '#c4b5fd' },
  { code: 'he', name: 'Health Emergency', color: '#22c55e' },
  { code: 'hm', name: 'Humanitarian & Migration', color: '#facc15' },
  { code: 'pg', name: 'Political & Governance', color: '#2dd4bf' },
  { code: 'ci', name: 'Cyber & Information', color: '#38bdf8' },
  { code: 'ma', name: 'Maritime', color: '#3b82f6' },
  { code: 'es', name: 'Economic Shock', color: '#a3e635' },
  { code: 'en', name: 'Environmental', color: '#4ade80' },
  { code: 'cw', name: 'CBRN & WMD', color: '#7f1d1d' },
  { code: 'ta', name: 'Transport & Aviation', color: '#a78bfa' },
  { code: 'in', name: 'Intelligence', color: '#818cf8' },
];

// Placeholder zone overlay categories (mirrors the mobile UI prototype; real data comes from the backend later)
export const ZONE_OVERLAYS = [
  { code: 'nt', name: 'NOTAM', color: '#a78bfa' },
  { code: 'nm', name: 'NOTMAR', color: '#60a5fa' },
  { code: 'cu', name: 'Curfew', color: '#fbbf24' },
  { code: 'nf', name: 'No-Fly Zone', color: '#ef4444' },
  { code: 'me', name: 'Maritime Exclusion Zone', color: '#3b82f6' },
  { code: 'pa', name: 'Protest Area', color: '#f59e0b' },
  { code: 'ev', name: 'Evacuation Zone', color: '#4ade80' },
  { code: 'sh', name: 'Shelter-in-Place', color: '#2dd4bf' },
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
};
