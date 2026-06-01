/**
 * Audit action color mapping — mirrors backend AUDIT_ACTION_COLORS
 * Used consistently across Dashboard, Audit Log, and any audit display
 */

export const AUDIT_ACTION_COLORS = {
  user_login: '#6366f1',
  user_created: '#22c55e',
  user_updated: '#f59e0b',
  user_deactivated: '#ef4444',
  user_deleted: '#7f1d1d',
  user_activated: '#22c55e',
  user_password_reset: '#f59e0b',

  public_user_login: '#6366f1',
  public_user_banned: '#ef4444',
  public_user_unbanned: '#22c55e',
  public_user_incident_saved: '#22c55e',
  public_user_incident_unsaved: '#f59e0b',
  public_user_incident_viewed: '#8b5cf6',

  incident_created: '#22c55e',
  incident_updated: '#f59e0b',
  incident_resolved: '#6366f1',
  incident_deleted: '#ef4444',
  incident_restored: '#22c55e',
  incident_purged: '#7f1d1d',

  source_added: '#22c55e',
  source_updated: '#f59e0b',
  source_deleted: '#ef4444',

  timeline_added: '#22c55e',
  timeline_updated: '#f59e0b',
  timeline_deleted: '#ef4444',

  export_incidents: '#6366f1',
  export_sources: '#6366f1',
  export_users: '#6366f1',
  export_audit: '#6366f1',

  setting_updated: '#f59e0b',
};

export const AUDIT_ACTION_LABELS = {
  user_login: 'Login',
  user_created: 'Created',
  user_updated: 'Updated',
  user_deactivated: 'Deactivated',
  user_deleted: 'Deleted',
  user_activated: 'Activated',
  user_password_reset: 'Password Reset',

  public_user_login: 'Login',
  public_user_banned: 'Banned',
  public_user_unbanned: 'Unbanned',
  public_user_incident_saved: 'Saved',
  public_user_incident_unsaved: 'Unsaved',
  public_user_incident_viewed: 'Viewed',

  incident_created: 'Created',
  incident_updated: 'Updated',
  incident_resolved: 'Resolved',
  incident_deleted: 'Deleted',
  incident_restored: 'Restored',
  incident_purged: 'Purged',

  source_added: 'Added',
  source_updated: 'Updated',
  source_deleted: 'Deleted',

  timeline_added: 'Added',
  timeline_updated: 'Updated',
  timeline_deleted: 'Deleted',

  export_incidents: 'Export',
  export_sources: 'Export',
  export_users: 'Export',
  export_audit: 'Export',

  setting_updated: 'Updated',
};

export function getAuditActionColor(action) {
  return AUDIT_ACTION_COLORS[action] || 'var(--text-muted)';
}

export function getAuditActionShortLabel(action) {
  return AUDIT_ACTION_LABELS[action] || action.replace(/_/g, ' ');
}
