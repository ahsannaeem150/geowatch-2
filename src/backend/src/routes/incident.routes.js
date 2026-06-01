import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import { validateRequest } from '../middleware/validate-request.js';
import { authenticate, optionalAuthenticate } from '../middleware/auth.middleware.js';
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
  restoreIncidentController,
  purgeIncidentController,
  listDeletedIncidentsController,
  getDeletedIncidentController,
  resolveIncidentController,
} from '../controllers/incident.controller.js';

const router = Router();

// Public routes
router.get('/', validateRequest(listIncidentsQuerySchema, 'query'), asyncHandler(getIncidents));
router.get('/search', validateRequest(searchIncidentsQuerySchema, 'query'), asyncHandler(searchIncidentsController));

// Superadmin recycle bin routes (must be before /:id to avoid "deleted" being parsed as an ID)
router.get(
  '/deleted',
  authenticate,
  requireRole(['super_admin']),
  asyncHandler(listDeletedIncidentsController)
);

router.get(
  '/deleted/:id',
  authenticate,
  requireRole(['super_admin']),
  asyncHandler(getDeletedIncidentController)
);

router.get('/:id', optionalAuthenticate, asyncHandler(getIncident));

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

router.post(
  '/:id/restore',
  authenticate,
  requireRole(['super_admin']),
  adminWriteLimiter,
  asyncHandler(restoreIncidentController)
);

router.post(
  '/:id/purge',
  authenticate,
  requireRole(['super_admin']),
  adminWriteLimiter,
  asyncHandler(purgeIncidentController)
);

export default router;
