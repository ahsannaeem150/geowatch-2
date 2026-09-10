// IntelMap24 mobile theme tokens — JS port of the mobile UI prototype
// (src/mobile-app/index.html :root / [data-theme="light"] blocks, Turquoise brand).
// Dark-first; light overrides mirror the [data-theme="light"] block.

export const BRAND = {
  accent: '#0e4f4a',
  accentLight: '#14b8a6',
};

export const FONTS = {
  head: 'Space Grotesk',
  mono: 'JetBrains Mono',
};

export const dark = {
  accent: BRAND.accent,
  accentLight: BRAND.accentLight,
  accentGlow: 'rgba(14,79,74,.35)',
  accentGlowStrong: 'rgba(20,184,166,.55)',
  accentSubtleBg: 'rgba(20,184,166,.08)',
  accentSubtleBorder: 'rgba(20,184,166,.25)',
  bgDeep: '#050505',
  bgSurface: '#0a0a0c',
  bgElevated: '#121215',
  bgHover: '#1a1a1e',
  bgInput: '#0f0f11',
  bgGlass: 'rgba(10,10,12,.85)',
  borderSubtle: '#242429',
  borderDefault: 'rgba(148,163,184,.12)',
  textPrimary: '#f2f2f2',
  textSecondary: '#9ca3af',
  textMuted: '#8b919b',
  danger: '#dc2626',
  success: '#22c55e',
  sev1: '#4ade80',
  sev2: '#fbbf24',
  sev3: '#fb923c',
  sev4: '#f87171',
  sev5: '#dc2626',
  catConflict: '#ef4444',
  catUnrest: '#f59e0b',
  catEnv: '#4ade80',
  catMaritime: '#60a5fa',
  catCurfew: '#a78bfa',
  catTerror: '#f87171',
  fontHead: FONTS.head,
  fontMono: FONTS.mono,
  // CSS-only composites — kept for parity; RN screens approximate with bgDeep
  pageBg:
    'radial-gradient(ellipse at 50% -20%, rgba(14,79,74,.25), transparent 60%), #050505',
  sheetShadow: '0 -12px 48px rgba(0,0,0,.6)',
};

export const light = {
  ...dark,
  accentGlow: 'rgba(14,79,74,.12)',
  accentGlowStrong: 'rgba(20,184,166,.35)',
  accentSubtleBg: '#EFFAF9',
  accentSubtleBorder: '#D0F1ED',
  bgDeep: '#ffffff',
  bgSurface: '#f9fafb',
  bgElevated: '#f3f4f6',
  bgHover: '#f3f4f6',
  bgInput: '#ffffff',
  bgGlass: 'rgba(255,255,255,.92)',
  borderSubtle: '#d1d5db',
  borderDefault: '#c3c9d1',
  textPrimary: '#111827',
  textSecondary: '#4b5563',
  textMuted: '#525c6b',
  danger: '#dc2626',
  success: '#16a34a',
  sev1: '#15803d',
  sev2: '#b45309',
  sev3: '#c2410c',
  sev4: '#b91c1c',
  sev5: '#991b1b',
  pageBg:
    'radial-gradient(ellipse at 50% -20%, rgba(20,184,166,.10), transparent 60%), #f3f4f6',
  sheetShadow: '0 -8px 32px rgba(17,24,39,.15)',
};

export const THEMES = { dark, light };
