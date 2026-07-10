import { query } from '../config/database.js';

export async function listNotifications(userId, { limit = 50, offset = 0, unreadOnly = false } = {}) {
  const conditions = ['n.user_id = $1'];
  const params = [userId];
  let idx = 2;

  if (unreadOnly) {
    conditions.push(`n.is_read = false`);
  }

  const where = conditions.join(' AND ');

  const countResult = await query(
    `SELECT COUNT(*) as total FROM notifications n WHERE ${where}`,
    params
  );
  const count = parseInt(countResult.rows[0].total, 10);

  const result = await query(
    `SELECT n.*
     FROM notifications n
     WHERE ${where}
     ORDER BY n.created_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, Math.min(limit, 100), Math.max(offset, 0)]
  );

  return {
    notifications: result.rows,
    count,
    limit,
    offset,
    hasMore: count > offset + limit,
  };
}

export async function getUnreadNotificationCount(userId) {
  const result = await query(
    `SELECT COUNT(*) as total FROM notifications WHERE user_id = $1 AND is_read = false`,
    [userId]
  );
  return parseInt(result.rows[0].total, 10);
}

export async function markNotificationRead(userId, notificationId) {
  const result = await query(
    `UPDATE notifications
     SET is_read = true, read_at = NOW()
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    [notificationId, userId]
  );
  return result.rows[0] || null;
}

export async function markAllNotificationsRead(userId) {
  const result = await query(
    `UPDATE notifications
     SET is_read = true, read_at = NOW()
     WHERE user_id = $1 AND is_read = false
     RETURNING id`,
    [userId]
  );
  return result.rows.map((r) => r.id);
}

export async function createNotification({ userId, type, title, body, linkPath, payload }) {
  const result = await query(
    `INSERT INTO notifications (user_id, type, title, body, link_path, payload)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [userId, type, title, body || null, linkPath || null, payload ? JSON.stringify(payload) : null]
  );
  return result.rows[0];
}

export async function createNotificationsForAllStaff({ type, title, body, linkPath, payload, excludeUserId }) {
  const result = await query(
    `INSERT INTO notifications (user_id, type, title, body, link_path, payload)
     SELECT id, $1, $2, $3, $4, $5
     FROM users
     WHERE role IN ('admin', 'super_admin', 'viewer')
       ${excludeUserId ? 'AND id != $6' : ''}`,
    excludeUserId
      ? [type, title, body || null, linkPath || null, payload ? JSON.stringify(payload) : null, excludeUserId]
      : [type, title, body || null, linkPath || null, payload ? JSON.stringify(payload) : null]
  );
  return result.rowCount;
}

export async function notifyStaffRecentViewers(incidentId, { type, title, body, linkPath, payload, excludeUserId }) {
  const result = await query(
    `INSERT INTO notifications (user_id, type, title, body, link_path, payload)
     SELECT DISTINCT user_id, $1, $2, $3, $4, $5
     FROM staff_recents
     WHERE type = 'incident'
       AND payload->>'incidentId' = $6
       AND occurred_at > NOW() - INTERVAL '7 days'
       ${excludeUserId ? 'AND user_id != $7' : ''}`,
    excludeUserId
      ? [type, title, body || null, linkPath || null, payload ? JSON.stringify(payload) : null, incidentId, excludeUserId]
      : [type, title, body || null, linkPath || null, payload ? JSON.stringify(payload) : null, incidentId]
  );
  return result.rowCount;
}

export async function deleteNotification(userId, notificationId) {
  const result = await query(
    `DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id`,
    [notificationId, userId]
  );
  return result.rows[0] || null;
}
