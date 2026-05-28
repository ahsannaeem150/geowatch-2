import { getSystemHealth } from '../services/system.service.js';

export async function getHealthController(req, res) {
  const health = await getSystemHealth();
  const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;
  res.status(statusCode).apiSuccess(health);
}
