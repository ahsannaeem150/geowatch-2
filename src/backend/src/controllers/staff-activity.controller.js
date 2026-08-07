import { listStaffActivity } from '../services/staff-activity.service.js';

export async function listStaffActivityController(req, res) {
  const { limit } = req.query;
  const activity = await listStaffActivity(limit ? parseInt(limit, 10) : undefined);
  res.apiSuccess({ activity });
}
