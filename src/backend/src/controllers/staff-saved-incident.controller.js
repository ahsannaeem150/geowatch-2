import {
  listStaffSavedIncidents,
  getStaffSavedIncident,
  saveIncidentForStaff,
  unsaveIncidentForStaff,
  isIncidentSavedByStaff,
} from '../services/staff-saved-incident.service.js';

export async function listStaffSavedIncidentsController(req, res) {
  const incidents = await listStaffSavedIncidents(req.user.id);
  res.apiSuccess({ incidents });
}

export async function getStaffSavedIncidentController(req, res) {
  const saved = await getStaffSavedIncident(req.user.id, req.params.id);
  res.apiSuccess({ saved: !!saved });
}

export async function saveIncidentForStaffController(req, res) {
  const saved = await saveIncidentForStaff(req.user.id, req.params.id, req.body.notes || null);
  res.apiSuccess({ saved }, 'Incident saved');
}

export async function unsaveIncidentForStaffController(req, res) {
  await unsaveIncidentForStaff(req.user.id, req.params.id);
  res.apiSuccess({ saved: false }, 'Incident removed from saved');
}
