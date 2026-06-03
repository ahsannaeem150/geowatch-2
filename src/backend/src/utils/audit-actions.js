/**
 * Audit Action Constants
 * Every mutating operation in the platform must use one of these actions.
 * This ensures consistency in the audit log and enables reliable filtering.
 *
 * Action prefixes:
 *   user_*     — user lifecycle events
 *   incident_* — incident CRUD and state changes
 *   source_*   — source attachments and verification
 *   timeline_* — timeline entry operations
 *   export_*   — data export operations
 *   setting_*  — platform configuration changes
 */

export const AUDIT_ACTIONS = {
  // User lifecycle
  USER_LOGIN: 'user_login',
  USER_CREATED: 'user_created',
  USER_UPDATED: 'user_updated',
  USER_DEACTIVATED: 'user_deactivated',
  USER_DELETED: 'user_deleted',
  USER_ACTIVATED: 'user_activated',
  USER_PASSWORD_RESET: 'user_password_reset',

  // Public user lifecycle
  PUBLIC_USER_LOGIN: 'public_user_login',
  PUBLIC_USER_BANNED: 'public_user_banned',
  PUBLIC_USER_UNBANNED: 'public_user_unbanned',

  // Public user behavior (user realm)
  PUBLIC_USER_INCIDENT_SAVED: 'public_user_incident_saved',
  PUBLIC_USER_INCIDENT_UNSAVED: 'public_user_incident_unsaved',
  PUBLIC_USER_INCIDENT_VIEWED: 'public_user_incident_viewed',

  // Incident lifecycle
  INCIDENT_CREATED: 'incident_created',
  INCIDENT_UPDATED: 'incident_updated',
  INCIDENT_RESOLVED: 'incident_resolved',
  INCIDENT_DELETED: 'incident_deleted',
  INCIDENT_RESTORED: 'incident_restored',
  INCIDENT_PURGED: 'incident_purged',

  // Source operations
  SOURCE_ADDED: 'source_added',
  SOURCE_UPDATED: 'source_updated',
  SOURCE_DELETED: 'source_deleted',

  // Timeline operations
  TIMELINE_ADDED: 'timeline_added',
  TIMELINE_UPDATED: 'timeline_updated',
  TIMELINE_DELETED: 'timeline_deleted',

  // Zone operations
  ZONE_CREATED: 'zone_created',
  ZONE_UPDATED: 'zone_updated',
  ZONE_DELETED: 'zone_deleted',

  // Data export
  EXPORT_INCIDENTS: 'export_incidents',
  EXPORT_SOURCES: 'export_sources',
  EXPORT_USERS: 'export_users',
  EXPORT_AUDIT: 'export_audit',

  // System settings
  SETTING_UPDATED: 'setting_updated',
};

/**
 * Human-readable labels for each audit action.
 * Used in the superadmin audit log UI.
 */
export const AUDIT_ACTION_LABELS = {
  [AUDIT_ACTIONS.USER_LOGIN]: 'User Login',
  [AUDIT_ACTIONS.USER_CREATED]: 'User Created',
  [AUDIT_ACTIONS.USER_UPDATED]: 'User Updated',
  [AUDIT_ACTIONS.USER_DEACTIVATED]: 'User Deactivated',
  [AUDIT_ACTIONS.USER_DELETED]: 'User Deleted',
  [AUDIT_ACTIONS.USER_ACTIVATED]: 'User Activated',
  [AUDIT_ACTIONS.USER_PASSWORD_RESET]: 'Password Reset',

  [AUDIT_ACTIONS.PUBLIC_USER_LOGIN]: 'Public User Login',
  [AUDIT_ACTIONS.PUBLIC_USER_BANNED]: 'Public User Banned',
  [AUDIT_ACTIONS.PUBLIC_USER_UNBANNED]: 'Public User Unbanned',

  [AUDIT_ACTIONS.PUBLIC_USER_INCIDENT_SAVED]: 'Incident Saved',
  [AUDIT_ACTIONS.PUBLIC_USER_INCIDENT_UNSAVED]: 'Incident Unsaved',
  [AUDIT_ACTIONS.PUBLIC_USER_INCIDENT_VIEWED]: 'Incident Viewed',

  [AUDIT_ACTIONS.INCIDENT_CREATED]: 'Incident Created',
  [AUDIT_ACTIONS.INCIDENT_UPDATED]: 'Incident Updated',
  [AUDIT_ACTIONS.INCIDENT_RESOLVED]: 'Incident Resolved',
  [AUDIT_ACTIONS.INCIDENT_DELETED]: 'Incident Deleted',
  [AUDIT_ACTIONS.INCIDENT_RESTORED]: 'Incident Restored',
  [AUDIT_ACTIONS.INCIDENT_PURGED]: 'Incident Purged',

  [AUDIT_ACTIONS.SOURCE_ADDED]: 'Source Added',
  [AUDIT_ACTIONS.SOURCE_UPDATED]: 'Source Updated',
  [AUDIT_ACTIONS.SOURCE_DELETED]: 'Source Deleted',

  [AUDIT_ACTIONS.TIMELINE_ADDED]: 'Timeline Entry Added',
  [AUDIT_ACTIONS.TIMELINE_UPDATED]: 'Timeline Entry Updated',
  [AUDIT_ACTIONS.TIMELINE_DELETED]: 'Timeline Entry Deleted',

  [AUDIT_ACTIONS.ZONE_CREATED]: 'Zone Created',
  [AUDIT_ACTIONS.ZONE_UPDATED]: 'Zone Updated',
  [AUDIT_ACTIONS.ZONE_DELETED]: 'Zone Deleted',

  [AUDIT_ACTIONS.EXPORT_INCIDENTS]: 'Exported Incidents',
  [AUDIT_ACTIONS.EXPORT_SOURCES]: 'Exported Sources',
  [AUDIT_ACTIONS.EXPORT_USERS]: 'Exported Users',
  [AUDIT_ACTIONS.EXPORT_AUDIT]: 'Exported Audit Log',

  [AUDIT_ACTIONS.SETTING_UPDATED]: 'Setting Updated',
};

