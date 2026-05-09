import { query } from '../config/database.js';

const EVENT_COLUMNS = `
  e.id, e.title, e.description, e.latitude, e.longitude,
  e.category, e.severity, e.status, e.start_date, e.end_date,
  e.created_by, e.created_at, e.updated_at, e.resolved_at, e.resolved_by
`;

// ─── Helpers ───

function buildEventWhereClause(filters, options = {}) {
  const conditions = ["e.status != 'hidden'"];
  const params = [];
  let idx = 1;

  // ─── Date filtering ───
  // Priority: single `date` param > `dateFrom`+`dateTo` range > default to today
  // Skip date filter for universal search when explicitly requested
  const date = filters.date;
  const dateFrom = filters.dateFrom;
  const dateTo = filters.dateTo;

  if (!options.skipDateFilter && date) {
    // Legacy single-date mode: show events active ON this specific date
    conditions.push(`e.start_date::date <= $${idx++}`);
    params.push(date);
    conditions.push(`(
      e.end_date IS NULL
      OR (e.status != 'resolved' AND e.end_date::date >= $${idx})
      OR (e.status = 'resolved' AND e.end_date::date + interval '1 day' >= $${idx})
    )`);
    params.push(date);
    idx++;
  } else if (!options.skipDateFilter && (dateFrom || dateTo)) {
    // Range mode: show events whose active period overlaps with [dateFrom, dateTo]
    const from = dateFrom || '1970-01-01';
    const to = dateTo || '2099-12-31';

    // Event must have started before or on the end of the range
    conditions.push(`e.start_date::date <= $${idx++}`);
    params.push(to);

    // Event must still be active (with grace) at the start of the range
    conditions.push(`(
      e.end_date IS NULL
      OR (e.status != 'resolved' AND e.end_date::date >= $${idx})
      OR (e.status = 'resolved' AND e.end_date::date + interval '1 day' >= $${idx})
    )`);
    params.push(from);
    idx++;
  } else if (!options.skipDateFilter) {
    // Default: show events active today
    conditions.push(`e.start_date::date <= CURRENT_DATE`);
    conditions.push(`(
      e.end_date IS NULL
      OR (e.status != 'resolved' AND e.end_date::date >= CURRENT_DATE)
      OR (e.status = 'resolved' AND e.end_date::date + interval '1 day' >= CURRENT_DATE)
    )`);
  }

  if (filters.category) {
    conditions.push(`e.category = $${idx++}`);
    params.push(filters.category);
  }
  if (filters.severity) {
    conditions.push(`e.severity = $${idx++}`);
    params.push(filters.severity);
  }
  if (filters.status) {
    conditions.push(`e.status = $${idx++}`);
    params.push(filters.status);
  }

  if (filters.viewport) {
    const [minLng, minLat, maxLng, maxLat] = filters.viewport.split(',').map(Number);
    conditions.push(
      `ST_Within(e.geom, ST_MakeEnvelope($${idx++}, $${idx++}, $${idx++}, $${idx++}, 4326))`
    );
    params.push(minLng, minLat, maxLng, maxLat);
  }

  return { where: conditions.join(' AND '), params, nextIndex: idx };
}

// ─── Public Queries ───

export async function listEvents(filters) {
  const { where, params } = buildEventWhereClause(filters);

  // Get exact count for smart viewport filtering decisions
  const countResult = await query(
    `SELECT COUNT(*) as total FROM events e WHERE ${where}`,
    params
  );
  const count = parseInt(countResult.rows[0].total, 10);

  // Fetch events capped at 301 so the frontend knows if there's more
  const sql = `
    SELECT ${EVENT_COLUMNS}
    FROM events e
    WHERE ${where}
    ORDER BY e.severity DESC, e.created_at DESC
    LIMIT 301
  `;

  const result = await query(sql, params);
  return {
    events: result.rows,
    count,
    hasMore: count > 300,
  };
}

