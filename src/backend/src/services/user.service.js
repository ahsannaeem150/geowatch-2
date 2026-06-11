import { query } from '../config/database.js';
import { hashPassword } from './auth.service.js';
import crypto from 'crypto';

const USER_COLUMNS = `
  id, email, full_name, role, is_active, created_at, last_login_at
`;

function buildUserWhereClause(filters) {
  const conditions = [];
  const params = [];
  let idx = 1;

  if (filters.search) {
    conditions.push(`(email ILIKE $${idx++} OR full_name ILIKE $${idx++})`);
    const pattern = `%${filters.search}%`;
    params.push(pattern, pattern);
  }

  if (filters.role) {
    conditions.push(`role = $${idx++}`);
    params.push(filters.role);
  }

  if (filters.isActive !== undefined) {
    conditions.push(`is_active = $${idx++}`);
    params.push(filters.isActive);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { where, params, nextIndex: idx };
}

export async function listUsers(filters) {
  const { where, params } = buildUserWhereClause(filters);
  const limit = filters.limit;
  const offset = (filters.page - 1) * limit;

  const countResult = await query(
    `SELECT COUNT(*) as total FROM users ${where}`,
    params
  );
  const total = parseInt(countResult.rows[0].total, 10);

  const sortColumn = filters.sortBy;
  const sortDirection = filters.sortOrder.toUpperCase();

  const result = await query(
    `SELECT ${USER_COLUMNS}
     FROM users
     ${where}
     ORDER BY ${sortColumn} ${sortDirection}
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  return {
    users: result.rows,
    pagination: {
      page: filters.page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getUserById(id) {
  const result = await query(
    `SELECT ${USER_COLUMNS} FROM users WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

export async function getUserStats(id) {
  const [
    incidentsCreated,
    incidentsResolved,
    sourcesAdded,
    timelineUpdates,
    auditEntries,
  ] = await Promise.all([
    query('SELECT COUNT(*) as c FROM incidents WHERE created_by = $1', [id]),
    query('SELECT COUNT(*) as c FROM incidents WHERE resolved_by = $1', [id]),
    query('SELECT COUNT(*) as c FROM incident_sources WHERE created_by = $1', [id]),
    query('SELECT COUNT(*) as c FROM incident_updates WHERE created_by = $1', [id]),
    query('SELECT COUNT(*) as c FROM audit_logs WHERE user_id = $1', [id]),
  ]);

  return {
    incidentsCreated: parseInt(incidentsCreated.rows[0].c, 10),
    incidentsResolved: parseInt(incidentsResolved.rows[0].c, 10),
    sourcesAdded: parseInt(sourcesAdded.rows[0].c, 10),
    timelineUpdates: parseInt(timelineUpdates.rows[0].c, 10),
    auditEntries: parseInt(auditEntries.rows[0].c, 10),
  };
}

export async function updateUser(id, { role, isActive, fullName }) {
  const fields = [];
  const values = [];
  let idx = 1;

  if (role !== undefined) {
    fields.push(`role = $${idx++}`);
    values.push(role);
  }
  if (isActive !== undefined) {
    fields.push(`is_active = $${idx++}`);
    values.push(isActive);
  }
  if (fullName !== undefined) {
    fields.push(`full_name = $${idx++}`);
    values.push(fullName.trim());
  }

  if (fields.length === 0) {
    throw new Error('No fields to update');
  }

  values.push(id);
  const result = await query(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING ${USER_COLUMNS}`,
    values
  );
  return result.rows[0] || null;
}

export async function getUserDependencyCounts(id) {
  const [
    incidents,
    sources,
    timeline,
  ] = await Promise.all([
    query('SELECT COUNT(*) as c FROM incidents WHERE created_by = $1', [id]),
    query('SELECT COUNT(*) as c FROM incident_sources WHERE created_by = $1', [id]),
    query('SELECT COUNT(*) as c FROM incident_updates WHERE created_by = $1', [id]),
  ]);

  return {
    incidents: parseInt(incidents.rows[0].c, 10),
    sources: parseInt(sources.rows[0].c, 10),
    timeline: parseInt(timeline.rows[0].c, 10),
  };
}

export async function deleteUser(id) {
  const result = await query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
  return result.rows[0] || null;
}

export function generateTempPassword(length = 12) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  const bytes = crypto.randomBytes(length);
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars[bytes[i] % chars.length];
  }
  return password;
}

export async function resetUserPassword(id, plainPassword) {
  const hash = hashPassword(plainPassword);
  const result = await query(
    'UPDATE users SET password_hash = $2 WHERE id = $1 RETURNING id, email',
    [id, hash]
  );
  return result.rows[0] || null;
}
