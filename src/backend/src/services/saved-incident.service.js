import { query } from '../config/database.js';

const INCIDENT_COLUMNS = `
  i.id, i.title, i.description, i.latitude, i.longitude,
  i.severity, i.status, i.start_date, i.end_date,
  i.created_by, i.created_at, i.updated_at, i.resolved_at, i.resolved_by,
  i.location_context,
  i.category_id,
  i.verification_status,
  c.name AS category_name, c.slug AS category_slug,
  d.name AS domain_name, d.slug AS domain_slug, d.color AS domain_color
`;

const INCIDENT_FROM = `
  FROM incidents i
  LEFT JOIN categories c ON i.category_id = c.id
  LEFT JOIN domains d ON c.domain_id = d.id
`;

/**
 * Save an incident for a public user.
 * Returns the saved record. Idempotent — returns existing if already saved.
 */
export async function saveIncident(userId, incidentId) {
  const result = await query(
    `INSERT INTO user_saved_incidents (user_id, incident_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id, incident_id) DO NOTHING
     RETURNING *`,
    [userId, incidentId]
  );

  if (result.rows.length > 0) {
    return result.rows[0];
  }

  // Already saved — return existing
  const existing = await query(
    'SELECT * FROM user_saved_incidents WHERE user_id = $1 AND incident_id = $2',
    [userId, incidentId]
  );
  return existing.rows[0];
}

/**
 * Unsave an incident for a public user.
 */
export async function unsaveIncident(userId, incidentId) {
  await query(
    'DELETE FROM user_saved_incidents WHERE user_id = $1 AND incident_id = $2',
    [userId, incidentId]
  );
}

/**
 * Check if a user has saved an incident.
 */
export async function isIncidentSaved(userId, incidentId) {
  const result = await query(
    'SELECT 1 FROM user_saved_incidents WHERE user_id = $1 AND incident_id = $2',
    [userId, incidentId]
  );
  return result.rows.length > 0;
}

/**
 * List all saved incidents for a user, with full incident data joined.
 */
export async function listSavedIncidents(userId) {
  const result = await query(
    `SELECT ${INCIDENT_COLUMNS}, usi.saved_at, usi.notes
     ${INCIDENT_FROM}
     INNER JOIN user_saved_incidents usi ON usi.incident_id = i.id
     WHERE usi.user_id = $1 AND i.status != 'hidden'
     ORDER BY usi.saved_at DESC`,
    [userId]
  );
  return result.rows;
}

/**
 * Update notes on a saved incident.
 */
export async function updateSavedNotes(userId, incidentId, notes) {
  const result = await query(
    `UPDATE user_saved_incidents
     SET notes = $1
     WHERE user_id = $2 AND incident_id = $3
     RETURNING *`,
    [notes, userId, incidentId]
  );
  return result.rows[0] || null;
}
