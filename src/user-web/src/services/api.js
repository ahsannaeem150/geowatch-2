import { estimatePolygonAreaSqM, estimatePolygonPerimeterM } from '@shared/utils/zoneGeometry.js';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

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
      domainLightColor: incident.domain_light_color || incident.domain_color || '#6b7280',
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
    return request(`/incidents${query ? '?' + query : ''}`).then((res) => {
      if (res.data?.incidents) {
        res.data.incidents = res.data.incidents.map((incident) => ({
          ...incident,
          domainLightColor: incident.domain_light_color || incident.domain_color || '#6b7280',
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
    if (params.severity) qs.append('severity', params.severity);
    if (params.limit) qs.append('limit', params.limit);
    if (params.offset !== undefined) qs.append('offset', params.offset);
    const query = qs.toString();
    return request(`/incidents/search${query ? '?' + query : ''}`);
  },
  getIncident: (id) =>
    request(`/incidents/${id}`).then((res) => {
      if (res.data?.incident) {
        res.data.incident.geometry = parseGeometry(res.data.incident.geometry);
      }
      return res;
    }),

  // Public user auth
  publicLogin: (idToken) => request('/auth/public/google', {
    method: 'POST',
    body: JSON.stringify({ idToken }),
  }),
  publicMe: () => request('/auth/public/me'),

  // Media
  listMedia: (incidentId) => request(`/incidents/${incidentId}/media`),

  // Sources (public)
  checkSource: (incidentId, sourceId) =>
    request(`/incidents/${incidentId}/sources/public/${sourceId}/check`, { method: 'POST' }),

  // Saved incidents
  listSavedIncidents: () => request('/incidents/saved'),
  saveIncident: (id) => request(`/incidents/${id}/save`, { method: 'POST' }),
  unsaveIncident: (id) => request(`/incidents/${id}/save`, { method: 'DELETE' }),
  checkSaved: (id) => request(`/incidents/${id}/saved`),
};
