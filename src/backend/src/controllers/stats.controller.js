import { getPublicStats } from '../services/stats.service.js';

/**
 * GET /api/v1/stats — public platform stats (no auth).
 */
export async function getStats(req, res) {
  const stats = await getPublicStats();
  res.apiSuccess(stats);
}
