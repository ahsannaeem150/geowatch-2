import React, { useMemo, useState } from 'react';
import './ZoneHeroesTrial.css';
import { MOCK_ZONE, MOCK_TIMELINE } from './zoneTrialData.js';
import {
  ZoneNeonMap,
  ZoneCategoryBadge,
  StatusBadge,
  VerificationBadge,
  EffectiveWindowMeter,
  ZoneStatGrid,
  ZoneActions,
  useZoneTimeState,
} from './ZoneTrialCommon.jsx';
import { buildPolygonSvgProjection } from '@shared/utils/zoneGeometry.js';
import { SeverityBadge } from '@shared/components/SeverityBadge.jsx';
import { formatDate, formatTime } from '@shared/components/incident-detail/IncidentUtils.js';
import { ArrowRight, Activity, Radio, Shield, MapPin, Clock, Zap, Hexagon, AlertTriangle } from 'lucide-react';

const zone = MOCK_ZONE;
const effectiveDates = `${zone.startDate ? formatDate(zone.startDate) : '—'} — ${zone.endDate ? formatDate(zone.endDate) : 'No expiry'}`;

function HeroCard({ children, className = '' }) {
  return (
    <div className={`zh-card ${className}`}>
      {children}
    </div>
  );
}

/* ───────────────── Variation A: Cinematic centered ───────────────── */
function HeroCinematic() {
  return (
    <section className="zh-hero zh-hero--cinematic">
      <div className="zh-hero__map zh-hero__map--zoom">
        <ZoneNeonMap
          geometry={zone.geometry}
          color={zone.zoneCategoryColor}
          width={1400}
          height={600}
          padding={60}
          gridSize={56}
          glowStd={7}
          strokeWidth={1.5}
          preserveAspectRatio="xMidYMid slice"
        />
      </div>
      <div className="zh-hero__overlay zh-hero__overlay--vignette" />
      <div className="zh-hero__scanline" />

      <div className="zh-hero__content zh-hero__content--center">
        <div className="zh-live-badge zh-fade-in" style={{ animationDelay: '0.1s' }}>
          <span className="zh-live-dot" />
          <span>Live Monitoring Active</span>
        </div>
        <h1 className="zh-title zh-title--mega zh-fade-in" style={{ animationDelay: '0.25s' }}>
          {zone.title}
        </h1>
        <p className="zh-subtitle zh-fade-in" style={{ animationDelay: '0.4s' }}>
          {zone.description}
        </p>
        <div className="zh-ctas zh-fade-in" style={{ animationDelay: '0.55s' }}>
          <button className="zh-btn zh-btn--primary">
            <ArrowRight size={16} strokeWidth={2.5} />
            Full details
          </button>
          <button className="zh-btn zh-btn--secondary">Share zone</button>
        </div>
      </div>
    </section>
  );
}

/* ───────────────── Variation B: Split editorial ───────────────── */
function HeroSplit() {
  return (
    <section className="zh-hero zh-hero--split">
      <div className="zh-hero__map">
        <ZoneNeonMap
          geometry={zone.geometry}
          color={zone.zoneCategoryColor}
          width={1200}
          height={700}
          padding={60}
          gridSize={64}
          glowStd={6}
          strokeWidth={1.5}
          preserveAspectRatio="xMidYMid slice"
        />
      </div>
      <div className="zh-hero__overlay" />

      <div className="zh-hero__grid">
        <div className="zh-hero__copy">
          <div className="zh-badge-row zh-fade-in">
            <ZoneCategoryBadge
              name={zone.zoneCategoryName}
              color={zone.zoneCategoryColor}
              icon={zone.zoneCategoryIcon}
            />
            <StatusBadge status={zone.status} />
            <VerificationBadge status={zone.verification} />
            <SeverityBadge level={zone.severity} />
          </div>
          <h1 className="zh-title zh-title--large zh-fade-in" style={{ animationDelay: '0.15s' }}>
            {zone.title}
          </h1>
          <p className="zh-subtitle zh-subtitle--left zh-fade-in" style={{ animationDelay: '0.3s' }}>
            {zone.description}
          </p>
          <div className="zh-meta-strip zh-fade-in" style={{ animationDelay: '0.45s' }}>
            <span><Clock size={13} /> {effectiveDates}</span>
            <span><MapPin size={13} /> {zone.locationContext}</span>
          </div>
          <div className="zh-ctas zh-ctas--left zh-fade-in" style={{ animationDelay: '0.6s' }}>
            <ZoneActions onFullDetails={() => {}} onShare={() => {}} onSave={() => {}} isSaved={false} />
          </div>
        </div>

        <div className="zh-hero__viz zh-float">
          <ZoneNeonMap
            geometry={zone.geometry}
            color={zone.zoneCategoryColor}
            width={520}
            height={420}
            padding={20}
            gridSize={28}
            glowStd={5}
            strokeWidth={2}
          />
        </div>
      </div>
    </section>
  );
}

