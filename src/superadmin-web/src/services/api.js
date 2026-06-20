const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

function getToken() {
  return localStorage.getItem('superadmin_token');
}

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const token = getToken();

  const headers = {
    ...options.headers,
  };

  // Only set JSON content-type for non-FormData bodies
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

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

// ─── Shared incident-detail mapper ───

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

export function getUserActivity(id, params = {}) {
  const qs = new URLSearchParams(params).toString();
  return request(`/users/${id}/activity${qs ? `?${qs}` : ''}`);
}

export function getUserActivityPageForIncident(id, params = {}) {
  const qs = new URLSearchParams(params).toString();
  return request(`/users/${id}/activity/page-for-incident${qs ? `?${qs}` : ''}`);
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

export function getPublicUserActivity(id, params = {}) {
  const qs = new URLSearchParams(params).toString();
  return request(`/public-users/${id}/activity${qs ? `?${qs}` : ''}`);
}

export function getPublicUserActivityPageForIncident(id, params = {}) {
  const qs = new URLSearchParams(params).toString();
  return request(`/public-users/${id}/activity/page-for-incident${qs ? `?${qs}` : ''}`);
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

export function getOEmbed(url) {
  const qs = new URLSearchParams({ url }).toString();
  return request(`/system/oembed?${qs}`);
}

// ─── Incidents ───

export function getIncidents(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return request(`/incidents?${qs}`);
}

export function getIncident(id) {
  return request(`/incidents/${id}`);
}

export function createIncident(body) {
  return request('/incidents', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateIncident(id, body) {
  return request(`/incidents/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function getDomains() {
  return request('/categories/domains');
}

// ─── Recycle Bin ───

export function listDeletedIncidents(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return request(`/incidents/deleted${qs ? `?${qs}` : ''}`);
}

export function getDeletedIncident(id) {
  return request(`/incidents/deleted/${id}`);
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

// ─── Timeline ───

export function addTimeline(incidentId, body) {
  return request(`/incidents/${incidentId}/timeline`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateTimeline(incidentId, updateId, body) {
  return request(`/incidents/${incidentId}/timeline/${updateId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function deleteTimeline(incidentId, updateId) {
  return request(`/incidents/${incidentId}/timeline/${updateId}`, { method: 'DELETE' });
}

export function setFeatured(incidentId, updateId, body) {
  return request(`/incidents/${incidentId}/timeline/${updateId}/featured`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function clearFeatured(incidentId, updateId) {
  return request(`/incidents/${incidentId}/timeline/${updateId}/featured`, { method: 'DELETE' });
}

// ─── Sources ───

export function addSource(incidentId, body) {
  return request(`/incidents/${incidentId}/sources`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateSource(incidentId, sourceId, body) {
  return request(`/incidents/${incidentId}/sources/${sourceId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function deleteSource(incidentId, sourceId) {
  return request(`/incidents/${incidentId}/sources/${sourceId}`, { method: 'DELETE' });
}

export function pinSource(incidentId, sourceId, pinned) {
  return request(`/incidents/${incidentId}/sources/${sourceId}/pin`, {
    method: 'PATCH',
    body: JSON.stringify({ pinned }),
  });
}

export function checkSource(incidentId, sourceId) {
  return request(`/incidents/${incidentId}/sources/${sourceId}/check`, { method: 'POST' });
}

// ─── Media ───

export function uploadMedia(incidentId, file, options = {}) {
  const formData = new FormData();
  formData.append('file', file);
  if (options.updateId) formData.append('updateId', options.updateId);
  if (options.caption) formData.append('caption', options.caption);
  return request(`/incidents/${incidentId}/media`, {
    method: 'POST',
    body: formData,
  });
}

export function listMedia(incidentId) {
  return request(`/incidents/${incidentId}/media`);
}

export function deleteMedia(incidentId, mediaId) {
  return request(`/incidents/${incidentId}/media/${mediaId}`, { method: 'DELETE' });
}

export function updateMedia(incidentId, mediaId, body) {
  return request(`/incidents/${incidentId}/media/${mediaId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function pinMedia(incidentId, mediaId, pinned) {
  return request(`/incidents/${incidentId}/media/${mediaId}/pin`, {
    method: 'PATCH',
    body: JSON.stringify({ pinned }),
  });
}

// ─── X Archive Debug ───

export function getXArchiveDebug(filters = {}) {
  const qs = new URLSearchParams();
  if (filters.accountId) qs.set('accountId', filters.accountId);
  if (filters.archived !== undefined && filters.archived !== '') qs.set('archived', filters.archived);
  if (filters.archiveReason) qs.set('archiveReason', filters.archiveReason);
  const query = qs.toString();
  return request(`/x-archive-debug${query ? `?${query}` : ''}`);
}

export function setAccountSuspended(accountId, isSuspended) {
  return request(`/x-archive-debug/accounts/${accountId}/suspended`, {
    method: 'PATCH',
    body: JSON.stringify({ isSuspended }),
  });
}

export function checkXArchiveSource(sourceId) {
  return request(`/x-archive-debug/sources/${sourceId}/check`, { method: 'POST' });
}

export function snapshotXArchiveSource(sourceId) {
  return request(`/x-archive-debug/sources/${sourceId}/snapshot`, { method: 'POST' });
}

export function archiveXArchiveSource(sourceId, body) {
  return request(`/x-archive-debug/sources/${sourceId}/archive`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}
