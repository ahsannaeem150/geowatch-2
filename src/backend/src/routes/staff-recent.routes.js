import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import { validateRequest } from '../middleware/validate-request.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import {
  listStaffRecentsController,
  recordStaffRecentController,
  clearStaffRecentsController,
} from '../controllers/staff-recent.controller.js';
import {
  listStaffRecentsQuerySchema,
  recordStaffRecentBodySchema,
  clearStaffRecentsQuerySchema,
} from '../validators/staff-recent.schema.js';

const router = Router();
const staffRoleMiddleware = requireRole(['admin', 'super_admin', 'viewer']);

router.get(
  '/',
  authenticate,
  staffRoleMiddleware,
  validateRequest(listStaffRecentsQuerySchema, 'query'),
  asyncHandler(listStaffRecentsController)
);

router.post(
  '/',
  authenticate,
  staffRoleMiddleware,
  validateRequest(recordStaffRecentBodySchema, 'body'),
  asyncHandler(recordStaffRecentController)
);

router.delete(
  '/',
  authenticate,
  staffRoleMiddleware,
  validateRequest(clearStaffRecentsQuerySchema, 'query'),
  asyncHandler(clearStaffRecentsController)
);

export default router;
