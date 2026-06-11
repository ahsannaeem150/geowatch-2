import { query } from '../config/database.js';

const INCIDENT_COLUMNS = `
  i.id, i.title, i.description, i.latitude, i.longitude,
  i.geometry_type,
  i.severity, i.status, i.start_date, i.end_date,
  i.created_by, i.created_at, i.updated_at, i.resolved_at, i.resolved_by,
  i.location_context,
  i.category_id,
  i.zone_category_id,
  i.verification_override,
  c.name AS category_name, c.slug AS category_slug,
  d.name AS domain_name, d.slug AS domain_slug, d.color AS domain_color,
  zc.name AS zone_category_name, zc.color AS zone_category_color, zc.icon AS zone_category_icon,
  ST_AsGeoJSON(i.geom)::json AS geometry
`;

const INCIDENT_FROM = `
  FROM incidents i
  LEFT JOIN categories c ON i.category_id = c.id
  LEFT JOIN domains d ON c.domain_id = d.id
  LEFT JOIN zone_categories zc ON i.zone_category_id = zc.id
`;

// ─── Helpers ───

function computeVerificationStatus(sources, override) {
  if (override) return override;
  if (!sources || sources.length === 0) return 'unverified';

  const statuses = sources.map((s) => s.verification_status);
  const verifiedCount = statuses.filter((s) => s === 'verified').length;
  const hasDisputed = statuses.includes('disputed');
  const hasDebunked = statuses.includes('debunked');

  if (hasDebunked || hasDisputed) return 'contested';
  if (verifiedCount >= 2) return 'confirmed';
  if (verifiedCount >= 1) return 'verified';
  return 'unverified';
}

function buildIncidentWhereClause(filters, options = {}) {
  const conditions = ["i.status != 'hidden'"];
  const params = [];
  let idx = 1;

  // ─── Date filtering ───
  const date = filters.date;
  const dateFrom = filters.dateFrom;
  const dateTo = filters.dateTo;

  if (date) {
    conditions.push(`i.start_date::date <= $${idx++}`);
    params.push(date);
    conditions.push(`(
      i.end_date IS NULL
      OR (i.status != 'resolved' AND i.end_date::date >= $${idx})
      OR (i.status = 'resolved' AND i.end_date::date + interval '1 day' >= $${idx})
    )`);
    params.push(date);
    idx++;
  } else if (dateFrom || dateTo) {
    const from = dateFrom || '1970-01-01';
    const to = dateTo || '2099-12-31';

    conditions.push(`i.start_date::date <= $${idx++}`);
    params.push(to);

    conditions.push(`(
      i.end_date IS NULL
      OR (i.status != 'resolved' AND i.end_date::date >= $${idx})
      OR (i.status = 'resolved' AND i.end_date::date + interval '1 day' >= $${idx})
    )`);
    params.push(from);
    idx++;
  } else if (!options.skipDefaultDate) {
    conditions.push(`i.start_date::date <= CURRENT_DATE`);
    conditions.push(`(
      i.end_date IS NULL
      OR (i.status != 'resolved' AND i.end_date::date >= CURRENT_DATE)
      OR (i.status = 'resolved' AND i.end_date::date + interval '1 day' >= CURRENT_DATE)
    )`);
  }

  if (filters.categoryId) {
    conditions.push(`i.category_id = $${idx++}`);
    params.push(filters.categoryId);
  }
  if (filters.zoneCategoryId) {
    conditions.push(`i.zone_category_id = $${idx++}`);
    params.push(filters.zoneCategoryId);
  }
  if (filters.severity) {
    conditions.push(`i.severity = $${idx++}`);
    params.push(filters.severity);
  }
  if (filters.status) {
    conditions.push(`i.status = $${idx++}`);
    params.push(filters.status);
  }

  if (filters.viewport) {
    const [minLng, minLat, maxLng, maxLat] = filters.viewport.split(',').map(Number);
    conditions.push(
      `ST_Intersects(i.geom, ST_MakeEnvelope($${idx++}, $${idx++}, $${idx++}, $${idx++}, 4326))`
    );
    params.push(minLng, minLat, maxLng, maxLat);
  }

  if (filters.geometryType) {
    conditions.push(`i.geometry_type = $${idx++}`);
    params.push(filters.geometryType);
  }

  return { where: conditions.join(' AND '), params, nextIndex: idx };
}

// ─── Public Queries ───

