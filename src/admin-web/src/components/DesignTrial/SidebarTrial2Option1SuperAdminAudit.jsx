import React, { useMemo, useState } from 'react';
import { formatDate, formatTime, relativeTime, Icons, Badge } from './SidebarTrialShared.jsx';

/* ─────────────────────────────────────────────────────────────────────────────
   Rough audit / activity helpers for the Option 1 Superadmin layout prototypes.
   This is intentionally unpolished — it exists so we can compare A / B / C.
   ───────────────────────────────────────────────────────────────────────────── */

const ACTION_META = {
  incident_created: { label: 'Created', color: '#22c55e', icon: '◎' },
  incident_updated: { label: 'Edited', color: '#38bdf8', icon: '✎' },
  verification_changed: { label: 'Verification changed', color: '#f59e0b', icon: '◉' },
  timeline_added: { label: 'Update added', color: '#38bdf8', icon: '↳' },
  timeline_updated: { label: 'Update edited', color: '#818cf8', icon: '✎' },
  source_added: { label: 'Source added', color: '#a78bfa', icon: '＋' },
  source_updated: { label: 'Source edited', color: '#818cf8', icon: '✎' },
  source_pinned: { label: 'Pinned', color: '#fbbf24', icon: '📌' },
  source_deleted: { label: 'Source deleted', color: '#ef4444', icon: '✕' },
  access_changed: { label: 'Access changed', color: '#f472b6', icon: '🔒' },
  admin_login: { label: 'Logged in', color: '#94a3b8', icon: '➜' },
};

export const USERS = [
  {
    id: 'u1',
    name: 'System Administrator',
    email: 'admin@geowatch.local',
    role: 'superadmin',
    active: true,
    avatarSeed: 'admin',
    memberSince: '2023-01-10T09:00:00Z',
  },
  {
    id: 'u2',
    name: 'Ops Desk',
    email: 'ops@geowatch.local',
    role: 'admin',
    active: true,
    avatarSeed: 'opsdesk',
    memberSince: '2023-04-15T09:00:00Z',
  },
  {
    id: 'u3',
    name: 'Station Commander',
    email: 'cmdr@geowatch.local',
    role: 'admin',
    active: true,
    avatarSeed: 'cmdr',
    memberSince: '2023-06-02T09:00:00Z',
  },
  {
    id: 'u4',
    name: 'Media Cell',
    email: 'media@geowatch.local',
    role: 'admin',
    active: true,
    avatarSeed: 'media',
    memberSince: '2023-08-20T09:00:00Z',
  },
  {
    id: 'u5',
    name: 'Field Editor',
    email: 'field@geowatch.local',
    role: 'admin',
    active: false,
    avatarSeed: 'field',
    memberSince: '2024-01-11T09:00:00Z',
  },
  {
    id: 'u6',
    name: 'Analyst',
    email: 'analyst@geowatch.local',
    role: 'viewer',
    active: true,
    avatarSeed: 'analyst',
    memberSince: '2024-05-30T09:00:00Z',
  },
];

function offset(iso, minutes) {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() + minutes);
  return d.toISOString();
}

export function findUser(idOrName) {
  if (!idOrName) return USERS[0];
  return (
    USERS.find((u) => u.id === idOrName) ||
    USERS.find((u) => u.name.toLowerCase() === String(idOrName).toLowerCase()) ||
    USERS[0]
  );
}

function actorIdForEvent(event, index) {
  const map = ['u1', 'u2', 'u3', 'u4', 'u2', 'u4'];
  return map[index % map.length];
}

function actorIdForNote(author) {
  if (author?.includes('Ops')) return 'u2';
  if (author?.includes('Station')) return 'u3';
  if (author?.includes('Media')) return 'u4';
  return 'u1';
}

