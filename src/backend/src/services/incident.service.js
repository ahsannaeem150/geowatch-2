import { query } from '../config/database.js';

const INCIDENT_COLUMNS = `
  i.id, i.title, i.description, i.latitude, i.longitude,
  i.category, i.severity, i.status, i.start_date, i.end_date,
  i.created_by, i.created_at, i.updated_at, i.resolved_at, i.resolved_by,
  i.location_context
`;

// ─── Helpers ───

function buildIncidentWhereClause(filters, options = {}) {
  const conditions = ["i.status != 'hidden'"];
  const params = [];
  let idx = 1;

  // ─── Date filtering ───
  // Priority: single `date` param > `dateFrom`+`dateTo` range > default to today
  // skipDefaultDate: for universal search — no default today filter, but explicit dates still apply
  const date = filters.date;
  const dateFrom = filters.dateFrom;
  const dateTo = filters.dateTo;

  if (date) {
    // Legacy single-date mode: show incidents active ON this specific date
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
    // Range mode: show incidents whose active period overlaps with [dateFrom, dateTo]
    const from = dateFrom || '1970-01-01';
    const to = dateTo || '2099-12-31';

    // Incident must have started before or on the end of the range
    conditions.push(`i.start_date::date <= $${idx++}`);
    params.push(to);

    // Incident must still be active (with grace) at the start of the range
    conditions.push(`(
      i.end_date IS NULL
      OR (i.status != 'resolved' AND i.end_date::date >= $${idx})
      OR (i.status = 'resolved' AND i.end_date::date + interval '1 day' >= $${idx})
    )`);
    params.push(from);
    idx++;
  } else if (!options.skipDefaultDate) {
    // Default: show incidents active today
    conditions.push(`i.start_date::date <= CURRENT_DATE`);
    conditions.push(`(
      i.end_date IS NULL
      OR (i.status != 'resolved' AND i.end_date::date >= CURRENT_DATE)
      OR (i.status = 'resolved' AND i.end_date::date + interval '1 day' >= CURRENT_DATE)
    )`);
  }

  if (filters.category) {
    conditions.push(`i.category = $${idx++}`);
    params.push(filters.category);
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
      `ST_Within(i.geom, ST_MakeEnvelope($${idx++}, $${idx++}, $${idx++}, $${idx++}, 4326))`
    );
    params.push(minLng, minLat, maxLng, maxLat);
  }

  return { where: conditions.join(' AND '), params, nextIndex: idx };
}

// ─── Public Queries ───

export async function listIncidents(filters) {
  const { where, params } = buildIncidentWhereClause(filters);

  // Get exact count for smart viewport filtering decisions
  const countResult = await query(
    `SELECT COUNT(*) as total FROM incidents i WHERE ${where}`,
    params
  );
  const count = parseInt(countResult.rows[0].total, 10);

  // Fetch incidents capped at 301 so the frontend knows if there's more
  const sql = `
    SELECT ${INCIDENT_COLUMNS}
    FROM incidents i
    WHERE ${where}
    ORDER BY i.severity DESC, i.created_at DESC
    LIMIT 301
  `;

  const result = await query(sql, params);
  return {
    incidents: result.rows,
    count,
    hasMore: count > 300,
  };
}

export async function searchIncidents(filters) {
  const { where, params, nextIndex } = buildIncidentWhereClause(filters, { skipDefaultDate: true });
  const searchQuery = filters.q;
  const limit = Math.min(filters.limit || 25, 100);
  const offset = Math.max(filters.offset || 0, 0);

  // On-the-fly full-text search (computes tsvector at query time)
  // For best performance, run docs/migrations/add-incident-search.sql as postgres
  const tsVectorExpr = `to_tsvector('english', COALESCE(i.title, '') || ' ' || COALESCE(i.description, ''))`;
  const tsQuery = `plainto_tsquery('english', $${nextIndex})`;

  // Get exact count
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

  // Fetch ranked incidents with proper pagination
  // Use CTE to compute rank per incident, then paginate in outer query
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
    JOIN incidents e ON i.id = r.id
    ORDER BY r.rank DESC, i.severity DESC, i.start_date DESC
    LIMIT $${nextIndex + 1} OFFSET $${nextIndex + 2}
  `;

  const result = await query(sql, [...params, searchQuery, limit, offset]);
  return {
    incidents: result.rows,
    count,
    limit,
    offset,
    hasMore: count > offset + limit,
  };
}

export async function getEventById(id) {
  const incidentResult = await query(
    `SELECT ${INCIDENT_COLUMNS}
     FROM incidents i
     WHERE i.id = $1 AND i.status != 'hidden'`,
    [id]
  );

  if (incidentResult.rows.length === 0) return null;

  const incident = incidentResult.rows[0];

  const [sourcesResult, timelineResult] = await Promise.all([
    query(
      `SELECT id, source_type, source_url, embed_html, media_url, description, display_order, created_at
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

  return {
    incident,
    sources: sourcesResult.rows,
    timeline: timelineResult.rows,
  };
}

// ─── Admin Queries ───

export async function createIncident(data, createdBy) {
  const {
    title,
    description,
    latitude,
    longitude,
    category,
    severity,
    startDate,
    endDate,
    locationContext,
  } = data;

  // If an end date is provided, the incident is considered resolved
  const status = endDate ? 'resolved' : 'active';

  const result = await query(
    `INSERT INTO incidents (
      title, description, latitude, longitude, geom,
      category, severity, start_date, end_date, status, created_by, location_context
    ) VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326), $7, $8, $9, $10, $11, $12, $13)
    RETURNING *`,
    [title, description || null, latitude, longitude, longitude, latitude, category, severity, startDate, endDate || null, status, createdBy, locationContext || null]
  );

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
  addField('category', data.category);
  addField('severity', data.severity);
  addField('start_date', data.startDate);
  addField('end_date', data.endDate);
  addField('location_context', data.locationContext);

  // Auto-set status based on end_date presence
  if (data.endDate === null) {
    addField('status', 'active');
  } else if (data.endDate !== undefined) {
    addField('status', 'resolved');
  }

  if (data.latitude !== undefined) {
    fields.push(`latitude = $${idx++}`);
    values.push(data.latitude);
  }
  if (data.longitude !== undefined) {
    fields.push(`longitude = $${idx++}`);
    values.push(data.longitude);
  }
  if (data.latitude !== undefined && data.longitude !== undefined) {
    fields.push(`geom = ST_SetSRID(ST_MakePoint($${idx++}, $${idx++}), 4326)`);
    values.push(data.longitude, data.latitude);
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

export async function deleteIncident(id) {
  const result = await query('DELETE FROM incidents WHERE id = $1 RETURNING id', [id]);
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
