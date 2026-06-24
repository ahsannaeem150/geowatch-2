import React, { useEffect, useRef } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import {
  LogIn,
  UserPlus,
  UserCog,
  UserX,
  UserCheck,
  UserMinus,
  KeyRound,
  FilePlus,
  Pencil,
  CheckCircle,
  Trash2,
  RotateCcw,
  Link,
  Unlink,
  Clock,
  Download,
  Settings,
  Bookmark,
  BookmarkX,
  Eye,
  ShieldAlert,
  ShieldCheck,
  Activity,
} from 'lucide-react';
import { getAuditActionColor, getAuditActionShortLabel } from '../../utils/audit-colors.js';

const ACTION_ICONS = {
  user_login: LogIn,
  user_created: UserPlus,
  user_updated: UserCog,
  user_deactivated: UserX,
  user_activated: UserCheck,
  user_deleted: UserMinus,
  user_password_reset: KeyRound,

  public_user_login: LogIn,
  public_user_banned: ShieldAlert,
  public_user_unbanned: ShieldCheck,
  public_user_incident_saved: Bookmark,
  public_user_incident_unsaved: BookmarkX,
  public_user_incident_viewed: Eye,

  incident_created: FilePlus,
  incident_updated: Pencil,
  incident_resolved: CheckCircle,
  incident_deleted: Trash2,
  incident_restored: RotateCcw,
  incident_purged: Trash2,

  source_added: Link,
  source_updated: Pencil,
  source_deleted: Unlink,

  timeline_added: Clock,
  timeline_updated: Clock,
  timeline_deleted: Clock,

  export_incidents: Download,
  export_sources: Download,
  export_users: Download,
  export_audit: Download,

  setting_updated: Settings,
};

function getIncidentLocationBadge(log) {
  if (log.target_type !== 'incident') return null;
  const status = log.incident_status;
  if (status === 'active' || status === 'resolved') {
    return { label: 'Map', color: 'var(--badge-green-text)', bg: 'var(--badge-green-bg)' };
  }
  if (status === 'hidden') {
    return { label: 'Recycle Bin', color: 'var(--badge-amber-text)', bg: 'var(--badge-amber-bg)' };
  }
  return { label: 'Deleted', color: 'var(--badge-red-text)', bg: 'var(--badge-red-bg)' };
}

function getActivityDescription(log) {
  const label = getAuditActionShortLabel(log.action);
  let details = {};
  if (typeof log.details === 'string') {
    try {
      details = JSON.parse(log.details);
    } catch {
      details = {};
    }
  } else if (log.details && typeof log.details === 'object') {
    details = log.details;
  }
  const targetTitle = details.title || details.fullName || details.email || '';

  if (targetTitle) {
    return `${label} — ${targetTitle}`;
  }
  if (log.target_type) {
    return `${label} — ${log.target_type}`;
  }
  return label;
}

function buildIncidentLink(log, actorName, returnToValue, staffUserId, publicUserId) {
  if (!log.target_id || log.target_type !== 'incident') return null;
  const params = new URLSearchParams();
  params.set('incident', log.target_id);
  params.set('ref', 'activity');
  if (actorName) params.set('actor', actorName);
  if (returnToValue) params.set('returnTo', returnToValue);
  if (staffUserId) params.set('staffUserId', staffUserId);
  if (publicUserId) params.set('publicUserId', publicUserId);
  return `/superadmin/map?${params.toString()}`;
}