export function generateAuditData(incident, events) {
  const logs = [];

  /* incident lifecycle */
  logs.push({
    id: 'log-inc-created',
    action: 'incident_created',
    targetType: 'incident',
    targetId: incident.id,
    targetLabel: incident.title,
    actorId: 'u1',
    timestamp: incident.createdAt,
    details: 'Incident record created from initial report.',
  });

  logs.push({
    id: 'log-inc-updated',
    action: 'incident_updated',
    targetType: 'incident',
    targetId: incident.id,
    targetLabel: incident.title,
    actorId: 'u1',
    timestamp: offset(incident.createdAt, 5),
    changed: ['severity', 'description'],
    details: 'Severity and description updated after first ground report.',
  });

  logs.push({
    id: 'log-verif-changed',
    action: 'verification_changed',
    targetType: 'incident',
    targetId: incident.id,
    targetLabel: incident.title,
    actorId: 'u1',
    timestamp: offset(incident.createdAt, 15),
    details: 'Verification set to verified based on official confirmation.',
  });

  /* per-update / per-source logs */
  events.forEach((event, idx) => {
    const actorId = actorIdForEvent(event, idx);

    logs.push({
      id: `log-tl-${event.id}`,
      action: 'timeline_added',
      targetType: 'timeline',
      targetId: event.id,
      targetLabel: event.summary,
      eventId: event.id,
      actorId,
      timestamp: event.timestamp,
      details: `Added as ${event.type === 'report' ? 'initial report' : 'update'}.`,
    });

    if (idx === 2 || idx === 4) {
      logs.push({
        id: `log-tl-edit-${event.id}`,
        action: 'timeline_updated',
        targetType: 'timeline',
        targetId: event.id,
        targetLabel: event.summary,
        eventId: event.id,
        actorId,
        timestamp: offset(event.timestamp, 8),
        changed: idx === 2 ? ['details'] : ['summary'],
        details: 'Post-publish edit.',
      });
    }

    let sourceCounter = 1;
    Object.entries(event.sources || {}).forEach(([sourceType, list]) => {
      list.forEach((item) => {
        const label =
          item.caption || item.title || item.author || item.text?.slice(0, 40) || 'Untitled';
        logs.push({
          id: `log-src-${event.id}-${item.id}`,
          action: 'source_added',
          targetType: sourceType,
          targetId: item.id,
          targetLabel: label,
          eventId: event.id,
          actorId: sourceType === 'admin_note' ? actorIdForNote(item.author) : actorId,
          timestamp: offset(event.timestamp, sourceCounter++),
          details: `${sourceType} added to update.`,
        });

        if (item.pinned) {
          logs.push({
            id: `log-pin-${event.id}-${item.id}`,
            action: 'source_pinned',
            targetType: sourceType,
            targetId: item.id,
            targetLabel: label,
            eventId: event.id,
            actorId: sourceType === 'admin_note' ? actorIdForNote(item.author) : actorId,
            timestamp: offset(event.timestamp, sourceCounter++ + 2),
            details: 'Pinned to top of category.',
          });
        }
      });
    });
  });

  /* access change */
  logs.push({
    id: 'log-access',
    action: 'access_changed',
    targetType: 'incident',
    targetId: incident.id,
    targetLabel: incident.title,
    actorId: 'u1',
    timestamp: offset(incident.createdAt, 20),
    details: 'Added Ops Desk and Station Commander as admins.',
  });

  /* login noise for users */
  USERS.forEach((u, i) => {
    logs.push({
      id: `log-login-${u.id}`,
      action: 'admin_login',
      targetType: 'session',
      targetId: u.id,
      targetLabel: u.name,
      actorId: u.id,
      timestamp: offset(incident.createdAt, -30 - i * 5),
      details: 'Session started.',
    });
  });

  logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const usersWithActivity = USERS.map((u) => {
    const activity = logs.filter((l) => l.actorId === u.id);
    return {
      ...u,
      activity,
      stats: {
        incidentsCreated: activity.filter((l) => l.action === 'incident_created').length,
        resolved: activity.filter((l) => l.action === 'incident_resolved').length,
        sourcesAdded: activity.filter((l) => l.action === 'source_added').length,
        timelineUpdates: activity.filter(
          (l) => l.action === 'timeline_added' || l.action === 'timeline_updated'
        ).length,
        auditEntries: activity.length,
      },
    };
  });

  return { logs, users: usersWithActivity };
}

