import { query } from '../config/database.js';

// Maps audit_actions to the SSE-equivalent event types the frontends already
// render. Zones are incidents (geometry_type='polygon') and are audited with
// the incident_* actions; the zone_* constants exist but have no call sites,
// so they are mapped here anyway for future-proofing.
const ACTION_TO_EVENT_TYPE = {
  incident_created: 'incident_created',
  zone_created: 'incident_created',
  incident_updated: 'incident_updated',
  zone_updated: 'incident_updated',
  incident_restored: 'incident_updated',
  incident_resolved: 'incident_resolved',
  incident_deleted: 'incident_deleted',
  incident_purged: 'incident_deleted',
  zone_deleted: 'incident_deleted',
  timeline_added: 'timeline_added',
  timeline_updated: 'timeline_updated',
  timeline_deleted: 'timeline_deleted',
};

const TRACKED_ACTIONS = Object.keys(ACTION_TO_EVENT_TYPE);

// audit_logs.target_id is VARCHAR; only cast to uuid when it looks like one.
const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export async function listStaffActivity(limit = 50) {
  const result = await query(
    `SELECT
       a.id,
       a.action,
       a.created_at,
       CASE WHEN a.target_type = 'incident' THEN a.target_id ELSE a.details->>'incidentId' END AS incident_ref,
       a.details->>'title' AS details_title,
       a.details->>'summary' AS details_summary,
       a.details->>'geometryType' AS details_geometry_type,
       i.title AS incident_title,
       i.geometry_type
     FROM audit_logs a
     LEFT JOIN incidents i
       ON i.id = CASE
         WHEN (CASE WHEN a.target_type = 'incident' THEN a.target_id ELSE a.details->>'incidentId' END)
              ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
         THEN (CASE WHEN a.target_type = 'incident' THEN a.target_id ELSE a.details->>'incidentId' END)::uuid
       END
     WHERE a.action = ANY($1)
     ORDER BY a.created_at DESC, a.id DESC
     LIMIT $2`,
    [TRACKED_ACTIONS, Math.min(limit, 100)]
  );

  return result.rows.map((row) => ({
    id: String(row.id),
    type: ACTION_TO_EVENT_TYPE[row.action],
    // Timeline audit rows carry no title — prefer the joined incident title,
    // fall back to audit details (deleted incidents lose the join).
    title: row.incident_title ?? row.details_title ?? row.details_summary ?? null,
    incidentId: row.incident_ref && UUID_REGEX.test(row.incident_ref) ? row.incident_ref : null,
    geometryType: row.geometry_type ?? row.details_geometry_type ?? null,
    at: row.created_at,
  }));
}
