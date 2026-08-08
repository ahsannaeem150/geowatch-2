import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Palette, RotateCcw, Copy, Check, ExternalLink, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@shared/components/Button.jsx';
import { Badge } from '@shared/components/Badge.jsx';
import { SeverityBadge } from '@shared/components/SeverityBadge.jsx';
import { VERIFICATION_CONFIG } from '@shared/constants.js';
import {
  applyTokenPreview,
  clearTokenPreview,
  encodeTokenParam,
} from '@shared/utils/themePreview.js';
import BrandLogo from '../components/Brand/BrandLogo.jsx';

const DRAFT_KEY = 'intelmap24_theme_lab_draft';
const STORAGE_KEY = 'intelmap24_token_preview';

/* ─── Color math ─── */

function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
  if (!m) return { r: 0, g: 0, b: 0 };
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(r, g, b) {
  const p = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${p(r)}${p(g)}${p(b)}`;
}

// t = fraction of fg over bg (per-channel, rounded)
function mixHex(fg, bg, t) {
  const f = hexToRgb(fg);
  const b = hexToRgb(bg);
  return rgbToHex(f.r * t + b.r * (1 - t), f.g * t + b.g * (1 - t), f.b * t + b.b * (1 - t));
}

function rgbaString(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/* ─── Derivation recipes — mirror src/shared/design-tokens.css BRAND ACCENT ───
   kinds: rgba   → rgba(source, alpha)
          mix    → solid: source at t over `on`
          solid  → source hex as-is
          gradient → bg-gradient with (source at t over `on`) as the 0% stop   */

const GRADIENT_SHAPE = 'radial-gradient(ellipse 80% 55% at 50% -5%, %s 0%, var(--bg-deep) 55%)';

const DERIVED = {
  dark: [
    { key: '--accent-glow', kind: 'rgba', from: 'base', alpha: 0.35 },
    { key: '--accent-glow-strong', kind: 'rgba', from: 'light', alpha: 0.55 },
    { key: '--accent-subtle-bg', kind: 'rgba', from: 'light', alpha: 0.08 },
    { key: '--accent-subtle-border', kind: 'rgba', from: 'light', alpha: 0.25 },
    { key: '--accent-hover-bg', kind: 'rgba', from: 'light', alpha: 0.15 },
    { key: '--border-focus', kind: 'solid', from: 'light' },
    { key: '--bg-gradient', kind: 'gradient', from: 'base', on: '#050505', t: 0.22 },
  ],
  light: [
    { key: '--accent-glow', kind: 'rgba', from: 'base', alpha: 0.12 },
    { key: '--accent-glow-strong', kind: 'rgba', from: 'light', alpha: 0.2 },
    { key: '--accent-subtle-bg', kind: 'mix', from: 'light', on: '#ffffff', t: 0.07 },
    { key: '--accent-subtle-border', kind: 'mix', from: 'light', on: '#ffffff', t: 0.2 },
    { key: '--accent-hover-bg', kind: 'mix', from: 'light', on: '#ffffff', t: 0.12 },
    { key: '--border-focus', kind: 'solid', from: 'light' },
    { key: '--bg-gradient', kind: 'gradient', from: 'light', on: '#ffffff', t: 0.1 },
  ],
};

function rowSourceColor(row, section) {
  return row.from === 'base' ? section.base : section.light;
}

// Solid color a row derives (before alpha) — used for the override picker default.
function rowDerivedColor(row, section) {
  const src = rowSourceColor(row, section);
  if (row.kind === 'mix' || row.kind === 'gradient') return mixHex(src, row.on, row.t);
  return src;
}

function rowNote(row) {
  const src = row.from === 'base' ? 'base' : 'light';
  if (row.kind === 'rgba') return `rgba(${src}, ${row.alpha})`;
  if (row.kind === 'mix') return `${src} ${Math.round(row.t * 100)}% on ${row.on}`;
  if (row.kind === 'gradient') return `gradient: ${src} ${Math.round(row.t * 100)}% on ${row.on} → var(--bg-deep)`;
  return src;
}

function computeRow(row, section, override) {
  const src = rowSourceColor(row, section);
  if (row.kind === 'rgba') {
    return rgbaString(override?.color || src, override?.alpha ?? row.alpha);
  }
  if (row.kind === 'mix') {
    return override?.color || mixHex(src, row.on, row.t);
  }
  if (row.kind === 'gradient') {
    const start = override?.color || mixHex(src, row.on, row.t);
    return GRADIENT_SHAPE.replace('%s', start);
  }
  return override?.color || src;
}

function computeTheme(section, themeKey) {
  const overrides = section.overrides || {};
  const out = {
    '--accent': section.base,
    '--accent-light': section.light,
  };
  for (const row of DERIVED[themeKey]) {
    out[row.key] = computeRow(row, section, overrides[row.key]);
  }
  return out;
}

/* ─── Presets ─── */

const PRESETS = [
  { name: 'Crimson Seal', base: '#5a011c', light: '#9f1239' },
  { name: 'Logo Blue', base: '#0369a1', light: '#0ea5e9' },
  { name: 'Emerald', base: '#065f46', light: '#10b981' },
  { name: 'Amber', base: '#92400e', light: '#f59e0b' },
  { name: 'Violet', base: '#5b21b6', light: '#8b5cf6' },
  // Template-derived (owner reference images, dark + fashion-glow aesthetics)
  { name: 'Mint Slate', base: '#134e4a', light: '#5eead4', note: 'Template: mint/teal glow' },
  { name: 'Glacier Blue', base: '#1e3a5f', light: '#93c5fd', note: 'Template: icy powder-blue glow' },
  { name: 'Dusty Rose', base: '#5b2c3d', light: '#e3a8bd', note: 'Template: dusty pink glow' },
  { name: 'Orchid Purple', base: '#6b21a8', light: '#c084fc', note: 'Template: violet-purple glow — pinker than Violet' },
  { name: 'Midnight Navy', base: '#232b52', light: '#6d7fc4', note: 'Template: deep navy button on white' },
  // Tactical picks for an intel platform
  { name: 'Radar Green', base: '#14532d', light: '#4ade80', note: 'Tactical: radar/sonar green' },
  { name: 'Signal Orange', base: '#9a3412', light: '#fb923c', note: 'Tactical: signal/flare orange' },
  { name: 'Steel Mono', base: '#334155', light: '#94a3b8', note: 'Tactical: neutral minimal option' },
  { name: 'Pure Mono', base: '#0a0a0a', light: '#f5f5f5', note: 'pure black & white — zero hue' },
  // Dark-shaded pairs — both shades stay deep/rich (crimson-like depth)
  { name: 'Deep Navy', base: '#0e1e3a', light: '#1f3f7a', note: 'dark navy — crimson-like depth, both themes' },
  { name: 'Petrol Teal', base: '#06333a', light: '#0f5c66', note: 'dark petrol teal' },
  { name: 'Deep Forest', base: '#0f2e1d', light: '#1d5238', note: 'dark forest green' },
  { name: 'Deep Plum', base: '#32104a', light: '#55207a', note: 'dark plum purple' },
  { name: 'Deep Bronze', base: '#3d2a10', light: '#6b4a1e', note: 'dark bronze / brown' },
  { name: 'Ink Slate', base: '#1a2332', light: '#32455c', note: 'dark ink slate, near-neutral' },
  // Deep-shade tuning, round 2 — deep base + rich light
  { name: 'Lilac', base: '#452a63', light: '#9b7fc7', note: 'soft lilac purple' },
  { name: 'Lavender', base: '#3b3674', light: '#7c82c9', note: 'blue-toned lavender' },
  { name: 'Burgundy', base: '#4d0e20', light: '#8c1d40', note: 'deep wine burgundy' },
  { name: 'Pine Green', base: '#0d3b2a', light: '#1a7a54', note: 'deep pine, slightly blue-green' },
  { name: 'Olive', base: '#2c340e', light: '#5a6e26', note: 'dark olive drab' },
  { name: 'Turquoise', base: '#0e4f4a', light: '#14b8a6', note: 'bright turquoise accent' },
];

const DEFAULT_SECTION = { base: '#5a011c', light: '#9f1239', overrides: {} };

function sanitizeSection(s) {
  if (!s || typeof s !== 'object') return { ...DEFAULT_SECTION, overrides: {} };
  const hex = (v, fb) => (/^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : fb);
  return {
    base: hex(s.base, DEFAULT_SECTION.base),
    light: hex(s.light, DEFAULT_SECTION.light),
    overrides: s.overrides && typeof s.overrides === 'object' ? s.overrides : {},
  };
}

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p && p.dark && p.light) {
        return { dark: sanitizeSection(p.dark), light: sanitizeSection(p.light) };
      }
    }
  } catch {}
  return { dark: { ...DEFAULT_SECTION, overrides: {} }, light: { ...DEFAULT_SECTION, overrides: {} } };
}

/* ─── Export CSS ─── */

function buildExportCss(darkMap, lightMap, draft) {
  const order = DERIVED.dark.map((r) => r.key);
  const block = (map) =>
    [
      `  --accent: ${map['--accent']};`,
      `  --accent-light: ${map['--accent-light']};`,
      ...order.map((k) => `  ${k}: ${map[k]};`),
    ].join('\n');
  const { r, g, b } = hexToRgb(draft.dark.base);
  const lr = hexToRgb(draft.dark.light);
  return `/* ─── Theme Lab output — paste into src/shared/design-tokens.css, ───
   replacing both existing /* === BRAND ACCENT === */ blocks. ─── */

:root {
  /* === BRAND ACCENT === */
${block(darkMap)}
  /* === /BRAND ACCENT === */
}

[data-theme="light"] {
  /* === BRAND ACCENT === */
${block(lightMap)}
  /* === /BRAND ACCENT === */
}

/* ─── superadmin-web src/styles/tokens.css — suggested --sa-accent* ramp ─── */
:root {
  --sa-accent: ${draft.dark.base};
  --sa-accent-light: ${draft.dark.light};
  --sa-accent-glow: rgba(${r}, ${g}, ${b}, 0.35);
  --sa-accent-strong: rgba(${lr.r}, ${lr.g}, ${lr.b}, 0.55);
}

/* ─── Logo SVGs (public/brand/intelmap24-*.svg, every app) ───
   Set --brand-1: ${draft.dark.light}; --brand-2: ${draft.dark.base};
   Leave --text / --alert / --bg as they are.
   Then regenerate PNG favicons:  node scripts/rasterize-favicon.mjs */
`;
}

/* ─── Small UI pieces ─── */

function ColorField({ label, value, onChange }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  const commit = (raw) => {
    setText(raw);
    const v = raw.startsWith('#') ? raw : `#${raw}`;
    if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange(v.toLowerCase());
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: 44,
          height: 32,
          padding: 2,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-sm)',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      />
      <input
        type="text"
        value={text}
        onChange={(e) => commit(e.target.value)}
        spellCheck={false}
        style={{
          width: 88,
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          padding: '6px 8px',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--text-primary)',
        }}
      />
      <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>{label}</span>
    </div>
  );
}

