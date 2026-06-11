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

export function getUserActivity(id) {
  return request(`/users/${id}/activity`);
}

// ─── Public Users ───

export function listPublicUsers(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return request(`/public-users?${qs}`);
}

export function getPublicUser(id) {
  return request(`/public-users/${id}`);
}

export function updatePublicUser(id, body) {
  return request(`/public-users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function getPublicUserActivity(id) {
  return request(`/public-users/${id}/activity`);
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

// ─── Incidents ───

export function getIncidents(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return request(`/incidents?${qs}`);
}

export function getIncident(id) {
  return request(`/incidents/${id}`);
}

export function getDomains() {
  return request('/categories/domains');
}

// ─── Recycle Bin ───

export function listDeletedIncidents() {
  return request('/incidents/deleted');
}

export function restoreIncident(id) {
  return request(`/incidents/${id}/restore`, { method: 'POST' });
}

export function purgeIncident(id) {
  return request(`/incidents/${id}/purge`, { method: 'POST' });
}

// ─── Register (for creating users from superadmin) ───

export function registerUser(body) {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// ─── Domains ───

export async function listDomains() {
  const res = await request('/categories/domains');
  return res.domains || [];
}

export function getDomain(slug) {
  return request(`/categories/domains/${slug}`);
}

export function createDomain(body) {
  return request('/categories/domains', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateDomain(id, body) {
  return request(`/categories/domains/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function deleteDomain(id) {
  return request(`/categories/domains/${id}`, { method: 'DELETE' });
}

// ─── Categories ───

export async function listAllCategories() {
  const res = await request('/categories');
  return res.categories || [];
}

export function createCategory(body) {
  return request('/categories', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateCategory(id, body) {
  return request(`/categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function deleteCategory(id) {
  return request(`/categories/${id}`, { method: 'DELETE' });
}

export function reorderCategories(body) {
  return request('/categories/reorder', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// ─── Incident Mutations ───

export function updateIncident(id, body) {
  return request(`/incidents/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function deleteIncident(id) {
  return request(`/incidents/${id}`, { method: 'DELETE' });
}

export function resolveIncident(id, body = {}) {
  return request(`/incidents/${id}/resolve`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// ─── Zone Categories ───

export async function listZoneCategories() {
  const res = await request('/zone-categories/all');
  return res.categories || [];
}

export function createZoneCategory(body) {
  return request('/zone-categories', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateZoneCategory(id, body) {
  return request(`/zone-categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function deleteZoneCategory(id) {
  return request(`/zone-categories/${id}`, { method: 'DELETE' });
}
