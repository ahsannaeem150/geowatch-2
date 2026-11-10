import {
  getDomains,
  getDomainWithCategories,
  getAllCategories,
  createDomain,
  updateDomain,
  getDomainById,
  deleteDomain,
  getDomainCategoryCount,
  getDomainIncidentCount,
  createCategory,
  updateCategory,
  getCategoryById,
  deleteCategory,
  getCategoryIncidentCount,
  mergeCategory,
  mergeDomain,
} from '../services/category.service.js';
import { auditLog } from '../utils/audit-log.js';
import { AUDIT_ACTIONS } from '../utils/audit-actions.js';
import { broadcastEvent } from '../utils/sse-broadcast.js';

function notifyTaxonomy(action, entity, id) {
  broadcastEvent({ type: 'taxonomy_updated', action, entity, id });
}

function noStore(res) {
  res.setHeader('Cache-Control', 'no-store');
}

export async function getDomainsController(req, res) {
  noStore(res);
  const domains = await getDomains();
  res.apiSuccess({ domains });
}

export async function getAllDomainsController(req, res) {
  noStore(res);
  const domains = await getDomains({ includeInactive: true });
  res.apiSuccess({ domains });
}

export async function getDomainController(req, res) {
  noStore(res);
  const domain = await getDomainWithCategories(req.params.slug);
  if (!domain) {
    return res.apiError('Domain not found', 'NOT_FOUND', 404);
  }
  res.apiSuccess({ domain });
}

export async function getAllCategoriesController(req, res) {
  noStore(res);
  const categories = await getAllCategories();
  res.apiSuccess({ categories });
}

export async function getAllCategoriesAdminController(req, res) {
  noStore(res);
  const categories = await getAllCategories({ includeInactive: true });
  res.apiSuccess({ categories });
}

export async function getDomainDependenciesController(req, res) {
  const domain = await getDomainById(req.params.id);
  if (!domain) return res.apiError('Domain not found', 'NOT_FOUND', 404);
  const [categoryCount, incidentCount] = await Promise.all([
    getDomainCategoryCount(req.params.id),
    getDomainIncidentCount(req.params.id),
  ]);
  res.apiSuccess({ categoryCount, incidentCount });
}

export async function getCategoryDependenciesController(req, res) {
  const category = await getCategoryById(req.params.id);
  if (!category) return res.apiError('Category not found', 'NOT_FOUND', 404);
  const incidentCount = await getCategoryIncidentCount(req.params.id);
  res.apiSuccess({ incidentCount });
}

export async function createDomainController(req, res) {
  const existing = await getDomainWithCategories(req.body.slug);
  if (existing) {
    return res.apiError('Domain slug already exists', 'CONFLICT', 409);
  }

  const domain = await createDomain(req.body);
  await auditLog(req, AUDIT_ACTIONS.SETTING_UPDATED, 'domain', domain.id, {
    name: domain.name,
    slug: domain.slug,
    color: domain.color,
    action: 'created',
  });
  notifyTaxonomy('created', 'domain', domain.id);
  res.apiSuccess({ domain }, 'Domain created successfully');
}

export async function updateDomainController(req, res) {
  const domain = await getDomainById(req.params.id);
  if (!domain) {
    return res.apiError('Domain not found', 'NOT_FOUND', 404);
  }

  if (req.body.slug && req.body.slug !== domain.slug) {
    const categoryCount = await getDomainCategoryCount(req.params.id);
    if (categoryCount > 0) {
      return res.apiError(
        'Domain slug is locked once categories exist. Rename the domain instead, or merge it into another domain.',
        'CONFLICT',
        409,
      );
    }
    const existing = await getDomainWithCategories(req.body.slug);
    if (existing) {
      return res.apiError('Domain slug already exists', 'CONFLICT', 409);
    }
  }

  const updated = await updateDomain(req.params.id, req.body);
  await auditLog(req, AUDIT_ACTIONS.SETTING_UPDATED, 'domain', updated.id, {
    name: updated.name,
    changedFields: Object.keys(req.body),
    action: updated.is_active === false ? 'archived' : updated.is_active === true ? 'restored' : 'updated',
  });
  notifyTaxonomy(updated.is_active === false ? 'archived' : updated.is_active === true ? 'restored' : 'updated', 'domain', updated.id);
  res.apiSuccess({ domain: updated }, 'Domain updated successfully');
}

export async function deleteDomainController(req, res) {
  const domain = await getDomainById(req.params.id);
  if (!domain) {
    return res.apiError('Domain not found', 'NOT_FOUND', 404);
  }

  const catCount = await getDomainCategoryCount(req.params.id);
  if (catCount > 0) {
    return res.apiError(
      `Cannot delete domain with ${catCount} categories. Move or delete categories first.`,
      'CONFLICT',
      409,
      { categoryCount: catCount },
    );
  }

  await deleteDomain(req.params.id);
  await auditLog(req, AUDIT_ACTIONS.SETTING_UPDATED, 'domain', req.params.id, {
    name: domain.name,
    action: 'deleted',
  });
  notifyTaxonomy('deleted', 'domain', req.params.id);
  res.apiSuccess({ deleted: true });
}

