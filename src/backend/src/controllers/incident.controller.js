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
    zoneCategoryId: req.query.zoneCategoryId,
    severity: req.query.severity,
    status: req.query.status,
    viewport: req.query.viewport,
    geometryType: req.query.geometryType,
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
    zoneCategoryId: req.query.zoneCategoryId,
    severity: req.query.severity,
    status: req.query.status,
    viewport: req.query.viewport,
    geometryType: req.query.geometryType,
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

  // Audit: public user viewed an incident (fire-and-forget, don't block response)
  if (req.user?.role === 'public_user') {
    auditLog(req, AUDIT_ACTIONS.PUBLIC_USER_INCIDENT_VIEWED, 'incident', req.params.id, {
      title: result.incident?.title || req.params.id,
    }, req.user, 'user', 'public_user');
  }

  res.apiSuccess(result);
}

export async function createIncidentController(req, res) {
  const { sources, ...incidentData } = req.body;
  const incident = await createIncident(incidentData, req.user.id);

  // Create sources if provided
  if (Array.isArray(sources) && sources.length > 0) {
    for (const src of sources) {
      const source = await createEventSource(
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

      await auditLog(req, AUDIT_ACTIONS.SOURCE_ADDED, 'source', source.id, {
        incidentId: incident.id,
        sourceType: source.source_type,
        verificationStatus: source.verification_status,
      });
    }
  }

  // Fetch enriched incident (with joined domain/category data) for broadcast
  const enriched = await getEventById(incident.id);
  broadcastEvent({ type: 'incident_created', incident: enriched?.incident || incident });

  await auditLog(req, AUDIT_ACTIONS.INCIDENT_CREATED, 'incident', incident.id, {
    title: incident.title,
    severity: incident.severity,
    categoryId: incident.category_id,
    geometryType: incident.geometry_type,
    latitude: incident.latitude,
    longitude: incident.longitude,
  });

  res.apiSuccess({ incident: enriched?.incident || incident }, 'Incident created successfully');
}

function toDateMs(v) {
  if (v === undefined || v === null || v === '') return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v.getTime();
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

function toNumber(v) {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

function computeChangedFields(original, body) {
  if (!original) {
    // Fallback when the original incident could not be fetched (e.g. hidden status).
    return Object.keys(body);
  }

  const fieldMap = {
    title: 'title',
    description: 'description',
    categoryId: 'category_id',
    zoneCategoryId: 'zone_category_id',
    severity: 'severity',
    startDate: 'start_date',
    endDate: 'end_date',
    locationContext: 'location_context',
    verificationOverride: 'verification_override',
    latitude: 'latitude',
    longitude: 'longitude',
    geometryType: 'geometry_type',
    geometry: 'geometry',
  };

  const changed = [];
  for (const [bodyKey, dbKey] of Object.entries(fieldMap)) {
    if (!(bodyKey in body)) continue;

    let newVal = body[bodyKey];
    let oldVal = original[dbKey];

    if (bodyKey === 'startDate' || bodyKey === 'endDate') {
      newVal = toDateMs(newVal);
      oldVal = toDateMs(oldVal);
    } else if (['severity', 'categoryId', 'zoneCategoryId', 'latitude', 'longitude'].includes(bodyKey)) {
      newVal = toNumber(newVal);
      oldVal = toNumber(oldVal);
    } else if (typeof newVal === 'string') {
      newVal = newVal.trim();
    }

    if (typeof oldVal === 'string') {
      oldVal = oldVal.trim();
    }

    // Treat null / undefined / empty string as equivalent for non-geometry fields
    if (bodyKey !== 'geometry') {
      const isEmpty = (v) => v === null || v === undefined || v === '';
      if (isEmpty(newVal) && isEmpty(oldVal)) continue;
    }

    if (JSON.stringify(newVal) !== JSON.stringify(oldVal)) {
      changed.push(bodyKey);
    }
  }
  return changed;
}

export async function updateIncidentController(req, res) {
  const originalEvent = await getEventById(req.params.id);
  const incident = await updateIncident(req.params.id, req.body);
  if (!incident) {
    return res.apiError('Incident not found', 'NOT_FOUND', 404);
  }

  // Fetch enriched incident (with joined domain/category data + computed verification) for broadcast
  const enriched = await getEventById(req.params.id);
  broadcastEvent({ type: 'incident_updated', incident: enriched?.incident || incident });

  const changedFields = computeChangedFields(originalEvent?.incident, req.body);
  await auditLog(req, AUDIT_ACTIONS.INCIDENT_UPDATED, 'incident', req.params.id, {
    title: incident.title,
    changedFields: changedFields.length > 0 ? changedFields : ['updated'],
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
  // Capture as much metadata as possible before the row is permanently deleted.
  const snapshot = await getDeletedIncidentById(req.params.id);
  const result = await purgeIncident(req.params.id, req.user.id);
  if (!result) {
    return res.apiError('Incident not found', 'NOT_FOUND', 404);
  }
  broadcastEvent({ type: 'incident_deleted', incidentId: req.params.id });

  await auditLog(req, AUDIT_ACTIONS.INCIDENT_PURGED, 'incident', req.params.id, {
    title: snapshot?.title || req.params.id,
    description: snapshot?.description || '',
    severity: snapshot?.severity,
    status: snapshot?.status,
    startDate: snapshot?.start_date,
    endDate: snapshot?.end_date,
    geometryType: snapshot?.geometry_type,
    categoryName: snapshot?.category_name,
    domainName: snapshot?.domain_name,
    domainColor: snapshot?.domain_color,
    locationContext: snapshot?.location_context,
    originalStatus: snapshot?.original_status,
    deletedAt: snapshot?.deleted_at,
    purgedAt: new Date().toISOString(),
  });

  res.apiSuccess({ purged: true, incidentId: req.params.id }, 'Incident permanently deleted');
}

export async function listDeletedIncidentsController(req, res) {
  const filters = {
    page: req.query.page,
    limit: req.query.limit,
    dateFrom: req.query.dateFrom,
    dateTo: req.query.dateTo,
    search: req.query.search,
  };
  const result = await listDeletedIncidents(filters);
  res.apiSuccess(result);
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
