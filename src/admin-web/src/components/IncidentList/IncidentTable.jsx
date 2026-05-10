import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { Button } from '@shared/components/Button.jsx';
import { Badge } from '@shared/components/Badge.jsx';
import { SeverityBadge } from '@shared/components/SeverityBadge.jsx';
import { CATEGORY_LABELS } from '@shared/constants.js';
import { format } from 'date-fns';

export default function IncidentTable({ onSelect, onEdit, onRefresh, refreshKey, dateRange }) {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Resolve modal state
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolveIncidentId, setResolveEventId] = useState(null);
  const [resolveDate, setResolveDate] = useState('');

  useEffect(() => {
    setLoading(true);
    api
      .getIncidents({ dateFrom: dateRange?.from, dateTo: dateRange?.to })
      .then((res) => setIncidents(res.data.incidents))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [refreshKey, dateRange?.from, dateRange?.to]);

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this incident?')) return;
    try {
      await api.deleteIncident(id);
      setIncidents(incidents.filter((i) => i.id !== id));
      onRefresh?.(id);
    } catch (err) {
      alert(err.message);
    }
  };

  const openResolveModal = (id) => {
    setResolveEventId(id);
    setResolveDate(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
    setShowResolveModal(true);
  };

  const closeResolveModal = () => {
    setShowResolveModal(false);
    setResolveEventId(null);
    setResolveDate('');
  };

  const confirmResolve = async () => {
    if (!resolveIncidentId || !resolveDate) return;
    try {
      await api.resolveIncident(resolveIncidentId, {
        resolvedAt: new Date(resolveDate).toISOString(),
      });
      setIncidents(incidents.map((i) => (i.id === resolveIncidentId ? { ...i, status: 'resolved' } : i)));
      closeResolveModal();
      onRefresh?.(resolveIncidentId);
    } catch (err) {
      alert(err.message);
    }
  };

  // Calculate smart warning message
  const getResolveWarning = () => {
    if (!resolveDate) return null;
    const resolvedAt = new Date(resolveDate);
    const now = new Date();
    const graceEnd = new Date(resolvedAt.getTime() + 24 * 60 * 60 * 1000);
    const hoursRemaining = Math.max(0, Math.ceil((graceEnd - now) / (1000 * 60 * 60)));

    if (hoursRemaining <= 0) {
      return { text: 'Marker will disappear from the map.', highlight: null };
    }

    const isNearCurrent = Math.abs(now - resolvedAt) < 5 * 60 * 1000; // within 5 min
    if (isNearCurrent) {
      return { text: 'Marker will be removed from the map after ', highlight: '24 hours' };
    }

    return { text: 'Marker will disappear in ', highlight: `${hoursRemaining} hours` };
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center', fontFamily: 'var(--font-sans)' }}>
        Loading incidents...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', color: 'var(--danger)', fontSize: '13px', textAlign: 'center', fontFamily: 'var(--font-sans)' }}>
        {error}
      </div>
    );
  }

  const warning = showResolveModal ? getResolveWarning() : null;

  return (
    <div style={{ overflowX: 'auto', padding: '0 16px' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <th style={thStyle}>Title</th>
            <th style={thStyle}>Category</th>
            <th style={{ ...thStyle, width: '110px' }}>Severity</th>
            <th style={thStyle}>Status</th>
            <th style={{ ...thStyle, width: '100px' }}>Start Date</th>
            <th style={{ ...thStyle, textAlign: 'right', width: '180px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {incidents.map((incident) => (
            <tr
              key={incident.id}
              style={{
                borderBottom: '1px solid var(--border-subtle)',
                cursor: 'pointer',
                transition: 'background var(--transition-fast)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <td style={tdStyle} onClick={() => onSelect?.(incident)}>
                <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{incident.title}</span>
              </td>
              <td style={tdStyle} onClick={() => onSelect?.(incident)}>
                <Badge category={incident.category}>{CATEGORY_LABELS[incident.category]}</Badge>
              </td>
              <td style={tdStyle} onClick={() => onSelect?.(incident)}>
                <SeverityBadge level={incident.severity} />
              </td>
              <td style={tdStyle} onClick={() => onSelect?.(incident)}>
                <Badge status={incident.status}>{incident.status}</Badge>
              </td>
              <td
                style={{ ...tdStyle, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}
                onClick={() => onSelect?.(incident)}
              >
                {incident.start_date
                  ? (() => {
                      const d = new Date(incident.start_date);
                      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    })()
                  : '—'}
              </td>
              <td style={{ ...tdStyle, textAlign: 'right' }}>
                <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                  <Button variant="ghost" size="sm" onClick={() => onEdit?.(incident)}>
                    Edit
                  </Button>
                  {incident.status !== 'resolved' && (
                    <Button variant="secondary" size="sm" onClick={() => openResolveModal(incident.id)}>
                      Resolve
                    </Button>
                  )}
                  <Button variant="danger" size="sm" onClick={() => handleDelete(incident.id)}>
                    Delete
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {incidents.length === 0 && (
        <p style={{ color: 'var(--text-muted)', padding: '32px', textAlign: 'center', fontSize: '13px', fontFamily: 'var(--font-sans)' }}>
          No incidents found for this date range.
        </p>
      )}

      {/* Resolve Modal */}
      {showResolveModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={closeResolveModal}
        >
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              width: '360px',
              maxWidth: '90vw',
              boxShadow: 'var(--shadow-lg)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              style={{
                fontSize: '16px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginBottom: '16px',
                textAlign: 'center',
              }}
            >
              Resolve Incident
            </h3>

            <label
              style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                marginBottom: '8px',
                display: 'block',
              }}
            >
              Resolution Date & Time
            </label>
            <input
              type="datetime-local"
              value={resolveDate}
              onChange={(e) => setResolveDate(e.target.value)}
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 12px',
                color: 'var(--text-primary)',
                fontSize: '13px',
                fontFamily: 'var(--font-mono)',
                width: '100%',
                outline: 'none',
                marginBottom: '14px',
              }}
            />

            {warning && (
              <p
                style={{
                  fontSize: '13px',
                  color: 'var(--text-secondary)',
                  textAlign: 'center',
                  marginBottom: '20px',
                  lineHeight: 1.5,
                }}
              >
                {warning.text}
                {warning.highlight && (
                  <span style={{ color: 'var(--danger)', fontWeight: 700 }}>{warning.highlight}</span>
                )}
                {warning.text.endsWith('after ') ? ' from the map.' : warning.text.endsWith('in ') ? ' from the map.' : ''}
              </p>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <Button variant="primary" onClick={confirmResolve}>
                Confirm Resolve
              </Button>
              <Button variant="ghost" onClick={closeResolveModal}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const thStyle = {
  padding: '10px 8px',
  color: 'var(--text-muted)',
  fontWeight: 600,
  fontSize: '10px',
  textTransform: 'uppercase',
  letterSpacing: '0.8px',
  textAlign: 'left',
};

const tdStyle = {
  padding: '10px 8px',
  verticalAlign: 'middle',
};
