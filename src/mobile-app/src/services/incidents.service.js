// Thin helpers over the incidents endpoints. Zones are polygon-geometry
// rows in the same incidents table, mirroring the web frontends.

import { api } from './api';

export function listIncidents(params = {}) {
  return api.get('/incidents', {
    params: { ...params, geometryType: 'point' },
  });
}

export function getIncident(id) {
  return api.get(`/incidents/${id}`);
}

export function listZones(params = {}) {
  return api.get('/incidents', {
    params: { ...params, geometryType: 'polygon' },
  });
}

export function listSavedIncidents(params = {}) {
  return api.get('/incidents/saved', { params });
}

export function saveIncident(id) {
  return api.post(`/incidents/${id}/save`);
}

export function unsaveIncident(id) {
  return api.delete(`/incidents/${id}/save`);
}

export function isIncidentSaved(id) {
  return api.get(`/incidents/${id}/saved`);
}

export function updateSavedNotes(id, notes) {
  return api.patch(`/incidents/${id}/save/notes`, { notes });
}
