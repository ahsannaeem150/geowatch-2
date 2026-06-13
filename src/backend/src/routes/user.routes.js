import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import { validateRequest } from '../middleware/validate-request.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { listUsersQuerySchema, updateUserBodySchema } from '../validators/user.schema.js';
import {
  listUsersController,
  getUserController,
  updateUserController,
  deleteUserController,
  resetPasswordController,
  getUserActivityController,
  getUserActivityPageForIncidentController,
} from '../controllers/user.controller.js';

const router = Router();

router.get(
  '/',
  authenticate,
  requireRole('super_admin'),
  validateRequest(listUsersQuerySchema, 'query'),
  asyncHandler(listUsersController)
);

router.get(
  '/:id',
  authenticate,
  requireRole('super_admin'),
  asyncHandler(getUserController)
);

router.patch(
  '/:id',
  authenticate,
  requireRole('super_admin'),
  validateRequest(updateUserBodySchema, 'body'),
  asyncHandler(updateUserController)
);

router.delete(
  '/:id',
  authenticate,
  requireRole('super_admin'),
  asyncHandler(deleteUserController)
);

router.post(
  '/:id/reset-password',
  authenticate,
  requireRole('super_admin'),
  asyncHandler(resetPasswordController)
);

router.get(
  '/:id/activity',
  authenticate,
  requireRole('super_admin'),
  asyncHandler(getUserActivityController)
);

router.get(
  '/:id/activity/page-for-incident',
  authenticate,
  requireRole('super_admin'),
  asyncHandler(getUserActivityPageForIncidentController)
);

export default router;
