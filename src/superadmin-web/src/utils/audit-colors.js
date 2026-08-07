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
  source_pinned: '#f59e0b',
  source_unpinned: '#f59e0b',
  source_archived: '#6366f1',
  source_unarchived: '#6366f1',

  timeline_added: '#22c55e',
  timeline_updated: '#f59e0b',
  timeline_deleted: '#ef4444',
  timeline_featured_set: '#f59e0b',
  timeline_featured_cleared: '#f59e0b',

  media_uploaded: '#22c55e',
  media_deleted: '#ef4444',
  media_pinned: '#f59e0b',
  media_unpinned: '#f59e0b',
  media_caption_updated: '#f59e0b',
  media_linked_to_update: '#f59e0b',

  incident_hero_image_updated: '#f59e0b',

  zone_created: '#22c55e',
  zone_updated: '#f59e0b',
  zone_deleted: '#ef4444',

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
  source_pinned: 'Pinned',
  source_unpinned: 'Unpinned',
  source_archived: 'Archived',
  source_unarchived: 'Unarchived',

  timeline_added: 'Added',
  timeline_updated: 'Updated',
  timeline_deleted: 'Deleted',
  timeline_featured_set: 'Featured Set',
  timeline_featured_cleared: 'Featured Cleared',

  media_uploaded: 'Uploaded',
  media_deleted: 'Deleted',
  media_pinned: 'Pinned',
  media_unpinned: 'Unpinned',
  media_caption_updated: 'Caption Updated',
  media_linked_to_update: 'Linked to Update',

  incident_hero_image_updated: 'Hero Image Updated',

  zone_created: 'Created',
  zone_updated: 'Updated',
  zone_deleted: 'Deleted',

  export_incidents: 'Export',
  export_sources: 'Export',
  export_users: 'Export',
  export_audit: 'Export',

  setting_updated: 'Updated',
};

const AUDIT_ACTION_BADGE_VARS = {
  user_login: 'purple',
  user_created: 'green',
  user_updated: 'amber',
  user_deactivated: 'red',
  user_deleted: 'red',
  user_activated: 'green',
  user_password_reset: 'amber',

  public_user_login: 'purple',
  public_user_banned: 'red',
  public_user_unbanned: 'green',
  public_user_incident_saved: 'green',
  public_user_incident_unsaved: 'amber',
  public_user_incident_viewed: 'purple',

  incident_created: 'green',
  incident_updated: 'amber',
  incident_resolved: 'blue',
  incident_deleted: 'red',
  incident_restored: 'green',
  incident_purged: 'red',

  source_added: 'green',
  source_updated: 'amber',
  source_deleted: 'red',
  source_pinned: 'amber',
  source_unpinned: 'amber',
  source_archived: 'blue',
  source_unarchived: 'blue',

  timeline_added: 'green',
  timeline_updated: 'amber',
  timeline_deleted: 'red',
  timeline_featured_set: 'amber',
  timeline_featured_cleared: 'amber',

  media_uploaded: 'green',
  media_deleted: 'red',
  media_pinned: 'amber',
  media_unpinned: 'amber',
  media_caption_updated: 'amber',
  media_linked_to_update: 'amber',

  incident_hero_image_updated: 'amber',

  zone_created: 'green',
  zone_updated: 'amber',
  zone_deleted: 'red',

  export_incidents: 'blue',
  export_sources: 'blue',
  export_users: 'blue',
  export_audit: 'blue',

  setting_updated: 'amber',
};

export function getAuditActionColor(action) {
  return AUDIT_ACTION_COLORS[action] || 'var(--text-muted)';
}

export function getAuditActionBadgeVars(action) {
  return AUDIT_ACTION_BADGE_VARS[action] || 'gray';
}

export function getAuditActionShortLabel(action) {
  return AUDIT_ACTION_LABELS[action] || action.replace(/_/g, ' ');
}