/**
 * Action color coding for UI display.
 */
export const AUDIT_ACTION_COLORS = {
  [AUDIT_ACTIONS.USER_LOGIN]: '#6366f1',
  [AUDIT_ACTIONS.USER_CREATED]: '#22c55e',
  [AUDIT_ACTIONS.USER_UPDATED]: '#f59e0b',
  [AUDIT_ACTIONS.USER_DEACTIVATED]: '#ef4444',
  [AUDIT_ACTIONS.USER_DELETED]: '#7f1d1d',
  [AUDIT_ACTIONS.USER_ACTIVATED]: '#22c55e',
  [AUDIT_ACTIONS.USER_PASSWORD_RESET]: '#f59e0b',

  [AUDIT_ACTIONS.PUBLIC_USER_LOGIN]: '#6366f1',
  [AUDIT_ACTIONS.PUBLIC_USER_BANNED]: '#ef4444',
  [AUDIT_ACTIONS.PUBLIC_USER_UNBANNED]: '#22c55e',

  [AUDIT_ACTIONS.PUBLIC_USER_INCIDENT_SAVED]: '#22c55e',
  [AUDIT_ACTIONS.PUBLIC_USER_INCIDENT_UNSAVED]: '#f59e0b',
  [AUDIT_ACTIONS.PUBLIC_USER_INCIDENT_VIEWED]: '#8b5cf6',

  [AUDIT_ACTIONS.INCIDENT_CREATED]: '#22c55e',
  [AUDIT_ACTIONS.INCIDENT_UPDATED]: '#f59e0b',
  [AUDIT_ACTIONS.INCIDENT_RESOLVED]: '#6366f1',
  [AUDIT_ACTIONS.INCIDENT_DELETED]: '#ef4444',
  [AUDIT_ACTIONS.INCIDENT_RESTORED]: '#22c55e',
  [AUDIT_ACTIONS.INCIDENT_PURGED]: '#7f1d1d',

  [AUDIT_ACTIONS.SOURCE_ADDED]: '#22c55e',
  [AUDIT_ACTIONS.SOURCE_UPDATED]: '#f59e0b',
  [AUDIT_ACTIONS.SOURCE_DELETED]: '#ef4444',

  [AUDIT_ACTIONS.TIMELINE_ADDED]: '#22c55e',
  [AUDIT_ACTIONS.TIMELINE_UPDATED]: '#f59e0b',
  [AUDIT_ACTIONS.TIMELINE_DELETED]: '#ef4444',

  [AUDIT_ACTIONS.ZONE_CREATED]: '#22c55e',
  [AUDIT_ACTIONS.ZONE_UPDATED]: '#f59e0b',
  [AUDIT_ACTIONS.ZONE_DELETED]: '#ef4444',

  [AUDIT_ACTIONS.EXPORT_INCIDENTS]: '#6366f1',
  [AUDIT_ACTIONS.EXPORT_SOURCES]: '#6366f1',
  [AUDIT_ACTIONS.EXPORT_USERS]: '#6366f1',
  [AUDIT_ACTIONS.EXPORT_AUDIT]: '#6366f1',

  [AUDIT_ACTIONS.SETTING_UPDATED]: '#f59e0b',
};
