import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { ZoneDetailPage as SharedZoneDetailPage } from '@shared';
import {
  getIncident,
  mapIncidentForShared,
  updateIncident,
  deleteIncident,
  resolveIncident,
  restoreIncident,
  purgeIncident,
  addTimeline,
  updateTimeline,
  deleteTimeline,
  addSource,
  updateSource,
  deleteSource,
  pinSource,
  checkSource,
  uploadMedia,
  updateMedia,
  deleteMedia,
  pinMedia,
  setFeatured,
  clearFeatured,
  listAuditLogs,
} from '../../services/api.js';
import { API_BASE_URL } from '@shared/constants.js';
import AuditTable from '../Audit/AuditTable.jsx';
import UserDetailDrawer from '../Users/UserDetailDrawer.jsx';
import PublicUserDrawer from '../PublicUsers/PublicUserDrawer.jsx';

function dataUrlToFile(dataUrl, fileName = 'image.png') {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], fileName, { type: mime });
}

export default function ZoneDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [creatorDrawer, setCreatorDrawer] = useState({ userId: null, role: null });
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditPagination, setAuditPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [auditLoading, setAuditLoading] = useState(false);
  const esRef = useRef(null);

  const fetchData = useCallback(async (opts = {}) => {
    if (!id) return;
    if (!opts.silent) setLoading(true);
    try {
      const res = await getIncident(id);
      setData(mapIncidentForShared(res));
      if (!opts.silent) setError('');
    } catch (err) {
      if (!opts.silent) setError(err.message || 'Failed to load zone');
    } finally {
      if (!opts.silent) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // SSE listener for live updates
  useEffect(() => {
    if (typeof EventSource === 'undefined' || !id) return;

    const token = localStorage.getItem('superadmin_token');
    const url = `${API_BASE_URL}/incidents/stream`;
    const fullUrl = token ? `${url}?token=${encodeURIComponent(token)}` : url;

    let reconnectTimer = null;
    let reconnectAttempt = 0;
    const MAX_RECONNECT_ATTEMPTS = 5;
    const RECONNECT_DELAY = 5000;

    const connect = () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }

      const es = new EventSource(fullUrl);
      esRef.current = es;

      es.onopen = () => {
        reconnectAttempt = 0;
      };

      es.onmessage = (e) => {
        if (!e.data || e.data.startsWith(':')) return;
        try {
          const payload = JSON.parse(e.data);
          if (!payload.type) return;

          const incidentId = payload.incidentId || payload.incident?.id;
          if (incidentId !== id) return;

          if (
            payload.type === 'incident_updated' ||
            payload.type === 'timeline_updated' ||
            payload.type === 'timeline_added' ||
            payload.type === 'timeline_deleted'
          ) {
            fetchData();
          }

          if (payload.type === 'incident_deleted') {
            setToast({ message: 'This zone has been moved to the Recycle Bin', type: 'info' });
            setTimeout(() => navigate('/superadmin/map'), 2000);
          }
        } catch (err) {
          console.warn('[SSE] Failed to parse message:', err);
        }
      };

      es.onerror = () => {
        es.close();
        if (reconnectAttempt < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempt += 1;
          reconnectTimer = setTimeout(connect, RECONNECT_DELAY * reconnectAttempt);
        }
      };
    };

    connect();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (esRef.current) {
        try { esRef.current.close(); } catch { /* ignore */ }
        esRef.current = null;
      }
    };
  }, [id, fetchData, navigate]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const fetchAuditLogs = useCallback(async (page = 1) => {
    if (!id) return;
    setAuditLoading(true);
    try {
      const data = await listAuditLogs({
        targetType: 'incident',
        targetId: id,
        page,
        limit: 50,
      });
      setAuditLogs(data.logs || []);
      setAuditPagination(data.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 });
    } catch (err) {
      console.warn('[Audit] Failed to load audit logs:', err);
    } finally {
      setAuditLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (auditOpen) {
      fetchAuditLogs(1);
    }
  }, [auditOpen, fetchAuditLogs]);

  const showError = useCallback((message) => {
    setToast({ message, type: 'error' });
  }, []);

  const withRefresh = useCallback(
    (fn) =>
      async (...args) => {
        try {
          await fn(...args);
          await fetchData({ silent: true });
        } catch (err) {
          showError(err.message || 'Action failed');
        }
      },
    [fetchData, showError]
  );

  const handleUpdateZone = useCallback(
    withRefresh(async (patch) => {
      const body = {
        ...(patch.title !== undefined && { title: patch.title }),
        ...(patch.description !== undefined && { description: patch.description }),
        ...(patch.locationContext !== undefined && { locationContext: patch.locationContext }),
        ...(patch.severity !== undefined && { severity: patch.severity }),
        ...(patch.verification !== undefined && { verificationStatus: patch.verification }),
        ...(patch.status !== undefined && { status: patch.status }),
        ...(patch.zoneCategoryId !== undefined && { zoneCategoryId: patch.zoneCategoryId }),
        ...(patch.startDate !== undefined && { startDate: patch.startDate }),
        ...(patch.endDate !== undefined && { endDate: patch.endDate }),
        ...(patch.heroImageUrl && { heroImageUrl: patch.heroImageUrl }),
      };
      await updateIncident(id, body);
    }),
    [id, withRefresh]
  );

  const handleResolveZone = useCallback(
    withRefresh(async () => {
      await resolveIncident(id, { resolvedAt: new Date().toISOString() });
    }),
    [id, withRefresh]
  );

  const handleDeleteZone = useCallback(
    withRefresh(async () => {
      await deleteIncident(id);
    }),
    [id, withRefresh]
  );

  const handleRestoreZone = useCallback(
    withRefresh(async () => {
      await restoreIncident(id);
    }),
    [id, withRefresh]
  );

  const handlePurgeZone = useCallback(
    withRefresh(async () => {
      await purgeIncident(id);
    }),
    [id, withRefresh]
  );

  const handleAddUpdate = useCallback(
    withRefresh(async (form) => {
      await addTimeline(id, {
        summary: form.summary,
        details: form.details,
        updateDate: form.timestamp || form.updateDate || new Date().toISOString(),
        type: form.type || 'update',
        verificationStatus: form.verification || 'unverified',
      });
    }),
    [id, withRefresh]
  );

  const handleEditUpdate = useCallback(
    withRefresh(async (updateId, form) => {
      const body = {};
      if (form.summary !== undefined) body.summary = form.summary;
      if (form.details !== undefined) body.details = form.details;
      if (form.timestamp !== undefined || form.updateDate !== undefined) {
        body.updateDate = form.timestamp || form.updateDate;
      }
      if (form.type !== undefined) body.type = form.type;
      if (form.verification !== undefined) body.verificationStatus = form.verification;
      await updateTimeline(id, updateId, body);
    }),
    [id, withRefresh]
  );

  const handleDeleteUpdate = useCallback(
    withRefresh(async (updateId) => {
      await deleteTimeline(id, updateId);
    }),
    [id, withRefresh]
  );

  const handleAddEvidence = useCallback(
    withRefresh(async (eventId, sourceType, item) => {
      if (sourceType === 'media') {
        const items = Array.isArray(item) ? item : [item];
        for (const mediaItem of items) {
          if (mediaItem.url?.startsWith('data:')) {
            const file = dataUrlToFile(mediaItem.url, mediaItem.name || 'upload.png');
            await uploadMedia(id, file, { updateId: eventId, caption: mediaItem.caption });
          } else if (mediaItem.url) {
            console.warn('URL-based media evidence not yet supported', mediaItem);
          }
        }
        return;
      }

      if (sourceType === 'x_post') {
        await addSource(id, {
          updateId: eventId,
          sourceType: 'x_post',
          sourceUrl: item.tweetUrl,
          description: item.text,
        });
        return;
      }

      if (sourceType === 'news_article') {
        await addSource(id, {
          updateId: eventId,
          sourceType: 'news_article',
          sourceUrl: item.url,
          description: [item.title, item.publisher].filter(Boolean).join(' — '),
        });
        return;
      }

      if (sourceType === 'admin_note') {
        await addSource(id, {
          updateId: eventId,
          sourceType: 'admin_note',
          description: item.text,
        });
        return;
      }

      console.warn('Unsupported evidence type', sourceType, item);
    }),
    [id, withRefresh]
  );

  const handleEditEvidence = useCallback(
    withRefresh(async (eventId, sourceType, item) => {
      if (sourceType === 'media') {
        const body = {};
        if (item.caption !== undefined) body.caption = item.caption;
        if (item.pinned !== undefined) body.pinned = item.pinned;
        if (eventId !== undefined) body.updateId = eventId;
        await updateMedia(id, item.id, body);
        return;
      }

      const body = {};
      if (item.sourceUrl !== undefined || item.tweetUrl !== undefined || item.url !== undefined) {
        body.sourceUrl = item.tweetUrl || item.url || item.sourceUrl;
      }
      if (item.text !== undefined || item.description !== undefined) {
        body.description = item.text || item.description;
      }
      if (item.title !== undefined && item.publisher !== undefined) {
        body.description = [item.title, item.publisher].filter(Boolean).join(' — ');
      }
      if (item.pinned !== undefined) body.pinned = item.pinned;
      await updateSource(id, item.id, body);
    }),
    [id, withRefresh]
  );

  const handleDeleteEvidence = useCallback(
    withRefresh(async (eventId, sourceType, itemId) => {
      if (sourceType === 'media') {
        await deleteMedia(id, itemId);
      } else {
        await deleteSource(id, itemId);
      }
    }),
    [id, withRefresh]
  );

  const handlePinEvidence = useCallback(
    withRefresh(async (eventId, sourceType, itemId, pinned) => {
      if (sourceType === 'media') {
        await pinMedia(id, itemId, pinned);
      } else {
        await pinSource(id, itemId, pinned);
      }
    }),
    [id, withRefresh]
  );

  const handleFeatureEvidence = useCallback(
    withRefresh(async (eventId, { sourceType, sourceId }) => {
      const body = { sourceType };
      if (sourceType === 'media') {
        body.mediaId = sourceId;
      } else {
        body.sourceId = sourceId;
      }
      await setFeatured(id, eventId, body);
    }),
    [id, withRefresh]
  );

  const handleClearFeatureEvidence = useCallback(
    withRefresh(async (eventId) => {
      await clearFeatured(id, eventId);
    }),
    [id, withRefresh]
  );

  function pickScreenshotFile() {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.style.display = 'none';
      document.body.appendChild(input);
      let resolved = false;
      const cleanup = () => {
        if (input.parentNode) input.parentNode.removeChild(input);
      };
      input.addEventListener('change', () => {
        if (resolved) return;
        resolved = true;
        cleanup();
        resolve(input.files?.[0] || null);
      });
      const onFocus = () => {
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            cleanup();
            resolve(null);
          }
        }, 300);
      };
      window.addEventListener('focus', onFocus, { once: true });
      input.click();
    });
  }

  const handleArchiveSource = useCallback(
    withRefresh(async (eventId, item) => {
      if (item.archived) {
        await updateSource(id, item.id, {
          archived: false,
          archiveReason: null,
        });
        return;
      }

      const reason = window.prompt('Reason for archiving this X post?');
      if (reason === null) return;

      if (item.archiveMediaId) {
        await updateSource(id, item.id, {
          archived: true,
          archiveMediaId: item.archiveMediaId,
          archiveReason: reason,
        });
        return;
      }

      const file = await pickScreenshotFile();
      if (!file) {
        throw new Error('A screenshot is required to archive an X post.');
      }

      const uploadResult = await uploadMedia(id, file, { updateId: eventId, caption: reason });
      const mediaId = uploadResult?.media?.id;
      if (!mediaId) {
        throw new Error('Screenshot upload failed: no media id returned.');
      }

      await updateSource(id, item.id, {
        archived: true,
        archiveMediaId: mediaId,
        archiveReason: reason,
      });
    }),
    [id, withRefresh]
  );

  const handleCheckSource = useCallback(
    withRefresh(async (eventId, item) => {
      await checkSource(id, item.id);
    }),
    [id, withRefresh]
  );

  const handleCopyZoneLink = useCallback(() => {
    const url = `${window.location.origin}/zone/${id}`;
    navigator.clipboard.writeText(url).catch(() => {});
  }, [id]);

  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/superadmin/map');
    }
  }, [navigate]);

  const handleOpenAudit = useCallback(() => {
    setAuditOpen(true);
  }, []);

  const handleViewCreator = useCallback((userId, role) => {
    setCreatorDrawer({ userId, role });
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 40, color: 'var(--text-secondary)', textAlign: 'center' }}>
        Loading zone details…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 40, color: 'var(--danger)', textAlign: 'center' }}>
        {error}
      </div>
    );
  }

  if (!data) return null;

  return (
    <>
      <SharedZoneDetailPage
        mode="superadmin"
        incident={data.incident}
        timeline={data.timeline}
        onBack={handleBack}
        onCopyLink={handleCopyZoneLink}
        onSave={() => {}}
        onEditZoneInfo={handleUpdateZone}
        onEditZoneShape={() => navigate(`/superadmin/map?zone=${id}`)}
        onResolve={() => {
          if (window.confirm('Resolve zone? This will mark the zone as resolved.')) {
            handleResolveZone();
          }
        }}
        onDelete={() => {
          if (window.confirm('Delete zone? This will move the zone to the Recycle Bin.')) {
            handleDeleteZone();
          }
        }}
        onRestore={() => {
          if (window.confirm('Restore zone? This will return it to the live map.')) {
            handleRestoreZone();
          }
        }}
        onPurge={() => {
          if (window.confirm('Purge zone permanently? This cannot be undone.')) {
            handlePurgeZone();
          }
        }}
        onAddUpdate={handleAddUpdate}
        onEditUpdate={handleEditUpdate}
        onDeleteUpdate={handleDeleteUpdate}
        onAddEvidence={handleAddEvidence}
        onEditEvidence={handleEditEvidence}
        onDeleteEvidence={handleDeleteEvidence}
        onPinEvidence={handlePinEvidence}
        onFeatureEvidence={handleFeatureEvidence}
        onClearFeatureEvidence={handleClearFeatureEvidence}
        onCheckSource={handleCheckSource}
        onArchiveSource={handleArchiveSource}
        onOpenAudit={handleOpenAudit}
        onViewCreator={handleViewCreator}
        auditLogs={auditLogs}
      />

      {creatorDrawer.userId && creatorDrawer.role === 'public_user' && (
        <PublicUserDrawer
          userId={creatorDrawer.userId}
          onClose={() => setCreatorDrawer({ userId: null, role: null })}
        />
      )}
      {creatorDrawer.userId && creatorDrawer.role !== 'public_user' && (
        <UserDetailDrawer
          userId={creatorDrawer.userId}
          onClose={() => setCreatorDrawer({ userId: null, role: null })}
        />
      )}

      {auditOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 13000,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setAuditOpen(false);
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 1100,
              maxHeight: '90vh',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Audit log — Zone</h3>
              <button
                onClick={() => setAuditOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 32,
                  height: 32,
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
              <AuditTable
                logs={auditLogs}
                pagination={auditPagination}
                loading={auditLoading}
                onPageChange={(page) => fetchAuditLogs(page)}
                onUserClick={() => {}}
                onTargetClick={() => {}}
              />
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 12000,
            padding: '10px 16px',
            borderRadius: 12,
            background: toast.type === 'error' ? 'var(--danger)' : 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            color: toast.type === 'error' ? '#fff' : 'var(--text-primary)',
            fontSize: 13,
            fontWeight: 700,
            boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
          }}
        >
          {toast.message}
        </div>
      )}
    </>
  );
}
