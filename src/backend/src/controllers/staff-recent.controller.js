import {
  listStaffRecents,
  recordStaffRecent,
  clearStaffRecents,
} from '../services/staff-recent.service.js';

export async function listStaffRecentsController(req, res) {
  const { type, limit } = req.query;
  const recents = await listStaffRecents(req.user.id, type, limit ? parseInt(limit, 10) : undefined);
  res.apiSuccess({ recents });
}

export async function recordStaffRecentController(req, res) {
  const { type, payload } = req.body;
  const recent = await recordStaffRecent(req.user.id, type, payload);
  res.apiSuccess({ recent });
}

export async function clearStaffRecentsController(req, res) {
  const { type } = req.query;
  const deleted = await clearStaffRecents(req.user.id, type);
  res.apiSuccess({ cleared: deleted });
}
