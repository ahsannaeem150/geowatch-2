import { createEventSource, updateSourceVerification } from '../services/source.service.js';
import { getEventById } from '../services/incident.service.js';
import { broadcastEvent } from '../utils/sse-broadcast.js';

export async function createSourceController(req, res) {
  const source = await createEventSource(req.params.id, req.body, req.user.id);
  res.apiSuccess({ source }, 'Source added successfully');
}

export async function updateSourceVerificationController(req, res) {
  const source = await updateSourceVerification(req.params.sourceId, req.body.verificationStatus);
  if (!source) {
    return res.apiError('Source not found', 'NOT_FOUND', 404);
  }

  // Fetch enriched incident and broadcast so all clients refresh
  const enriched = await getEventById(req.params.id);
  broadcastEvent({ type: 'incident_updated', incident: enriched?.incident || { id: req.params.id } });

  res.apiSuccess({ source }, 'Source verification updated');
}
