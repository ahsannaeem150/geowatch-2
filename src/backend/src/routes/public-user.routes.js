import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { asyncHandler } from '../utils/async-handler.js';
import { validateRequest } from '../middleware/validate-request.js';
import { z } from 'zod';
import {
  listPublicUsersController,
  getPublicUserController,
  updatePublicUserController,
  getPublicUserActivityController,
} from '../controllers/public-user.controller.js';

const router = Router();

// All public-user routes are super_admin only
router.use(authenticate, requireRole('super_admin'));

const listQuerySchema = z.object({
  search: z.string().optional(),
  isActive: z.enum(['true', 'false']).optional().transform((val) => {
    if (val === undefined) return undefined;
    return val === 'true';
  }),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(25),
});

const updateBodySchema = z.object({
  isActive: z.boolean(),
});

router.get('/', validateRequest(listQuerySchema, 'query'), asyncHandler(listPublicUsersController));
router.get('/:id', asyncHandler(getPublicUserController));
router.get('/:id/activity', asyncHandler(getPublicUserActivityController));
router.patch('/:id', validateRequest(updateBodySchema, 'body'), asyncHandler(updatePublicUserController));

export default router;
