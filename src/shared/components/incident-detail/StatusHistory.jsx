import React, { useMemo, useState } from 'react';
import { formatDate, formatTime, relativeTime } from './IncidentUtils.js';

const STATUS_ACTION_META = {
  incident_created: { label: 'Created', color: '#22c55e', icon: '◎' },
  incident_updated: { label: 'Edited', color: '#38bdf8', icon: '✎' },
  incident_resolved: { label: 'Resolved', color: '#eab308', icon: '✓' },
  incident_deleted: { label: 'Moved to Recycle Bin', color: '#f43f5e', icon: '🗑' },
  incident_restored: { label: 'Restored', color: '#22c55e', icon: '↺' },
  incident_purged: { label: 'Permanently deleted', color: '#6b7280', icon: '✕' },
  verification_changed: { label: 'Verification changed', color: '#f59e0b', icon: '◉' },
  access_changed: { label: 'Access changed', color: '#f472b6', icon: '🔒' },
};

export default function StatusHistory({ incident, logs = [], onUserClick }) {
  const [open, setOpen] = useState(false);

  const lifecycleLogs = useMemo(() => {
    const built = [
      ...(incident.createdAt
        ? [
            {
              id: 'lifecycle-created',
              action: 'incident_created',
              timestamp: incident.createdAt,
              actorId: incident.createdBy,
              actorName: incident.createdByName,
            },
          ]
        : []),
      ...(incident.status === 'resolved' && incident.resolvedAt
        ? [
            {
              id: 'lifecycle-resolved',
              action: 'incident_resolved',
              timestamp: incident.resolvedAt,
              actorId: incident.resolvedBy,
              actorName: incident.resolvedByName,
            },
          ]
        : []),
      ...(incident.status === 'deleted' && incident.deletedAt
        ? [
            {
              id: 'lifecycle-deleted',
              action: 'incident_deleted',
              timestamp: incident.deletedAt,
              actorId: incident.deletedBy,
              actorName: incident.deletedByName,
            },
          ]
        : []),
      ...(incident.status === 'purged' && incident.purgedAt
        ? [
            {
              id: 'lifecycle-purged',
              action: 'incident_purged',
              timestamp: incident.purgedAt,
              actorId: incident.deletedBy,
              actorName: incident.deletedByName,
            },
          ]
        : []),
      ...(logs || []).filter((l) => ['incident_updated', 'verification_changed', 'access_changed'].includes(l.action)),
    ];
    return built.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [incident, logs]);

  if (lifecycleLogs.length === 0) return null;

  return (
    <div className="id-status-history">
      <button type="button" className="id-status-history__header" onClick={() => setOpen((v) => !v)}>
        <span>
          Status History <span className="id-status-history__count">{lifecycleLogs.length}</span>
        </span>
        <span className="id-status-history__chevron">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="id-status-history__list">
          {lifecycleLogs.map((log, idx) => {
            const meta = STATUS_ACTION_META[log.action] || { label: log.action, color: '#94a3b8', icon: '•' };
            const actor = log.actorName || log.actorId || 'System';
            return (
              <div key={log.id} className="id-status-history__item">
                <div
                  className="id-status-history__dot"
                  style={{ color: meta.color, background: `${meta.color}1a`, borderColor: meta.color }}
                >
                  {meta.icon}
                </div>
                <div className="id-status-history__content">
                  <div className="id-status-history__top">
                    <span className="id-status-history__label">{meta.label}</span>
                    <span className="id-status-history__time">{relativeTime(log.timestamp)}</span>
                  </div>
                  <div className="id-status-history__sub">
                    {formatDate(log.timestamp)} · {formatTime(log.timestamp)}
                    {log.actorId && (
                      <>
                        {' · by '}
                        <button type="button" className="id-status-history__actor" onClick={() => onUserClick?.(log.actorId)}>
                          {actor}
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {idx !== lifecycleLogs.length - 1 && <div className="id-status-history__line" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
