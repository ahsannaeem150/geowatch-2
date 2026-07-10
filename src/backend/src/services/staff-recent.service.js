import { query } from '../config/database.js';

export async function listStaffRecents(userId, type, limit = 50) {
  const result = await query(
    `SELECT id, type, payload, occurred_at
     FROM staff_recents
     WHERE user_id = $1 AND type = $2
     ORDER BY occurred_at DESC
     LIMIT $3`,
    [userId, type, Math.min(limit, 100)]
  );
  return result.rows;
}

export async function recordStaffRecent(userId, type, payload) {
  const result = await query(
    `INSERT INTO staff_recents (user_id, type, payload)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [userId, type, payload ? JSON.stringify(payload) : null]
  );

  // Keep only the most recent 50 entries per user/type
  await query(
    `DELETE FROM staff_recents
     WHERE id IN (
       SELECT id FROM staff_recents
       WHERE user_id = $1 AND type = $2
       ORDER BY occurred_at DESC
       OFFSET 50
     )`,
    [userId, type]
  );

  return result.rows[0];
}

export async function clearStaffRecents(userId, type) {
  const result = await query(
    `DELETE FROM staff_recents WHERE user_id = $1 ${type ? 'AND type = $2' : ''}`,
    type ? [userId, type] : [userId]
  );
  return result.rowCount;
}
