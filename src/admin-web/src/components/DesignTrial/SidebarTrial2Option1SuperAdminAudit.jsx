import React, { useEffect, useMemo, useState } from 'react';
import { formatDate, formatTime, relativeTime, Icons, Badge, INCIDENT, TIMELINE } from './SidebarTrialShared.jsx';

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
    newValue: 'verified',
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
        let label;
        if (sourceType === 'x_post') {
          label = `${item.author} — ${item.text?.slice(0, 60) || ''}`.trim();
        } else if (sourceType === 'admin_note') {
          label = item.text?.slice(0, 80) || 'Admin note';
        } else {
          label = item.caption || item.title || item.author || item.text?.slice(0, 40) || 'Untitled';
        }
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

function typeName(type, withArticle = false) {
  const map = { media: 'image', x_post: 'post', news_article: 'article', admin_note: 'note' };
  const name = map[type] || type;
  if (!withArticle) return name;
  return ['image', 'article'].includes(name) ? `an ${name}` : `a ${name}`;
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function humanizeLog(log) {
  switch (log.action) {
    case 'incident_created':
      return { title: 'Incident created', subtitle: log.details };
    case 'incident_updated':
      return {
        title: `Edited ${log.changed?.map((c) => c.toLowerCase()).join(', ')}`,
        subtitle: log.details,
      };
    case 'verification_changed':
      return {
        title: `Verification changed to ${log.newValue || 'verified'}`,
        subtitle: log.details,
      };
    case 'timeline_added':
      return {
        title: 'Added this update',
        subtitle: log.details,
      };
    case 'timeline_updated':
      return {
        title: `Edited this update · ${log.changed?.map((c) => c.toLowerCase()).join(', ')}`,
        subtitle: log.details,
      };
    case 'source_added':
      return {
        title: `Added ${typeName(log.targetType, true)}`,
        subtitle: log.targetLabel,
      };
    case 'source_updated':
      return {
        title: `Edited ${typeName(log.targetType, true)}`,
        subtitle: log.targetLabel,
      };
    case 'source_pinned':
      return {
        title: `Pinned ${typeName(log.targetType, true)}`,
        subtitle: log.targetLabel,
      };
    case 'source_deleted':
      return {
        title: `Deleted ${typeName(log.targetType, true)}`,
        subtitle: log.targetLabel,
      };
    case 'access_changed':
      return { title: 'Access changed', subtitle: log.details };
    case 'admin_login':
      return { title: 'Logged in', subtitle: log.details };
    default:
      return { title: capitalize(log.action.replace(/_/g, ' ')), subtitle: log.targetLabel };
  }
}

function ActivityRow({ log, onUserClick, compact = false }) {
  const meta = ACTION_META[log.action] || ACTION_META.admin_login;
  const user = findUser(log.actorId);
  const { title, subtitle } = humanizeLog(log);

  return (
    <div
      style={{
        display: 'flex',
        gap: compact ? 8 : 12,
        padding: compact ? 10 : 14,
        marginBottom: compact ? 6 : 8,
        background: 'var(--bg-primary)',
        border: '1px solid var(--border-subtle)',
        borderLeft: `3px solid ${meta.color}`,
        borderRadius: 12,
        fontSize: compact ? 12 : 13,
      }}
    >
      <div
        style={{
          width: compact ? 22 : 28,
          height: compact ? 22 : 28,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `${meta.color}1a`,
          color: meta.color,
          fontSize: compact ? 10 : 12,
          flexShrink: 0,
          marginTop: 2,
        }}
      >
        {meta.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            color: 'var(--text-primary)',
            fontWeight: 700,
            marginBottom: 2,
            lineHeight: 1.35,
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div
            style={{
              color: 'var(--text-secondary)',
              lineHeight: 1.5,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: compact ? 'nowrap' : undefined,
              marginBottom: 4,
            }}
          >
            {subtitle}
          </div>
        )}
        <div style={{ color: 'var(--text-muted)', fontSize: compact ? 10 : 11 }}>
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
      </div>
    </div>
  );
}

const drawerStack = [];
let drawerId = 0;

function useDrawerLayer(open) {
  const [id] = useState(() => ++drawerId);
  useEffect(() => {
    if (!open) return;
    drawerStack.push(id);
    return () => {
      const idx = drawerStack.indexOf(id);
      if (idx >= 0) drawerStack.splice(idx, 1);
    };
  }, [open, id]);
  return open && drawerStack[drawerStack.length - 1] === id;
}

export function Drawer({ open, onClose, title, children, zIndex = 10500 }) {
  const isTopLayer = useDrawerLayer(open);

  useEffect(() => {
    if (!open || !isTopLayer) return;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      /* Don't close if a modal/dialog is currently open above us */
      if (document.querySelector('[role="dialog"]')) return;
      e.preventDefault();
      onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, isTopLayer, onClose]);

  if (!open) return null;
  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          zIndex,
        }}
        onClick={onClose}
      />
      <div
        data-drawer="true"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 'min(520px, 92vw)',
          background: 'var(--bg-elevated)',
          borderLeft: '1px solid var(--border-subtle)',
          zIndex: zIndex + 1,
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

