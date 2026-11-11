const STORAGE_KEY = 'intelmap24_network_test_mode';
const MODES = new Set(['off', 'delay', 'error', 'detail-error']);

export const NETWORK_SIMULATION_DELAY_MS = 5000;
export const NETWORK_SIMULATION_ERROR_DELAY_MS = 1500;

function readMode() {
  if (!import.meta.env.DEV || typeof window === 'undefined') return 'off';

  const queryMode = new URLSearchParams(window.location.search).get('network');
  if (MODES.has(queryMode)) {
    try {
      sessionStorage.setItem(STORAGE_KEY, queryMode);
    } catch {}
    return queryMode;
  }

  try {
    const savedMode = sessionStorage.getItem(STORAGE_KEY);
    return MODES.has(savedMode) ? savedMode : 'off';
  } catch {
    return 'off';
  }
}

const mode = readMode();

export function getNetworkSimulationMode() {
  return mode;
}

export async function simulateNetworkRequest(path, options = {}) {
  if (!import.meta.env.DEV || mode === 'off' || path.startsWith('/auth')) return;

  if (mode === 'detail-error') {
    const method = (options.method || 'GET').toUpperCase();
    const isIncidentDetailRead = method === 'GET' && /^\/incidents\/[0-9a-f-]{36}(?:\?.*)?$/i.test(path);
    if (!isIncidentDetailRead) return;
  }

  if (mode === 'delay') {
    await new Promise((resolve) => setTimeout(resolve, NETWORK_SIMULATION_DELAY_MS));
    return;
  }

  await new Promise((resolve) => setTimeout(resolve, NETWORK_SIMULATION_ERROR_DELAY_MS));
  const error = new Error('Simulated API failure — network test mode is enabled');
  error.statusCode = 503;
  error.status = 503;
  error.errorCode = 'SIMULATED_NETWORK_ERROR';
  error.code = 'SIMULATED_NETWORK_ERROR';
  throw error;
}
