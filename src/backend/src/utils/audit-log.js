/**
 * Audit Logging Utility
 *
 * Records every mutating action in the platform to the audit_logs table.
 * This function is designed to NEVER throw — audit logging must never
 * break the primary operation it is recording.
 *
 * Usage:
 *   import { auditLog } from '../utils/audit-log.js';
 *   import { AUDIT_ACTIONS } from '../utils/audit-actions.js';
 *
 *   await auditLog(req, AUDIT_ACTIONS.INCIDENT_CREATED, 'incident', incident.id, {
 *     title: incident.title,
 *     severity: incident.severity,
 *   });
 */

import { query } from '../config/database.js';

/**
 * Extract the real client IP from the request.
 * Respects X-Forwarded-For for reverse proxy setups.
 *
 * @param {import('express').Request} req
 * @returns {string | null}
 */
function extractClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    // X-Forwarded-For can be a comma-separated list; use the first (client) IP
    const first = forwarded.split(',')[0].trim();
    if (first) return first;
  }

  const realIp = req.headers['x-real-ip'];
  if (realIp) return realIp;

  return req.ip || req.connection?.remoteAddress || null;
}

/**
 * Write an audit log entry.
 *
 * @param {import('express').Request} req — The Express request object
 * @param {string} action — One of AUDIT_ACTIONS
 * @param {string} [targetType] — The entity type (e.g., 'incident', 'user')
 * @param {string} [targetId] — The entity ID
 * @param {object} [details] — Additional context (JSONB-serialized)
 * @param {object} [userOverride] — Optional user object to use instead of req.user
 * @returns {Promise<void>}
 */
export async function auditLog(req, action, targetType = null, targetId = null, details = {}, userOverride = null) {
  try {
    const user = userOverride || req.user || null;
    const userId = user?.id || null;
    const userEmail = user?.email || null;
    const ipAddress = extractClientIp(req);
    const userAgent = req.headers['user-agent'] || null;

    // Sanitize details — remove any potentially sensitive fields
    const safeDetails = { ...details };
    delete safeDetails.password;
    delete safeDetails.password_hash;
    delete safeDetails.token;

    await query(
      `INSERT INTO audit_logs
       (user_id, user_email, action, target_type, target_id, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        userId,
        userEmail,
        action,
        targetType,
        targetId,
        JSON.stringify(safeDetails),
        ipAddress,
        userAgent,
      ]
    );
  } catch (err) {
    // NEVER throw — audit logging must be invisible to the user.
    // Log to stderr so operators can notice if audit logging is broken.
    console.error('[AUDIT LOG FAILED]', err.message, {
      action,
      targetType,
      targetId,
      userId: req.user?.id,
    });
  }
}
