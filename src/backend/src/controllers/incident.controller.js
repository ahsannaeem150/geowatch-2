import {
  listIncidents,
  searchIncidents,
  getEventById,
  createIncident,
  updateIncident,
  deleteIncident,
  resolveIncident,
  restoreIncident,
  purgeIncident,
  listDeletedIncidents,
  getDeletedIncidentById,
} from '../services/incident.service.js';
import { createEventSource } from '../services/source.service.js';
import { broadcastEvent } from '../utils/sse-broadcast.js';
import { auditLog } from '../utils/audit-log.js';
import { AUDIT_ACTIONS } from '../utils/audit-actions.js';

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
          verificationStatus: src.verificationStatus,
        },
        req.user.id
      );
    }
  }

  // Fetch enriched incident (with joined domain/category data) for broadcast
  const enriched = await getEventById(incident.id);
  broadcastEvent({ type: 'incident_created', incident: enriched?.incident || incident });

  await auditLog(req, AUDIT_ACTIONS.INCIDENT_CREATED, 'incident', incident.id, {
    title: incident.title,
    severity: incident.severity,
    categoryId: incident.category_id,
    latitude: incident.latitude,
    longitude: incident.longitude,
  });

  res.apiSuccess({ incident: enriched?.incident || incident }, 'Incident created successfully');
}

export async function updateIncidentController(req, res) {
  const incident = await updateIncident(req.params.id, req.body);
  if (!incident) {
    return res.apiError('Incident not found', 'NOT_FOUND', 404);
  }

  // Fetch enriched incident (with joined domain/category data + computed verification) for broadcast
  const enriched = await getEventById(req.params.id);
  broadcastEvent({ type: 'incident_updated', incident: enriched?.incident || incident });

  await auditLog(req, AUDIT_ACTIONS.INCIDENT_UPDATED, 'incident', req.params.id, {
    title: incident.title,
    changedFields: Object.keys(req.body),
  });

  res.apiSuccess({ incident: enriched?.incident || incident }, 'Incident updated successfully');
}

export async function deleteIncidentController(req, res) {
  const incident = await deleteIncident(req.params.id, req.user.id);
  if (!incident) {
    return res.apiError('Incident not found', 'NOT_FOUND', 404);
  }
  broadcastEvent({ type: 'incident_deleted', incidentId: req.params.id });

  await auditLog(req, AUDIT_ACTIONS.INCIDENT_DELETED, 'incident', req.params.id, {
    title: incident.title,
    deletedAt: new Date().toISOString(),
    originalStatus: incident.status === 'hidden' ? 'active' : incident.status,
  });

  res.apiSuccess({ deleted: true, incidentId: req.params.id }, 'Incident moved to recycle bin');
}

export async function restoreIncidentController(req, res) {
  const incident = await restoreIncident(req.params.id, req.user.id);
  if (!incident) {
    return res.apiError('Incident not found or not in recycle bin', 'NOT_FOUND', 404);
  }
  broadcastEvent({ type: 'incident_created', incident });

  await auditLog(req, AUDIT_ACTIONS.INCIDENT_RESTORED, 'incident', req.params.id, {
    title: incident.title,
    restoredAt: new Date().toISOString(),
  });

  res.apiSuccess({ incident }, 'Incident restored successfully');
}

export async function purgeIncidentController(req, res) {
  const result = await purgeIncident(req.params.id, req.user.id);
  if (!result) {
    return res.apiError('Incident not found', 'NOT_FOUND', 404);
  }
  broadcastEvent({ type: 'incident_deleted', incidentId: req.params.id });

  await auditLog(req, AUDIT_ACTIONS.INCIDENT_PURGED, 'incident', req.params.id, {
    purgedAt: new Date().toISOString(),
  });

  res.apiSuccess({ purged: true, incidentId: req.params.id }, 'Incident permanently deleted');
}

export async function listDeletedIncidentsController(req, res) {
  const incidents = await listDeletedIncidents();
  res.apiSuccess({ incidents, count: incidents.length });
}

export async function getDeletedIncidentController(req, res) {
  const incident = await getDeletedIncidentById(req.params.id);
  if (!incident) {
    return res.apiError('Incident not found in recycle bin', 'NOT_FOUND', 404);
  }
  res.apiSuccess({ incident });
}

export async function resolveIncidentController(req, res) {
  const { resolvedAt } = req.body;
  const incident = await resolveIncident(req.params.id, req.user.id, resolvedAt);
  if (!incident) {
    return res.apiError('Incident not found', 'NOT_FOUND', 404);
  }

  // Fetch enriched incident for broadcast
  const enriched = await getEventById(req.params.id);
  broadcastEvent({ type: 'incident_resolved', incident: enriched?.incident || incident });

  await auditLog(req, AUDIT_ACTIONS.INCIDENT_RESOLVED, 'incident', req.params.id, {
    title: incident.title,
    resolvedAt: incident.resolved_at,
    resolvedBy: req.user.id,
  });

  res.apiSuccess({ incident: enriched?.incident || incident });
}
