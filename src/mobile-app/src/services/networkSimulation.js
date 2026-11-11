import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'intelmap24_mobile_network_test_mode';
const VALID_MODES = new Set(['off', 'delay', 'error', 'detail-error']);
let mode = 'off';
const listeners = new Set();

export async function initNetworkSimulation() {
  if (!__DEV__) return;
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (VALID_MODES.has(saved)) mode = saved;
  } catch {}
}

export function getNetworkSimulationMode() {
  return mode;
}

export async function setNetworkSimulationMode(next) {
  if (!__DEV__ || !VALID_MODES.has(next)) return;
  mode = next;
  listeners.forEach((listener) => listener(mode));
  try {
    await AsyncStorage.setItem(STORAGE_KEY, next);
  } catch {}
}

export function subscribeNetworkSimulation(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function simulateNetworkRequest(path, method = 'GET') {
  if (!__DEV__ || mode === 'off' || path.startsWith('/auth')) return;

  if (mode === 'detail-error') {
    const detailRead = method.toUpperCase() === 'GET' && /^\/incidents\/[0-9a-f-]{36}(?:\?.*)?$/i.test(path);
    if (!detailRead) return;
  }

  const delayMs = mode === 'delay' ? 4000 : 1200;
  await new Promise((resolve) => setTimeout(resolve, delayMs));
  if (mode === 'delay') return;
  throw {
    status: 503,
    message: 'Simulated API failure — network test mode is enabled',
    errorCode: 'SIMULATED_NETWORK_ERROR',
  };
}
