import React, { useMemo, useState } from 'react';
import './ZoneTrial.css';
import './ZoneHeroesTrial.css';
import { MOCK_ZONE, MOCK_TIMELINE, MOCK_ZONE_NO_END, MOCK_TIMELINE_NO_END } from './zoneTrialData.js';
import {
  EffectiveWindowMeter,
  ZoneStatGrid,
  TimelineEvent,
  ZoneEvidenceModal,
  useZoneTrialEvents,
  ZoneNeonMap,
  useZoneTimeState,
  MapPin,
  Calendar,
  Ruler,
} from './ZoneTrialCommon.jsx';
import { formatDate, formatTime } from '@shared/components/incident-detail/IncidentUtils.js';
import { Hexagon, Activity, Shield, AlertTriangle, Radio, Clock, Link, Bookmark } from 'lucide-react';

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

function DemoTopBar({ demoMode, setDemoMode }) {
  return (
    <div className="zone-demo-topbar">
      <span className="zone-demo-topbar__label">Trial data</span>
      <div className="zone-demo-topbar__toggle">
        <button className={demoMode === 'notam' ? 'active' : ''} onClick={() => setDemoMode('notam')}>
          NOTAM
        </button>
        <button className={demoMode === 'curfew' ? 'active' : ''} onClick={() => setDemoMode('curfew')}>
          Curfew
        </button>
      </div>
    </div>
  );
}

function ZoneTrialHero({ zone, saved, onSave, onCopyLink }) {
  const { remainingMs, elapsedMs, state, end } = useZoneTimeState(zone.startDate, zone.endDate);
  const effectiveDates = `${zone.startDate ? formatDate(zone.startDate) : '—'} — ${
    zone.endDate ? formatDate(zone.endDate) : 'No expiry'
  }`;

  return (
    <section className="zh-hero zone-layout-b__hero--hud">
      <div className="zh-hero__map">
        <ZoneNeonMap
          geometry={zone.geometry}
          color={zone.zoneCategoryColor}
          width={1400}
          height={800}
          padding={200}
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
          {state === 'indefinite' || !end ? (
            <div className="zh-duration">
              <span className="zh-duration__label">Active for</span>
              <CountdownBlocks remainingMs={elapsedMs} />
            </div>
          ) : (
            <div className="zh-duration">
              <span className="zh-duration__label">Time remaining</span>
              <CountdownBlocks remainingMs={remainingMs} />
            </div>
          )}
        </div>
        <div className="zh-hud-actions zh-fade-in" style={{ animationDelay: '0.55s' }}>
          <button className="zh-hud-action" onClick={onCopyLink}>
            <Link size={13} />
            Copy link
          </button>
          <button className={`zh-hud-action ${saved ? 'saved' : ''}`} onClick={onSave}>
            <Bookmark size={13} />
            {saved ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>

      <div className="zh-hero__side-hud zh-hero__side-hud--left">
        <HudTagCard
          label="Category"
          value={zone.zoneCategoryName}
          color={zone.zoneCategoryColor}
          icon={Hexagon}
        />
        <HudTagCard label="Status" value={zone.status} color="#22c55e" icon={Activity} />
      </div>

      <div className="zh-hero__side-hud zh-hero__side-hud--right">
        <HudTagCard label="Verification" value={zone.verification} color="#22c55e" icon={Shield} />
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

export default function ZoneTrialLayoutB() {
  const [saved, setSaved] = useState(false);
  const [demoMode, setDemoMode] = useState('notam');
  const [modalEvent, setModalEvent] = useState(null);

  const zone = demoMode === 'notam' ? MOCK_ZONE : MOCK_ZONE_NO_END;
  const baseEvents = useMemo(
    () => (demoMode === 'notam' ? MOCK_TIMELINE : MOCK_TIMELINE_NO_END),
    [demoMode]
  );
  const { events, featuredItems, pin, feature, deleteItem, add, edit } = useZoneTrialEvents(baseEvents);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/trial/zone`;
    navigator.clipboard.writeText(url).catch(() => {});
  };

  return (
    <div className="zone-full-page">
      <DemoTopBar demoMode={demoMode} setDemoMode={setDemoMode} />
      <ZoneTrialHero
        zone={zone}
        saved={saved}
        onSave={() => setSaved((s) => !s)}
        onCopyLink={handleCopyLink}
      />

      <div className="zone-layout-b__body">
        <div className="zone-full-timeline">
          <h2 className="zone-full-section-title">Restriction timeline</h2>
          {events.map((event, idx) => (
            <TimelineEvent
              key={event.id}
              event={event}
              isLast={idx === events.length - 1}
              onOpenEvidence={setModalEvent}
              featuredItem={featuredItems[event.id]}
            />
          ))}
        </div>

        <aside className="zone-rail">
          <h2 className="zone-full-section-title">Zone overview</h2>
          <div className="zone-rail-card">
            <h3 className="zone-rail-card__title">Effective window</h3>
            <EffectiveWindowMeter startDate={zone.startDate} endDate={zone.endDate} />
          </div>

          <div className="zone-rail-card">
            <h3 className="zone-rail-card__title">Geometry</h3>
            <ZoneStatGrid
              areaSqM={zone.areaSqM}
              perimeterM={zone.perimeterM}
              geometry={zone.geometry}
              radiusM={zone.radiusM}
              geometryType={zone.geometryType}
            />
          </div>

          <div className="zone-rail-card">
            <h3 className="zone-rail-card__title">Location</h3>
            <div className="zone-rail-row">
              <MapPin size={15} />
              <span className="zone-rail-row__value">{zone.locationContext}</span>
            </div>
            <div className="zone-rail-row">
              <Calendar size={15} />
              <span className="zone-rail-row__value">
                Reported {formatDate(zone.startDate)} · {formatTime(zone.startDate)}
              </span>
            </div>
            <div className="zone-rail-row">
              <Ruler size={15} />
              <span className="zone-rail-row__value">Polygon boundary · WGS84</span>
            </div>
          </div>
        </aside>
      </div>

      {modalEvent && (
        <ZoneEvidenceModal
          event={modalEvent}
          featuredItem={featuredItems[modalEvent.id]}
          onClose={() => setModalEvent(null)}
          onPin={pin}
          onFeature={feature}
          onDelete={deleteItem}
          onAdd={add}
          onEdit={edit}
        />
      )}
    </div>
  );
}
