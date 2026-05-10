import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import { validateRequest } from '../middleware/validate-request.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { adminWriteLimiter } from '../middleware/rate-limiter.js';
import {
  createIncidentSchema,
  updateIncidentSchema,
  listIncidentsQuerySchema,
  searchIncidentsQuerySchema,
} from '../validators/incident.schema.js';

import {
  getIncidents,
  searchIncidentsController,
  getIncident,
  createIncidentController,
  updateIncidentController,
  deleteIncidentController,
  resolveIncidentController,
} from '../controllers/incident.controller.js';

const router = Router();

// Public routes
router.get('/', validateRequest(listIncidentsQuerySchema, 'query'), asyncHandler(getIncidents));
router.get('/search', validateRequest(searchIncidentsQuerySchema, 'query'), asyncHandler(searchIncidentsController));
router.get('/:id', asyncHandler(getIncident));

// Admin routes
router.post(
  '/',
  authenticate,
  requireRole(['admin', 'super_admin']),
  adminWriteLimiter,
  validateRequest(createIncidentSchema, 'body'),
  asyncHandler(createIncidentController)
);

router.patch(
  '/:id',
  authenticate,
  requireRole(['admin', 'super_admin']),
  adminWriteLimiter,
  validateRequest(updateIncidentSchema, 'body'),
  asyncHandler(updateIncidentController)
);

router.delete(
  '/:id',
  authenticate,
  requireRole(['admin', 'super_admin']),
  adminWriteLimiter,
  asyncHandler(deleteIncidentController)
);

router.post(
  '/:id/resolve',
  authenticate,
  requireRole(['admin', 'super_admin']),
  adminWriteLimiter,
  asyncHandler(resolveIncidentController)
);

export default router;
