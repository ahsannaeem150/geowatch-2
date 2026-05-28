import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be set and at least 32 characters long');
}

// ─── Helpers ───

export async function updateLastLogin(id) {
  await query(
    'UPDATE users SET last_login_at = NOW() WHERE id = $1',
    [id]
  );
}

export function hashPassword(plainPassword) {
  return bcrypt.hashSync(plainPassword, BCRYPT_ROUNDS);
}

export function comparePassword(plainPassword, hashedPassword) {
  return bcrypt.compareSync(plainPassword, hashedPassword);
}

export function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

// ─── Database Operations ───

export async function findUserByEmail(email) {
  const result = await query(
    'SELECT id, email, password_hash, full_name, role, is_active, created_at, last_login_at FROM users WHERE email = $1',
    [email.toLowerCase().trim()]
  );
  return result.rows[0] || null;
}

export async function findUserById(id) {
  const result = await query(
    'SELECT id, email, full_name, role, is_active, created_at, last_login_at FROM users WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

export async function createUser({ email, password, fullName, role }) {
  const passwordHash = hashPassword(password);
  const result = await query(
    `INSERT INTO users (email, password_hash, full_name, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, full_name, role, is_active, created_at`,
    [email.toLowerCase().trim(), passwordHash, fullName.trim(), role]
  );
  return result.rows[0];
}

export async function listAdmins() {
  const result = await query(
    `SELECT id, email, full_name, role, is_active, created_at, last_login_at
     FROM users
     WHERE role IN ('super_admin', 'admin')
     ORDER BY created_at DESC`
  );
  return result.rows;
}

export async function updateAdmin(id, { role, isActive }) {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  if (role !== undefined) {
    fields.push(`role = $${paramIndex++}`);
    values.push(role);
  }
  if (isActive !== undefined) {
    fields.push(`is_active = $${paramIndex++}`);
    values.push(isActive);
  }

  if (fields.length === 0) {
    throw new Error('No fields to update');
  }

  values.push(id);
  const result = await query(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING id, email, full_name, role, is_active, created_at, last_login_at`,
    values
  );
  return result.rows[0] || null;
}
