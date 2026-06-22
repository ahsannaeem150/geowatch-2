import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ZoneDetailPage as SharedZoneDetailPage } from '@shared';
import { api, mapIncidentForShared } from '../services/api.js';
import { API_BASE_URL } from '@shared/constants.js';

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
  const esRef = useRef(null);

  const fetchData = useCallback(async (opts = {}) => {
    if (!id) return;
    if (!opts.silent) setLoading(true);
    try {
      const res = await api.getIncident(id);
      setData(mapIncidentForShared(res.data));
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

    const token = localStorage.getItem('geowatch_token');
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
            fetchData({ silent: true });
          }

          if (payload.type === 'incident_deleted') {
            setToast({ message: 'This zone has been deleted', type: 'info' });
            setTimeout(() => navigate('/'), 2000);
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

  const handleUpdateIncident = useCallback(
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
      await api.updateIncident(id, body);
    }),
    [id, withRefresh]
  );

  const handleResolveIncident = useCallback(
    withRefresh(async () => {
      await api.resolveIncident(id, { resolvedAt: new Date().toISOString() });
    }),
    [id, withRefresh]
  );

  const handleDeleteIncident = useCallback(
    withRefresh(async () => {
      await api.deleteIncident(id);
      navigate('/');
    }),
    [id, withRefresh, navigate]
  );

  const handleRestoreIncident = useCallback(
    withRefresh(async () => {
      await api.restoreIncident(id);
    }),
    [id, withRefresh]
  );

  const handlePurgeIncident = useCallback(
    withRefresh(async () => {
      await api.purgeIncident(id);
      navigate('/');
    }),
    [id, withRefresh, navigate]
  );

  const handleAddUpdate = useCallback(
    withRefresh(async (form) => {
      await api.addTimeline(id, {
        summary: form.summary,
        details: form.details,
        updateDate: form.timestamp || form.updateDate || new Date().toISOString(),
        type: form.type || 'update',
        verificationStatus: form.verificationStatus || form.verification || 'unverified',
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
      const verification = form.verificationStatus !== undefined ? form.verificationStatus : form.verification;
      if (verification !== undefined) body.verificationStatus = verification;
      await api.updateTimeline(id, updateId, body);
    }),
    [id, withRefresh]
  );

  const handleDeleteUpdate = useCallback(
    withRefresh(async (updateId) => {
      await api.deleteTimeline(id, updateId);
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
            await api.uploadMedia(id, file, { updateId: eventId, caption: mediaItem.caption });
          } else if (mediaItem.url) {
            console.warn('URL-based media evidence not yet supported', mediaItem);
          }
        }
        return;
      }

      if (sourceType === 'x_post') {
        await api.addSource(id, {
          updateId: eventId,
          sourceType: 'x_post',
          sourceUrl: item.tweetUrl,
          description: item.text,
        });
        return;
      }

      if (sourceType === 'news_article') {
        await api.addSource(id, {
          updateId: eventId,
          sourceType: 'news_article',
          sourceUrl: item.url,
          description: [item.title, item.publisher].filter(Boolean).join(' — '),
        });
        return;
      }

      if (sourceType === 'admin_note') {
        await api.addSource(id, {
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
        await api.updateMedia(id, item.id, body);
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
      await api.updateSource(id, item.id, body);
    }),
    [id, withRefresh]
  );

  const handleDeleteEvidence = useCallback(
    withRefresh(async (eventId, sourceType, itemId) => {
      if (sourceType === 'media') {
        await api.deleteMedia(id, itemId);
      } else {
        await api.deleteSource(id, itemId);
      }
    }),
    [id, withRefresh]
  );

  const handlePinEvidence = useCallback(
    withRefresh(async (eventId, sourceType, itemId, pinned) => {
      if (sourceType === 'media') {
        await api.pinMedia(id, itemId, pinned);
      } else {
        await api.pinSource(id, itemId, pinned);
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
      await api.setFeatured(id, eventId, body);
    }),
    [id, withRefresh]
  );

  const handleClearFeatureEvidence = useCallback(
    withRefresh(async (eventId) => {
      await api.clearFeatured(id, eventId);
    }),
    [id, withRefresh]
  );

  const handleCheckSource = useCallback(
    withRefresh(async (eventId, item) => {
      await api.checkSource(id, item.id);
    }),
    [id, withRefresh]
  );

  const handleCopyLink = useCallback(() => {
    const url = `${window.location.origin}/zone/${id}`;
    navigator.clipboard.writeText(url).catch(() => {});
  }, [id]);

  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  }, [navigate]);

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
    <div className="zone-full-page-wrapper page-enter--fullpage">
      <SharedZoneDetailPage
        incident={data.incident}
        timeline={data.timeline}
        onBack={handleBack}
        onCopyLink={handleCopyLink}
        onSave={() => {}}
        onEditZoneInfo={handleUpdateIncident}
        onEditZoneShape={() => navigate(`/?zone=${id}`)}
        onResolve={() => {
          if (window.confirm('Resolve zone? This will mark the zone as resolved.')) {
            handleResolveIncident();
          }
        }}
        onDelete={() => {
          if (window.confirm('Delete zone? This action cannot be undone.')) {
            handleDeleteIncident();
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
      />
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
    </div>
  );
}
