import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  EffectiveWindowMeter,
  ZoneStatGrid,
  TimelineEvent,
  ZoneEvidenceRail,
  UpdateFormModal,
  useZoneFeaturedItems,
  ZoneNeonMap,
  useZoneTimeState,
  MapPin,
  Calendar,
  Ruler,
} from './ZoneTrialCommon.jsx';
import ZoneEditorSidebar from './ZoneEditorSidebar.jsx';
import { formatDate, formatTime } from '@shared/components/incident-detail/IncidentUtils.js';
import StatusHistory from '@shared/components/incident-detail/StatusHistory.jsx';
import DebugMetadata from '@shared/components/incident-detail/DebugMetadata.jsx';
import {
  Hexagon,
  Activity,
  Shield,
  AlertTriangle,
  Radio,
  Clock,
  Link,
  Bookmark,
  ArrowLeft,
  Edit3,
  MapPin as MapPinIcon,
  CheckCircle,
  Trash2,
  Plus,
  ExternalLink,
} from 'lucide-react';
import './ZoneTrial.css';
import './ZoneHeroesTrial.css';

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

function ZoneTrialHero({ zone, saved, onSave, onCopyLink }) {
  const { remainingMs, elapsedMs, durationMs, state, end } = useZoneTimeState(zone.startDate, zone.endDate);
  const effectiveDates = `${zone.startDate ? formatDate(zone.startDate) : '—'} — ${
    zone.endDate ? formatDate(zone.endDate) : 'No expiry'
  }`;

  const countdown =
    state === 'expired' && durationMs != null ? (
      <div className="zh-duration">
        <span className="zh-duration__label">Lasted for</span>
        <CountdownBlocks remainingMs={durationMs} />
      </div>
    ) : state === 'upcoming' ? (
      <div className="zh-duration">
        <span className="zh-duration__label">Starts in</span>
        <CountdownBlocks remainingMs={remainingMs} />
      </div>
    ) : state === 'indefinite' || !end ? (
      <div className="zh-duration">
        <span className="zh-duration__label">Active for</span>
        <CountdownBlocks remainingMs={elapsedMs} />
      </div>
    ) : (
      <div className="zh-duration">
        <span className="zh-duration__label">Time remaining</span>
        <CountdownBlocks remainingMs={remainingMs} />
      </div>
    );

  return (
    <section className="zh-hero zone-layout-b__hero--hud">
      <div className="zh-hero__map">
        <ZoneNeonMap
          geometry={zone.geometry}
          color={zone.zoneCategoryColor || '#6366f1'}
          width={1400}
          height={800}
          padding={48}
          gridSize={48}
          glowStd={6}
          strokeWidth={1.5}
          preserveAspectRatio="xMidYMid meet"
          fitMode="polygon-aspect"
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
          {countdown}
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
          value={zone.zoneCategoryName || 'Zone'}
          color={zone.zoneCategoryColor || '#6366f1'}
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

function ZoneAdminTopBar({
  onBack,
  onEditInfo,
  onEditShape,
  onResolve,
  onDelete,
  onAddUpdate,
  onOpenAudit,
  onViewCreator,
  status,
  mode = 'user',
}) {
  const isSuper = mode === 'superadmin';
  return (
    <div className="zone-admin-topbar" data-role={mode}>
      <button type="button" className="zone-trial-backbar__btn" onClick={onBack}>
        <ArrowLeft size={16} />
        Back
      </button>
      <div className="zone-admin-topbar__actions">
        {onAddUpdate && (
          <button type="button" className="zone-admin-topbar__btn" onClick={onAddUpdate}>
            <Plus size={14} />
            Add update
          </button>
        )}
        {onEditInfo && (
          <button type="button" className="zone-admin-topbar__btn" onClick={onEditInfo}>
            <Edit3 size={14} />
            Edit info
          </button>
        )}
        {onEditShape && (
          <button type="button" className="zone-admin-topbar__btn" onClick={onEditShape}>
            <MapPinIcon size={14} />
            Edit shape
          </button>
        )}
        {status !== 'resolved' && onResolve && (
          <button type="button" className="zone-admin-topbar__btn zone-admin-topbar__btn--success" onClick={onResolve}>
            <CheckCircle size={14} />
            Resolve
          </button>
        )}
        {onDelete && (
          <button type="button" className="zone-admin-topbar__btn zone-admin-topbar__btn--danger" onClick={onDelete}>
            <Trash2 size={14} />
            Delete
          </button>
        )}
        {isSuper && onOpenAudit && (
          <button type="button" className="zone-admin-topbar__btn" onClick={onOpenAudit}>
            📋 Audit log
          </button>
        )}
        {isSuper && onViewCreator && (
          <button type="button" className="zone-admin-topbar__btn" onClick={() => onViewCreator()}>
            <ExternalLink size={14} />
            View creator
          </button>
        )}
      </div>
    </div>
  );
}

export default function ZoneDetailPage({
  incident,
  timeline = [],
  mode = 'user',
  onBack,
  onCopyLink,
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
  const [saved, setSaved] = useState(isSaved);
  const [selectedEventId, setSelectedEventId] = useState(() => timeline[0]?.id);
  const [infoOpen, setInfoOpen] = useState(false);
  const [addUpdateOpen, setAddUpdateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { featuredItems, feature } = useZoneFeaturedItems(timeline);
  const eventRefs = useRef({});
  const railTopRef = useRef(null);

  useEffect(() => {
    setSaved(isSaved);
  }, [isSaved]);

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

  useEffect(() => {
    setSelectedEventId((prev) => {
      const keep = prev && timeline.some((e) => e.id === prev);
      if (keep) return prev;
      return timeline[0]?.id;
    });
  }, [timeline]);

  // No parent overflow hacks — they can reset scroll position on remount.

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

  const activeIndex = useMemo(
    () => timeline.findIndex((e) => e.id === selectedEventId),
    [timeline, selectedEventId]
  );
  const activeEvent = timeline[activeIndex] || timeline[0];
  const hasPrev = activeIndex > 0;
  const hasNext = activeIndex >= 0 && activeIndex < timeline.length - 1;

  const scrollToEvent = (event) => {
    const el = eventRefs.current[event.id];
    if (!el) return;
    const itemTarget = window.scrollY + el.getBoundingClientRect().top - window.innerHeight * 0.35;
    let targetScroll = itemTarget;

    const bodyEl = document.querySelector('.zone-layout-b__body--rail');
    const railEl = document.querySelector('.zone-evidence-rail');
    if (bodyEl && railEl && railTopRef.current != null) {
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
    const ev = timeline[idx];
    if (!ev) return;
    setSelectedEventId(ev.id);
    scrollToEvent(ev);
  };

  const handleSelectEvent = (event) => {
    setSelectedEventId(event.id);
    scrollToEvent(event);
  };

  const handleSave = () => {
    const next = !saved;
    onSave?.(next);
  };

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

  const handleInfoSubmit = async ({ payload }) => {
    setSubmitting(true);
    try {
      await onEditZoneInfo?.(payload);
      setInfoOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddUpdateSave = (form) => {
    onAddUpdate?.(form);
    setAddUpdateOpen(false);
  };

  const hasAdminActions = onEditZoneInfo || onEditZoneShape || onResolve || onDelete || onAddUpdate;

  return (
    <div className="zone-full-page" data-selected-event-id={selectedEventId}>
      {(onBack || hasAdminActions || isSuper) && (
        <ZoneAdminTopBar
          onBack={onBack}
          onEditInfo={!isReadOnly && onEditZoneInfo ? () => setInfoOpen(true) : undefined}
          onEditShape={!isReadOnly && onEditZoneShape ? onEditZoneShape : undefined}
          onResolve={!isReadOnly && onResolve ? onResolve : undefined}
          onDelete={!isReadOnly && onDelete ? onDelete : undefined}
          onAddUpdate={!isReadOnly && onAddUpdate ? () => setAddUpdateOpen(true) : undefined}
          onOpenAudit={onOpenAudit}
          onViewCreator={() => onViewCreator?.(incident.createdBy)}
          status={incident.status}
          mode={effectiveMode}
        />
      )}

      <ZoneTrialHero
        zone={incident}
        saved={saved}
        onSave={handleSave}
        onCopyLink={onCopyLink}
      />

      <div className="zone-layout-b__body zone-layout-b__body--rail">
        <div className="zone-full-timeline zone-full-timeline--rail">
          <h2 className="zone-full-section-title">Restriction timeline</h2>
          {timeline.map((event, idx) => (
            <div
              key={event.id}
              ref={(el) => {
                eventRefs.current[event.id] = el;
              }}
            >
              <TimelineEvent
                event={event}
                isLast={idx === timeline.length - 1}
                onOpenEvidence={handleSelectEvent}
                featuredItem={featuredItems[event.id]}
                isAdmin={isAdmin}
                variant="rail"
                isActive={event.id === selectedEventId}
                onEditUpdate={onEditUpdate}
                onDeleteUpdate={onDeleteUpdate}
                onVerificationChange={handleVerificationChange}
                onFeature={handleFeature}
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
              onPin={onPinEvidence}
              onFeature={isAdmin ? handleFeature : undefined}
              onDelete={onDeleteEvidence}
              onAdd={onAddEvidence}
              onEdit={onEditEvidence}
              onCheck={onCheckSource}
              onArchiveSource={onArchiveSource}
              onEditUpdate={onEditUpdate}
              onDeleteUpdate={onDeleteUpdate}
              mode={effectiveMode}
            />
          </div>
        )}

        <aside className="zone-rail zone-rail--overview">
          <h2 className="zone-full-section-title">Zone overview</h2>
          <div className="zone-rail-card">
            <h3 className="zone-rail-card__title">Effective window</h3>
            <EffectiveWindowMeter startDate={incident.startDate} endDate={incident.endDate} />
          </div>

          <div className="zone-rail-card">
            <h3 className="zone-rail-card__title">Geometry</h3>
            <ZoneStatGrid
              areaSqM={incident.areaSqM}
              perimeterM={incident.perimeterM}
              geometry={incident.geometry}
              radiusM={incident.radiusM}
              geometryType={incident.geometryType}
            />
          </div>

          <div className="zone-rail-card">
            <h3 className="zone-rail-card__title">Location</h3>
            <div className="zone-rail-row">
              <MapPin size={15} />
              <span className="zone-rail-row__value">
                {incident.locationContext || 'Unknown location'}
              </span>
            </div>
            <div className="zone-rail-row">
              <Calendar size={15} />
              <span className="zone-rail-row__value">
                Reported {formatDate(incident.startDate)} · {formatTime(incident.startDate)}
              </span>
            </div>
            <div className="zone-rail-row">
              <Ruler size={15} />
              <span className="zone-rail-row__value">Polygon boundary · WGS84</span>
            </div>
          </div>

          {isSuper && (
            <div className="zone-rail-card zone-rail-card--flush">
              <StatusHistory incident={incident} logs={auditLogs} onUserClick={onViewCreator} />
            </div>
          )}
          {isSuper && (
            <div className="zone-rail-card zone-rail-card--flush">
              <DebugMetadata incident={incident} />
            </div>
          )}
        </aside>
      </div>

      {infoOpen && (
        <div className="zone-modal-overlay" style={{ zIndex: 300 }} onClick={() => setInfoOpen(false)}>
          <div className="zone-modal zone-modal--evidence zone-modal--edit" onClick={(e) => e.stopPropagation()}>
            <ZoneEditorSidebar
              geometry={incident.geometry}
              initialData={incident}
              onSubmit={handleInfoSubmit}
              onCancel={() => setInfoOpen(false)}
              submitting={submitting}
            />
          </div>
        </div>
      )}

      {addUpdateOpen && (
        <UpdateFormModal onClose={() => setAddUpdateOpen(false)} onSave={handleAddUpdateSave} />
      )}
    </div>
  );
}
