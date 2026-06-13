import { query } from '../config/database.js';

function buildAuditWhereClause(filters) {
  const conditions = [];
  const params = [];
  let idx = 1;
  let relatedIncidentIdIndex = null;

  if (filters.action) {
    conditions.push(`al.action = $${idx++}`);
    params.push(filters.action);
  }

  if (filters.userId) {
    conditions.push(`al.user_id = $${idx++}`);
    params.push(filters.userId);
  }

  if (filters.targetType) {
    conditions.push(`al.target_type = $${idx++}`);
    params.push(filters.targetType);
  }

  if (filters.targetId) {
    conditions.push(`al.target_id = $${idx++}`);
    params.push(filters.targetId);
  }

  if (filters.relatedIncidentId) {
    relatedIncidentIdIndex = idx;
    conditions.push(`(
      (al.target_type = 'incident' AND al.target_id::uuid = $${idx}::uuid)
      OR (al.target_type = 'source' AND al.target_id::uuid IN (SELECT id FROM incident_sources WHERE incident_id = $${idx}::uuid))
      OR (al.target_type = 'timeline' AND al.target_id::uuid IN (SELECT id FROM incident_updates WHERE incident_id = $${idx}::uuid))
      OR (al.target_type = 'media' AND al.target_id::uuid IN (SELECT id FROM incident_media WHERE incident_id = $${idx}::uuid))
    )`);
    params.push(filters.relatedIncidentId);
    idx++;
  }

  if (filters.dateFrom) {
    conditions.push(`al.created_at >= $${idx++}`);
    params.push(filters.dateFrom);
  }

  if (filters.dateTo) {
    conditions.push(`al.created_at <= $${idx++}`);
    params.push(filters.dateTo);
  }

  if (filters.realm) {
    conditions.push(`al.realm = $${idx++}`);
    params.push(filters.realm);
  }

  if (filters.actorType) {
    conditions.push(`al.actor_type = $${idx++}`);
    params.push(filters.actorType);
  }

  if (filters.search) {
    const term = `%${filters.search}%`;
    conditions.push(`(
      al.action ILIKE $${idx}
      OR al.target_type ILIKE $${idx}
      OR al.target_id ILIKE $${idx}
      OR al.user_email ILIKE $${idx}
      OR al.ip_address::text ILIKE $${idx}
      OR al.details::text ILIKE $${idx}
      OR COALESCE(u.full_name, pu.full_name) ILIKE $${idx}
    )`);
    params.push(term);
    idx++;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { where, params, nextIndex: idx, relatedIncidentIdIndex };
}

export async function listAuditLogs(filters) {
  const { where, params, relatedIncidentIdIndex } = buildAuditWhereClause(filters);
  const limit = filters.limit;
  const offset = (filters.page - 1) * limit;

  const incidentJoin = relatedIncidentIdIndex
    ? `LEFT JOIN incidents inc ON inc.id = $${relatedIncidentIdIndex}::uuid`
    : `LEFT JOIN incidents inc ON al.target_type = 'incident' AND inc.id::text = al.target_id`;

  const countResult = await query(
    `SELECT COUNT(*) as total
     FROM audit_logs al
     LEFT JOIN users u ON al.user_id = u.id
     LEFT JOIN public_users pu ON al.user_id = pu.id
     ${where}`,
    params
  );
  const total = parseInt(countResult.rows[0].total, 10);

  const result = await query(
    `SELECT 
       al.id, al.user_id, al.user_email, al.action, al.target_type, al.target_id,
       al.details, al.ip_address, al.user_agent, al.created_at, al.realm, al.actor_type,
       COALESCE(u.full_name, pu.full_name) as user_full_name,
       inc.status AS incident_status
     FROM audit_logs al
     LEFT JOIN users u ON al.user_id = u.id
     LEFT JOIN public_users pu ON al.user_id = pu.id
     ${incidentJoin}
     ${where}
     ORDER BY al.created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  return {
    logs: result.rows,
    pagination: {
      page: filters.page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getAuditSummary(filters = {}) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const conditions = ['created_at >= $1 AND created_at <= $2'];
  const params = [todayStart.toISOString(), todayEnd.toISOString()];

  if (filters.realm) {
    conditions.push(`realm = $${params.length + 1}`);
    params.push(filters.realm);
  }

  if (filters.actorType) {
    conditions.push(`actor_type = $${params.length + 1}`);
    params.push(filters.actorType);
  }

  const where = conditions.join(' AND ');

  const totalResult = await query(
    `SELECT COUNT(*) as c FROM audit_logs WHERE ${where}`,
    params
  );

  const actionsResult = await query(
    `SELECT action, COUNT(*) as c
     FROM audit_logs
     WHERE ${where}
     GROUP BY action
     ORDER BY c DESC`,
    params
  );

  const usersResult = await query(
    `SELECT COUNT(DISTINCT user_id) as c FROM audit_logs WHERE ${where}`,
    params
  );

  return {
    totalToday: parseInt(totalResult.rows[0].c, 10),
    uniqueUsers: parseInt(usersResult.rows[0].c, 10),
    actionsBreakdown: actionsResult.rows.map((r) => ({
      action: r.action,
      count: parseInt(r.c, 10),
    })),
  };
}
