import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import { validateRequest } from '../middleware/validate-request.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { adminWriteLimiter } from '../middleware/rate-limiter.js';
import { createZoneSchema, updateZoneSchema } from '../validators/zone.schema.js';

import {
  getZones,
  getZone,
  getZoneIncidentsController,
  createZoneController,
  updateZoneController,
  deleteZoneController,
} from '../controllers/zone.controller.js';

const router = Router();

// Public routes
router.get('/', asyncHandler(getZones));
router.get('/:id', asyncHandler(getZone));
router.get('/:id/incidents', asyncHandler(getZoneIncidentsController));

// Admin routes
router.post(
  '/',
  authenticate,
  requireRole(['admin', 'super_admin']),
  adminWriteLimiter,
  validateRequest(createZoneSchema, 'body'),
  asyncHandler(createZoneController)
);

router.patch(
  '/:id',
  authenticate,
  requireRole(['admin', 'super_admin']),
  adminWriteLimiter,
  validateRequest(updateZoneSchema, 'body'),
  asyncHandler(updateZoneController)
);

router.delete(
  '/:id',
  authenticate,
  requireRole(['admin', 'super_admin']),
  adminWriteLimiter,
  asyncHandler(deleteZoneController)
);

export default router;
