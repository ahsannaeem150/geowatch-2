import React, { useState } from 'react';
import { Edit3, Trash2, CheckCircle, MapPin, Plus, ExternalLink, RotateCcw } from 'lucide-react';
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
import { formatDate, formatTime } from '@shared/components/incident-detail/IncidentUtils.js';
import StatusHistory from '@shared/components/incident-detail/StatusHistory.jsx';
import DebugMetadata from '@shared/components/incident-detail/DebugMetadata.jsx';
import './ZoneTrial.css';

export default function ZoneDetailSidebar({
  incident,
  timeline = [],
  mode = 'user',
  onBack,
  onFullDetails,
  onShare,
  onSave,
  isSaved = false,
  onEditZoneInfo,
  onEditZoneShape,
  onResolve,
  onDelete,
  onRestore,
  onPurge,
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
  onArchiveSource,
  onOpenAudit,
  onViewCreator,
  auditLogs = [],
}) {
  const [drawerEvent, setDrawerEvent] = useState(null);
  const [addUpdateOpen, setAddUpdateOpen] = useState(false);
  const { featuredItems, feature } = useZoneFeaturedItems(timeline);

  const effectiveMode =
    mode ||
    (onEditZoneInfo || onEditZoneShape || onResolve || onDelete || onAddUpdate || onEditUpdate
      ? 'admin'
      : 'user');
  const isAdmin = effectiveMode === 'admin' || effectiveMode === 'superadmin';
  const isSuper = effectiveMode === 'superadmin';
  const isDeleted = incident.status === 'deleted';
  const isPurged = incident.status === 'purged';
  const isReadOnly = isDeleted || isPurged;

  const handleFeature = (eventId, payload) => {
    if (!isAdmin) return;
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
    if (!isAdmin) return;
    onEditUpdate?.(eventId, { verificationStatus: status });
  };

  const handleAddUpdateSave = (form) => {
    if (!isAdmin) return;
    onAddUpdate?.(form);
    setAddUpdateOpen(false);
  };

  const zoneColor = incident.zoneCategoryColor || '#6366f1';

  return (
    <aside className="zone-detail-sidebar" data-role={effectiveMode}>
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

          {isPurged && (
            <div className="id-banner id-banner--purged">
              <div className="id-banner__title">This zone has been permanently deleted.</div>
              {incident.purgedAt && (
                <div>
                  Purged {formatDate(incident.purgedAt)} · {formatTime(incident.purgedAt)}
                </div>
              )}
              {incident.originalStatus && <div>Original status: {incident.originalStatus}</div>}
            </div>
          )}

          {isDeleted && (
            <div className="id-banner id-banner--deleted">
              <div className="id-banner__title">This zone has been moved to the Recycle Bin.</div>
              {incident.deletedAt && (
                <div>
                  Deleted {formatDate(incident.deletedAt)} · {formatTime(incident.deletedAt)}
                </div>
              )}
              {incident.deletedByName && <div>Deleted by {incident.deletedByName}</div>}
              {incident.originalStatus && <div>Original status: {incident.originalStatus}</div>}
              <div className="id-banner__actions">
                <button type="button" className="id-btn" onClick={() => onRestore?.()}>
                  <RotateCcw size={12} /> Restore
                </button>
                <button type="button" className="id-btn-danger" onClick={() => onPurge?.()}>
                  <Trash2 size={12} /> Purge permanently
                </button>
              </div>
            </div>
          )}

          {isAdmin && !isReadOnly && (
            <div className="zone-admin-actions">
              <button type="button" className="zone-btn" onClick={() => onEditZoneInfo?.()}>
                <Edit3 size={12} />
                Edit info
              </button>
              {onEditZoneShape && (
                <button type="button" className="zone-btn" onClick={() => onEditZoneShape?.()}>
                  <MapPin size={12} />
                  Edit shape
                </button>
              )}
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
              {isSuper && (
                <>
                  <button type="button" className="zone-btn" onClick={() => onOpenAudit?.()}>
                    📋 Audit log
                  </button>
                  <button type="button" className="zone-btn" onClick={() => onViewCreator?.(incident.createdBy)}>
                    <ExternalLink size={12} />
                    View creator
                  </button>
                </>
              )}
            </div>
          )}

          {isSuper && <StatusHistory incident={incident} logs={auditLogs} onUserClick={onViewCreator} />}
          {isSuper && <DebugMetadata incident={incident} />}
        </div>

        {timeline.length > 0 && !isReadOnly && (
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
                  isAdmin={isAdmin}
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
          onArchiveSource={onArchiveSource}
          mode={effectiveMode}
        />
      )}

      {addUpdateOpen && (
        <UpdateFormModal onClose={() => setAddUpdateOpen(false)} onSave={handleAddUpdateSave} />
      )}
    </aside>
  );
}
