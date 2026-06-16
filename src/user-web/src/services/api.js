const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

function mapMediaItem(item) {
  if (!item) return null;
  return {
    id: item.id,
    url: item.file_url,
    thumbnailUrl: item.thumbnail_url,
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

function mapXPostSource(source, mediaList = []) {
  if (!source) return null;
  const archiveUrl = source.archived && source.archive_media_id
    ? mediaList.find((m) => m.id === source.archive_media_id)?.file_url || ''
    : '';
  const description = source.description || '';
  const author = description.split(' ')[0] || 'X';
  return {
    id: source.id,
    tweetUrl: source.source_url || '',
    text: description,
    author,
    handle: '@x',
    authorAvatar: '',
    timestamp: source.created_at || source.updated_at,
    pinned: !!source.pinned,
    archived: !!source.archived,
    archiveUrl,
    embedHtml: source.embed_html,
    verificationStatus: source.verification_status,
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
    verificationStatus: source.verification_status,
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
    verificationStatus: source.verification_status,
  };
}

function mapSourcesForShared(sources, updateMedia = [], mediaList = []) {
  const raw = sources || {};
  const combinedMedia = [
    ...(raw.image || []),
    ...(raw.video || []),
    ...(updateMedia || []),
  ].map(mapMediaItem).filter(Boolean);

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
    const sources = mapSourcesForShared(update.sources, updateMedia, [...mediaList, ...updateMedia]);

    return {
      id: update.id,
      summary: update.summary || '',
      details: update.summary || '',
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

export function mapIncidentForShared(data) {
  if (!data) return null;
  const incident = data.incident || {};
  const timeline = data.timeline || [];

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
      verification: incident.verification_status || incident.verification_override || 'unverified',
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
      geometry: incident.geometry,
      areaSqM: incident.area_sq_m,
      perimeterM: incident.perimeter_m,
      zoneCategoryName: incident.zone_category_name,
      zoneCategoryColor: incident.zone_category_color,
      zoneCategoryIcon: incident.zone_category_icon,
    },
    timeline: mapTimelineForShared(timeline, allMedia),
  };
}

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
