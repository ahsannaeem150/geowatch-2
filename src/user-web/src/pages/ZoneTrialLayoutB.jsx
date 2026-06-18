import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ZoneTrial.css';
import { MOCK_ZONE, MOCK_TIMELINE, MOCK_ZONE_NO_END, MOCK_TIMELINE_NO_END } from './zoneTrialData.js';
import {
  ZoneCategoryBadge,
  VerificationBadge,
  StatusBadge,
  EffectiveWindowMeter,
  ZoneStatGrid,
  ZoneActions,
  TimelineEvent,
  ZoneEvidenceModal,
  useZoneTrialEvents,
  ZoneNeonMap,
  MapPin,
  Calendar,
  Ruler,
} from './ZoneTrialCommon.jsx';
import { SeverityBadge } from '@shared/components/SeverityBadge.jsx';
import { formatDate, formatTime } from '@shared/components/incident-detail/IncidentUtils.js';

function HeroPolygonMap({ geometry, color }) {
  return (
    <div className="zone-layout-b__map">
      <ZoneNeonMap
        geometry={geometry}
        color={color}
        width={1600}
        height={720}
        padding={80}
        gridSize={72}
        glowStd={6}
        strokeWidth={1.5}
        preserveAspectRatio="xMidYMid slice"
      />
    </div>
  );
}

export default function ZoneTrialLayoutB() {
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);
  const [demoMode, setDemoMode] = useState('notam');
  const [modalEvent, setModalEvent] = useState(null);

  const zone = demoMode === 'notam' ? MOCK_ZONE : MOCK_ZONE_NO_END;
  const baseEvents = useMemo(
    () => (demoMode === 'notam' ? MOCK_TIMELINE : MOCK_TIMELINE_NO_END),
    [demoMode]
  );
  const { events, featuredItems, pin, feature, deleteItem, add, edit } = useZoneTrialEvents(baseEvents);

  const handleShare = () => {
    const url = `${window.location.origin}/trial/zone`;
    navigator.clipboard.writeText(url).catch(() => {});
  };

  return (
    <div className="zone-full-page">
      <section className="zone-layout-b__hero">
        <HeroPolygonMap geometry={zone.geometry} color={zone.zoneCategoryColor} />
        <div className="zone-layout-b__overlay" />

        <div className="zone-layout-b__top-bar">
          <div className="zone-layout-b__eyebrow">
            <ZoneCategoryBadge
              name={zone.zoneCategoryName}
              color={zone.zoneCategoryColor}
              icon={zone.zoneCategoryIcon}
            />
            <StatusBadge status={zone.status} />
            <VerificationBadge status={zone.verification} />
            <SeverityBadge level={zone.severity} />
            <span className="zone-layout-b__dates">
              {zone.startDate ? formatDate(zone.startDate) : '—'} —{' '}
              {zone.endDate ? formatDate(zone.endDate) : 'No expiry'}
            </span>
          </div>

          <div className="zone-layout-b__demo-toggle">
            <button
              className={demoMode === 'notam' ? 'active' : ''}
              onClick={() => setDemoMode('notam')}
            >
              NOTAM
            </button>
            <button
              className={demoMode === 'curfew' ? 'active' : ''}
              onClick={() => setDemoMode('curfew')}
            >
              Curfew
            </button>
          </div>
        </div>

        <div className="zone-layout-b__meta">
          <div
            className="zone-layout-b__card"
            style={{ borderLeftColor: zone.zoneCategoryColor }}
          >
            <div className="zone-layout-b__card-main">
              <h1 className="zone-layout-b__title">{zone.title}</h1>
              <p className="zone-layout-b__desc">{zone.description}</p>
            </div>
            <div className="zone-layout-b__card-actions">
              <ZoneActions
                onFullDetails={() => navigate('/trial/zone-sidebar')}
                onShare={handleShare}
                onSave={() => setSaved((s) => !s)}
                isSaved={saved}
              />
            </div>
          </div>
        </div>
      </section>

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
