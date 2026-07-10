import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import { validateRequest } from '../middleware/validate-request.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import {
  getNotificationsController,
  markNotificationReadController,
  markAllNotificationsReadController,
  deleteNotificationController,
} from '../controllers/notification.controller.js';
import { listNotificationsQuerySchema, notificationIdParamSchema } from '../validators/notification.schema.js';

const router = Router();

router.get(
  '/',
  authenticate,
  requireRole(['admin', 'super_admin', 'viewer']),
  validateRequest(listNotificationsQuerySchema, 'query'),
  asyncHandler(getNotificationsController)
);

router.patch(
  '/:id/read',
  authenticate,
  requireRole(['admin', 'super_admin', 'viewer']),
  validateRequest(notificationIdParamSchema, 'params'),
  asyncHandler(markNotificationReadController)
);

router.post(
  '/mark-all-read',
  authenticate,
  requireRole(['admin', 'super_admin', 'viewer']),
  asyncHandler(markAllNotificationsReadController)
);

router.delete(
  '/:id',
  authenticate,
  requireRole(['admin', 'super_admin', 'viewer']),
  validateRequest(notificationIdParamSchema, 'params'),
  asyncHandler(deleteNotificationController)
);

export default router;
