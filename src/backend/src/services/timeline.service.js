import { query } from '../config/database.js';

export async function createTimelineUpdate(eventId, { summary, updateDate }, createdBy) {
  const result = await query(
    `INSERT INTO event_updates (event_id, summary, update_date, created_by)
     VALUES ($1, $2, $3, $4)
     RETURNING id, summary, update_date, created_at`,
    [eventId, summary, updateDate || new Date().toISOString(), createdBy]
  );
  return result.rows[0];
}
