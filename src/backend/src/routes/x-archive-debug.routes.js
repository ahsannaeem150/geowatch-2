import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { adminWriteLimiter } from '../middleware/rate-limiter.js';
import {
  getXArchiveDebugController,
  setAccountSuspendedController,
  checkXArchiveSourceController,
  snapshotXArchiveSourceController,
  archiveXArchiveSourceController,
} from '../controllers/x-archive-debug.controller.js';

const router = Router();

router.get(
  '/',
  authenticate,
  requireRole('super_admin'),
  asyncHandler(getXArchiveDebugController)
);

router.patch(
  '/accounts/:accountId/suspended',
  authenticate,
  requireRole('super_admin'),
  adminWriteLimiter,
  asyncHandler(setAccountSuspendedController)
);

router.post(
  '/sources/:sourceId/check',
  authenticate,
  requireRole('super_admin'),
  adminWriteLimiter,
  asyncHandler(checkXArchiveSourceController)
);

router.post(
  '/sources/:sourceId/snapshot',
  authenticate,
  requireRole('super_admin'),
  adminWriteLimiter,
  asyncHandler(snapshotXArchiveSourceController)
);

router.patch(
  '/sources/:sourceId/archive',
  authenticate,
  requireRole('super_admin'),
  adminWriteLimiter,
  asyncHandler(archiveXArchiveSourceController)
);

export default router;
