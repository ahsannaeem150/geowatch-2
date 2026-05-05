import { createEventSource } from '../services/source.service.js';

export async function createSourceController(req, res) {
  const source = await createEventSource(req.params.id, req.body, req.user.id);
  res.apiSuccess({ source }, 'Source added successfully');
}
