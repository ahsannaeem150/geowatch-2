# GeoWatch Superadmin Enhancement Plan

This document is the single source of truth for the multi-phase superadmin enhancement project. When context is compacted, read this file first to restore full state.

---

## Project Context

GeoWatch is a geospatial incident monitoring platform with three frontend apps:
- **user-web** (`localhost:5173`) — public map for browsing incidents
- **admin-web** (`localhost:5174`) — staff incident creation/management
- **superadmin-web** (`localhost:5175`) — superadmin console

Backend runs on Express at `localhost:3000`. Database is PostgreSQL 16 + PostGIS 3.

---

## Process Rules (MANDATORY)

After completing each phase:
1. **Append the phase summary** to `commit.md` (create if it doesn't exist)
2. **Provide the user** with a short one-line git commit message
3. **Do NOT run `git commit`** unless explicitly instructed to

---

## Phase 1: Auth Cleanup — Remove `viewer` Role

**Status: ✅ COMPLETE**

Removed the `viewer` role entirely. Staff roles are now `super_admin` and `admin` only.

- Updated Zod schemas (user schema, auth schema)
- Updated auth controller (no longer accepts `viewer`)
- Updated superadmin frontend dropdowns/filters
- Updated shared constants (`USER_ROLES`)
- Updated all documentation
- Existing `viewer` rows in DB remain but cannot be created anymore

**Commit.md summary:**
```
Removed viewer role from entire system. Staff roles now limited to super_admin and admin. Updated Zod schemas, auth controller, frontend dropdowns, shared constants, and documentation. Existing viewer rows remain in DB but cannot be created through any flow.
```

**Git commit message:**
```
feat(auth): remove viewer role, restrict staff to super_admin and admin only
```

---

## Phase 2: Public User Management

**Status: ✅ COMPLETE**

Added `is_active` soft-ban support to `public_users`. Built full public user management in superadmin.

**Backend:**
- `GET /api/v1/public-users` — list, search, filter by `isActive`, paginated
- `GET /api/v1/public-users/:id` — profile + `savedCount` + full `savedIncidents` list
- `PATCH /api/v1/public-users/:id` — toggle `isActive` (ban/unban), audited
- Auth middleware rejects deactivated public users with 403

**Audit actions added:**
- `PUBLIC_USER_LOGIN`, `PUBLIC_USER_BANNED`, `PUBLIC_USER_UNBANNED`

**Frontend:**
- "Public Users" page with search, status filter, ban/unban toggle
- Detail drawer showing saved incident list with domain badges and notes

**Commit.md summary:**
```
Added public user management to superadmin console. Backend endpoints for listing, searching, filtering, and banning/unbanning public users. is_active soft-ban support with audit logging. Frontend Public Users page with detail drawer showing saved incidents, domain badges, and notes.
```

**Git commit message:**
```
feat(superadmin): public user management with soft-ban, search, and saved incident detail
```

---

## Phase 3: Map in Superadmin Panel

**Status: ✅ COMPLETE**

Integrated the public map into `/superadmin/map` with admin-only overlays.

**Files created:**
- `src/superadmin-web/src/pages/MapPage.jsx`
- `src/superadmin-web/src/components/Map/SuperadminMap.jsx`
- `src/superadmin-web/src/components/Map/IncidentDetailPanel.jsx`
- `src/superadmin-web/src/components/Map/MapControls.jsx`
- `src/superadmin-web/src/components/DatePicker/DatePicker.jsx`
- `src/superadmin-web/src/components/LocationSearch/LocationSearch.jsx`

**Key features:**
- Full-bleed map with domain-colored, severity-sized markers
- Smart viewport filtering (100-event threshold)
- Deep-linking `?incident=uuid` with ghost marker support
- Date range picker with Live/Historic mode indicator
- Domain legend with show/hide all toggles
- Location search (Nominatim) with coordinate parsing
- SSE stream for real-time updates
- Admin-only overlays:
  - Debug metadata toggle in popups
  - "Open in Admin →" link in popups
  - Inline edit form (title, description, severity, category, dates, location, verification)
  - Resolve button with confirmation modal
  - Delete button with confirmation modal (moves to recycle bin)
  - Status badge in detail panel

**Files modified:**
- `src/superadmin-web/src/App.jsx` — added `/superadmin/map` route
- `src/superadmin-web/src/components/Layout/Sidebar.jsx` — added Map nav item
- `src/superadmin-web/src/components/Layout/Layout.jsx` — conditional padding for full-bleed map
- `src/superadmin-web/src/services/api.js` — added `updateIncident`, `deleteIncident`, `resolveIncident`

**Commit.md summary:**
```
Integrated public map into superadmin panel at /superadmin/map. Copied and adapted map stack from user-web with admin-only overlays: inline edit form, resolve/delete actions, debug metadata toggle, and status badges. Added missing incident mutation APIs. Fixed Layout padding for full-bleed map route. Added status filter (Active/Resolved/All) to map controls.
```

**Git commit message:**
```
feat(superadmin): integrate map with admin overlays, inline edit, resolve, delete
```

---

## Phase 4: Separate Activity Logs — System vs. Public User Activity

**Status: ✅ COMPLETE**

**Scope:**

1. **Database migration:**
   - Add `realm` enum column (`'system'` | `'user'`) to `audit_logs`
   - Add `actor_type` enum column (`'staff'` | `'public_user'`) to `audit_logs`
   - Backfill existing rows as `realm='system'`, `actor_type='staff'`

2. **Backend tracking expansion:**
   - **System realm** (existing): staff logins, incident CRUD, source/timeline changes, user management
   - **User realm** (new): public user Google logins, incident saves, incident unsaves, incident views (sampled, not every scroll)

3. **Frontend:**
   - Rename current Audit page to "System Activity"
   - New "Public Activity" page — same dense table UI, filters tailored to user actions (login, save, view)
   - Both pages share the same `AuditTable` component but pull different data
   - Expand `audit-actions.js` with public user action constants + colors/labels

**Why:** Now that superadmin can see public users (Phase 2) and the map (Phase 3), they need to see what those users are doing. Separate pages keep the mental model clean — one page tracks "who changed the system," the other tracks "what are users doing on the platform."

**Commit.md summary (template):**
```
Split audit logging into two realms. Added realm and actor_type columns to audit_logs. Existing logs migrated to system realm. New tracking for public user actions: logins, saves, unsaves, views. Superadmin gets two separate pages: "System Activity" (staff audit trail) and "Public Activity" (user behavior log). Shared table component, separate filters and action color maps.
```

**Git commit message (template):**
```
feat(superadmin): separate system activity and public user activity logs with realm tracking
```

---

## Phase 5: Profile Pages — Activity Timelines & Stats (Part 1)

**Status: ⏳ NOT STARTED**

**Scope:**

1. **Staff profile enhancement:**
   - `UserDetailDrawer` gets new "Activity Timeline" tab
   - Chronological list of everything this admin did: created incident X, resolved incident Y, updated source Z, banned public user P
   - Stats cards: incidents created, incidents resolved, sources added, timeline updates, last active

2. **Public user profile enhancement:**
   - `PublicUserDrawer` (from Phase 2) gets "Activity" tab
   - Timeline: joined date, login history, saved incidents, unsaved incidents
   - "Saved Incidents" sub-tab: list of bookmarked incidents with notes, domain badge, save date

3. **Backend:**
   - `GET /users/:id/activity` — returns system realm audit logs for that staff user
   - `GET /public-users/:id/activity` — returns user realm logs for that public user

4. **Reusable `ActivityTimeline` component**

**Why:** Before linking activity to the map, we need the activity data surfaced in a readable way. This phase makes profile pages actual investigative tools.

**Commit.md summary (template):**
```
Added activity timelines to both staff and public user profile drawers. Staff profiles show system audit history with stats (incidents created, resolved, sources, timeline updates). Public user profiles show login history and saved incidents list. New reusable ActivityTimeline component. Backend endpoints GET /users/:id/activity and GET /public-users/:id/activity return chronologically ordered action logs.
```

**Git commit message (template):**
```
feat(superadmin): activity timelines and stats in staff and public user profile drawers
```

---

## Phase 6: Deep Linking — From Profile to Map (Part 2)

**Status: ⏳ NOT STARTED**

**Scope:**

1. **Map deep-link enhancement:**
   - `?incident=uuid` — select and fly to incident (already partially implemented)
   - `?date=YYYY-MM-DD` — set date range
   - `?lat=...&lng=...&zoom=...` — initial viewport

2. **Clickable activity items:**
   - In `ActivityTimeline`, any item referencing an incident becomes a link
   - "Created Shelling near Gaza" → click → `/superadmin/map?incident=uuid&date=...`
   - "Saved Fire in Lahore" → same behavior
   - "Resolved Border clash" → same behavior

3. **Contextual banner on map:**
   - When arriving from a profile link, show top banner: "Showing incident from Admin Alice's activity on May 5"
   - "Back to profile" button

4. **Date-sync:**
   - If incident is outside current date range, ghost marker + banner pattern triggers
   - "Switch to this date" button handles it

**Why:** This is the payoff. Requires everything before it — public users visible, map mounted, activity logged, profiles built. Once this works, superadmin can investigate any user's actions with two clicks.

**Commit.md summary (template):**
```
Connected activity timelines to the map via deep-linking. Any activity item referencing an incident is now clickable and opens the superadmin map at the correct location and date. Map accepts ?incident, ?date, ?lat, ?lng, ?zoom params. Contextual banner shows navigation context ("Showing incident from Admin Alice's activity"). Ghost marker + date-switch banner handles out-of-range incidents. Complete investigative loop: user → activity → map → incident.
```

**Git commit message (template):**
```
feat(superadmin): deep-link activity timeline items to map with contextual navigation and date sync
```

---

## Summary Table

| Phase | Scope | Status | Risk | Est. Effort |
|-------|-------|--------|------|-------------|
| 1 | Remove viewer role, update validation | ✅ Complete | Low | Small |
| 2 | Public users table, ban/unban, saved count | ✅ Complete | Medium | Medium |
| 3 | Map mount in superadmin, adminMode overlays | ✅ Complete | Medium | Medium |
| 4 | realm/actor_type columns, separate activity pages | ⏳ Not started | Medium | Medium |
| 5 | Profile drawers with activity timelines | ⏳ Not started | Low | Medium |
| 6 | Deep-linking from activity to map | ⏳ Not started | Medium | Large |

---

## Technical Notes for Future Context Restoration

- **Staff roles:** Only `super_admin` and `admin` exist. No `viewer`.
- **Public user endpoints:** `GET /api/v1/public-users`, `GET /api/v1/public-users/:id`, `PATCH /api/v1/public-users/:id`
- **Map components copied:** Entire user-web map stack was copied into `superadmin-web/src/components/` to avoid cross-app imports.
- **Shared logic:** `marker-builder.js`, `constants.js`, hooks imported from `@shared`.
- **AdminMode intent:** Superadmin-only map overlays (edit buttons, debug metadata).
- **Deep-linking:** `?incident=uuid` supported on `/superadmin/map`. Ghost marker + banner for out-of-range.
- **Build note:** Superadmin build ~1.25MB JS due to MapLibre inclusion; chunk size warning is expected and non-critical.
- **CORS:** Backend allows `localhost:5173`, `5174`, `5175`.
- **Token key:** `localStorage.getItem('superadmin_token')` used by auth context and SSE stream.
- **Map styles:** `map-style-dark.json` and `map-style-light.json` served from `src/superadmin-web/public/`.
