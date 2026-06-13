import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getIncident,
  updateIncident,
  deleteIncident,
  resolveIncident,
  restoreIncident,
  listAuditLogs,
  getOEmbed,
} from '../../services/api.js';
import TimelineEntry from '@shared/components/TimelineEntry.jsx';
import {
  SEVERITY_SCALE,
  VERIFICATION_CONFIG,
  SOURCE_VERIFICATION_CONFIG,
  SOURCE_TYPES,
} from '@shared/constants.js';
import { format, formatDistanceToNow } from 'date-fns';
import {
  ArrowLeft,
  ExternalLink,
  MapPin,
  Calendar,
  Clock,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Link as LinkIcon,
  FileText,
  Image as ImageIcon,
  Video,
  StickyNote,
  User,
  UserCircle,
  Tag,
  Box,
  Ruler,
  History,
  Globe,
  Layers,
  MessageSquare,
  Eye,
  Bookmark,
} from 'lucide-react';

export default function IncidentDetailPanel({
  incident,
  onBack,
  adminMode = false,
  onRefresh,
  categories = [],
  onEditZone,
  onEditZoneInfo,
}) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedUpdateId, setExpandedUpdateId] = useState(null);
  const [rawIdsOpen, setRawIdsOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // Admin action states
  const [mode, setMode] = useState('view'); // 'view' | 'edit'
  const [editForm, setEditForm] = useState({});
  const [showResolveConfirm, setShowResolveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Clear transient messages after 4s
  useEffect(() => {
    if (!actionSuccess && !actionError) return;
    const timer = setTimeout(() => {
      setActionSuccess('');
      setActionError('');
    }, 4000);
    return () => clearTimeout(timer);
  }, [actionSuccess, actionError]);

  useEffect(() => {
    if (!incident) return;
    setLoading(true);
    setError('');
    setMode('view');
    setActionError('');
    setActionSuccess('');
    setRawIdsOpen(false);

    // If the incident already has sources and timeline, use it directly
    if (incident.sources && incident.timeline) {
      setData({ incident, sources: incident.sources, timeline: incident.timeline });
      setLoading(false);
      return;
    }

    // Deleted / purged incidents cannot be re-fetched from the live endpoint.
    // Render them directly from the payload we already have.
    if (incident.isPurged || incident.isDeleted || incident.status === 'hidden') {
      setData({ incident, sources: [], timeline: [] });
      setLoading(false);
      return;
    }

    getIncident(incident.id)
      .then((res) => {
        setData(res);
        setError('');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [incident?.id]);

  // Fetch audit logs to build an accurate status history
  useEffect(() => {
    if (!incident?.id) return;
    setAuditLoading(true);
    listAuditLogs({ targetType: 'incident', targetId: incident.id, limit: 100 })
      .then((res) => {
        setAuditLogs(res?.logs || []);
      })
      .catch((err) => {
        console.error('Failed to load audit logs:', err);
        setAuditLogs([]);
      })
      .finally(() => setAuditLoading(false));
  }, [incident?.id]);

  const enterEditMode = useCallback(() => {
    if (!data?.incident) return;
    const inc = data.incident;
    setEditForm({
      title: inc.title || '',
      description: inc.description || '',
      severity: inc.severity || 3,
      categoryId: inc.category_id || '',
      startDate: inc.start_date ? inc.start_date.slice(0, 10) : '',
      endDate: inc.end_date ? inc.end_date.slice(0, 10) : '',
      locationContext: inc.location_context || '',
      verificationOverride: inc.verification_override || '',
    });
    setMode('edit');
    setActionError('');
  }, [data]);

  const handleSave = async () => {
    setActionLoading(true);
    setActionError('');
    try {
      const payload = {
        title: editForm.title,
        description: editForm.description,
        severity: parseInt(editForm.severity, 10),
        categoryId: editForm.categoryId ? parseInt(editForm.categoryId, 10) : undefined,
        startDate: editForm.startDate ? `${editForm.startDate}T00:00:00Z` : undefined,
        endDate: editForm.endDate ? `${editForm.endDate}T00:00:00Z` : null,
        locationContext: editForm.locationContext,
        verificationOverride: editForm.verificationOverride || null,
      };
      await updateIncident(incident.id, payload);
      setMode('view');
      setActionSuccess('Incident updated successfully');
      const res = await getIncident(incident.id);
      setData(res);
      onRefresh?.();
    } catch (err) {
      setActionError(err.message || 'Failed to update incident');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolve = async () => {
    setActionLoading(true);
    setActionError('');
    try {
      await resolveIncident(incident.id);
      setShowResolveConfirm(false);
      setActionSuccess('Incident resolved successfully');
      const res = await getIncident(incident.id);
      setData(res);
      onRefresh?.();
    } catch (err) {
      setActionError(err.message || 'Failed to resolve incident');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    setActionLoading(true);
    setActionError('');
    try {
      await deleteIncident(incident.id);
      setShowDeleteConfirm(false);
      window.dispatchEvent(
        new CustomEvent('incident-deleted', { detail: { incidentId: incident.id, incidentTitle: incident.title } })
      );
      onBack?.();
    } catch (err) {
      setActionError(err.message || 'Failed to delete incident');
      setShowDeleteConfirm(false);
    } finally {
      setActionLoading(false);
    }
  };

  if (!incident) return null;

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 12, color: 'var(--text-muted)', fontSize: 13 }}>
        <div style={{ width: 24, height: 24, border: '2px solid var(--border-subtle)', borderTopColor: 'var(--navy-400)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        Loading incident details…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24, color: 'var(--danger)', fontSize: 13 }}>{error}</div>
    );
  }

  if (!data) return null;

  const { incident: inc, sources = [], timeline = [] } = data;
  const catColor = inc.domain_color || '#6b7280';
  const vCfg = inc.verification_status ? VERIFICATION_CONFIG[inc.verification_status] : null;
  const sev = SEVERITY_SCALE.find((s) => s.value === inc.severity) || SEVERITY_SCALE[2];

  const adminBaseUrl = typeof window !== 'undefined'
    ? window.location.origin.replace(':5175', ':5174')
    : 'http://localhost:5174';
  const adminUrl = `${adminBaseUrl}?incident=${inc.id}`;

  const isPurged = inc.isPurged;
  const isDeleted = !isPurged && (inc.isDeleted || inc.status === 'hidden');
  const isPolygon = inc.geometry_type === 'polygon' || inc.geometry?.type === 'Polygon';

  const sourceCounts = sources.reduce((acc, s) => {
    const type = s.source_type || 'unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const coordinates = isPolygon
    ? null
    : Number.isFinite(parseFloat(inc.latitude)) && Number.isFinite(parseFloat(inc.longitude))
    ? { lat: parseFloat(inc.latitude), lng: parseFloat(inc.longitude) }
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 20, overflowY: 'auto', flex: 1, minHeight: 0, boxSizing: 'border-box', background: 'var(--bg-base)' }}>
      {/* Back + Admin link */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          onClick={onBack}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text-secondary)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            fontFamily: 'var(--font-sans)',
          }}
        >
          <ArrowLeft size={14} />
          Back to results
        </button>
        {adminMode && mode === 'view' && (
          <a
            href={adminUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--navy-400)',
              textDecoration: 'none',
            }}
          >
            Open in Admin
            <ExternalLink size={11} />
          </a>
        )}
      </div>

      {/* Action messages */}
      {actionError && (
        <div style={{ padding: '10px 14px', background: 'var(--alert-error-bg)', border: '1px solid var(--alert-error-border)', borderRadius: 'var(--radius-sm)', color: 'var(--danger)', fontSize: 12, fontWeight: 500 }}>
          {actionError}
        </div>
      )}
      {actionSuccess && (
        <div style={{ padding: '10px 14px', background: 'var(--alert-success-bg)', border: '1px solid var(--alert-success-border)', borderRadius: 'var(--radius-sm)', color: 'var(--success)', fontSize: 12, fontWeight: 500 }}>
          {actionSuccess}
        </div>
      )}

      {/* Status history */}
      <StatusHistory incident={inc} auditLogs={auditLogs} auditLoading={auditLoading} isPurged={isPurged} isDeleted={isDeleted} />

      {/* Purged / Deleted banners */}
      {isPurged && <PurgedBanner incident={inc} />}
      {isDeleted && (
        <DeletedBanner
          incident={inc}
          actionLoading={actionLoading}
          setActionLoading={setActionLoading}
          setActionSuccess={setActionSuccess}
          setActionError={setActionError}
          setData={setData}
          onRefresh={onRefresh}
        />
      )}

      {mode === 'edit' ? (
        <EditForm
          form={editForm}
          onChange={setEditForm}
          categories={categories}
          onSave={handleSave}
          onCancel={() => setMode('view')}
          loading={actionLoading}
        />
      ) : (
        <>
          {/* Admin Actions */}
          {adminMode && !isDeleted && !isPurged && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {!isPolygon && (
                <ActionButton onClick={enterEditMode} variant="primary" icon={null}>
                  Edit Incident
                </ActionButton>
              )}
              {isPolygon && onEditZone && (
                <ActionButton onClick={onEditZone} variant="primary" icon={Box}>
                  Edit Zone
                </ActionButton>
              )}
              {isPolygon && onEditZoneInfo && (
                <ActionButton onClick={onEditZoneInfo} variant="primary" icon={Tag}>
                  Edit Zone Info
                </ActionButton>
              )}
              {inc.status === 'active' && (
                <ActionButton onClick={() => setShowResolveConfirm(true)} variant="warning" icon={Check}>
                  Resolve
                </ActionButton>
              )}
              <ActionButton onClick={() => setShowDeleteConfirm(true)} variant="danger" icon={null}>
                Delete
              </ActionButton>
            </div>
          )}

          {/* Badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Badge color={catColor}>{inc.domain_name || 'Unknown'}</Badge>
            <Badge color={sev.color}>{sev.label}</Badge>
            {vCfg && (
              <Badge color={vCfg.color}>
                {vCfg.icon} {vCfg.label}
              </Badge>
            )}
            <Badge color={isPurged ? '#6b7280' : isDeleted ? '#f43f5e' : inc.status === 'active' ? '#22c55e' : '#6b7280'}>
              {isPurged ? 'Purged' : isDeleted ? 'Deleted' : inc.status}
            </Badge>
            {isPolygon && <Badge color="#818cf8">⬡ Zone</Badge>}
          </div>

          {/* Title */}
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0, lineHeight: 1.25 }}>
            {inc.title}
          </h2>

          {/* Quick stats */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 8,
            }}
          >
            <StatTile icon={Layers} value={sources.length} label="Sources" />
            <StatTile icon={History} value={timeline.length} label="Updates" />
            <StatTile icon={MessageSquare} value={sourceCounts[SOURCE_TYPES.x_post] || 0} label="Posts" />
          </div>

          {/* Meta info card */}
          <div
            style={{
              padding: 14,
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            {/* Location */}
            <MetaRow icon={MapPin} label="Location">
              <span style={{ color: 'var(--text-secondary)' }}>
                {isPurged
                  ? (inc.location_context || 'Location no longer available')
                  : isPolygon
                  ? `⬡ ${inc.zone_category_name || 'Zone'} · Polygon`
                  : (inc.location_context || 'Location unknown')}
              </span>
            </MetaRow>

            {/* Coordinates */}
            {coordinates && (
              <MetaRow icon={Globe} label="Coordinates">
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
                  {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
                </span>
                <CopyButton text={`${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)}`} />
              </MetaRow>
            )}

            {/* Date */}
            <MetaRow icon={Calendar} label="Started">
              <span style={{ color: 'var(--text-secondary)' }}>
                {inc.start_date ? format(new Date(inc.start_date), 'MMM d, yyyy · h:mm a') : 'Unknown'}
              </span>
              {inc.start_date && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  <RelativeTime date={inc.start_date} />
                </span>
              )}
            </MetaRow>

            {inc.end_date && (
              <MetaRow icon={Clock} label="Ended">
                <span style={{ color: 'var(--text-secondary)' }}>
                  {format(new Date(inc.end_date), 'MMM d, yyyy · h:mm a')}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  <RelativeTime date={inc.end_date} />
                </span>
              </MetaRow>
            )}

            {/* Category */}
            <MetaRow icon={Tag} label="Category">
              <span style={{ color: 'var(--text-secondary)' }}>
                {inc.category_name ? (
                  <>
                    <span style={{ color: catColor, fontWeight: 600 }}>{inc.category_name}</span>
                    {' · '}
                    {inc.domain_name || 'Unknown'}
                  </>
                ) : (
                  'Uncategorized'
                )}
              </span>
            </MetaRow>

            {/* Geometry metrics */}
            {isPolygon && (
              <>
                <MetaRow icon={Box} label="Geometry">
                  <span style={{ color: 'var(--text-secondary)' }}>Polygon</span>
                </MetaRow>
                {Number.isFinite(parseFloat(inc.area_sq_m)) && (
                  <MetaRow icon={Globe} label="Area">
                    <span style={{ color: 'var(--text-secondary)' }}>{formatArea(inc.area_sq_m)}</span>
                  </MetaRow>
                )}
                {Number.isFinite(parseFloat(inc.perimeter_m)) && (
                  <MetaRow icon={Ruler} label="Perimeter">
                    <span style={{ color: 'var(--text-secondary)' }}>{formatLength(inc.perimeter_m)}</span>
                  </MetaRow>
                )}
              </>
            )}
          </div>

          {/* Description */}
          {inc.description && (
            <div
              style={{
                padding: 14,
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 8 }}>
                Description
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {inc.description}
              </div>
            </div>
          )}

          {/* Sources */}
          {sources.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                  Sources
                </h3>
                <SourceTypePills counts={sourceCounts} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {sources.map((source) => (
                  <SourceCard key={source.id} source={source} />
                ))}
              </div>
            </div>
          )}

          {/* Timeline */}
          {timeline.length > 0 && (
            <div>
              <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                Timeline Updates
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {timeline.map((update) => (
                  <TimelineEntry
                    key={update.id}
                    update={update}
                    isExpanded={expandedUpdateId === update.id}
                    onToggle={() => setExpandedUpdateId(expandedUpdateId === update.id ? null : update.id)}
                    fetchOEmbed={getOEmbed}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Activity log link */}
          {adminMode && inc.created_by && (
            <button
              onClick={() => navigate(`/superadmin/users?drawer=${inc.created_by}&tab=overview`)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                width: '100%',
                padding: '10px 14px',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-surface)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
              }}
            >
              <UserCircle size={14} />
              View creator profile
            </button>
          )}

          {/* Debug Metadata */}
          {adminMode && (
            <div
              style={{
                background: 'var(--bg-surface)',
                border: '1px dashed var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
              }}
            >
              <button
                onClick={() => setRawIdsOpen(!rawIdsOpen)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Debug Metadata
                </span>
                {rawIdsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Human-readable fields always visible */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '10px 16px',
                    fontSize: 12,
                  }}
                >
                  <MetadataField label="Created by">
                    {inc.created_by_name ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{inc.created_by_name}</span>
                        {inc.created_by_email && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{inc.created_by_email}</span>}
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>{inc.created_by || '—'}</span>
                    )}
                  </MetadataField>

                  <MetadataField label="Created at">
                    {inc.created_at ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{format(new Date(inc.created_at), 'MMM d, yyyy · h:mm a')}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}><RelativeTime date={inc.created_at} /></span>
                      </div>
                    ) : (
                      '—'
                    )}
                  </MetadataField>

                  <MetadataField label="Updated at">
                    {inc.updated_at ? format(new Date(inc.updated_at), 'MMM d, yyyy · h:mm a') : '—'}
                  </MetadataField>

                  {inc.resolved_by && (
                    <MetadataField label="Resolved by">
                      {inc.resolved_by_name || inc.resolved_by}
                    </MetadataField>
                  )}
                  {inc.resolved_at && (
                    <MetadataField label="Resolved at">
                      {format(new Date(inc.resolved_at), 'MMM d, yyyy · h:mm a')}
                    </MetadataField>
                  )}

                  {inc.category_name && (
                    <MetadataField label="Category">
                      <span style={{ color: catColor, fontWeight: 500 }}>{inc.category_name}</span>
                      {' · '}
                      {inc.domain_name}
                    </MetadataField>
                  )}

                  <MetadataField label="Geometry">
                    {isPolygon ? 'Polygon' : 'Point'}
                  </MetadataField>
                </div>

                {/* Raw IDs - collapsible */}
                {rawIdsOpen && (
                  <div
                    style={{
                      marginTop: 8,
                      padding: 12,
                      background: 'var(--bg-elevated)',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      fontSize: 11,
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <RawIdRow label="Incident ID" value={inc.id} />
                    <RawIdRow label="Created by ID" value={inc.created_by} />
                    {inc.resolved_by && <RawIdRow label="Resolved by ID" value={inc.resolved_by} />}
                    <RawIdRow label="Category ID" value={inc.category_id} />
                    <RawIdRow label="Zone category ID" value={inc.zone_category_id || '—'} />
                    <RawIdRow label="Verification override" value={inc.verification_override || 'none'} />
                    {isDeleted && (
                      <>
                        <RawIdRow label="Deleted by ID" value={inc.deleted_by} />
                        <RawIdRow label="Original status" value={inc.original_status} />
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Resolve Confirm Modal */}
      {showResolveConfirm && (
        <Modal onClose={() => setShowResolveConfirm(false)}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 12px' }}>
            Resolve Incident
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 20px' }}>
            Mark <strong>{inc.title}</strong> as resolved? It will be hidden from the live map and moved to historic view.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowResolveConfirm(false)}
              style={{
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                background: 'transparent',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleResolve}
              disabled={actionLoading}
              style={{
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 700,
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--warning)',
                background: 'var(--alert-warning-bg)',
                color: 'var(--warning)',
                cursor: actionLoading ? 'not-allowed' : 'pointer',
                opacity: actionLoading ? 0.6 : 1,
              }}
            >
              {actionLoading ? 'Resolving...' : 'Resolve'}
            </button>
          </div>
        </Modal>
      )}

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && (
        <Modal onClose={() => setShowDeleteConfirm(false)}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--danger)', margin: '0 0 12px' }}>
            Move to Recycle Bin
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 20px' }}>
            Move <strong>{inc.title}</strong> to the Recycle Bin? It will be hidden from all views but can be restored later from the Recycle Bin page.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              style={{
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                background: 'transparent',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={actionLoading}
              style={{
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 700,
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--danger)',
                background: 'var(--alert-error-bg)',
                color: 'var(--danger)',
                cursor: actionLoading ? 'not-allowed' : 'pointer',
                opacity: actionLoading ? 0.6 : 1,
              }}
            >
              {actionLoading ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ─── Helper Components ─── */

function Badge({ children, color }) {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        color,
        background: `${color}18`,
        padding: '3px 10px',
        borderRadius: 'var(--radius-sm)',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}

function ActionButton({ children, onClick, variant = 'primary', icon: Icon, disabled }) {
  const styles = {
    primary: {
      border: '1px solid var(--navy-500)',
      background: 'linear-gradient(135deg, var(--navy-600), var(--navy-700))',
      color: '#fff',
    },
    warning: {
      border: '1px solid var(--warning)',
      background: 'var(--alert-warning-bg)',
      color: 'var(--warning)',
    },
    danger: {
      border: '1px solid var(--danger)',
      background: 'var(--alert-error-bg)',
      color: 'var(--danger)',
    },
  };
  const style = styles[variant] || styles.primary;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 14px',
        fontSize: 12,
        fontWeight: 700,
        borderRadius: 'var(--radius-sm)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'all 0.2s ease',
        fontFamily: 'var(--font-sans)',
        ...style,
      }}
    >
      {Icon && <Icon size={14} />}
      {children}
    </button>
  );
}

function StatTile({ icon: Icon, value, label }) {
  return (
    <div
      style={{
        padding: '12px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
    >
      {Icon && <Icon size={18} style={{ color: 'var(--navy-400)', flexShrink: 0 }} />}
      <div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      </div>
    </div>
  );
}

function MetaRow({ icon: Icon, label, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      {Icon && <Icon size={16} style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: 1 }} />}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function MetadataField({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }}>{children}</span>
    </div>
  );
}

function RawIdRow({ label, value }) {
  if (!value || value === '—') {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <span>{label}</span>
        <span>—</span>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
      <span>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
        <CopyButton text={value} compact />
      </div>
    </div>
  );
}

function CopyButton({ text, compact }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <button
      onClick={handleCopy}
      title="Copy to clipboard"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: compact ? 20 : 24,
        height: compact ? 20 : 24,
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border-subtle)',
        background: 'transparent',
        color: copied ? 'var(--success)' : 'var(--text-muted)',
        cursor: 'pointer',
        flexShrink: 0,
      }}
    >
      {copied ? <Check size={compact ? 12 : 14} /> : <Copy size={compact ? 12 : 14} />}
    </button>
  );
}

function RelativeTime({ date }) {
  if (!date) return null;
  const d = new Date(date);
  return (
    <span title={format(d, 'MMM d, yyyy · h:mm a')}>
      {formatDistanceToNow(d, { addSuffix: true })}
    </span>
  );
}

function formatArea(sqM) {
  const n = parseFloat(sqM);
  if (!Number.isFinite(n)) return '—';
  if (n >= 1000000) return `${(n / 1000000).toFixed(2)} km²`;
  if (n >= 10000) return `${(n / 10000).toFixed(2)} ha`;
  return `${n.toFixed(2)} m²`;
}

function formatLength(m) {
  const n = parseFloat(m);
  if (!Number.isFinite(n)) return '—';
  if (n >= 1000) return `${(n / 1000).toFixed(2)} km`;
  return `${n.toFixed(2)} m`;
}

function parseAuditDetails(details) {
  if (!details) return {};
  if (typeof details === 'string') {
    try {
      return JSON.parse(details);
    } catch {
      return {};
    }
  }
  return details;
}

const ACTION_EVENT_MAP = {
  incident_created: { label: 'Created', icon: User, color: '#6366f1' },
  incident_updated: { label: 'Edited', icon: History, color: '#3b82f6' },
  incident_resolved: { label: 'Resolved', icon: Check, color: '#eab308' },
  incident_deleted: { label: 'Moved to Recycle Bin', icon: null, color: '#f43f5e' },
  incident_restored: { label: 'Restored', icon: null, color: '#22c55e' },
  incident_purged: { label: 'Permanently deleted', icon: null, color: '#6b7280' },
  source_added: { label: 'Source added', icon: Layers, color: '#a855f7' },
  source_updated: { label: 'Source updated', icon: Layers, color: '#a855f7' },
  source_deleted: { label: 'Source removed', icon: Layers, color: '#ef4444' },
  timeline_added: { label: 'Update added', icon: MessageSquare, color: '#06b6d4' },
  timeline_updated: { label: 'Update edited', icon: MessageSquare, color: '#06b6d4' },
  timeline_deleted: { label: 'Update removed', icon: MessageSquare, color: '#ef4444' },
};

function getEventLabel(log) {
  const cfg = ACTION_EVENT_MAP[log.action];
  const details = parseAuditDetails(log.details);

  if (log.action === 'incident_updated' && details?.changedFields?.length > 0) {
    const fields = details.changedFields.map((f) => String(f).replace(/_/g, ' ')).join(', ');
    return `Edited · ${fields}`;
  }

  if ((log.action === 'source_added' || log.action === 'source_updated') && details?.sourceType) {
    return `${cfg?.label || log.action} · ${details.sourceType.replace(/_/g, ' ')}`;
  }

  if ((log.action === 'timeline_added' || log.action === 'timeline_updated') && details?.title) {
    return `${cfg?.label || log.action} · ${details.title}`;
  }

  return cfg?.label || log.action.replace(/_/g, ' ');
}

function StatusHistory({ incident, auditLogs, auditLoading, isPurged, isDeleted }) {
  const auditEvents = auditLogs
    .filter((log) => ACTION_EVENT_MAP[log.action])
    .map((log) => {
      const cfg = ACTION_EVENT_MAP[log.action];
      return {
        label: getEventLabel(log),
        date: log.created_at,
        actor: log.user_full_name || log.user_email,
        actorId: log.user_id,
        icon: cfg.icon,
        color: cfg.color,
      };
    })
    .reverse();

  const fallbackEvents = [];
  if (incident.created_at) {
    fallbackEvents.push({
      label: 'Created',
      date: incident.created_at,
      actor: incident.created_by_name || incident.created_by_email,
      actorId: incident.created_by,
      icon: User,
      color: '#6366f1',
    });
  }
  if (isDeleted && incident.deleted_at) {
    fallbackEvents.push({
      label: 'Moved to Recycle Bin',
      date: incident.deleted_at,
      actor: incident.deleted_by_name,
      icon: null,
      color: '#f43f5e',
    });
  }
  if (isPurged && incident.purged_at) {
    fallbackEvents.push({
      label: 'Permanently deleted',
      date: incident.purged_at,
      icon: null,
      color: '#6b7280',
    });
  }

  const events = auditEvents.length > 0 ? auditEvents : fallbackEvents;

  if (events.length === 0) return null;

  return (
    <div
      style={{
        padding: 14,
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
          Status History
        </div>
        {auditLoading && (
          <div style={{ width: 14, height: 14, border: '2px solid var(--border-subtle)', borderTopColor: 'var(--navy-400)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {events.map((evt, idx) => (
          <HistoryStep key={idx} event={evt} isLast={idx === events.length - 1} />
        ))}
      </div>
    </div>
  );
}

function HistoryStep({ event, isLast }) {
  const Icon = event.icon;
  return (
    <div style={{ display: 'flex', gap: 10 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: `${event.color}18`,
            border: `1.5px solid ${event.color}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {Icon && <Icon size={11} style={{ color: event.color }} />}
        </div>
        {!isLast && (
          <div style={{ width: 1.5, flex: 1, background: 'var(--border-subtle)', margin: '4px 0' }} />
        )}
      </div>
      <div style={{ paddingBottom: 14, flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{event.label}</span>
          {event.date && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              <RelativeTime date={event.date} />
            </span>
          )}
        </div>
        {event.date && (
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
            {format(new Date(event.date), 'MMM d, yyyy · h:mm a')}
          </div>
        )}
        {event.actor && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            by {event.actor}
          </div>
        )}
      </div>
    </div>
  );
}

function PurgedBanner({ incident }) {
  return (
    <div
      style={{
        padding: '12px 14px',
        background: 'rgba(107, 114, 128, 0.12)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>
        This incident has been permanently deleted.
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
        {incident.deleted_at && (
          <div>Moved to Recycle Bin {format(new Date(incident.deleted_at), 'MMM d, yyyy · h:mm a')}</div>
        )}
        {incident.purged_at && (
          <div>Permanently deleted {format(new Date(incident.purged_at), 'MMM d, yyyy · h:mm a')}</div>
        )}
        {incident.original_status && <div>Original status: {incident.original_status}</div>}
      </div>
    </div>
  );
}

function DeletedBanner({ incident, actionLoading, setActionLoading, setActionSuccess, setActionError, setData, onRefresh }) {
  const navigate = useNavigate();
  return (
    <div
      style={{
        padding: '12px 14px',
        background: 'var(--alert-error-bg)',
        border: '1px solid var(--alert-error-border)',
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--danger)' }}>
        This incident has been moved to the Recycle Bin.
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
        {incident.deleted_at && (
          <div>Deleted {format(new Date(incident.deleted_at), 'MMM d, yyyy · h:mm a')}</div>
        )}
        {incident.deleted_by_name && <div>Deleted by {incident.deleted_by_name}</div>}
        {incident.original_status && <div>Original status: {incident.original_status}</div>}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          onClick={() => navigate(`/superadmin/recycle-bin?highlight=${incident.id}`)}
          style={{
            padding: '6px 14px',
            fontSize: 12,
            fontWeight: 700,
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            background: 'transparent',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
          }}
        >
          View in Recycle Bin
        </button>
        <button
          onClick={async () => {
            setActionLoading(true);
            setActionError('');
            try {
              await restoreIncident(incident.id);
              setActionSuccess('Incident restored successfully');
              const res = await getIncident(incident.id);
              if (res?.incident) {
                setData(res);
              }
              onRefresh?.();
            } catch (err) {
              setActionError(err.message || 'Failed to restore incident');
            } finally {
              setActionLoading(false);
            }
          }}
          disabled={actionLoading}
          style={{
            padding: '6px 14px',
            fontSize: 12,
            fontWeight: 700,
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--success)',
            background: 'var(--alert-success-bg)',
            color: 'var(--success)',
            cursor: actionLoading ? 'not-allowed' : 'pointer',
            opacity: actionLoading ? 0.6 : 1,
            fontFamily: 'var(--font-sans)',
          }}
        >
          {actionLoading ? 'Restoring…' : 'Restore Incident'}
        </button>
      </div>
    </div>
  );
}

function SourceTypePills({ counts }) {
  const types = [
    { key: SOURCE_TYPES.news_article, label: 'News', color: '#3b82f6' },
    { key: SOURCE_TYPES.x_post, label: 'X', color: '#000000' },
    { key: SOURCE_TYPES.image, label: 'Images', color: '#22c55e' },
    { key: SOURCE_TYPES.video, label: 'Videos', color: '#a855f7' },
    { key: SOURCE_TYPES.admin_note, label: 'Notes', color: '#6b7280' },
  ];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      {types.map((type) => {
        const count = counts[type.key] || 0;
        if (count === 0) return null;
        return (
          <span
            key={type.key}
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 'var(--radius-md)',
              background: `${type.color}18`,
              color: type.color,
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
            }}
          >
            {type.label} · {count}
          </span>
        );
      })}
    </div>
  );
}

function SourceCard({ source }) {
  const svCfg = source.verification_status ? SOURCE_VERIFICATION_CONFIG[source.verification_status] : null;
  const type = source.source_type || 'unknown';

  const typeConfig = {
    [SOURCE_TYPES.news_article]: { icon: FileText, label: 'News Article', color: '#3b82f6' },
    [SOURCE_TYPES.x_post]: { icon: MessageSquare, label: 'X Post', color: '#000000' },
    [SOURCE_TYPES.image]: { icon: ImageIcon, label: 'Image', color: '#22c55e' },
    [SOURCE_TYPES.video]: { icon: Video, label: 'Video', color: '#a855f7' },
    [SOURCE_TYPES.admin_note]: { icon: StickyNote, label: 'Admin Note', color: '#6b7280' },
  };

  const cfg = typeConfig[type] || { icon: LinkIcon, label: 'Source', color: '#6b7280' };
  const Icon = cfg.icon;
  const isMedia = type === SOURCE_TYPES.image || type === SOURCE_TYPES.video;
  const isLink = source.source_url && (type === SOURCE_TYPES.news_article || type === SOURCE_TYPES.x_post);

  const domain = (() => {
    if (!source.source_url) return '';
    try {
      return new URL(source.source_url).hostname.replace(/^www\./, '');
    } catch {
      return '';
    }
  })();

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-default)';
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-subtle)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '10px 12px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          background: 'var(--bg-elevated)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon size={14} style={{ color: cfg.color }} />
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--text-secondary)' }}>
            {cfg.label}
          </span>
          {domain && (
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>· {domain}</span>
          )}
        </div>
        {svCfg && (
          <span style={{ fontSize: 10, fontWeight: 700, color: svCfg.color, background: `${svCfg.color}18`, padding: '2px 8px', borderRadius: 'var(--radius-sm)' }}>
            {svCfg.label}
          </span>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Image */}
        {type === SOURCE_TYPES.image && source.media_url && (
          <div style={{ borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
            <img
              src={source.media_url}
              alt="Source"
              style={{ width: '100%', maxHeight: 280, objectFit: 'cover', display: 'block' }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
        )}

        {/* Video */}
        {type === SOURCE_TYPES.video && source.media_url && (
          <div style={{ borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border-subtle)', aspectRatio: '16 / 9' }}>
            <video
              src={source.media_url}
              controls
              style={{ width: '100%', height: '100%', display: 'block' }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
        )}

        {/* Description */}
        {source.description && (
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {source.description}
          </div>
        )}

        {/* Link */}
        {source.source_url && (
          <a
            href={source.source_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--navy-400)',
              wordBreak: 'break-all',
              textDecoration: 'none',
              padding: '8px 12px',
              background: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <LinkIcon size={13} />
            {isLink ? 'Open article' : 'Open source'}
            <ExternalLink size={11} />
          </a>
        )}

        {/* Embed HTML / oEmbed */}
        {(source.embed_html || isTwitterUrl(source.source_url)) && (
          <OEmbedRenderer url={source.source_url} html={source.embed_html} />
        )}
      </div>
    </div>
  );
}

function isTwitterUrl(url) {
  if (!url) return false;
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname === 'twitter.com' || hostname === 'www.twitter.com' || hostname === 'x.com' || hostname === 'www.x.com';
  } catch {
    return false;
  }
}

function darkThemeTwitterHtml(html) {
  if (!html) return html;
  return html.replace(/class="twitter-tweet"/g, 'class="twitter-tweet" data-theme="dark"');
}

function loadTwitterWidgets() {
  if (typeof window === 'undefined') return;
  if (window.twttr?.widgets?.load) {
    window.twttr.widgets.load();
  } else if (!document.getElementById('twitter-widgets-script')) {
    const script = document.createElement('script');
    script.id = 'twitter-widgets-script';
    script.src = 'https://platform.twitter.com/widgets.js';
    script.async = true;
    script.charset = 'utf-8';
    document.body.appendChild(script);
    script.onload = () => {
      window.twttr?.widgets?.load();
    };
  }
}

/* ─── oEmbed renderer ─── */
function OEmbedRenderer({ url, html: initialHtml, style }) {
  const [html, setHtml] = useState(initialHtml || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    if (initialHtml) {
      setHtml(initialHtml);
      return;
    }
    if (!url || !isTwitterUrl(url)) {
      setHtml('');
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError('');
    getOEmbed(url)
      .then((res) => {
        if (cancelled) return;
        setHtml(res?.html || '');
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || 'Failed to load embed');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [url, initialHtml]);

  useEffect(() => {
    if (html && containerRef.current) {
      loadTwitterWidgets();
    }
  }, [html]);

  if (!html && !loading && !error) return null;

  return (
    <div style={{ ...style, position: 'relative' }}>
      {loading && (
        <div style={{ padding: 12, color: 'var(--text-muted)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 14, height: 14, border: '2px solid var(--border-subtle)', borderTopColor: 'var(--navy-400)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          Loading embed…
        </div>
      )}
      {error && (
        <div style={{ padding: 10, color: 'var(--danger)', fontSize: 12, background: 'var(--alert-error-bg)', borderRadius: 'var(--radius-sm)' }}>
          {error}
        </div>
      )}
      {html && (
        <div
          ref={containerRef}
          style={{ borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}
          dangerouslySetInnerHTML={{ __html: darkThemeTwitterHtml(html) }}
        />
      )}
    </div>
  );
}

/* ─── Edit Form Sub-component ─── */
function EditForm({ form, onChange, categories, onSave, onCancel, loading }) {
  const inputStyle = {
    width: '100%',
    padding: '8px 10px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '6px',
    color: 'var(--text-primary)',
    fontSize: '13px',
    fontFamily: 'var(--font-sans)',
    outline: 'none',
    transition: 'border-color 0.2s ease',
  };

  const labelStyle = {
    fontSize: '11px',
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '4px',
  };

  const update = (key, value) => onChange((prev) => ({ ...prev, [key]: value }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Edit Incident</h3>

      <div>
        <div style={labelStyle}>Title</div>
        <input type="text" value={form.title} onChange={(e) => update('title', e.target.value)} style={inputStyle} />
      </div>

      <div>
        <div style={labelStyle}>Description</div>
        <textarea
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
          rows={4}
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <div style={labelStyle}>Severity</div>
          <select value={form.severity} onChange={(e) => update('severity', e.target.value)} style={inputStyle}>
            {SEVERITY_SCALE.map((s) => (
              <option key={s.value} value={s.value}>
                {s.value} — {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div style={labelStyle}>Category</div>
          <select value={form.categoryId} onChange={(e) => update('categoryId', e.target.value)} style={inputStyle}>
            <option value="">— Select —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <div style={labelStyle}>Start Date</div>
          <input type="date" value={form.startDate} onChange={(e) => update('startDate', e.target.value)} style={inputStyle} />
        </div>
        <div>
          <div style={labelStyle}>End Date</div>
          <input type="date" value={form.endDate} onChange={(e) => update('endDate', e.target.value)} style={inputStyle} />
        </div>
      </div>

      <div>
        <div style={labelStyle}>Location Context</div>
        <input type="text" value={form.locationContext} onChange={(e) => update('locationContext', e.target.value)} style={inputStyle} />
      </div>

      <div>
        <div style={labelStyle}>Verification Override</div>
        <select value={form.verificationOverride} onChange={(e) => update('verificationOverride', e.target.value)} style={inputStyle}>
          <option value="">— Auto-computed —</option>
          <option value="unverified">Unverified</option>
          <option value="verified">Verified</option>
          <option value="confirmed">Confirmed</option>
          <option value="contested">Contested</option>
        </select>
      </div>

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
        <button
          onClick={onCancel}
          disabled={loading}
          style={{
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 600,
            borderRadius: '6px',
            border: '1px solid var(--border-subtle)',
            background: 'transparent',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          disabled={loading || !form.title?.trim()}
          style={{
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 700,
            borderRadius: '6px',
            border: '1px solid var(--navy-500)',
            background: 'linear-gradient(135deg, var(--navy-600), var(--navy-700))',
            color: '#fff',
            cursor: loading || !form.title?.trim() ? 'not-allowed' : 'pointer',
            opacity: loading || !form.title?.trim() ? 0.6 : 1,
          }}
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

/* ─── Modal Sub-component ─── */
function Modal({ children, onClose }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--backdrop)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '20px',
          maxWidth: '420px',
          width: '90%',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {children}
      </div>
    </div>
  );
}
