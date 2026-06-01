import { verifyToken, findUserById } from '../services/auth.service.js';
import { findPublicUserById } from '../services/public-auth.service.js';

async function resolveUser(token) {
  const decoded = verifyToken(token);

  // Try staff user first
  let user = await findUserById(decoded.id);
  if (user) {
    if (!user.is_active) {
      throw Object.assign(new Error('Account is deactivated'), { code: 'FORBIDDEN', status: 403 });
    }
    return user;
  }

  // Fall back to public user
  user = await findPublicUserById(decoded.id);
  if (user) {
    if (!user.is_active) {
      throw Object.assign(new Error('Account is deactivated'), { code: 'FORBIDDEN', status: 403 });
    }
    return { ...user, role: 'public_user' };
  }

  throw Object.assign(new Error('User not found'), { code: 'UNAUTHORIZED', status: 401 });
}

/**
 * Verifies the Bearer JWT token and attaches the user to req.user.
 * Tries staff users first, then falls back to public users.
 * Returns 401 if token is missing, invalid, or expired.
 */
export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    } else if (req.query?.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.apiError('Authentication required', 'UNAUTHORIZED', 401);
    }

    req.user = await resolveUser(token);
    return next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.apiError('Invalid or expired token', 'UNAUTHORIZED', 401);
    }
    if (err.code === 'FORBIDDEN') {
      return res.apiError(err.message, 'FORBIDDEN', 403);
    }
    next(err);
  }
}

/**
 * Optional authentication — sets req.user if a valid token is present,
 * but does NOT fail if no token is provided. Used on public routes
 * where we want to track authenticated user behavior without blocking
 * unauthenticated access.
 */
export async function optionalAuthenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    } else if (req.query?.token) {
      token = req.query.token;
    }

    if (!token) {
      return next();
    }

    req.user = await resolveUser(token);
    return next();
  } catch (err) {
    // Silently ignore auth errors on optional routes
    return next();
  }
}
