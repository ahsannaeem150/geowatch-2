import http from 'http';
import { query } from '../config/database.js';
import { getClientCount } from '../utils/sse-broadcast.js';

function checkHttpHealth(url, timeoutMs = 3000) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      resolve({
        status: res.statusCode >= 200 && res.statusCode < 500 ? 'up' : 'degraded',
        statusCode: res.statusCode,
      });
    });

    req.on('error', () => {
      resolve({ status: 'down' });
    });

    req.setTimeout(timeoutMs, () => {
      req.destroy();
      resolve({ status: 'timeout' });
    });
  });
}

export async function getSystemHealth() {
  const start = Date.now();

  // Database health
  let dbHealth;
  try {
    await query('SELECT 1');
    dbHealth = { status: 'up', latencyMs: Date.now() - start };
  } catch (err) {
    dbHealth = { status: 'down', error: err.message };
  }

  // Martin tile server health
  const martinUrl = process.env.MARTIN_URL || 'http://localhost:8080';
  const martinHealth = await checkHttpHealth(`${martinUrl}/health`);
  if (martinHealth.status === 'down' || martinHealth.status === 'timeout') {
    // Try root endpoint as fallback
    const rootHealth = await checkHttpHealth(martinUrl);
    if (rootHealth.status === 'up') {
      martinHealth.status = 'up';
      martinHealth.statusCode = rootHealth.statusCode;
    }
  }

  // SSE stream health
  const sseClients = getClientCount();
  const sseHealth = {
    status: 'up',
    clients: sseClients,
  };

  // Overall status
  const allUp = dbHealth.status === 'up' && martinHealth.status === 'up';
  const anyDown = dbHealth.status === 'down' || martinHealth.status === 'down';

  return {
    status: anyDown ? 'unhealthy' : allUp ? 'healthy' : 'degraded',
    services: {
      database: dbHealth,
      martin: martinHealth,
      sse: sseHealth,
    },
    timestamp: new Date().toISOString(),
  };
}
