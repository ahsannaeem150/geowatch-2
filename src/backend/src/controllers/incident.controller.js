import {
  listIncidents,
  searchIncidents,
  getEventById,
  createIncident,
  updateIncident,
  deleteIncident,
  resolveIncident,
} from '../services/incident.service.js';
import { createEventSource } from '../services/source.service.js';
import { broadcastEvent } from '../utils/sse-broadcast.js';

export async function getIncidents(req, res) {
  const filters = {
    date: req.query.date,
    dateFrom: req.query.dateFrom,
    dateTo: req.query.dateTo,
    categoryId: req.query.categoryId,
    severity: req.query.severity,
    status: req.query.status,
    viewport: req.query.viewport,
  };

  const { incidents, count, hasMore } = await listIncidents(filters);
  res.apiSuccess({
    incidents,
    count,
    hasMore,
    date: filters.date || filters.dateFrom || new Date().toISOString().slice(0, 10),
  });
}

export async function searchIncidentsController(req, res) {
  const filters = {
    q: req.query.q,
    date: req.query.date,
    dateFrom: req.query.dateFrom,
    dateTo: req.query.dateTo,
    categoryId: req.query.categoryId,
    severity: req.query.severity,
    status: req.query.status,
    viewport: req.query.viewport,
    limit: req.query.limit ? parseInt(req.query.limit, 10) : undefined,
    offset: req.query.offset ? parseInt(req.query.offset, 10) : undefined,
  };

  const { incidents, count, limit, offset, hasMore } = await searchIncidents(filters);
  res.apiSuccess({
    incidents,
    count,
    limit,
    offset,
    hasMore,
    query: filters.q,
  });
}

export async function getIncident(req, res) {
  const result = await getEventById(req.params.id);
  if (!result) {
    return res.apiError('Incident not found', 'NOT_FOUND', 404);
  }
  res.apiSuccess(result);
}

export async function createIncidentController(req, res) {
  const { sources, ...incidentData } = req.body;
  const incident = await createIncident(incidentData, req.user.id);

  // Create sources if provided
  if (Array.isArray(sources) && sources.length > 0) {
    for (const src of sources) {
      await createEventSource(
        incident.id,
        {
          sourceType: src.sourceType,
          sourceUrl: src.sourceUrl,
          description: src.description,
          displayOrder: src.displayOrder,
        },
        req.user.id
      );
    }
  }

  broadcastEvent({ type: 'incident_created', incident });
  res.apiSuccess({ incident }, 'Incident created successfully');
}

export async function updateIncidentController(req, res) {
  const incident = await updateIncident(req.params.id, req.body);
  if (!incident) {
    return res.apiError('Incident not found', 'NOT_FOUND', 404);
  }
  broadcastEvent({ type: 'incident_updated', incident });
  res.apiSuccess({ incident }, 'Incident updated successfully');
}

export async function deleteIncidentController(req, res) {
  const result = await deleteIncident(req.params.id);
  if (!result) {
    return res.apiError('Incident not found', 'NOT_FOUND', 404);
  }
  broadcastEvent({ type: 'incident_deleted', incidentId: req.params.id });
  res.apiSuccess({ deleted: true });
}

export async function resolveIncidentController(req, res) {
  const { resolvedAt } = req.body;
  const incident = await resolveIncident(req.params.id, req.user.id, resolvedAt);
  if (!incident) {
    return res.apiError('Incident not found', 'NOT_FOUND', 404);
  }
  broadcastEvent({ type: 'incident_resolved', incident });
  res.apiSuccess({ incident });
}
