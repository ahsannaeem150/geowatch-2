import React, { useState } from 'react';

const fontStyle = `@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap');`;

/* ─── Crimson Seal v4 — Final ─── */
const d = {
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
};

/* ─── Helpers ─── */
function Grain() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 9999,
        opacity: 0.022,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'repeat',
        backgroundSize: '128px',
      }}
    />
  );
}

function Btn({ children, variant = 'primary', onClick, style = {} }) {
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
        borderRadius: '8px',
        cursor: 'pointer',
        border: v.border,
        background: h ? v.hBg : v.bg,
        color: v.color,
        boxShadow: h ? v.hShadow : 'none',
        transform: h ? 'translateY(-1px)' : 'none',
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
          borderRadius: '8px',
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

function Card({ children, style = {}, pad = '24px', accentLeft = false }) {
  const [h, setH] = useState(false);
  return (
    <div
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        background: d.bgSurface,
        border: `1px solid ${h ? d.borderHover : d.border}`,
        borderRadius: '14px',
        padding: pad,
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
        boxShadow: h ? '0 8px 32px rgba(0,0,0,0.5)' : '0 2px 8px rgba(0,0,0,0.3)',
        transform: h ? 'translateY(-2px)' : 'none',
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
            background: d.accent,
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
  return (
    <div style={{ marginTop: '52px' }}>
      <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', color: d.textMuted, marginBottom: '18px', fontFamily: d.fontSans }}>
        {title}
      </div>
      {children}
    </div>
  );
}

/* ─── Pill Badge — brighter tints ─── */
function Pill({ children, color = d.accent, dot = false }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: dot ? '6px' : 0,
        padding: '3px 10px',
        borderRadius: '999px',
        fontSize: '11px',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.6px',
        fontFamily: d.fontSans,
        background: `${color}1a`,
        color,
        border: `1px solid ${color}40`,
      }}
    >
      {dot && <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: color }} />}
      {children}
    </span>
  );
}

