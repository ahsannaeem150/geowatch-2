import { query } from '../config/database.js';

const ZONE_COLUMNS = `
  id, name, description, category, is_active,
  fill_color, stroke_color, stroke_width, opacity,
  created_by, created_at, updated_at
`;

// ─── Public Queries ───

export async function listZones() {
  const result = await query(
    `SELECT ${ZONE_COLUMNS}, ST_AsGeoJSON(geom)::json AS geometry,
      (SELECT COUNT(*) FROM incidents i
       WHERE i.status != 'hidden'
       AND ST_Contains(zones.geom, i.geom)) AS incident_count
     FROM zones
     WHERE is_active = true
     ORDER BY created_at DESC`,
    []
  );
  return result.rows;
}

export async function getZoneById(id) {
  const result = await query(
    `SELECT ${ZONE_COLUMNS}, ST_AsGeoJSON(geom)::json AS geometry
     FROM zones
     WHERE id = $1 AND is_active = true`,
    [id]
  );
  return result.rows[0] || null;
}

// ─── Admin Mutations ───

export async function createZone(data, userId) {
  const {
    name,
    geometry,
    description,
    fillColor,
    strokeColor,
    strokeWidth,
    opacity,
    category,
  } = data;

  const result = await query(
    `INSERT INTO zones (
      name, description, geom,
      fill_color, stroke_color, stroke_width, opacity, category, created_by
    ) VALUES ($1, $2, ST_SetSRID(ST_GeomFromGeoJSON($3), 4326), $4, $5, $6, $7, $8, $9)
    RETURNING ${ZONE_COLUMNS}, ST_AsGeoJSON(geom)::json AS geometry`,
    [
      name,
      description || null,
      JSON.stringify(geometry),
      fillColor || '#9f1239',
      strokeColor || '#9f1239',
      strokeWidth ?? 2,
      opacity ?? 0.08,
      category || null,
      userId,
    ]
  );

  return result.rows[0];
}

export async function updateZone(id, data) {
  const fields = [];
  const values = [];
  let idx = 1;

  const addField = (key, val) => {
    if (val !== undefined) {
      fields.push(`${key} = $${idx++}`);
      values.push(val);
    }
  };

  addField('name', data.name);
  addField('description', data.description);
  addField('fill_color', data.fillColor);
  addField('stroke_color', data.strokeColor);
  addField('stroke_width', data.strokeWidth);
  addField('opacity', data.opacity);
  addField('category', data.category);
  addField('is_active', data.isActive);

  if (data.geometry !== undefined) {
    fields.push(`geom = ST_SetSRID(ST_GeomFromGeoJSON($${idx++}), 4326)`);
    values.push(JSON.stringify(data.geometry));
  }

  if (fields.length === 0) {
    throw new Error('No fields to update');
  }

  values.push(id);
  const result = await query(
    `UPDATE zones SET ${fields.join(', ')} WHERE id = $${idx}
     RETURNING ${ZONE_COLUMNS}, ST_AsGeoJSON(geom)::json AS geometry`,
    values
  );

  return result.rows[0] || null;
}

export async function getIncidentsInZone(zoneId) {
  const result = await query(
    `SELECT
        i.id, i.title, i.latitude, i.longitude, i.severity, i.status, i.start_date,
        c.name AS category_name, d.name AS domain_name, d.color AS domain_color
     FROM incidents i
     LEFT JOIN categories c ON i.category_id = c.id
     LEFT JOIN domains d ON c.domain_id = d.id
     WHERE i.status != 'hidden'
       AND ST_Contains(
         (SELECT geom FROM zones WHERE id = $1),
         i.geom
       )
     ORDER BY i.start_date DESC`,
    [zoneId]
  );
  return result.rows;
}

export async function deleteZone(id) {
  // Soft delete: set is_active = false
  const result = await query(
    `UPDATE zones SET is_active = false, updated_at = NOW() WHERE id = $1
     RETURNING id`,
    [id]
  );
  return result.rows[0] || null;
}