export async function listIncidents(filters) {
  const { where, params } = buildIncidentWhereClause(filters);

  const countResult = await query(
    `SELECT COUNT(*) as total FROM incidents i WHERE ${where}`,
    params
  );
  const count = parseInt(countResult.rows[0].total, 10);

  const sql = `
    SELECT ${INCIDENT_COLUMNS}
    ${INCIDENT_FROM}
    WHERE ${where}
    ORDER BY i.severity DESC, i.created_at DESC
    LIMIT 301
  `;

  const result = await query(sql, params);

  // Fetch sources for verification computation
  const incidentIds = result.rows.map((r) => r.id);
  let sourcesMap = new Map();
  if (incidentIds.length > 0) {
    const sourcesResult = await query(
      `SELECT incident_id, verification_status FROM incident_sources WHERE incident_id = ANY($1)`,
      [incidentIds]
    );
    for (const src of sourcesResult.rows) {
      if (!sourcesMap.has(src.incident_id)) {
        sourcesMap.set(src.incident_id, []);
      }
      sourcesMap.get(src.incident_id).push(src);
    }
  }

  const incidents = result.rows.map((row) => ({
    ...row,
    verification_status: computeVerificationStatus(sourcesMap.get(row.id) || [], row.verification_override),
  }));

  return {
    incidents,
    count,
    hasMore: count > 300,
  };
}

export async function searchIncidents(filters) {
  const { where, params, nextIndex } = buildIncidentWhereClause(filters, { skipDefaultDate: true });
  const searchQuery = filters.q;
  const limit = Math.min(filters.limit || 25, 100);
  const offset = Math.max(filters.offset || 0, 0);

  const tsVectorExpr = `to_tsvector('english', COALESCE(i.title, '') || ' ' || COALESCE(i.description, ''))`;
  const tsQuery = `plainto_tsquery('english', $${nextIndex})`;

  const countResult = await query(
    `SELECT COUNT(DISTINCT i.id) as total
     FROM incidents i
     LEFT JOIN incident_updates eu ON eu.incident_id = i.id
     WHERE ${where}
       AND (${tsVectorExpr} @@ ${tsQuery}
            OR to_tsvector('english', COALESCE(eu.summary, '')) @@ ${tsQuery})`,
    [...params, searchQuery]
  );
  const count = parseInt(countResult.rows[0].total, 10);

  const sql = `
    WITH ranked AS (
      SELECT i.id,
        MAX(ts_rank(${tsVectorExpr}, ${tsQuery})) as rank
      FROM incidents i
      LEFT JOIN incident_updates eu ON eu.incident_id = i.id
      WHERE ${where}
        AND (${tsVectorExpr} @@ ${tsQuery}
             OR to_tsvector('english', COALESCE(eu.summary, '')) @@ ${tsQuery})
      GROUP BY i.id
    )
    SELECT ${INCIDENT_COLUMNS},
      r.rank
    FROM ranked r
    JOIN incidents i ON i.id = r.id
    ${INCIDENT_FROM.replace('FROM incidents i', '')}
    WHERE ${where.replace(/i\./g, 'i.')}
    ORDER BY r.rank DESC, i.severity DESC, i.start_date DESC
    LIMIT $${nextIndex + 1} OFFSET $${nextIndex + 2}
  `;

  const result = await query(sql, [...params, searchQuery, limit, offset]);

  // Fetch sources for verification computation
  const incidentIds = result.rows.map((r) => r.id);
  let sourcesMap = new Map();
  if (incidentIds.length > 0) {
    const sourcesResult = await query(
      `SELECT incident_id, verification_status FROM incident_sources WHERE incident_id = ANY($1)`,
      [incidentIds]
    );
    for (const src of sourcesResult.rows) {
      if (!sourcesMap.has(src.incident_id)) {
        sourcesMap.set(src.incident_id, []);
      }
      sourcesMap.get(src.incident_id).push(src);
    }
  }

  const incidents = result.rows.map((row) => ({
    ...row,
    verification_status: computeVerificationStatus(sourcesMap.get(row.id) || [], row.verification_override),
  }));

  return {
    incidents,
    count,
    limit,
    offset,
    hasMore: count > offset + limit,
  };
}

export async function getEventById(id) {
  const incidentResult = await query(
    `SELECT ${INCIDENT_COLUMNS}
     ${INCIDENT_FROM}
     WHERE i.id = $1 AND i.status != 'hidden'`,
    [id]
  );

  if (incidentResult.rows.length === 0) return null;

  const incident = incidentResult.rows[0];

  const [sourcesResult, timelineResult] = await Promise.all([
    query(
      `SELECT id, source_type, source_url, embed_html, media_url, description, display_order, verification_status, created_at
       FROM incident_sources
       WHERE incident_id = $1
       ORDER BY display_order ASC, created_at ASC`,
      [id]
    ),
    query(
      `SELECT eu.id, eu.summary, eu.update_date, eu.source_url, eu.embed_html, eu.created_at, u.full_name as created_by_name
       FROM incident_updates eu
       LEFT JOIN users u ON eu.created_by = u.id
       WHERE eu.incident_id = $1
       ORDER BY eu.update_date DESC, eu.created_at DESC`,
      [id]
    ),
  ]);

  const sources = sourcesResult.rows;
  const verificationStatus = computeVerificationStatus(sources, incident.verification_override);

  return {
    incident: { ...incident, verification_status: verificationStatus },
    sources,
    timeline: timelineResult.rows,
  };
}

