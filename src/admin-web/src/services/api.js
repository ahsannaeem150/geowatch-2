const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

function getToken() {
  return localStorage.getItem('geowatch_token');
}

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const headers = {
    ...options.headers,
  };

  // Only set JSON content-type for non-FormData bodies
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // AbortController with 60s timeout (prevents indefinite hangs on large uploads)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

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
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      const timeoutErr = new Error('Request timed out after 60 seconds');
      timeoutErr.statusCode = 408;
      timeoutErr.errorCode = 'TIMEOUT';
      throw timeoutErr;
    }
    throw err;
  }
}

export const api = {
  // Auth
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => request('/auth/me'),

  // Categories
  getCategories: () => request('/categories'),
  getDomains: () => request('/categories/domains'),

  // Events (public)
  getIncidents: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.date) qs.append('date', params.date);
    if (params.dateFrom) qs.append('dateFrom', params.dateFrom);
    if (params.dateTo) qs.append('dateTo', params.dateTo);
    if (params.categoryId) qs.append('categoryId', params.categoryId);
    if (params.severity) qs.append('severity', params.severity);
    if (params.status) qs.append('status', params.status);
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
    if (params.status) qs.append('status', params.status);
    if (params.viewport) qs.append('viewport', params.viewport);
    if (params.limit) qs.append('limit', params.limit);
    if (params.offset !== undefined) qs.append('offset', params.offset);
    const query = qs.toString();
    return request(`/incidents/search${query ? '?' + query : ''}`);
  },
  getIncident: (id) => request(`/incidents/${id}`),

  // Events (admin)
  createIncident: (body) => request('/incidents', { method: 'POST', body: JSON.stringify(body) }),
  updateIncident: (id, body) => request(`/incidents/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteIncident: (id) => request(`/incidents/${id}`, { method: 'DELETE' }),
  resolveIncident: (id, body) => request(`/incidents/${id}/resolve`, { method: 'POST', body: JSON.stringify(body || {}) }),

  // Timeline
  addTimeline: (incidentId, body) =>
    request(`/incidents/${incidentId}/timeline`, { method: 'POST', body: JSON.stringify(body) }),
  updateTimeline: (incidentId, updateId, body) =>
    request(`/incidents/${incidentId}/timeline/${updateId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteTimeline: (incidentId, updateId) =>
    request(`/incidents/${incidentId}/timeline/${updateId}`, { method: 'DELETE' }),

  // Sources
  addSource: (incidentId, body) =>
    request(`/incidents/${incidentId}/sources`, { method: 'POST', body: JSON.stringify(body) }),
  updateSourceVerification: (incidentId, sourceId, body) =>
    request(`/incidents/${incidentId}/sources/${sourceId}`, { method: 'PATCH', body: JSON.stringify(body) }),

  // Zones
  getZones: () => request('/zones'),
  getZone: (id) => request(`/zones/${id}`),
  getZoneIncidents: (id) => request(`/zones/${id}/incidents`),
  createZone: (body) => request('/zones', { method: 'POST', body: JSON.stringify(body) }),
  updateZone: (id, body) => request(`/zones/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteZone: (id) => request(`/zones/${id}`, { method: 'DELETE' }),

  // Media
  uploadMedia: (incidentId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return request(`/incidents/${incidentId}/media`, {
      method: 'POST',
      body: formData,
    });
  },

  listMedia: (incidentId) => request(`/incidents/${incidentId}/media`),

  deleteMedia: (incidentId, mediaId) =>
    request(`/incidents/${incidentId}/media/${mediaId}`, { method: 'DELETE' }),

  reorderMedia: (incidentId, mediaId, displayOrder) =>
    request(`/incidents/${incidentId}/media/${mediaId}/order`, {
      method: 'PATCH',
      body: JSON.stringify({ displayOrder }),
    }),
};
