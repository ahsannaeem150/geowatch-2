import {
  createTimelineUpdate,
  updateTimelineEntry,
  deleteTimelineEntry,
  setFeaturedItem,
  clearFeaturedItem,
} from '../services/timeline.service.js';
import { broadcastEvent } from '../utils/sse-broadcast.js';
import { auditLog } from '../utils/audit-log.js';
import { AUDIT_ACTIONS } from '../utils/audit-actions.js';

export async function createTimelineController(req, res) {
  const { summary, updateDate, sourceUrl, type, verificationStatus } = req.body;
  const update = await createTimelineUpdate(
    req.params.id,
    { summary, updateDate, sourceUrl, type, verificationStatus },
    req.user.id
  );
  broadcastEvent({ type: 'timeline_added', incidentId: req.params.id, update });

  await auditLog(req, AUDIT_ACTIONS.TIMELINE_ADDED, 'timeline', update.id, {
    incidentId: req.params.id,
    summary: update.summary,
    updateDate: update.update_date,
  });

  res.apiSuccess({ update }, 'Timeline update added successfully');
}

export async function updateTimelineController(req, res) {
  const { summary, updateDate, sourceUrl, type, verificationStatus } = req.body;
  const hasField = [summary, updateDate, sourceUrl, type, verificationStatus].some((v) => v !== undefined);
  if (!hasField) {
    return res.apiError('At least one field is required', 'VALIDATION_ERROR', 400);
  }

  const update = await updateTimelineEntry(req.params.updateId, {
    summary,
    updateDate,
    sourceUrl,
    type,
    verificationStatus,
  });
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

export async function setFeaturedController(req, res) {
  const { sourceType, sourceId, mediaId } = req.body;
  const update = await setFeaturedItem(req.params.updateId, { sourceType, sourceId, mediaId });
  if (!update) {
    return res.apiError('Timeline update not found', 'NOT_FOUND', 404);
  }
  broadcastEvent({ type: 'timeline_updated', incidentId: req.params.id, updateId: req.params.updateId });

  await auditLog(req, AUDIT_ACTIONS.TIMELINE_FEATURED_SET, 'timeline', req.params.updateId, {
    incidentId: req.params.id,
    sourceType,
    sourceId,
    mediaId,
  });

  res.apiSuccess({ featuredItem: { sourceType, sourceId, mediaId } }, 'Featured item set');
}

export async function clearFeaturedController(req, res) {
  const update = await clearFeaturedItem(req.params.updateId);
  if (!update) {
    return res.apiError('Timeline update not found', 'NOT_FOUND', 404);
  }
  broadcastEvent({ type: 'timeline_updated', incidentId: req.params.id, updateId: req.params.updateId });

  await auditLog(req, AUDIT_ACTIONS.TIMELINE_FEATURED_CLEARED, 'timeline', req.params.updateId, {
    incidentId: req.params.id,
  });

  res.apiSuccess({ cleared: true }, 'Featured item cleared');
}
