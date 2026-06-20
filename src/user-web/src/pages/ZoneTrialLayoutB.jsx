import React, { useEffect, useMemo, useRef, useState } from 'react';
import './ZoneTrial.css';
import './ZoneHeroesTrial.css';
import { MOCK_ZONE, MOCK_TIMELINE, MOCK_ZONE_NO_END, MOCK_TIMELINE_NO_END } from './zoneTrialData.js';
import {
  EffectiveWindowMeter,
  ZoneStatGrid,
  TimelineEvent,
  ZoneEvidenceRail,
  useZoneTrialEvents,
  ZoneNeonMap,
  useZoneTimeState,
  MapPin,
  Calendar,
  Ruler,
} from './ZoneTrialCommon.jsx';
import { formatDate, formatTime } from '@shared/components/incident-detail/IncidentUtils.js';
import { useNavigate } from 'react-router-dom';
import { Hexagon, Activity, Shield, AlertTriangle, Radio, Clock, Link, Bookmark, ArrowLeft } from 'lucide-react';

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

function ZoneTrialBackBar() {
  const navigate = useNavigate();
  return (
    <div className="zone-trial-backbar">
      <button className="zone-trial-backbar__btn" onClick={() => navigate('/map')}>
        <ArrowLeft size={16} />
        Back to map
      </button>
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

  const zone = demoMode === 'notam' ? MOCK_ZONE : MOCK_ZONE_NO_END;
  const baseEvents = useMemo(
    () => (demoMode === 'notam' ? MOCK_TIMELINE : MOCK_TIMELINE_NO_END),
    [demoMode]
  );
  const {
    events,
    featuredItems,
    pin,
    feature,
    clearFeature,
    deleteItem,
    add,
    edit,
    editEvent,
    deleteEvent,
  } = useZoneTrialEvents(baseEvents);

  const [selectedEventId, setSelectedEventId] = useState(() => events[0]?.id);

  useEffect(() => {
    setSelectedEventId(events[0]?.id);
  }, [events]);

  useEffect(() => {
    let wrapper = document.querySelector('.zone-full-page')?.parentElement;
    while (wrapper) {
      const overflowY = window.getComputedStyle(wrapper).overflowY;
      if (overflowY === 'auto' || overflowY === 'scroll') break;
      wrapper = wrapper.parentElement;
    }
    if (!wrapper) return;
    const original = wrapper.style.overflow;
    wrapper.style.overflow = 'visible';
    return () => {
      wrapper.style.overflow = original;
    };
  }, []);

  const activeIndex = useMemo(() => events.findIndex((e) => e.id === selectedEventId), [events, selectedEventId]);
  const activeEvent = events[activeIndex] || events[0];
  const hasPrev = activeIndex > 0;
  const hasNext = activeIndex >= 0 && activeIndex < events.length - 1;
  const eventRefs = useRef({});
  const railTopRef = useRef(null);

  useEffect(() => {
    const rail = document.querySelector('.zone-evidence-rail');
    if (rail) {
      railTopRef.current = rail.getBoundingClientRect().top + window.scrollY;
    }
    const onResize = () => {
      const r = document.querySelector('.zone-evidence-rail');
      if (r) {
        railTopRef.current = r.getBoundingClientRect().top + window.scrollY;
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const scrollToEvent = (event) => {
    const el = eventRefs.current[event.id];
    if (!el) return;
    const itemTarget = window.scrollY + el.getBoundingClientRect().top - window.innerHeight * 0.35;
    let targetScroll = itemTarget;

    const bodyEl = document.querySelector('.zone-layout-b__body--rail');
    const railEl = document.querySelector('.zone-evidence-rail');
    if (bodyEl && railEl && railTopRef.current != null) {
      const railTopDoc = railTopRef.current;
      const railTarget = Math.max(0, railTopDoc - 80);
      targetScroll = Math.max(targetScroll, railTarget);

      const bodyRect = bodyEl.getBoundingClientRect();
      const bodyTopDoc = bodyRect.top + window.scrollY;
      const bodyBottomPadding = parseFloat(window.getComputedStyle(bodyEl).paddingBottom) || 0;
      const gridAreaBottomDoc = bodyTopDoc + bodyEl.offsetHeight - bodyBottomPadding;
      const maxScroll = Math.max(0, gridAreaBottomDoc - railEl.offsetHeight - 80);
      targetScroll = Math.min(targetScroll, maxScroll);
    }

    window.scrollTo({ top: targetScroll, behavior: 'smooth' });
  };

  const goTo = (idx) => {
    const ev = events[idx];
    if (!ev) return;
    setSelectedEventId(ev.id);
    scrollToEvent(ev);
  };

  const handleSelectEvent = (event) => {
    setSelectedEventId(event.id);
    scrollToEvent(event);
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/trial/zone`;
    navigator.clipboard.writeText(url).catch(() => {});
  };

  return (
    <div className="zone-full-page">
      <ZoneTrialBackBar />
      <DemoTopBar demoMode={demoMode} setDemoMode={setDemoMode} />
      <ZoneTrialHero
        zone={zone}
        saved={saved}
        onSave={() => setSaved((s) => !s)}
        onCopyLink={handleCopyLink}
      />

      <div className="zone-layout-b__body zone-layout-b__body--rail">
        <div className="zone-full-timeline zone-full-timeline--rail">
          <h2 className="zone-full-section-title">Restriction timeline</h2>
          {events.map((event, idx) => (
            <div
              key={event.id}
              ref={(el) => {
                eventRefs.current[event.id] = el;
              }}
            >
              <TimelineEvent
                event={event}
                isLast={idx === events.length - 1}
                onOpenEvidence={handleSelectEvent}
                featuredItem={featuredItems[event.id]}
                onClearFeature={clearFeature}
                isAdmin
                variant="rail"
                isActive={event.id === selectedEventId}
                onEditUpdate={editEvent}
                onDeleteUpdate={deleteEvent}
                onVerificationChange={(id, status) => editEvent(id, { verificationStatus: status })}
              />
            </div>
          ))}
        </div>

        {activeEvent && (
          <div className="zone-evidence-rail">
            <h2 className="zone-full-section-title">Selected update</h2>
            <ZoneEvidenceRail
              event={activeEvent}
              featuredItem={featuredItems[activeEvent.id]}
              onPrev={() => goTo(activeIndex - 1)}
              onNext={() => goTo(activeIndex + 1)}
              hasPrev={hasPrev}
              hasNext={hasNext}
              onPin={pin}
              onFeature={feature}
              onDelete={deleteItem}
              onAdd={add}
              onEdit={edit}
              onClearFeature={clearFeature}
            />
          </div>
        )}

        <aside className="zone-rail zone-rail--overview">
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
    </div>
  );
}