function ActivityRow({ log, onUserClick }) {
  const meta = ACTION_META[log.action] || ACTION_META.admin_login;
  const user = findUser(log.actorId);
  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        padding: '12px 0',
        borderBottom: '1px solid var(--border-subtle)',
        fontSize: 13,
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `${meta.color}1a`,
          color: meta.color,
          fontSize: 12,
          flexShrink: 0,
        }}
      >
        {meta.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: 'var(--text-primary)', fontWeight: 700, marginBottom: 2 }}>
          {meta.label}
          {log.changed && (
            <span style={{ color: 'var(--text-muted)', fontWeight: 500, marginLeft: 6 }}>
              · {log.changed.join(', ')}
            </span>
          )}
        </div>
        <div style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>{log.targetLabel}</div>
        <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4 }}>
          <button
            type="button"
            onClick={() => onUserClick?.(user.id)}
            style={{
              background: 'transparent',
              border: 'none',
              padding: 0,
              color: 'var(--accent-light)',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {user.name}
          </button>{' '}
          · {formatDate(log.timestamp)} · {formatTime(log.timestamp)} · {relativeTime(log.timestamp)}
        </div>
        {log.details && (
          <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>{log.details}</div>
        )}
      </div>
    </div>
  );
}

export function Drawer({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          zIndex: 10500,
        }}
        onClick={onClose}
      />
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 'min(520px, 92vw)',
          background: 'var(--bg-elevated)',
          borderLeft: '1px solid var(--border-subtle)',
          zIndex: 10501,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>{title}</div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            {Icons.x}
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>{children}</div>
      </div>
    </>
  );
}

