import { createTimelineUpdate } from '../services/timeline.service.js';

export async function createTimelineController(req, res) {
  const update = await createTimelineUpdate(req.params.id, req.body, req.user.id);
  res.apiSuccess({ update }, 'Timeline update added successfully');
}
