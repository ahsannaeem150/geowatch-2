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
  mergeDomainSchema,
  mergeCategorySchema,
} from '../validators/category.schema.js';
import {
  getDomainsController,
  getAllDomainsController,
  getDomainController,
  getAllCategoriesController,
  getAllCategoriesAdminController,
  getDomainDependenciesController,
  getCategoryDependenciesController,
  createDomainController,
  updateDomainController,
  deleteDomainController,
  mergeDomainController,
  createCategoryController,
  updateCategoryController,
  deleteCategoryController,
  mergeCategoryController,
} from '../controllers/category.controller.js';

const router = Router();

router.get('/domains', asyncHandler(getDomainsController));
router.get('/domains/all', authenticate, requireRole('super_admin'), asyncHandler(getAllDomainsController));
router.get('/domains/:slug', asyncHandler(getDomainController));
router.get('/', asyncHandler(getAllCategoriesController));
router.get('/all', authenticate, requireRole('super_admin'), asyncHandler(getAllCategoriesAdminController));
router.get('/domains/:id/dependencies', authenticate, requireRole('super_admin'), asyncHandler(getDomainDependenciesController));
router.get('/:id/dependencies', authenticate, requireRole('super_admin'), asyncHandler(getCategoryDependenciesController));

router.post(
  '/domains',
  authenticate,
  requireRole('super_admin'),
  validateRequest(createDomainSchema, 'body'),
  asyncHandler(createDomainController),
);

router.patch(
  '/domains/:id',
  authenticate,
  requireRole('super_admin'),
  validateRequest(updateDomainSchema, 'body'),
  asyncHandler(updateDomainController),
);

router.delete(
  '/domains/:id',
  authenticate,
  requireRole('super_admin'),
  asyncHandler(deleteDomainController),
);

router.post(
  '/domains/:id/merge',
  authenticate,
  requireRole('super_admin'),
  validateRequest(mergeDomainSchema, 'body'),
  asyncHandler(mergeDomainController),
);

router.post(
  '/',
  authenticate,
  requireRole('super_admin'),
  validateRequest(createCategorySchema, 'body'),
  asyncHandler(createCategoryController),
);

router.patch(
  '/:id',
  authenticate,
  requireRole('super_admin'),
  validateRequest(updateCategorySchema, 'body'),
  asyncHandler(updateCategoryController),
);

router.delete(
  '/:id',
  authenticate,
  requireRole('super_admin'),
  asyncHandler(deleteCategoryController),
);

router.post(
  '/:id/merge',
  authenticate,
  requireRole('super_admin'),
  validateRequest(mergeCategorySchema, 'body'),
  asyncHandler(mergeCategoryController),
);

export default router;
