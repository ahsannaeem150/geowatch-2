import {
  listPublicUsers,
  findPublicUserById,
  updatePublicUser,
  countPublicUserSavedIncidents,
} from '../services/public-auth.service.js';
import { listSavedIncidents } from '../services/saved-incident.service.js';
import { listAuditLogs } from '../services/audit.service.js';
import { query } from '../config/database.js';
import { auditLog } from '../utils/audit-log.js';
import { AUDIT_ACTIONS } from '../utils/audit-actions.js';
import { broadcastEvent } from '../utils/sse-broadcast.js';

/**
 * GET /api/v1/public-users
 * Super admin only — list public users with search, filter, pagination.
 */
export async function listPublicUsersController(req, res) {
  const { search, isActive, page = '1', limit = '25' } = req.query;

  const data = await listPublicUsers({
    search,
    isActive,
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  });

  res.apiSuccess(data);
}

/**
 * GET /api/v1/public-users/:id
 * Super admin only — get a public user with saved incident stats.
 */
export async function getPublicUserController(req, res) {
  const { id } = req.params;

  const user = await findPublicUserById(id);
  if (!user) {
    return res.apiError('Public user not found', 'NOT_FOUND', 404);
  }

  const savedCount = await countPublicUserSavedIncidents(id);
  const savedIncidents = await listSavedIncidents(id);

  res.apiSuccess({
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      avatar_url: user.avatar_url,
      oauth_provider: user.oauth_provider,
      is_active: user.is_active,
      created_at: user.created_at,
    },
    stats: {
      savedCount,
    },
    savedIncidents,
  });
}

/**
 * GET /api/v1/public-users/:id/activity
 * Super admin only — get activity timeline for a public user.
 */
export async function getPublicUserActivityController(req, res) {
  const { id } = req.params;

  const user = await findPublicUserById(id);
  if (!user) {
    return res.apiError('Public user not found', 'NOT_FOUND', 404);
  }

  const [logsResult, actionCounts, lastActiveResult] = await Promise.all([
    listAuditLogs({ userId: id, realm: 'user', page: 1, limit: 50 }),
    query(
      `SELECT action, COUNT(*) as c FROM audit_logs WHERE user_id = $1 AND realm = 'user' GROUP BY action`,
      [id]
    ),
    query(
      'SELECT created_at FROM audit_logs WHERE user_id = $1 AND realm = $2 ORDER BY created_at DESC LIMIT 1',
      [id, 'user']
    ),
  ]);

  const counts = {};
  for (const row of actionCounts.rows) {
    counts[row.action] = parseInt(row.c, 10);
  }

  res.apiSuccess({
    logs: logsResult.logs,
    stats: {
      logins: counts['public_user_login'] || 0,
      saves: counts['public_user_incident_saved'] || 0,
      unsaves: counts['public_user_incident_unsaved'] || 0,
      views: counts['public_user_incident_viewed'] || 0,
      lastActive: lastActiveResult.rows[0]?.created_at || null,
    },
    pagination: logsResult.pagination,
  });
}

/**
 * PATCH /api/v1/public-users/:id
 * Super admin only — ban or unban a public user.
 */
export async function updatePublicUserController(req, res) {
  const { id } = req.params;
  const { isActive } = req.body;

  if (isActive === undefined || typeof isActive !== 'boolean') {
    return res.apiError('isActive (boolean) is required', 'VALIDATION_ERROR', 400);
  }

  const existing = await findPublicUserById(id);
  if (!existing) {
    return res.apiError('Public user not found', 'NOT_FOUND', 404);
  }

  const updated = await updatePublicUser(id, { isActive });

  const action = isActive
    ? AUDIT_ACTIONS.PUBLIC_USER_UNBANNED
    : AUDIT_ACTIONS.PUBLIC_USER_BANNED;

  await auditLog(req, action, 'public_user', updated.id, {
    email: updated.email,
    fullName: updated.full_name,
    previousStatus: existing.is_active,
    newStatus: updated.is_active,
  });

  broadcastEvent({ type: 'public_user_updated', user: updated });

  res.apiSuccess({ user: updated });
}
