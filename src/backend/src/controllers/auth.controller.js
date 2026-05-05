import {
  findUserByEmail,
  createUser,
  listAdmins,
  updateAdmin,
  comparePassword,
  generateToken,
} from '../services/auth.service.js';

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

  const token = generateToken(user);
  const { password_hash, ...userWithoutPassword } = user;

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

  res.apiSuccess({ user: updated });
}
