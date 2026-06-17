import { fetchXEmbedMetadata } from '../utils/x-oembed.js';
import { query } from '../config/database.js';
import { getAccountById, setAccountSuspended } from './source-account.service.js';

export async function archiveSource(sourceId, reason) {
  const result = await query(
    `UPDATE incident_sources
     SET archived = true,
         archive_reason = $1,
         archived_at = NOW(),
         last_checked_at = NOW(),
         updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [reason, sourceId]
  );
  return result.rows[0] || null;
}

export async function unarchiveSource(sourceId) {
  const result = await query(
    `UPDATE incident_sources
     SET archived = false,
         archive_reason = NULL,
         archived_at = NULL,
         last_checked_at = NOW(),
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [sourceId]
  );
  return result.rows[0] || null;
}

export async function markSourcesArchivedByAccount(accountId, reason) {
  await query(
    `UPDATE incident_sources
     SET archived = true,
         archive_reason = $1,
         archived_at = NOW(),
         last_checked_at = NOW(),
         updated_at = NOW()
     WHERE account_id = $2 AND archived = false`,
    [reason, accountId]
  );
}

/**
 * Check whether a specific X post source is still available.
 * Returns { available: boolean, metadata?, reason? }.
 */
export async function checkXPostAvailability(sourceId, tweetUrl, accountId) {
  const metadata = await fetchXEmbedMetadata(tweetUrl);

  if (metadata) {
    await unarchiveSource(sourceId);
    if (accountId) {
      await setAccountSuspended(accountId, false);
    }
    return { available: true, metadata };
  }

  // Fetch failed. Decide reason based on account status.
  let reason = 'unavailable';
  if (accountId) {
    const account = await getAccountById(accountId);
    if (account?.is_suspended) {
      reason = 'suspended';
    } else {
      // We don't know if it's the tweet or the account.
      // Default to deleted; account-level suspension will be inferred
      // when a new source from the same account also fails.
      reason = 'deleted';
    }
  }

  await archiveSource(sourceId, reason);
  return { available: false, reason };
}
