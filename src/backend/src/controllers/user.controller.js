import {
  listUsers,
  getUserById,
  getUserStats,
  updateUser,
  getUserDependencyCounts,
  deleteUser,
  generateTempPassword,
  resetUserPassword,
} from '../services/user.service.js';
import { listAuditLogs } from '../services/audit.service.js';
import { query } from '../config/database.js';
import { auditLog } from '../utils/audit-log.js';
import { AUDIT_ACTIONS } from '../utils/audit-actions.js';
import { broadcastEvent } from '../utils/sse-broadcast.js';

export async function listUsersController(req, res) {
  const filters = {
    search: req.query.search,
    role: req.query.role,
    isActive: req.query.isActive,
    sortBy: req.query.sortBy,
    sortOrder: req.query.sortOrder,
    page: req.query.page,
    limit: req.query.limit,
  };

  const result = await listUsers(filters);
  res.apiSuccess(result);
}

export async function getUserController(req, res) {
  const user = await getUserById(req.params.id);
  if (!user) {
    return res.apiError('User not found', 'NOT_FOUND', 404);
  }

  const stats = await getUserStats(req.params.id);
  res.apiSuccess({ user, stats });
}

export async function updateUserController(req, res) {
  const { role, isActive, fullName } = req.body;
  const updated = await updateUser(req.params.id, { role, isActive, fullName });

  if (!updated) {
    return res.apiError('User not found', 'NOT_FOUND', 404);
  }

  // Determine specific audit action
  let action = AUDIT_ACTIONS.USER_UPDATED;
  if (isActive !== undefined) {
    action = isActive ? AUDIT_ACTIONS.USER_ACTIVATED : AUDIT_ACTIONS.USER_DEACTIVATED;
  }

  await auditLog(req, action, 'user', updated.id, {
    email: updated.email,
    role: updated.role,
    isActive: updated.is_active,
    fullName: updated.full_name,
    changedFields: { role, isActive, fullName },
  });

  broadcastEvent({ type: 'user_updated', user: updated });

  res.apiSuccess({ user: updated });
}

export async function deleteUserController(req, res) {
  const deps = await getUserDependencyCounts(req.params.id);
  const hasDeps = deps.incidents > 0 || deps.sources > 0 || deps.timeline > 0 || deps.zones > 0;

  if (hasDeps) {
    return res.apiError(
      'Cannot delete user with existing content. Deactivate instead.',
      'CONFLICT',
      409,
      { dependencies: deps }
    );
  }

  const deleted = await deleteUser(req.params.id);
  if (!deleted) {
    return res.apiError('User not found', 'NOT_FOUND', 404);
  }

  await auditLog(req, AUDIT_ACTIONS.USER_DELETED, 'user', req.params.id, {
    note: 'User permanently deleted',
    deletedAt: new Date().toISOString(),
  });

  broadcastEvent({ type: 'user_deleted', userId: req.params.id });

  res.apiSuccess({ deleted: true });
}

export async function getUserActivityController(req, res) {
  const userId = req.params.id;

  const user = await getUserById(userId);
  if (!user) {
    return res.apiError('User not found', 'NOT_FOUND', 404);
  }

  const [logsResult, stats, lastActiveResult] = await Promise.all([
    listAuditLogs({ userId, realm: 'system', page: 1, limit: 50 }),
    getUserStats(userId),
    query(
      'SELECT created_at FROM audit_logs WHERE user_id = $1 AND realm = $2 ORDER BY created_at DESC LIMIT 1',
      [userId, 'system']
    ),
  ]);

  res.apiSuccess({
    logs: logsResult.logs,
    stats: {
      incidentsCreated: stats.incidentsCreated,
      incidentsResolved: stats.incidentsResolved,
      sourcesAdded: stats.sourcesAdded,
      timelineUpdates: stats.timelineUpdates,
      lastActive: lastActiveResult.rows[0]?.created_at || null,
    },
    pagination: logsResult.pagination,
  });
}

export async function resetPasswordController(req, res) {
  const user = await getUserById(req.params.id);
  if (!user) {
    return res.apiError('User not found', 'NOT_FOUND', 404);
  }

  const tempPassword = generateTempPassword();
  await resetUserPassword(req.params.id, tempPassword);

  await auditLog(req, AUDIT_ACTIONS.USER_PASSWORD_RESET, 'user', req.params.id, {
    email: user.email,
  });

  res.apiSuccess(
    { tempPassword },
    'Password reset successfully. Share the temporary password securely with the user.'
  );
}
