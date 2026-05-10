import {
  createTimelineUpdate,
  updateTimelineEntry,
  deleteTimelineEntry,
} from '../services/timeline.service.js';
import { broadcastEvent } from '../utils/sse-broadcast.js';

export async function createTimelineController(req, res) {
  const update = await createTimelineUpdate(req.params.id, req.body, req.user.id);
  broadcastEvent({ type: 'timeline_added', incidentId: req.params.id, update });
  res.apiSuccess({ update }, 'Timeline update added successfully');
}

export async function updateTimelineController(req, res) {
  const { summary, updateDate, sourceUrl } = req.body;
  if (summary === undefined && updateDate === undefined && sourceUrl === undefined) {
    return res.apiError('At least one field (summary, updateDate, or sourceUrl) is required', 'VALIDATION_ERROR', 400);
  }

  const update = await updateTimelineEntry(req.params.updateId, { summary, updateDate, sourceUrl });
  if (!update) {
    return res.apiError('Timeline update not found', 'NOT_FOUND', 404);
  }
  broadcastEvent({ type: 'timeline_updated', incidentId: req.params.id, updateId: req.params.updateId });
  res.apiSuccess({ update }, 'Timeline update modified successfully');
}

export async function deleteTimelineController(req, res) {
  const result = await deleteTimelineEntry(req.params.updateId);
  if (!result) {
    return res.apiError('Timeline update not found', 'NOT_FOUND', 404);
  }
  broadcastEvent({ type: 'timeline_deleted', incidentId: req.params.id, updateId: req.params.updateId });
  res.apiSuccess({ deleted: true }, 'Timeline update deleted successfully');
}
