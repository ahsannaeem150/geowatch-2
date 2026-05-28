import {
  createTimelineUpdate,
  updateTimelineEntry,
  deleteTimelineEntry,
} from '../services/timeline.service.js';
import { broadcastEvent } from '../utils/sse-broadcast.js';
import { auditLog } from '../utils/audit-log.js';
import { AUDIT_ACTIONS } from '../utils/audit-actions.js';

export async function createTimelineController(req, res) {
  const update = await createTimelineUpdate(req.params.id, req.body, req.user.id);
  broadcastEvent({ type: 'timeline_added', incidentId: req.params.id, update });

  await auditLog(req, AUDIT_ACTIONS.TIMELINE_ADDED, 'timeline', update.id, {
    incidentId: req.params.id,
    summary: update.summary,
    updateDate: update.update_date,
  });

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

  await auditLog(req, AUDIT_ACTIONS.TIMELINE_UPDATED, 'timeline', req.params.updateId, {
    incidentId: req.params.id,
    changedFields: Object.keys(req.body),
  });

  res.apiSuccess({ update }, 'Timeline update modified successfully');
}

export async function deleteTimelineController(req, res) {
  const result = await deleteTimelineEntry(req.params.updateId);
  if (!result) {
    return res.apiError('Timeline update not found', 'NOT_FOUND', 404);
  }
  broadcastEvent({ type: 'timeline_deleted', incidentId: req.params.id, updateId: req.params.updateId });

  await auditLog(req, AUDIT_ACTIONS.TIMELINE_DELETED, 'timeline', req.params.updateId, {
    incidentId: req.params.id,
    deletedAt: new Date().toISOString(),
  });

  res.apiSuccess({ deleted: true }, 'Timeline update deleted successfully');
}
