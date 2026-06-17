import { query } from '../config/database.js';

export async function findOrCreateAccount({ platform, username, displayName, profileUrl, avatarUrl }) {
  const result = await query(
    `INSERT INTO source_accounts
       (platform, username, display_name, profile_url, avatar_url, last_fetched_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (platform, username)
     DO UPDATE SET
       display_name = COALESCE(EXCLUDED.display_name, source_accounts.display_name),
       profile_url = COALESCE(EXCLUDED.profile_url, source_accounts.profile_url),
       avatar_url = COALESCE(EXCLUDED.avatar_url, source_accounts.avatar_url),
       is_suspended = false,
       last_fetched_at = NOW(),
       updated_at = NOW()
     RETURNING *`,
    [platform, username, displayName || null, profileUrl || null, avatarUrl || null]
  );
  return result.rows[0];
}

export async function getAccountById(accountId) {
  const result = await query('SELECT * FROM source_accounts WHERE id = $1', [accountId]);
  return result.rows[0] || null;
}

export async function listSourceAccounts() {
  const result = await query(
    `SELECT id, platform, username, display_name, profile_url, avatar_url,
            is_suspended, last_fetched_at, created_at, updated_at
     FROM source_accounts
     ORDER BY username ASC, platform ASC`
  );
  return result.rows;
}

export async function setAccountSuspended(accountId, isSuspended) {
  await query(
    `UPDATE source_accounts
     SET is_suspended = $1, updated_at = NOW()
     WHERE id = $2`,
    [isSuspended, accountId]
  );
}
