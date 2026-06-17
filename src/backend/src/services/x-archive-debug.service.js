import { query } from '../config/database.js';
import { listSourceAccounts, setAccountSuspended } from './source-account.service.js';
import { listXPostSources, getSourceById } from './source.service.js';

export async function getXArchiveDebug(filters = {}) {
  const [accounts, sources] = await Promise.all([
    listSourceAccounts(),
    listXPostSources(filters),
  ]);

  const statsResult = await query(
    `SELECT
       COUNT(*) FILTER (WHERE source_type = 'x_post') AS total,
       COUNT(*) FILTER (WHERE source_type = 'x_post' AND archived = true) AS archived,
       COUNT(*) FILTER (WHERE source_type = 'x_post' AND archive_reason = 'deleted') AS deleted,
       COUNT(*) FILTER (WHERE source_type = 'x_post' AND archive_reason = 'suspended') AS suspended,
       COUNT(*) FILTER (WHERE source_type = 'x_post' AND archive_reason = 'unavailable') AS unavailable,
       COUNT(*) FILTER (WHERE source_type = 'x_post' AND archived = true AND archive_reason IS NULL) AS archived_other
     FROM incident_sources`
  );

  const stats = statsResult.rows[0];

  return {
    accounts,
    sources,
    stats: {
      totalAccounts: accounts.length,
      totalXPostSources: parseInt(stats.total, 10),
      archivedCount: parseInt(stats.archived, 10),
      deletedCount: parseInt(stats.deleted, 10),
      suspendedCount: parseInt(stats.suspended, 10),
      unavailableCount: parseInt(stats.unavailable, 10),
      archivedOtherCount: parseInt(stats.archived_other, 10),
    },
  };
}

export { setAccountSuspended, getSourceById };