// ─── Admin Queries ───

export async function createIncident(data, createdBy) {
  const {
    title,
    description,
    geometry,
    latitude,
    longitude,
    categoryId,
    zoneCategoryId,
    severity,
    startDate,
    endDate,
    locationContext,
    verificationOverride,
  } = data;

  let { geometryType } = data;
  if (!geometryType) {
    geometryType = geometry?.type === 'Polygon' ? 'polygon' : 'point';
  }

  const status = endDate ? 'resolved' : 'active';

  let sql;
  let params;

  if (geometryType === 'polygon') {
    sql = `
      INSERT INTO incidents (
        title, description, geometry_type, geom,
        category_id, zone_category_id, severity, start_date, end_date, status, created_by, location_context, verification_override
      ) VALUES ($1, $2, $3, ST_SetSRID(ST_GeomFromGeoJSON($4), 4326), $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`;
    params = [
      title, description || null, geometryType, JSON.stringify(geometry),
      categoryId || null, zoneCategoryId || null, severity, startDate, endDate || null, status, createdBy, locationContext || null, verificationOverride || null,
    ];
  } else {
    sql = `
      INSERT INTO incidents (
        title, description, geometry_type, geom, latitude, longitude,
        category_id, zone_category_id, severity, start_date, end_date, status, created_by, location_context, verification_override
      ) VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326), $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`;
    params = [
      title, description || null, geometryType, longitude, latitude, latitude, longitude,
      categoryId || null, zoneCategoryId || null, severity, startDate, endDate || null, status, createdBy, locationContext || null, verificationOverride || null,
    ];
  }

  const result = await query(sql, params);
  return result.rows[0];
}

export async function updateIncident(id, data) {
  const fields = [];
  const values = [];
  let idx = 1;

  const addField = (key, val) => {
    if (val !== undefined) {
      fields.push(`${key} = $${idx++}`);
      values.push(val);
    }
  };

  addField('title', data.title);
  addField('description', data.description);
  addField('category_id', data.categoryId);
  addField('zone_category_id', data.zoneCategoryId);
  addField('severity', data.severity);
  addField('start_date', data.startDate);
  addField('end_date', data.endDate);
  addField('location_context', data.locationContext);
  addField('verification_override', data.verificationOverride);

  if (data.endDate === null) {
    addField('status', 'active');
  } else if (data.endDate !== undefined) {
    addField('status', 'resolved');
  }

  // Geometry updates
  if (data.geometryType !== undefined) {
    addField('geometry_type', data.geometryType);
  }

  if (data.geometry !== undefined) {
    if (data.geometry.type === 'Polygon') {
      fields.push(`geometry_type = 'polygon'`);
      fields.push(`geom = ST_SetSRID(ST_GeomFromGeoJSON($${idx++}), 4326)`);
      values.push(JSON.stringify(data.geometry));
      fields.push('latitude = NULL');
      fields.push('longitude = NULL');
    } else if (data.geometry.type === 'Point') {
      const [lng, lat] = data.geometry.coordinates;
      fields.push(`geometry_type = 'point'`);
      fields.push(`geom = ST_SetSRID(ST_MakePoint($${idx++}, $${idx++}), 4326)`);
      fields.push(`latitude = $${idx++}`);
      fields.push(`longitude = $${idx++}`);
      values.push(lng, lat, lat, lng);
    }
  } else if (data.latitude !== undefined && data.longitude !== undefined) {
    fields.push(`geometry_type = 'point'`);
    fields.push(`geom = ST_SetSRID(ST_MakePoint($${idx++}, $${idx++}), 4326)`);
    fields.push(`latitude = $${idx++}`);
    fields.push(`longitude = $${idx++}`);
    values.push(data.longitude, data.latitude, data.latitude, data.longitude);
  }

  if (fields.length === 0) {
    throw new Error('No fields to update');
  }

  values.push(id);
  const result = await query(
    `UPDATE incidents SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );

  return result.rows[0] || null;
}

/**
 * Lightweight lookup for incident title (used by media upload naming).
 */
export async function getIncidentTitle(id) {
  const result = await query(
    `SELECT title FROM incidents WHERE id = $1`,
    [id]
  );
  return result.rows[0]?.title || null;
}

export async function deleteIncident(id, deletedBy) {
  // Soft delete: set status to 'hidden' and log the deletion
  const incidentResult = await query(
    `UPDATE incidents SET status = 'hidden', updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id]
  );
  if (incidentResult.rows.length === 0) return null;

  const incident = incidentResult.rows[0];

  // Record in deletion log
  await query(
    `INSERT INTO deleted_incidents_log (incident_id, deleted_by, deleted_at, original_status)
     VALUES ($1, $2, NOW(), $3)
     ON CONFLICT (incident_id) WHERE restored_at IS NULL AND purged_at IS NULL
     DO UPDATE SET deleted_by = $2, deleted_at = NOW(), original_status = $3, restored_at = NULL, restored_by = NULL, purged_at = NULL, purged_by = NULL`,
    [id, deletedBy, incident.status === 'hidden' ? 'active' : incident.status]
  );

  return incident;
}

