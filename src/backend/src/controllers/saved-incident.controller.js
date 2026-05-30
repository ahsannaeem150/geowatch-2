import {
  saveIncident,
  unsaveIncident,
  isIncidentSaved,
  listSavedIncidents,
  updateSavedNotes,
} from '../services/saved-incident.service.js';

/**
 * POST /api/v1/incidents/:id/save
 */
export async function saveIncidentController(req, res) {
  const userId = req.user.id;
  const incidentId = req.params.id;

  const saved = await saveIncident(userId, incidentId);
  res.apiSuccess({ saved: true, savedAt: saved.saved_at }, 'Incident saved');
}

/**
 * DELETE /api/v1/incidents/:id/save
 */
export async function unsaveIncidentController(req, res) {
  const userId = req.user.id;
  const incidentId = req.params.id;

  await unsaveIncident(userId, incidentId);
  res.apiSuccess({ saved: false }, 'Incident removed from saved');
}

/**
 * GET /api/v1/incidents/:id/saved
 */
export async function checkSavedController(req, res) {
  const userId = req.user.id;
  const incidentId = req.params.id;

  const saved = await isIncidentSaved(userId, incidentId);
  res.apiSuccess({ saved });
}

/**
 * GET /api/v1/incidents/saved
 */
export async function listSavedController(req, res) {
  const userId = req.user.id;

  const incidents = await listSavedIncidents(userId);
  res.apiSuccess({ incidents, count: incidents.length });
}

/**
 * PATCH /api/v1/incidents/:id/save/notes
 */
export async function updateNotesController(req, res) {
  const userId = req.user.id;
  const incidentId = req.params.id;
  const { notes } = req.body;

  const updated = await updateSavedNotes(userId, incidentId, notes);
  if (!updated) {
    return res.apiError('Incident not found in saved list', 'NOT_FOUND', 404);
  }
  res.apiSuccess({ notes: updated.notes });
}
