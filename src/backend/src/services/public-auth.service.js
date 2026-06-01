import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Verify a Google ID token by calling Google's tokeninfo endpoint.
 * Returns the decoded token payload (email, name, picture, sub, etc.)
 */
export async function verifyGoogleToken(idToken) {
  const res = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google token verification failed: ${err}`);
  }
  return res.json();
}

/**
 * Find an existing public user by OAuth provider + ID, or by email.
 * If found with matching email but different provider, update the OAuth details.
 * If not found, create a new public user.
 */
export async function findOrCreatePublicUser({ email, name, picture, sub }) {
  // 1. Try exact match by provider + oauth_id
  let result = await query(
    'SELECT * FROM public_users WHERE oauth_provider = $1 AND oauth_id = $2',
    ['google', sub]
  );
  if (result.rows.length > 0) {
    return result.rows[0];
  }

  // 2. Try match by email (user previously signed in with different provider)
  result = await query(
    'SELECT * FROM public_users WHERE email = $1',
    [email.toLowerCase().trim()]
  );
  if (result.rows.length > 0) {
    await query(
      'UPDATE public_users SET oauth_provider = $1, oauth_id = $2, full_name = $3, avatar_url = $4 WHERE id = $5',
      ['google', sub, name || result.rows[0].full_name, picture || result.rows[0].avatar_url, result.rows[0].id]
    );
    const updated = await query(
      'SELECT * FROM public_users WHERE id = $1',
      [result.rows[0].id]
    );
    return updated.rows[0];
  }

  // 3. Create new user
  result = await query(
    `INSERT INTO public_users (email, full_name, avatar_url, oauth_provider, oauth_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [email.toLowerCase().trim(), name || null, picture || null, 'google', sub]
  );
  return result.rows[0];
}

/**
 * Find a public user by their UUID.
 */
export async function findPublicUserById(id) {
  const result = await query(
    'SELECT * FROM public_users WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

/**
 * List public users with search, filter, and pagination.
 */
export async function listPublicUsers({ search, isActive, page, limit }) {
  const conditions = [];
  const params = [];
  let idx = 1;

  if (search) {
    conditions.push(`(email ILIKE $${idx++} OR full_name ILIKE $${idx++})`);
    const pattern = `%${search}%`;
    params.push(pattern, pattern);
  }

  if (isActive !== undefined && isActive !== '') {
    conditions.push(`is_active = $${idx++}`);
    params.push(isActive === 'true' || isActive === true);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await query(
    `SELECT COUNT(*) as total FROM public_users ${where}`,
    params
  );
  const total = parseInt(countResult.rows[0].total, 10);

  const offset = (page - 1) * limit;

  const result = await query(
    `SELECT id, email, full_name, avatar_url, oauth_provider, is_active, created_at
     FROM public_users
     ${where}
     ORDER BY created_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, limit, offset]
  );

  return {
    users: result.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Update a public user (e.g., ban/unban).
 */
export async function updatePublicUser(id, { isActive }) {
  const result = await query(
    'UPDATE public_users SET is_active = $1 WHERE id = $2 RETURNING id, email, full_name, avatar_url, oauth_provider, is_active, created_at',
    [isActive, id]
  );
  return result.rows[0] || null;
}

/**
 * Count saved incidents for a public user.
 */
export async function countPublicUserSavedIncidents(userId) {
  const result = await query(
    'SELECT COUNT(*) as c FROM user_saved_incidents WHERE user_id = $1',
    [userId]
  );
  return parseInt(result.rows[0].c, 10);
}

/**
 * Generate a JWT for a public user.
 */
export function generatePublicToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: 'public_user' },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}