export default function ActivityTimeline({
  logs,
  loading,
  emptyMessage = 'No activity yet',
  actorName,
  returnPath,
  getReturnTo,
  staffUserId,
  publicUserId,
  onIncidentClick,
  selectedIncidentId,
}) {
  const rootRef = useRef(null);

  useEffect(() => {
    if (!selectedIncidentId || !rootRef.current) return;
    const selectedEl = rootRef.current.querySelector(`[data-target-id="${selectedIncidentId}"]`);
    if (selectedEl) {
      selectedEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedIncidentId, logs]);

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 0',
          color: 'var(--text-muted)',
          gap: 8,
        }}
      >
        <Activity size={18} style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: 13 }}>Loading activity…</span>
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '40px 0',
          color: 'var(--text-muted)',
          fontSize: 13,
        }}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div ref={rootRef} style={{ display: 'flex', flexDirection: 'column' }}>
      {logs.map((log, index) => {
        const Icon = ACTION_ICONS[log.action] || Activity;
        const color = getAuditActionColor(log.action);
        const isLast = index === logs.length - 1;
        const incidentLink = buildIncidentLink(log, actorName, returnPath, staffUserId, publicUserId);
        const isSelected = selectedIncidentId && log.target_id === selectedIncidentId;

        return (
          <div key={log.id} data-target-id={log.target_id} style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
            {/* Timeline pillar: dot + line */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: 32,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: `${color}18`,
                  border: `2px solid ${color}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Icon size={12} style={{ color }} />
              </div>
              {!isLast && (
                <div
                  style={{
                    flex: 1,
                    width: 2,
                    background: 'var(--border-subtle)',
                    marginTop: 4,
                    minHeight: 20,
                  }}
                />
              )}
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0, paddingBottom: isLast ? 0 : 16 }}>
              {incidentLink ? (
                <ClickableItem
                  link={incidentLink}
                  log={log}
                  actorName={actorName}
                  staffUserId={staffUserId}
                  publicUserId={publicUserId}
                  returnPath={returnPath}
                  getReturnTo={getReturnTo}
                  isSelected={isSelected}
                  onIncidentClick={onIncidentClick}
                >
                  <TimelineItemContent log={log} />
                </ClickableItem>
              ) : (
                <div style={{ padding: 8 }}>
                  <TimelineItemContent log={log} />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ClickableItem({ link, log, actorName, staffUserId, publicUserId, returnPath, getReturnTo, isSelected, onIncidentClick, children }) {
  const navigate = useNavigate();
  const baseStyle = {
    display: 'block',
    width: '100%',
    padding: 8,
    borderRadius: 'var(--radius-sm)',
    textDecoration: 'none',
    border: 'none',
    background: isSelected ? 'var(--bg-hover)' : 'transparent',
    textAlign: 'left',
    fontFamily: 'inherit',
    color: 'inherit',
    cursor: 'pointer',
    transition: 'background 0.15s ease',
  };

  const handleMouseEnter = (e) => {
    if (!isSelected) e.currentTarget.style.background = 'var(--bg-hover)';
  };
  const handleMouseLeave = (e) => {
    e.currentTarget.style.background = isSelected ? 'var(--bg-hover)' : 'transparent';
  };

  if (onIncidentClick) {
    return (
      <button
        type="button"
        onClick={() => onIncidentClick(log)}
        style={baseStyle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </button>
    );
  }

  if (getReturnTo) {
    return (
      <button
        type="button"
        onClick={() => {
          const returnToValue = getReturnTo();
          navigate(buildIncidentLink(log, actorName, returnToValue, staffUserId, publicUserId));
        }}
        style={baseStyle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </button>
    );
  }

  return (
    <RouterLink
      to={link}
      style={baseStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </RouterLink>
  );
}

function TimelineItemContent({ log }) {
  const badge = getIncidentLocationBadge(log);
  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text-primary)',
            lineHeight: 1.4,
            wordBreak: 'break-word',
            flex: 1,
            minWidth: 0,
          }}
        >
          {getActivityDescription(log)}
        </div>
        {badge && (
          <span
            style={{
              flexShrink: 0,
              fontSize: 10,
              fontWeight: 700,
              color: badge.color,
              background: badge.bg,
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm)',
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
              whiteSpace: 'nowrap',
            }}
          >
            {badge.label}
          </span>
        )}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
      </div>
      {log.target_id && (
        <div
          style={{
            fontSize: 11,
            color: 'var(--text-secondary)',
            marginTop: 2,
            fontFamily: 'var(--font-mono)',
          }}
        >
          {log.target_type} · {log.target_id.slice(0, 8)}…
        </div>
      )}
    </>
  );
}