export function AuditLogPanel({ incident, events, onUserClick, compact = false }) {
  const { logs } = useMemo(() => generateAuditData(incident, events), [incident, events]);
  const [expandedEventId, setExpandedEventId] = useState(null);

  const statusLogs = logs.filter((l) =>
    ['incident_created', 'incident_updated', 'verification_changed', 'access_changed'].includes(
      l.action
    )
  );

  const sectionBase = {
    background: 'var(--bg-primary)',
    border: '1px solid var(--border-subtle)',
    borderRadius: compact ? 12 : 14,
    padding: compact ? 12 : 16,
  };
  const sectionTitle = {
    fontSize: compact ? 11 : 12,
    fontWeight: 800,
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
    marginBottom: compact ? 8 : 12,
    letterSpacing: '0.05em',
  };

  const creator = findUser('u1');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 12 : 18 }}>
      {!compact && (
        <div
          style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 14,
            padding: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--accent)',
              color: '#fff',
              fontSize: 18,
              flexShrink: 0,
            }}
          >
            📋
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 2 }}>
              {logs.length} audit entries
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Created by{' '}
              <button
                type="button"
                onClick={() => onUserClick?.(creator.id)}
                style={{ background: 'transparent', border: 'none', padding: 0, color: 'var(--accent-light)', fontWeight: 700, cursor: 'pointer' }}
              >
                {creator.name}
              </button>{' '}
              · {formatDate(incident.createdAt)} · {formatTime(incident.createdAt)}
            </div>
          </div>
        </div>
      )}

      <div style={sectionBase}>
        <div style={sectionTitle}>Incident metadata</div>
        <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '1fr 1fr', gap: compact ? '8px 10px' : '10px 16px', fontSize: compact ? 11 : 12 }}>
          <Meta label="Incident ID" value={incident.id} compact={compact} />
          <Meta label="Created by" value={<ActorLink id="u1" onUserClick={onUserClick} />} compact={compact} />
          <Meta label="Created at" value={`${formatDate(incident.createdAt)} · ${formatTime(incident.createdAt)}`} compact={compact} />
          <Meta label="Updated at" value={`${formatDate(incident.createdAt)} · ${formatTime(incident.createdAt)}`} compact={compact} />
          <Meta label="Category" value={incident.category} compact={compact} />
          <Meta label="Category ID" value="cat-148" compact={compact} />
          <Meta label="Zone category ID" value="zone-av-09" compact={compact} />
          <Meta label="Verification override" value="none" compact={compact} />
        </div>
      </div>

      <div style={sectionBase}>
        <div style={sectionTitle}>Status history ({statusLogs.length})</div>
        {statusLogs.map((log) => (
          <ActivityRow key={log.id} log={log} onUserClick={onUserClick} compact={compact} />
        ))}
      </div>

      <div style={sectionBase}>
        <div style={sectionTitle}>Per-update activity</div>
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
                  padding: compact ? '8px 0' : '10px 0',
                  color: 'var(--text-primary)',
                  fontSize: compact ? 12 : 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>
                  {event.summary}
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: 11, flexShrink: 0 }}>
                  {eventLogs.length} {open ? '▲' : '▼'}
                </span>
              </button>
              {open && eventLogs.map((log) => <ActivityRow key={log.id} log={log} onUserClick={onUserClick} compact={compact} />)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Meta({ label, value, compact = false }) {
  return (
    <div style={{ overflow: 'hidden' }}>
      <div style={{ fontSize: compact ? 9 : 10, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em', marginBottom: compact ? 1 : 3 }}>{label}</div>
      <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: compact ? 11 : 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: compact ? 'nowrap' : undefined }}>{value}</div>
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

export function UserProfileDrawer({ userId, onClose, zIndex }) {
  const user = useMemo(() => {
    const all = generateAuditData(INCIDENT, TIMELINE);
    const base = all.users.find((u) => u.id === userId) || USERS[0];
    const activity = [...base.activity];
    /* add some unrelated demo activity so it looks like a real profile */
    activity.push({
      id: `demo-other-${base.id}`,
      action: 'incident_created',
      targetType: 'incident',
      targetId: 'inc-OTHER',
      targetLabel: 'Factory fire in Gujarat',
      actorId: base.id,
      timestamp: '2026-06-10T14:22:00Z',
      details: 'Other incident created by this user.',
    });
    activity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return { ...base, activity };
  }, [userId]);

  const [tab, setTab] = useState('overview');

  const roleColor = user.role === 'superadmin' ? '#f472b6' : user.role === 'admin' ? '#a78bfa' : '#94a3b8';

  return (
    <Drawer open onClose={onClose} title="User profile" zIndex={zIndex}>
      <div
        style={{
          textAlign: 'center',
          marginBottom: 20,
          padding: '18px 14px',
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 16,
        }}
      >
        <img
          src={`https://picsum.photos/seed/${user.avatarSeed}/120/120`}
          alt={user.name}
          style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', marginBottom: 12, border: `2px solid ${roleColor}55` }}
        />
        <div style={{ fontSize: 19, fontWeight: 800, color: 'var(--text-primary)' }}>{user.name}</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>{user.email}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Badge color={roleColor} bg={`${roleColor}1a`}>
            {user.role}
          </Badge>
          <Badge color={user.active ? '#4ade80' : '#ef4444'} bg={user.active ? 'rgba(74,222,128,0.12)' : 'rgba(239,68,68,0.12)'}>
            {user.active ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, borderBottom: '1px solid var(--border-subtle)' }}>
        <TabButton active={tab === 'overview'} onClick={() => setTab('overview')}>Overview</TabButton>
        <TabButton active={tab === 'activity'} onClick={() => setTab('activity')}>Activity</TabButton>
      </div>

      {tab === 'overview' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
            <StatBox label="Created" value={user.stats.incidentsCreated} />
            <StatBox label="Resolved" value={user.stats.resolved} />
            <StatBox label="Sources" value={user.stats.sourcesAdded} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            <StatBox label="Timeline updates" value={user.stats.timelineUpdates} />
            <StatBox label="Audit entries" value={user.stats.auditEntries} />
            <StatBox label="Member since" value={formatDate(user.memberSince)} />
            <StatBox label="Last active" value={relativeTime(user.memberSince)} />
          </div>
        </>
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
