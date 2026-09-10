// Single fetch wrapper for the IntelMap24 backend.
// - Base URL + envelope unwrap ({ success, data, message, error })
// - Bearer token injection from the Keychain
// - 15s timeout via AbortController
// - Normalized errors: { status, message, errorCode }
// - 401 / 403-FORBIDDEN clears the stored session and notifies the
//   registered session-expired handler (AuthContext) — kept module-level
//   to avoid a circular import with the context.

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import { API_BASE_URL, STORAGE_KEYS } from '../constants';

const DEFAULT_TIMEOUT_MS = 15000;

let onSessionExpired = null;

export function registerSessionExpiredHandler(fn) {
  onSessionExpired = typeof fn === 'function' ? fn : null;
}

export async function getStoredToken() {
  try {
    const creds = await Keychain.getGenericPassword({
      service: STORAGE_KEYS.JWT,
    });
    return creds ? creds.password : null;
  } catch {
    return null;
  }
}

export async function storeSession(token, user) {
  await Keychain.setGenericPassword(STORAGE_KEYS.JWT, token, {
    service: STORAGE_KEYS.JWT,
  });
  if (user !== undefined) {
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  }
}

export async function clearSession() {
  try {
    await Keychain.resetGenericPassword({ service: STORAGE_KEYS.JWT });
  } catch {
    // best-effort
  }
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.USER);
  } catch {
    // best-effort
  }
}

function buildUrl(path, params) {
  const url = `${API_BASE_URL}${path}`;
  if (!params) {
    return url;
  }
  const query = Object.entries(params)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
    )
    .join('&');
  return query ? `${url}?${query}` : url;
}

function normalizeError(status, payload, fallback) {
  const message =
    (payload && typeof payload.message === 'string' && payload.message) ||
    fallback;
  const errorCode =
    (payload && typeof payload.error === 'string' && payload.error) || null;
  return { status, message, errorCode };
}

async function handleSessionExpired() {
  await clearSession();
  if (onSessionExpired) {
    onSessionExpired();
  }
}

async function request(path, { method = 'GET', params, body } = {}) {
  const token = await getStoredToken();
  const headers = { Accept: 'application/json' };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  let res;
  try {
    res = await fetch(buildUrl(path, params), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    if (err && err.name === 'AbortError') {
      throw { status: 0, message: 'Request timed out', errorCode: 'TIMEOUT' };
    }
    throw {
      status: 0,
      message: (err && err.message) || 'Network request failed',
      errorCode: 'NETWORK_ERROR',
    };
  } finally {
    clearTimeout(timer);
  }

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    // non-JSON response body — payload stays null
  }

  if (!res.ok || (payload && payload.success === false)) {
    const error = normalizeError(
      res.status,
      payload,
      `Request failed (${res.status})`,
    );
    if (
      res.status === 401 ||
      (res.status === 403 && error.errorCode === 'FORBIDDEN')
    ) {
      await handleSessionExpired();
    }
    throw error;
  }

  return payload ? payload.data : null;
}

export const api = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) =>
    request(path, { ...options, method: 'POST', body }),
  patch: (path, body, options) =>
    request(path, { ...options, method: 'PATCH', body }),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
};

export default api;
