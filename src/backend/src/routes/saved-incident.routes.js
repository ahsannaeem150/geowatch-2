import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/async-handler.js';
import {
  saveIncidentController,
  unsaveIncidentController,
  checkSavedController,
  listSavedController,
  updateNotesController,
} from '../controllers/saved-incident.controller.js';

const router = Router();

// Route-level auth so non-matching paths fall through to the public incident routes
router.get('/saved', authenticate, asyncHandler(listSavedController));
router.post('/:id/save', authenticate, asyncHandler(saveIncidentController));
router.delete('/:id/save', authenticate, asyncHandler(unsaveIncidentController));
router.get('/:id/saved', authenticate, asyncHandler(checkSavedController));
router.patch('/:id/save/notes', authenticate, asyncHandler(updateNotesController));

export default router;