/* ───────────────── Variation C: HUD command center ───────────────── */
function HeroHud() {
  return (
    <section className="zh-hero zh-hero--hud">
      <div className="zh-hero__map">
        <ZoneNeonMap
          geometry={zone.geometry}
          color={zone.zoneCategoryColor}
          width={1200}
          height={520}
          padding={50}
          gridSize={48}
          glowStd={6}
          strokeWidth={1.5}
          preserveAspectRatio="xMidYMid slice"
        />
      </div>
      <div className="zh-hero__overlay zh-hero__overlay--grid" />
      <div className="zh-radar-sweep" />
      <div className="zh-hud-grid" />

      <div className="zh-hero__top-hud">
        <div className="zh-hud-pill">
          <Radio size={13} />
          <span>LIVE FEED</span>
        </div>
        <div className="zh-hud-pill">
          <Activity size={13} />
          <span>SEVERITY {zone.severity}</span>
        </div>
      </div>

      <div className="zh-hero__center-hud">
        <h1 className="zh-title zh-title--hud zh-fade-in">{zone.title}</h1>
        <p className="zh-subtitle zh-subtitle--center zh-fade-in" style={{ animationDelay: '0.2s' }}>
          {zone.description}
        </p>
      </div>

      <div className="zh-hero__side-hud zh-hero__side-hud--left">
        <HeroCard>
          <div className="zh-hud-stat">
            <span className="zh-hud-stat__label">Effective window</span>
            <span className="zh-hud-stat__value">{effectiveDates}</span>
          </div>
        </HeroCard>
        <HeroCard>
          <div className="zh-hud-stat">
            <span className="zh-hud-stat__label">Status</span>
            <span className="zh-hud-stat__value" style={{ color: '#22c55e' }}>{zone.status}</span>
          </div>
        </HeroCard>
      </div>

      <div className="zh-hero__side-hud zh-hero__side-hud--right">
        <HeroCard>
          <div className="zh-hud-stat">
            <span className="zh-hud-stat__label">Area</span>
            <span className="zh-hud-stat__value">{zone.areaSqM ? (zone.areaSqM / 1_000_000).toFixed(1) : '—'} km²</span>
          </div>
        </HeroCard>
        <HeroCard>
          <div className="zh-hud-stat">
            <span className="zh-hud-stat__label">Vertices</span>
            <span className="zh-hud-stat__value">{zone.geometry?.coordinates?.[0]?.length - 1 || '—'}</span>
          </div>
        </HeroCard>
      </div>
    </section>
  );
}

/* ───────────────── Variation C2: HUD command center refined ───────────────── */

