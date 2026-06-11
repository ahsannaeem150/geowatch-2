import {
  listActiveZoneCategories,
  listAllZoneCategories,
  getZoneCategoryById,
  createZoneCategory,
  updateZoneCategory,
  getZoneCategoryIncidentCount,
  deleteZoneCategory,
} from '../services/zone-category.service.js';
import { auditLog } from '../utils/audit-log.js';
import { AUDIT_ACTIONS } from '../utils/audit-actions.js';

export async function getZoneCategoriesController(req, res) {
  const categories = await listActiveZoneCategories();
  res.apiSuccess({ categories });
}

export async function getAllZoneCategoriesController(req, res) {
  const categories = await listAllZoneCategories();
  res.apiSuccess({ categories });
}

export async function getZoneCategoryController(req, res) {
  const category = await getZoneCategoryById(req.params.id);
  if (!category) {
    return res.apiError('Zone category not found', 'NOT_FOUND', 404);
  }
  res.apiSuccess({ category });
}

export async function createZoneCategoryController(req, res) {
  const category = await createZoneCategory(req.body);

  await auditLog(req, AUDIT_ACTIONS.SETTING_UPDATED, 'zone_category', category.id, {
    name: category.name,
    slug: category.slug,
    action: 'created',
  });

  res.apiSuccess({ category }, 'Zone category created successfully');
}

export async function updateZoneCategoryController(req, res) {
  const category = await updateZoneCategory(req.params.id, req.body);
  if (!category) {
    return res.apiError('Zone category not found', 'NOT_FOUND', 404);
  }

  await auditLog(req, AUDIT_ACTIONS.SETTING_UPDATED, 'zone_category', req.params.id, {
    name: category.name,
    changedFields: Object.keys(req.body),
    action: 'updated',
  });

  res.apiSuccess({ category }, 'Zone category updated successfully');
}

export async function deleteZoneCategoryController(req, res) {
  const category = await getZoneCategoryById(req.params.id);
  if (!category) {
    return res.apiError('Zone category not found', 'NOT_FOUND', 404);
  }

  const incidentCount = await getZoneCategoryIncidentCount(req.params.id);
  if (incidentCount > 0) {
    return res.apiError(
      `Cannot delete zone category with ${incidentCount} dependent zone(s). Reassign or delete dependent zones first.`,
      'CONFLICT',
      409,
      { incidentCount }
    );
  }

  await deleteZoneCategory(req.params.id);

  await auditLog(req, AUDIT_ACTIONS.SETTING_UPDATED, 'zone_category', req.params.id, {
    name: category.name,
    action: 'deleted',
  });

  res.apiSuccess({ deleted: true }, 'Zone category deleted successfully');
}
