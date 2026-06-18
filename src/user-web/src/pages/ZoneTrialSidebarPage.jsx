import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ZoneTrial.css';
import { MOCK_ZONE, MOCK_TIMELINE, MOCK_ZONE_NO_END, MOCK_TIMELINE_NO_END } from './zoneTrialData.js';
import {
  ZoneCategoryBadge,
  VerificationBadge,
  StatusBadge,
  EffectiveWindowMeter,
  PolygonMiniMap,
  ZoneStatGrid,
  ZoneActions,
  TimelineEvent,
  ZoneEvidenceDrawer,
  useZoneTrialEvents,
  ArrowLeft,
  MapPin,
} from './ZoneTrialCommon.jsx';
import { SeverityBadge } from '@shared/components/SeverityBadge.jsx';

export default function ZoneTrialSidebarPage() {
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);
  const [demoMode, setDemoMode] = useState('notam');
  const [drawerEvent, setDrawerEvent] = useState(null);

  const baseEvents = useMemo(
    () => (demoMode === 'notam' ? MOCK_TIMELINE : MOCK_TIMELINE_NO_END),
    [demoMode]
  );
  const { events, featuredItems, pin, feature, deleteItem, add, edit } = useZoneTrialEvents(baseEvents);

  const zone = demoMode === 'notam' ? MOCK_ZONE : MOCK_ZONE_NO_END;

  const handleBack = () => navigate('/map');
  const handleFullDetails = () => navigate('/trial/zone');
  const handleShare = () => {
    const url = `${window.location.origin}/trial/zone-sidebar`;
    navigator.clipboard.writeText(url).catch(() => {});
  };

  return (
    <div className="zone-trial-page">
      <div className="zone-trial-map-placeholder" />

      <aside className="zone-trial-sidebar">
        <div className="zone-back-bar">
          <button className="zone-back-button" onClick={handleBack}>
            <ArrowLeft size={14} />
            Back to results
          </button>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            <button
              className={`zone-back-button ${demoMode === 'notam' ? 'active' : ''}`}
              onClick={() => setDemoMode('notam')}
              style={
                demoMode === 'notam'
                  ? { borderColor: 'var(--accent-light)', color: 'var(--text-primary)' }
                  : {}
              }
            >
              NOTAM
            </button>
            <button
              className={`zone-back-button ${demoMode === 'curfew' ? 'active' : ''}`}
              onClick={() => setDemoMode('curfew')}
              style={
                demoMode === 'curfew'
                  ? { borderColor: 'var(--accent-light)', color: 'var(--text-primary)' }
                  : {}
              }
            >
              Curfew
            </button>
          </div>
        </div>

        <div className="zone-sidebar-scroll">
          <div className="zone-summary" key={zone.id}>
            <div className="zone-badge-row">
              <ZoneCategoryBadge
                name={zone.zoneCategoryName}
                color={zone.zoneCategoryColor}
                icon={zone.zoneCategoryIcon}
              />
              <StatusBadge status={zone.status} />
              <VerificationBadge status={zone.verification} />
              <SeverityBadge level={zone.severity} />
            </div>

            <h1 className="zone-title">{zone.title}</h1>

            <EffectiveWindowMeter startDate={zone.startDate} endDate={zone.endDate} />

            <PolygonMiniMap geometry={zone.geometry} color={zone.zoneCategoryColor} />

            <ZoneStatGrid
              areaSqM={zone.areaSqM}
              perimeterM={zone.perimeterM}
              geometry={zone.geometry}
            />

            <p className="zone-description">{zone.description}</p>

            <div className="zone-meta-row">
              <MapPin size={14} />
              <span>{zone.locationContext}</span>
            </div>

            <ZoneActions
              onFullDetails={handleFullDetails}
              onShare={handleShare}
              onSave={() => setSaved((s) => !s)}
              isSaved={saved}
            />
          </div>

          <div className="zone-section-title">Restriction timeline</div>
          <div className="zone-timeline" key={`${zone.id}-timeline`}>
            {events.map((event, idx) => (
              <TimelineEvent
                key={event.id}
                event={event}
                isLast={idx === events.length - 1}
                onOpenEvidence={setDrawerEvent}
                featuredItem={featuredItems[event.id]}
              />
            ))}
          </div>
        </div>

        {drawerEvent && (
          <ZoneEvidenceDrawer
            event={drawerEvent}
            featuredItem={featuredItems[drawerEvent.id]}
            onClose={() => setDrawerEvent(null)}
            onPin={pin}
            onFeature={feature}
            onDelete={deleteItem}
            onAdd={add}
            onEdit={edit}
          />
        )}
      </aside>
    </div>
  );
}