function DerivedRow({ row, section, override, computed, onOverride, onClear }) {
  const pickerValue = override?.color || rowDerivedColor(row, section);
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 0',
        borderTop: '1px solid var(--border-subtle)',
        fontSize: 11,
      }}
    >
      <span
        title={computed}
        style={{
          width: 18,
          height: 18,
          borderRadius: 4,
          background: computed,
          border: '1px solid var(--border-default)',
          flexShrink: 0,
        }}
      />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontSize: 11 }}>
          {row.key}
          {override && (
            <span style={{ color: 'var(--accent-light)', marginLeft: 6, fontWeight: 700 }}>override</span>
          )}
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: 10 }}>{rowNote(row)}</div>
      </div>
      <input
        type="color"
        value={pickerValue}
        onChange={(e) => onOverride({ ...(override || {}), color: e.target.value })}
        style={{
          width: 30,
          height: 24,
          padding: 1,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          borderRadius: 4,
          cursor: 'pointer',
          flexShrink: 0,
        }}
      />
      {row.kind === 'rgba' && (
        <input
          type="number"
          min={0}
          max={1}
          step={0.01}
          value={override?.alpha ?? row.alpha}
          onChange={(e) => {
            const a = Math.max(0, Math.min(1, parseFloat(e.target.value)));
            if (Number.isFinite(a)) onOverride({ color: pickerValue, ...(override || {}), alpha: a });
          }}
          title="alpha"
          style={{
            width: 56,
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            padding: '3px 4px',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            borderRadius: 4,
            color: 'var(--text-primary)',
            flexShrink: 0,
          }}
        />
      )}
      <button
        type="button"
        onClick={onClear}
        disabled={!override}
        title="Clear override"
        style={{
          background: 'none',
          border: 'none',
          color: override ? 'var(--text-muted)' : 'var(--text-disabled)',
          cursor: override ? 'pointer' : 'default',
          padding: 2,
          display: 'flex',
          flexShrink: 0,
        }}
      >
        <RotateCcw size={12} />
      </button>
    </div>
  );
}

