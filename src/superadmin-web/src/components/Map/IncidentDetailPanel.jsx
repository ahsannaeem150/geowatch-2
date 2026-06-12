import React, { useState, useEffect, useCallback } from 'react';
import { getIncident, updateIncident, deleteIncident, resolveIncident, restoreIncident } from '../../services/api.js';
import TimelineEntry from '@shared/components/TimelineEntry.jsx';
import { SEVERITY_SCALE, VERIFICATION_CONFIG, SOURCE_VERIFICATION_CONFIG } from '@shared/constants.js';
import { format } from 'date-fns';

export default function IncidentDetailPanel({ incident, onBack, adminMode = false, onRefresh, categories = [], onEditZone, onEditZoneInfo }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedUpdateId, setExpandedUpdateId] = useState(null);

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

    // If the incident already has sources and timeline, use it directly
    if (incident.sources && incident.timeline) {
      setData({ incident, sources: incident.sources, timeline: incident.timeline });
      setLoading(false);
      return;
    }

    // Deleted incidents cannot be re-fetched from the live endpoint.
    // Render them directly from the recycle-bin payload.
    if (incident.isDeleted || incident.status === 'hidden') {
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
      // Refresh data
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
      // Notify parent and global listeners (same pattern as admin-web)
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
      <div style={{ padding: '24px', color: 'var(--text-secondary)', fontSize: '13px' }}>
        Loading incident details...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '24px', color: 'var(--danger)', fontSize: '13px' }}>{error}</div>
    );
  }

  if (!data) return null;

  const { incident: inc, sources = [], timeline = [] } = data;
  const isDeleted = inc.isDeleted || inc.status === 'hidden';
  const catColor = inc.domain_color || '#6b7280';
  const vCfg = inc.verification_status ? VERIFICATION_CONFIG[inc.verification_status] : null;

  const dateStr = inc.start_date
    ? format(new Date(inc.start_date), 'MMM d, yyyy · h:mm a')
    : 'Unknown';

  const adminBaseUrl = typeof window !== 'undefined'
    ? window.location.origin.replace(':5175', ':5174')
    : 'http://localhost:5174';
  const adminUrl = `${adminBaseUrl}?incident=${inc.id}`;

  const isPolygon = inc.geometry_type === 'polygon' || inc.geometry?.type === 'Polygon';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px', overflowY: 'auto', height: '100%' }}>
      {/* Back + Admin link */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          onClick={onBack}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0',
          }}
        >
          ← Back to results
        </button>
        {adminMode && mode === 'view' && (
          <a
            href={adminUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--navy-400)',
              textDecoration: 'none',
            }}
          >
            Open in Admin →
          </a>
        )}
      </div>

      {/* Action messages */}
      {actionError && (
        <div style={{ padding: '10px 14px', background: 'var(--alert-error-bg)', border: '1px solid var(--alert-error-border)', borderRadius: 'var(--radius-sm)', color: 'var(--danger)', fontSize: '12px', fontWeight: 500 }}>
          {actionError}
        </div>
      )}
      {actionSuccess && (
        <div style={{ padding: '10px 14px', background: 'var(--alert-success-bg)', border: '1px solid var(--alert-success-border)', borderRadius: 'var(--radius-sm)', color: 'var(--success)', fontSize: '12px', fontWeight: 500 }}>
          {actionSuccess}
        </div>
      )}

      {/* Deleted incident banner */}
      {isDeleted && (
        <div
          style={{
            padding: '12px 14px',
            background: 'var(--alert-error-bg)',
            border: '1px solid var(--alert-error-border)',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--danger)' }}>
            This incident has been moved to the Recycle Bin.
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {inc.deleted_at && (
              <div>Deleted {format(new Date(inc.deleted_at), 'MMM d, yyyy · h:mm a')}</div>
            )}
            {inc.deleted_by_name && <div>Deleted by {inc.deleted_by_name}</div>}
            {inc.original_status && <div>Original status: {inc.original_status}</div>}
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <a
              href="#/superadmin/recycle-bin"
              onClick={(e) => {
                e.preventDefault();
                window.location.hash = '#/superadmin/recycle-bin';
              }}
              style={{
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 700,
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                background: 'transparent',
                color: 'var(--text-secondary)',
                textDecoration: 'none',
                cursor: 'pointer',
              }}
            >
              View in Recycle Bin
            </a>
            <button
              onClick={async () => {
                setActionLoading(true);
                setActionError('');
                try {
                  await restoreIncident(inc.id);
                  setActionSuccess('Incident restored successfully');
                  const res = await getIncident(inc.id);
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
                fontSize: '12px',
                fontWeight: 700,
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--success)',
                background: 'var(--alert-success-bg)',
                color: 'var(--success)',
                cursor: actionLoading ? 'not-allowed' : 'pointer',
                opacity: actionLoading ? 0.6 : 1,
              }}
            >
              {actionLoading ? 'Restoring…' : 'Restore Incident'}
            </button>
          </div>
        </div>
      )}

      {mode === 'edit' ? (
        /* ─── Edit Form ─── */
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
          {adminMode && !isDeleted && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {!isPolygon && (
                <button
                  onClick={enterEditMode}
                  style={{
                    padding: '6px 14px',
                    fontSize: '12px',
                    fontWeight: 700,
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--navy-500)',
                    background: 'linear-gradient(135deg, var(--navy-600), var(--navy-700))',
                    color: '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  Edit Incident
                </button>
              )}
              {isPolygon && onEditZone && (
                <button
                  onClick={onEditZone}
                  style={{
                    padding: '6px 14px',
                    fontSize: '12px',
                    fontWeight: 700,
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--navy-500)',
                    background: 'linear-gradient(135deg, var(--navy-600), var(--navy-700))',
                    color: '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  Edit Zone
                </button>
              )}
              {isPolygon && onEditZoneInfo && (
                <button
                  onClick={onEditZoneInfo}
                  style={{
                    padding: '6px 14px',
                    fontSize: '12px',
                    fontWeight: 700,
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--navy-500)',
                    background: 'linear-gradient(135deg, var(--navy-600), var(--navy-700))',
                    color: '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  Edit Zone Info
                </button>
              )}
              {inc.status === 'active' && (
                <button
                  onClick={() => setShowResolveConfirm(true)}
                  style={{
                    padding: '6px 14px',
                    fontSize: '12px',
                    fontWeight: 700,
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--warning)',
                    background: 'var(--alert-warning-bg)',
                    color: 'var(--warning)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  Resolve
                </button>
              )}
              <button
                onClick={() => setShowDeleteConfirm(true)}
                style={{
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: 700,
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--danger)',
                  background: 'var(--alert-error-bg)',
                  color: 'var(--danger)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                Delete
              </button>
            </div>
          )}

          {/* Badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: catColor,
                background: `${catColor}18`,
                padding: '3px 10px',
                  borderRadius: 'var(--radius-sm)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              {inc.domain_name || 'Unknown'}
            </span>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: (SEVERITY_SCALE.find((s) => s.value === inc.severity) || SEVERITY_SCALE[2]).color,
                background: `${(SEVERITY_SCALE.find((s) => s.value === inc.severity) || SEVERITY_SCALE[2]).color}18`,
                padding: '3px 10px',
                  borderRadius: 'var(--radius-sm)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              {(SEVERITY_SCALE.find((s) => s.value === inc.severity) || SEVERITY_SCALE[2]).label}
            </span>
            {vCfg && (
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color: vCfg.color,
                  background: `${vCfg.color}18`,
                  padding: '3px 10px',
                    borderRadius: 'var(--radius-sm)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                {vCfg.icon} {vCfg.label}
              </span>
            )}
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: isDeleted ? 'var(--danger)' : inc.status === 'active' ? '#22c55e' : 'var(--text-muted)',
                background: isDeleted ? 'var(--alert-error-bg)' : inc.status === 'active' ? 'var(--alert-success-bg)' : 'rgba(107, 114, 128, 0.1)',
                padding: '3px 10px',
                  borderRadius: 'var(--radius-sm)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              {isDeleted ? 'Deleted' : inc.status}
            </span>
          </div>

          {/* Title */}
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, lineHeight: 1.3 }}>
            {inc.title}
          </h2>

          {/* Meta */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: 'var(--text-muted)' }}>
            <div>📍 {isPolygon ? `⬡ ${inc.zone_category_name || 'Zone'} · Polygon` : (inc.location_context || `${parseFloat(inc.latitude).toFixed(4)}, ${parseFloat(inc.longitude).toFixed(4)}`)}</div>
            <div>📅 {dateStr}</div>
            {inc.end_date && (
              <div>🏁 Ends: {format(new Date(inc.end_date), 'MMM d, yyyy · h:mm a')}</div>
            )}
          </div>

          {/* Description */}
          {inc.description && (
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, padding: '12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              {inc.description}
            </div>
          )}

          {/* Sources */}
          {sources.length > 0 && (
            <div>
              <h3 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                Sources · {sources.length}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {sources.map((source) => (
                  <SourceItem key={source.id} source={source} />
                ))}
              </div>
            </div>
          )}

          {/* Timeline */}
          {timeline.length > 0 && (
            <div>
              <h3 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                Timeline · {timeline.length}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {timeline.map((update) => (
                  <TimelineEntry
                    key={update.id}
                    update={update}
                    isExpanded={expandedUpdateId === update.id}
                    onToggle={() => setExpandedUpdateId(expandedUpdateId === update.id ? null : update.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Admin Metadata */}
          {adminMode && (
            <div style={{ marginTop: '8px', padding: '12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border-subtle)' }}>
              <h3 style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                Debug Metadata
              </h3>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', lineHeight: 1.7 }}>
                <div>ID: {inc.id}</div>
                <div>Created by: {inc.created_by || '—'}</div>
                <div>Created at: {inc.created_at ? new Date(inc.created_at).toLocaleString() : '—'}</div>
                <div>Updated at: {inc.updated_at ? new Date(inc.updated_at).toLocaleString() : '—'}</div>
                {inc.resolved_by && <div>Resolved by: {inc.resolved_by}</div>}
                {inc.resolved_at && <div>Resolved at: {new Date(inc.resolved_at).toLocaleString()}</div>}
                <div>Category ID: {inc.category_id}</div>
                <div>Verification: {inc.verification_status || 'computed'}</div>
                <div>Override: {inc.verification_override || 'none'}</div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Resolve Confirm Modal */}
      {showResolveConfirm && (
        <Modal onClose={() => setShowResolveConfirm(false)}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 12px' }}>
            Resolve Incident
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 20px' }}>
            Mark <strong>{inc.title}</strong> as resolved? It will be hidden from the live map and moved to historic view.
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowResolveConfirm(false)}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
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
                fontSize: '13px',
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
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--danger)', margin: '0 0 12px' }}>
            Move to Recycle Bin
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 20px' }}>
            Move <strong>{inc.title}</strong> to the Recycle Bin? It will be hidden from all views but can be restored later from the Recycle Bin page.
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
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
                fontSize: '13px',
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

/* ─── Source Item ─── */
function SourceItem({ source }) {
  const svCfg = source.verification_status ? SOURCE_VERIFICATION_CONFIG[source.verification_status] : null;

  return (
    <div style={{ padding: '10px 12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          {source.source_type?.replace(/_/g, ' ')}
        </span>
        {svCfg && (
          <span style={{ fontSize: '10px', fontWeight: 700, color: svCfg.color, background: `${svCfg.color}18`, padding: '2px 6px', borderRadius: '4px' }}>
            {svCfg.label}
          </span>
        )}
      </div>
      {source.description && (
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>{source.description}</div>
      )}
      {source.source_url && (
        <a
          href={source.source_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: '12px', color: 'var(--navy-400)', wordBreak: 'break-all' }}
        >
          {source.source_url}
        </a>
      )}
      {source.embed_html && (
        <div style={{ marginTop: '8px' }} dangerouslySetInnerHTML={{ __html: source.embed_html }} />
      )}
    </div>
  );
}
