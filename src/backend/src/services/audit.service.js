import { query } from '../config/database.js';

function buildAuditWhereClause(filters) {
  const conditions = [];
  const params = [];
  let idx = 1;

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

  if (filters.dateFrom) {
    conditions.push(`al.created_at >= $${idx++}`);
    params.push(filters.dateFrom);
  }

  if (filters.dateTo) {
    conditions.push(`al.created_at <= $${idx++}`);
    params.push(filters.dateTo);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { where, params, nextIndex: idx };
}

export async function listAuditLogs(filters) {
  const { where, params } = buildAuditWhereClause(filters);
  const limit = filters.limit;
  const offset = (filters.page - 1) * limit;

  const countResult = await query(
    `SELECT COUNT(*) as total FROM audit_logs al ${where}`,
    params
  );
  const total = parseInt(countResult.rows[0].total, 10);

  const result = await query(
    `SELECT 
       al.id, al.user_id, al.user_email, al.action, al.target_type, al.target_id,
       al.details, al.ip_address, al.user_agent, al.created_at,
       u.full_name as user_full_name
     FROM audit_logs al
     LEFT JOIN users u ON al.user_id = u.id
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

export async function getAuditSummary() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const totalResult = await query(
    'SELECT COUNT(*) as c FROM audit_logs WHERE created_at >= $1 AND created_at <= $2',
    [todayStart.toISOString(), todayEnd.toISOString()]
  );

  const actionsResult = await query(
    `SELECT action, COUNT(*) as c
     FROM audit_logs
     WHERE created_at >= $1 AND created_at <= $2
     GROUP BY action
     ORDER BY c DESC`,
    [todayStart.toISOString(), todayEnd.toISOString()]
  );

  const usersResult = await query(
    'SELECT COUNT(DISTINCT user_id) as c FROM audit_logs WHERE created_at >= $1 AND created_at <= $2',
    [todayStart.toISOString(), todayEnd.toISOString()]
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
