import React, { useState } from 'react';
import { Edit3, Trash2, CheckCircle, MapPin, Plus } from 'lucide-react';
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
  UpdateFormModal,
  useZoneFeaturedItems,
  ArrowLeft,
} from './ZoneTrialCommon.jsx';
import { SeverityBadge } from '@shared/components/SeverityBadge.jsx';
import './ZoneTrial.css';

export default function ZoneDetailSidebar({
  incident,
  timeline = [],
  onBack,
  onFullDetails,
  onShare,
  onSave,
  isSaved = false,
  onEditZoneInfo,
  onEditZoneShape,
  onResolve,
  onDelete,
  onAddUpdate,
  onEditUpdate,
  onDeleteUpdate,
  onAddEvidence,
  onEditEvidence,
  onDeleteEvidence,
  onPinEvidence,
  onFeatureEvidence,
  onClearFeatureEvidence,
  onCheckSource,
}) {
  const [drawerEvent, setDrawerEvent] = useState(null);
  const [addUpdateOpen, setAddUpdateOpen] = useState(false);
  const { featuredItems, feature } = useZoneFeaturedItems(timeline);

  const handleFeature = (eventId, payload) => {
    const { sourceType, sourceId } = payload;
    feature(eventId, { sourceType, sourceId });
    const current = featuredItems[eventId];
    if (current && current.sourceType === sourceType && current.sourceId === sourceId) {
      onClearFeatureEvidence?.(eventId);
    } else {
      onFeatureEvidence?.(eventId, payload);
    }
  };

  const handleVerificationChange = (eventId, status) => {
    onEditUpdate?.(eventId, { verificationStatus: status });
  };

  const handleAddUpdateSave = (form) => {
    onAddUpdate?.(form);
    setAddUpdateOpen(false);
  };

  const zoneColor = incident.zoneCategoryColor || '#6366f1';

  return (
    <aside className="zone-detail-sidebar">
      <div className="zone-back-bar">
        <button className="zone-back-button" onClick={onBack}>
          <ArrowLeft size={14} />
          Back to results
        </button>
      </div>

      <div className="zone-sidebar-scroll">
        <div className="zone-summary" key={incident.id}>
          <div className="zone-badge-row">
            <ZoneCategoryBadge
              name={incident.zoneCategoryName || 'Zone'}
              color={zoneColor}
              icon={incident.zoneCategoryIcon || 'hexagon'}
            />
            <StatusBadge status={incident.status} />
            <VerificationBadge status={incident.verification} />
            <SeverityBadge level={incident.severity} />
          </div>

          <h1 className="zone-title">{incident.title}</h1>

          <EffectiveWindowMeter startDate={incident.startDate} endDate={incident.endDate} />

          <PolygonMiniMap geometry={incident.geometry} color={zoneColor} animated />

          <ZoneStatGrid
            areaSqM={incident.areaSqM}
            perimeterM={incident.perimeterM}
            geometry={incident.geometry}
          />

          {incident.description && <p className="zone-description">{incident.description}</p>}

          {incident.locationContext && (
            <div className="zone-meta-row">
              <MapPin size={14} />
              <span>{incident.locationContext}</span>
            </div>
          )}

          <ZoneActions
            onFullDetails={onFullDetails}
            onShare={onShare}
            onSave={() => onSave?.(!isSaved)}
            isSaved={isSaved}
          />

          <div className="zone-admin-actions">
            <button type="button" className="zone-btn" onClick={onEditZoneInfo}>
              <Edit3 size={12} />
              Edit info
            </button>
            <button type="button" className="zone-btn" onClick={onEditZoneShape}>
              <MapPin size={12} />
              Edit shape
            </button>
            {incident.status !== 'resolved' && (
              <button type="button" className="zone-btn zone-btn--success" onClick={onResolve}>
                <CheckCircle size={12} />
                Resolve
              </button>
            )}
            <button type="button" className="zone-btn zone-btn--danger" onClick={onDelete}>
              <Trash2 size={12} />
              Delete
            </button>
          </div>
        </div>

        {timeline.length > 0 && (
          <>
            <div className="zone-section-title zone-section-title--timeline">
              <span>Restriction timeline</span>
              {onAddUpdate && (
                <button
                  type="button"
                  className="zone-btn zone-btn--small"
                  onClick={() => setAddUpdateOpen(true)}
                >
                  <Plus size={12} />
                  Add update
                </button>
              )}
            </div>
            <div className="zone-timeline" key={`${incident.id}-timeline`}>
              {timeline.map((event, idx) => (
                <TimelineEvent
                  key={event.id}
                  event={event}
                  isLast={idx === timeline.length - 1}
                  onOpenEvidence={setDrawerEvent}
                  featuredItem={featuredItems[event.id]}
                  isAdmin
                  variant="sidebar"
                  onEditUpdate={onEditUpdate}
                  onDeleteUpdate={onDeleteUpdate}
                  onVerificationChange={handleVerificationChange}
                  onFeature={handleFeature}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {drawerEvent && (
        <ZoneEvidenceDrawer
          event={drawerEvent}
          featuredItem={featuredItems[drawerEvent.id]}
          onClose={() => setDrawerEvent(null)}
          onEditUpdate={onEditUpdate}
          onDeleteUpdate={onDeleteUpdate}
          onPin={onPinEvidence}
          onFeature={handleFeature}
          onDelete={onDeleteEvidence}
          onAdd={onAddEvidence}
          onEdit={onEditEvidence}
          onCheck={onCheckSource}
        />
      )}

      {addUpdateOpen && (
        <UpdateFormModal onClose={() => setAddUpdateOpen(false)} onSave={handleAddUpdateSave} />
      )}
    </aside>
  );
}
