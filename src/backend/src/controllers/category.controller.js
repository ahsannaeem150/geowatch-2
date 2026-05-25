import { getDomains, getDomainWithCategories, getAllCategories } from '../services/category.service.js';

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
