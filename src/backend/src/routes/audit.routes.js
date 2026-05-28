import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import { validateRequest } from '../middleware/validate-request.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { listAuditQuerySchema } from '../validators/audit.schema.js';
import {
  listAuditController,
  getAuditSummaryController,
} from '../controllers/audit.controller.js';

const router = Router();

router.get(
  '/',
  authenticate,
  requireRole('super_admin'),
  validateRequest(listAuditQuerySchema, 'query'),
  asyncHandler(listAuditController)
);

router.get(
  '/summary',
  authenticate,
  requireRole('super_admin'),
  asyncHandler(getAuditSummaryController)
);

export default router;
