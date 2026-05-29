import {
  getDomains,
  getDomainWithCategories,
  getAllCategories,
  createDomain,
  updateDomain,
  getDomainById,
  deleteDomain,
  getDomainCategoryCount,
  createCategory,
  updateCategory,
  getCategoryById,
  deleteCategory,
  getCategoryIncidentCount,
  getCategoryZoneCount,
} from '../services/category.service.js';
import { auditLog } from '../utils/audit-log.js';
import { AUDIT_ACTIONS } from '../utils/audit-actions.js';

// ─── Read Controllers (existing) ───

export async function getDomainsController(req, res) {
  const domains = await getDomains();
  res.apiSuccess({ domains });
}

export async function getDomainController(req, res) {
  const domain = await getDomainWithCategories(req.params.slug);
  if (!domain) {
    return res.apiError('Domain not found', 'NOT_FOUND', 404);
  }
  res.apiSuccess({ domain });
}

export async function getAllCategoriesController(req, res) {
  const categories = await getAllCategories();
  res.apiSuccess({ categories });
}

// ─── Domain Mutations ───

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

  res.apiSuccess({ domain }, 'Domain created successfully');
}

export async function updateDomainController(req, res) {
  const domain = await getDomainById(req.params.id);
  if (!domain) {
    return res.apiError('Domain not found', 'NOT_FOUND', 404);
  }

  // If slug is changing, check for conflicts
  if (req.body.slug && req.body.slug !== domain.slug) {
    const existing = await getDomainWithCategories(req.body.slug);
    if (existing) {
      return res.apiError('Domain slug already exists', 'CONFLICT', 409);
    }
  }

  const updated = await updateDomain(req.params.id, req.body);

  await auditLog(req, AUDIT_ACTIONS.SETTING_UPDATED, 'domain', updated.id, {
    name: updated.name,
    changedFields: Object.keys(req.body),
    action: 'updated',
  });

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
      { categoryCount: catCount }
    );
  }

  await deleteDomain(req.params.id);

  await auditLog(req, AUDIT_ACTIONS.SETTING_UPDATED, 'domain', req.params.id, {
    name: domain.name,
    action: 'deleted',
  });

  res.apiSuccess({ deleted: true });
}

// ─── Category Mutations ───

export async function createCategoryController(req, res) {
  const { domainId, slug } = req.body;

  // Check if domain exists
  const domain = await getDomainById(domainId);
  if (!domain) {
    return res.apiError('Domain not found', 'NOT_FOUND', 404);
  }

  // Check slug uniqueness within domain
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

  res.apiSuccess({ category }, 'Category created successfully');
}

export async function updateCategoryController(req, res) {
  const category = await getCategoryById(req.params.id);
  if (!category) {
    return res.apiError('Category not found', 'NOT_FOUND', 404);
  }

  // If slug is changing, check for conflicts within the domain
  if (req.body.slug && req.body.slug !== category.slug) {
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
    action: 'updated',
  });

  res.apiSuccess({ category: updated }, 'Category updated successfully');
}

export async function deleteCategoryController(req, res) {
  const category = await getCategoryById(req.params.id);
  if (!category) {
    return res.apiError('Category not found', 'NOT_FOUND', 404);
  }

  const incidentCount = await getCategoryIncidentCount(req.params.id);
  const zoneCount = await getCategoryZoneCount(req.params.id);

  if (incidentCount > 0 || zoneCount > 0) {
    return res.apiError(
      `Cannot delete category with ${incidentCount} incidents and ${zoneCount} zones. Reassign or delete dependent records first.`,
      'CONFLICT',
      409,
      { incidentCount, zoneCount }
    );
  }

  await deleteCategory(req.params.id);

  await auditLog(req, AUDIT_ACTIONS.SETTING_UPDATED, 'category', req.params.id, {
    name: category.name,
    action: 'deleted',
  });

  res.apiSuccess({ deleted: true });
}