export async function restoreIncident(id, restoredBy) {
  // Find the original status from the deletion log
  const logResult = await query(
    `SELECT original_status FROM deleted_incidents_log
     WHERE incident_id = $1 AND restored_at IS NULL AND purged_at IS NULL`,
    [id]
  );
  if (logResult.rows.length === 0) return null;

  const originalStatus = logResult.rows[0].original_status;

  const result = await query(
    `UPDATE incidents SET status = $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id, originalStatus]
  );
  if (result.rows.length === 0) return null;

  // Mark log as restored
  await query(
    `UPDATE deleted_incidents_log SET restored_at = NOW(), restored_by = $2 WHERE incident_id = $1 AND restored_at IS NULL AND purged_at IS NULL`,
    [id, restoredBy]
  );

  return result.rows[0];
}

export async function purgeIncident(id, purgedBy) {
  // Permanently delete the incident
  const result = await query('DELETE FROM incidents WHERE id = $1 RETURNING id', [id]);
  if (result.rows.length === 0) return null;

  // Mark log as purged
  await query(
    `UPDATE deleted_incidents_log SET purged_at = NOW(), purged_by = $2 WHERE incident_id = $1`,
    [id, purgedBy]
  );

  return result.rows[0];
}

export async function listDeletedIncidents() {
  const sql = `
    SELECT
      i.id, i.title, i.description, i.latitude, i.longitude,
      i.severity, i.status, i.start_date, i.end_date,
      i.created_by, i.created_at, i.updated_at, i.resolved_at, i.resolved_by,
      i.location_context, i.category_id, i.verification_override,
      c.name AS category_name, c.slug AS category_slug,
      d.name AS domain_name, d.slug AS domain_slug, d.color AS domain_color,
      l.deleted_at, l.deleted_by, l.original_status,
      u.email AS deleted_by_email, u.full_name AS deleted_by_name
    FROM incidents i
    JOIN deleted_incidents_log l ON i.id = l.incident_id
    LEFT JOIN categories c ON i.category_id = c.id
    LEFT JOIN domains d ON c.domain_id = d.id
    LEFT JOIN users u ON l.deleted_by = u.id
    WHERE i.status = 'hidden'
      AND l.restored_at IS NULL
      AND l.purged_at IS NULL
      AND l.deleted_at > NOW() - INTERVAL '30 days'
    ORDER BY l.deleted_at DESC
  `;
  const result = await query(sql);
  return result.rows;
}

export async function getDeletedIncidentById(id) {
  const sql = `
    SELECT
      i.id, i.title, i.description, i.latitude, i.longitude,
      i.severity, i.status, i.start_date, i.end_date,
      i.created_by, i.created_at, i.updated_at, i.resolved_at, i.resolved_by,
      i.location_context, i.category_id, i.verification_override,
      c.name AS category_name, c.slug AS category_slug,
      d.name AS domain_name, d.slug AS domain_slug, d.color AS domain_color,
      l.deleted_at, l.deleted_by, l.original_status
    FROM incidents i
    JOIN deleted_incidents_log l ON i.id = l.incident_id
    LEFT JOIN categories c ON i.category_id = c.id
    LEFT JOIN domains d ON c.domain_id = d.id
    WHERE i.id = $1 AND i.status = 'hidden'
      AND l.restored_at IS NULL
      AND l.purged_at IS NULL
  `;
  const result = await query(sql, [id]);
  return result.rows[0] || null;
}

export async function resolveIncident(id, resolvedBy, resolvedAt) {
  const resolvedTimestamp = resolvedAt || new Date().toISOString();
  const result = await query(
    `UPDATE incidents
     SET status = 'resolved', resolved_at = $3, resolved_by = $2, end_date = $3
     WHERE id = $1
     RETURNING *`,
    [id, resolvedBy, resolvedTimestamp]
  );
  return result.rows[0] || null;
}
