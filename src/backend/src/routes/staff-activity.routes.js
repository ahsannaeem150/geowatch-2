import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import { validateRequest } from '../middleware/validate-request.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { listStaffActivityController } from '../controllers/staff-activity.controller.js';
import { listStaffActivityQuerySchema } from '../validators/staff-activity.schema.js';

const router = Router();

router.get(
  '/',
  authenticate,
  requireRole(['admin', 'super_admin', 'viewer']),
  validateRequest(listStaffActivityQuerySchema, 'query'),
  asyncHandler(listStaffActivityController)
);

export default router;