export function AuditLogPanel({ incident, events, onUserClick }) {
  const { logs } = useMemo(() => generateAuditData(incident, events), [incident, events]);
  const [expandedEventId, setExpandedEventId] = useState(null);

  const statusLogs = logs.filter((l) =>
    ['incident_created', 'incident_updated', 'verification_changed', 'access_changed'].includes(
      l.action
    )
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div
        style={{
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 14,
          padding: 16,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12, letterSpacing: '0.05em' }}>
          Incident metadata
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px', fontSize: 12 }}>
          <Meta label="Incident ID" value={incident.id} />
          <Meta label="Created by" value={<ActorLink id="u1" onUserClick={onUserClick} />} />
          <Meta label="Created at" value={`${formatDate(incident.createdAt)} · ${formatTime(incident.createdAt)}`} />
          <Meta label="Updated at" value={`${formatDate(incident.createdAt)} · ${formatTime(incident.createdAt)}`} />
          <Meta label="Category" value={incident.category} />
          <Meta label="Category ID" value="cat-148" />
          <Meta label="Zone category ID" value="zone-av-09" />
          <Meta label="Verification override" value="none" />
        </div>
      </div>

      <div
        style={{
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 14,
          padding: 16,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12, letterSpacing: '0.05em' }}>
          Status history ({statusLogs.length})
        </div>
        {statusLogs.map((log) => (
          <ActivityRow key={log.id} log={log} onUserClick={onUserClick} />
        ))}
      </div>

      <div
        style={{
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 14,
          padding: 16,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12, letterSpacing: '0.05em' }}>
          Per-update activity
        </div>
        {events.map((event) => {
          const eventLogs = logs.filter((l) => l.eventId === event.id);
          const open = expandedEventId === event.id;
          return (
            <div key={event.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <button
                type="button"
                onClick={() => setExpandedEventId(open ? null : event.id)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  background: 'transparent',
                  border: 'none',
                  padding: '10px 0',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span>{event.summary}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                  {eventLogs.length} entries {open ? '▲' : '▼'}
                </span>
              </button>
              {open && eventLogs.map((log) => <ActivityRow key={log.id} log={log} onUserClick={onUserClick} />)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Meta({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em', marginBottom: 3 }}>{label}</div>
      <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function ActorLink({ id, onUserClick }) {
  const user = findUser(id);
  return (
    <button
      type="button"
      onClick={() => onUserClick?.(id)}
      style={{ background: 'transparent', border: 'none', padding: 0, color: 'var(--accent-light)', fontWeight: 700, cursor: 'pointer' }}
    >
      {user.name}
    </button>
  );
}

export function UserProfileDrawer({ userId, onClose }) {
  const user = useMemo(() => {
    const u = USERS.find((x) => x.id === userId) || USERS[0];
    const allLogs = generateAuditData(
      { id: 'inc-001', title: 'IAF AN-32 crashes in Assam, India', createdAt: '2026-06-13T21:01:00Z' },
      []
    ).logs;
    const activity = allLogs.filter((l) => l.actorId === u.id);
    /* add some unrelated demo activity so it looks like a real profile */
    activity.push({
      id: `demo-other-${u.id}`,
      action: 'incident_created',
      targetType: 'incident',
      targetId: 'inc-OTHER',
      targetLabel: 'Factory fire in Gujarat',
      actorId: u.id,
      timestamp: '2026-06-10T14:22:00Z',
      details: 'Other incident created by this user.',
    });
    activity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return { ...u, activity };
  }, [userId]);

  const [tab, setTab] = useState('overview');

  return (
    <Drawer open onClose={onClose} title="User profile">
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <img
          src={`https://picsum.photos/seed/${user.avatarSeed}/120/120`}
          alt={user.name}
          style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', marginBottom: 12 }}
        />
        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>{user.name}</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>{user.email}</div>
        <Badge color={user.role === 'superadmin' ? '#f472b6' : user.role === 'admin' ? '#a78bfa' : '#94a3b8'} bg={`${user.role === 'superadmin' ? '#f472b6' : user.role === 'admin' ? '#a78bfa' : '#94a3b8'}1a`}>
          {user.role}
        </Badge>
        <span style={{ marginLeft: 8, fontSize: 12, color: user.active ? '#4ade80' : '#ef4444', fontWeight: 700 }}>
          {user.active ? 'Active' : 'Inactive'}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, borderBottom: '1px solid var(--border-subtle)' }}>
        <TabButton active={tab === 'overview'} onClick={() => setTab('overview')}>Overview</TabButton>
        <TabButton active={tab === 'activity'} onClick={() => setTab('activity')}>Activity</TabButton>
      </div>

      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <StatBox label="Incidents created" value={user.stats?.incidentsCreated ?? 1} />
          <StatBox label="Resolved" value={user.stats?.resolved ?? 0} />
          <StatBox label="Sources added" value={user.stats?.sourcesAdded ?? 0} />
          <StatBox label="Timeline updates" value={user.stats?.timelineUpdates ?? 0} />
          <StatBox label="Audit entries" value={user.stats?.auditEntries ?? user.activity.length} />
          <StatBox label="Member since" value={formatDate(user.memberSince)} />
        </div>
      )}

      {tab === 'activity' && (
        <div>
          {user.activity.map((log) => (
            <ActivityRow key={log.id} log={log} />
          ))}
        </div>
      )}
    </Drawer>
  );
}

function TabButton({ children, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '8px 12px',
        background: 'transparent',
        border: 'none',
        borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
        color: active ? 'var(--text-primary)' : 'var(--text-muted)',
        fontSize: 13,
        fontWeight: 700,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

function StatBox({ label, value }) {
  return (
    <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 14 }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>{label}</div>
    </div>
  );
}