/* ─── Severity Badge — flat, consistent, intimidating ─── */
function SeverityStamp({ level = 3 }) {
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
        borderRadius: '6px',
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

/* ─── Status Dot — brighter colors ─── */
function StatusDot({ color = d.success, label }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: d.textSecondary, fontWeight: 500 }}>
      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}80` }} />
      {label}
    </span>
  );
}

/* ─── Data Table ─── */
function DataTable() {
  const events = [
    { title: 'Border Clash in Kashmir', cat: 'Conflict', sev: 5, status: 'active', loc: 'Jammu & Kashmir', date: 'May 03' },
    { title: 'Protests in Islamabad', cat: 'Protest', sev: 2, status: 'active', loc: 'Islamabad, Pakistan', date: 'May 02' },
    { title: 'Flood Warning: Indus River', cat: 'Disaster', sev: 3, status: 'resolved', loc: 'Sindh, Pakistan', date: 'Apr 28' },
    { title: 'Diplomatic Talks Cancelled', cat: 'Diplomacy', sev: 2, status: 'active', loc: 'Geneva, Switzerland', date: 'May 01' },
  ];
  const catColors = { Conflict: d.dangerLight, Protest: d.warning, Disaster: d.purple, Diplomacy: d.info, Humanitarian: d.teal, Other: d.gray };
  const statusColors = { active: d.success, resolved: d.gray, pending: d.warning };

  return (
    <div style={{ overflow: 'hidden', borderRadius: '10px', border: `1px solid ${d.border}` }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 100px 140px 100px 150px',
          gap: '12px',
          padding: '10px 16px',
          background: d.bgElevated,
          fontSize: '10px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '1.2px',
          color: d.textMuted,
        }}
      >
        <div>Event</div>
        <div>Category</div>
        <div>Severity</div>
        <div>Status</div>
        <div>Location</div>
      </div>
      {events.map((e, i) => (
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

/* ─── Skeleton ─── */
function Skeleton({ w = '100%', h = '16px', style = {} }) {
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: '4px',
        background: d.border,
        animation: 'shimmer 1.8s infinite',
        backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)',
        backgroundSize: '200% 100%',
        ...style,
      }}
    />
  );
}

/* ─── Toast ─── */
function Toast({ type = 'success', message }) {
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
        borderRadius: '10px',
        background: c.bg,
        border: `1px solid ${c.border}`,
        fontSize: '13px',
        color: d.text,
        maxWidth: '360px',
      }}
    >
      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
      <span>{message}</span>
    </div>
  );
}

/* ─── Modal Preview ─── */
function ModalPreview() {
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
            borderRadius: '16px',
            padding: '28px',
            width: '400px',
            maxWidth: '90vw',
            boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
          }}
        >
          <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 600 }}>Confirm Action</h3>
          <p style={{ margin: '0 0 20px', color: d.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
            Are you sure you want to delete this event? This action cannot be undone and will remove all associated timeline updates.
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <Btn variant="ghost">Cancel</Btn>
            <Btn variant="primary">Delete Event</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main ─── */
export default function DesignTrial() {
  const [activeTab, setActiveTab] = useState('overview');
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <style>{fontStyle}</style>
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
      <Grain />
      {showModal && <ModalPreview />}
      <div
        style={{
          minHeight: '100vh',
          background: `radial-gradient(ellipse 80% 55% at 50% -5%, #1a0a0e 0%, ${d.bg} 55%)`,
          color: d.text,
          fontFamily: d.fontSans,
          padding: '48px',
          lineHeight: 1.5,
          position: 'relative',
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: '56px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: d.accent,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                fontWeight: 700,
                color: '#f2f2f2',
                boxShadow: `0 0 24px ${d.accentGlowStrong}`,
              }}
            >
              G
            </div>
            <h1 style={{ fontSize: '30px', fontWeight: 700, letterSpacing: '-1.2px', margin: 0, lineHeight: 1.1 }}>
              GeoWatch
            </h1>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '1.5px',
                color: d.textMuted,
                background: d.bgElevated,
                padding: '4px 10px',
                borderRadius: '6px',
                border: `1px solid ${d.border}`,
              }}
            >
              Design Trial v4 — Final
            </span>
          </div>
          <p style={{ color: d.textSecondary, fontSize: '16px', margin: 0, maxWidth: '540px', lineHeight: 1.6 }}>
            Deep maroon accent. Brighter badges & status colors. Intimidating severity stamps.
            Skeleton loaders. Toast notifications. Modal preview. Ready for decision.
          </p>
        </div>

        {/* ─── Buttons ─── */}
        <Section title="Buttons">
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <Btn variant="primary">+ Add Event</Btn>
            <Btn variant="secondary">Filter Results</Btn>
            <Btn variant="ghost">Cancel</Btn>
            <Btn variant="primary" onClick={() => setShowModal(true)}>Open Modal</Btn>
          </div>
        </Section>

        {/* ─── Inputs ─── */}
        <Section title="Inputs">
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
            <Inp placeholder="Search events..." icon="🔍" w="240px" />
            <Inp placeholder="2025-05-09" w="130px" style={{ fontFamily: d.fontMono }} />
          </div>
        </Section>

        {/* ─── Badges — brighter ─── */}
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
        <Section title="Severity — Flat & Consistent">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '400px' }}>
            <SeverityStamp level={1} />
            <SeverityStamp level={2} />
            <SeverityStamp level={3} />
            <SeverityStamp level={4} />
            <SeverityStamp level={5} />
          </div>
        </Section>

        {/* ─── Status — brighter ─── */}
        <Section title="Status">
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
            <StatusDot color={d.success} label="Active" />
            <StatusDot color={d.gray} label="Resolved" />
            <StatusDot color={d.warning} label="Pending" />
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '5px 14px', background: `${d.accent}10`, borderRadius: '8px', border: `1px solid ${d.accent}18` }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: d.dangerLight, boxShadow: `0 0 10px ${d.accentGlowStrong}` }} />
              <span style={{ fontSize: '11px', fontWeight: 700, color: d.dangerLight, letterSpacing: '0.8px', textTransform: 'uppercase' }}>Live Mode</span>
            </div>
          </div>
        </Section>

        {/* ─── Cards ─── */}
        <Section title="Panels">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', maxWidth: '960px' }}>
            <Card accentLeft>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: d.dangerLight, boxShadow: '0 0 12px rgba(159,18,57,0.5)' }} />
                <span style={{ fontSize: '15px', fontWeight: 600 }}>Border Clash in Kashmir</span>
                <span style={{ marginLeft: 'auto' }}><Pill color={d.dangerLight}>Conflict</Pill></span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1.2px', color: d.textMuted, marginBottom: '4px', fontWeight: 700 }}>Severity</div>
                  <SeverityStamp level={5} />
                </div>
                <div>
                  <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1.2px', color: d.textMuted, marginBottom: '4px', fontWeight: 700 }}>Status</div>
                  <StatusDot color={d.success} label="Active" />
                </div>
                <div>
                  <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1.2px', color: d.textMuted, marginBottom: '4px', fontWeight: 700 }}>Start Date</div>
                  <span style={{ fontFamily: d.fontMono, fontSize: '13px' }}>May 03, 2025</span>
                </div>
                <div>
                  <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1.2px', color: d.textMuted, marginBottom: '4px', fontWeight: 700 }}>Location</div>
                  <span style={{ fontSize: '13px' }}>Jammu and Kashmir</span>
                </div>
              </div>
            </Card>

            <Card>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.5px', color: d.textMuted, fontWeight: 700, marginBottom: '12px' }}>Events Today</div>
              <div style={{ fontSize: '44px', fontWeight: 700, fontFamily: d.fontMono, color: d.text, letterSpacing: '-2px', lineHeight: 1 }}>1,247</div>
              <div style={{ fontSize: '13px', color: d.success, marginTop: '10px', fontWeight: 500 }}>↑ 12% from yesterday</div>
            </Card>

            <Card pad="0">
              <div style={{ padding: '18px 18px 0' }}>
                <div style={{ display: 'flex', gap: '4px', marginBottom: '14px', background: d.bg, padding: '4px', borderRadius: '10px', width: 'fit-content' }}>
                  {['overview', 'timeline', 'sources'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      style={{
                        padding: '5px 14px',
                        fontSize: '13px',
                        fontWeight: 600,
                        borderRadius: '8px',
                        border: 'none',
                        cursor: 'pointer',
                        background: activeTab === tab ? d.bgElevated : 'transparent',
                        color: activeTab === tab ? d.text : d.textMuted,
                        boxShadow: activeTab === tab ? '0 1px 4px rgba(0,0,0,0.4)' : 'none',
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
              <Skeleton w="80px" h="32px" style={{ borderRadius: '8px' }} />
              <Skeleton w="80px" h="32px" style={{ borderRadius: '8px' }} />
            </div>
          </div>
        </Section>

        {/* ─── Toast ─── */}
        <Section title="Notifications">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Toast type="success" message="Event resolved successfully." />
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
              borderRadius: '14px',
              padding: '14px 22px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              maxWidth: '960px',
              boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: d.accent,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#f2f2f2',
                    boxShadow: `0 0 20px ${d.accentGlowStrong}`,
                  }}
                >
                  G
                </div>
                <span style={{ fontSize: '17px', fontWeight: 700, letterSpacing: '-0.3px' }}>GeoWatch</span>
              </div>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '1.2px',
                  color: d.textMuted,
                  padding: '3px 10px',
                  borderRadius: '6px',
                  background: d.bgElevated,
                  border: `1px solid ${d.border}`,
                }}
              >
                Admin
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', background: `${d.accent}10`, borderRadius: '8px', border: `1px solid ${d.accent}18` }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: d.dangerLight, boxShadow: `0 0 10px ${d.accentGlowStrong}` }} />
                <span style={{ fontSize: '11px', fontWeight: 700, color: d.dangerLight, letterSpacing: '0.8px', textTransform: 'uppercase' }}>Live</span>
              </div>
              <Btn variant="primary" style={{ padding: '8px 16px', fontSize: '12px' }}>+ Add Event</Btn>
            </div>
          </div>
        </Section>

        {/* ─── Typography ─── */}
        <Section title="Typography Scale">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '640px' }}>
            <div>
              <div style={{ fontSize: '10px', color: d.textMuted, textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 700, marginBottom: '6px' }}>H1 — 30px / Bold / -1.2px tracking</div>
              <div style={{ fontSize: '30px', fontWeight: 700, letterSpacing: '-1.2px', color: d.text, lineHeight: 1.1 }}>Conflict Monitor Dashboard</div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: d.textMuted, textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 700, marginBottom: '6px' }}>H2 — 20px / Semibold</div>
              <div style={{ fontSize: '20px', fontWeight: 600, color: d.text, lineHeight: 1.2 }}>Event Details & Timeline</div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: d.textMuted, textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 700, marginBottom: '6px' }}>Body — 15px / Regular / 1.6 line-height</div>
              <div style={{ fontSize: '15px', color: d.textSecondary, lineHeight: 1.6 }}>
                Shelling reported along the Line of Control in the Uri sector. Forces have been exchanging artillery fire since early morning hours with no ceasefire in sight.
              </div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: d.textMuted, textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 700, marginBottom: '6px' }}>Data / Mono — 13px / Medium</div>
              <div style={{ fontSize: '13px', fontFamily: d.fontMono, color: d.dangerLight, fontWeight: 500 }}>
                34.0837° N, 74.7973° E · May 03, 2025 · 04:00 UTC
              </div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: d.textMuted, textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 700, marginBottom: '6px' }}>Label — 10px / Bold / Uppercase / 1.5px letter-spacing</div>
              <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: d.textMuted }}>Severity · Status · Category · Location</div>
            </div>
          </div>
        </Section>

        {/* ─── Changelog ─── */}
        <Section title="v4 Changes">
          <div style={{ maxWidth: '680px', fontSize: '15px', color: d.textSecondary, lineHeight: 1.8 }}>
            <p style={{ margin: '0 0 12px' }}>
              <strong style={{ color: d.text }}>Brighter badges.</strong> Background tint opacity increased
              from 7% to 10%. Borders more visible. Colors pop against dark surfaces.
            </p>
            <p style={{ margin: '0 0 12px' }}>
              <strong style={{ color: d.text }}>Brighter status colors.</strong> Success green is now
              <code style={{ fontFamily: d.fontMono, color: d.success }}> #22c55e</code>, warning amber is
              <code style={{ fontFamily: d.fontMono, color: d.warning }}> #f59e0b</code>. Glow effects stronger.
            </p>
            <p style={{ margin: '0 0 12px' }}>
              <strong style={{ color: d.text }}>Severity Badge.</strong> Flat inline badge using the
              same visual language as pills: tinted background, subtle border, Space Grotesk font.
              Bold number separated by a thin line from the uppercase label. No box, no glow.
              Levels: Low → Moderate → Significant → Severe → Critical.
            </p>
            <p style={{ margin: '0 0 12px' }}>
              <strong style={{ color: d.text }}>Modal preview.</strong> Added a dark overlay + card modal
              with backdrop blur. Shows how confirmation dialogs would look.
            </p>
            <p style={{ margin: 0 }}>
              <strong style={{ color: d.text }}>Kept from v3.</strong> Skeleton loaders, toast notifications,
              left accent line on cards, film grain texture, radial background gradient.
            </p>
          </div>
        </Section>

        {/* Footer */}
        <div style={{ marginTop: '64px', paddingTop: '24px', borderTop: `1px solid ${d.border}` }}>
          <p style={{ fontSize: '13px', color: d.textMuted }}>
            Trial 1 v5 — Crimson Seal. Flat severity badges. Brighter pills. Modal preview.
            Take screenshots, review with stakeholders, then give the go/no-go.
          </p>
        </div>
      </div>
    </>
  );
}