import { query } from '../config/database.js';

const STAFF_SAVED_COLUMNS = `
  ssi.id, ssi.user_id, ssi.incident_id, ssi.notes, ssi.saved_at,
  i.title, i.description, i.latitude, i.longitude,
  i.geometry_type, i.severity, i.status, i.start_date, i.end_date,
  i.created_by, i.created_at, i.updated_at, i.resolved_at, i.resolved_by,
  i.location_context, i.category_id, i.zone_category_id, i.verification_status, i.hero_image_url,
  c.name AS category_name, c.slug AS category_slug,
  d.name AS domain_name, d.slug AS domain_slug, d.color AS domain_color, d.light_color AS domain_light_color,
  zc.name AS zone_category_name, zc.color AS zone_category_color, zc.icon AS zone_category_icon,
  cb.full_name AS created_by_name, cb.email AS created_by_email,
  COALESCE(CASE WHEN pu.id IS NOT NULL THEN 'public_user' END, cb.role) AS created_by_role,
  rb.full_name AS resolved_by_name, rb.email AS resolved_by_email,
  CASE WHEN i.geometry_type = 'polygon' THEN ROUND(ST_Area(i.geom::geography)::numeric, 2) END AS area_sq_m,
  CASE WHEN i.geometry_type = 'polygon' THEN ROUND(ST_Perimeter(i.geom::geography)::numeric, 2) END AS perimeter_m,
  ST_AsGeoJSON(i.geom)::json AS geometry
`;

const STAFF_SAVED_FROM = `
  FROM staff_saved_incidents ssi
  JOIN incidents i ON ssi.incident_id = i.id
  LEFT JOIN categories c ON i.category_id = c.id
  LEFT JOIN domains d ON c.domain_id = d.id
  LEFT JOIN zone_categories zc ON i.zone_category_id = zc.id
  LEFT JOIN users cb ON i.created_by = cb.id
  LEFT JOIN public_users pu ON i.created_by = pu.id
  LEFT JOIN users rb ON i.resolved_by = rb.id
`;

export async function listStaffSavedIncidents(userId) {
  const result = await query(
    `SELECT ${STAFF_SAVED_COLUMNS}
     ${STAFF_SAVED_FROM}
     WHERE ssi.user_id = $1 AND i.status != 'hidden'
     ORDER BY ssi.saved_at DESC`,
    [userId]
  );
  return result.rows;
}

export async function getStaffSavedIncident(userId, incidentId) {
  const result = await query(
    `SELECT ${STAFF_SAVED_COLUMNS}
     ${STAFF_SAVED_FROM}
     WHERE ssi.user_id = $1 AND ssi.incident_id = $2 AND i.status != 'hidden'`,
    [userId, incidentId]
  );
  return result.rows[0] || null;
}

export async function saveIncidentForStaff(userId, incidentId, notes = null) {
  const result = await query(
    `INSERT INTO staff_saved_incidents (user_id, incident_id, notes)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, incident_id) DO UPDATE SET saved_at = NOW(), notes = COALESCE($3, staff_saved_incidents.notes)
     RETURNING *`,
    [userId, incidentId, notes]
  );
  return result.rows[0];
}

export async function unsaveIncidentForStaff(userId, incidentId) {
  const result = await query(
    `DELETE FROM staff_saved_incidents WHERE user_id = $1 AND incident_id = $2 RETURNING id`,
    [userId, incidentId]
  );
  return result.rows[0] || null;
}

export async function isIncidentSavedByStaff(userId, incidentId) {
  const result = await query(
    `SELECT 1 FROM staff_saved_incidents WHERE user_id = $1 AND incident_id = $2`,
    [userId, incidentId]
  );
  return result.rows.length > 0;
}
