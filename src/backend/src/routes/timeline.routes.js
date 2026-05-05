import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import { validateRequest } from '../middleware/validate-request.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { adminWriteLimiter } from '../middleware/rate-limiter.js';
import { createTimelineSchema } from '../validators/timeline.schema.js';
import { createTimelineController } from '../controllers/timeline.controller.js';

const router = Router({ mergeParams: true });

router.post(
  '/',
  authenticate,
  requireRole(['admin', 'super_admin']),
  adminWriteLimiter,
  validateRequest(createTimelineSchema, 'body'),
  asyncHandler(createTimelineController)
);

export default router;
