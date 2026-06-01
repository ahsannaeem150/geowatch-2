import React from 'react';
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

function getActivityDescription(log) {
  const label = getAuditActionShortLabel(log.action);
  const details = typeof log.details === 'string' ? JSON.parse(log.details) : (log.details || {});
  const targetTitle = details.title || details.fullName || details.email || '';

  if (targetTitle) {
    return `${label} — ${targetTitle}`;
  }
  if (log.target_type) {
    return `${label} — ${log.target_type}`;
  }
  return label;
}

export default function ActivityTimeline({ logs, loading, emptyMessage = 'No activity yet' }) {
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
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {logs.map((log, index) => {
        const Icon = ACTION_ICONS[log.action] || Activity;
        const color = getAuditActionColor(log.action);
        const isLast = index === logs.length - 1;

        return (
          <div key={log.id} style={{ display: 'flex', gap: 12 }}>
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
            <div style={{ flex: 1, paddingBottom: isLast ? 0 : 18, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  lineHeight: 1.4,
                  wordBreak: 'break-word',
                }}
              >
                {getActivityDescription(log)}
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
            </div>
          </div>
        );
      })}
    </div>
  );
}
