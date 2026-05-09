import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import { validateRequest } from '../middleware/validate-request.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { adminWriteLimiter } from '../middleware/rate-limiter.js';
import {
  createEventSchema,
  updateEventSchema,
  listEventsQuerySchema,
  searchEventsQuerySchema,
} from '../validators/event.schema.js';

import {
  getEvents,
  searchEventsController,
  getEvent,
  createEventController,
  updateEventController,
  deleteEventController,
  resolveEventController,
} from '../controllers/event.controller.js';

const router = Router();

// Public routes
router.get('/', validateRequest(listEventsQuerySchema, 'query'), asyncHandler(getEvents));
router.get('/search', validateRequest(searchEventsQuerySchema, 'query'), asyncHandler(searchEventsController));
router.get('/:id', asyncHandler(getEvent));

// Admin routes
router.post(
  '/',
  authenticate,
  requireRole(['admin', 'super_admin']),
  adminWriteLimiter,
  validateRequest(createEventSchema, 'body'),
  asyncHandler(createEventController)
);

router.patch(
  '/:id',
  authenticate,
  requireRole(['admin', 'super_admin']),
  adminWriteLimiter,
  validateRequest(updateEventSchema, 'body'),
  asyncHandler(updateEventController)
);

router.delete(
  '/:id',
  authenticate,
  requireRole(['admin', 'super_admin']),
  adminWriteLimiter,
  asyncHandler(deleteEventController)
);

router.post(
  '/:id/resolve',
  authenticate,
  requireRole(['admin', 'super_admin']),
  adminWriteLimiter,
  asyncHandler(resolveEventController)
);

export default router;
