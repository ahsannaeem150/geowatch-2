import { createEventSource, updateSourceVerification } from '../services/source.service.js';

export async function createSourceController(req, res) {
  const source = await createEventSource(req.params.id, req.body, req.user.id);
  res.apiSuccess({ source }, 'Source added successfully');
}

export async function updateSourceVerificationController(req, res) {
  const source = await updateSourceVerification(req.params.sourceId, req.body.verificationStatus);
  if (!source) {
    return res.apiError('Source not found', 'NOT_FOUND', 404);
  }
  res.apiSuccess({ source }, 'Source verification updated');
}