export async function searchEvents(filters) {
  const { where, params, nextIndex } = buildEventWhereClause(filters, { skipDateFilter: true });
  const searchQuery = filters.q;
  const limit = Math.min(filters.limit || 25, 100);
  const offset = Math.max(filters.offset || 0, 0);

  // On-the-fly full-text search (computes tsvector at query time)
  // For best performance, run docs/migrations/add-event-search.sql as postgres
  const tsVectorExpr = `to_tsvector('english', COALESCE(e.title, '') || ' ' || COALESCE(e.description, ''))`;
  const tsQuery = `plainto_tsquery('english', $${nextIndex})`;

  // Get exact count
  const countResult = await query(
    `SELECT COUNT(DISTINCT e.id) as total
     FROM events e
     LEFT JOIN event_updates eu ON eu.event_id = e.id
     WHERE ${where}
       AND (${tsVectorExpr} @@ ${tsQuery}
            OR to_tsvector('english', COALESCE(eu.summary, '')) @@ ${tsQuery})`,
    [...params, searchQuery]
  );
  const count = parseInt(countResult.rows[0].total, 10);

  // Fetch ranked events with proper pagination
  // Use CTE to compute rank per event, then paginate in outer query
  const sql = `
    WITH ranked AS (
      SELECT e.id,
        MAX(ts_rank(${tsVectorExpr}, ${tsQuery})) as rank
      FROM events e
      LEFT JOIN event_updates eu ON eu.event_id = e.id
      WHERE ${where}
        AND (${tsVectorExpr} @@ ${tsQuery}
             OR to_tsvector('english', COALESCE(eu.summary, '')) @@ ${tsQuery})
      GROUP BY e.id
    )
    SELECT ${EVENT_COLUMNS},
      r.rank
    FROM ranked r
    JOIN events e ON e.id = r.id
    ORDER BY r.rank DESC, e.severity DESC, e.start_date DESC
    LIMIT $${nextIndex + 1} OFFSET $${nextIndex + 2}
  `;

  const result = await query(sql, [...params, searchQuery, limit, offset]);
  return {
    events: result.rows,
    count,
    limit,
    offset,
    hasMore: count > offset + limit,
  };
}

export async function getEventById(id) {
  const eventResult = await query(
    `SELECT ${EVENT_COLUMNS}
     FROM events e
     WHERE e.id = $1 AND e.status != 'hidden'`,
    [id]
  );

  if (eventResult.rows.length === 0) return null;

  const event = eventResult.rows[0];

  const [sourcesResult, timelineResult] = await Promise.all([
    query(
      `SELECT id, source_type, source_url, embed_html, media_url, description, display_order, created_at
       FROM event_sources
       WHERE event_id = $1
       ORDER BY display_order ASC, created_at ASC`,
      [id]
    ),
    query(
      `SELECT eu.id, eu.summary, eu.update_date, eu.source_url, eu.embed_html, eu.created_at, u.full_name as created_by_name
       FROM event_updates eu
       LEFT JOIN users u ON eu.created_by = u.id
       WHERE eu.event_id = $1
       ORDER BY eu.update_date DESC, eu.created_at DESC`,
      [id]
    ),
  ]);

  return {
    event,
    sources: sourcesResult.rows,
    timeline: timelineResult.rows,
  };
}

// ─── Admin Queries ───

export async function createEvent(data, createdBy) {
  const {
    title,
    description,
    latitude,
    longitude,
    category,
    severity,
    startDate,
    endDate,
  } = data;

  // If an end date is provided, the event is considered resolved
  const status = endDate ? 'resolved' : 'active';

  const result = await query(
    `INSERT INTO events (
      title, description, latitude, longitude, geom,
      category, severity, start_date, end_date, status, created_by
    ) VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326), $7, $8, $9, $10, $11, $12)
    RETURNING *`,
    [title, description || null, latitude, longitude, longitude, latitude, category, severity, startDate, endDate || null, status, createdBy]
  );

  return result.rows[0];
}

export async function updateEvent(id, data) {
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
    `UPDATE events SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );

  return result.rows[0] || null;
}

export async function deleteEvent(id) {
  const result = await query('DELETE FROM events WHERE id = $1 RETURNING id', [id]);
  return result.rows[0] || null;
}

export async function resolveEvent(id, resolvedBy, resolvedAt) {
  const resolvedTimestamp = resolvedAt || new Date().toISOString();
  const result = await query(
    `UPDATE events
     SET status = 'resolved', resolved_at = $3, resolved_by = $2, end_date = $3
     WHERE id = $1
     RETURNING *`,
    [id, resolvedBy, resolvedTimestamp]
  );
  return result.rows[0] || null;
}
