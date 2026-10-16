import { fetchXEmbedMetadata } from '../utils/x-oembed.js';
import { fetchFxTweet } from '../utils/x-fxtwitter.js';
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
 * Primary signal is fxtwitter — the same API the frontends use to render
 * tweets — so the verdict always agrees with what users see. The legacy
 * publish.x.com oEmbed endpoint is only consulted as a backup when
 * fxtwitter itself is unreachable (both must fail to archive).
 * Returns { available: boolean, metadata?, reason? }.
 */
export async function checkXPostAvailability(sourceId, tweetUrl, accountId) {
  const fx = await fetchFxTweet(tweetUrl);

  if (fx.ok) {
    await unarchiveSource(sourceId);
    if (accountId) {
      await setAccountSuspended(accountId, false);
    }
    return { available: true, metadata: fx.metadata };
  }

  if (fx.networkError) {
    // fxtwitter unreachable — fall back to the legacy oEmbed signal before
    // concluding anything; archiving on a proxy outage would be wrong.
    const metadata = await fetchXEmbedMetadata(tweetUrl);
    if (metadata) {
      await unarchiveSource(sourceId);
      if (accountId) {
        await setAccountSuspended(accountId, false);
      }
      return { available: true, metadata };
    }
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
