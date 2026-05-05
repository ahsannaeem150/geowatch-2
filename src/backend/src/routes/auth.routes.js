import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import { validateRequest } from '../middleware/validate-request.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { authLimiter } from '../middleware/rate-limiter.js';
import { loginSchema, registerSchema, updateAdminSchema } from '../validators/auth.schema.js';

import {
  login,
  register,
  getMe,
  listAdminsController,
  updateAdminController,
} from '../controllers/auth.controller.js';

const router = Router();

// Public routes
router.post('/login', authLimiter, validateRequest(loginSchema, 'body'), asyncHandler(login));

// Admin can create users, but only super_admin can create other admins
router.post(
  '/register',
  authenticate,
  requireRole(['admin', 'super_admin']),
  validateRequest(registerSchema, 'body'),
  asyncHandler(register)
);

// Authenticated routes
router.get('/me', authenticate, asyncHandler(getMe));

// Super admin only
router.get('/admins', authenticate, requireRole('super_admin'), asyncHandler(listAdminsController));

router.patch(
  '/admins/:id',
  authenticate,
  requireRole('super_admin'),
  validateRequest(updateAdminSchema, 'body'),
  asyncHandler(updateAdminController)
);

export default router;
