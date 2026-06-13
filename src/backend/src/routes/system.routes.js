import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { getHealthController, getOEmbedController } from '../controllers/system.controller.js';

const router = Router();

router.get(
  '/health',
  authenticate,
  requireRole('super_admin'),
  asyncHandler(getHealthController)
);

router.get(
  '/oembed',
  authenticate,
  requireRole(['super_admin', 'admin']),
  asyncHandler(getOEmbedController)
);

export default router;
