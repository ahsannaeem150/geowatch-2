const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
import { estimatePolygonAreaSqM, estimatePolygonPerimeterM } from '@shared/utils/zoneGeometry.js';

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

function mapMediaItem(item) {
  if (!item) return null;
  return {
    id: item.id,
    url: item.file_url ?? item.url,
    thumbnailUrl: item.thumbnail_url ?? item.thumbnailUrl,
    caption: item.caption || '',
    pinned: !!item.pinned,
    fileType: item.file_type,
    mimeType: item.mime_type,
    width: item.width,
    height: item.height,
    displayOrder: item.display_order,
    createdAt: item.created_at,
  };
}

const X_LOGO_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>'
)}`;

function mapXPostSource(source, mediaList = []) {
  if (!source) return null;
  const archiveUrl = source.archived && source.archive_media_id
    ? source.archive_media_url || mediaList.find((m) => m.id === source.archive_media_id)?.url || ''
    : '';
  const description = source.description || '';
  const username = source.account_username || '';
  const displayName = source.account_display_name || username || 'X';
  const handle = username ? `@${username}` : '@x';

  return {
    id: source.id,
    tweetUrl: source.source_url || '',
    text: description,
    author: displayName,
    handle,
    authorAvatar: X_LOGO_SVG,
    timestamp: source.created_at || source.updated_at,
    pinned: !!source.pinned,
    archived: !!source.archived,
    archiveReason: source.archive_reason || null,
    accountSuspended: !!source.account_is_suspended,
    lastCheckedAt: source.last_checked_at || null,
    archiveMediaId: source.archive_media_id || null,
    archiveUrl,
    embedHtml: source.embed_html,
  };
}

function mapNewsArticleSource(source) {
  if (!source) return null;
  const description = source.description || '';
  return {
    id: source.id,
    title: description || source.source_url || 'News article',
    publisher: description || '',
    url: source.source_url || '',
    pinned: !!source.pinned,
    archived: !!source.archived,
  };
}

function mapAdminNoteSource(source, createdByName) {
  if (!source) return null;
  return {
    id: source.id,
    author: source.created_by_name || createdByName || 'Admin',
    text: source.description || '',
    pinned: !!source.pinned,
    archived: !!source.archived,
  };
}

function mapSourcesForShared(sources, updateMedia = [], mediaList = []) {
  const raw = sources || {};
  const archiveMediaIds = new Set(
    (raw.x_post || []).map((s) => s.archive_media_id).filter(Boolean)
  );
  const combinedMedia = [
    ...(raw.image || []),
    ...(raw.video || []),
    ...(updateMedia || []),
  ]
    .filter((m) => !archiveMediaIds.has(m.id))
    .map(mapMediaItem)
    .filter(Boolean);

  return {
    x_post: (raw.x_post || []).map((s) => mapXPostSource(s, mediaList)).filter(Boolean),
    news_article: (raw.news_article || []).map(mapNewsArticleSource).filter(Boolean),
    admin_note: (raw.admin_note || []).map((s) => mapAdminNoteSource(s)).filter(Boolean),
    media: combinedMedia,
  };
}

function mapTimelineForShared(timeline, mediaList = []) {
  if (!Array.isArray(timeline)) return [];
  return timeline.map((update) => {
    const featured = update.featured_item;
    const mappedFeatured = featured
      ? {
          sourceType: featured.source_type,
          sourceId: featured.item_id,
          itemId: featured.item_id,
        }
      : null;

    const updateMedia = (update.media || []).map(mapMediaItem).filter(Boolean);
    const sources = mapSourcesForShared(update.sources, update.media, [...mediaList, ...updateMedia]);

    return {
      id: update.id,
      summary: update.summary || '',
      details: update.details || update.summary || '',
      type: update.type || 'update',
      verificationStatus: update.verification_status || 'unverified',
      updateDate: update.update_date,
      createdByName: update.created_by_name || 'Admin',
      sources,
      media: updateMedia,
      featuredItem: mappedFeatured,
    };
  });
}

function parseGeometry(geometry) {
  if (!geometry) return null;
  if (typeof geometry === 'string') {
    try {
      const parsed = JSON.parse(geometry);
      return parsed && parsed.coordinates ? parsed : null;
    } catch {
      return null;
    }
  }
  if (geometry.coordinates) return geometry;
  if (Array.isArray(geometry)) {
    return { type: 'Polygon', coordinates: geometry };
  }
  return null;
}

export function mapIncidentForShared(data) {
  if (!data) return null;
  const incident = data.incident || {};
  const timeline = data.timeline || [];

  const parsedGeometry = parseGeometry(incident.geometry);
  const polygonRing = parsedGeometry?.coordinates?.[0];
  const fallbackAreaSqM = estimatePolygonAreaSqM(polygonRing);
  const fallbackPerimeterM = estimatePolygonPerimeterM(polygonRing);

  const allMedia = [];
  timeline.forEach((update) => {
    if (Array.isArray(update.media)) {
      allMedia.push(...update.media.map(mapMediaItem).filter(Boolean));
    }
    const rawSources = update.sources || {};
    if (Array.isArray(rawSources.image)) {
      allMedia.push(...rawSources.image.map(mapMediaItem).filter(Boolean));
    }
    if (Array.isArray(rawSources.video)) {
      allMedia.push(...rawSources.video.map(mapMediaItem).filter(Boolean));
    }
  });

  return {
    incident: {
      id: incident.id,
      title: incident.title || '',
      description: incident.description || '',
      status: incident.status || 'active',
      severity: incident.severity ?? 3,
      verification: incident.verification_status || 'unverified',
      heroImageUrl: incident.hero_image_url || '',
      locationContext: incident.location_context || '',
      latitude: incident.latitude,
      longitude: incident.longitude,
      startDate: incident.start_date,
      endDate: incident.end_date,
      categoryName: incident.category_name || '',
      categoryColor: incident.category_color || incident.domain_color || '#6b7280',
      domainName: incident.domain_name || '',
      domainColor: incident.domain_color || '#6b7280',
      createdBy: incident.created_by,
      createdByName: incident.created_by_name || '',
      createdByEmail: incident.created_by_email || '',
      createdAt: incident.created_at,
      updatedAt: incident.updated_at,
      resolvedAt: incident.resolved_at,
      resolvedByName: incident.resolved_by_name,
      resolvedByEmail: incident.resolved_by_email,
      geometryType: incident.geometry_type,
      geometry: parsedGeometry,
      areaSqM: Number.isFinite(Number(incident.area_sq_m)) ? Number(incident.area_sq_m) : fallbackAreaSqM,
      perimeterM: Number.isFinite(Number(incident.perimeter_m)) ? Number(incident.perimeter_m) : fallbackPerimeterM,
      zoneCategoryId: incident.zone_category_id,
      zoneCategoryName: incident.zone_category_name,
      zoneCategoryColor: incident.zone_category_color,
      zoneCategoryIcon: incident.zone_category_icon,
    },
    timeline: mapTimelineForShared(timeline, allMedia),
  };
}

export const api = {
  // Auth
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => request('/auth/me'),

  // Categories
  getCategories: () => request('/categories'),
  getDomains: () => request('/categories/domains'),
  getZoneCategories: () => request('/zone-categories'),

  // Events (public)
  getIncidents: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.date) qs.append('date', params.date);
    if (params.dateFrom) qs.append('dateFrom', params.dateFrom);
    if (params.dateTo) qs.append('dateTo', params.dateTo);
    if (params.categoryId) qs.append('categoryId', params.categoryId);
    if (params.zoneCategoryId) qs.append('zoneCategoryId', params.zoneCategoryId);
    if (params.severity) qs.append('severity', params.severity);
    if (params.status) qs.append('status', params.status);
    if (params.geometryType) qs.append('geometryType', params.geometryType);
    if (params.viewport) qs.append('viewport', params.viewport);
    const query = qs.toString();
    return request(`/incidents${query ? '?' + query : ''}`).then((res) => {
      if (res.data?.incidents) {
        res.data.incidents = res.data.incidents.map((incident) => ({
          ...incident,
          geometry: parseGeometry(incident.geometry),
        }));
      }
      return res;
    });
  },
  searchIncidents: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.q) qs.append('q', params.q);
    if (params.dateFrom) qs.append('dateFrom', params.dateFrom);
    if (params.dateTo) qs.append('dateTo', params.dateTo);
    if (params.categoryId) qs.append('categoryId', params.categoryId);
    if (params.zoneCategoryId) qs.append('zoneCategoryId', params.zoneCategoryId);
    if (params.severity) qs.append('severity', params.severity);
    if (params.status) qs.append('status', params.status);
    if (params.geometryType) qs.append('geometryType', params.geometryType);
    if (params.viewport) qs.append('viewport', params.viewport);
    if (params.limit) qs.append('limit', params.limit);
    if (params.offset !== undefined) qs.append('offset', params.offset);
    const query = qs.toString();
    return request(`/incidents/search${query ? '?' + query : ''}`);
  },
  searchIncidentsAdvanced: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.q) qs.append('q', params.q);
    if (params.dateFrom) qs.append('dateFrom', params.dateFrom);
    if (params.dateTo) qs.append('dateTo', params.dateTo);
    if (params.categoryId) qs.append('categoryId', params.categoryId);
    if (Array.isArray(params.categorySlugs)) {
      params.categorySlugs.forEach((s) => qs.append('categorySlugs', s));
    }
    if (Array.isArray(params.domainSlugs)) {
      params.domainSlugs.forEach((s) => qs.append('domainSlugs', s));
    }
    if (params.zoneCategoryId) qs.append('zoneCategoryId', params.zoneCategoryId);
    if (params.severity !== undefined) qs.append('severity', params.severity);
    if (Array.isArray(params.severities)) {
      params.severities.forEach((s) => qs.append('severities', s));
    }
    if (params.status) qs.append('status', params.status);
    if (Array.isArray(params.statuses)) {
      params.statuses.forEach((s) => qs.append('statuses', s));
    }
    if (params.geometryType) qs.append('geometryType', params.geometryType);
    if (Array.isArray(params.geometryTypes)) {
      params.geometryTypes.forEach((s) => qs.append('geometryTypes', s));
    }
    if (params.verificationStatus) qs.append('verificationStatus', params.verificationStatus);
    if (Array.isArray(params.verificationStatuses)) {
      params.verificationStatuses.forEach((s) => qs.append('verificationStatuses', s));
    }
    if (Array.isArray(params.sourceTypes)) {
      params.sourceTypes.forEach((s) => qs.append('sourceTypes', s));
    }
    if (params.savedOnly) qs.append('savedOnly', 'true');
    if (params.viewport) qs.append('viewport', params.viewport);
    if (params.sort) qs.append('sort', params.sort);
    if (params.limit) qs.append('limit', params.limit);
    if (params.offset !== undefined) qs.append('offset', params.offset);
    const query = qs.toString();
    return request(`/incidents/search${query ? '?' + query : ''}`).then((res) => {
      if (res.data?.incidents) {
        res.data.incidents = res.data.incidents.map((incident) => ({
          ...incident,
          geometry: parseGeometry(incident.geometry),
        }));
      }
      return res;
    });
  },
  getIncident: (id) =>
    request(`/incidents/${id}`).then((res) => {
      if (res.data?.incident) {
        res.data.incident.geometry = parseGeometry(res.data.incident.geometry);
      }
      return res;
    }),

  // Events (admin)
  createIncident: (body) => request('/incidents', { method: 'POST', body: JSON.stringify(body) }),
  updateIncident: (id, body) => request(`/incidents/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteIncident: (id) => request(`/incidents/${id}`, { method: 'DELETE' }),
  resolveIncident: (id, body) => request(`/incidents/${id}/resolve`, { method: 'POST', body: JSON.stringify(body || {}) }),
  restoreIncident: (id) => request(`/incidents/${id}/restore`, { method: 'POST', body: JSON.stringify({}) }),
  purgeIncident: (id) => request(`/incidents/${id}/purge`, { method: 'POST', body: JSON.stringify({}) }),

  // Timeline
  addTimeline: (incidentId, body) =>
    request(`/incidents/${incidentId}/timeline`, { method: 'POST', body: JSON.stringify(body) }),
  updateTimeline: (incidentId, updateId, body) =>
    request(`/incidents/${incidentId}/timeline/${updateId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteTimeline: (incidentId, updateId) =>
    request(`/incidents/${incidentId}/timeline/${updateId}`, { method: 'DELETE' }),
  setFeatured: (incidentId, updateId, body) =>
    request(`/incidents/${incidentId}/timeline/${updateId}/featured`, { method: 'PATCH', body: JSON.stringify(body) }),
  clearFeatured: (incidentId, updateId) =>
    request(`/incidents/${incidentId}/timeline/${updateId}/featured`, { method: 'DELETE' }),

  // Sources
  addSource: (incidentId, body) =>
    request(`/incidents/${incidentId}/sources`, { method: 'POST', body: JSON.stringify(body) }),
  updateSource: (incidentId, sourceId, body) =>
    request(`/incidents/${incidentId}/sources/${sourceId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteSource: (incidentId, sourceId) =>
    request(`/incidents/${incidentId}/sources/${sourceId}`, { method: 'DELETE' }),
  pinSource: (incidentId, sourceId, pinned) =>
    request(`/incidents/${incidentId}/sources/${sourceId}/pin`, { method: 'PATCH', body: JSON.stringify({ pinned }) }),
  archiveSource: (incidentId, sourceId, body) =>
    request(`/incidents/${incidentId}/sources/${sourceId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  checkSource: (incidentId, sourceId) =>
    request(`/incidents/${incidentId}/sources/${sourceId}/check`, { method: 'POST' }),

  // Media
  uploadMedia: (incidentId, file, options = {}) => {
    const formData = new FormData();
    formData.append('file', file);
    if (options.updateId) formData.append('updateId', options.updateId);
    if (options.caption) formData.append('caption', options.caption);
    return request(`/incidents/${incidentId}/media`, {
      method: 'POST',
      body: formData,
    });
  },

  listMedia: (incidentId) => request(`/incidents/${incidentId}/media`),

  deleteMedia: (incidentId, mediaId) =>
    request(`/incidents/${incidentId}/media/${mediaId}`, { method: 'DELETE' }),

  updateMedia: (incidentId, mediaId, body) =>
    request(`/incidents/${incidentId}/media/${mediaId}`, { method: 'PATCH', body: JSON.stringify(body) }),

  pinMedia: (incidentId, mediaId, pinned) =>
    request(`/incidents/${incidentId}/media/${mediaId}/pin`, { method: 'PATCH', body: JSON.stringify({ pinned }) }),

  reorderMedia: (incidentId, mediaId, displayOrder) =>
    request(`/incidents/${incidentId}/media/${mediaId}/order`, {
      method: 'PATCH',
      body: JSON.stringify({ displayOrder }),
    }),

  // Notifications
  getNotifications: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.limit) qs.append('limit', params.limit);
    if (params.offset !== undefined) qs.append('offset', params.offset);
    if (params.unreadOnly) qs.append('unreadOnly', 'true');
    const query = qs.toString();
    return request(`/notifications${query ? '?' + query : ''}`);
  },
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () => request('/notifications/mark-all-read', { method: 'POST' }),
  deleteNotification: (id) => request(`/notifications/${id}`, { method: 'DELETE' }),

  // Staff saved incidents
  getStaffSavedIncidents: () => request('/incidents/staff/saved').then((res) => {
    if (res.data?.incidents) {
      res.data.incidents = res.data.incidents.map((incident) => ({
        ...incident,
        geometry: parseGeometry(incident.geometry),
      }));
    }
    return res;
  }),
  isIncidentSavedByStaff: (id) => request(`/incidents/staff/${id}/saved`),
  saveIncidentForStaff: (id, notes) => request(`/incidents/staff/${id}/save`, { method: 'POST', body: JSON.stringify({ notes }) }),
  unsaveIncidentForStaff: (id) => request(`/incidents/staff/${id}/save`, { method: 'DELETE' }),

  // Staff recents
  getStaffRecents: (type, limit) => {
    const qs = new URLSearchParams();
    qs.append('type', type);
    if (limit) qs.append('limit', limit);
    return request(`/staff/recents?${qs.toString()}`);
  },
  recordStaffRecent: (type, payload) => request('/staff/recents', { method: 'POST', body: JSON.stringify({ type, payload }) }),
  clearStaffRecents: (type) => {
    const qs = new URLSearchParams();
    if (type) qs.append('type', type);
    return request(`/staff/recents?${qs.toString()}`, { method: 'DELETE' });
  },
};