function HudCountdownBlocks({ remainingMs }) {
  const totalSeconds = Math.max(0, Math.floor((remainingMs || 0) / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const blocks = [
    { value: days, label: 'DAYS' },
    { value: hours, label: 'HOURS' },
    { value: minutes, label: 'MINS' },
    { value: seconds, label: 'SECS' },
  ];

  return (
    <div className="zh-countdown">
      {blocks.map((block) => (
        <div key={block.label} className="zh-countdown__block">
          <span className="zh-countdown__value">{block.value.toString().padStart(2, '0')}</span>
          <span className="zh-countdown__label">{block.label}</span>
        </div>
      ))}
    </div>
  );
}

function HeroHudRefined() {
  const { remainingMs } = useZoneTimeState(zone.startDate, zone.endDate);

  return (
    <section className="zh-hero zh-hero--hud-refined">
      <div className="zh-hud-refined__bg-grid" />

      <div className="zh-hud-refined__top">
        <div className="zh-hud-refined__eyebrow">
          <ZoneCategoryBadge
            name={zone.zoneCategoryName}
            color={zone.zoneCategoryColor}
            icon={zone.zoneCategoryIcon}
          />
          <StatusBadge status={zone.status} />
          <VerificationBadge status={zone.verification} />
          <SeverityBadge level={zone.severity} />
          <span className="zh-hud-refined__dates">{effectiveDates}</span>
        </div>
      </div>

      <div className="zh-hud-refined__body">
        <div className="zh-hud-refined__text">
          <h1 className="zh-title zh-title--hud-refined zh-fade-in">{zone.title}</h1>
          <p className="zh-subtitle zh-subtitle--center zh-fade-in" style={{ animationDelay: '0.15s' }}>
            {zone.description}
          </p>
        </div>

        <div className="zh-hud-refined__scope zh-fade-in" style={{ animationDelay: '0.3s' }}>
          <ZoneNeonMap
            geometry={zone.geometry}
            color={zone.zoneCategoryColor}
            width={520}
            height={360}
            padding={30}
            gridSize={28}
            glowStd={5}
            strokeWidth={2}
          />
        </div>

        <div className="zh-fade-in" style={{ animationDelay: '0.45s' }}>
          <HudCountdownBlocks remainingMs={remainingMs} />
        </div>
      </div>
    </section>
  );
}

/* ───────────────── Variation D: Bento dashboard ───────────────── */
function HeroBento() {
  return (
    <section className="zh-hero zh-hero--bento">
      <div className="zh-hero__map">
        <ZoneNeonMap
          geometry={zone.geometry}
          color={zone.zoneCategoryColor}
          width={1200}
          height={520}
          padding={60}
          gridSize={64}
          glowStd={6}
          strokeWidth={1.5}
          preserveAspectRatio="xMidYMid slice"
        />
      </div>
      <div className="zh-hero__overlay" />

      <div className="zh-bento">
        <div className="zh-bento__tile zh-bento__tile--title zh-fade-in">
          <div className="zh-badge-row">
            <ZoneCategoryBadge
              name={zone.zoneCategoryName}
              color={zone.zoneCategoryColor}
              icon={zone.zoneCategoryIcon}
            />
            <StatusBadge status={zone.status} />
          </div>
          <h1 className="zh-title zh-title--bento">{zone.title}</h1>
          <p className="zh-bento__desc">{zone.description}</p>
        </div>

        <div className="zh-bento__tile zh-bento__tile--window zh-fade-in" style={{ animationDelay: '0.15s' }}>
          <EffectiveWindowMeter startDate={zone.startDate} endDate={zone.endDate} />
        </div>

        <div className="zh-bento__tile zh-bento__tile--stats zh-fade-in" style={{ animationDelay: '0.25s' }}>
          <ZoneStatGrid
            areaSqM={zone.areaSqM}
            perimeterM={zone.perimeterM}
            geometry={zone.geometry}
            radiusM={zone.radiusM}
            geometryType={zone.geometryType}
          />
        </div>

        <div className="zh-bento__tile zh-bento__tile--viz zh-fade-in" style={{ animationDelay: '0.35s' }}>
          <ZoneNeonMap
            geometry={zone.geometry}
            color={zone.zoneCategoryColor}
            width={320}
            height={240}
            padding={14}
            gridSize={24}
            glowStd={4}
            strokeWidth={1.5}
          />
        </div>

        <div className="zh-bento__tile zh-bento__tile--actions zh-fade-in" style={{ animationDelay: '0.45s' }}>
          <ZoneActions onFullDetails={() => {}} onShare={() => {}} onSave={() => {}} isSaved={false} />
        </div>
      </div>
    </section>
  );
}

/* ───────────────── Variation E: Minimal typographic ───────────────── */
function HeroMinimal() {
  return (
    <section className="zh-hero zh-hero--minimal">
      <div className="zh-hero__watermark">
        <ZoneNeonMap
          geometry={zone.geometry}
          color={zone.zoneCategoryColor}
          width={900}
          height={720}
          padding={60}
          gridSize={80}
          glowStd={8}
          strokeWidth={1.5}
          preserveAspectRatio="xMidYMid slice"
        />
      </div>
      <div className="zh-hero__overlay zh-hero__overlay--fade" />

      <div className="zh-hero__content zh-hero__content--minimal">
        <span className="zh-eyebrow zh-fade-in">RESTRICTED AIRSPACE</span>
        <h1 className="zh-title zh-title--huge zh-fade-in" style={{ animationDelay: '0.15s' }}>
          {zone.title}
        </h1>
        <div className="zh-divider zh-fade-in" style={{ animationDelay: '0.3s' }} />
        <p className="zh-subtitle zh-subtitle--center zh-fade-in" style={{ animationDelay: '0.45s' }}>
          {zone.description}
        </p>
        <div className="zh-meta-pills zh-fade-in" style={{ animationDelay: '0.6s' }}>
          <span><Shield size={13} /> {zone.verification}</span>
          <span><Zap size={13} /> Severity {zone.severity}</span>
          <span><Clock size={13} /> {effectiveDates}</span>
        </div>
      </div>
    </section>
  );
}

/* ───────────────── Variation F: Drift particles ───────────────── */
function HeroDrift() {
  return (
    <section className="zh-hero zh-hero--drift">
      <div className="zh-particle-field">
        {Array.from({ length: 30 }).map((_, i) => (
          <span
            key={i}
            className="zh-particle"
            style={{
              '--dx': `${Math.random() * 200 - 100}px`,
              '--dy': `${Math.random() * 200 - 100}px`,
              '--dur': `${8 + Math.random() * 12}s`,
              '--del': `${Math.random() * 5}s`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${2 + Math.random() * 4}px`,
              height: `${2 + Math.random() * 4}px`,
            }}
          />
        ))}
      </div>
      <div className="zh-hero__map zh-hero__map--drift">
        <ZoneNeonMap
          geometry={zone.geometry}
          color={zone.zoneCategoryColor}
          width={1200}
          height={520}
          padding={60}
          gridSize={56}
          glowStd={7}
          strokeWidth={1.5}
          preserveAspectRatio="xMidYMid slice"
        />
      </div>
      <div className="zh-hero__overlay" />

      <div className="zh-hero__content zh-hero__content--bottom">
        <div className="zh-live-badge zh-fade-in">
          <span className="zh-live-dot" />
          <span>Tracking {zone.zoneCategoryName}</span>
        </div>
        <h1 className="zh-title zh-title--drift zh-fade-in" style={{ animationDelay: '0.15s' }}>
          {zone.title}
        </h1>
        <p className="zh-subtitle zh-fade-in" style={{ animationDelay: '0.3s' }}>
          {zone.description}
        </p>
      </div>
    </section>
  );
}

/* ───────────────── Variation G: HUD scope / command center v2 ───────────────── */

function formatHudCountdown(ms) {
  if (ms == null || ms <= 0) return '00:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) {
    return `${days}d ${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m`;
  }
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function ScopeSvg({ geometry, color }) {
  const ring = geometry?.coordinates?.[0];
  const projection = useMemo(
    () => (ring ? buildPolygonSvgProjection(ring, 400, 400, 30) : null),
    [ring]
  );

  if (!projection) return null;

  const uid = Math.random().toString(36).slice(2, 9);
  const gradId = `scope-grad-${uid}`;
  const glowId = `scope-glow-${uid}`;
  const clipId = `scope-clip-${uid}`;

  return (
    <svg className="zh-scope" viewBox="0 0 400 400">
      <defs>
        <radialGradient id={gradId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={color} stopOpacity="0.03" />
          <stop offset="55%" stopColor={color} stopOpacity="0.06" />
          <stop offset="85%" stopColor={color} stopOpacity="0.14" />
          <stop offset="100%" stopColor={color} stopOpacity="0.22" />
        </radialGradient>
        <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <clipPath id={clipId}>
          <circle cx="200" cy="200" r="190" />
        </clipPath>
      </defs>

      {/* scope rings */}
      {[0.25, 0.5, 0.75, 1].map((r, i) => (
        <circle
          key={i}
          cx="200"
          cy="200"
          r={190 * r}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="1"
        />
      ))}

      {/* crosshair */}
      <line x1="200" y1="10" x2="200" y2="390" stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeDasharray="4 4" />
      <line x1="10" y1="200" x2="390" y2="200" stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeDasharray="4 4" />

      {/* polygon clipped to scope */}
      <g clipPath={`url(#${clipId})`}>
        <path
          d={projection.path}
          fill={`url(#${gradId})`}
          stroke={color}
          strokeWidth="2"
          filter={`url(#${glowId})`}
        />
      </g>

      {/* rotating sweep */}
      <g className="zh-scope__sweep">
        <circle cx="200" cy="200" r="190" fill="none" stroke={color} strokeWidth="1" opacity="0.35" />
        <path d="M200,200 L200,10 A190,190 0 0,1 390,200 Z" fill={`${color}22`} />
      </g>

      {/* center blip */}
      <circle cx="200" cy="200" r="5" fill={color} className="zh-scope__blip" />
    </svg>
  );
}

function HeroHudScope() {
  const { remainingMs, state } = useZoneTimeState(zone.startDate, zone.endDate);
  const latestEvent = MOCK_TIMELINE[0];

  const statusColor =
    state === 'active' ? '#22c55e' : state === 'upcoming' ? '#3b82f6' : '#6b7280';

  return (
    <section className="zh-hero zh-hero--hud-scope">
      <div className="zh-hero__map">
        <ZoneNeonMap
          geometry={zone.geometry}
          color={zone.zoneCategoryColor}
          width={1200}
          height={520}
          padding={60}
          gridSize={64}
          glowStd={5}
          strokeWidth={1}
          preserveAspectRatio="xMidYMid slice"
        />
      </div>
      <div className="zh-hero__overlay zh-hero__overlay--hud" />
      <div className="zh-hud-grid" />

      <div className="zh-hud-scope__top">
        <div className="zh-hud-scope__pill">
          <Radio size={13} />
          <span>LIVE FEED</span>
        </div>
        <div className="zh-hud-scope__signal">
          <span>SAT LINK</span>
          <div className="zh-signal-bars">
            <span />
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>

      <div className="zh-hud-scope__layout">
        <div className="zh-hud-scope__side">
          <div className="zh-hud-scope__stat">
            <span className="zh-hud-scope__stat-label">Status</span>
            <span className="zh-hud-scope__stat-value" style={{ color: statusColor }}>
              {state.toUpperCase()}
            </span>
          </div>
          <div className="zh-hud-scope__stat">
            <span className="zh-hud-scope__stat-label">Verification</span>
            <span className="zh-hud-scope__stat-value">{zone.verification}</span>
          </div>
        </div>

        <div className="zh-hud-scope__center">
          <ScopeSvg geometry={zone.geometry} color={zone.zoneCategoryColor} />
          <div className="zh-hud-scope__countdown">
            <span className="zh-hud-scope__countdown-value">{formatHudCountdown(remainingMs)}</span>
            <span className="zh-hud-scope__countdown-label">TIME REMAINING</span>
          </div>
        </div>

        <div className="zh-hud-scope__side">
          <div className="zh-hud-scope__stat">
            <span className="zh-hud-scope__stat-label">Severity</span>
            <span className="zh-hud-scope__stat-value" style={{ color: zone.zoneCategoryColor }}>
              LEVEL {zone.severity}
            </span>
          </div>
          <div className="zh-hud-scope__gauge">
            <div className="zh-hud-scope__gauge-track">
              <div
                className="zh-hud-scope__gauge-fill"
                style={{ width: `${(zone.severity / 5) * 100}%`, background: zone.zoneCategoryColor }}
              />
            </div>
          </div>
          <div className="zh-hud-scope__stat">
            <span className="zh-hud-scope__stat-label">Last update</span>
            <span className="zh-hud-scope__stat-value">
              {latestEvent
                ? `${formatDate(latestEvent.timestamp)} · ${formatTime(latestEvent.timestamp)}`
                : '—'}
            </span>
          </div>
        </div>
      </div>

      <div className="zh-hud-scope__ticker">
        <div className="zh-hud-scope__ticker-label">LATEST</div>
        <div className="zh-hud-scope__ticker-text">
          {latestEvent ? `${latestEvent.title} — ${latestEvent.summary}` : 'No updates'}
        </div>
      </div>
    </section>
  );
}

/* ───────────────── HUD command center customized ───────────────── */

function CountdownBlocks({ remainingMs }) {
  const totalSeconds = Math.max(0, Math.floor((remainingMs || 0) / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const blocks = [
    { value: days, label: 'DAYS' },
    { value: hours, label: 'HOURS' },
    { value: minutes, label: 'MINS' },
    { value: seconds, label: 'SECS' },
  ];

  return (
    <div className="zh-countdown">
      {blocks.map((block) => (
        <div key={block.label} className="zh-countdown__block">
          <span className="zh-countdown__value">{block.value.toString().padStart(2, '0')}</span>
          <span className="zh-countdown__label">{block.label}</span>
        </div>
      ))}
    </div>
  );
}

function HudTagCard({ label, value, color, icon: Icon }) {
  return (
    <div className="zh-hud-module" style={{ '--module-color': color }}>
      <div className="zh-hud-module__accent" />
      <div className="zh-hud-module__content">
        <Icon size={12} style={{ color }} />
        <span className="zh-hud-module__label">{label}</span>
        <span className="zh-hud-module__value" style={{ color }}>
          {value}
        </span>
      </div>
    </div>
  );
}

function HeroHudCustom() {
  const { remainingMs } = useZoneTimeState(zone.startDate, zone.endDate);

  return (
    <section className="zh-hero zh-hero--hud">
      <div className="zh-hero__map">
        <ZoneNeonMap
          geometry={zone.geometry}
          color={zone.zoneCategoryColor}
          width={1200}
          height={720}
          padding={120}
          gridSize={48}
          glowStd={6}
          strokeWidth={1.5}
          preserveAspectRatio="xMidYMid meet"
        />
      </div>
      <div className="zh-hero__overlay zh-hero__overlay--grid" />
      <div className="zh-radar-sweep" />
      <div className="zh-hud-grid" />

      <div className="zh-hero__top-hud">
        <div className="zh-hud-pill">
          <Radio size={13} />
          <span>LIVE FEED</span>
        </div>
        <div className="zh-hud-pill">
          <Clock size={13} />
          <span>{effectiveDates}</span>
        </div>
      </div>

      <div className="zh-hero__center-hud">
        <h1 className="zh-title zh-title--hud zh-fade-in">{zone.title}</h1>
        <p className="zh-subtitle zh-subtitle--center zh-fade-in" style={{ animationDelay: '0.2s' }}>
          {zone.description}
        </p>
        <div className="zh-hud-countdown zh-fade-in" style={{ animationDelay: '0.4s' }}>
          <CountdownBlocks remainingMs={remainingMs} />
        </div>
      </div>

      <div className="zh-hero__side-hud zh-hero__side-hud--left">
        <HudTagCard
          label="Category"
          value={zone.zoneCategoryName}
          color={zone.zoneCategoryColor}
          icon={Hexagon}
        />
        <HudTagCard
          label="Status"
          value={zone.status}
          color="#22c55e"
          icon={Activity}
        />
      </div>

      <div className="zh-hero__side-hud zh-hero__side-hud--right">
        <HudTagCard
          label="Verification"
          value={zone.verification}
          color="#22c55e"
          icon={Shield}
        />
        <HudTagCard
          label="Severity"
          value={`LEVEL ${zone.severity}`}
          color="#ef4444"
          icon={AlertTriangle}
        />
      </div>
    </section>
  );
}

const HEROES = [
  { id: 'hud', label: 'HUD command center (original)', Component: HeroHud },
  { id: 'hud-custom', label: 'HUD command center customized', Component: HeroHudCustom },
];

export default function ZoneHeroesTrialPage() {
  const [selected, setSelected] = useState(null);

  return (
    <div className="zone-heroes-page">
      <header className="zone-heroes-header">
        <h1 className="zone-heroes-title">Zone hero laboratory</h1>
        <p className="zone-heroes-subtitle">
          Original HUD command center vs. the customized tag + countdown version. Pick one.
        </p>
        {selected && (
          <div className="zone-heroes-pick">
            Selected: <strong>{HEROES.find((h) => h.id === selected)?.label}</strong>
          </div>
        )}
      </header>

      {HEROES.map(({ id, label, Component }) => (
        <div key={id} className="zone-heroes-section">
          <div className="zone-heroes-label">
            <span>{label}</span>
            <button className="zone-heroes-select" onClick={() => setSelected(id)}>
              Use this
            </button>
          </div>
          <Component />
        </div>
      ))}
    </div>
  );
}
