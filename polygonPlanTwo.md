# Polygon Plan Two: Zones as Polygon Incidents

## Process Rules

> These two rules apply to **every phase** in this plan.

1. **After completing each phase, append a detailed summary to `commit.md`** in the same format used for previous modules (date, summary, files changed, acceptance, git commit line).

2. **After completing each phase, provide a single-line Git commit message** that the user can copy and use to push the changes to GitHub.

---

## Overview

This plan converts **zones from a standalone feature into polygon incidents**. The backend unifies markers and zones under a single `incidents` table, but the admin UI keeps them as two entirely separate workflows: separate top-bar buttons, separate forms, separate tables/pages, and separate category systems.

**Core principle:** One data model, two user experiences.

---

## Final Design Decisions

| Decision | Choice |
|:---|:---|
| Data model | Zones become incidents with `geometry_type = 'polygon'`. Markers remain `geometry_type = 'point'`. |
| Admin entry points | Two top-bar buttons: **"Add Incident"** (marker) and **"Add Zone"** (polygon). |
| Forms | Completely separate forms. Zone form never shows marker domains/categories. |
| Tables/pages | Separate. Incidents have their own page/table; Zones have their own. |
| Zone categories | Separate superadmin-managed taxonomy with colors and icons. |
| Severity | Same scale as markers (Low → Critical). |
| Status flow | Same as markers (Active → Resolved, with 24h grace). |
| Zone fields (MVP) | Title, zone category, severity, status, start/end dates, description, sources, media. |
| Zone creation flow | Click "Add Zone" → map enters polygon drawing mode → draw & close → zone form opens. |
| Existing zones | Discard. Start fresh. |
| Public map | Zones render alongside markers; legend supports show markers/zones/both. |

---

## Zone Categories

Managed by superadmin in a dedicated page. Each category has:

```
- id
- name           (e.g., "NOTAM")
- slug           (e.g., "notam")
- color          (hex, used for polygon fill/outline)
- icon           (Lucide icon name)
- description    (optional)
- sort_order
- is_active
- created_at / updated_at
```

### Initial categories

1. NOTAM
2. NOTMAR
3. Curfew
4. No-Fly Zone
5. Maritime Exclusion Zone
6. Protest Area
7. Evacuation Zone
8. Shelter-in-Place

---

## Data Model Changes

### `incidents` table

```sql
ALTER TABLE incidents
  ADD COLUMN geometry_type VARCHAR(10) NOT NULL DEFAULT 'point',
  ALTER COLUMN geom TYPE GEOMETRY(Geometry, 4326);

-- Existing rows become point incidents.
-- geom already holds points; geometry_type='point' covers them.
```

For polygon incidents, `geom` stores a PostGIS Polygon/MultiPolygon.

### New `zone_categories` table

