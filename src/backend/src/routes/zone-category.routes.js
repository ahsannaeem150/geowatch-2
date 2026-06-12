import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import { validateRequest } from '../middleware/validate-request.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { adminWriteLimiter } from '../middleware/rate-limiter.js';
import {
  createZoneCategorySchema,
  updateZoneCategorySchema,
} from '../validators/zone-category.schema.js';

import {
  getZoneCategoriesController,
  getAllZoneCategoriesController,
  getZoneCategoryController,
  createZoneCategoryController,
  updateZoneCategoryController,
  deleteZoneCategoryController,
} from '../controllers/zone-category.controller.js';

const router = Router();

// Public / admin routes
router.get('/', asyncHandler(getZoneCategoriesController));

// Superadmin routes
router.get(
  '/all',
  authenticate,
  requireRole(['super_admin']),
  asyncHandler(getAllZoneCategoriesController)
);

router.get('/:id', asyncHandler(getZoneCategoryController));

router.post(
  '/',
  authenticate,
  requireRole(['super_admin']),
  adminWriteLimiter,
  validateRequest(createZoneCategorySchema, 'body'),
  asyncHandler(createZoneCategoryController)
);

router.patch(
  '/:id',
  authenticate,
  requireRole(['super_admin']),
  adminWriteLimiter,
  validateRequest(updateZoneCategorySchema, 'body'),
  asyncHandler(updateZoneCategoryController)
);

router.delete(
  '/:id',
  authenticate,
  requireRole(['super_admin']),
  adminWriteLimiter,
  asyncHandler(deleteZoneCategoryController)
);

export default router;
