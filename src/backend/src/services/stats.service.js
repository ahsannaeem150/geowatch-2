import { query } from '../config/database.js';

/**
 * Public, unauthenticated platform stats (user-web home + About).
 * "Data sources" counts attached evidence items — every row in
 * incident_sources is a source an analyst attached to an incident or
 * timeline update. source_accounts is a curation directory (currently
 * unused) and is deliberately not counted as "data".
 */
export async function getPublicStats() {
  const result = await query('SELECT COUNT(*) AS total FROM incident_sources');
  return { sources: parseInt(result.rows[0].total, 10) };
}
