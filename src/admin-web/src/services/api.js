const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

function getToken() {
  return localStorage.getItem('geowatch_token');
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
  // Auth
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => request('/auth/me'),

  // Events (public)
  getEvents: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.date) qs.append('date', params.date);
    if (params.dateFrom) qs.append('dateFrom', params.dateFrom);
    if (params.dateTo) qs.append('dateTo', params.dateTo);
    if (params.category) qs.append('category', params.category);
    if (params.severity) qs.append('severity', params.severity);
    if (params.status) qs.append('status', params.status);
    if (params.viewport) qs.append('viewport', params.viewport);
    const query = qs.toString();
    return request(`/events${query ? '?' + query : ''}`);
  },
  getEvent: (id) => request(`/events/${id}`),

  // Events (admin)
  createEvent: (body) => request('/events', { method: 'POST', body: JSON.stringify(body) }),
  updateEvent: (id, body) => request(`/events/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteEvent: (id) => request(`/events/${id}`, { method: 'DELETE' }),
  resolveEvent: (id, body) => request(`/events/${id}/resolve`, { method: 'POST', body: JSON.stringify(body || {}) }),

  // Timeline
  addTimeline: (eventId, body) =>
    request(`/events/${eventId}/timeline`, { method: 'POST', body: JSON.stringify(body) }),
  updateTimeline: (eventId, updateId, body) =>
    request(`/events/${eventId}/timeline/${updateId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteTimeline: (eventId, updateId) =>
    request(`/events/${eventId}/timeline/${updateId}`, { method: 'DELETE' }),

  // Sources
  addSource: (eventId, body) =>
    request(`/events/${eventId}/sources`, { method: 'POST', body: JSON.stringify(body) }),
};
