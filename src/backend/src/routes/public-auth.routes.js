import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/async-handler.js';
import {
  googleAuthController,
  getPublicMeController,
} from '../controllers/public-auth.controller.js';

const router = Router();

// Public: Exchange Google ID token for GeoWatch JWT
router.post('/google', asyncHandler(googleAuthController));

// Protected: Get current public user profile
router.get('/me', authenticate, asyncHandler(getPublicMeController));

export default router;