```sql
CREATE TABLE zone_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  color VARCHAR(7) NOT NULL DEFAULT '#3b82f6',
  icon VARCHAR(50) NOT NULL DEFAULT 'MapPin',
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Drop old `zones` table

After confirming no important data, drop the legacy `zones` table and related code.

---

## API Endpoints

### Incident endpoints (modified)

| Method | Path | Change |
|:---|:---|:---|
| POST | `/api/v1/events` | Accept `geometry_type` and `geometry` (GeoJSON Point or Polygon). |
| PATCH | `/api/v1/events/:id` | Accept geometry updates. |
| GET | `/api/v1/events` | Return `geometry_type` and `geometry` in payload. Filter by `geometry_type` if requested. |
| GET | `/api/v1/events/:id` | Return full geometry. |

### Zone category endpoints (new)

| Method | Path | Purpose |
|:---|:---|:---|
| GET | `/api/v1/zone-categories` | List active categories (public/admin). |
| GET | `/api/v1/zone-categories/all` | List all categories including inactive (superadmin). |
| POST | `/api/v1/zone-categories` | Create category (superadmin). |
| PATCH | `/api/v1/zone-categories/:id` | Update category (superadmin). |
| DELETE | `/api/v1/zone-categories/:id` | Delete category (superadmin) with usage check. |

---

## UI/UX Design

### Admin top bar

```
[Add Incident]  [Add Zone]  [Date picker]  [Search]  [User menu]
```

### Add Incident flow

1. Click **"Add Incident"**.
2. Map enters point-placement mode (current double-click behavior).
3. Incident form opens with marker categories and domains.

### Add Zone flow

1. Click **"Add Zone"**.
2. Map enters polygon drawing mode immediately.
3. Admin draws and closes the polygon.
4. Zone form opens automatically with the polygon pre-filled.
5. Admin selects zone category, severity, dates, sources, etc.
6. Save creates a polygon incident.

### Zone form fields

- Title
- Zone Category (dropdown of zone categories)
- Severity (Low / Medium / High / Critical)
- Status (Active / Resolved)
- Start Date / End Date
- Description
- Sources (same as incidents)
- Media (same as incidents)
- Geometry preview / vertex count / area readout

### Admin zones page

Separate page from incidents. Columns:

| Title | Category | Severity | Status | Start | End | Actions |

Actions: View / Edit / Resolve / Delete.

### Superadmin zone categories page

Mirrors the existing **Domains & Categories** page:

- List of zone categories with color swatch and icon.
- Create / Edit / Delete modals.
- Delete blocked if any incident uses the category.
- Added to superadmin sidebar.

### Public user map

- Zones render as translucent polygons using category colors.
- Legend includes both marker and zone entries.
- Toggle: **Show Markers** / **Show Zones**.
- Clicking a zone opens a zone detail view.

---

## Phases

### Phase 1 — Backend Database & Schema

**Goal:** Update the database to support polygon incidents and zone categories.

**Tasks:**
- Add `geometry_type` column to `incidents`.
- Change `geom` column type to generic `GEOMETRY(Geometry, 4326)`.
- Create `zone_categories` table.
- Drop legacy `zones` table.
- Update `docs/database-schema.sql`.
- Add migration script.

**Files:**
- `docs/database-schema.sql`
- `docs/migrations/...` (new migration file)
- `src/backend/src/config/database.js` (if needed)

**Acceptance:**
- `incidents` table has `geometry_type` and accepts Point/Polygon geometries.
- `zone_categories` table exists and is seeded with the 8 default categories.
- Legacy `zones` table is removed.

---

### Phase 2 — Backend API & Validation

**Goal:** Make the incident API accept and return polygon geometry; add zone category CRUD.

**Tasks:**
- Update Zod schemas to accept GeoJSON Point or Polygon.
- Update `event.service.js` to insert/update polygon geometry via `ST_GeomFromGeoJSON`.
- Update `event.service.js` listing query to return `geometry_type` and `geometry`.
- Update viewport filter to use `ST_Intersects` so zones appear when any part is visible.
- Create `zone-category.service.js`, `zone-category.controller.js`, `zone-category.routes.js`.
- Add failsafe delete: block deletion if any incident references the category.
- Mount new routes in `server.js`.

**Files:**
- `src/backend/src/validators/event.schema.js`
- `src/backend/src/services/event.service.js`
- `src/backend/src/controllers/event.controller.js`
- `src/backend/src/services/zone-category.service.js` (new)
- `src/backend/src/controllers/zone-category.controller.js` (new)
- `src/backend/src/routes/zone-category.routes.js` (new)
- `src/backend/server.js`

**Acceptance:**
- Can create a polygon incident via API.
- Can list polygon incidents and filter by `geometry_type`.
- Zone category CRUD works with usage guard on delete.

---

### Phase 3 — Shared Constants & API Client

**Goal:** Update frontend API clients and shared constants to support polygon incidents and zone categories.

**Tasks:**
- Add `geometry_type` and `geometry` to shared incident shapes if needed.
- Update `src/admin-web/src/services/api.js` with zone category endpoints.
- Update `src/user-web/src/services/api.js` with zone category endpoints.
- Add zone category colors/constants to shared design system if needed.

**Files:**
- `src/shared/constants.js`
- `src/admin-web/src/services/api.js`
- `src/user-web/src/services/api.js`

**Acceptance:**
- Both frontends can fetch zone categories.
- Admin frontend can send polygon geometry when creating/updating incidents.

---

### Phase 4 — Superadmin Zone Categories Page

**Goal:** Build the superadmin page for managing zone categories.

**Tasks:**
- Create `src/superadmin-web/src/pages/ZonesPage.jsx` (or `PolygonCategoriesPage.jsx`).
- Create `src/superadmin-web/src/components/Zones/ZoneCategoryModal.jsx`.
- Add color picker and icon picker (reuse existing `IconPicker.jsx` if possible).
- Add delete confirmation with usage check.
- Add sidebar navigation link.
- Update `src/superadmin-web/src/App.jsx` route.

**Files:**
- `src/superadmin-web/src/pages/ZonesPage.jsx` (new)
- `src/superadmin-web/src/components/Zones/ZoneCategoryModal.jsx` (new)
- `src/superadmin-web/src/components/Layout/Sidebar.jsx`
- `src/superadmin-web/src/App.jsx`

**Acceptance:**
- Superadmin can list, create, edit, and delete zone categories.
- Delete is blocked if category is in use.
- Changes reflect immediately in the admin UI.

---

### Phase 5 — Admin Top Bar & Zone Creation Flow

**Goal:** Add "Add Zone" button and wire it to polygon drawing mode.

**Tasks:**
- Add **"Add Zone"** button to admin top bar.
- Clicking "Add Zone" enters polygon drawing mode.
- On polygon close, open the zone form panel.
- Ensure "Add Incident" still works for markers only.
- Clear legacy zone creation UI from `DrawingToolbar` or repurpose it.

**Files:**
- `src/admin-web/src/components/Layout/TopBar.jsx`
- `src/admin-web/src/components/Layout/DashboardLayout.jsx`
- `src/admin-web/src/components/Map/DrawingToolbar.jsx`

**Acceptance:**
- Clicking "Add Zone" enters polygon drawing mode.
- Closing the polygon opens a zone form.
- The form does not show marker domains/categories.

---

### Phase 6 — Admin Zone Form

**Goal:** Build the zone creation/edit form.

**Tasks:**
- Create `src/admin-web/src/components/ZoneForm/ZoneForm.jsx`.
- Fields: title, zone category, severity, status, start/end dates, description, sources, media.
- Show area and vertex count readout.
- Save creates/updates a polygon incident.
- Cancel exits form and clears drawing.

**Files:**
- `src/admin-web/src/components/ZoneForm/ZoneForm.jsx` (new)
- `src/admin-web/src/components/Layout/DashboardLayout.jsx`

**Acceptance:**
- Can create a new zone with all fields.
- Form validates required fields.
- Saving persists polygon geometry as a polygon incident.

---

### Phase 7 — Admin Zone Detail & Shape Editing

**Goal:** Allow viewing and editing existing zones.

**Tasks:**
- Create `src/admin-web/src/components/ZoneDetail/ZoneDetailPanel.jsx`.
- Show zone metadata, sources, timeline, media.
- Add **"Edit Zone Shape"** button to enter polygon edit mode.
- Add **"Edit Details"** button to open zone form.
- Add Resolve / Delete actions.

**Files:**
- `src/admin-web/src/components/ZoneDetail/ZoneDetailPanel.jsx` (new)
- `src/admin-web/src/components/Layout/DashboardLayout.jsx`
- `src/admin-web/src/components/Map/AdminMap.jsx`

**Acceptance:**
- Clicking a zone opens the zone detail panel.
- "Edit Zone Shape" enters vertex editing mode.
- Changes save correctly.

---

### Phase 8 — Admin Zones List/Page

**Goal:** Create a separate page/table for managing zones.

**Tasks:**
- Create `src/admin-web/src/pages/ZonesPage.jsx` (or reuse panel inside dashboard).
- Table columns: title, category, severity, status, start, end, actions.
- Filters: category, status, date range.
- Search by title.
- Click row to fly to zone and open detail.

**Files:**
- `src/admin-web/src/pages/ZonesPage.jsx` (new)
- `src/admin-web/src/components/Layout/Sidebar.jsx` (if admin has sidebar)
- `src/admin-web/src/App.jsx`

**Acceptance:**
- Zones list loads polygon incidents only.
- Filters and search work.
- Row click navigates to zone on map.

---

### Phase 9 — Admin Map Rendering

**Goal:** Render polygon incidents on the admin map with category styling.

**Tasks:**
- Update `AdminMap.jsx` to render polygon incident geometries.
- Style polygons by zone category color.
- Add hover/select outline effects.
- Ensure polygons render below markers.
- Hide/show zones via filter.

**Files:**
- `src/admin-web/src/components/Map/AdminMap.jsx`

**Acceptance:**
- Active zones render on the admin map.
- Hover/select states are visible.
- Zones do not block marker clicks.

---

### Phase 10 — User-web Public Map & Detail

**Goal:** Show zones on the public map.

**Tasks:**
- Update `src/user-web` map to render polygon incidents.
- Add legend toggle for markers/zones.
- Create zone detail view.
- Ensure date/category filters apply to zones.

**Files:**
- `src/user-web/src/components/Map/UserMap.jsx` (or equivalent)
- `src/user-web/src/components/ZoneDetail/ZoneDetailView.jsx` (new)
- `src/user-web/src/components/Layout/...`

**Acceptance:**
- Public users see zones on the map.
- Legend toggle works.
- Clicking a zone opens its detail.

---

### Phase 11 — Cleanup, Build Verification & Documentation

**Goal:** Remove legacy zone code and verify everything builds.

**Tasks:**
- Remove legacy `zones` API routes, services, controllers.
- Remove old `ZoneCreatePanel`, `ZoneEditPanel`, `ZoneManagementPanel` if no longer needed.
- Run production builds for backend, admin-web, user-web, superadmin-web.
- Update `commit.md` and `docs/api-spec.md`.
- Update `SUPERADMIN_GUIDE.md` if needed.

**Files:**
- All legacy zone files.
- `commit.md`
- `docs/api-spec.md`

**Acceptance:**
- All four builds pass with zero errors.
- Legacy zone code is removed.
- Documentation is updated.

---

## Open Questions for Later (Not MVP)

- Alert when a new marker incident is reported inside an active zone.
- Category-specific zone fields (altitude ranges, recurring curfews, maritime restrictions).
- Zone overlap detection.
- Import/export zones (KML/GeoJSON).
