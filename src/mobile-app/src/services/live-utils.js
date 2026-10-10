// Pure helpers for the live layer (P11) — NO React Native imports so the
// mapping/diff logic stays unit-testable in plain Node.
//
// Backend SSE payloads (src/backend/src/utils/sse-broadcast.js +
// controllers): every frame is `data: <json>` with one of:
//   incident_created/updated/resolved { incident }
//   incident_deleted { incidentId }
//   timeline_added { incidentId, update }
//   timeline_updated/deleted { incidentId, updateId }
//   user_updated/deleted, public_user_updated (admin-console traffic — ignored)
//
// Feed entries render in the Activity sheet; alert entries persist in the
// local alert store. colorToken resolves against theme tokens at render time
// (tokens-only rule).

export const FEED_CAP = 50;
export const ALERT_CAP = 50;
export const AWAY_THRESHOLD_MS = 15 * 60 * 1000;
export const DIFF_ALERT_CAP = 10; // max alerts created per foreground diff

// Notification prefs (P12, prototype #set-notif): gate which alert entries get
// created. `sound` is stored but not acted on — no audio playback yet.
export const DEFAULT_NOTIF_PREFS = {
  newIncidents: true,
  updates: true,
  zones: false,
  criticalOnly: false,
  sound: true,
};

// True when an alert entry passes the user's notification prefs. Severity gate
// (criticalOnly) only drops rows whose severity is known and < S4 — unknown
// severity (e.g. timeline events without a resolved parent) passes.
export function shouldAlert(alert, prefs) {
  const p = { ...DEFAULT_NOTIF_PREFS, ...(prefs || {}) };
  if (alert.type === 'new' && !p.newIncidents) {
    return false;
  }
  if ((alert.type === 'update' || alert.type === 'resolved') && !p.updates) {
    return false;
  }
  if (alert.type === 'zone' && !p.zones) {
    return false;
  }
  if (p.criticalOnly) {
    const sev = parseInt(alert.item?.severity, 10);
    if (Number.isFinite(sev) && sev < 4) {
      return false;
    }
  }
  return true;
}

let seq = 0;
export function nextId(prefix) {
  seq += 1;
  return `${prefix}_${Date.now().toString(36)}_${seq}`;
}

function isZoneRow(incident) {
  return incident && incident.geometry_type === 'polygon';
}

function locOf(incident) {
  return (
    incident?.location_context ||
    incident?.location ||
    incident?.region ||
    null
  );
}

function catOf(incident) {
  return (
    incident?.domain_name || incident?.category_name || incident?.category || null
  );
}

