import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import { validateRequest } from '../middleware/validate-request.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import {
  createDomainSchema,
  updateDomainSchema,
  createCategorySchema,
  updateCategorySchema,
} from '../validators/category.schema.js';
import {
  getDomainsController,
  getDomainController,
  getAllCategoriesController,
  createDomainController,
  updateDomainController,
  deleteDomainController,
  createCategoryController,
  updateCategoryController,
  deleteCategoryController,
} from '../controllers/category.controller.js';

const router = Router();

// Public read routes
router.get('/domains', asyncHandler(getDomainsController));
router.get('/domains/:slug', asyncHandler(getDomainController));
router.get('/', asyncHandler(getAllCategoriesController));

// Super admin only mutations
router.post(
  '/domains',
  authenticate,
  requireRole('super_admin'),
  validateRequest(createDomainSchema, 'body'),
  asyncHandler(createDomainController)
);

router.patch(
  '/domains/:id',
  authenticate,
  requireRole('super_admin'),
  validateRequest(updateDomainSchema, 'body'),
  asyncHandler(updateDomainController)
);

router.delete(
  '/domains/:id',
  authenticate,
  requireRole('super_admin'),
  asyncHandler(deleteDomainController)
);

router.post(
  '/',
  authenticate,
  requireRole('super_admin'),
  validateRequest(createCategorySchema, 'body'),
  asyncHandler(createCategoryController)
);

router.patch(
  '/:id',
  authenticate,
  requireRole('super_admin'),
  validateRequest(updateCategorySchema, 'body'),
  asyncHandler(updateCategoryController)
);

router.delete(
  '/:id',
  authenticate,
  requireRole('super_admin'),
  asyncHandler(deleteCategoryController)
);

export default router;
