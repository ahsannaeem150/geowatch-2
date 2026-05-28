import {
  findUserByEmail,
  createUser,
  listAdmins,
  updateAdmin,
  updateLastLogin,
  comparePassword,
  generateToken,
} from '../services/auth.service.js';
import { auditLog } from '../utils/audit-log.js';
import { AUDIT_ACTIONS } from '../utils/audit-actions.js';

/**
 * POST /auth/login
 * Public — returns JWT token and user info.
 */
export async function login(req, res) {
  const { email, password } = req.body;

  const user = await findUserByEmail(email);
  if (!user) {
    return res.apiError('Invalid email or password', 'UNAUTHORIZED', 401);
  }

  const valid = comparePassword(password, user.password_hash);
  if (!valid) {
    return res.apiError('Invalid email or password', 'UNAUTHORIZED', 401);
  }

  if (!user.is_active) {
    return res.apiError('Account is deactivated', 'FORBIDDEN', 403);
  }

  // Update last login timestamp
  await updateLastLogin(user.id);

  // Refetch user so last_login_at is current in the response
  const refreshedUser = await findUserByEmail(user.email);
  const token = generateToken(refreshedUser);
  const { password_hash, ...userWithoutPassword } = refreshedUser;

  // Audit: successful login
  await auditLog(req, AUDIT_ACTIONS.USER_LOGIN, 'user', refreshedUser.id, {
    email: refreshedUser.email,
    role: refreshedUser.role,
  }, refreshedUser);

  res.apiSuccess({ token, user: userWithoutPassword });
}

/**
 * POST /auth/register
 * Super admin only — creates a new admin user.
 */
export async function register(req, res) {
  const { email, password, fullName, role } = req.body;

  // Admins can only create viewer users; super_admin can create any role
  if (req.user.role === 'admin' && role !== 'viewer') {
    return res.apiError('Admins can only create viewer accounts', 'FORBIDDEN', 403);
  }

  const existing = await findUserByEmail(email);
  if (existing) {
    return res.apiError('Email already registered', 'CONFLICT', 409);
  }

  const user = await createUser({ email, password, fullName, role });

  // Audit: user created
  await auditLog(req, AUDIT_ACTIONS.USER_CREATED, 'user', user.id, {
    email: user.email,
    fullName: user.full_name,
    role: user.role,
    createdBy: req.user.email,
  });

  res.apiSuccess({ user }, 'User created successfully');
}

/**
 * GET /auth/me
 * Any authenticated user — returns current user profile.
 */
export async function getMe(req, res) {
  const { password_hash, ...user } = req.user;
  res.apiSuccess({ user });
}

/**
 * GET /auth/admins
 * Super admin only — lists all admin users.
 */
export async function listAdminsController(req, res) {
  const admins = await listAdmins();
  res.apiSuccess({ admins });
}

/**
 * PATCH /auth/admins/:id
 * Super admin only — updates an admin's role or active status.
 */
export async function updateAdminController(req, res) {
  const { id } = req.params;
  const { role, isActive } = req.body;

  const updated = await updateAdmin(id, { role, isActive });
  if (!updated) {
    return res.apiError('Admin not found', 'NOT_FOUND', 404);
  }

  // Determine the specific audit action based on what changed
  let action = AUDIT_ACTIONS.USER_UPDATED;
  if (isActive !== undefined) {
    action = isActive ? AUDIT_ACTIONS.USER_ACTIVATED : AUDIT_ACTIONS.USER_DEACTIVATED;
  }

  await auditLog(req, action, 'user', updated.id, {
    email: updated.email,
    role: updated.role,
    isActive: updated.is_active,
    changedFields: { role, isActive },
  });

  res.apiSuccess({ user: updated });
}
