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
 * Generate a JWT for a public user.
 */
export function generatePublicToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: 'public_user' },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}
