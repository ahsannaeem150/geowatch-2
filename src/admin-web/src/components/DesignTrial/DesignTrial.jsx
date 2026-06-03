import React, { useState, createContext, useContext } from 'react';

const fontImports = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
`;

/* ─── Token Context ─── */
const TokensContext = createContext(null);

function useTokens() {
  const ctx = useContext(TokensContext);
  if (!ctx) throw new Error('useTokens must be used within a TokensContext.Provider');
  return ctx;
}

/* ─── Tactical Tokens ─── */
const TOKENS_TACTICAL = {
  bg: '#050505',
  bgSurface: '#0a0a0c',
  bgElevated: '#121215',
  bgHover: '#1a1a1e',
  border: '#242429',
  borderHover: '#34343a',
  text: '#f2f2f2',
  textSecondary: '#9ca3af',
  textMuted: '#6b7280',

  accent: '#5a011c',
  accentLight: '#9f1239',
  accentGlow: 'rgba(90,1,28,0.35)',
  accentGlowStrong: 'rgba(159,18,57,0.55)',

  danger: '#5a011c',
  dangerLight: '#9f1239',
  warning: '#f59e0b',
  success: '#22c55e',
  info: '#3b82f6',
  purple: '#a855f7',
  teal: '#14b8a6',
  gray: '#6b7280',

  fontSans: "'Space Grotesk', system-ui, sans-serif",
  fontMono: "'JetBrains Mono', monospace",

  radiusSm: '4px',
  radiusMd: '8px',
  radiusLg: '14px',
  radiusXl: '16px',
  radiusPill: '999px',

  labelTransform: 'uppercase',
  labelLetterSpacing: '2px',
  labelFontSize: '11px',
  labelFontWeight: 700,

  grain: true,
  grainOpacity: 0.022,

  pageBackground: 'radial-gradient(ellipse 80% 55% at 50% -5%, #1a0a0e 0%, #050505 55%)',

  shadowCard: '0 2px 8px rgba(0,0,0,0.3)',
  shadowCardHover: '0 8px 32px rgba(0,0,0,0.5)',
  shadowElevated: '0 4px 24px rgba(0,0,0,0.4)',
  shadowModal: '0 24px 64px rgba(0,0,0,0.6)',
  shadowGlow: '0 0 24px',

  bodyLineHeight: 1.5,
  cardPadding: '24px',
  sectionGap: '52px',
  sectionTitleGap: '18px',
  containerPadding: '48px',

  headerGap: '12px',
  headerMarginBottom: '56px',

  cardHoverLift: true,
  dotRadius: '50%',
  accentLineColor: '#5a011c',
};

/* ─── SaaS Tokens (Dark) ─── */
const TOKENS_SAAS_DARK = {
  bg: '#0c0c0c',
  bgSurface: '#141414',
  bgElevated: '#1c1c1c',
  bgHover: '#242424',
  border: 'rgba(255,255,255,0.06)',
  borderHover: 'rgba(255,255,255,0.12)',
  text: '#ffffff',
  textSecondary: '#a1a1aa',
  textMuted: '#71717a',

  accent: '#5a011c',
  accentLight: '#9f1239',
  accentGlow: 'rgba(90,1,28,0.35)',
  accentGlowStrong: 'rgba(159,18,57,0.55)',

  danger: '#5a011c',
  dangerLight: '#9f1239',
  warning: '#f59e0b',
  success: '#22c55e',
  info: '#3b82f6',
  purple: '#a855f7',
  teal: '#14b8a6',
  gray: '#71717a',

  fontSans: "'Inter', system-ui, sans-serif",
  fontMono: "'JetBrains Mono', monospace",

  radiusSm: '6px',
  radiusMd: '10px',
  radiusLg: '14px',
  radiusXl: '18px',
  radiusPill: '999px',

  labelTransform: 'none',
  labelLetterSpacing: '0.3px',
  labelFontSize: '12px',
  labelFontWeight: 600,

  grain: false,
  grainOpacity: 0,

  pageBackground: 'radial-gradient(ellipse 80% 55% at 50% -5%, #1a0a0e 0%, #0c0c0c 55%)',

  shadowCard: '0 2px 8px rgba(0,0,0,0.3)',
  shadowCardHover: '0 8px 32px rgba(0,0,0,0.5)',
  shadowElevated: '0 4px 24px rgba(0,0,0,0.4)',
  shadowModal: '0 24px 64px rgba(0,0,0,0.6)',
  shadowGlow: '0 0 24px',

  bodyLineHeight: 1.6,
  cardPadding: '28px',
  sectionGap: '64px',
  sectionTitleGap: '24px',
  containerPadding: '48px',

  headerGap: '14px',
  headerMarginBottom: '64px',

  cardHoverLift: true,
  dotRadius: '50%',
  accentLineColor: '#5a011c',
};

/* ─── Editorial Tokens ─── */
const TOKENS_EDITORIAL = {
  bg: '#000000',
  bgSurface: '#0a0a0a',
  bgElevated: '#111111',
  bgHover: '#1a1a1a',
  border: '#333333',
  borderHover: '#555555',
  text: '#ffffff',
  textSecondary: '#888888',
  textMuted: '#555555',

  accent: '#9f1239',
  accentLight: '#be123c',
  accentGlow: 'rgba(159,18,57,0.15)',
  accentGlowStrong: 'rgba(190,18,60,0.25)',

  danger: '#9f1239',
  dangerLight: '#be123c',
  warning: '#d97706',
  success: '#16a34a',
  info: '#2563eb',
  purple: '#9333ea',
  teal: '#0d9488',
  gray: '#555555',

  fontSans: "'Inter', system-ui, sans-serif",
  fontMono: "'JetBrains Mono', monospace",

  radiusSm: '0px',
  radiusMd: '0px',
  radiusLg: '0px',
  radiusXl: '0px',
  radiusPill: '0px',

  labelTransform: 'none',
  labelLetterSpacing: '0.3px',
  labelFontSize: '12px',
  labelFontWeight: 500,

  grain: false,
  grainOpacity: 0,

  pageBackground: '#000000',

  shadowCard: 'none',
  shadowCardHover: 'none',
  shadowElevated: 'none',
  shadowModal: 'none',
  shadowGlow: 'none',

  bodyLineHeight: 1.6,
  cardPadding: '28px',
  sectionGap: '64px',
  sectionTitleGap: '24px',
  containerPadding: '48px',

  headerGap: '14px',
  headerMarginBottom: '64px',

  cardHoverLift: false,
  dotRadius: '0px',
  accentLineColor: '#ffffff',
};

/* ─── Components ─── */

function Grain() {
  const d = useTokens();
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 9999,
        opacity: d.grainOpacity,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'repeat',
        backgroundSize: '128px',
      }}
    />
  );
}

function Btn({ children, variant = 'primary', onClick, style = {} }) {
  const d = useTokens();
  const [h, setH] = useState(false);
  const v = {
    primary: { bg: d.accent, color: '#f2f2f2', border: 'none', hBg: d.accentLight, hShadow: `0 4px 24px ${d.accentGlowStrong}` },
    secondary: { bg: 'transparent', color: d.dangerLight, border: `1px solid ${d.dangerLight}50`, hBg: `${d.accent}18`, hShadow: 'none' },
    ghost: { bg: 'transparent', color: d.textSecondary, border: `1px solid ${d.border}`, hBg: d.bgHover, hShadow: 'none' },
  }[variant];
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '9px 18px',
        fontSize: '13px',
        fontWeight: 600,
        fontFamily: d.fontSans,
        letterSpacing: '0.2px',
        borderRadius: d.radiusMd,
        cursor: 'pointer',
        border: v.border,
        background: h ? v.hBg : v.bg,
        color: v.color,
        boxShadow: h ? v.hShadow : 'none',
        transform: (d.cardHoverLift && h) ? 'translateY(-1px)' : 'none',
        transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
        outline: 'none',
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function Inp({ placeholder, icon, style = {}, w = '200px' }) {
  const d = useTokens();
  const [f, setF] = useState(false);
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      {icon && <span style={{ position: 'absolute', left: '12px', fontSize: '13px', opacity: 0.4, pointerEvents: 'none' }}>{icon}</span>}
      <input
        placeholder={placeholder}
        onFocus={() => setF(true)}
        onBlur={() => setF(false)}
        style={{
          height: '40px',
          padding: icon ? '0 12px 0 36px' : '0 14px',
          borderRadius: d.radiusMd,
          border: `1px solid ${f ? d.accentLight : d.border}`,
          background: d.bgSurface,
          color: d.text,
          fontSize: '14px',
          fontFamily: d.fontSans,
          outline: 'none',
          width: w,
          boxShadow: f ? `0 0 0 3px ${d.accentGlow}` : 'none',
          transition: 'all 0.2s ease',
          ...style,
        }}
      />
    </div>
  );
}

function Card({ children, style = {}, pad, accentLeft = false }) {
  const d = useTokens();
  const [h, setH] = useState(false);
  const padding = pad ?? d.cardPadding;
  return (
    <div
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        background: d.bgSurface,
        border: `1px solid ${h ? d.borderHover : d.border}`,
        borderRadius: d.radiusLg,
        padding,
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
        boxShadow: h ? d.shadowCardHover : d.shadowCard,
        transform: (d.cardHoverLift && h) ? 'translateY(-2px)' : 'none',
        ...style,
      }}
    >
      {accentLeft && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: '20px',
            bottom: '20px',
            width: '3px',
            borderRadius: '0 2px 2px 0',
            background: d.accentLineColor,
            opacity: 0.7,
            transition: 'opacity 0.2s ease',
          }}
        />
      )}
      {children}
    </div>
  );
}

function Section({ title, children }) {
  const d = useTokens();
  return (
    <div style={{ marginTop: d.sectionGap }}>
      <div style={{
        fontSize: d.labelFontSize,
        fontWeight: d.labelFontWeight,
        textTransform: d.labelTransform,
        letterSpacing: d.labelLetterSpacing,
        color: d.textMuted,
        marginBottom: d.sectionTitleGap,
        fontFamily: d.fontSans,
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Pill({ children, color, dot = false }) {
  const d = useTokens();
  const c = color || d.accent;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: dot ? '6px' : 0,
        padding: '3px 10px',
        borderRadius: d.radiusPill,
        fontSize: '11px',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.6px',
        fontFamily: d.fontSans,
        background: `${c}1a`,
        color: c,
        border: `1px solid ${c}40`,
      }}
    >
      {dot && <span style={{ width: '5px', height: '5px', borderRadius: d.dotRadius, background: c }} />}
      {children}
    </span>
  );
}

function SeverityStamp({ level = 3 }) {
  const d = useTokens();
  const map = {
    1: { label: 'LOW',         color: '#4ade80' },
    2: { label: 'MODERATE',    color: '#fbbf24' },
    3: { label: 'SIGNIFICANT', color: '#fb923c' },
    4: { label: 'SEVERE',      color: '#f87171' },
    5: { label: 'CRITICAL',    color: '#dc2626' },
  };
  const s = map[level] || map[3];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        borderRadius: d.radiusSm,
        background: `${s.color}10`,
        border: `1px solid ${s.color}30`,
        fontFamily: d.fontSans,
        lineHeight: 1,
      }}
    >
      <span
        style={{
          fontSize: '15px',
          fontWeight: 700,
          color: s.color,
          letterSpacing: '-0.5px',
          minWidth: '10px',
          textAlign: 'center',
        }}
      >
        {level}
      </span>
      <span
        style={{
          width: '1px',
          height: '12px',
          background: `${s.color}40`,
          borderRadius: '1px',
        }}
      />
      <span
        style={{
          fontSize: '10px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.8px',
          color: s.color,
        }}
      >
        {s.label}
      </span>
    </span>
  );
}

function StatusDot({ color, label }) {
  const d = useTokens();
  const c = color || d.success;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: d.textSecondary, fontWeight: 500 }}>
      <span style={{ width: '7px', height: '7px', borderRadius: d.dotRadius, background: c, boxShadow: `0 0 8px ${c}80` }} />
      {label}
    </span>
  );
}

function DataTable() {
  const d = useTokens();
  const incidents = [
    { title: 'Border Clash in Kashmir', cat: 'Conflict', sev: 5, status: 'active', loc: 'Jammu & Kashmir', date: 'May 03' },
    { title: 'Protests in Islamabad', cat: 'Protest', sev: 2, status: 'active', loc: 'Islamabad, Pakistan', date: 'May 02' },
    { title: 'Flood Warning: Indus River', cat: 'Disaster', sev: 3, status: 'resolved', loc: 'Sindh, Pakistan', date: 'Apr 28' },
    { title: 'Diplomatic Talks Cancelled', cat: 'Diplomacy', sev: 2, status: 'active', loc: 'Geneva, Switzerland', date: 'May 01' },
  ];
  const catColors = { Conflict: d.dangerLight, Protest: d.warning, Disaster: d.purple, Diplomacy: d.info, Humanitarian: d.teal, Other: d.gray };
  const statusColors = { active: d.success, resolved: d.gray, pending: d.warning };

  return (
    <div style={{ overflow: 'hidden', borderRadius: d.radiusMd, border: `1px solid ${d.border}` }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 100px 140px 100px 150px',
          gap: '12px',
          padding: '10px 16px',
          background: d.bgElevated,
          fontSize: d.labelFontSize,
          fontWeight: d.labelFontWeight,
          textTransform: d.labelTransform,
          letterSpacing: d.labelLetterSpacing,
          color: d.textMuted,
        }}
      >
        <div>Incident</div>
        <div>Category</div>
        <div>Severity</div>
        <div>Status</div>
        <div>Location</div>
      </div>
      {incidents.map((e, i) => (
        <div
          key={i}
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 100px 140px 100px 150px',
            gap: '12px',
            padding: '12px 16px',
            borderTop: `1px solid ${d.border}`,
            fontSize: '13px',
            color: d.text,
            transition: 'background 0.12s ease',
            cursor: 'default',
          }}
          onMouseEnter={(ev) => (ev.currentTarget.style.background = d.bgHover)}
          onMouseLeave={(ev) => (ev.currentTarget.style.background = 'transparent')}
        >
          <div style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.title}</div>
          <div><Pill color={catColors[e.cat]}>{e.cat}</Pill></div>
          <div><SeverityStamp level={e.sev} /></div>
          <div><StatusDot color={statusColors[e.status]} label={e.status} /></div>
          <div style={{ color: d.textSecondary, fontSize: '12px' }}>{e.loc}</div>
        </div>
      ))}
    </div>
  );
}

function Skeleton({ w = '100%', h = '16px', style = {} }) {
  const d = useTokens();
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: d.radiusSm,
        background: d.border,
        animation: 'shimmer 1.8s infinite',
        backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)',
        backgroundSize: '200% 100%',
        ...style,
      }}
    />
  );
}

function Toast({ type = 'success', message }) {
  const d = useTokens();
  const colors = {
    success: { bg: `${d.success}12`, border: `${d.success}30`, dot: d.success },
    error: { bg: `${d.accentLight}12`, border: `${d.accentLight}30`, dot: d.dangerLight },
    warning: { bg: `${d.warning}12`, border: `${d.warning}30`, dot: d.warning },
  };
  const c = colors[type];
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 16px',
        borderRadius: d.radiusMd,
        background: c.bg,
        border: `1px solid ${c.border}`,
        fontSize: '13px',
        color: d.text,
        maxWidth: '360px',
      }}
    >
      <span style={{ width: '8px', height: '8px', borderRadius: d.dotRadius, background: c.dot, flexShrink: 0 }} />
      <span>{message}</span>
    </div>
  );
}

function ModalPreview() {
  const d = useTokens();
  return (
    <div style={{ position: 'relative' }}>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(8px)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            background: d.bgSurface,
            border: `1px solid ${d.border}`,
            borderRadius: d.radiusXl,
            padding: '28px',
            width: '400px',
            maxWidth: '90vw',
            boxShadow: d.shadowModal,
          }}
        >
          <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 600 }}>Confirm Action</h3>
          <p style={{ margin: '0 0 20px', color: d.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
            Are you sure you want to delete this incident? This action cannot be undone and will remove all associated timeline updates.
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <Btn variant="ghost">Cancel</Btn>
            <Btn variant="primary">Delete Incident</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Style Toggle Component ─── */
function StyleToggle({ value, onChange }) {
  const d = useTokens();
  const options = [
    { key: 'tactical', label: 'Tactical' },
    { key: 'saas', label: 'SaaS' },
    { key: 'editorial', label: 'Editorial' },
  ];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <span style={{ fontSize: '12px', color: d.textMuted, fontFamily: d.fontSans, fontWeight: 500 }}>
        Interface
      </span>
      <div
        style={{
          display: 'flex',
          background: d.bgElevated,
          borderRadius: d.radiusMd,
          padding: '3px',
          border: `1px solid ${d.border}`,
        }}
      >
        {options.map((opt) => (
          <button
            key={opt.key}
            onClick={() => onChange(opt.key)}
            style={{
              padding: '5px 14px',
              borderRadius: d.radiusSm,
              border: 'none',
              background: value === opt.key ? d.bgSurface : 'transparent',
              color: value === opt.key ? d.text : d.textMuted,
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: d.fontSans,
              transition: 'all 0.15s ease',
              boxShadow: value === opt.key ? d.shadowCard : 'none',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Main ─── */
export default function DesignTrial() {
  const [uiStyle, setUiStyle] = useState('tactical');
  const [activeTab, setActiveTab] = useState('overview');
  const [showModal, setShowModal] = useState(false);

  const TOKEN_MAP = {
    tactical: TOKENS_TACTICAL,
    saas: TOKENS_SAAS_DARK,
    editorial: TOKENS_EDITORIAL,
  };
  const d = TOKEN_MAP[uiStyle];

  return (
    <TokensContext.Provider value={d}>
      <style>{fontImports}</style>
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
      {d.grain && <Grain />}
      {showModal && <ModalPreview />}
      <div
        style={{
          minHeight: '100vh',
          background: d.pageBackground,
          color: d.text,
          fontFamily: d.fontSans,
          padding: d.containerPadding,
          lineHeight: d.bodyLineHeight,
          position: 'relative',
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: d.headerMarginBottom }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: d.headerGap,
            marginBottom: '14px',
            flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: d.headerGap }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: d.radiusMd,
                  background: d.accent,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  fontWeight: 700,
                  color: '#f2f2f2',
                  boxShadow: d.shadowGlow !== 'none' ? `${d.shadowGlow} ${d.accentGlowStrong}` : 'none',
                }}
              >
                G
              </div>
              <h1 style={{ fontSize: '30px', fontWeight: 700, letterSpacing: '-1.2px', margin: 0, lineHeight: 1.1 }}>
                GeoWatch
              </h1>
              <span
                style={{
                  fontSize: d.labelFontSize,
                  fontWeight: d.labelFontWeight,
                  textTransform: d.labelTransform,
                  letterSpacing: d.labelLetterSpacing,
                  color: d.textMuted,
                  background: d.bgElevated,
                  padding: '4px 10px',
                  borderRadius: d.radiusSm,
                  border: `1px solid ${d.border}`,
                }}
              >
                Design Trial v5 — Style Test
              </span>
            </div>
            <StyleToggle value={uiStyle} onChange={setUiStyle} />
          </div>
          <p style={{ color: d.textSecondary, fontSize: '16px', margin: 0, maxWidth: '540px', lineHeight: 1.6 }}>
            Toggle between Tactical, SaaS, and Editorial interface styles. All three run in dark mode for direct comparison.
          </p>
        </div>

        {/* ─── Buttons ─── */}
        <Section title="Buttons">
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <Btn variant="primary">+ Add Incident</Btn>
            <Btn variant="secondary">Filter Results</Btn>
            <Btn variant="ghost">Cancel</Btn>
            <Btn variant="primary" onClick={() => setShowModal(true)}>Open Modal</Btn>
          </div>
        </Section>

        {/* ─── Inputs ─── */}
        <Section title="Inputs">
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
            <Inp placeholder="Search incidents..." icon="🔍" w="240px" />
            <Inp placeholder="2025-05-09" w="130px" style={{ fontFamily: d.fontMono }} />
          </div>
        </Section>

        {/* ─── Badges ─── */}
        <Section title="Badges">
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <Pill color={d.dangerLight} dot>Conflict</Pill>
            <Pill color={d.warning} dot>Protest</Pill>
            <Pill color={d.purple} dot>Disaster</Pill>
            <Pill color={d.info} dot>Diplomacy</Pill>
            <Pill color={d.teal} dot>Humanitarian</Pill>
            <Pill color={d.gray} dot>Other</Pill>
            <Pill color={d.success} dot>Active</Pill>
            <Pill color={d.gray}>Resolved</Pill>
          </div>
        </Section>

        {/* ─── Severity Badges ─── */}
        <Section title="Severity">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '400px' }}>
            <SeverityStamp level={1} />
            <SeverityStamp level={2} />
            <SeverityStamp level={3} />
            <SeverityStamp level={4} />
            <SeverityStamp level={5} />
          </div>
        </Section>

        {/* ─── Status ─── */}
        <Section title="Status">
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
            <StatusDot color={d.success} label="Active" />
            <StatusDot color={d.gray} label="Resolved" />
            <StatusDot color={d.warning} label="Pending" />
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '5px 14px',
              background: `${d.accent}10`,
              borderRadius: d.radiusMd,
              border: `1px solid ${d.accent}18`,
            }}>
              <span style={{ width: '7px', height: '7px', borderRadius: d.dotRadius, background: d.dangerLight, boxShadow: d.shadowGlow !== 'none' ? `0 0 10px ${d.accentGlowStrong}` : 'none' }} />
              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                color: d.dangerLight,
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
              }}>Live Mode</span>
            </div>
          </div>
        </Section>

        {/* ─── Cards ─── */}
        <Section title="Panels">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', maxWidth: '960px' }}>
            <Card accentLeft>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: d.dotRadius, background: d.dangerLight, boxShadow: d.shadowGlow !== 'none' ? `0 0 12px ${d.accentGlowStrong}` : 'none' }} />
                <span style={{ fontSize: '15px', fontWeight: 600 }}>Border Clash in Kashmir</span>
                <span style={{ marginLeft: 'auto' }}><Pill color={d.dangerLight}>Conflict</Pill></span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <div style={{
                    fontSize: d.labelFontSize,
                    fontWeight: d.labelFontWeight,
                    textTransform: d.labelTransform,
                    letterSpacing: d.labelLetterSpacing,
                    color: d.textMuted,
                    marginBottom: '4px',
                  }}>Severity</div>
                  <SeverityStamp level={5} />
                </div>
                <div>
                  <div style={{
                    fontSize: d.labelFontSize,
                    fontWeight: d.labelFontWeight,
                    textTransform: d.labelTransform,
                    letterSpacing: d.labelLetterSpacing,
                    color: d.textMuted,
                    marginBottom: '4px',
                  }}>Status</div>
                  <StatusDot color={d.success} label="Active" />
                </div>
                <div>
                  <div style={{
                    fontSize: d.labelFontSize,
                    fontWeight: d.labelFontWeight,
                    textTransform: d.labelTransform,
                    letterSpacing: d.labelLetterSpacing,
                    color: d.textMuted,
                    marginBottom: '4px',
                  }}>Start Date</div>
                  <span style={{ fontFamily: d.fontMono, fontSize: '13px' }}>May 03, 2025</span>
                </div>
                <div>
                  <div style={{
                    fontSize: d.labelFontSize,
                    fontWeight: d.labelFontWeight,
                    textTransform: d.labelTransform,
                    letterSpacing: d.labelLetterSpacing,
                    color: d.textMuted,
                    marginBottom: '4px',
                  }}>Location</div>
                  <span style={{ fontSize: '13px' }}>Jammu and Kashmir</span>
                </div>
              </div>
            </Card>

            <Card>
              <div style={{
                fontSize: d.labelFontSize,
                fontWeight: d.labelFontWeight,
                textTransform: d.labelTransform,
                letterSpacing: d.labelLetterSpacing,
                color: d.textMuted,
                marginBottom: '12px',
              }}>Events Today</div>
              <div style={{ fontSize: '44px', fontWeight: 700, fontFamily: d.fontMono, color: d.text, letterSpacing: '-2px', lineHeight: 1 }}>1,247</div>
              <div style={{ fontSize: '13px', color: d.success, marginTop: '10px', fontWeight: 500 }}>↑ 12% from yesterday</div>
            </Card>

            <Card pad="0">
              <div style={{ padding: '18px 18px 0' }}>
                <div style={{
                  display: 'flex',
                  gap: '4px',
                  marginBottom: '14px',
                  background: d.bg,
                  padding: '4px',
                  borderRadius: d.radiusMd,
                  width: 'fit-content',
                }}>
                  {['overview', 'timeline', 'sources'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      style={{
                        padding: '5px 14px',
                        fontSize: '13px',
                        fontWeight: 600,
                        borderRadius: d.radiusSm,
                        border: 'none',
                        cursor: 'pointer',
                        background: activeTab === tab ? d.bgElevated : 'transparent',
                        color: activeTab === tab ? d.text : d.textMuted,
                        boxShadow: activeTab === tab ? d.shadowCard : 'none',
                        transition: 'all 0.15s ease',
                        textTransform: 'capitalize',
                        fontFamily: d.fontSans,
                      }}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ padding: '0 18px 18px', fontSize: '14px', color: d.textSecondary, lineHeight: 1.7 }}>
                {activeTab === 'overview' && (
                  <>Heavy shelling reported along the Line of Control. Civilian casualties confirmed in Uri sector. Forces exchanging artillery fire since 0400 hours.</>
                )}
                {activeTab === 'timeline' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <div style={{ width: '2px', background: d.border, borderRadius: '1px', flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: '12px', color: d.textMuted, fontFamily: d.fontMono, marginBottom: '2px' }}>04:00 — Initial Report</div>
                        <div>Artillery fire begins in Uri sector</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <div style={{ width: '2px', background: d.dangerLight, borderRadius: '1px', flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: '12px', color: d.dangerLight, fontFamily: d.fontMono, marginBottom: '2px' }}>06:30 — Update</div>
                        <div>Civilian casualties confirmed by local authorities</div>
                      </div>
                    </div>
                  </div>
                )}
                {activeTab === 'sources' && <div style={{ color: d.textMuted, fontStyle: 'italic' }}>2 sources attached · Verified</div>}
              </div>
            </Card>
          </div>
        </Section>

        {/* ─── Data Table ─── */}
        <Section title="Data Table Preview">
          <DataTable />
        </Section>

        {/* ─── Skeleton ─── */}
        <Section title="Loading States">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '400px' }}>
            <Skeleton w="60%" h="20px" />
            <Skeleton w="100%" h="14px" />
            <Skeleton w="80%" h="14px" />
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <Skeleton w="80px" h="32px" style={{ borderRadius: d.radiusMd }} />
              <Skeleton w="80px" h="32px" style={{ borderRadius: d.radiusMd }} />
            </div>
          </div>
        </Section>

        {/* ─── Toast ─── */}
        <Section title="Notifications">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Toast type="success" message="Incident resolved successfully." />
            <Toast type="error" message="Failed to connect to Nominatim API." />
            <Toast type="warning" message="Rate limit approaching. 8 requests remaining." />
          </div>
        </Section>

        {/* ─── Top Bar ─── */}
        <Section title="Top Bar Concept">
          <div
            style={{
              background: d.bgSurface,
              border: `1px solid ${d.border}`,
              borderRadius: d.radiusLg,
              padding: '14px 22px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              maxWidth: '960px',
              boxShadow: d.shadowElevated,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: d.radiusSm,
                    background: d.accent,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#f2f2f2',
                    boxShadow: d.shadowGlow !== 'none' ? `${d.shadowGlow} ${d.accentGlowStrong}` : 'none',
                  }}
                >
                  G
                </div>
                <span style={{ fontSize: '17px', fontWeight: 700, letterSpacing: '-0.3px' }}>GeoWatch</span>
              </div>
              <span
                style={{
                  fontSize: d.labelFontSize,
                  fontWeight: d.labelFontWeight,
                  textTransform: d.labelTransform,
                  letterSpacing: d.labelLetterSpacing,
                  color: d.textMuted,
                  padding: '3px 10px',
                  borderRadius: d.radiusSm,
                  background: d.bgElevated,
                  border: `1px solid ${d.border}`,
                }}
              >
                Admin
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                background: `${d.accent}10`,
                borderRadius: d.radiusMd,
                border: `1px solid ${d.accent}18`,
              }}>
                <span style={{ width: '7px', height: '7px', borderRadius: d.dotRadius, background: d.dangerLight, boxShadow: d.shadowGlow !== 'none' ? `0 0 10px ${d.accentGlowStrong}` : 'none' }} />
                <span style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: d.dangerLight,
                  letterSpacing: '0.8px',
                  textTransform: 'uppercase',
                }}>Live</span>
              </div>
              <Btn variant="primary" style={{ padding: '8px 16px', fontSize: '12px' }}>+ Add Incident</Btn>
            </div>
          </div>
        </Section>

        {/* ─── Typography ─── */}
        <Section title="Typography Scale">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '640px' }}>
            <div>
              <div style={{
                fontSize: d.labelFontSize,
                fontWeight: d.labelFontWeight,
                textTransform: d.labelTransform,
                letterSpacing: d.labelLetterSpacing,
                color: d.textMuted,
                marginBottom: '6px',
              }}>H1 — 30px / Bold / -1.2px tracking</div>
              <div style={{ fontSize: '30px', fontWeight: 700, letterSpacing: '-1.2px', color: d.text, lineHeight: 1.1 }}>Conflict Monitor Dashboard</div>
            </div>
            <div>
              <div style={{
                fontSize: d.labelFontSize,
                fontWeight: d.labelFontWeight,
                textTransform: d.labelTransform,
                letterSpacing: d.labelLetterSpacing,
                color: d.textMuted,
                marginBottom: '6px',
              }}>H2 — 20px / Semibold</div>
              <div style={{ fontSize: '20px', fontWeight: 600, color: d.text, lineHeight: 1.2 }}>Incident Details & Timeline</div>
            </div>
            <div>
              <div style={{
                fontSize: d.labelFontSize,
                fontWeight: d.labelFontWeight,
                textTransform: d.labelTransform,
                letterSpacing: d.labelLetterSpacing,
                color: d.textMuted,
                marginBottom: '6px',
              }}>Body — 15px / Regular / 1.6 line-height</div>
              <div style={{ fontSize: '15px', color: d.textSecondary, lineHeight: 1.6 }}>
                Shelling reported along the Line of Control in the Uri sector. Forces have been exchanging artillery fire since early morning hours with no ceasefire in sight.
              </div>
            </div>
            <div>
              <div style={{
                fontSize: d.labelFontSize,
                fontWeight: d.labelFontWeight,
                textTransform: d.labelTransform,
                letterSpacing: d.labelLetterSpacing,
                color: d.textMuted,
                marginBottom: '6px',
              }}>Data / Mono — 13px / Medium</div>
              <div style={{ fontSize: '13px', fontFamily: d.fontMono, color: d.dangerLight, fontWeight: 500 }}>
                34.0837° N, 74.7973° E · May 03, 2025 · 04:00 UTC
              </div>
            </div>
            <div>
              <div style={{
                fontSize: d.labelFontSize,
                fontWeight: d.labelFontWeight,
                textTransform: d.labelTransform,
                letterSpacing: d.labelLetterSpacing,
                color: d.textMuted,
                marginBottom: '6px',
              }}>Label — {d.labelFontSize} / {d.labelFontWeight >= 700 ? 'Bold' : 'Semibold'} / {d.labelTransform === 'uppercase' ? 'Uppercase' : 'Sentence case'} / {d.labelLetterSpacing} letter-spacing</div>
              <div style={{
                fontSize: d.labelFontSize,
                fontWeight: d.labelFontWeight,
                textTransform: d.labelTransform,
                letterSpacing: d.labelLetterSpacing,
                color: d.textMuted,
              }}>Severity · Status · Category · Location</div>
            </div>
          </div>
        </Section>

        {/* ─── Changelog ─── */}
        <Section title="v5 Changes">
          <div style={{ maxWidth: '680px', fontSize: '15px', color: d.textSecondary, lineHeight: 1.8 }}>
            <p style={{ margin: '0 0 12px' }}>
              <strong style={{ color: d.text }}>Three interface styles.</strong> Toggle between
              Tactical (military C2), SaaS (clean modern dashboard), and Editorial (Swiss minimal / flat).
              All run in dark mode for direct comparison.
            </p>
            <p style={{ margin: '0 0 12px' }}>
              <strong style={{ color: d.text }}>Tactical style.</strong> Space Grotesk font,
              uppercase labels, grain texture, deep crimson, dramatic shadows & radial gradient.
            </p>
            <p style={{ margin: '0 0 12px' }}>
              <strong style={{ color: d.text }}>SaaS style.</strong> Inter font, sentence case,
              no grain, soft ambient shadows, subtle borders, more spacing.
            </p>
            <p style={{ margin: '0 0 12px' }}>
              <strong style={{ color: d.text }}>Editorial style.</strong> Inter font, sentence case,
              zero border radius, no shadows, flat pure black background, explicit visible borders,
              lighter label weight, square status indicators.
            </p>
            <p style={{ margin: 0 }}>
              <strong style={{ color: d.text }}>Token architecture.</strong> All style decisions
              pulled from token objects — radius, typography, spacing, shadows, transforms.
              Ready for light mode expansion.
            </p>
          </div>
        </Section>

        {/* Footer */}
        <div style={{ marginTop: '64px', paddingTop: '24px', borderTop: `1px solid ${d.border}` }}>
          <p style={{ fontSize: '13px', color: d.textMuted }}>
            Trial v5 — Three-Way Style Test. Toggle above to compare Tactical, SaaS, and Editorial aesthetics.
          </p>
        </div>
      </div>
    </TokensContext.Provider>
  );
}
