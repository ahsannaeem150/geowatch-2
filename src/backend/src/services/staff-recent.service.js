import { query } from '../config/database.js';

// staff_recents.payload->>'incidentId' is plain text; only cast to uuid when
// it actually looks like one (search-type payloads never match, join is null).
const UUID_REGEX = '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';

export async function listStaffRecents(userId, type, limit = 50) {
  const result = await query(
    `SELECT
       sr.id, sr.type, sr.payload, sr.occurred_at,
       sr.occurred_at AS viewed_at,
       i.id AS incident_id,
       i.title,
       i.geometry_type,
       i.location_context,
       i.severity,
       i.status,
       d.name AS domain_name,
       c.name AS category_name,
       zc.name AS zone_category_name,
       zc.color AS zone_category_color,
       zc.icon AS zone_category_icon
     FROM staff_recents sr
     LEFT JOIN incidents i
       ON i.id = CASE
         WHEN sr.payload->>'incidentId' ~ '${UUID_REGEX}'
         THEN (sr.payload->>'incidentId')::uuid
       END
     LEFT JOIN categories c ON i.category_id = c.id
     LEFT JOIN domains d ON c.domain_id = d.id
     LEFT JOIN zone_categories zc ON i.zone_category_id = zc.id
     WHERE sr.user_id = $1 AND sr.type = $2
     ORDER BY sr.occurred_at DESC
     LIMIT $3`,
    [userId, type, Math.min(limit, 100)]
  );
  return result.rows.map((row) => ({
    id: row.id,
    type: row.type,
    payload: row.payload,
    occurred_at: row.occurred_at,
    viewed_at: row.viewed_at,
    incident: row.incident_id
      ? {
          id: row.incident_id,
          title: row.title,
          geometry_type: row.geometry_type,
          location_context: row.location_context,
          severity: row.severity,
          status: row.status,
          domain_name: row.domain_name,
          category_name: row.category_name,
          zone_category_name: row.zone_category_name,
          zone_category_color: row.zone_category_color,
          zone_category_icon: row.zone_category_icon,
        }
      : null,
  }));
}

export async function recordStaffRecent(userId, type, payload) {
  // Dedupe: a re-view of the same incident bumps it to the top instead of
  // stacking duplicate rows (also collapses client POST + server-side records).
  if (payload?.incidentId) {
    await query(
      `DELETE FROM staff_recents
       WHERE user_id = $1 AND type = $2 AND payload->>'incidentId' = $3`,
      [userId, type, payload.incidentId]
    );
  }

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
