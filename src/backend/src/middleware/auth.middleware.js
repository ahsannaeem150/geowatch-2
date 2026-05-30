import { verifyToken, findUserById } from '../services/auth.service.js';
import { findPublicUserById } from '../services/public-auth.service.js';

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
    const decoded = verifyToken(token);

    // Try staff user first
    let user = await findUserById(decoded.id);
    if (user) {
      if (!user.is_active) {
        return res.apiError('Account is deactivated', 'FORBIDDEN', 403);
      }
      req.user = user;
      return next();
    }

    // Fall back to public user
    user = await findPublicUserById(decoded.id);
    if (user) {
      if (!user.is_active) {
        return res.apiError('Account is deactivated', 'FORBIDDEN', 403);
      }
      req.user = { ...user, role: 'public_user' };
      return next();
    }

    return res.apiError('User not found', 'UNAUTHORIZED', 401);
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.apiError('Invalid or expired token', 'UNAUTHORIZED', 401);
    }
    next(err);
  }
}
