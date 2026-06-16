import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import { validateRequest } from '../middleware/validate-request.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { adminWriteLimiter } from '../middleware/rate-limiter.js';
import {
  createSourceSchema,
  updateSourceSchema,
  updateSourceVerificationSchema,
  pinSourceSchema,
} from '../validators/source.schema.js';
import {
  createSourceController,
  updateSourceController,
  deleteSourceController,
  updateSourceVerificationController,
  pinSourceController,
} from '../controllers/source.controller.js';

const router = Router({ mergeParams: true });

router.post(
  '/',
  authenticate,
  requireRole(['admin', 'super_admin']),
  adminWriteLimiter,
  validateRequest(createSourceSchema, 'body'),
  asyncHandler(createSourceController)
);

router.patch(
  '/:sourceId',
  authenticate,
  requireRole(['admin', 'super_admin']),
  adminWriteLimiter,
  validateRequest(updateSourceSchema, 'body'),
  asyncHandler(updateSourceController)
);

router.delete(
  '/:sourceId',
  authenticate,
  requireRole(['admin', 'super_admin']),
  adminWriteLimiter,
  asyncHandler(deleteSourceController)
);

router.patch(
  '/:sourceId/verification',
  authenticate,
  requireRole(['admin', 'super_admin']),
  adminWriteLimiter,
  validateRequest(updateSourceVerificationSchema, 'body'),
  asyncHandler(updateSourceVerificationController)
);

router.patch(
  '/:sourceId/pin',
  authenticate,
  requireRole(['admin', 'super_admin']),
  adminWriteLimiter,
  validateRequest(pinSourceSchema, 'body'),
  asyncHandler(pinSourceController)
);

export default router;