export function areaKm2(item) {
  const m2 = parseFloat(item?.area_sq_m);
  if (!Number.isFinite(m2)) {
    return null;
  }
  const km2 = m2 / 1e6;
  const rounded = km2 >= 100 ? Math.round(km2) : Math.round(km2 * 10) / 10;
  const grouped = String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${grouped} km²`;
}

function incidentAlertSub(incident) {
  const parts = [catOf(incident), locOf(incident)].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'Incident';
}

function zoneAlertSub(zone) {
  const area = areaKm2(zone);
  const parts = [zone?.zone_category_name || 'Zone', area].filter(Boolean);
  return parts.join(' · ');
}

// Map one SSE event to { feed, alert } — either side may be null.
// lookupIncident(id) resolves a title/row for timeline events (optional).
export function mapSseEvent(evt, lookupIncident) {
  if (!evt || typeof evt.type !== 'string') {
    return null;
  }
  const now = new Date().toISOString();
  const find = typeof lookupIncident === 'function' ? lookupIncident : () => null;

  switch (evt.type) {
    case 'incident_created': {
      const inc = evt.incident;
      if (!inc) return null;
      const zone = isZoneRow(inc);
      return {
        feed: {
          id: nextId('fe'),
          action: zone ? 'New zone' : 'New incident',
          colorToken: zone ? 'catMaritime' : 'success',
          title: inc.title || 'Untitled',
          timeISO: now,
          kind: zone ? 'zone' : 'incident',
          itemId: inc.id || null,
          item: inc,
        },
        alert: {
          id: nextId('al'),
          type: zone ? 'zone' : 'new',
          title: `${zone ? 'Zone activated' : 'New incident'}: ${inc.title || 'Untitled'}`,
          sub: zone ? zoneAlertSub(inc) : incidentAlertSub(inc),
          timeISO: now,
          read: false,
          kind: zone ? 'zone' : 'incident',
          itemId: inc.id || null,
          item: inc,
          dedupeKey: `${zone ? 'zone' : 'new'}:${inc.id}`,
        },
      };
    }
    case 'incident_updated': {
      const inc = evt.incident;
      if (!inc) return null;
      const zone = isZoneRow(inc);
      return {
        feed: {
          id: nextId('fe'),
          action: zone ? 'Zone updated' : 'Updated',
          colorToken: zone ? 'catMaritime' : 'sev2',
          title: inc.title || 'Untitled',
          timeISO: now,
          kind: zone ? 'zone' : 'incident',
          itemId: inc.id || null,
          item: inc,
        },
        alert: {
          id: nextId('al'),
          type: 'update',
          title: `Updated: ${inc.title || 'Untitled'}`,
          sub: zone ? zoneAlertSub(inc) : incidentAlertSub(inc),
          timeISO: now,
          read: false,
          kind: zone ? 'zone' : 'incident',
          itemId: inc.id || null,
          item: inc,
          dedupeKey: null,
        },
      };
    }
    case 'incident_resolved': {
      const inc = evt.incident;
      if (!inc) return null;
      return {
        feed: {
          id: nextId('fe'),
          action: 'Resolved',
          colorToken: 'textMuted',
          title: inc.title || 'Untitled',
          timeISO: now,
          kind: isZoneRow(inc) ? 'zone' : 'incident',
          itemId: inc.id || null,
          item: inc,
        },
        alert: {
          id: nextId('al'),
          type: 'resolved',
          title: `Resolved: ${inc.title || 'Untitled'}`,
          sub: zoneAlertSub(inc),
          timeISO: now,
          read: false,
          kind: isZoneRow(inc) ? 'zone' : 'incident',
          itemId: inc.id || null,
          item: inc,
          dedupeKey: null,
        },
      };
    }
    case 'incident_deleted': {
      if (!evt.incidentId) return null;
      return {
        feed: {
          id: nextId('fe'),
          action: 'Removed',
          colorToken: 'textMuted',
          title: find(evt.incidentId)?.title || 'An incident was removed',
          timeISO: now,
          kind: 'incident',
          itemId: null,
          item: null,
        },
        alert: null,
      };
    }
    case 'timeline_added': {
      const summary = evt.update?.summary || evt.update?.details || 'Update added';
      const parent = evt.incidentId ? find(evt.incidentId) : null;
      return {
        feed: {
          id: nextId('fe'),
          action: 'Timeline update',
          colorToken: 'sev2',
          title: parent?.title || summary,
          timeISO: now,
          kind: 'incident',
          itemId: evt.incidentId || null,
          item: parent || (evt.incidentId ? { id: evt.incidentId } : null),
        },
        alert: {
          id: nextId('al'),
          type: 'update',
          title: `Update: ${summary}`,
          sub: parent?.title || 'Incident timeline',
          timeISO: now,
          read: false,
          kind: 'incident',
          itemId: evt.incidentId || null,
          item: parent || (evt.incidentId ? { id: evt.incidentId } : null),
          dedupeKey: null,
        },
      };
    }
    case 'timeline_updated':
    case 'timeline_deleted': {
      const parent = evt.incidentId ? find(evt.incidentId) : null;
      return {
        feed: {
          id: nextId('fe'),
          action: evt.type === 'timeline_updated' ? 'Timeline updated' : 'Timeline removed',
          colorToken: 'sev2',
          title: parent?.title || 'Incident timeline',
          timeISO: now,
          kind: 'incident',
          itemId: evt.incidentId || null,
          item: parent || (evt.incidentId ? { id: evt.incidentId } : null),
        },
        alert: null,
      };
    }
    default:
      return null; // user_* / public_user_* / auth traffic — not map activity
  }
}

// List-diff (signed-out fallback + signed-in background gap heal): rows whose
// ids are absent from seenIds are brand new since the last snapshot.
export function diffNewRows(rows, seenIds) {
  const seen = new Set(seenIds || []);
  return (rows || []).filter((r) => r && r.id && !seen.has(r.id));
}

// Convert a freshly-diffed list row into an alert entry (new/zone only).
export function diffRowToAlert(row, zone) {
  const now = new Date().toISOString();
  return {
    id: nextId('al'),
    type: zone ? 'zone' : 'new',
    title: `${zone ? 'Zone activated' : 'New incident'}: ${row.title || 'Untitled'}`,
    sub: zone ? zoneAlertSub(row) : incidentAlertSub(row),
    timeISO: now,
    read: false,
    kind: zone ? 'zone' : 'incident',
    itemId: row.id || null,
    item: row,
    dedupeKey: `${zone ? 'zone' : 'new'}:${row.id}`,
  };
}

export function capList(list, cap) {
  return list.length > cap ? list.slice(0, cap) : list;
}

// "While you were away" counts from alerts created after `since` (ISO).
export function awayCounts(alerts, sinceISO) {
  const since = sinceISO ? Date.parse(sinceISO) : 0;
  let newCount = 0;
  let updateCount = 0;
  (alerts || []).forEach((a) => {
    if (!a.timeISO || Date.parse(a.timeISO) <= since) {
      return;
    }
    if (a.type === 'new' || a.type === 'zone') {
      newCount += 1;
    } else {
      updateCount += 1;
    }
  });
  return { newCount, updateCount };
}

// Compact relative time for feed/alert rows ("2h", "3d", "just now").
export function compactAgo(iso) {
  const t = iso ? Date.parse(iso) : NaN;
  if (!Number.isFinite(t)) {
    return '';
  }
  const mins = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}