function ThemeSection({ title, hint, themeKey, section, onChange }) {
  const [advOpen, setAdvOpen] = useState(false);
  const computed = computeTheme(section, themeKey);
  const setOverride = (key, ov) =>
    onChange({ ...section, overrides: { ...(section.overrides || {}), [key]: ov } });
  const clearOverride = (key) => {
    const next = { ...(section.overrides || {}) };
    delete next[key];
    onChange({ ...section, overrides: next });
  };
  return (
    <div className="console-card" style={{ padding: 20 }}>
      <div style={{ marginBottom: 14 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{title}</h3>
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{hint}</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
        <ColorField
          label="Accent — base"
          value={section.base}
          onChange={(v) => onChange({ ...section, base: v })}
        />
        <ColorField
          label="Accent — light"
          value={section.light}
          onChange={(v) => onChange({ ...section, light: v })}
        />
      </div>
      <button
        type="button"
        onClick={() => setAdvOpen((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'none',
          border: 'none',
          padding: 0,
          color: 'var(--text-secondary)',
          fontSize: 12,
          fontWeight: 700,
          cursor: 'pointer',
          marginBottom: advOpen ? 8 : 0,
        }}
      >
        {advOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        Derived tokens ({DERIVED[themeKey].length}) — advanced overrides
      </button>
      {advOpen && (
        <div>
          {DERIVED[themeKey].map((row) => (
            <DerivedRow
              key={row.key}
              row={row}
              section={section}
              override={(section.overrides || {})[row.key]}
              computed={computed[row.key]}
              onOverride={(ov) => setOverride(row.key, ov)}
              onClear={() => clearOverride(row.key)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Component preview mocks ─── */

const previewLabel = {
  fontSize: 10,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '1px',
  color: 'var(--text-muted)',
  marginBottom: 8,
};

function PreviewPanel() {
  return (
    <div className="console-card" style={{ padding: 20 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Component Preview</h3>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
        Reflects the live tokens. Severity and verification colors must NOT change — that is the
        sanity signal that only the brand accent moved.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
        <div>
          <div style={previewLabel}>Buttons</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
          </div>
        </div>

        <div>
          <div style={previewLabel}>Badges — accent vs severity (fixed) vs verification (fixed)</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <Badge color="var(--accent-light)">Accent</Badge>
            <SeverityBadge level={4} />
            {Object.entries(VERIFICATION_CONFIG).map(([key, cfg]) => (
              <span
                key={key}
                style={{
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-pill)',
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: cfg.color,
                  border: `1px solid ${cfg.color}`,
                }}
              >
                {cfg.label}
              </span>
            ))}
          </div>
        </div>

        <div>
          <div style={previewLabel}>Category chip</div>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 12px',
              borderRadius: 'var(--radius-pill)',
              fontSize: 11,
              fontWeight: 700,
              background: 'var(--accent-subtle-bg)',
              border: '1px solid var(--accent-subtle-border)',
              color: 'var(--accent-light)',
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-light)' }} />
            Air Strike
          </span>
        </div>

        <div>
          <div style={previewLabel}>Focus ring (click the input)</div>
          <input
            className="tl-input"
            type="text"
            placeholder="Focus shows --border-focus + --accent-glow"
            style={{
              width: '100%',
              padding: '8px 12px',
              fontSize: 13,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div>
          <div style={previewLabel}>Drawer card (v5-style mock)</div>
          <div
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: 14,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>Blackout across Kharkiv grid</span>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-pill)',
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.6px',
                  background: 'var(--accent-subtle-bg)',
                  border: '1px solid var(--accent-subtle-border)',
                  color: 'var(--accent-light)',
                }}
              >
                CONFLICT
              </span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
              Multiple substations reported offline after strikes; restoration crews dispatched.
            </p>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              3 sources · 5 updates · 2h ago
            </div>
          </div>
        </div>

        <div>
          <div style={previewLabel}>Timeline row (mock)</div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 3 }}>
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: 'var(--accent-light)',
                  boxShadow: '0 0 8px var(--accent-glow-strong)',
                  flexShrink: 0,
                }}
              />
              <div style={{ width: 2, flex: 1, minHeight: 28, background: 'var(--border-subtle)' }} />
            </div>
            <div>
              <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: 2 }}>
                2026-08-08 14:32 UTC
              </div>
              <div style={{ fontSize: 13, marginBottom: 4 }}>Strike reported near airport perimeter</div>
              <span style={{ fontSize: 10, color: 'var(--accent-light)', fontWeight: 700 }}>Reuters · source attached</span>
            </div>
          </div>
        </div>

        <div>
          <div style={previewLabel}>Map pin (mock)</div>
          <svg
            width="30"
            height="38"
            viewBox="0 0 24 32"
            style={{ filter: 'drop-shadow(0 0 8px var(--accent-glow-strong))' }}
          >
            <path
              d="M12 0C5.9 0 1 4.9 1 11c0 7.2 9.6 19.6 10.3 20.4a1 1 0 0 0 1.4 0C13.4 30.6 23 18.2 23 11 23 4.9 18.1 0 12 0z"
              fill="var(--accent)"
            />
            <circle cx="12" cy="11" r="5" fill="var(--accent-light)" />
          </svg>
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <div style={previewLabel}>Topbar strip (mock)</div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 12px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <BrandLogo variant="mark" height={20} />
            <span style={{ fontSize: 13, fontWeight: 700 }}>IntelMap24</span>
            <span
              style={{
                marginLeft: 10,
                padding: '3px 10px',
                borderRadius: 'var(--radius-pill)',
                background: 'var(--accent-subtle-bg)',
                border: '1px solid var(--accent-subtle-border)',
                color: 'var(--accent-light)',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.6px',
              }}
            >
              MAP
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Incidents</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Zones</span>
            <span
              style={{
                marginLeft: 'auto',
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: 'var(--accent)',
                color: 'var(--text-on-accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 9,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              SA
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Page ─── */

export default function ThemeLabPage() {
  const [draft, setDraft] = useState(loadDraft);
  const [copied, setCopied] = useState(false);
  const didMount = useRef(false);

  const darkMap = useMemo(() => computeTheme(draft.dark, 'dark'), [draft.dark]);
  const lightMap = useMemo(() => computeTheme(draft.light, 'light'), [draft.light]);
  const fullMap = useMemo(() => ({ ...darkMap, __light: lightMap }), [darkMap, lightMap]);

  // Draft persists separately from the live preview session key
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {}
  }, [draft]);

  // Live apply on every change (not on mount): inline :root overrides win in
  // both themes; sessionStorage arms the boot badge + survives navigation.
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(fullMap));
    } catch {}
    applyTokenPreview();
  }, [fullMap]);

  const applyPreset = (p) =>
    setDraft({
      dark: { base: p.base, light: p.light, overrides: {} },
      light: { base: p.base, light: p.light, overrides: {} },
    });

  const b64 = encodeTokenParam(fullMap);
  const exportCss = buildExportCss(darkMap, lightMap, draft);

  const copyExport = async () => {
    try {
      await navigator.clipboard.writeText(exportCss);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: 1200 }}>
      <style>{`
        .tl-input:focus {
          border-color: var(--border-focus) !important;
          box-shadow: 0 0 0 3px var(--accent-glow);
        }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Palette size={22} style={{ color: 'var(--accent-light)' }} />
            Theme Lab
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
            Brand accent playground — edits apply live (inline :root overrides) and follow you via
            the THEME PREVIEW badge until reset.
          </p>
        </div>
        <Button variant="ghost" onClick={() => clearTokenPreview()}>
          <RotateCcw size={14} /> Reset preview
        </Button>
      </div>

      {/* Presets */}
      <div className="console-card" style={{ padding: 16, marginBottom: 20 }}>
        <div style={{ ...previewLabel, marginBottom: 10 }}>Presets — loads into both themes</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              title={p.note}
              onClick={() => applyPreset(p)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '7px 14px',
                borderRadius: 'var(--radius-pill)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${p.light}, ${p.base})`,
                  border: '1px solid var(--border-default)',
                  flexShrink: 0,
                }}
              />
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Theme sections */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
          gap: 20,
          marginBottom: 20,
        }}
      >
        <ThemeSection
          title="Dark theme"
          hint=":root BRAND ACCENT — rgba ramp"
          themeKey="dark"
          section={draft.dark}
          onChange={(dark) => setDraft((d) => ({ ...d, dark }))}
        />
        <ThemeSection
          title="Light theme"
          hint="[data-theme=&quot;light&quot;] BRAND ACCENT — soft glows, alpha-solidified tints"
          themeKey="light"
          section={draft.light}
          onChange={(light) => setDraft((d) => ({ ...d, light }))}
        />
      </div>

      {/* Preview in other apps */}
      <div className="console-card" style={{ padding: 16, marginBottom: 20 }}>
        <div style={{ ...previewLabel, marginBottom: 10 }}>Preview in other apps (dev servers)</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button variant="secondary" onClick={() => window.open(`http://localhost:5173/?tokens=${b64}`, '_blank', 'noopener')}>
            <ExternalLink size={14} /> Open in user-web ↗
          </Button>
          <Button variant="secondary" onClick={() => window.open(`http://localhost:5174/?tokens=${b64}`, '_blank', 'noopener')}>
            <ExternalLink size={14} /> Open in admin-web ↗
          </Button>
        </div>
      </div>

      {/* Component preview */}
      <div style={{ marginBottom: 20 }}>
        <PreviewPanel />
      </div>

      {/* Export */}
      <div className="console-card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>Finalize — generated CSS</h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Literal computed values (hex/rgba math done here) — replace the BRAND ACCENT blocks in
              src/shared/design-tokens.css, then re-check the sa ramp + logo vars below.
            </p>
          </div>
          <Button variant="secondary" onClick={copyExport}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Copy CSS'}
          </Button>
        </div>
        <pre
          style={{
            margin: 0,
            padding: 16,
            background: 'var(--bg-deep)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            lineHeight: 1.6,
            color: 'var(--text-secondary)',
            overflowX: 'auto',
            whiteSpace: 'pre',
          }}
        >
          {exportCss}
        </pre>
      </div>
    </div>
  );
}
