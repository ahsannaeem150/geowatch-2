# Activity & Notifications Design Notes

> **Trial-only reference.** This document captures the activity / notification / animation concepts tested in `/trial/map-workspace-a`. The simulation logic inside the trial page is **not** meant to be copied into the real apps as-is; this file describes the intended real implementation.

---

## 1. Live Activity vs Notifications

| | Live Activity | Notifications |
|---|---|---|
| **What it is** | A real-time, public event stream of everything happening on the platform. | A personal inbox of events that matter to the logged-in user. |
| **Scope** | Global — every staff/admin/public user sees the same stream. | User-specific — based on watched zones, saved incidents, assignments, or explicit follows. |
| **Persistence** | Transient / recent history. Older items can fall off or be archived. | Persistent. Survives logout. Requires explicit read/dismiss. |
| **Examples** | “New incident reported in Kabul”, “Zone perimeter expanded”, “Incident resolved”. | “Severe incident in your watched zone”, “An incident you saved was updated”, “You were assigned an incident”. |
| **Primary UI** | Bottom ambient ticker + Activity drawer tab. | Notifications drawer tab + badge on the rail icon. |
| **Badge meaning** | New activity events since the user last opened the Activity tab (session-level). | Unread persistent notifications (cross-session). |

### Relationship

- A new high-severity incident may generate **both** an activity item and a notification.
- An incident update appears in the activity stream for everyone, but only becomes a notification for users who have saved, followed, or are assigned to that incident.
- Opening the Activity tab clears the Activity badge; it does **not** mark Notifications as read.

---

## 2. What Should Generate a Notification

This is the intended real-app logic. The trial simulates a subset of it.

1. **High-severity new incidents**  
   Any new incident with severity 4–5 creates a notification for relevant users (e.g., staff, users with watched zones covering the incident).

2. **Updates to viewed / saved / followed incidents**  
   When an incident the user has previously interacted with receives a status change, timeline update, new source, or media, notify the user.

3. **Activity inside watched zones / areas**  
   Users can draw or subscribe to zones. Any new incident or update inside that zone generates a notification.

4. **Assignments / mentions**  
   If an incident is assigned to a user or they are mentioned, create a notification.

5. **System alerts**  
   Maintenance, policy changes, etc.

---

## 3. Animation & Per-User State

The goal is to make the map feel alive without being annoying. Animations should only play for events the user has not yet seen.

### Rules

| Event type | Visual indicator | Trigger |
|---|---|---|
| **New incident** | Red pulse, ~8 seconds | Incident is new to the user (`created_at > user.last_seen_at`) and enters the viewport for the first time in this session. |
| **Updated incident** | Amber ring, ~2 seconds | Incident was updated after the user last saw it (`updated_at > user.last_seen_at`) and enters the viewport for the first time in this session. |
| **Multiple pending updates** | Small counter badge on the marker | More than one unseen update exists for the same incident. |

### State model

- **`users.last_seen_at`** — updated on logout / app close / periodic heartbeat. The baseline for “has this user seen this yet?”.
- **`animated_ids` (session Set)** — prevents an animation from replaying more than once per session, even if the marker leaves and re-enters the viewport.
- **Per-user read state** — for notifications, either a `notifications` table with `read_at`, or a `user_incident_reads` table tracking `last_read_update_at` per incident.

### Session-only vs persisted

- Animation playback is **session-only** (`animated_ids` Set).
- Whether an incident is considered “new / updated” is **persisted** (`last_seen_at`, read state).

---

## 4. Trial Simulation vs Real Implementation

| Concern | Trial simulation | Real implementation |
|---|---|---|
| Activity feed | Dummy array + random `setInterval` events | Backend event stream / SSE |
| Notifications | Dummy list derived from dummy events | `notifications` table or event-sourced read state |
| `last_seen_at` | Hard-coded `lastLogout` timestamp | `users.last_seen_at`, updated on logout/close |
| Viewed incidents | In-memory `viewedIds` Set | `user_incident_reads` or interaction tracking |
| Viewport bounds | Simulated state with pan buttons | Real MapLibre viewport from `map.getBounds()` |
| Animation triggers | CSS keyframes on list cards + canvas placeholder | MapLibre marker layers with CSS/SVG animations |

---

## 5. Data Shapes

### Activity event

```ts
{
  id: string;
  type: 'new' | 'update' | 'resolved' | 'zone';
  message: string;
  incidentId?: string;
  severity?: number;
  createdAt: Date;
}
```

### Notification

```ts
{
  id: string;
  type: 'new_incident' | 'incident_update' | 'zone_activity' | 'assignment';
  title: string;
  message: string;
  incidentId?: string;
  read: boolean;
  createdAt: Date;
}
```

### Incident (animation-relevant fields)

```ts
{
  id: string;
  title: string;
  category: string;
  severity: number;
  lat: number;
  lng: number;
  createdAt: Date;
  updatedAt: Date;
  status: string;
}
```

---

## 6. UI Conventions

- **Activity badge** = count of activity events with `createdAt > activityLastSeenAt`.
- **Notifications badge** = count of notifications with `read === false`.
- **New / Updated chips** on incident cards use red for new and amber for updates.
- **Toasts** appear only for severity 4–5 new incidents (or other explicitly high-priority events).
- **Bottom ticker** cycles through recent activity items and can be expanded into a grid.

---

## 7. Recents Drawer

The Recents drawer shows incidents the user has recently opened/viewed. It is separate from Activity and Notifications.

### Behavior

| | Trial | Real app |
|---|---|---|
| **Data source** | In-memory map of opened incident IDs + timestamps. | Per-user `recently_viewed_incidents` table or equivalent, linked to the user account. |
| **Persistence** | Session-only. Lost on refresh/logout. | Persistent. Survives logout and is available across devices. |
| **Ordering** | Most recently viewed first. | Most recently viewed first. |
| **Clear action** | "Clear" button wipes the session list. | "Clear" button deletes the user’s persisted recent history. |
| **Limit** | No limit in trial; real app should cap at e.g. 50 items. | Cap at e.g. 50 items, pruning oldest on insert. |

### When an incident is recorded

- Any time the user opens an incident detail panel (from list, map marker, notification, etc.), record/update the timestamp.
- Do not record passive previews (e.g. hover) — only explicit opens.

### UI conventions

- Each recent item shows the incident title, location, category, and **when it was last viewed** (e.g. "viewed 5m ago").
- The list is scrollable and has a "Clear" action in the header.

---

## 8. Integration Checklist for Real Apps

When this layout is moved out of the trial route:

- [ ] Replace dummy `lastLogout` with real `users.last_seen_at`.
- [ ] Replace dummy viewport state with MapLibre `map.getBounds()`.
- [ ] Replace random `setInterval` events with backend SSE / websocket events.
- [ ] Implement `notifications` table and read/dismiss endpoints.
- [ ] Track viewed/saved/followed incidents per user.
- [ ] Implement watched-zone subscriptions and notification generation.
- [ ] Move marker pulse/ring animations from list cards to real map markers.
- [ ] Add per-user `animated_ids` persistence if cross-device animation suppression is required.