export async function mergeDomainController(req, res) {
  const result = await mergeDomain(req.params.id, req.body.targetDomainId);
  await auditLog(req, AUDIT_ACTIONS.SETTING_UPDATED, 'domain', req.params.id, {
    name: result.source.name,
    targetDomainId: result.target.id,
    targetDomainName: result.target.name,
    categoryCount: result.categoryCount,
    incidentCount: result.incidentCount,
    action: 'merged',
  });
  notifyTaxonomy('merged', 'domain', req.params.id);
  res.apiSuccess({
    deleted: true,
    targetDomain: result.target,
    categoryCount: result.categoryCount,
    incidentCount: result.incidentCount,
  }, 'Domain merged successfully');
}

export async function createCategoryController(req, res) {
  const { domainId, slug } = req.body;
  const domain = await getDomainById(domainId);
  if (!domain) {
    return res.apiError('Domain not found', 'NOT_FOUND', 404);
  }

  const domainData = await getDomainWithCategories(domain.slug);
  const slugExists = domainData.categories.some((c) => c.slug === slug);
  if (slugExists) {
    return res.apiError('Category slug already exists in this domain', 'CONFLICT', 409);
  }

  const category = await createCategory(req.body);
  await auditLog(req, AUDIT_ACTIONS.SETTING_UPDATED, 'category', category.id, {
    name: category.name,
    slug: category.slug,
    domainId: category.domain_id,
    action: 'created',
  });
  notifyTaxonomy('created', 'category', category.id);
  res.apiSuccess({ category }, 'Category created successfully');
}

export async function updateCategoryController(req, res) {
  const category = await getCategoryById(req.params.id);
  if (!category) {
    return res.apiError('Category not found', 'NOT_FOUND', 404);
  }

  if (req.body.slug && req.body.slug !== category.slug) {
    const incidentCount = await getCategoryIncidentCount(req.params.id);
    if (incidentCount > 0) {
      return res.apiError(
        'Category slug is locked while incidents reference it. Reassign those incidents or merge the category instead.',
        'CONFLICT',
        409,
      );
    }
    const domain = await getDomainById(req.body.domainId || category.domain_id);
    if (domain) {
      const domainData = await getDomainWithCategories(domain.slug);
      const slugExists = domainData.categories.some((c) => c.slug === req.body.slug && c.id !== req.params.id);
      if (slugExists) {
        return res.apiError('Category slug already exists in this domain', 'CONFLICT', 409);
      }
    }
  }

  const updated = await updateCategory(req.params.id, req.body);
  await auditLog(req, AUDIT_ACTIONS.SETTING_UPDATED, 'category', updated.id, {
    name: updated.name,
    changedFields: Object.keys(req.body),
    action: updated.is_active === false ? 'archived' : updated.is_active === true ? 'restored' : 'updated',
  });
  notifyTaxonomy(updated.is_active === false ? 'archived' : updated.is_active === true ? 'restored' : 'updated', 'category', updated.id);
  res.apiSuccess({ category: updated }, 'Category updated successfully');
}

export async function deleteCategoryController(req, res) {
  const category = await getCategoryById(req.params.id);
  if (!category) {
    return res.apiError('Category not found', 'NOT_FOUND', 404);
  }

  const incidentCount = await getCategoryIncidentCount(req.params.id);
  if (incidentCount > 0) {
    return res.apiError(
      `Cannot delete category with ${incidentCount} dependent incident(s). Reassign or delete dependent records first.`,
      'CONFLICT',
      409,
      { incidentCount },
    );
  }

  await deleteCategory(req.params.id);
  await auditLog(req, AUDIT_ACTIONS.SETTING_UPDATED, 'category', req.params.id, {
    name: category.name,
    action: 'deleted',
  });
  notifyTaxonomy('deleted', 'category', req.params.id);
  res.apiSuccess({ deleted: true });
}

export async function mergeCategoryController(req, res) {
  const result = await mergeCategory(req.params.id, req.body.targetCategoryId);
  await auditLog(req, AUDIT_ACTIONS.SETTING_UPDATED, 'category', req.params.id, {
    name: result.source.name,
    targetCategoryId: result.target.id,
    targetCategoryName: result.target.name,
    incidentCount: result.incidentCount,
    action: 'merged',
  });
  notifyTaxonomy('merged', 'category', req.params.id);
  res.apiSuccess({
    deleted: true,
    targetCategory: result.target,
    incidentCount: result.incidentCount,
  }, 'Category merged successfully');
}
