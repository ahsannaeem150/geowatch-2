const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

function getToken() {
  return localStorage.getItem('superadmin_token');
}

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const token = getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({
    success: false,
    message: 'Invalid server response',
    error: 'PARSE_ERROR',
  }));

  if (!res.ok || !data.success) {
    const err = new Error(data.message || `HTTP ${res.status}`);
    err.code = data.error || `HTTP_${res.status}`;
    err.status = res.status;
    err.data = data.data;
    throw err;
  }

  return data.data;
}

// ─── Auth ───

export function login(email, password) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function getMe() {
  return request('/auth/me');
}

// ─── Users ───

export function listUsers(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return request(`/users?${qs}`);
}

export function getUser(id) {
  return request(`/users/${id}`);
}

export function updateUser(id, body) {
  return request(`/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function deleteUser(id) {
  return request(`/users/${id}`, { method: 'DELETE' });
}

export function resetUserPassword(id) {
  return request(`/users/${id}/reset-password`, { method: 'POST' });
}

// ─── Audit ───

export function listAuditLogs(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return request(`/audit?${qs}`);
}

export function getAuditSummary() {
  return request('/audit/summary');
}

// ─── System ───

export function getSystemHealth() {
  return request('/system/health');
}
