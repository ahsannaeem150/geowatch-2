import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { asyncHandler } from '../utils/async-handler.js';
import {
  saveIncidentController,
  unsaveIncidentController,
  checkSavedController,
  listSavedController,
  updateNotesController,
} from '../controllers/saved-incident.controller.js';
import {
  listStaffSavedIncidentsController,
  getStaffSavedIncidentController,
  saveIncidentForStaffController,
  unsaveIncidentForStaffController,
} from '../controllers/staff-saved-incident.controller.js';

const router = Router();

// Staff-specific saved incidents (must come before generic /:id/save)
const staffRoleMiddleware = requireRole(['admin', 'super_admin', 'viewer']);

router.get('/staff/saved', authenticate, staffRoleMiddleware, asyncHandler(listStaffSavedIncidentsController));
router.get('/staff/:id/saved', authenticate, staffRoleMiddleware, asyncHandler(getStaffSavedIncidentController));
router.post('/staff/:id/save', authenticate, staffRoleMiddleware, asyncHandler(saveIncidentForStaffController));
router.delete('/staff/:id/save', authenticate, staffRoleMiddleware, asyncHandler(unsaveIncidentForStaffController));

// Public-user saved incidents (kept for backward compatibility)
router.get('/saved', authenticate, asyncHandler(listSavedController));
router.post('/:id/save', authenticate, asyncHandler(saveIncidentController));
router.delete('/:id/save', authenticate, asyncHandler(unsaveIncidentController));
router.get('/:id/saved', authenticate, asyncHandler(checkSavedController));
router.patch('/:id/save/notes', authenticate, asyncHandler(updateNotesController));

export default router;
