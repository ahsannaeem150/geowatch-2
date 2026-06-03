import {
  listZones,
  getZoneById,
  createZone,
  updateZone,
  deleteZone,
} from '../services/zone.service.js';
import { broadcastEvent } from '../utils/sse-broadcast.js';
import { auditLog } from '../utils/audit-log.js';
import { AUDIT_ACTIONS } from '../utils/audit-actions.js';

export async function getZones(req, res) {
  const zones = await listZones();
  res.apiSuccess({ zones });
}

export async function getZone(req, res) {
  const zone = await getZoneById(req.params.id);
  if (!zone) {
    return res.apiError('Zone not found', 'NOT_FOUND', 404);
  }
  res.apiSuccess({ zone });
}

export async function createZoneController(req, res) {
  const zone = await createZone(req.body, req.user.id);

  broadcastEvent({ type: 'zone_created', zone });

  await auditLog(req, AUDIT_ACTIONS.ZONE_CREATED, 'zone', zone.id, {
    name: zone.name,
    category: zone.category,
  });

  res.apiSuccess({ zone }, 'Zone created successfully');
}

export async function updateZoneController(req, res) {
  const zone = await updateZone(req.params.id, req.body);
  if (!zone) {
    return res.apiError('Zone not found', 'NOT_FOUND', 404);
  }

  broadcastEvent({ type: 'zone_updated', zone });

  await auditLog(req, AUDIT_ACTIONS.ZONE_UPDATED, 'zone', req.params.id, {
    name: zone.name,
    changedFields: Object.keys(req.body),
  });

  res.apiSuccess({ zone }, 'Zone updated successfully');
}

export async function deleteZoneController(req, res) {
  const result = await deleteZone(req.params.id);
  if (!result) {
    return res.apiError('Zone not found', 'NOT_FOUND', 404);
  }

  broadcastEvent({ type: 'zone_deleted', zoneId: req.params.id });

  await auditLog(req, AUDIT_ACTIONS.ZONE_DELETED, 'zone', req.params.id, {
    deletedAt: new Date().toISOString(),
  });

  res.apiSuccess({ deleted: true, zoneId: req.params.id }, 'Zone deleted successfully');
}
