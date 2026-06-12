import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, Check, Image } from 'lucide-react';
import { MediaUploader } from '../Media/MediaUploader.jsx';
import { MediaGallery } from '@shared/components/MediaGallery.jsx';
import { api } from '../../services/api.js';
import { Button } from '@shared/components/Button.jsx';
import { Badge } from '@shared/components/Badge.jsx';
import { SeverityBadge } from '@shared/components/SeverityBadge.jsx';
import TimelineEntry from '@shared/components/TimelineEntry.jsx';
import { SEVERITY_SCALE, VERIFICATION_CONFIG, SOURCE_VERIFICATION_CONFIG } from '@shared/constants.js';
import { format } from 'date-fns';

export default function EventDetailPanel({ incidentId, onEdit, onEditZone, onEditZoneInfo, onClose, onResolve, resolveTrigger, refreshTrigger = 0 }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Timeline state
  const [expandedUpdateId, setExpandedUpdateId] = useState(null);
  const [isAddingUpdate, setIsAddingUpdate] = useState(false);
  const [editingUpdateId, setEditingUpdateId] = useState(null);
  const [newSummary, setNewSummary] = useState('');
  const [newUpdateDate, setNewUpdateDate] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editUpdateDate, setEditUpdateDate] = useState('');
  const [editSourceUrl, setEditSourceUrl] = useState('');
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' = latest first, 'asc' = oldest first

  // Resolve modal state
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolveDate, setResolveDate] = useState('');
  const [resolveLoading, setResolveLoading] = useState(false);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Copy link state
  const [copied, setCopied] = useState(false);

  // Verification override state
  const [overrideLoading, setOverrideLoading] = useState(false);

  // Media state
  const [media, setMedia] = useState([]);
  const [mediaLoading, setMediaLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.getIncident(incidentId);
      setData(res.data);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [incidentId]);

  // Refetch when the parent signals an external update (e.g., zone geometry edited)
  useEffect(() => {
    if (incidentId) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  // Fetch media when incident loads
  useEffect(() => {
    if (!incidentId) return;
    setMediaLoading(true);
    api.listMedia(incidentId)
      .then((res) => setMedia(res.data?.media || []))
      .catch(() => setMedia([]))
      .finally(() => setMediaLoading(false));
  }, [incidentId]);

  const resetAddForm = () => {
    setIsAddingUpdate(false);
    setNewSummary('');
    setNewUpdateDate('');
    setNewSourceUrl('');
  };

  const resetEditForm = () => {
    setEditingUpdateId(null);
    setEditSummary('');
    setEditUpdateDate('');
    setEditSourceUrl('');
  };

  const openResolveModal = () => {
    setResolveDate(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
    setShowResolveModal(true);
  };
  const openDeleteModal = () => setShowDeleteModal(true);
  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setDeleteError('');
  };
  const handleConfirmDelete = async () => {
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await api.deleteIncident(incidentId);
      setShowDeleteModal(false);
      onClose?.();
      window.dispatchEvent(new CustomEvent('incident-deleted', { detail: { incidentId, incidentTitle: data?.incident?.title } }));
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete incident');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCopyLink = () => {
    const param = isPolygon ? 'zone' : 'incident';
    const url = `${window.location.origin}/dashboard?${param}=${incidentId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleUpdateOverride = async (newOverride) => {
    setOverrideLoading(true);
    try {
      await api.updateIncident(incidentId, { verificationOverride: newOverride || null });
      await fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setOverrideLoading(false);
    }
  };

  const handleUpdateSourceVerification = async (sourceId, status) => {
    try {
      await api.updateSourceVerification(incidentId, sourceId, { verificationStatus: status });
      await fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const closeResolveModal = () => {
    setShowResolveModal(false);
    setResolveDate('');
    setResolveLoading(false);
  };

  const handleConfirmResolve = async () => {
    if (!resolveDate) return;
    setResolveLoading(true);
    try {
      await api.resolveIncident(incidentId, {
        resolvedAt: new Date(resolveDate).toISOString(),
      });
      closeResolveModal();
      onResolve?.(incidentId);
      // Refresh data to show updated status
      await fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setResolveLoading(false);
    }
  };

  // Calculate smart warning message
  const getResolveWarning = () => {
    if (!resolveDate) return null;
    const resolvedAt = new Date(resolveDate);
    const now = new Date();
    const graceEnd = new Date(resolvedAt.getTime() + 24 * 60 * 60 * 1000);
    const hoursRemaining = Math.max(0, Math.ceil((graceEnd - now) / (1000 * 60 * 60)));

    const noun = isPolygon ? 'Zone' : 'Marker';
    if (hoursRemaining <= 0) {
      return { text: `${noun} will disappear from the map.`, highlight: null };
    }

    const isNearCurrent = Math.abs(now - resolvedAt) < 5 * 60 * 1000;
    if (isNearCurrent) {
      return { text: `${noun} will be removed from the map after `, highlight: '24 hours' };
    }

    return { text: `${noun} will disappear in `, highlight: `${hoursRemaining} hours` };
  };

  // Open resolve modal when triggered from TopBar
  useEffect(() => {
    if (resolveTrigger && resolveTrigger > 0) {
      openResolveModal();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolveTrigger]);

  const handleAddUpdate = async () => {
    if (!newSummary.trim()) return;
    setTimelineLoading(true);
    try {
      await api.addTimeline(incidentId, {
        summary: newSummary.trim(),
        updateDate: newUpdateDate ? new Date(newUpdateDate).toISOString() : undefined,
        sourceUrl: newSourceUrl.trim() || undefined,
      });
      resetAddForm();
      await fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setTimelineLoading(false);
    }
  };

  const handleEditUpdate = async (updateId) => {
    if (!editSummary.trim()) return;
    setTimelineLoading(true);
    try {
      const payload = {
        summary: editSummary.trim(),
        updateDate: editUpdateDate ? new Date(editUpdateDate).toISOString() : undefined,
      };
      // Only send sourceUrl if it was changed (undefined = don't touch, empty = clear)
      if (editSourceUrl !== undefined) {
        payload.sourceUrl = editSourceUrl.trim() || null;
      }
      await api.updateTimeline(incidentId, updateId, payload);
      resetEditForm();
      await fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setTimelineLoading(false);
    }
  };

  const handleDeleteUpdate = async (updateId) => {
    if (!confirm('Are you sure you want to delete this timeline update?')) return;
    setTimelineLoading(true);
    try {
      await api.deleteTimeline(incidentId, updateId);
      await fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setTimelineLoading(false);
    }
  };

  const handleUploadMedia = async (file) => {
    console.log('[MediaUpload] Starting upload:', file.name, 'size:', file.size, 'type:', file.type, 'incident:', incidentId);
    try {
      const res = await api.uploadMedia(incidentId, file);
      console.log('[MediaUpload] Success:', res.data.media?.id, res.data.media?.stored_name);
      setMedia((prev) => [...prev, res.data.media]);
    } catch (err) {
      console.error('[MediaUpload] Failed:', err.message, err.statusCode, err.errorCode);
      throw err;
    }
  };

  const handleDeleteMedia = async (mediaId) => {
    if (!confirm('Delete this file?')) return;
    try {
      await api.deleteMedia(incidentId, mediaId);
      setMedia((prev) => prev.filter((m) => m.id !== mediaId));
    } catch (err) {
      alert(err.message || 'Failed to delete file');
    }
  };

  const startEditing = (update) => {
    setEditingUpdateId(update.id);
    setEditSummary(update.summary);
    setEditUpdateDate(format(new Date(update.update_date), "yyyy-MM-dd'T'HH:mm"));
    setEditSourceUrl(update.source_url || '');
    setExpandedUpdateId(update.id);
  };

  const sortedTimeline = useMemo(() => {
    if (!data?.timeline) return [];
    const sorted = [...data.timeline];
    sorted.sort((a, b) => {
      const diff = new Date(a.update_date) - new Date(b.update_date);
      return sortOrder === 'asc' ? diff : -diff;
    });
    return sorted;
  }, [data?.timeline, sortOrder]);

  if (loading) {
    return (
      <div style={{ padding: '24px', color: 'var(--text-secondary)' }}>
        Loading incident details...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '24px', color: 'var(--danger)' }}>
        {error}
      </div>
    );
  }

  if (!data) return null;

  const { incident, sources, timeline } = data;
  const catColor = incident.domain_color;
  const isPolygon = incident.geometry_type === 'polygon';

  const sectionTitle = (text) => (
    <h4
      style={{
        fontSize: '12px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '1px',
        color: 'var(--text-muted)',
        marginBottom: '10px',
        marginTop: '20px',
      }}
    >
      {text}
    </h4>
  );

  const inputBase = {
    background: 'var(--bg-deep)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 12px',
    color: 'var(--text-primary)',
    fontSize: '13px',
    width: '100%',
    outline: 'none',
  };

  const labelBase = {
    fontSize: '11px',
    color: 'var(--text-muted)',
    fontWeight: 600,
    display: 'block',
    marginBottom: '6px',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div
        className="panel-card"
        style={{
          padding: '20px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: '16px',
            bottom: '16px',
            width: '3px',
            borderRadius: '0 2px 2px 0',
            background: catColor,
            opacity: 0.7,
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Badge color={incident.domain_color}>{incident.domain_name}</Badge>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{incident.category_name}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Verification override dropdown */}
            <select
              value={incident.verification_override || incident.verification_status || 'unverified'}
              onChange={(e) => handleUpdateOverride(e.target.value === 'auto' ? null : e.target.value)}
              disabled={overrideLoading}
              style={{
                background: 'var(--bg-deep)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '4px 8px',
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-sans)',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="auto">🤖 Auto: {(incident.verification_status || 'unverified')}</option>
              <option value="unverified">⚪ Unverified</option>
              <option value="verified">🟢 Verified</option>
              <option value="confirmed">🟢 Confirmed</option>
              <option value="contested">🔴 Contested</option>
            </select>
            <Badge status={incident.status}>{incident.status}</Badge>
          </div>
        </div>
        <h2 style={{ fontSize: 'var(--text-h3)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px', lineHeight: 1.2 }}>
          {incident.title}
        </h2>
        {isPolygon ? (
          <p style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)' }}>
            ⬡ {incident.zone_category_name || 'Zone'} · Polygon
          </p>
        ) : (
          <p style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
            {parseFloat(incident.latitude ?? 0).toFixed(4)}, {parseFloat(incident.longitude ?? 0).toFixed(4)}
          </p>
        )}
      </div>

      {/* Meta */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '10px',
        }}
      >
        <MetaItem label="Severity" severity={incident.severity} />
        <MetaItem label="Start" date={format(new Date(incident.start_date), 'MMM dd, yyyy')} time={format(new Date(incident.start_date), 'h:mm a')} />
        <MetaItem label="End" date={incident.end_date ? format(new Date(incident.end_date), 'MMM dd, yyyy') : 'Ongoing'} time={incident.end_date ? format(new Date(incident.end_date), 'h:mm a') : null} />
        <MetaItem label="Created" date={format(new Date(incident.created_at), 'MMM dd, yyyy')} time={format(new Date(incident.created_at), 'h:mm a')} />
      </div>

      {/* Description */}
      {incident.description && (
        <div>
          {sectionTitle('Description')}
          <p
            style={{
              color: 'var(--text-secondary)',
              lineHeight: 1.7,
              fontSize: '13px',
              background: 'var(--bg-input)',
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {incident.description}
          </p>
        </div>
      )}

      {/* Sources */}
      {sources.length > 0 && (
        <div>
          {sectionTitle('Sources')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {sources.map((src) => (
              <SourceItem key={src.id} source={src} onUpdateVerification={handleUpdateSourceVerification} />
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div>
        {/* Timeline Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px',
            marginTop: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h4
              style={{
                fontSize: '12px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                color: 'var(--text-muted)',
                margin: 0,
              }}
            >
              Updates
            </h4>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--accent-light)',
                background: 'var(--accent-subtle-bg)',
                padding: '2px 8px',
                borderRadius: 'var(--radius-pill)',
              }}
            >
              {timeline.length}
            </span>
          </div>
          <button
            onClick={() => setSortOrder((o) => (o === 'desc' ? 'asc' : 'desc'))}
            style={{
              fontSize: '11px',
              color: 'var(--text-muted)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            {sortOrder === 'desc' ? 'Latest first' : 'Oldest first'} ↕
          </button>
        </div>

        {/* Add Update button */}
        {!isAddingUpdate && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsAddingUpdate(true);
              setNewUpdateDate(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
            }}
            style={{ marginBottom: '12px' }}
          >
            + Add Update
          </Button>
        )}

        {/* Add Update Inline Form */}
        {isAddingUpdate && (
          <div
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-hover)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              marginBottom: '16px',
            }}
          >
            <label style={labelBase}>Update Summary</label>
            <textarea
              value={newSummary}
              onChange={(e) => setNewSummary(e.target.value)}
              rows={3}
              placeholder="Describe the latest development..."
              style={{ ...inputBase, resize: 'vertical', marginBottom: '10px' }}
            />
            <label style={labelBase}>Date & Time</label>
            <input
              type="datetime-local"
              value={newUpdateDate}
              onChange={(e) => setNewUpdateDate(e.target.value)}
              style={{ ...inputBase, fontFamily: 'var(--font-mono)', marginBottom: '10px', padding: '8px 12px' }}
            />
            <label style={labelBase}>X / Twitter Post URL (optional)</label>
            <input
              type="url"
              value={newSourceUrl}
              onChange={(e) => setNewSourceUrl(e.target.value)}
              placeholder="https://x.com/..."
              style={{ ...inputBase, fontFamily: 'var(--font-mono)', marginBottom: '12px', padding: '8px 12px' }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                variant="primary"
                size="sm"
                onClick={handleAddUpdate}
                disabled={!newSummary.trim() || timelineLoading}
              >
                {timelineLoading ? 'Saving...' : 'Save Update'}
              </Button>
              <Button variant="ghost" size="sm" onClick={resetAddForm}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Timeline entries */}
        <div>
          {sortedTimeline.length === 0 && !isAddingUpdate && (
            <div
              style={{
                textAlign: 'center',
                padding: '32px 20px',
                color: 'var(--text-muted)',
                fontSize: '13px',
                border: '1px dashed var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div style={{ fontSize: '24px', marginBottom: '8px', opacity: 0.5 }}>📝</div>
              <div>No updates yet.</div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>Click "+ Add Update" to add the first entry.</div>
            </div>
          )}

          {sortedTimeline.map((update, index) => {
            const isEditing = editingUpdateId === update.id;

            if (isEditing) {
              return (
                <div
                  key={update.id}
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-hover)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px',
                    marginBottom: '14px',
                  }}
                >
                  <label style={labelBase}>Edit Summary</label>
                  <textarea
                    value={editSummary}
                    onChange={(e) => setEditSummary(e.target.value)}
                    rows={3}
                    style={{ ...inputBase, resize: 'vertical', marginBottom: '10px' }}
                  />
                  <label style={labelBase}>Date & Time</label>
                  <input
                    type="datetime-local"
                    value={editUpdateDate}
                    onChange={(e) => setEditUpdateDate(e.target.value)}
                    style={{ ...inputBase, fontFamily: 'var(--font-mono)', marginBottom: '10px', padding: '8px 12px' }}
                  />
                  <label style={labelBase}>X / Twitter Post URL (optional)</label>
                  <input
                    type="url"
                    value={editSourceUrl}
                    onChange={(e) => setEditSourceUrl(e.target.value)}
                    placeholder="https://x.com/..."
                    style={{ ...inputBase, fontFamily: 'var(--font-mono)', marginBottom: '12px', padding: '8px 12px' }}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleEditUpdate(update.id)}
                      disabled={!editSummary.trim() || timelineLoading}
                    >
                      {timelineLoading ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={resetEditForm}>
                      Cancel
                    </Button>
                  </div>
                </div>
              );
            }

            return (
              <TimelineEntry
                key={update.id}
                update={update}
                isLatest={sortOrder === 'desc' ? index === 0 : index === sortedTimeline.length - 1}
                isExpanded={expandedUpdateId === update.id}
                onToggle={() =>
                  setExpandedUpdateId(expandedUpdateId === update.id ? null : update.id)
                }
                isAdmin={true}
                onEdit={() => startEditing(update)}
                onDelete={() => handleDeleteUpdate(update.id)}
                isFirst={index === 0}
                isLast={index === sortedTimeline.length - 1}
              />
            );
          })}
        </div>
      </div>

      {/* Media */}
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '12px',
            marginTop: '20px',
          }}
        >
          <h4
            style={{
              fontSize: '12px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              color: 'var(--text-muted)',
              margin: 0,
            }}
          >
            Media
          </h4>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--accent-light)',
              background: 'var(--accent-subtle-bg)',
              padding: '2px 8px',
              borderRadius: 'var(--radius-pill)',
            }}
          >
            {media.length}
          </span>
        </div>

        <MediaUploader onUpload={handleUploadMedia} disabled={mediaLoading} />

        {mediaLoading && media.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '20px',
              color: 'var(--text-muted)',
              fontSize: '13px',
            }}
          >
            Loading media...
          </div>
        )}

        {media.length === 0 && !mediaLoading && (
          <div
            style={{
              textAlign: 'center',
              padding: '24px 20px',
              color: 'var(--text-muted)',
              fontSize: '13px',
              border: '1px dashed var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div style={{ fontSize: '24px', marginBottom: '8px', opacity: 0.5 }}>
              <Image size={24} style={{ display: 'inline-block' }} />
            </div>
            <div>No media yet.</div>
            <div style={{ fontSize: '12px', marginTop: '4px' }}>
              Drag and drop or click to upload photos and videos.
            </div>
          </div>
        )}

        <MediaGallery
          media={media}
          onDelete={handleDeleteMedia}
          canEdit={true}
        />
      </div>

      {/* Resolve Modal -->
      {showResolveModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeResolveModal();
          }}
        >
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              width: '400px',
              maxWidth: '90vw',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
              Resolve Incident
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Mark <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{incident.title}</span> as resolved.
            </p>

            <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              Resolution Date & Time
            </label>
            <input
              type="datetime-local"
              value={resolveDate}
              onChange={(e) => setResolveDate(e.target.value)}
              style={{
                background: 'var(--bg-deep)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 12px',
                color: 'var(--text-primary)',
                fontSize: '13px',
                fontFamily: 'var(--font-mono)',
                width: '100%',
                outline: 'none',
                marginBottom: '12px',
              }}
            />

            {resolveDate && (
              <div
                style={{
                  background: 'var(--alert-warning-bg)',
                  border: '1px solid var(--alert-warning-border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 12px',
                  fontSize: '12px',
                  color: 'var(--warning)',
                  marginBottom: '16px',
                  lineHeight: 1.5,
                }}
              >
                {(() => {
                  const warning = getResolveWarning();
                  if (!warning) return null;
                  return (
                    <span>
                      {warning.text}
                      {warning.highlight && (
                        <span style={{ fontWeight: 700 }}>{warning.highlight}</span>
                      )}
                    </span>
                  );
                })()}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <Button variant="ghost" size="sm" onClick={closeResolveModal}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleConfirmResolve} disabled={!resolveDate || resolveLoading}>
                {resolveLoading ? 'Resolving...' : 'Confirm Resolve'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '8px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
        {incident.status === 'active' && (
          <Button variant="danger" onClick={openResolveModal}>
            Resolve
          </Button>
        )}
        {isPolygon ? (
          <>
            {onEditZone && (
              <Button variant="primary" onClick={() => onEditZone?.()}>
                Edit Zone
              </Button>
            )}
            {onEditZoneInfo && (
              <Button variant="primary" onClick={() => onEditZoneInfo?.()}>
                Edit Zone Info
              </Button>
            )}
          </>
        ) : (
          <Button variant="primary" onClick={() => onEdit?.(incident)}>
            Edit Incident
          </Button>
        )}
        <Button variant="ghost" style={{ color: 'var(--danger)' }} onClick={openDeleteModal}>
          Delete
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
        <button
          onClick={handleCopyLink}
          title="Copy shareable link"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            fontWeight: 500,
            color: copied ? '#22c55e' : 'var(--text-muted)',
            background: 'transparent',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            padding: '6px 10px',
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
            transition: 'all 0.15s ease',
            marginLeft: 'auto',
          }}
          onMouseEnter={(e) => {
            if (!copied) {
              e.currentTarget.style.color = 'var(--text-primary)';
            }
          }}
          onMouseLeave={(e) => {
            if (!copied) {
              e.currentTarget.style.color = 'var(--text-muted)';
            }
          }}
        >
          {copied ? <Check size={13} /> : <Link size={13} />}
          {copied ? 'Copied!' : 'Copy link'}
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1100,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: 'rgba(28, 28, 36, 0.5)', borderRadius: 'var(--radius-lg)', padding: '24px', width: '420px', maxWidth: '90%',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.08)'
          }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '18px' }}>Delete Incident</h3>
            <p style={{ margin: '0 0 16px', color: 'var(--text-secondary)', fontSize: '14px' }}>
              Are you sure you want to delete <strong>{incident.title}</strong>?
              It will be moved to the Recycle Bin and can be restored within 30 days.
            </p>
            {deleteError && (
              <div style={{ color: 'var(--danger)', fontSize: '13px', marginBottom: '12px' }}>{deleteError}</div>
            )}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <Button variant="ghost" size="sm" onClick={closeDeleteModal} disabled={deleteLoading}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" onClick={handleConfirmDelete} disabled={deleteLoading}>
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetaItem({ label, value, date, time, severity }) {
  return (
    <div
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: '14px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <span
        style={{
          fontSize: '10px',
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '1.2px',
          fontWeight: 700,
        }}
      >
        {label}
      </span>
      {severity !== undefined && (
        <div style={{ marginTop: '8px' }}>
          <SeverityBadge level={severity} wide />
        </div>
      )}
      {value && (
        <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '6px', letterSpacing: '-0.2px' }}>
          {value}
        </p>
      )}
      {date && (
        <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '6px', letterSpacing: '-0.2px' }}>
          {date}
        </p>
      )}
      {time && (
        <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
          {time}
        </p>
      )}
    </div>
  );
}

function SourceItem({ source, onUpdateVerification }) {
  const embedRef = useRef(null);
  const vConfig = SOURCE_VERIFICATION_CONFIG[source.verification_status] || SOURCE_VERIFICATION_CONFIG.unverified;

  // Force dark theme on all Twitter embeds (new + existing in DB)
  const darkEmbedHtml = source.embed_html
    ? source.embed_html.replace(
        /class="twitter-tweet"/g,
        'class="twitter-tweet" data-theme="dark"'
      )
    : null;

  useEffect(() => {
    if (darkEmbedHtml && embedRef.current && window.twttr?.widgets) {
      window.twttr.widgets.load(embedRef.current);
    }
  }, [darkEmbedHtml]);

  const VerificationToggle = () => (
    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '8px' }}>
      {Object.entries(SOURCE_VERIFICATION_CONFIG).map(([status, cfg]) => (
        <button
          key={status}
          onClick={() => onUpdateVerification?.(source.id, status)}
          style={{
            padding: '3px 8px',
            borderRadius: 'var(--radius-pill)',
            border: `1px solid ${source.verification_status === status ? cfg.color : 'var(--border-subtle)'}`,
            background: source.verification_status === status ? `${cfg.color}20` : 'var(--bg-elevated)',
            color: source.verification_status === status ? cfg.color : 'var(--text-muted)',
            fontSize: '10px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          {cfg.icon} {cfg.label}
        </button>
      ))}
    </div>
  );

  if (darkEmbedHtml) {
    return (
      <div
        style={{
          background: 'var(--bg-input)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-elevated)',
          }}
        >
          <Badge color={source.source_type === 'x_post' ? '#3b82f6' : source.source_type === 'news_article' ? '#8b5cf6' : '#6b7280'}>
            {source.source_type}
          </Badge>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: vConfig.color,
              background: `${vConfig.color}15`,
              padding: '2px 8px',
              borderRadius: 'var(--radius-pill)',
            }}
          >
            {vConfig.icon} {vConfig.label}
          </span>
        </div>
        <div
          ref={embedRef}
          style={{ padding: '12px' }}
          dangerouslySetInnerHTML={{ __html: darkEmbedHtml }}
        />
        {source.description && (
          <p style={{ padding: '0 12px 12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            {source.description}
          </p>
        )}
        <div style={{ padding: '0 12px 12px' }}>
          <VerificationToggle />
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: 'var(--bg-input)',
        padding: '12px',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
        <Badge color={source.source_type === 'x_post' ? '#3b82f6' : source.source_type === 'news_article' ? '#8b5cf6' : '#6b7280'}>
          {source.source_type}
        </Badge>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            color: vConfig.color,
            background: `${vConfig.color}15`,
            padding: '2px 8px',
            borderRadius: 'var(--radius-pill)',
          }}
        >
          {vConfig.icon} {vConfig.label}
        </span>
        {source.source_url && (
          <a
            href={source.source_url}
            target="_blank"
            rel="noreferrer"
            style={{ color: 'var(--accent-light)', fontSize: '12px', textDecoration: 'none' }}
          >
            View source →
          </a>
        )}
      </div>
      {source.description && (
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{source.description}</p>
      )}
      <VerificationToggle />
    </div>
  );
}
