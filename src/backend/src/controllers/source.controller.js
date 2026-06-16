import {
  createEventSource,
  updateSource,
  deleteSource,
  pinSource,
  updateSourceVerification,
} from '../services/source.service.js';
import { getEventById } from '../services/incident.service.js';
import { broadcastEvent } from '../utils/sse-broadcast.js';
import { auditLog } from '../utils/audit-log.js';
import { AUDIT_ACTIONS } from '../utils/audit-actions.js';

async function broadcastIncidentUpdate(incidentId) {
  const enriched = await getEventById(incidentId);
  broadcastEvent({ type: 'incident_updated', incident: enriched?.incident || { id: incidentId } });
}

export async function createSourceController(req, res) {
  const source = await createEventSource(req.params.id, req.body, req.user.id);

  await broadcastIncidentUpdate(req.params.id);

  await auditLog(req, AUDIT_ACTIONS.SOURCE_ADDED, 'source', source.id, {
    incidentId: req.params.id,
    sourceType: source.source_type,
    verificationStatus: source.verification_status,
  });

  res.apiSuccess({ source }, 'Source added successfully');
}

export async function updateSourceController(req, res) {
  const source = await updateSource(req.params.sourceId, req.body);
  if (!source) {
    return res.apiError('Source not found', 'NOT_FOUND', 404);
  }

  await broadcastIncidentUpdate(req.params.id);

  await auditLog(req, AUDIT_ACTIONS.SOURCE_UPDATED, 'source', source.id, {
    incidentId: req.params.id,
    sourceType: source.source_type,
    changedFields: Object.keys(req.body),
  });

  res.apiSuccess({ source }, 'Source updated');
}

export async function deleteSourceController(req, res) {
  const source = await deleteSource(req.params.sourceId);
  if (!source) {
    return res.apiError('Source not found', 'NOT_FOUND', 404);
  }

  await broadcastIncidentUpdate(req.params.id);

  await auditLog(req, AUDIT_ACTIONS.SOURCE_DELETED, 'source', req.params.sourceId, {
    incidentId: req.params.id,
    sourceType: source.source_type,
  });

  res.apiSuccess({ deleted: true }, 'Source deleted successfully');
}

export async function updateSourceVerificationController(req, res) {
  const source = await updateSourceVerification(req.params.sourceId, req.body.verificationStatus);
  if (!source) {
    return res.apiError('Source not found', 'NOT_FOUND', 404);
  }

  await broadcastIncidentUpdate(req.params.id);

  await auditLog(req, AUDIT_ACTIONS.SOURCE_UPDATED, 'source', source.id, {
    incidentId: req.params.id,
    sourceType: source.source_type,
    verificationStatus: source.verification_status,
  });

  res.apiSuccess({ source }, 'Source verification updated');
}

export async function pinSourceController(req, res) {
  const { pinned } = req.body;
  const source = await pinSource(req.params.sourceId, pinned);
  if (!source) {
    return res.apiError('Source not found', 'NOT_FOUND', 404);
  }

  await broadcastIncidentUpdate(req.params.id);

  await auditLog(
    req,
    pinned ? AUDIT_ACTIONS.SOURCE_PINNED : AUDIT_ACTIONS.SOURCE_UNPINNED,
    'source',
    req.params.sourceId,
    { incidentId: req.params.id }
  );

  res.apiSuccess({ source }, pinned ? 'Source pinned' : 'Source unpinned');
}
