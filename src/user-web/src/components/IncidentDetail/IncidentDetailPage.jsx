import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { IncidentDetailPage as SharedIncidentDetailPage } from '@shared';
import { api, mapIncidentForShared } from '../../services/api.js';
import { API_BASE_URL } from '@shared/constants.js';

export default function IncidentDetailPage() {
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
      setError('');
    } catch (err) {
      if (!opts.silent) setError(err.message || 'Failed to load incident');
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

    const token = localStorage.getItem('geowatch_public_token');
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
            setToast({ message: 'This incident has been removed', type: 'info' });
            setTimeout(() => navigate('/map'), 2000);
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

  const handleCopyIncidentLink = useCallback(() => {
    const url = `${window.location.origin}/incident/${id}`;
    navigator.clipboard.writeText(url).catch(() => {});
  }, [id]);

  const handleBack = useCallback(() => {
    navigate('/map');
  }, [navigate]);

  const handleCheckSource = useCallback(
    async (eventId, item) => {
      try {
        await api.checkSource(id, item.id);
        await fetchData({ silent: true });
      } catch (err) {
        console.error('[handleCheckSource] failed:', err);
      }
    },
    [id, fetchData]
  );

  if (loading) {
    return (
      <div style={{ padding: 40, color: 'var(--text-secondary)', textAlign: 'center' }}>
        Loading incident details…
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
      <SharedIncidentDetailPage
        mode="user"
        incident={data.incident}
        timeline={data.timeline}
        onBack={handleBack}
        onCopyIncidentLink={handleCopyIncidentLink}
        onAutoCheck={handleCheckSource}
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
    </>
  );
}
