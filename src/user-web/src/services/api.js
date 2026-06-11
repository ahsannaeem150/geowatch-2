const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

function getToken() {
  return localStorage.getItem('geowatch_public_token');
}

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  let data;
  try {
    data = await res.json();
  } catch {
    data = { success: false, message: 'Invalid JSON response', error: 'PARSE_ERROR' };
  }

  if (!res.ok || !data.success) {
    const err = new Error(data.message || `HTTP ${res.status}`);
    err.statusCode = res.status;
    err.errorCode = data.error || 'UNKNOWN_ERROR';
    err.responseData = data;
    throw err;
  }

  return data;
}

export const api = {
  getCategories: () => request('/categories'),
  getDomains: () => request('/categories/domains'),
  getZoneCategories: () => request('/zone-categories'),

  getIncidents: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.dateFrom) qs.append('dateFrom', params.dateFrom);
    if (params.dateTo) qs.append('dateTo', params.dateTo);
    if (params.categoryId) qs.append('categoryId', params.categoryId);
    if (params.severity) qs.append('severity', params.severity);
    if (params.status) qs.append('status', params.status);
    if (params.geometryType) qs.append('geometryType', params.geometryType);
    if (params.viewport) qs.append('viewport', params.viewport);
    const query = qs.toString();
    return request(`/incidents${query ? '?' + query : ''}`);
  },
  searchIncidents: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.q) qs.append('q', params.q);
    if (params.dateFrom) qs.append('dateFrom', params.dateFrom);
    if (params.dateTo) qs.append('dateTo', params.dateTo);
    if (params.categoryId) qs.append('categoryId', params.categoryId);
    if (params.severity) qs.append('severity', params.severity);
    if (params.limit) qs.append('limit', params.limit);
    if (params.offset !== undefined) qs.append('offset', params.offset);
    const query = qs.toString();
    return request(`/incidents/search${query ? '?' + query : ''}`);
  },
  getIncident: (id) => request(`/incidents/${id}`),

  // Public user auth
  publicLogin: (idToken) => request('/auth/public/google', {
    method: 'POST',
    body: JSON.stringify({ idToken }),
  }),
  publicMe: () => request('/auth/public/me'),

  // Media
  listMedia: (incidentId) => request(`/incidents/${incidentId}/media`),

  // Saved incidents
  listSavedIncidents: () => request('/incidents/saved'),
  saveIncident: (id) => request(`/incidents/${id}/save`, { method: 'POST' }),
  unsaveIncident: (id) => request(`/incidents/${id}/save`, { method: 'DELETE' }),
  checkSaved: (id) => request(`/incidents/${id}/saved`),
};
