import {
  verifyGoogleToken,
  findOrCreatePublicUser,
  findPublicUserById,
  generatePublicToken,
} from '../services/public-auth.service.js';
import { auditLog } from '../utils/audit-log.js';
import { AUDIT_ACTIONS } from '../utils/audit-actions.js';
import { broadcastEvent } from '../utils/sse-broadcast.js';

/**
 * POST /api/v1/auth/public/google
 * Exchange a Google ID token for a GeoWatch JWT.
 */
export async function googleAuthController(req, res) {
  const { idToken } = req.body;

  if (!idToken || typeof idToken !== 'string') {
    return res.apiError('ID token is required', 'BAD_REQUEST', 400);
  }

  let googleData;
  try {
    googleData = await verifyGoogleToken(idToken);
  } catch (err) {
    return res.apiError('Invalid or expired Google token', 'UNAUTHORIZED', 401);
  }

  // Validate required fields from Google
  if (!googleData.email) {
    return res.apiError('Google account email is required', 'UNAUTHORIZED', 401);
  }

  const user = await findOrCreatePublicUser({
    email: googleData.email,
    name: googleData.name,
    picture: googleData.picture,
    sub: googleData.sub,
  });

  if (!user.is_active) {
    return res.apiError('Account is deactivated', 'FORBIDDEN', 403);
  }

  const token = generatePublicToken(user);

  // Audit: public user login (user realm)
  await auditLog(req, AUDIT_ACTIONS.PUBLIC_USER_LOGIN, 'public_user', user.id, {
    email: user.email,
    fullName: user.full_name,
    oauthProvider: user.oauth_provider,
  }, null, 'user', 'public_user');

  broadcastEvent({
    type: 'public_user_created',
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      avatar_url: user.avatar_url,
      is_active: user.is_active,
    },
  });

  res.apiSuccess({
    token,
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      avatar_url: user.avatar_url,
      role: 'public_user',
    },
  }, 'Authentication successful');
}

/**
 * GET /api/v1/auth/public/me
 * Return the currently authenticated public user.
 */
export async function getPublicMeController(req, res) {
  const user = await findPublicUserById(req.user.id);
  if (!user) {
    return res.apiError('User not found', 'UNAUTHORIZED', 401);
  }

  res.apiSuccess({
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      avatar_url: user.avatar_url,
      role: 'public_user',
    },
  });
}
