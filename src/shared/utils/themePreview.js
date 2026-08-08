/**
 * Token preview boot snippet — dev tool (Theme Lab) for live brand-accent
 * overrides across all three apps.
 *
 * Wire-up: import { applyTokenPreview } from '@shared/utils/themePreview.js'
 * and call it FIRST in each app's main.jsx, before createRoot/render.
 *
 * Flow:
 * 1. `?tokens=<base64url-json>` in the URL → decode, apply, persist to
 *    sessionStorage ('intelmap24_token_preview') so intra-app navigation keeps
 *    the preview, then strip the param via history.replaceState.
 * 2. No param but sessionStorage has a map → re-apply it.
 * 3. While active, a small fixed "THEME PREVIEW ✕" badge floats bottom-right;
 *    ✕ clears sessionStorage + the inline overrides and reloads.
 *
 * Map format: flat { "--var": "value" } — every key starting with '--' is
 * applied via documentElement.style.setProperty. One extension: a non-'--'
 * key `__light` may hold a nested { "--var": "value" } map of light-theme
 * values. Inline :root overrides beat the stylesheet in BOTH themes, so a
 * MutationObserver swaps each token between the base value and its __light
 * counterpart as [data-theme] flips. Plain maps without `__light` behave
 * exactly as the flat spec.
 */

const STORAGE_KEY = 'intelmap24_token_preview';
const BADGE_ID = 'intelmap24-token-preview-badge';
const LIGHT_KEY = '__light';

let currentMap = null;
let themeObserver = null;

export function encodeTokenParam(map) {
  return btoa(JSON.stringify(map)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeTokenParam(b64) {
  const s = String(b64).replace(/-/g, '+').replace(/_/g, '/');
  const padded = s + '='.repeat((4 - (s.length % 4)) % 4);
  return JSON.parse(atob(padded));
}

function applyMap(map) {
  const root = document.documentElement;
  const light = map[LIGHT_KEY] && typeof map[LIGHT_KEY] === 'object' ? map[LIGHT_KEY] : null;
  const isLight = root.getAttribute('data-theme') === 'light';
  for (const [key, value] of Object.entries(map)) {
    if (!key.startsWith('--')) continue;
    let v = value;
    if (isLight && light && typeof light[key] === 'string') v = light[key];
    root.style.setProperty(key, v);
  }
}

function watchTheme() {
  if (themeObserver) return;
  themeObserver = new MutationObserver(() => {
    if (currentMap) applyMap(currentMap);
  });
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
}

function ensureBadge() {
  if (document.getElementById(BADGE_ID)) return;
  const el = document.createElement('div');
  el.id = BADGE_ID;
  el.style.cssText = [
    'position:fixed', 'bottom:12px', 'right:12px', 'z-index:99999',
    'display:flex', 'align-items:center', 'gap:6px', 'padding:4px 8px',
    'border-radius:6px',
    'background:var(--bg-elevated,#141416)',
    'color:var(--text-primary,#f5f5f5)',
    'border:1px solid var(--accent,#9f1239)',
    'font:600 10px/1 var(--font-mono,monospace)',
    'letter-spacing:0.08em',
    'box-shadow:0 2px 12px rgba(0,0,0,0.4)',
    'user-select:none',
  ].join(';');
  el.textContent = 'THEME PREVIEW';
  const x = document.createElement('button');
  x.type = 'button';
  x.textContent = '✕';
  x.title = 'Clear token preview';
  x.style.cssText = 'background:none;border:none;color:var(--text-muted,#a3a3a3);cursor:pointer;font:inherit;padding:0 0 0 2px;';
  x.addEventListener('click', () => clearTokenPreview());
  el.appendChild(x);
  document.body.appendChild(el);
}

export function applyTokenPreview() {
  try {
    let map = null;
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('tokens');
    if (raw) {
      map = decodeTokenParam(raw);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(map));
      params.delete('tokens');
      const qs = params.toString();
      window.history.replaceState(null, '', window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash);
    } else {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) map = JSON.parse(stored);
    }
    if (!map || typeof map !== 'object') return false;
    currentMap = map;
    applyMap(map);
    watchTheme();
    ensureBadge();
    return true;
  } catch {
    return false;
  }
}

export function clearTokenPreview({ reload = true } = {}) {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    const map = currentMap || (stored ? JSON.parse(stored) : null);
    if (map && typeof map === 'object') {
      const keys = new Set(Object.keys(map));
      if (map[LIGHT_KEY] && typeof map[LIGHT_KEY] === 'object') {
        Object.keys(map[LIGHT_KEY]).forEach((k) => keys.add(k));
      }
      keys.forEach((k) => {
        if (k.startsWith('--')) document.documentElement.style.removeProperty(k);
      });
    }
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {}
  currentMap = null;
  if (themeObserver) {
    themeObserver.disconnect();
    themeObserver = null;
  }
  document.getElementById(BADGE_ID)?.remove();
  if (reload) window.location.reload();
}
