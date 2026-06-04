# GeoWatch Build History

> Document tracking every module built in sequence.  
> Append new modules below as development progresses.

---

## 📅 2026-05-05 — Module 1: Dev Environment & Database

### Summary
Established the full project monorepo structure, workspace configuration, environment variables, shared design system, PostgreSQL database schema execution, seed data, and project documentation.

### Created Files & Folders

| File / Folder | Purpose |
|:--|:--|
| `src/backend/` | Express API project structure |
| `src/user-web/` | Public website project structure |
| `src/admin-web/` | Admin dashboard project structure |
| `src/shared/` | Design tokens & constants shared across frontends |
| `package.json` (root) | npm workspaces for monorepo management |
| `src/backend/package.json` | Backend dependencies (express, pg, bcryptjs, jwt, zod, etc.) |
| `src/backend/.env.development` | Backend env with DB credentials, JWT secret, Martin URL |
| `src/backend/.env.example` | Template for other developers |
| `src/user-web/package.json` | React + Vite + MapLibre + date-fns |
| `src/user-web/.env` | Points API and Martin to localhost |
| `src/admin-web/package.json` | React + Vite + MapLibre + react-router-dom + date-fns |
| `src/admin-web/.env` | Points API and Martin to localhost |
| `src/shared/constants.js` | Category colors, severity scale, enums, API URLs |
| `src/shared/design-tokens.css` | Full dark-mode CSS variable system (colors, fonts, shadows, transitions) |
| `seeds.sql` | Creates super_admin user + 6 sample events + 4 timeline updates |
| `readme.md` | Professional project README with quick start guide |
| `.gitignore` | Expanded with node_modules, env files, build outputs, OS/editor files |
| `docs/dev-credentials.md` | Development credentials and local service URLs |

### Git Commit

```
chore: setup postgres, postgis, schema, env, seeds, readme, and workspace config
```

---

*End of Module 1*

---

## 📅 2026-05-05 — Module 2: Martin Tile Server

### Summary
Downloaded Martin v1.8.2 binary, configured it to serve the existing `tiles.mbtiles` on `localhost:8080`, created a minimalist dark vector map style matching the GeoWatch design system, and built a test page to verify tile rendering.

### Created Files & Folders

| File / Folder | Purpose |
|:--|:--|
| `tools/martin` | Martin v1.8.2 Linux binary (tile server) |
| `scripts/start-martin.sh` | Bash script to launch Martin on port 8080 |
| `assets/map-style-dark.json` | Minimalist dark MapLibre style (deep charcoal, subtle borders, muted labels) |
| `scripts/test-tiles.html` | Standalone test page to verify tiles render correctly |

### Key Configuration

- **TileJSON endpoint:** `http://localhost:8080/tiles`
- **Tile URL pattern:** `http://localhost:8080/tiles/{z}/{x}/{y}`
- **Style source:** Points to local Martin vector tiles using OpenMapTiles schema
- **Design:** Background `#0f1117`, water `#14161f`, boundaries `#2a2e3b`, labels `#5a5e6b` — extremely subtle so event markers dominate the visual hierarchy

### How to Verify

```bash
./scripts/start-martin.sh
# Then open scripts/test-tiles.html in a browser
```

### Git Commit

```
chore: configure martin tile server with dark minimalist map style
```

*End of Module 2*

---

## 📅 2026-05-05 — Fix: Remove Martin Binary from Git

### Summary
Removed the 61MB Martin binary from Git tracking and replaced it with an automated download script. Keeps the repository lightweight and makes setup reproducible.

### Changes

| File / Change | Purpose |
|:--|:--|
| `tools/martin` | Removed from Git tracking (kept locally) |
| `.gitignore` | Added `tools/martin` to prevent accidental commits |
| `scripts/download-martin.sh` | One-command script to download Martin v1.8.2 from GitHub releases |
| `package.json` | Added `npm run setup:martin` script |
| `readme.md` | Updated setup instructions to use the download script |

### Git Commands Used

```bash
git rm --cached tools/martin
git add .
git commit -m "chore: remove martin binary from git, add download script"
```

*End of cleanup*

---

## 📅 2026-05-05 — Module 3: Backend Foundation

### Summary
Bootstrapped the Express API server with standardized middleware, database connection pooling, rate limiting, CORS, request validation wrappers, and a health check endpoint. All errors are caught and returned in the uniform API response format.

### Created Files & Folders

| File / Folder | Purpose |
|:--|:--|
| `src/backend/server.js` | Express app entry point — routes, middleware, error handling, server start |
| `src/backend/src/config/database.js` | PostgreSQL connection pool with query logging in dev |
| `src/backend/src/utils/api-response.js` | Standard response factory (`{ success, data, message, error }`) |
| `src/backend/src/utils/async-handler.js` | Wraps async handlers to catch errors without try/catch |
| `src/backend/src/middleware/response-wrapper.js` | Adds `res.apiSuccess()` and `res.apiError()` helpers |
| `src/backend/src/middleware/error-handler.js` | Centralized error handler — Zod, JWT, Postgres, generic |
| `src/backend/src/middleware/not-found-handler.js` | Returns shaped 404 for unmatched routes |
| `src/backend/src/middleware/rate-limiter.js` | Three limiters: general (100/15min), auth (10/15min), admin write (50/15min) |
| `src/backend/src/middleware/validate-request.js` | Zod schema validation middleware for body/query/params |
| `src/backend/src/routes/health.routes.js` | `GET /api/v1/health` — sanity check endpoint |

### Key Design Decisions

- **No try/catch in route handlers:** `asyncHandler()` catches promise rejections and forwards them to the error middleware.
- **Response wrapper:** Every route uses `res.apiSuccess(data)` or `res.apiError(message, code, status)` for consistency.
- **Environment-driven config:** DB credentials, CORS origins, and rate limits all come from `.env.development`.
- **Stateless by default:** No in-memory session state — ready for horizontal scaling later.

### Verified Endpoints

| Endpoint | Result |
|:--|:--|
| `GET /api/v1/health` | ✅ Returns `{ success: true, data: { status: "ok", timestamp } }` |
| `GET /api/v1/nonexistent` | ✅ Returns `{ success: false, error: "NOT_FOUND" }` |
| `POST /api/v1/health` (bad JSON) | ✅ Returns `{ success: false, error: "SERVER_ERROR" }` |

### Git Commit

```
feat: bootstrap express server with middleware, rate limiting, and health check
```

*End of Module 3*

---

## 📅 2026-05-05 — Module 4: Backend Authentication

### Summary
Implemented the complete JWT authentication system with bcrypt password hashing, role-based access control, Zod validation, and rate-limited auth endpoints. All five auth endpoints are tested and working.

### Created Files & Folders

| File / Folder | Purpose |
|:--|:--|
| `src/backend/src/config/env.js` | Loads `.env.development` before all other imports to prevent race conditions |
| `src/backend/src/validators/auth.schema.js` | Zod schemas: login, register, updateAdmin |
| `src/backend/src/services/auth.service.js` | bcrypt hashing, JWT sign/verify, all user DB queries |
| `src/backend/src/controllers/auth.controller.js` | login, register, getMe, listAdmins, updateAdmin |
| `src/backend/src/routes/auth.routes.js` | `/auth/*` route definitions with middleware stack |
| `src/backend/src/middleware/auth.middleware.js` | Bearer JWT verification, attaches `req.user` |
| `src/backend/src/middleware/role.middleware.js` | Reusable `requireRole()` guard |
| `docs/grant-permissions.sql` | PostgreSQL permissions fix for app DB user |

### Updated Files

| File | Change |
|:--|:--|
| `server.js` | Added `import './src/config/env.js'` as first line; mounted `/api/v1/auth` routes |
| `docs/database-schema.sql` | Added permissions grant comments for future setups |

### Verified Endpoints

| # | Test | Result |
|:--|:--|:--|
| 1 | `POST /auth/login` (valid super_admin) | ✅ Returns JWT + user profile |
| 2 | `GET /auth/me` (with token) | ✅ Returns current user |
| 3 | `GET /auth/admins` (super_admin) | ✅ Returns admin list |
| 4 | `POST /auth/register` (super_admin) | ✅ Creates new admin user |
| 5 | `POST /auth/login` (new admin) | ✅ Returns JWT + user profile |
| 6 | `POST /auth/register` (admin role) | ✅ Returns 403 FORBIDDEN |
| 7 | `GET /auth/admins` (admin role) | ✅ Returns 403 FORBIDDEN |
| 8 | `POST /auth/login` (wrong password) | ✅ Returns 401 UNAUTHORIZED |
| 9 | `GET /auth/me` (no token) | ✅ Returns 401 UNAUTHORIZED |
| 10 | `POST /auth/login` (invalid email) | ✅ Returns 400 VALIDATION_ERROR |

### New Test Account Created

| Email | Password | Role |
|:--|:--|:--|
| `editor@geowatch.local` | `EditorPass123!` | `admin` |

### Git Commit

```
feat: implement jwt auth, bcrypt, role guards, and /auth endpoints
```

*End of Module 4*

---

## 📅 2026-05-05 — Module 5: Backend Events API

### Summary
Built the complete events API with PostGIS geospatial queries, date-based visibility filtering, CRUD operations, timeline updates, source embedding (with X/Twitter oEmbed auto-fetch), and role-protected admin endpoints. All endpoints tested with real HTTP requests.

### Created Files & Folders

| File / Folder | Purpose |
|:--|:--|
| `src/backend/src/validators/event.schema.js` | Zod schemas: createEvent, updateEvent, listEventsQuery |
| `src/backend/src/validators/timeline.schema.js` | Zod schema: createTimelineUpdate |
| `src/backend/src/validators/source.schema.js` | Zod schema: createEventSource |
| `src/backend/src/utils/oembed.js` | Fetches X/Twitter oEmbed HTML via native `https` module |
| `src/backend/src/services/event.service.js` | PostGIS CRUD, date/viewport filtering, geom generation |
| `src/backend/src/services/timeline.service.js` | Timeline update creation |
| `src/backend/src/services/source.service.js` | Source creation with auto oEmbed fetch |
| `src/backend/src/controllers/event.controller.js` | list, getById, create, update, delete, resolve |
| `src/backend/src/controllers/timeline.controller.js` | addTimelineUpdate |
| `src/backend/src/controllers/source.controller.js` | addSource |
| `src/backend/src/routes/event.routes.js` | Public GET + Admin POST/PATCH/DELETE/resolve |
| `src/backend/src/routes/timeline.routes.js` | Admin POST /events/:id/timeline |
| `src/backend/src/routes/source.routes.js` | Admin POST /events/:id/sources |

### Updated Files

| File | Change |
|:--|:--|
| `server.js` | Mounted `/api/v1/events`, `/api/v1/events/:id/timeline`, `/api/v1/events/:id/sources` |
| `src/controllers/event.controller.js` | Controller now handles source creation after event insert |

### Key Technical Decisions

- **Date visibility logic:** `start_date <= selected_date AND (end_date IS NULL OR end_date >= selected_date)` correctly shows ongoing events across dates and hides resolved events after their end date.
- **PostGIS on insert:** `ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)` auto-generates the `geom` column from lat/lng.
- **Viewport filter:** Parses `minLng,minLat,maxLng,maxLat` into `ST_MakeEnvelope` for bounding-box queries.
- **oEmbed:** Uses Node.js native `https` (zero dependencies) to call `publish.twitter.com/oembed` for X posts.
- **DELETE protection:** Only `super_admin` can delete events; all other admin write endpoints accept both `admin` and `super_admin`.

### Verified Endpoints

| # | Test | Result |
|:--|:--|:--|
| 1 | `GET /events` (public, default date) | ✅ Returns active events |
| 2 | `GET /events?category=conflict` | ✅ Filters by category |
| 3 | `GET /events/:id` | ✅ Returns event + sources + timeline |
| 4 | `POST /events` (admin, with source) | ✅ Creates event and source |
| 5 | `GET /events/:id` (new event) | ✅ Verifies source attached |
| 6 | `PATCH /events/:id` | ✅ Updates severity & description |
| 7 | `POST /events/:id/timeline` | ✅ Adds timeline update |
| 8 | `POST /events/:id/sources` | ✅ Adds second source |
| 9 | `GET /events/:id` (full) | ✅ Event + 2 sources + 1 timeline |
| 10 | `POST /events/:id/resolve` | ✅ Status → resolved, end_date = today |
| 11 | `DELETE /events/:id` | ✅ Event deleted |
| 12 | `POST /events` (no token) | ✅ 401 UNAUTHORIZED |

### Git Commit

```
feat: build events, timeline, and sources api with postgis and oembed
```

*End of Module 5*

---

## 📅 2026-05-05 — Fix: Auth Permission Model

### Summary
Adjusted role permissions so that **admin** users can delete events and create viewer accounts, while still restricting admin-management privileges to **super_admin** only.

### Changes

| File | Change |
|:--|:--|
| `src/routes/event.routes.js` | DELETE `/events/:id` now allows `admin` + `super_admin` |
| `src/routes/auth.routes.js` | POST `/auth/register` now allows `admin` + `super_admin` |
| `src/controllers/auth.controller.js` | Added role restriction: `admin` can only create `viewer` accounts |
| `docs/api-spec.md` | Updated endpoint access notes for `/auth/register` and `DELETE /events/:id` |
| `docs/dev-credentials.md` | Added test admin and viewer accounts |

### Permission Matrix

| Action | super_admin | admin | viewer |
|:--|:--:|:--:|:--:|
| Create/delete events | ✅ | ✅ | ❌ |
| Add timeline/sources | ✅ | ✅ | ❌ |
| Resolve events | ✅ | ✅ | ❌ |
| Create users | ✅ | ✅ (viewer only) | ❌ |
| List/manage admins | ✅ | ❌ | ❌ |
| Delete other admins | ✅ | ❌ | ❌ |

### Verified Tests

| # | Test | Result |
|:--|:--|:--|
| 1 | Admin creates viewer user | ✅ |
| 2 | Admin blocked from creating admin | ✅ 403 |
| 3 | Admin blocked from `/auth/admins` | ✅ 403 |
| 4 | Admin creates event | ✅ |
| 5 | Admin deletes event | ✅ |
| 6 | Super_admin creates admin | ✅ |

### Git Commit

```
fix: allow admins to delete events and create viewer users
```

*End of permission fix*

---

## 📅 2026-05-05 — Module 6: Shared Design System

### Summary
Set up both frontend applications (user-web and admin-web) with Vite, React, path aliases, and a shared component library. Created reusable UI primitives using the dark tactical design tokens. Both apps build successfully.

### Created Files & Folders

| File / Folder | Purpose |
|:--|:--|
| `src/user-web/index.html` | HTML entry point for public website |
| `src/user-web/vite.config.js` | Vite config with `@shared` path alias |
| `src/user-web/src/main.jsx` | React DOM root renderer |
| `src/user-web/src/index.css` | Global styles + scrollbar + shimmer animation |
| `src/user-web/src/App.jsx` | Design system test page (buttons, badges, skeletons) |
| `src/admin-web/index.html` | HTML entry point for admin dashboard |
| `src/admin-web/vite.config.js` | Vite config with `@shared` path alias |
| `src/admin-web/src/main.jsx` | React DOM root renderer |
| `src/admin-web/src/index.css` | Global styles + scrollbar + shimmer animation |
| `src/admin-web/src/App.jsx` | Design system test page (admin-themed variants) |
| `src/shared/components/Button.jsx` | Reusable button: primary / secondary / danger / ghost |
| `src/shared/components/Badge.jsx` | Category and status badges with correct colors |
| `src/shared/components/Skeleton.jsx` | Shimmer loading bars and blocks |

### Key Design Decisions

- **Path alias `@shared`:** Both Vite configs resolve `@shared` to `src/shared/`, making imports clean and consistent across both apps.
- **CSS custom properties:** All colors, fonts, spacing, and shadows live in `design-tokens.css` and are imported at the top of each app's `index.css`.
- **No external UI libraries:** Everything is pure React + CSS, matching the tactical aesthetic exactly.
- **Skeleton shimmer:** Custom `@keyframes shimmer` with a gradient sweep — no spinners, no external loading libraries.

### Build Verification

| App | Build Result |
|:--|:--|
| `src/user-web` | ✅ 35 modules, 148KB JS, 2KB CSS |
| `src/admin-web` | ✅ 35 modules, 148KB JS, 2KB CSS |

### Git Commit

```
chore: add shared design tokens, category colors, and css variables
```

*End of Module 6*

---

## 📅 2026-05-05 — Module 7: Admin Dashboard

### Summary
Built the complete admin dashboard with split-screen map + form layout, click-to-place markers, coordinate fly-to, full event CRUD, timeline/source management, role-aware UI, and a dark tactical login page.

### Created Files & Folders

| File / Folder | Purpose |
|:--|:--|
| `src/admin-web/src/services/api.js` | Fetch wrapper with Bearer token injection |
| `src/admin-web/src/contexts/AuthContext.jsx` | JWT auth state, auto-login on page refresh, logout |
| `src/admin-web/src/components/Login/LoginPage.jsx` | Dark login form with cyan accent |
| `src/admin-web/src/components/Layout/TopBar.jsx` | Admin badge, user name, Add Event, Logout |
| `src/admin-web/src/components/Layout/DashboardLayout.jsx` | 60/40 split + bottom event table strip |
| `src/admin-web/src/components/Map/AdminMap.jsx` | MapLibre map with click-to-place marker + fly-to |
| `src/admin-web/src/components/EventForm/EventForm.jsx` | Create/edit form: title, coords, category, severity, dates, sources |
| `src/admin-web/src/components/EventList/EventTable.jsx` | Sortable data table with Edit / Resolve / Delete actions |
| `src/admin-web/src/App.jsx` | React Router: `/login` and protected dashboard routes |

### Key Features

- **Click map → place marker:** Clicking anywhere on the map sets a cyan marker and pre-fills the lat/lng form fields.
- **Coordinate fly-to:** Typing lat/lng into the form and clicking elsewhere flies the map to that location in 800ms.
- **Source builder:** Dynamic source inputs inside the create form support admin notes and X/Twitter URLs (oEmbed auto-fetches on backend).
- **Event table:** Bottom strip shows all events with category badges, severity, status, and action buttons.
- **Role-aware:** Top bar shows "Super Admin" or "Admin" badge. Resolve/Delete buttons available per role rules.
- **Auth guard:** Unauthenticated users are redirected to `/login`. Token persists in localStorage.

### Build Verification

| App | Build Result |
|:--|:--|
| `src/admin-web` | ✅ 48 modules, 989KB JS (MapLibre included), 68KB CSS |

### Git Commit

```
feat: build admin dashboard with split-screen map, event crud, and auth
```

*End of Module 7*

---

## 📅 2026-05-05 — Fix: Admin Dashboard Major Refactor

### Summary
Completely refactored the admin dashboard to address five critical issues: empty map, missing date filtering, generic UI, accidental event creation on single-click, and missing read-only event viewer. The admin panel now looks and feels like a premium tactical dashboard.

### Issues Fixed

| # | Issue | Fix |
|:--|:--|:--|
| 1 | Map was empty (no roads, labels, buildings) | Replaced inline minimal style with full `map-style-dark.json` loaded from public folder |
| 2 | No date filtering | Added date picker to top bar; map markers and table now filter by selected date |
| 3 | Generic, unattractive UI | Glassmorphism panels, section boxes, accent lines, better typography, improved spacing |
| 4 | Single click created events everywhere | Changed to **double-click** for event creation; single click on marker now views event |
| 5 | Clicking event opened edit form | New **EventDetailPanel** shows read-only event view with embedded sources, timeline, metadata |

### Files Changed / Created

| File | Change |
|:--|:--|
| `src/admin-web/src/components/Map/AdminMap.jsx` | Full rewrite: loads full style.json, renders event markers with category colors & severity sizing, double-click for create, click marker for view, pulse animation on temp marker |
| `src/admin-web/src/components/EventDetail/EventDetailPanel.jsx` | **New** — Read-only event viewer with glassmorphism card, metadata grid, embedded sources (X/Twitter oEmbed), vertical timeline, Edit/Close actions |
| `src/admin-web/src/components/Layout/TopBar.jsx` | Added date picker input, glassmorphism background, improved visual hierarchy |
| `src/admin-web/src/components/Layout/DashboardLayout.jsx` | Major refactor: panel modes ('empty' \| 'detail' \| 'form'), date-driven event fetching, event counter overlay, proper view→edit flow |
| `src/admin-web/src/components/EventForm/EventForm.jsx` | Polished UI with section boxes, accent lines, better labels, improved spacing |
| `src/admin-web/src/components/EventList/EventTable.jsx` | Cleaner table design, accepts `selectedDate` prop for filtering |
| `src/admin-web/public/map-style-dark.json` | Copied full style for Vite static serving |
| `src/user-web/public/map-style-dark.json` | Copied full style for future public site use |

### New Interaction Flow

| Action | Result |
|:--|:--|
| Double-click map | Cyan pulsing marker appears, form opens with coords pre-filled |
| Click event marker | Right panel shows **EventDetailPanel** (read-only) with sources & timeline |
| Click "Edit Event" in detail | Switches to **EventForm** in edit mode |
| Click "Add Event" button | Clears selection, opens blank **EventForm** |
| Select date in top bar | Map markers and table refresh to show only events for that date |
| Click table row | Map flies to event, detail panel opens |

### Git Commit

```
fix: admin dashboard refactor — map style, date filter, dblclick, detail panel, ui polish
```

*End of admin dashboard refactor*

---

## 📅 2026-05-05 — Fix: Critical Map Marker Bugs

### Summary
Fixed three critical bugs in the admin map: markers flying to top-left on hover, white-screen crash on click, and broken selection state.

### Root Causes

| Bug | Root Cause | Fix |
|:--|:--|:--|
| **Hover → top-left** | `el.style.transform = 'scale(1.4)'` was applied to the **marker element itself**, overwriting MapLibre's `translate3d(x, y, 0)` positioning | Visual effects (scale, shadow) now apply to a **child element** inside the marker. MapLibre positions the parent; the child handles hover/click visuals safely. |
| **Click → white screen** | The marker `useEffect` depended on `[events, selectedEventId]`. Clicking a marker changed `selectedEventId` → effect re-ran → all markers were **removed and recreated while MapLibre was still processing the click event** → null DOM access crash | Split into **two separate effects**: one creates/removes markers when `events` changes, another updates selection **styles only** when `selectedEventId` changes. Markers are never recreated on selection. |
| **Pan/zoom fixes position** | Confirmed base positions were correct; only hover/click interactions broke positioning | Both fixes above resolve this — markers keep their correct translate3d at all times. |

### Additional Changes

- Removed `e.stopPropagation()` from marker clicks — letting events bubble naturally prevents MapLibre internal state desync
- Added `willChange: 'transform'` to child elements for smoother hover scaling
- Used `Map` data structure (`markers.current = new Map()`) instead of array for O(1) lookup by event ID
- Markers now update position in-place when event data changes, instead of full remove+recreate

### Git Commit

```
fix: resolve map marker hover/click bugs — child element scaling, separate selection effect
```

*End of marker bug fix*

---

## 📅 2026-05-08 — Fix: Map Labels, Source Validation, Timeline Feature, Event Datetimes, UI Polish

### Summary
Major feature drop and bugfix session. Added full timeline CRUD with Twitter embeds, restored map text labels, fixed multiple crashes, upgraded event dates to full timestamps with a resolve grace period, and polished the event detail meta cards.

---

### 1. Map Text Labels Restored

**Problem:** Free font CDN (`fonts.openmaptiles.org`) returned HTML 404s — all city/country labels were missing.

**Fix:** Switched to MapLibre's demo font CDN (`https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf`) and added 5 symbol layers:
- `water-name` — oceans, seas
- `place-country` — country names (bold, uppercase)
- `place-state` — state/province names
- `place-city` — major cities (rank ≤ 8)
- `place-town` — towns (zoom 6+)

**Files:** `assets/map-style-dark.json` + copies to `src/admin-web/public/` and `src/user-web/public/`

---

### 2. Source URL Validation Fix

**Problem:** Creating an event with only an admin note crashed with `sources.0.sourceUrl: Invalid url` because empty string `""` failed Zod's `.url()` validator.

**Fix:** `EventForm.jsx` now strips empty strings before sending:
```js
sources.filter(...).map(s => ({
  sourceType: s.sourceType,
  ...(s.sourceUrl?.trim() ? { sourceUrl: s.sourceUrl.trim() } : {}),
  ...(s.description?.trim() ? { description: s.description.trim() } : {}),
}))
```

---

### 3. Full Timeline CRUD Feature

**Backend:**
- `PATCH /events/:id/timeline/:updateId` — edit summary and/or date
- `DELETE /events/:id/timeline/:updateId` — delete update
- `timeline.service.js` — added `updateTimelineEntry()` and `deleteTimelineEntry()`
- Sort order changed from `ASC` to `DESC` (latest first)

**Frontend:**
- **New shared component:** `TimelineEntry.jsx` — reusable accordion card with relative date (Today/Yesterday/MMM d), time, expandable summary, author, Edit/Delete actions
- **EventDetailPanel.jsx** — major timeline section rewrite:
  - "Updates · N" header with cyan count badge
  - "+ Add Update" button → inline form with textarea + datetime-local
  - Each entry expandable/collapsible
  - Inline edit mode per entry
  - Delete with confirm dialog
  - Sort toggle: "Latest first" ↔ "Oldest first"

---

### 4. Twitter/X Embed Dark Mode

**Problem:** Embedded tweets rendered in white (light theme) against the dark dashboard.

**Fix:**
- Added `<script async src="https://platform.twitter.com/widgets.js">` to both `index.html` files
- `SourceItem` calls `window.twttr.widgets.load()` after mount to render embeds
- Backend oEmbed URL includes `&theme=dark`
- Client-side fallback injects `data-theme="dark"` into existing embed HTML already stored in DB

---

### 5. Timeline Updates with Twitter/X Posts

**Database:** `ALTER TABLE event_updates ADD COLUMN source_url TEXT, ADD COLUMN embed_html TEXT;`

**Backend:** Timeline create/update accepts optional `sourceUrl` → auto-fetches oEmbed HTML via `fetchOembedHtml()`.

**Frontend:** Timeline add/edit forms include an optional "X / Twitter Post URL" field. When expanded, TimelineEntry renders the embedded tweet inline (dark mode).

---

### 6. Event Datetime + Resolve Grace Period

**Database:** `ALTER TABLE events ALTER COLUMN start_date TYPE TIMESTAMP WITH TIME ZONE, ALTER COLUMN end_date TYPE TIMESTAMP WITH TIME ZONE;`

**Backend filtering:**
- Active events: visible until `end_date`
- Resolved events: visible until `end_date + 1 day` (grace period)

**Frontend:**
- `EventForm.jsx` — `type="datetime-local"` for Start & End dates, converts to ISO before sending
- **Resolve modal** — centered overlay with datetime-local picker + smart warning:
  - Resolving now → "Marker will be removed after **24 hours**" (red)
  - Resolved 6h ago → "Marker will disappear in **18 hours**" (red)
  - Resolved >24h ago → "Marker will disappear from the map"

---

### 7. String Lat/Lng Crash + Marker Persistence

**Problem 1:** `event.latitude.toFixed is not a function` white-screen crash because PostgreSQL `DECIMAL` returns strings.

**Fix:** `EventDetailPanel.jsx` now uses `parseFloat(event.latitude ?? 0).toFixed(4)`.

**Problem 2:** Deleting an event from the table left its marker on the map.

**Fix:** `EventTable.jsx` now calls `onRefresh?.(id)` after delete/resolve, and `DashboardLayout.jsx` increments `refreshKey` to re-fetch events for the map.

---

### 8. Event Detail Meta Cards Redesign

**Before:** Flat 2×2 grid with cramped "May 08, 2026 00:00" strings.

**After:** Four mini cards with:
- Subtle top accent line (cyan-tinted for severity, gray for others)
- Label in tiny uppercase muted text
- Date in bold `14px`
- Time below in monospace muted text using **12h AM/PM format**
- Time added to "Created" card as well

---

### Files Changed (20+)

| File | Change |
|:--|:--|
| `src/backend/src/services/timeline.service.js` | Add update + delete functions, source_url + embed_html support |
| `src/backend/src/controllers/timeline.controller.js` | Add update + delete controllers |
| `src/backend/src/validators/timeline.schema.js` | Add update schema + sourceUrl |
| `src/backend/src/routes/timeline.routes.js` | Register PATCH / DELETE |
| `src/backend/src/services/event.service.js` | Datetime filtering + 1-day grace for resolved events |
| `src/backend/src/controllers/event.controller.js` | Pass resolvedAt from body to service |
| `src/backend/src/validators/event.schema.js` | Accept ISO datetime strings |
| `src/backend/src/utils/oembed.js` | Add `&theme=dark` to oEmbed URL |
| `src/shared/components/TimelineEntry.jsx` | **New** — reusable accordion timeline entry |
| `src/shared/components/DateTimePicker.jsx` | **New** — custom calendar + time picker (later reverted) |
| `src/admin-web/src/services/api.js` | Add updateTimeline, deleteTimeline, resolveEvent body |
| `src/admin-web/src/components/EventDetail/EventDetailPanel.jsx` | Full timeline CRUD UI, meta cards redesign, 12h time format |
| `src/admin-web/src/components/EventForm/EventForm.jsx` | Datetime-local inputs, source URL fix |
| `src/admin-web/src/components/EventList/EventTable.jsx` | Resolve modal with smart warning, onRefresh callback |
| `src/admin-web/src/components/Layout/DashboardLayout.jsx` | Handle table refresh, clear selectedEvent on delete |
| `src/admin-web/index.html` | Add Twitter widgets.js script |
| `src/user-web/index.html` | Add Twitter widgets.js script |
| `assets/map-style-dark.json` | Add glyphs + 5 symbol text layers |

### Git Commit

```
feat: timeline CRUD, map labels, event datetimes, twitter dark embeds, resolve grace period, meta cards
```

*End of session*

---

## 📅 2026-05-08 — Feature: Live/Historical Mode Indicator + Today Button

### Summary
Replaced subtle date-range cues with an explicit, impossible-to-miss mode indicator on the top bar. Added a one-click "Today" reset button. Date pickers widened so the full date is readable. This ensures both admins and future public users always know whether they're viewing current or historical events.

### Changes

| File | Change |
|:--|:--|
| `TopBar.jsx` | **Mode pill** centered in nav bar: `● LIVE MODE` (cyan, pulsing dot) or `◐ HISTORIC MODE` (amber). **Today button** next to date pickers, disabled when already on today. Date inputs widened from `118px` → `146px`. Historical dates get an amber border highlight on inputs. |
| `DashboardLayout.jsx` | Added `handleResetToToday()` — resets range to today. Passed to TopBar. |
| `index.css` | Added `pulse` keyframe animation for the live mode dot. |

### Visual States

| State | Indicator | Date Border | Today Button |
|:--|:--|:--|:--|
| **Live** (today → today) | Cyan pill, pulsing dot | Subtle gray | Disabled (muted) |
| **Historical** (any other range) | Amber pill, static dot | Amber tint | Enabled (cyan text) |

### Git Commit

```
feat: add live/historical mode indicator pill and today reset button to top bar
```

*End of session*

---

## 📅 2026-05-08 — Feature: Smart Viewport Filtering

### Summary
Implemented intelligent viewport-based filtering to prevent map performance degradation when viewing large date ranges with many events. The system automatically detects when a date range contains more than 100 events and switches to viewport-filtered fetching — only loading events visible in the current map area. If 100 or fewer events match the range, all events are loaded at once with no map-move re-fetching.

### How It Works

| Step | Action |
|:--|:--|
| 1 | User selects a date range |
| 2 | Frontend fetches **without** viewport — gets exact count from backend |
| 3 | If `count <= 100`: all events loaded, map pans freely without re-fetching |
| 4 | If `count > 100`: viewport filtering activated, only map-visible events fetched |
| 5 | When viewport filtering is on: every map pan/zoom triggers a re-fetch with new bounds |
| 6 | Map overlay shows: "247 events visible in current map area · 1,200 total events match this date range — zoom or pan to explore" |

### Backend Changes

| File | Change |
|:--|:--|
| `event.service.js` `listEvents` | Runs `SELECT COUNT(*) ...` first to get exact total, then `SELECT ... LIMIT 301` for events. Returns `{ events, count, hasMore }`. |
| `event.controller.js` `getEvents` | Returns `count` and `hasMore` flags in the API response. |

### Frontend Changes

| File | Change |
|:--|:--|
| `AdminMap.jsx` | Added `onViewportChange` prop. Reports bounds on `moveend` (skips programmatic `flyTo` moves) and on initial `load`. Uses callback ref to avoid stale closures. |
| `DashboardLayout.jsx` | Smart viewport logic: `viewportFiltering` state (null/true/false). Fetches without viewport first, checks count, conditionally enables viewport mode. Re-fetches on map move only when viewport filtering is active. Event counter overlay shows viewport status and total count message. |
| `api.js` | `getEvents` already accepts `viewport` param — no changes needed. |

### API Response Shape

```json
{
  "success": true,
  "data": {
    "events": [...],
    "count": 1247,
    "hasMore": true,
    "date": "2026-05-08"
  }
}
```

### Key Design Decision

The **100-event threshold** is a deliberate trade-off:
- Below 100: buttery-smooth panning, no network requests on map move, full data visible
- Above 100: viewport filtering kicks in to protect browser performance while still allowing large date range exploration

The threshold can be tuned easily by changing the `<= 100` check in `DashboardLayout.jsx`.

### Git Commit

```
feat: implement smart viewport filtering with 100-event threshold
```

*End of session*

---

## 📅 2026-05-08 — Fix: Auto-Sync Date Range to Prevent Accidental Large Ranges

### Summary
Fixed a UX issue where selecting a past `From` date while `To` defaulted to `today` would unintentionally load a massive date range (e.g., 1+ years of data). Now the date range auto-syncs intelligently to prevent this.

### Behavior

| Action | Before | After |
|:--|:--|:--|
| User clicks `From = May 1, 2025` while `To = today` | Range becomes May 1, 2025 → today (1+ year) | Range becomes May 1, 2025 → May 1, 2025 (single day) |
| User adjusts `From` past existing `To` | Invalid range (From > To) | `To` auto-syncs to match new `From` |
| User adjusts `To` before existing `From` | Invalid range (To < From) | `From` auto-syncs to match new `To` |
| User has already set a custom range | — | No auto-sync — custom range is preserved |

### Logic

```js
// From changed
if (newFrom < today && currentTo === today) {
  newTo = newFrom;        // Past date + default To → single day
} else if (newFrom > currentTo) {
  newTo = newFrom;        // Fix invalid range
}

// To changed
if (newTo < currentFrom) {
  newFrom = newTo;        // Fix invalid range
}
```

### File Changed

| File | Change |
|:--|:--|
| `TopBar.jsx` | Added `handleFromChange` and `handleToChange` with auto-sync logic. |

### Git Commit

```
fix: auto-sync date range to prevent accidental large historical ranges
```

*End of session*

---

## 📅 2026-05-08 — Fix: Street-Level Map Detail + Dark Style Overhaul

### Summary
Fixed the blank/empty map at street-level zoom by completely rewriting `map-style-dark.json`. The previous style had road colors nearly identical to the background (`#1e212b` on `#0f1117`) and was missing critical high-zoom layers. The new style uses visible grays on a slightly lighter dark background and includes all layers needed for street-level detail.

### Root Cause

| Issue | Before | After |
|:--|:--|:--|
| Background too dark | `#0f1117` | `#1a1a1a` — features now have contrast to pop |
| Road colors invisible | `#1e212b`, `#222636` | `#555` down to `#2e2e2e` — visible at every zoom |
| Missing road classes | Only motorway, trunk, primary, secondary | Added tertiary, minor, residential, service, track, path |
| Missing road labels | No `transportation_name` layer | Added road names at zoom 12+ |
| Missing buildings | No `building` layer | Added buildings at zoom 13+ with fade-in opacity |
| Missing POIs | No `poi` layer | Added POI labels at zoom 14+ |
| Missing villages | No village labels | Added village labels at zoom 9+ |
| Water invisible | `#14161f` (almost black) | `#1e3a5f` (deep navy blue) |

### Layer Inventory (New Style)

| Layer | Zoom | Description |
|:--|:--|:--|
| background | all | `#1a1a1a` dark charcoal |
| water / waterway | all | Deep navy blue `#1e3a5f` |
| landuse (7 classes) | all | Residential, industrial, park, hospital, school, etc. |
| landcover (wood, grass) | all | Subtle green tints |
| boundary (2, 4) | all | Country/state borders |
| transportation (9 classes) | 5–16 | Motorway → path, each with zoom-interpolated width |
| building | 13+ | Gray fill with outline, opacity fades in |
| transportation_name | 12+ | Road names in light gray |
| water_name | 3+ | Ocean/sea names |
| place (country, state, city, town, village) | 1–9+ | Settlement labels |
| poi | 14+ | Points of interest |

### Files Changed

| File | Change |
|:--|:--|
| `assets/map-style-dark.json` | **Rewritten** — 544 lines → ~280 lines. Visible colors, all road classes, buildings, road names, POIs, villages. |
| `src/admin-web/public/map-style-dark.json` | Copied from assets |
| `src/user-web/public/map-style-dark.json` | Copied from assets |

### Git Commit

```
fix: rewrite dark map style with visible street-level detail, buildings, road names, and pois
```

*End of session*

---

## 📅 2026-05-08 — Polish: Darken Water Color

### Summary
Toned down the water color after the street-level style overhaul. The navy blue (`#1e3a5f`) was too bright and competed with the event markers for visual attention. Darkened to a muted slate blue (`#1c2636`) that is still distinguishable from land but stays in the background.

### Change

| Element | Before | After |
|:--|:--|:--|
| Water fill | `#1e3a5f` | `#1c2636` |
| Water outline | `#254a75` | `#1e2a3a` |
| Waterway lines | `#254a75` | `#1e2a3a` |

### Git Commit

```
style: darken water color to muted slate blue so it doesn't compete with event markers
```

*End of session*

---

## 📅 2026-05-09 — Feature: One-Command GeoWatch Launcher

### Summary
Created three executable scripts to eliminate the pain of opening multiple terminals. One command starts all services, opens the browser, and backgrounds everything with log files.

### Scripts

| Script | Purpose |
|:--|:--|
| `./scripts/start-geowatch.sh` | Starts Martin + Backend + Admin Web in background, opens browser to `localhost:5174`, prints status |
| `./scripts/stop-geowatch.sh` | Gracefully stops all three services (TERM, then KILL if needed) |
| `./scripts/logs-geowatch.sh` | Shows last 20 lines of all service logs |

### Behavior

```bash
./scripts/start-geowatch.sh
# → Checks if already running (skips if yes)
# → Starts Martin on :8080
# → Starts Backend on :3000
# → Starts Admin Web on :5174
# → Opens browser via xdg-open
# → Logs everything to ./logs/
```

### Log Files

| Service | Log Path |
|:--|:--|
| Martin | `./logs/martin.log` |
| Backend | `./logs/backend.log` |
| Admin Web | `./logs/admin-web.log` |

### Files Changed

| File | Change |
|:--|:--|
| `scripts/start-geowatch.sh` | **New** — One-command launcher with colored output, prerequisite checks, auto-browser-open |
| `scripts/stop-geowatch.sh` | **New** — Graceful + force kill for all services |
| `scripts/logs-geowatch.sh` | **New** — Tail last 20 lines of all logs |
| `readme.md` | Updated Quick Start section with launcher instructions |

### Git Commit

```
feat: add one-command launcher script (start/stop/logs) for all geowatch services
```

*End of session*

---

## 📅 2026-05-09 — Feature: Location Search (Nominatim Geocoding)

### Summary
Added a location search bar on the map that lets admins search for any place name (city, town, landmark) and fly the map there. Uses OpenStreetMap's free Nominatim API with debounced queries.

### How It Works

| Step | Action |
|:--|:--|
| 1 | Admin types "Sahiwal" in the search box (top-center of map) |
| 2 | 400ms debounce triggers Nominatim API call |
| 3 | Dropdown shows up to 5 matching locations |
| 4 | Admin clicks a result → map flies to lat/lng at zoom 10 |
| 5 | Admin can double-click to create an event at that location |

### Files Created / Changed

| File | Change |
|:--|:--|
| `src/admin-web/src/components/LocationSearch/LocationSearch.jsx` | **New** — Standalone search component with debounce, dropdown results, loading state, outside-click dismiss, Enter/Escape key support |
| `src/admin-web/src/components/Layout/DashboardLayout.jsx` | Added `<LocationSearch />` overlay at top-center of map |
| `src/admin-web/src/index.css` | Added `spin` keyframe animation for loading indicator |

### Technical Details

- **API:** `https://nominatim.openstreetmap.org/search` (free, no API key)
- **User-Agent:** `GeoWatch/1.0 (https://geowatch.local)` (required by OSM policy)
- **Debounce:** 400ms to stay well under the 1 req/sec limit
- **Attribution:** "Search by OpenStreetMap" link below the search box
- **No backend needed:** Calls Nominatim directly from the frontend

### Git Commit

```
feat: add location search with Nominatim geocoding on the map
```

*End of session*

---

## 📅 2026-05-09 — Fix: Dynamic Zoom Based on Location Type

### Summary
Location search now zooms intelligently based on the result type instead of always using zoom 10. Searching for a country zooms out; searching for a street zooms in.

### Zoom Mapping

| Location Type | Zoom | Example |
|:--|:--|:--|
| Continent | 3 | Asia, Europe |
| Country | 5 | Pakistan, India |
| State/Province | 7 | Punjab, Texas |
| County/District | 9 | Sahiwal District |
| City | 11 | Lahore, Karachi |
| Town | 13 | Sahiwal (town) |
| Village | 14 | Small village |
| Suburb/Neighborhood | 15 | Gulberg, DHA |
| Street/Road | 16 | Mall Road |
| Building/House | 17 | Specific address |
| River/Lake | 12 | Indus River |
| Airport/Station | 14 | Jinnah Terminal |
| Default (unknown) | 11 | — |

### Files Changed

| File | Change |
|:--|:--|
| `LocationSearch.jsx` | Passes full Nominatim `result` object (including `type` and `class`) to `onSelect` |
| `DashboardLayout.jsx` | Added `getZoomForLocation(type, class)` helper; computes zoom before calling `setFlyToCoords` |
| `AdminMap.jsx` | `flyTo` now uses `flyToCoords.zoom ?? 10` instead of hardcoded `10` |

### Git Commit

```
feat: dynamic zoom levels in location search based on result type
```

*End of session*

---

## 📅 2026-05-09 — Feature: Event Search (PostgreSQL Full-Text Search)

### Summary
Added full-text event search to the admin dashboard. Admins can now type keywords like "protest lahore" and the system returns ranked results from event titles, descriptions, and timeline update summaries.

### How It Works

| Step | Action |
|:--|:--|
| 1 | Admin types "protest" in the search box (top bar, next to date range) |
| 2 | 300ms debounce triggers the search |
| 3 | Backend uses PostgreSQL `to_tsvector()` + `ts_rank()` to find matching events |
| 4 | Searches event **title**, **description**, AND **timeline update summaries** |
| 5 | Results are ranked by relevance and returned |
| 6 | Map markers and event table both update to show only matching events |
| 7 | Press Escape or click ✕ to clear search → returns to date-filtered view |

### Architecture

**Backend:**
- `GET /events/search?q=protest+lahore` — public endpoint
- Uses on-the-fly `to_tsvector()` computation (no schema changes needed for current scale)
- Searches both `events` table (title + description) and `event_updates` table (summary) via LEFT JOIN
- Returns `{ events, count, hasMore }` with same shape as `listEvents`
- Supports all existing filters: date range, category, severity, status, viewport

**Frontend:**
- Search input in top bar with debounce (300ms) and clear button
- Search state overrides normal date-based fetching
- Map overlay shows: "12 events visible matching 'protest'"
- Viewport filtering still works when search is active

### Files Changed

| File | Change |
|:--|:--|
| `src/backend/src/services/event.service.js` | Added `searchEvents()` — full-text search with `ts_rank`, searches events + timeline |
| `src/backend/src/controllers/event.controller.js` | Added `searchEventsController` |
| `src/backend/src/routes/event.routes.js` | Added `GET /events/search` route |
| `src/backend/src/validators/event.schema.js` | Added `searchEventsQuerySchema` |
| `src/admin-web/src/services/api.js` | Added `api.searchEvents(params)` |
| `src/admin-web/src/components/Layout/TopBar.jsx` | Added search input with ✕ clear button, Escape key support |
| `src/admin-web/src/components/Layout/DashboardLayout.jsx` | Added `searchQuery` + `debouncedSearchQuery` state; fetch effect branches between search and date modes |
| `docs/migrations/add-event-search.sql` | **Created** — migration for `search_vector` generated column + GIN index (run manually as postgres for performance) |

### Performance Note

Current implementation uses **on-the-fly `to_tsvector()` computation** — fast enough for hundreds/thousands of events. For datasets exceeding ~10k events, run the migration:

```bash
sudo -u postgres psql -d geowatch_dev -f docs/migrations/add-event-search.sql
```

This creates pre-computed `search_vector` columns with GIN indexes, reducing query time from ~50ms to ~1ms.

### Git Commit

```
feat: add full-text event search across titles, descriptions, and timeline updates
```

*End of session*


---

## Session: Universal Event Search with Dropdown + Full Search Modal

### What Was Built

**Universal Search (no date filters)**
- Search now queries **all events across all time**, independent of the date range picker
- Date range controls what's visible on the map (browsing mode)
- Search is a "find & go to" discovery tool

**Hybrid Search UI — Two Modes:**

1. **Quick Search Dropdown** (TopBar)
   - Type in search box → debounced 300ms API call
   - Shows top **10 ranked results** in a dropdown below the input
   - Each result: title (with highlighted matches), date, coordinates, severity dot, category badge
   - Keyboard navigation: `↓`/`↑` to navigate, `Enter` to select, `Escape` to close
   - "View all N results →" link at bottom to open full modal
   - Click outside to close

2. **Full Search Modal** (deep exploration)
   - Large modal (900px × 80vh) with glassmorphism dark theme
   - **Search bar** pre-filled with query
   - **Filter bar**: Sort (Relevance / Date / Severity), Category, Severity, Status
   - **Results table**: Title, Category, Severity, Status, Start Date, Location
   - **Pagination**: 25 results per page with Prev/Next buttons
   - Click any row → modal closes, map flies to event, detail panel opens
   - Total result count displayed

**Backend Changes:**
- `buildEventWhereClause` now accepts `{ skipDateFilter: true }` option
- `searchEvents` rewritten with CTE for proper ranking + pagination:
  - `limit` (default 25, max 100) and `offset` query params
  - `ts_rank` computed per event via `MAX()` in CTE
  - Results ordered by rank → severity → start_date
  - Returns `{ events, count, limit, offset, hasMore }`
- `searchEventsQuerySchema` validates `limit` and `offset`
- Search controller passes pagination params through

**Frontend Changes:**
- `SearchDropdown.jsx` — new dropdown component with highlighted text, keyboard nav
- `SearchModal.jsx` — new modal with filters, sort, table, pagination
- `TopBar.jsx` — search input now self-contained with dropdown integration; removed `searchQuery`/`onSearchChange` props
- `DashboardLayout.jsx` — completely decoupled search from event fetching; map now only shows date-filtered events; search selection flies to event + opens detail panel
- `api.js` — `searchEvents` supports `limit` and `offset`

### Files Modified

| File | Change |
|---|---|
| `src/backend/src/validators/event.schema.js` | Added `limit` and `offset` to `searchEventsQuerySchema` |
| `src/backend/src/services/event.service.js` | `buildEventWhereClause` supports `skipDateFilter`; `searchEvents` uses CTE + pagination |
| `src/backend/src/controllers/event.controller.js` | Pass `limit`/`offset` through to service |
| `src/admin-web/src/services/api.js` | `searchEvents` accepts `limit`/`offset` |
| `src/admin-web/src/components/SearchDropdown/SearchDropdown.jsx` | **Created** — quick search dropdown UI |
| `src/admin-web/src/components/SearchModal/SearchModal.jsx` | **Created** — full search modal with filters + pagination |
| `src/admin-web/src/components/Layout/TopBar.jsx` | Integrated search dropdown; self-contained search state |
| `src/admin-web/src/components/Layout/DashboardLayout.jsx` | Decoupled search from map; added search modal state + handlers |

### UX Behavior

```
User types "protest lahore" in search box
→ Dropdown appears with top 10 matches
→ Click result → map flies there, detail panel opens
→ Click "View all 247 results" → full modal opens
→ Modal: filters, sort, pagination across all 247 matches
→ Click row in modal → modal closes, map flies, detail panel opens
→ Date range NEVER changes — map stays in current temporal context
```

### Build Status
- `admin-web`: ✅ Clean build
- `backend`: ✅ Module loads, syntax verified

### Git Commit

```
feat: universal event search with dropdown and full search modal
```

*End of session*


---

## Session: Search Modal Polish — Date Filter, Query Pre-fill, View-all Threshold

### Changes Made

1. **Date Range Filter in Search Modal**
   - Added `From → To` date inputs in the SearchModal filter bar
   - Backend `buildEventWhereClause` changed from `skipDateFilter` to `skipDefaultDate` — universal search skips the "today" default, but still applies explicit `dateFrom`/`dateTo` when provided
   - Admin can now search universally AND optionally narrow by date range
   - "Clear dates" button appears when either date is set

2. **"View all" Threshold Changed to > 5**
   - Dropdown limit reduced from 10 → 5 results
   - "View all N results →" link now appears when total matches exceed 5 (was: only when total exceeded dropdown capacity)
   - Makes the modal more accessible for smaller result sets

3. **Modal Search Bar Pre-filled from Navbar**
   - Fixed: SearchModal now syncs its `query` state with `initialQuery` prop via `useEffect` whenever the modal opens
   - Previously the modal could open with an empty search bar because `useState(initialQuery)` only initializes on first mount; if React re-used the component instance, the query wouldn't update
   - Now typing "Fire" in navbar → clicking "View all" → modal opens with "Fire" pre-filled and results already loaded

### Files Modified

| File | Change |
|---|---|
| `src/backend/src/services/event.service.js` | `buildEventWhereClause` option renamed `skipDefaultDate`; explicit dates still apply in universal search |
| `src/admin-web/src/components/Layout/TopBar.jsx` | Dropdown API limit changed from 10 → 5 |
| `src/admin-web/src/components/SearchDropdown/SearchDropdown.jsx` | "View all" shown when `totalCount > 5` |
| `src/admin-web/src/components/SearchModal/SearchModal.jsx` | Added dateFrom/dateTo filters; query syncs with initialQuery on open; added Clear dates button |

### Build Status
- `admin-web`: ✅ Clean build
- `backend`: ✅ Syntax verified

### Git Commit

```
feat: add date filter to search modal, lower view-all threshold, fix query pre-fill
```

*End of session*


---

## Session: Ghost Marker + Date Range Banner for Out-of-Range Search Results

### What Was Built

When an admin searches for an event that occurred outside the current date range (e.g., searching an old event while in Live Mode):

**Ghost Marker on Map**
- A semi-transparent, dashed-border marker appears at the event's location
- Pulsing dashed ring animation makes it visually distinct from normal markers
- Lower opacity (0.5) signals "this is not in your current view"
- Hover scales it up and increases opacity
- Clicking it opens the detail panel (same as normal markers)
- Automatically disappears when the event enters the current date range

**Context Banner**
- Bottom-center banner overlay on the map
- Shows: *"{Event Title} occurred on {date} — outside your current date range"*
- **"Switch to this date"** button — one click changes the date picker to that event's date
- The event then appears as a normal marker alongside other events from that day
- Banner disappears when the panel closes or the date is switched

**Implementation**
- `AdminMap.jsx`: Added `ghostEvent` prop + `ghostMarkerRef`; renders a distinct MapLibre marker with dashed border + `ghost-pulse` animation
- `DashboardLayout.jsx`: Computes `ghostEvent` when `selectedEvent` is not in the `events` array; passes it to AdminMap; renders banner overlay with date-switch handler
- `handleSwitchToEventDate`: Sets `dateRange` to the event's `start_date` (single-day view)

### Files Modified

| File | Change |
|---|---|
| `src/admin-web/src/components/Map/AdminMap.jsx` | Added `ghostEvent` prop, ghost marker rendering with pulse animation |
| `src/admin-web/src/components/Layout/DashboardLayout.jsx` | Ghost event computation, banner overlay, date-switch handler |

### Build Status
- `admin-web`: ✅ Clean build
- `backend`: ✅ No changes needed

### Git Commit

```
feat: ghost marker + date banner for out-of-range search results
```

*End of session*


---

## Session: Polish Location Search Dropdown

### What Was Built

**More Results**
- Nominatim API `limit` increased from 5 → **8** results
- Dropdown `maxHeight` increased from 240px → 340px to accommodate more results

**Keyboard Navigation**
- `↓` / `↑` — navigate through results (wraps around)
- `Enter` — fly to highlighted location
- `Escape` — close dropdown
- Highlighted item auto-scrolls into view

**Result Count Header**
- Dropdown header shows: *"8 locations found"*
- Consistent styling with event search dropdown

**Type Badges**
- Each location result shows a colored type badge (e.g., "City", "Street", "Country")
- 30+ location types mapped with appropriate labels and colors
- Badge color matches location category (purple for country, blue for state, orange for city, etc.)

**Improved Visual Layout**
- Pin dot icon (colored by type) on the left
- Name + type badge on the same row
- Full address below in muted text
- Truncated with ellipsis for long names/addresses
- Hover + keyboard highlight with `var(--bg-hover)` background

### Files Modified

| File | Change |
|---|---|
| `src/admin-web/src/components/LocationSearch/LocationSearch.jsx` | Complete rewrite with keyboard nav, type badges, result count, 8 results limit |

### Build Status
- `admin-web`: ✅ Clean build

### Git Commit

```
feat: polish location search dropdown with keyboard nav, type badges, and more results
```

*End of session*


---

## Session: Coordinate Search in Location Bar

### What Was Built

**Auto-detect coordinate input** in the location search box. Type coordinates in any of 3 formats — the dropdown shows "📍 Fly to coordinates" instead of querying Nominatim.

**Supported Formats (15+ variant patterns):**

| Format | Example |
|---|---|
| **DD** (Decimal Degrees) | `40.446195, -79.982195` <br> `40.446195°N, 79.982195°W` <br> `N 40.446195°, W 79.982195°` <br> `(40.446195°N, 79.982195°W)` <br> `-40.446195 79.982195` |
| **DDM** (Deg + Dec Min) | `40° 26.7717' N, 79° 58.9317' W` <br> `40°26.7717'N 79°58.9317'W` <br> `N 40° 26.7717' W 79° 58.9317'` |
| **DMS** (Deg + Min + Sec) | `40° 26' 46.3" N, 79° 58' 56" W` <br> `40:26:46.3N 79:58:56W` <br> `40 26 46.3 N 79 58 56 W` <br> `N 40° 26' 46.3" W 79° 58' 56"` |

**Parser Features:**
- Handles `°` `' ` ` " ` symbols, colons, commas, parentheses, brackets
- Direction prefix or suffix (`N 40.5` or `40.5 N`)
- Negative sign for South/West
- Falls back to Nominatim search if input is not coordinates
- Validates lat ∈ [-90, 90], lng ∈ [-180, 180]

**UI Integration:**
- Dropdown shows: *"📍 Fly to coordinates"* with parsed DD string and detected format
- Click or Enter → map flies to location at **zoom 16** (street/building level)
- 15/15 unit tests passing for all format variants

**Files Created/Modified:**

| File | Change |
|---|---|
| `src/admin-web/src/utils/parseCoordinates.js` | **Created** — robust DD/DDM/DMS parser with normalization |
| `src/admin-web/src/components/LocationSearch/LocationSearch.jsx` | Integrated coordinate detection before Nominatim call; shows coordinate result in dropdown |
| `src/admin-web/src/components/Layout/DashboardLayout.jsx` | Added `coordinates` type → zoom 16 in `getZoomForLocation` |

### Build & Test Status
- `admin-web`: ✅ Clean build
- Coordinate parser: ✅ 15/15 unit tests passing

### Git Commit

```
feat: add coordinate search support (DD, DDM, DMS) to location bar
```

*End of session*


---

## Session: Polish Search Dropdowns — Better Info Density & Layout

### What Was Built

**Location Search Dropdown**
- **Extracts hierarchical context** from Nominatim `display_name` — skips the location name itself, postal codes, and duplicates
- **Two-line layout** per result:
  - Line 1: Name (bold) + Type badge
  - Line 2: Region context (e.g., `"Hyderabad, Telangana, India"`)
- **Wider container**: 320px → **380px**
- **Tooltip** on hover shows full `display_name` for overflow cases

**Before vs After (Location)**
```
Before: Sikandarabad, Sikandarabad, Bulandshahr, Uttar Pra... (truncated, useless)
After:  Sikandarabad                    [TOWN]
        Bulandshahr, Uttar Pradesh, India
```

**Event Search Dropdown**
- **Wider container**: 220px → **280px**
- **Horizontal metadata**: Date · Coordinates · Status — all on one line, no more vertical stacking
- **Larger font**: 12px for metadata (was 11px)
- **Status badge added**: Shows `active`/`resolved` badge alongside category badge
- **Status text** in metadata line with color (green for active, gray for resolved)
- **Badges stacked vertically** on the right side (category + status)
- **Monospace font** for coordinates

**Before vs After (Event)**
```
Before: [●] Fire in land...            [CONFLICT]
        May                          (date broken across 3 lines)
        08,
        2026
        30.940,
        71.856

After:  [●] Fire in Lahore                      [CONFLICT]
        May 08, 2026 · 30.940, 71.856 · active   [ACTIVE]
```

### Files Modified

| File | Change |
|---|---|
| `src/admin-web/src/components/LocationSearch/LocationSearch.jsx` | Added `extractContext()` helper; two-line layout with region context; wider dropdown |
| `src/admin-web/src/components/SearchDropdown/SearchDropdown.jsx` | Horizontal metadata layout; status badge; larger fonts; wider dropdown |
| `src/admin-web/src/components/Layout/TopBar.jsx` | Event search width: 220px → 280px |
| `src/admin-web/src/components/Layout/DashboardLayout.jsx` | Location search width: 320px → 380px |

### Build Status
- `admin-web`: ✅ Clean build

### Git Commit

```
feat: improve search dropdown layouts — location context extraction, event metadata horizontal layout
```

*End of session*


---

## Session: Location Context for Events + Search Dropdown Improvements

### What Was Built

**1. Event Location Context (Frontend-First Architecture)**
- **Frontend does reverse geocoding** — `src/admin-web/src/utils/reverseGeocode.js` calls Nominatim reverse API, extracts `"State, Country"`
- **Backend is passive** — stores `location_context` directly from the create/update payload; no blocking network calls on the server
- **Form UX** — when admin double-clicks the map, the event form opens immediately with coordinates; a spinner shows "Locating..." while Nominatim resolves the location context in the background; the 📍 badge appears once resolved
- **No backend conditional checks** — `location_context` is included unconditionally in `EVENT_COLUMNS`; `hasColumn()` and `db-features.js` were removed for simplicity

**2. Event Search Dropdown (Frontend)**
- **Removed duplicate status** — no more status text in metadata line (badge only)
- **Removed raw coordinates** — humans don't read coordinates
- **Shows `location_context`** instead: `May 08, 2026 · Punjab, Pakistan`
- Clean two-line layout with category + status badges stacked on the right

**Before vs After (Event Dropdown)**
```
Before: [●] Fire in land...            [CONFLICT]
        May 08, 2026                    [RESOLVED]
        30.940, 71.856                  (coords nobody reads)
        Resolved                        (duplicate status)

After:  [●] Fire in Lahore              [CONFLICT]
        May 08, 2026 · Punjab, Pakistan [RESOLVED]
```

**3. Location Search Dropdown (Frontend)**
- **Structured address data**: Changed Nominatim call from `addressdetails=0` to `addressdetails=1`
- **Admin-level context only**: Extracts `state/province` + `country` from structured `address` object
- **No more street noise**: "Railway Road, Bahawalpur Railway Station..." → `"Punjab, Pakistan"`
- **Viewport bias**: Passes current map bounds as `viewbox` to Nominatim — results near the visible map area rank higher (subtle, doesn't filter out distant results)

**Before vs After (Location Dropdown)**
```
Before: Bahawalpur                      [STATION]
        Railway Road, Bahawalpur Railway Station, Model Town B, B...

After:  Bahawalpur                      [STATION]
        Punjab, Pakistan
```

**4. Backfill Script**
- `scripts/backfill-location-context.mjs` — reverse-geocodes all existing events without `location_context`
- Rate-limited to 1 request/second (Nominatim polite usage)
- Run: `node scripts/backfill-location-context.mjs`

### Files Created/Modified

| File | Change |
|---|---|
| `docs/migrations/add-location-context.sql` | **Created** — adds `location_context` column + index |
| `src/admin-web/src/utils/reverseGeocode.js` | **Created** — frontend Nominatim reverse geocode utility |
| `src/backend/src/services/event.service.js` | Unconditionally includes `location_context` in columns; stores from payload on create/update |
| `src/backend/src/validators/event.schema.js` | Added `locationContext` as optional string to create/update schemas |
| `src/admin-web/src/components/EventForm/EventForm.jsx` | Shows 📍 location badge + spinner while reverse geocoding; passes `locationContext` in submit payload |
| `src/admin-web/src/components/SearchDropdown/SearchDropdown.jsx` | Shows `location_context`; removed coords + duplicate status |
| `src/admin-web/src/components/LocationSearch/LocationSearch.jsx` | Uses `addressdetails=1`; admin-level context extraction; viewport bias via `viewbox` prop |
| `src/admin-web/src/components/Layout/DashboardLayout.jsx` | Async reverse geocode on double-click; passes viewport bounds to LocationSearch |
| `scripts/backfill-location-context.mjs` | **Created** — backfills existing events |

### ⚠️ Manual Steps Required

The DB migration must be run as postgres superuser:

```bash
sudo -u postgres psql -d geowatch_dev -f docs/migrations/add-location-context.sql
```

Then backfill existing events:
```bash
node scripts/backfill-location-context.mjs
```

### Build Status
- `admin-web`: ✅ Clean build
- `backend`: ✅ Syntax verified

### Git Commit

```
feat: add event location context via frontend reverse geocoding, improve search dropdowns
```

*End of session*


---

## Session: Final Polish — Date Range Sync, Local Timezone, Double-Click Zoom

### What Was Built

**1. SearchModal Date Range Blur Sync**
- When user selects a 'From' date and `dateTo` is empty, `dateTo` auto-syncs to match `dateFrom` **only after the user leaves the input** (`onBlur`)
- Prevents intermediate picker values (year clicks, month navigation) from prematurely setting `dateTo`
- If `dateTo` already has a custom value, it is preserved — user can still set a true range

**2. Local Timezone Date Fix**
- Replaced `new Date().toISOString().slice(0, 10)` (UTC) with `getFullYear()` / `getMonth()` / `getDate()` (local timezone)
- Fixes the bug where positive timezone offsets (e.g., UTC+5) caused "today" to show as yesterday after midnight
- Applied in `DashboardLayout.jsx` and `TopBar.jsx`

**3. Double-Click Zoom Fix**
- Added `doubleClickZoom: false` to MapLibre map config
- Prevents the map from zooming in when admin double-clicks to create an event
- Event creation now feels precise and predictable

### Files Modified

| File | Change |
|---|---|
| `src/admin-web/src/components/SearchModal/SearchModal.jsx` | Added `handleDateFromBlur` — syncs `dateTo` to `dateFrom` on blur only if `dateTo` is empty |
| `src/admin-web/src/components/Layout/DashboardLayout.jsx` | Local timezone `today` calculation; async reverse geocode on double-click |
| `src/admin-web/src/components/Layout/TopBar.jsx` | Local timezone `today` calculation |
| `src/admin-web/src/components/Map/AdminMap.jsx` | `doubleClickZoom: false` |

### Build Status
- `admin-web`: ✅ Clean build
- `backend`: ✅ Syntax verified

### Git Commit

```
fix: defer date-to sync until blur, local timezone today, disable dblclick zoom
```

*End of session*


---

## Session: Fix TopBar Date Range Auto-Sync on Blur

### What Was Fixed

**Problem:** The TopBar date range picker updated `To` immediately on every `onChange` of the `From` input. When the user navigated the date picker's year/month selectors, intermediate values fired `onChange` and prematurely synced `To` — causing erratic values (e.g., clicking year 2024 set `To` to 2025).

**Fix:** Split the sync logic into `onChange` (raw value only) and `onBlur` (finalize + sync):

| Event | From Input | To Input |
|:--|:--|:--|
| `onChange` | Updates `from` only | Updates `to` only |
| `onBlur` | Syncs `to = from` if `to` is default/today or invalid | Syncs `from = to` if `from > to` (invalid range) |

- `handleFromChange` / `handleToChange` — now pure value setters, no cross-field logic
- `handleFromBlur` / `handleToBlur` — run only when the user leaves the input, ensuring the picker has fully resolved

### Behavior

| Scenario | Before (onChange) | After (onBlur) |
|:--|:--|:--|
| User picks `From = 2024-10-05` while `To = today` | `To` immediately jumps to 2024-10-05 during picker nav | `To` stays `today` until user closes picker, then syncs |
| User changes `From` to a date after current `To` | `To` immediately jumps to match | `To` preserved until blur, then fixed |
| User changes `To` to a date before current `From` | `From` immediately jumps to match | `From` preserved until blur, then fixed |
| User already set a custom range | N/A | No sync — custom range respected |

### Files Modified

| File | Change |
|---|---|
| `src/admin-web/src/components/Layout/TopBar.jsx` | Split `handleFromChange`/`handleToChange` into pure setters; added `handleFromBlur`/`handleToBlur` for deferred sync; attached `onBlur` to both date inputs |

### Build Status
- `admin-web`: ✅ Clean build

### Git Commit

```
fix: defer topbar date range sync to onBlur to prevent intermediate picker values
```

*End of session*


---

## Session: Custom DatePicker Calendar Dropdown

### What Was Built

Replaced native HTML5 `<input type="date">` elements in the TopBar with a fully custom React calendar dropdown component. This gives us complete control over the date selection lifecycle — a day is only "committed" when explicitly clicked.

**Why native date inputs failed:**
- `onChange` fires unpredictably during picker navigation (year/month clicks)
- `onBlur` fires too late (only when focus leaves the input)
- No browser-exposed "picker closed" or "date committed" event
- This is why Facebook, Google Calendar, etc. all use custom pickers

**DatePicker Component Features:**
- **Day grid view**: 6×7 calendar with prev/next month arrows, weekday headers
- **Month/year selector**: Click month/year header → 3×4 month grid with year navigation
- **Today indicator**: Cyan border outline on today's date
- **Selected state**: Cyan background fill
- **Other-month days**: Muted gray
- **Click outside** → close without selecting
- **Escape key** → close without selecting
- **Dark tactical theme** using existing design tokens

**TopBar Integration:**
- Removed all draft state, refs, timers, debounce logic, and blur handlers
- Simple `onSelect` handlers:
  - From picker: if `To === today` or `From > To`, sync `To = From`
  - To picker: if `To < From`, sync `From = To`
- Date values displayed as `dd/mm/yyyy` in the trigger

### Files Created/Modified

| File | Change |
|---|---|
| `src/admin-web/src/components/DatePicker/DatePicker.jsx` | **New** — custom calendar dropdown with day grid + month/year selector |
| `src/admin-web/src/components/Layout/TopBar.jsx` | Replaced native date inputs with `<DatePicker>`; removed all draft/timer/sync complexity; added simple `onSelect` handlers |

### Build Status
- `admin-web`: ✅ Clean build

### Git Commit

```
feat: replace native date inputs with custom calendar dropdown in top bar
```

*End of session*

---

## 📅 2026-05-10 — Design Overhaul: Crimson Seal

### Summary
Applied the finalized "Crimson Seal" design system across the entire GeoWatch admin dashboard. Deep maroon accent (`#5a011c`), Space Grotesk font, film grain texture, radial gradient background, flat severity badges, and consistent component styling. Removed trial routes. Both admin-web and user-web build successfully.

### Design Tokens Overhauled

| Token | Before | After |
|:--|:--|:--|
| Font | Inter | Space Grotesk |
| Background | `#0f1117` | `#050505` with radial gradient |
| Surface | `#1a1d29` | `#0a0a0c` |
| Elevated | — | `#121215` |
| Accent | Cyan `#00d4ff` | Deep maroon `#5a011c` / `#9f1239` |
| Success | `#2ed573` | `#22c55e` |
| Warning | `#ffa502` | `#f59e0b` |
| Danger | `#ff4757` | `#dc2626` |
| Info | `#1e90ff` | `#3b82f6` |
| Border radius | `2px/4px` | `6px/10px/14px/16px` |

### New Shared Component

| File | Purpose |
|:--|:--|
| `src/shared/components/SeverityBadge.jsx` | Flat inline badge: bold number + divider + uppercase label, tinted background per severity level |

### Files Changed (20+)

| File | Change |
|:--|:--|
| `src/shared/design-tokens.css` | Complete Crimson Seal palette — maroon accent, Space Grotesk, new semantic colors, updated radii/shadows |
| `src/shared/components/Badge.jsx` | Brighter tints (10% opacity), rounded pill shape, dot indicator for categories |
| `src/shared/components/Button.jsx` | Primary=maroon, secondary=maroon outline, danger=dark red, hover glow effects |
| `src/shared/components/TimelineEntry.jsx` | Updated accent colors, elevated background |
| `src/shared/components/DateTimePicker.jsx` | Maroon accent for selected states |
| `src/shared/constants.js` | Severity scale updated: Minimal → Low → Moderate → Severe → Critical with new colors |
| `src/admin-web/src/index.css` | Space Grotesk font, film grain overlay (0.022 opacity), shimmer/slideUp animations |
| `src/admin-web/src/App.jsx` | Removed `/trial` and `/trial2` routes |
| `src/admin-web/src/components/Layout/DashboardLayout.jsx` | Radial gradient background, updated toast, ghost banner, counter overlay, right panel styling |
| `src/admin-web/src/components/Layout/TopBar.jsx` | Maroon logo square, maroon live mode pill, updated search/input borders |
| `src/admin-web/src/components/EventList/EventTable.jsx` | New SeverityBadge component, updated table hover states, wider severity column |
| `src/admin-web/src/components/EventDetail/EventDetailPanel.jsx` | Cards with left accent line, SeverityBadge in meta grid, updated timeline forms |
| `src/admin-web/src/components/EventForm/EventForm.jsx` | Elevated section boxes, maroon focus borders, updated location badge |
| `src/admin-web/src/components/Map/AdminMap.jsx` | Maroon user location marker, updated marker glow |
| `src/admin-web/src/components/SearchModal/SearchModal.jsx` | Updated severity colors, maroon accent highlights |
| `src/admin-web/src/components/SearchDropdown/SearchDropdown.jsx` | Updated severity colors, maroon accent |
| `src/admin-web/src/components/LocationSearch/LocationSearch.jsx` | Updated location type colors, surface backgrounds |
| `src/admin-web/src/components/Login/LoginPage.jsx` | Maroon top accent line, maroon title, updated input focus |
| `src/admin-web/src/components/DatePicker/DatePicker.jsx` | Maroon selected day highlight |
| `src/user-web/src/App.jsx` | Updated to use new `accent-light` token (prepares for future user-web redesign) |

### Severity Scale (New)

| Level | Label | Color |
|:--|:--|:--|
| 1 | Minimal | `#4ade80` |
| 2 | Low | `#fbbf24` |
| 3 | Moderate | `#fb923c` |
| 4 | Severe | `#f87171` |
| 5 | Critical | `#dc2626` |

### Build Verification

| App | Result |
|:--|:--|
| `admin-web` | ✅ 359 modules, 1.08MB JS, 69KB CSS |
| `user-web` | ✅ 35 modules, 149KB JS, 2.5KB CSS |

### Git Commit

```
feat: apply Crimson Seal design system — maroon accent, Space Grotesk, flat severity badges, film grain
```

*End of design overhaul*

---

## 📅 2026-05-10 — Fix: Restore Trial Route + Marker Radius

### Summary
Restored the `/trial` route in App.jsx so the DesignTrial page remains accessible for future design iterations. Also fixed map marker sizes by restoring the `radius` property to `SEVERITY_SCALE` that was accidentally dropped during the design token overhaul.

### Changes

| File | Change |
|:--|:--|
| `src/admin-web/src/App.jsx` | Re-added `/trial` route pointing to `DesignTrial.jsx` |
| `src/shared/constants.js` | Restored `radius: 6/8/10/12/14` to each `SEVERITY_SCALE` entry |

### Git Commit

```
fix: restore /trial route and add missing marker radius to severity scale
```

*End of fix*

---

## 📅 2026-05-11 — Feature: Real-Time SSE Live Activity Feed

### Summary
Built the complete real-time activity infrastructure for the user-web map explorer. Added a collapsible left sidebar that streams live events via Server-Sent Events (SSE), a bottom scrolling ticker, and a "while you were away" banner. Refactored the map page into a 3-column layout. Fixed the SSE route collision on the backend.

### Backend Fix

| File | Change |
|:--|:--|
| `src/backend/server.js` | Moved `GET /api/v1/events/stream` **before** `app.use('/api/v1/events', eventRoutes)` — the `/events/:id` route was catching `/events/stream` ("stream" parsed as a UUID), causing a 500 error. SSE endpoint now responds correctly. |

### New Frontend Components

| File | Purpose |
|:--|:--|
| `src/user-web/src/components/LiveActivity/LiveActivityFeed.jsx` | Collapsible left sidebar (300px / 44px). Chronological activity list newest-first. Unread items have red left border + tinted background. Shows category badge + severity badge per item. "Mark seen" button. Auto-scroll to top on new activity. New-activity button when scrolled down. |
| `src/user-web/src/components/Ticker/TickerBar.jsx` | Bottom thin scrolling marquee of recent activity. Auto-scrolls at 0.8px/frame. Pauses on hover. Click to jump to event. Duplicates items for seamless looping. Masked fade edges. |
| `src/user-web/src/components/AwayBanner/AwayBanner.jsx` | Centered dismissible banner: "While you were away · 3 new incidents · 2 updated events". "Jump to new" expands feed + marks seen. Dismiss sets lastSeenTimestamp. Slide-down animation. |

### MapPage Refactor

| File | Change |
|:--|:--|
| `src/user-web/src/pages/MapPage.jsx` | Full rewrite to 3-column layout: Live Activity Feed (left) + Map (center, flex) + Event Sidebar (right, 480px). Added SSE `EventSource` connection. `activities` state (max 50). `lastSeenTimestamp` in localStorage. Unread counting. Away banner on `visibilitychange`. Right sidebar reduced from 580px → 480px to accommodate left panel. |
| `src/user-web/src/index.css` | Added `pulse` and `slideDown` keyframe animations for the live dot and away banner. |

### SSE Event Handling

| Payload Type | Frontend Action |
|:--|:--|
| `event_created` | Add to activities, prepend to events list |
| `event_updated` | Add to activities, update event in-place in events list |
| `event_deleted` | Add to activities, remove from events list |
| `event_resolved` | Add to activities, update event in-place |
| `timeline_added` | Add to activities |
| `timeline_updated` | Add to activities |
| `timeline_deleted` | Add to activities |

### Key Behaviors

| Feature | Behavior |
|:--|:--|
| **Unread tracking** | Activity items with `timestamp > lastSeenTimestamp` get red left border + badge count |
| **Mark all seen** | Sets `lastSeenTimestamp = Date.now()` in state + localStorage; all borders disappear |
| **Click activity** | Fly map to event + open detail panel. Falls back to API fetch if event not in local list |
| **Away detection** | On `document.visibilityState === 'visible'`, if away > 30s and there are new activities, show banner |
| **Auto-scroll** | Feed auto-scrolls to top when new activity arrives; disabled if user has scrolled down |

### Bug Fix

| Issue | Fix |
|:--|:--|
| UUID event IDs compared with `parseInt` | Changed all `parseInt(eventId, 10)` to string comparison — event IDs are UUIDs, not integers |

### Build Verification

| App | Result |
|:--|:--|
| `user-web` | ✅ 370 modules, 1.08MB JS, 68KB CSS |
| `admin-web` | ✅ 360 modules, 1.10MB JS, 69KB CSS |
| `backend` | ✅ SSE endpoint responds with `: connected` |

### Git Commit

```
feat: real-time SSE live activity feed, scrolling ticker, away banner, and 3-column map layout
```

*End of session*

---

## 📅 2026-05-11 — Feature: Smart Viewport, Marker Polish, Ghost Marker in User-Web

### Summary
Audited user-web map functionality against admin-web and ported all missing features: smart viewport filtering (100-event threshold), split marker effects with hover, programmatic move suppression during flyTo, and ghost markers with context banner for out-of-range events.

### What Was Already the Same

| Feature | Status |
|:--|:--|
| Viewport bounds reporting on `moveend` / `load` | ✅ Same |
| `Map()` keyed by event ID for marker tracking | ✅ Same |
| Removing dead markers when events change | ✅ Same |
| In-place position updates for existing markers | ✅ Same |
| Colored dot markers sized by severity | ✅ Same |

### What Was Different — And What Changed

| # | Feature | Admin-Web | User-Web (Before) | User-Web (After) |
|:--|:--|:--|:--|:--|
| 1 | **Smart viewport filtering** | Two-phase fetch: count first, enable filtering if `> 100` events | Single fetch, always sent viewport | Two-phase fetch with `viewportFiltering` state, refs, and conditional re-fetch on pan |
| 2 | **Marker effect splitting** | `[events]` for create/remove/position + `[selectedEventId]` for style only | Single `[events, selectedEventId]` effect | Split into two effects matching admin |
| 3 | **Hover effects** | `mouseenter`/`mouseleave` scales child to 1.5× | None | Added hover scale + glow + zIndex on child visual |
| 4 | **Programmatic move detection** | `isProgrammaticMove` ref skips viewport reporting after `flyTo` | No flag — every flyTo triggered re-fetch | Added ref + suppression in `moveend` handler |
| 5 | **Ghost marker** | Dashed-border semi-transparent marker + pulse ring + banner with "Switch to this date" | None | Full ghost marker with `ghost-pulse` animation + bottom-center context banner |
| 6 | **Event counter** | Shows "in current map area" + total count warning | Plain "{n} events visible" | Added viewport context line + total count warning |
| 7 | **Click propagation** | No `stopPropagation` | `e.stopPropagation()` on marker click | Removed stopPropagation |
| 8 | **Stale closure guard** | `onViewportChangeRef.current` pattern | Closure captured in init effect | Added callback ref pattern |

### Files Changed

| File | Change |
|:--|:--|
| `src/user-web/src/components/Map/UserMap.jsx` | **Rewritten** — added `ghostEvent` prop, `isProgrammaticMove` ref, callback ref for `onViewportChange`, split marker effects (`[events]` + `[selectedEventId]`), hover effects on child visual, removed `stopPropagation`, ghost marker effect with `ghost-pulse` keyframes |
| `src/user-web/src/pages/MapPage.jsx` | **Rewritten** — added `viewportFiltering` / `totalEventCount` state, `viewportBoundsRef` / `viewportFilteringRef`, two-phase fetch logic, conditional re-fetch in `handleViewportChange`, `ghostEvent` computation, ghost banner overlay with "Switch to this date" button, enhanced event counter with viewport context |

### Build Verification

| App | Result |
|:--|:--|
| `user-web` | ✅ 370 modules, 1.09MB JS, 68KB CSS |
| `admin-web` | ✅ 360 modules, 1.10MB JS, 69KB CSS |

### Git Commit

```
feat: smart viewport filtering, split marker effects, hover, ghost marker, and flyTo suppression in user-web
```

*End of session*

---

## 📅 2026-05-11 — Refactor: Rename "Event" → "Incident" Across Entire Codebase

### Summary
Performed a full renaming of all "Event" terminology to "Incident" across the backend, both frontends, database schema, documentation, and seeds. This includes API routes, table names, component names, variable names, file names, display text, and SSE broadcast types.

### Why "Incident"
"Event" sounds like a festival or party to a general audience. "Incident" is the standard term in security, military, and humanitarian monitoring domains. It immediately signals seriousness.

### Backend Changes

| File | Change |
|:--|:--|
| `src/backend/src/services/event.service.js` | **Renamed** → `incident.service.js`. All functions renamed (`listEvents` → `listIncidents`, etc.). SQL queries updated: `FROM incidents i`, `i.id`, `i.status`, etc. Table alias `e` → `i` for consistency. |
| `src/backend/src/controllers/event.controller.js` | **Renamed** → `incident.controller.js`. All exports renamed (`getEvents` → `getIncidents`, `createEventController` → `createIncidentController`, etc.). |
| `src/backend/src/routes/event.routes.js` | **Renamed** → `incident.routes.js`. Route paths unchanged internally (Express router). |
| `src/backend/src/validators/event.schema.js` | **Renamed** → `incident.schema.js`. |
| `src/backend/src/controllers/timeline.controller.js` | SSE broadcast payloads: `eventId` → `incidentId`. |
| `src/backend/src/controllers/source.controller.js` | Variable names updated. |
| `src/backend/src/services/timeline.service.js` | SQL: `event_sources` → `incident_sources`, `event_updates` → `incident_updates`, `event_id` → `incident_id`. |
| `src/backend/src/services/source.service.js` | SQL: `event_sources` → `incident_sources`, `event_id` → `incident_id`. |
| `src/backend/server.js` | Mounts `/api/v1/incidents` and `/api/v1/incidents/:id/timeline`. SSE endpoint at `/api/v1/incidents/stream`. |

### API Route Changes

| Before | After |
|:--|:--|
| `GET /api/v1/events` | `GET /api/v1/incidents` |
| `GET /api/v1/events/search` | `GET /api/v1/incidents/search` |
| `GET /api/v1/events/:id` | `GET /api/v1/incidents/:id` |
| `POST /api/v1/events` | `POST /api/v1/incidents` |
| `PATCH /api/v1/events/:id` | `PATCH /api/v1/incidents/:id` |
| `DELETE /api/v1/events/:id` | `DELETE /api/v1/incidents/:id` |
| `POST /api/v1/events/:id/resolve` | `POST /api/v1/incidents/:id/resolve` |
| `GET /api/v1/events/stream` | `GET /api/v1/incidents/stream` |
| `POST /api/v1/events/:id/timeline` | `POST /api/v1/incidents/:id/timeline` |
| `POST /api/v1/events/:id/sources` | `POST /api/v1/incidents/:id/sources` |

### SSE Broadcast Type Changes

| Before | After |
|:--|:--|
| `event_created` | `incident_created` |
| `event_updated` | `incident_updated` |
| `event_deleted` | `incident_deleted` |
| `event_resolved` | `incident_resolved` |

### Frontend (Admin-Web) Changes

| Before | After |
|:--|:--|
| `EventDetailPanel.jsx` | `IncidentDetailPanel.jsx` |
| `EventForm.jsx` | `IncidentForm.jsx` |
| `EventTable.jsx` | `IncidentTable.jsx` |
| `selectedEvent` | `selectedIncident` |
| `handleSelectEvent` | `handleSelectIncident` |
| `onEventClick` | `onIncidentClick` |
| `eventData` | `incidentData` |
| `ghostEvent` | `ghostIncident` |
| Display: "New Event" | "New Incident" |
| Display: "events visible" | "incidents visible" |

### Frontend (User-Web) Changes

| Before | After |
|:--|:--|
| `EventSidebar.jsx` | `IncidentSidebar.jsx` |
| `EventListItem.jsx` | `IncidentListItem.jsx` |
| `EventDetailView.jsx` | `IncidentDetailView.jsx` |
| `events` state | `incidents` state |
| `selectedEvent` | `selectedIncident` |
| `handleSelectEvent` | `handleSelectIncident` |
| Display: "events visible" | "incidents visible" |
| API: `api.getEvents()` | `api.getIncidents()` |
| API: `api.getEvent(id)` | `api.getIncident(id)` |

### Database Migration

Created `docs/migrations/rename-events-to-incidents.sql` which renames:
- `events` → `incidents`
- `event_sources` → `incident_sources`
- `event_updates` → `incident_updates`
- `event_id` columns → `incident_id`
- Foreign key constraints
- Indexes and triggers

**Must be run before the backend will work:**
```bash
sudo -u postgres psql -d geowatch_dev -f docs/migrations/rename-events-to-incidents.sql
```

### Documentation & Seeds

| File | Change |
|:--|:--|
| `docs/database-schema.sql` | All `CREATE TABLE events` → `CREATE TABLE incidents`, indexes, triggers updated |
| `docs/api-spec.md` | All endpoint paths and terminology updated |
| `docs/migrations/add-event-search.sql` | Table references updated |
| `docs/migrations/add-location-context.sql` | Table references updated |
| `seeds.sql` | `INSERT INTO events` → `INSERT INTO incidents` |

### Build Verification

| App | Result |
|:--|:--|
| `admin-web` | ✅ 360 modules, 1.10MB JS, 69KB CSS |
| `user-web` | ✅ 370 modules, 1.09MB JS, 68KB CSS |
| `backend` | ✅ Syntax verified on all renamed files |

### ⚠️ Required Manual Step

Run the database migration **before restarting the backend**, or all API calls will fail with "relation 'events' does not exist":

```bash
sudo -u postgres psql -d geowatch_dev -f docs/migrations/rename-events-to-incidents.sql
```

### Git Commit

```
refactor: rename Event → Incident across backend, frontends, database, docs, and API routes
```

*End of refactor*

---

## 📅 2026-05-11 — Feature: Soft-Boundary Dynamic Max Zoom

### Summary
Implemented dynamic zoom clamping with a soft boundary transition. Inside the hot region (where z14 vector tiles exist), users can zoom to street-level detail (z14). Outside the hot region, zoom is limited to z10 to prevent blank tiles. A 3° buffer zone provides a smooth transition between the two limits.

### The Problem
The merged `tiles.mbtiles` has z14 tiles only within the hot region (25.3125°E–105.1831°E, 4.7626°N–42.5531°N). Outside this box, tiles exist only to z10. When users zoomed past z10 in Europe, the map went blank.

### The Solution

**Soft-boundary zoom clamping** based on map center:
- Inside hot bbox → maxZoom = 14
- Outside hot bbox but within 3° buffer → maxZoom smoothly interpolated from 14 down to 10
- Beyond buffer → maxZoom = 10
- If the user pans out of the hot region while zoomed past the new limit, the map smoothly flyTo's back to the allowed zoom

**Math:**
```js
dx = max(0, minLng - lng, lng - maxLng)
dy = max(0, minLat - lat, lat - maxLat)
n = max(dx / 3, dy / 3)  // normalized distance (0 = inside, 1 = at buffer edge)
maxZoom = 14 - min(n, 1) * 4
```

**Examples:**
| Location | Distance from bbox | Max Zoom |
|:--|:--|:--|
| Lahore (inside) | 0° | 14 |
| Just west of bbox (2.3° out) | 0.77 | ~10.9 |
| Mediterranean (5.3° out) | 1.77 | 10 |
| Northern Europe | >3° | 10 |

### Files Changed

| File | Change |
|:--|:--|
| `src/admin-web/src/components/Map/AdminMap.jsx` | Added `HOT_BBOX`, `getMaxZoomForCenter`, `move` listener with soft zoom clamping + smooth flyTo fallback |
| `src/user-web/src/components/Map/UserMap.jsx` | Same changes |

### Key Implementation Detail
The `move` listener reuses the existing `isProgrammaticMove` ref to prevent recursion and to skip viewport reporting during the auto-zoom-out animation.

### Build Verification

| App | Result |
|:--|:--|
| `admin-web` | ✅ 360 modules, 1.11MB JS, 69KB CSS |
| `user-web` | ✅ 370 modules, 1.09MB JS, 68KB CSS |

### Git Commit

```
feat: soft-boundary dynamic max zoom — z14 in hot region, z10 elsewhere with 3° buffer transition
```

*End of session*


---

## 📅 2026-05-25 — Feature: Full Incident Taxonomy (17 Domains, 162 Categories)

### Summary
Replaced the flat 6-string category system with a full hierarchical taxonomy: 17 domains and 162 categories, all stored in the database and configurable by superadmin. Incidents now reference `category_id` (integer FK) instead of a `category` string. The frontend dynamically fetches domains and categories from the API.

### New Taxonomy Structure

| # | Domain | Categories | Color |
|:--|:--|:--|:--|
| 1 | Conflict | 12 | `#ef4444` |
| 2 | Terrorism & Asymmetric | 11 | `#b91c1c` |
| 3 | Counter-Terrorism & Security Ops | 6 | `#3b82f6` |
| 4 | Civil Unrest | 9 | `#f59e0b` |
| 5 | Military Posture & Movement | 13 | `#64748b` |
| 6 | Natural Hazard | 13 | `#0ea5e9` |
| 7 | Infrastructure & Industrial | 9 | `#8b5cf6` |
| 8 | Health Emergency | 7 | `#10b981` |
| 9 | Humanitarian & Migration | 13 | `#eab308` |
| 10 | Political & Governance | 12 | `#94a3b8` |
| 11 | Cyber & Information | 10 | `#06b6d4` |
| 12 | Maritime | 9 | `#0369a1` |
| 13 | Economic Shock | 9 | `#84cc16` |
| 14 | Environmental | 8 | `#22c55e` |
| 15 | CBRN & WMD | 6 | `#7f1d1d` |
| 16 | Transport & Aviation | 5 | `#a855f7` |
| 17 | Intelligence | 10 | `#6366f1` |

### Database Changes

| File | Purpose |
|:--|:--|
| `docs/migrations/add-domains-and-categories.sql` | Creates `domains` and `categories` tables; seeds all 17 domains + 162 categories |
| `docs/migrations/add-category-id-to-incidents.sql` | Adds `category_id` to `incidents` and `zones`; migrates old string categories to new IDs |

**Schema:**
```sql
CREATE TABLE domains (id, name, slug, description, color, icon, sort_order, is_active)
CREATE TABLE categories (id, domain_id FK, name, slug, description, severity_schema JSONB, default_severity, sort_order, is_active)
```

### Backend Changes

| File | Change |
|:--|:--|
| `src/backend/src/services/category.service.js` | **New** — `getDomains()`, `getDomainWithCategories()`, `getAllCategories()` |
| `src/backend/src/controllers/category.controller.js` | **New** — Public GET endpoints for domains and categories |
| `src/backend/src/routes/category.routes.js` | **New** — `/api/v1/categories`, `/categories/domains`, `/categories/domains/:slug` |
| `src/backend/server.js` | Mounted category routes |
| `src/backend/src/services/incident.service.js` | JOINs `categories` + `domains` on all SELECT queries; returns `domain_name`, `domain_color`, `category_name`, etc. |
| `src/backend/src/validators/incident.schema.js` | `category` → `categoryId` (integer) |
| `src/backend/src/controllers/incident.controller.js` | Passes `categoryId` through filters |

### Frontend Changes

| File | Change |
|:--|:--|
| `src/shared/hooks/useCategories.js` | **New** — Fetches `/categories`, builds lookup maps, caches results globally |
| `src/shared/components/Badge.jsx` | Now accepts `color` prop instead of `category` prop |
| `src/shared/constants.js` | Removed `CATEGORY_COLORS` and `CATEGORY_LABELS` |
| `src/admin-web/src/components/IncidentForm/IncidentForm.jsx` | Hierarchical picker: Domain dropdown → Category dropdown (filtered by domain). Submits `categoryId`. |
| `src/admin-web/src/components/SearchModal/SearchModal.jsx` | Category filter now uses `categoryId` with dynamic options from API |
| `src/admin-web/src/components/IncidentList/IncidentTable.jsx` | Displays `domain_name` badge + `category_name` text |
| `src/admin-web/src/components/IncidentDetail/IncidentDetailPanel.jsx` | Domain badge + category name display |
| `src/admin-web/src/components/SearchDropdown/SearchDropdown.jsx` | Uses `domain_color` and `domain_name` |
| `src/admin-web/src/components/Map/AdminMap.jsx` | Marker colors from `incident.domain_color` |
| `src/user-web/src/components/Home/CategoryGrid.jsx` | Fetches domains from API, renders 17 domain cards with dynamic colors |
| `src/user-web/src/components/Map/UserMap.jsx` | Marker colors from `incident.domain_color` |
| `src/user-web/src/pages/MapPage.jsx` | Filter uses `categoryId` |
| `src/user-web/src/components/IncidentList/IncidentSidebar.jsx` | Uses domain/category names and colors |
| `src/user-web/src/components/IncidentList/IncidentListItem.jsx` | Uses domain/category names and colors |
| `src/user-web/src/components/IncidentDetail/IncidentDetailView.jsx` | Uses domain/category names and colors |
| `src/user-web/src/components/LiveActivity/LiveActivityFeed.jsx` | Uses domain/category names and colors |
| `src/user-web/src/components/Home/FeaturedEvents.jsx` | Uses domain/category names and colors |

### API Changes

| Endpoint | Change |
|:--|:--|
| `GET /api/v1/categories` | **New** — Returns all active categories with joined domain info |
| `GET /api/v1/categories/domains` | **New** — Returns all active domains |
| `GET /api/v1/categories/domains/:slug` | **New** — Returns single domain with its categories |
| `GET /api/v1/incidents?categoryId=123` | `category` param replaced with `categoryId` |
| `POST /api/v1/incidents` | Body field `category` replaced with `categoryId` (integer) |
| `PATCH /api/v1/incidents/:id` | Body field `category` replaced with `categoryId` (integer) |

### Migration Note

Run the postgres script to add `category_id` to existing incidents:
```bash
sudo -u postgres psql -d geowatch_dev -f docs/migrations/add-category-id-to-incidents.sql
```

Old categories are mapped to "Unclassified *" categories within their respective domains so admins can reclassify them later.

### Build Verification

| App | Result |
|:--|:--|
| `admin-web` | ✅ 361 modules, 1.11MB JS, 69KB CSS |
| `user-web` | ✅ 370 modules, 1.09MB JS, 68KB CSS |
| `backend` | ✅ Syntax verified |

### Git Commit

```
feat: implement full incident taxonomy — 17 domains, 162 categories, DB-driven with superadmin-ready schema
```

*End of session*

---

## 📅 2026-05-09 — Feature: Admin Layout Redesign — Map-First HUD

### Summary
Complete admin dashboard layout redesign. The map is now the hero element taking most of the screen. Removed the dead bottom event table. Added a live activity feed on the left, a 630px slide-in right panel, domain filter badges, toast notifications, and map pulse animations for new incidents.

### Pain Points Addressed

| # | Pain Point | Fix |
|:--|:--|:--|
| 1 | Sidebar too wide (~50% screen) | Map now fills remaining space; right panel is 630px slide-in only when needed |
| 2 | Bottom event table felt dead | Removed entirely; replaced with live activity feed |
| 3 | No awareness of new events | Real-time SSE feed + toast notifications + unread badges |
| 4 | Map not the hero | Map is now the dominant element; panels are overlays |

### New Files

| File | Purpose |
|:--|:--|
| `src/admin-web/src/components/LiveActivity/AdminLiveFeed.jsx` | Collapsible 280px/44px live activity feed with domain filter badges, admin View/Edit actions |

### Changed Files

| File | Change |
|:--|:--|
| `src/admin-web/src/components/Layout/DashboardLayout.jsx` | **Complete rewrite** — 3-column HUD layout: left live feed (280px) + center map (flex:1) + right 630px slide-in panel. SSE stream integration. Domain filter state. Toast notifications. Removed IncidentTable. |
| `src/admin-web/src/components/Map/AdminMap.jsx` | Added `newIncidentIds` prop with pulsing ring animation for newly created incidents |
| `src/admin-web/src/components/Layout/TopBar.jsx` | No changes — LIVE mode indicator already present |

### Layout Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              TopBar (60px)                              │
├──────────┬─────────────────────────────────────────┬────────────────────┤
│          │                                         │                    │
│  Live    │                                         │   Right Panel      │
│  Feed    │              MAP (hero)                 │   (630px)          │
│ (280px)  │                                         │   slide-in when    │
│          │                                         │   incident selected│
│          │                                         │                    │
├──────────┴─────────────────────────────────────────┴────────────────────┤
│                           (no bottom table)                             │
└─────────────────────────────────────────────────────────────────────────┘
```

### Live Activity Feed Features

- **Collapsible:** 280px expanded → 44px icon bar with unread badge
- **Real-time SSE:** Connects to `/api/v1/incidents/stream`
- **Unread tracking:** Persisted in localStorage, "Mark seen" button
- **Domain filter badges:** Shows all visible domains with counts; click to filter map
- **Admin actions:** Each activity has "View" and "Edit" buttons
- **Auto-scroll:** Scrolls to top on new activity; stops if user scrolls down

### Toast Notifications

- Appears bottom-center when new incidents arrive via SSE
- Clicking toast navigates to the incident
- Auto-dismisses after 6 seconds

### Map Pulse Animation

- New incidents (from SSE `incident_created`) get a 1.8s expanding ring pulse
- Ring color matches the incident's domain color
- Auto-clears after animation completes

### Build Verification

| App | Result |
|:--|:--|
| `admin-web` | ✅ 361 modules, 1.11MB JS, 69KB CSS |
| `user-web` | ✅ 371 modules, 1.09MB JS, 68KB CSS |

### Git Commit

```
feat: admin layout redesign — map-first HUD with live feed, domain filters, toast notifications, pulse animations
```

*End of session*

---

## 📅 2026-05-09 — Feature: Resolve Incident — Detail Panel + TopBar

### Summary
Added the resolve action back to the admin dashboard in two places: a prominent "Resolve" button in the incident detail panel, and a contextual "Resolve" button in the TopBar when an active incident is selected. Includes the full resolve modal with datetime picker and smart grace-period warning.

### Why This Was Needed

The bottom incident table (which contained the resolve action) was removed during the HUD layout redesign. Admins still need a visible, one-click way to mark incidents as resolved.

### Changes

| File | Change |
|:--|:--|
| `src/admin-web/src/components/IncidentDetail/IncidentDetailPanel.jsx` | **Added resolve modal + button.** New state: `showResolveModal`, `resolveDate`, `resolveLoading`. `openResolveModal()` / `closeResolveModal()` / `handleConfirmResolve()` handlers. Smart grace-period warning logic (same as old table). Resolve button (danger variant) appears in bottom action row only when `incident.status === 'active'`. Modal is a centered overlay with datetime-local input, warning box, Cancel/Confirm buttons. Also accepts `resolveTrigger` prop to open modal programmatically from TopBar. |
| `src/admin-web/src/components/Layout/TopBar.jsx` | **Added contextual Resolve button.** Accepts `selectedIncident` and `onResolve` props. When an active incident is selected, a red "Resolve" button appears to the left of "+ Add Incident". This provides always-visible access to the resolve action regardless of scroll position. |
| `src/admin-web/src/components/Layout/DashboardLayout.jsx` | **Wired resolve flow.** Added `resolveTrigger` state. Passes `selectedIncident` and `onResolve` to TopBar. When TopBar resolve is clicked, increments `resolveTrigger` (and ensures panel is in detail mode). Passes `resolveTrigger` down to `IncidentDetailPanel` to programmatically open its modal. `onResolve` callback from detail panel refreshes incident data. |

### Resolve Flow

```
Admin selects incident on map
    ↓
Right panel slides in with detail view
    ↓
Two ways to resolve:
    ├─→ Click [Resolve] in TopBar (always visible)
    └─→ Click [Resolve] at bottom of detail panel
    ↓
Resolve modal opens with datetime-local picker
    ↓
Smart warning shown:
    • "Marker will be removed after 24 hours" (if resolving now)
    • "Marker will disappear in N hours" (if resolving in past)
    • "Marker will disappear from the map" (if >24h ago)
    ↓
Click [Confirm Resolve] → API call → modal closes → data refreshes
```

### Visual Placement

**TopBar (when active incident selected):**
```
[GeoWatch] [Admin] [Date Range] [Search]          [Live/Historic Pill]    [Resolve] [+ Add Incident] [Logout]
                                                                                ↑
                                                                          Red danger button
```

**Detail Panel bottom actions:**
```
[Resolve] [Edit Incident] [Close]
   ↑
Red danger button, only shown for active incidents
```

### Build Verification

| App | Result |
|:--|:--|
| `admin-web` | ✅ 361 modules, 1.12MB JS, 69KB CSS |
| `user-web` | ✅ 371 modules, 1.09MB JS, 68KB CSS |

### Git Commit

```
feat: add resolve incident action to detail panel and top bar with grace-period modal
```

*End of session*

---

## 📅 2026-05-09 — Feature: Source-Level + Incident-Level Verification System (Option 3)

### Summary
Implemented a full hybrid verification system: every source gets a verification status (`unverified` | `verified` | `disputed` | `debunked`), and each incident auto-computes its badge from sources with an optional admin override. Verified-only filter on user map. Visual indicators everywhere.

### Database Changes

**Migration file:** `docs/migrations/add-verification-system.sql`

```sql
ALTER TABLE incident_sources ADD COLUMN verification_status VARCHAR(20) NOT NULL DEFAULT 'unverified';
ALTER TABLE incidents ADD COLUMN verification_override VARCHAR(20) DEFAULT NULL;
```

> ⚠️ **Run this as postgres:**
> ```bash
> sudo -u postgres psql -d geowatch_dev -f docs/migrations/add-verification-system.sql
> ```

### Verification Status Logic (Backend)

| Sources Mix | Computed Status |
|:--|:--|
| No sources | `unverified` |
| All unverified | `unverified` |
| ≥1 verified, no disputes | `verified` |
| ≥2 independent verified, no disputes | `confirmed` |
| Any disputed or debunked | `contested` |

Admin can override via `verification_override` column: `unverified` | `verified` | `confirmed` | `contested`.

### Backend Changes

| File | Change |
|:--|:--|
| `src/backend/src/services/source.service.js` | `createEventSource` accepts `verificationStatus`. **New** `updateSourceVerification(sourceId, status)` |
| `src/backend/src/controllers/source.controller.js` | **New** `updateSourceVerificationController` |
| `src/backend/src/routes/source.routes.js` | **New** `PATCH /incidents/:id/sources/:sourceId` route |
| `src/backend/src/validators/source.schema.js` | `createSourceSchema` adds `verificationStatus`. **New** `updateSourceVerificationSchema` |
| `src/backend/src/services/incident.service.js` | `computeVerificationStatus(sources, override)` helper. All list/search/get queries now compute and return `verification_status`. `createIncident`/`updateIncident` accept `verificationOverride` |
| `src/backend/src/validators/incident.schema.js` | `createIncidentSchema` and `updateIncidentSchema` add `verificationOverride` |

### Admin Web Changes

| File | Change |
|:--|:--|
| `src/admin-web/src/services/api.js` | **New** `updateSourceVerification(incidentId, sourceId, body)` |
| `src/admin-web/src/components/IncidentForm/IncidentForm.jsx` | Added "Verification Override" dropdown. Sources include `verificationStatus` on creation |
| `src/admin-web/src/components/IncidentDetail/IncidentDetailPanel.jsx` | Header shows verification badge + override dropdown (auto/unverified/verified/confirmed/contested). Each source shows verification status badge + toggle buttons (Verify/Dispute/Debunk/Unverify). Resolve modal retained |
| `src/admin-web/src/components/LiveActivity/AdminLiveFeed.jsx` | **New** "✓ Verify" quick-action button on `incident_created` activities for rapid triage |
| `src/admin-web/src/components/Map/AdminMap.jsx` | Map markers show green dot for verified/confirmed, red dot for contested |

### User Web Changes

| File | Change |
|:--|:--|
| `src/user-web/src/services/api.js` | No changes (verification is computed server-side) |
| `src/user-web/src/components/Map/MapControls.jsx` | **New** "Verified Only" toggle button with green indicator |
| `src/user-web/src/pages/MapPage.jsx` | `filters.verifiedOnly` state. Client-side filters incidents to `verified` \| `confirmed` when on |
| `src/user-web/src/components/Map/UserMap.jsx` | Map markers show green dot (verified/confirmed) or red dot (contested) |
| `src/user-web/src/components/IncidentList/IncidentListItem.jsx` | Shows verification badge next to severity |
| `src/user-web/src/components/IncidentDetail/IncidentDetailView.jsx` | Header shows incident verification badge. Each source shows its verification status badge |

### Shared Changes

| File | Change |
|:--|:--|
| `src/shared/constants.js` | **New** `VERIFICATION_STATUS`, `VERIFICATION_CONFIG`, `SOURCE_VERIFICATION_STATUS`, `SOURCE_VERIFICATION_CONFIG` |

### Visual Language

| Status | Icon | Color | Meaning |
|:--|:--|:--|:--|
| `unverified` | `?` | `#9ca3af` gray | Not yet reviewed |
| `verified` | `✓` | `#22c55e` green | At least 1 verified source |
| `confirmed` | `✓✓` | `#15803d` dark green | 2+ independent verified sources |
| `contested` | `!` | `#ef4444` red | Has disputed or debunked sources |

### Build Verification

| App | Result |
|:--|:--|
| `admin-web` | ✅ 361 modules, 1.12MB JS, 69KB CSS |
| `user-web` | ✅ 371 modules, 1.09MB JS, 68KB CSS |
| `backend` | ✅ Syntax verified |

### Git Commit

```
feat: implement hybrid verification system — source-level verify/dispute/debunk + incident auto-compute with admin override
```

*End of session*

---

## 📅 2026-05-09 — Fix: Live Update Sync for Selected Incident Detail View

### Summary
Fixed a stale-data bug where users viewing an incident's detail panel would not see admin updates until they clicked away and back. Now the detail view auto-refreshes via SSE when the selected incident is updated, with a subtle "Updated just now" flash indicator.

### Problem

| Step | What Happened |
|:--|:--|
| 1 | User selects an incident → detail panel fetches data once |
| 2 | Admin edits/resolves/updates the incident |
| 3 | Backend broadcasts SSE event |
| 4 | Map + sidebar update from SSE, but **detail panel stays stale** |
| 5 | User must click another incident and back to see changes |

### Root Cause
`IncidentDetailView` only fetches data in a `useEffect([incidentId])`. Since `incidentId` doesn't change when the same incident is updated, the detail never re-fetches.

### Solution

**Three-layer fix:**

1. **SSE handler watches for selected incident** (`MapPage.jsx`):
   - Added `selectedIncidentRef` to track current selection inside the SSE handler (avoids stale closure since the handler is in a `useEffect([])`)
   - When any SSE event arrives for the currently selected incident ID, calls `api.getIncident()` to fetch fresh data
   - Updates `selectedIncident` state AND patches the `incidents` array so sidebar + map stay in sync

2. **Detail view re-fetches on demand** (`IncidentDetailView.jsx`):
   - New `refreshKey` prop — when incremented, triggers `api.getIncident()` re-fetch
   - Added to `useEffect` dependency array alongside `incidentId`

3. **Visual feedback** (`IncidentDetailView.jsx`):
   - "Updated just now" green flash banner appears for 3 seconds after a live refresh
   - Uses `fadeInOut` CSS keyframe animation (fade in → hold → fade out)

### Files Changed

| File | Change |
|:--|:--|
| `src/user-web/src/pages/MapPage.jsx` | `selectedIncidentRef` keeps ref synced with state. SSE handler checks if event affects selected incident → refetches detail + updates `selectedIncident` + patches `incidents` list. `detailRefreshKey` state passed to sidebar |
| `src/user-web/src/components/IncidentList/IncidentSidebar.jsx` | Passes `detailRefreshKey` through to `IncidentDetailView` as `refreshKey` prop |
| `src/user-web/src/components/IncidentDetail/IncidentDetailView.jsx` | `refreshKey` prop triggers re-fetch in `useEffect`. `justUpdated` state shows green flash banner with pulsing dot. `fadeInOut` CSS animation |

### Coverage

All SSE event types now trigger detail refresh for the selected incident:

| Event Type | Detail Refreshes? |
|:--|:--|
| `incident_updated` | ✅ Yes |
| `incident_resolved` | ✅ Yes |
| `timeline_added` | ✅ Yes (refetch gets new timeline) |
| `timeline_updated` | ✅ Yes |
| `timeline_deleted` | ✅ Yes |

### Build Verification

| App | Result |
|:--|:--|
| `user-web` | ✅ 371 modules, 1.09MB JS, 68KB CSS |
| `admin-web` | ✅ 361 modules, 1.12MB JS, 69KB CSS |

### Git Commit

```
fix: live-sync selected incident detail view via SSE with "updated just now" flash indicator
```

*End of session*

---

## 📅 2026-05-09 — Fix: White Markers + Real-Time Verification Sync

### Summary
Fixed two critical bugs: (1) all incident markers appearing white/gray because SSE broadcasts sent raw incidents without joined `domain_color`, and (2) verification status changes not reflecting in real time on the user web because `updateSourceVerification` didn't broadcast any SSE event.

### Bug 1: White Markers — Root Cause

When an admin created or updated an incident, the backend broadcasted the **raw** incident row from `INSERT/UPDATE ... RETURNING *`. This raw row did NOT include joined fields like `domain_color`, `domain_name`, or `category_name`.

The user web's SSE handler then **replaced** the enriched incident (with proper color from the initial `listIncidents` fetch) with this raw payload. Result: markers lost their color and fell back to gray.

**Confirmation:**
```
Raw incident keys: ['id', 'title', 'description', 'latitude', ...]
Has domain_color? false
```

### Bug 1: Fix

**Backend controllers now fetch the enriched incident before broadcasting:**

| Controller | Before | After |
|:--|:--|:--|
| `createIncidentController` | Broadcast raw `RETURNING *` row | Creates sources, then calls `getEventById()` to get enriched incident with joins + computed verification, broadcasts that |
| `updateIncidentController` | Broadcast raw `RETURNING *` row | Calls `getEventById()` after update, broadcasts enriched incident |
| `resolveIncidentController` | Broadcast raw `RETURNING *` row | Calls `getEventById()` after resolve, broadcasts enriched incident |

**User web SSE handler now merges instead of replacing:**
```js
// Before (destructive — loses existing fields)
return prev.map((ev) => (ev.id === payload.incident.id ? payload.incident : ev));

// After (preserves existing joined fields)
return prev.map((ev) => (ev.id === payload.incident.id ? { ...ev, ...payload.incident } : ev));
```

### Bug 2: Real-Time Verification Not Syncing — Root Cause

When an admin verified/disputed/debunked a source via `PATCH /incidents/:id/sources/:sourceId`, the `updateSourceVerificationController` updated the database but **never broadcasted an SSE event**. The user web had no way of knowing anything changed.

Additionally, `updateIncidentController` (which handles verification override changes) broadcasted a raw incident without computed `verification_status`, so even if the event arrived, the verification badge wouldn't update.

### Bug 2: Fix

**`source.controller.js`** now fetches the enriched incident and broadcasts `incident_updated` after any source verification change:

```js
const enriched = await getEventById(req.params.id);
broadcastEvent({ type: 'incident_updated', incident: enriched?.incident });
```

This triggers the user web's existing live-sync logic: the detail view auto-refreshes, the marker dot updates, and the sidebar badge updates.

### Files Changed

| File | Change |
|:--|:--|
| `src/backend/src/controllers/incident.controller.js` | All create/update/resolve controllers now call `getEventById()` after DB mutation and broadcast the **enriched** incident (with `domain_color`, `verification_status`, joined category/domain data) |
| `src/backend/src/controllers/source.controller.js` | `updateSourceVerificationController` now fetches enriched incident via `getEventById()` and broadcasts `incident_updated` event |
| `src/user-web/src/pages/MapPage.jsx` | SSE handler merges payload with existing incident using `{ ...ev, ...payload.incident }` instead of full replacement |

### Important: Restart Backend

These are backend controller changes. **Restart the backend** for them to take effect:

```bash
# If using the launcher:
./scripts/stop-geowatch.sh
./scripts/start-geowatch.sh

# Or manually:
# Stop existing node process, then:
cd src/backend && npm run dev
```

### Build Verification

| App | Result |
|:--|:--|
| `admin-web` | ✅ 361 modules, 1.12MB JS, 69KB CSS |
| `user-web` | ✅ 371 modules, 1.09MB JS, 68KB CSS |
| `backend` | ✅ Syntax verified |

### Git Commit

```
fix: broadcast enriched incidents via SSE to preserve domain_color + add source verification SSE broadcast
```

*End of session*

---

## 📅 2026-05-09 — Feature: Hover Preview Popup on Map Markers

### Summary
Added a MapLibre hover popup that appears next to markers when the user hovers over them. Shows key incident info (title, domain, severity, verification, location, date, truncated description) without requiring a click. Clicking still opens the full detail panel.

### How It Works

| Action | Result |
|:--|:--|
| Hover over marker | A styled card appears next to the marker after 200ms (prevents flicker on fast mouse movement) |
| Mouse leaves marker | Popup fades out immediately |
| Click marker | Popup closes, full detail panel opens (existing behavior) |

### Popup Content

```
┌────────────────────────────────┐
│ 🔴 Conflict    ✓ Verified      │  ← Badges row
│                                │
│ Shelling near Gaza Strip       │  ← Title
│ Reports of heavy shelling...   │  ← Truncated description (100 chars)
│                                │
│ 📍 Gaza City                   │  ← Location
│ 📅 May 5, 2026 · 2:30 PM       │  ← Date
│ ─────────────────────────────  │
│ Click for details →            │  ← CTA (admin: "Click to edit →")
└────────────────────────────────┘
```

### Technical Details

- **MapLibre `Popup`** with `closeButton: false`, `closeOnClick: false`, `offset: 12`
- **200ms hover delay** — `setTimeout` on `mouseenter`, cleared on `mouseleave`
- **Single popup instance** — reused across markers, removed before showing a new one
- **Reads `_incidentData`** — so updated incidents (from SSE) always show fresh data
- **Custom dark CSS** — `.geowatch-popup .maplibregl-popup-content` styled with `var(--bg-surface)`, `var(--border-subtle)`, `var(--shadow-lg)`
- **Smart positioning** — MapLibre auto-flips the popup if the marker is near the viewport edge

### Files Changed

| File | Change |
|:--|:--|
| `src/user-web/src/components/Map/UserMap.jsx` | Added `popupRef` + `popupTimeoutRef`. Hover handlers on each marker's visual element: `mouseenter` → delayed popup show, `mouseleave` → popup hide, `click` → popup hide then `onEventClick`. `buildPopupHTML()` helper generates styled HTML card. Popup CSS added to `<style>` block |
| `src/admin-web/src/components/Map/AdminMap.jsx` | Same popup logic as user map. `buildPopupHTML()` includes admin CTA text ("Click to edit →"). Popup cleanup added to unmount effect |

### Popup Styling (shared)

```css
.geowatch-popup .maplibregl-popup-content {
  background: var(--bg-surface);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-subtle);
  padding: 0;
  box-shadow: var(--shadow-lg);
  max-width: 280px;
}
.geowatch-popup .maplibregl-popup-tip {
  border-top-color: var(--bg-surface);
}
```

### Build Verification

| App | Result |
|:--|:--|
| `admin-web` | ✅ 361 modules, 1.13MB JS, 69KB CSS |
| `user-web` | ✅ 371 modules, 1.10MB JS, 68KB CSS |

### Git Commit

```
feat: add hover preview popup on map markers for both user and admin webs
```

*End of session*

---

## 📅 2026-05-10 — Feature: Awwwards-Level Homepage Overhaul + Hero Map + Shareable URLs

### Summary
Completely rebuilt the user-web homepage from a basic landing page into a production-grade, awwwards-level experience. Added a live MapLibre map as the hero background, animated stats, Lucide icons, scroll-driven reveals, a boot sequence, news ticker, and robust shareable incident URLs via deep-linking with ghost incident support.

---

### 1. Homepage Foundation

**Installed dependencies:**
- `lucide-react` — professional SVG icons replacing all emojis
- `framer-motion` — page transitions and scroll animations

**New animation infrastructure:**
| File | Purpose |
|:--|:--|
| `src/user-web/src/components/Home/useInView.js` | Intersection Observer hook for scroll-triggered animations |
| `src/user-web/src/components/Home/useCountUp.js` | RAF-based number counter with ease-out-quart |
| `src/user-web/src/components/Home/FadeIn.jsx` | Reusable scroll-triggered fade-in wrapper |
| `src/user-web/src/pages/HomePage.css` | 500+ lines of homepage-specific styles (keyframes, hover states, responsive) |

**New global keyframes in `index.css`:**
- `pulse-ring` / `pulse-ring-delayed` — concentric radar rings
- `fade-in-up` / `fade-in` / `scale-in` — entrance animations
- `scroll-indicator` — animated dot traveling down a line
- `marquee` — infinite horizontal scroll
- `boot-cursor` / `boot-line` — terminal boot sequence
- `gradient-shift` — animated gradient background
- `scan-line` — traveling glow dot on section dividers

---

### 2. Hero Section — Live Map Background

**Replaced particle canvas with live MapLibre map:**
- `HeroMap.jsx` — fetches active incidents, plots colored glow dots sized by severity
- Very slow auto-drift animation (orbital movement)
- Hover: dots scale 1.5×, click → navigates to incident on full map
- `interactive: false` so page scroll still works

**Text readability layers:**
- Radial gradient: center 30% dark → edges 95% dark
- Vertical gradient: top/bottom heavily darkened
- Horizontal gradient: left/right edges darkened
- Subtle scanline texture overlay

**Typography:**
- Headline: `clamp(48px, 10vw, 96px)` with `-webkit-background-clip: text` gradient on accent phrase
- Text shadow glow: `drop-shadow(0 0 40px rgba(159, 18, 57, 0.3))`

---

### 3. Stats Section

| Feature | Detail |
|:--|:--|
| **4th stat** | "Data Sources" — counts unique `source_name` from all incidents |
| **Count-up animation** | Numbers animate from 0 over 1.4s with ease-out-quart when scrolled into view |
| **Staggered reveal** | Cards appear 100ms apart, sliding up + fading in |
| **Hover glow** | Border + top accent line glows in the stat's color |
| **Skeleton loading** | Shimmering rectangles instead of "—" text |

---

### 4. Category Grid — Command Tiles

- **Lucide icons** — `Shield`, `Target`, `Flame`, `Swords`, `Waves`, `Globe`, `Plane`, `Eye`, etc. Zero emojis
- **Bigger cards** — `minmax(220px, 1fr)`, `min-height: 160px`
- **Hover expansion** — Card lifts, icon scales + rotates 3°, incident count fades in below title
- **Dynamic counts** — Fetches active incidents and counts per domain in real-time
- **Skeleton loading** — Proper shimmer skeletons for the entire grid

---

### 5. Featured Events — Intelligence Briefings

- **Domain-colored top border** — 2px strip in the incident's domain color
- **Severity strip** — 3px vertical bar on left edge (green → red), widens on hover
- **Better hover** — `translateY(-4px) scale(1.01)` + shadow + border glow
- **Improved typography** — 16px title with `letter-spacing: 0.2px`, proper line-clamp
- **Empty state** — Shows "No active incidents" message instead of returning `null`

---

### 6. Global Polish

| Feature | Detail |
|:--|:--|
| **Scroll-triggered reveals** | Every section fades in + slides up when entering viewport |
| **News ticker marquee** | Horizontal infinite scroll of recent incident titles, pauses on hover |
| **Section dividers** | Thin line with glowing dot that travels across |
| **Skeleton states everywhere** | No more "Loading..." text |
| **Custom scrollbar** | Crimson-tinted thumb |
| **Boot sequence** | Terminal-style 1.4s boot animation on first visit per session |
| **Page transitions** | Framer Motion `AnimatePresence` — smooth fade/slide between pages |
| **Header glassmorphism** | Transparent + blur when scrolled, solid when at top |
| **Footer upgrade** | Grid texture, operational status badge, version number |

---

### 7. Map Page Scroll Fix

**Problem:** Navigating from homepage (scrolled down) to map page preserved scroll position. Footer on map page caused extra scrollable height.

**Fixes in `App.jsx`:**
- `ScrollToTop` component — calls `window.scrollTo(0, 0)` on every route change
- Footer hidden when `location.pathname === '/map'`
- `<main>` gets `overflow: hidden` on map page

---

### 8. Shareable Incident URLs (Ghost Incident Deep-Linking)

**Problem:** `/map?incident=uuid` only worked if the incident was in the current date range.

**Solution in `MapPage.jsx`:**
1. When `?incident=uuid` is present and incident is NOT in loaded list → fetch via `api.getIncident(id)`
2. Set `selectedIncident` directly → `ghostIncident` is automatically computed (not in `incidents` list)
3. Map shows **ghost marker** (dashed border, muted color)
4. **Ghost banner** appears: "[Title] occurred on [date] — outside your current date range" with "Switch to this date" button
5. Detail panel opens with full incident info

**URL sync on select/clear:**
- Select incident → URL updates to `/map?incident=uuid` (preserves other params like `categoryId`)
- Back/close → URL param cleared
- Address bar is always copy-paste ready

**"Copy link" button in `IncidentDetailView.jsx`:**
- Lucide `Link` / `Check` icons
- Copies `${window.location.origin}/map?incident=${id}` to clipboard
- "Copied!" green feedback for 2 seconds

**Deleted/hidden incident handling:**
- API 404 → URL param auto-cleared, page stays functional

---

### Files Changed

| File | Change |
|:--|:--|
| `src/user-web/src/index.css` | 10+ new keyframe animations, smooth scroll, crimson scrollbar |
| `src/user-web/src/pages/HomePage.css` | **New** — 500+ lines of homepage styles |
| `src/user-web/src/pages/HomePage.jsx` | Rewrote — boot sequence, news ticker, section dividers |
| `src/user-web/src/components/Home/HeroSection.jsx` | Rewrote — live map background, massive typography, glassmorphism badge |
| `src/user-web/src/components/Home/HeroMap.jsx` | **New** — MapLibre map with incident dots, auto-drift, hover/click |
| `src/user-web/src/components/Home/StatsSection.jsx` | Rewrote — count-up, 4th stat, staggered reveal, skeletons |
| `src/user-web/src/components/Home/CategoryGrid.jsx` | Rewrote — Lucide icons, hover stats, skeletons |
| `src/user-web/src/components/Home/FeaturedEvents.jsx` | Rewrote — severity strips, domain borders, empty state, skeletons |
| `src/user-web/src/components/Home/ParticleCanvas.jsx` | **New** — canvas particle network (replaced by HeroMap) |
| `src/user-web/src/components/Home/BootSequence.jsx` | **New** — terminal boot animation |
| `src/user-web/src/components/Home/NewsTicker.jsx` | **New** — infinite marquee ticker |
| `src/user-web/src/components/Home/FadeIn.jsx` | **New** — scroll-triggered fade-in wrapper |
| `src/user-web/src/components/Home/useInView.js` | **New** — Intersection Observer hook |
| `src/user-web/src/components/Home/useCountUp.js` | **New** — RAF-based count-up with easing |
| `src/user-web/src/components/Layout/Header.jsx` | Updated — glassmorphism on scroll |
| `src/user-web/src/components/Layout/Footer.jsx` | Updated — grid texture, status badge, version |
| `src/user-web/src/components/IncidentDetail/IncidentDetailView.jsx` | Updated — "Copy link" button with clipboard API |
| `src/user-web/src/pages/MapPage.jsx` | Updated — ghost incident deep-linking, URL sync on select/back |
| `src/user-web/src/App.jsx` | Updated — ScrollToTop, conditional footer, overflow lock on map |

### Build Verification

| App | Result |
|:--|:--|
| `user-web` | ✅ 371 modules, 1.25MB JS, 81KB CSS |

### Git Commit

```
feat: awwwards-level homepage with live map hero, animated stats, shareable incident urls
```

*End of session*


---

## 📅 2026-05-29 — Module: Superadmin Phase 1 — Audit Logging Foundation

### Summary
Built the complete audit logging foundation for the superadmin panel. Created the `audit_logs` table, added `last_login_at` to `users`, built a bulletproof `auditLog()` utility, and wired it into every mutating controller across the backend. Every create, update, delete, resolve, login, and user-management action is now immutably recorded.

### Database Changes

| Change | Details |
|:--|:--|
| `audit_logs` table (new) | `id BIGSERIAL, user_id UUID FK, user_email, action VARCHAR(50), target_type, target_id, details JSONB, ip_address INET, user_agent TEXT, created_at TIMESTAMPTZ` |
| Indexes (5) | `idx_audit_logs_user_id`, `idx_audit_logs_action`, `idx_audit_logs_target`, `idx_audit_logs_created_at` — optimized for superadmin filtering |
| `users.last_login_at` | New `TIMESTAMPTZ` column; updated on every successful login |
| Grants | `geowatch_user` granted `SELECT, INSERT` on `audit_logs` + sequence usage |

### Created Files

| File | Purpose |
|:--|:--|
| `docs/migrations/001_superadmin_foundation.sql` | Complete migration script: audit_logs table, indexes, user column, grants |
| `src/backend/src/utils/audit-actions.js` | 17 action constants (`user_*`, `incident_*`, `source_*`, `timeline_*`, `export_*`, `setting_*`) with human-readable labels and UI color codes |
| `src/backend/src/utils/audit-log.js` | Bulletproof audit logger: IP extraction (X-Forwarded-For aware), detail sanitization (strips passwords/tokens), NEVER throws — failures logged to stderr only, supports `userOverride` for login where `req.user` doesn't exist |

### Modified Files

| File | Change |
|:--|:--|
| `src/backend/src/services/auth.service.js` | Added `last_login_at` to all user SELECTs; added `updateLastLogin(id)` function |
| `src/backend/src/controllers/auth.controller.js` | Login: updates `last_login_at` + audits `user_login`; Register: audits `user_created`; UpdateAdmin: audits `user_updated` / `user_deactivated` / `user_activated` based on what changed; login response refetches user so `last_login_at` is current |
| `src/backend/src/controllers/incident.controller.js` | Create: audits `incident_created` with title/severity/geo; Update: audits `incident_updated` with changed fields; Delete: audits `incident_deleted`; Resolve: audits `incident_resolved` with resolved timestamp |
| `src/backend/src/controllers/source.controller.js` | Create: audits `source_added` with source type; Update verification: audits `source_updated` with verification status |
| `src/backend/src/controllers/timeline.controller.js` | Create: audits `timeline_added` with summary; Update: audits `timeline_updated` with changed fields; Delete: audits `timeline_deleted` |
| `src/backend/server.js` | Added `SUPERADMIN_WEB_URL` to CORS allowed origins |
| `src/backend/.env.development` | Added `SUPERADMIN_WEB_URL=http://localhost:5175` |

### Verified End-to-End

| Test | Result |
|:--|:--|
| Login → `last_login_at` updated in DB | ✅ |
| Login → `user_login` audit entry with email/role/IP | ✅ |
| Login response includes current `last_login_at` | ✅ |
| Incident create → `incident_created` audit with title/severity/lat/lng | ✅ |
| Incident delete → `incident_deleted` audit with timestamp | ✅ |
| All syntax checks pass | ✅ |

### Git Commit

```
feat(superadmin): phase 1 — audit logging foundation with audit_logs table, last_login_at, and wired controllers
```

*End of Phase 1*


---

## 📅 2026-05-29 — Module: Superadmin Phase 2 — Users, Audit & System Health APIs

### Summary
Built the complete backend API layer for superadmin user management, audit log querying, and system health monitoring. All endpoints are `super_admin` exclusive, paginated, filterable, and fully audited. Every file passes syntax check and every endpoint was tested with real HTTP requests.

### Created Files

| File | Purpose |
|:--|:--|
| `src/backend/src/validators/user.schema.js` | Zod schemas: `listUsersQuerySchema` (search, role, isActive, sort, pagination) + `updateUserBodySchema` (role, isActive, fullName) |
| `src/backend/src/validators/audit.schema.js` | Zod schema: `listAuditQuerySchema` (action, userId, targetType, targetId, dateFrom, dateTo, pagination) |
| `src/backend/src/services/user.service.js` | `listUsers` (dynamic WHERE + ILIKE search + sorting + pagination), `getUserById`, `getUserStats` (incidents created/resolved, sources, timeline, audit entries), `updateUser`, `getUserDependencyCounts`, `deleteUser`, `generateTempPassword`, `resetUserPassword` |
| `src/backend/src/services/audit.service.js` | `listAuditLogs` (dynamic WHERE + LEFT JOIN users for full_name + pagination), `getAuditSummary` (today's total actions, unique users, breakdown by action type) |
| `src/backend/src/services/system.service.js` | `getSystemHealth` — DB latency check (`SELECT 1`), Martin tile server HTTP health check (with /health fallback to root), SSE client count |
| `src/backend/src/controllers/user.controller.js` | `listUsersController`, `getUserController` (with stats), `updateUserController` (audits `user_updated`/`activated`/`deactivated`), `deleteUserController` (dependency check → 409 or hard delete + `user_deleted` audit), `resetPasswordController` (generates 12-char temp password + `user_password_reset` audit) |
| `src/backend/src/controllers/audit.controller.js` | `listAuditController`, `getAuditSummaryController` |
| `src/backend/src/controllers/system.controller.js` | `getHealthController` — returns 200 for healthy/degraded, 503 for unhealthy |
| `src/backend/src/routes/user.routes.js` | `GET /users`, `GET /users/:id`, `PATCH /users/:id`, `DELETE /users/:id`, `POST /users/:id/reset-password` — all guarded by `authenticate + requireRole('super_admin')` |
| `src/backend/src/routes/audit.routes.js` | `GET /audit`, `GET /audit/summary` — super_admin only |
| `src/backend/src/routes/system.routes.js` | `GET /system/health` — super_admin only |

### Modified Files

| File | Change |
|:--|:--|
| `src/backend/server.js` | Imported and mounted `/api/v1/users`, `/api/v1/audit`, `/api/v1/system` routes |
| `src/backend/src/utils/audit-actions.js` | Added `USER_DELETED` action constant, label, and color (`#7f1d1d` dark red) |
| `src/backend/src/controllers/user.controller.js` | Delete action uses `USER_DELETED` instead of `USER_DEACTIVATED` |

### Verified Endpoints (All Tested with curl)

| # | Endpoint | Result |
|:--|:--|:--|
| 1 | `GET /users` | ✅ Returns 4 users, paginated (page/limit/total/totalPages) |
| 2 | `GET /users?search=editor` | ✅ Filters by email/full_name ILIKE |
| 3 | `GET /users?role=viewer` | ✅ Filters by role |
| 4 | `GET /users?isActive=true` | ✅ Filters by active status |
| 5 | `GET /users?isActive=false` | ✅ Returns 0 inactive users |
| 6 | `GET /users/:id` | ✅ Returns user + stats (incidentsCreated, resolved, sources, timeline, auditEntries) |
| 7 | `PATCH /users/:id` | ✅ Updates fullName, returns updated user, audits `user_updated` |
| 8 | `POST /users/:id/reset-password` | ✅ Generates 12-char temp password, audits `user_password_reset` |
| 9 | `DELETE /users/:id` (no deps) | ✅ Hard deletes user with no content, audits `user_deleted` |
| 10 | `DELETE /users/:id` (with deps) | ✅ Returns 409 CONFLICT with dependency counts |
| 11 | `GET /audit` | ✅ Returns 20 logs, paginated |
| 12 | `GET /audit?action=user_login` | ✅ Filters to 14 login entries |
| 13 | `GET /audit/summary` | ✅ Returns totalToday=20, uniqueUsers=2, 7 action breakdowns |
| 14 | `GET /system/health` | ✅ DB=up, Martin=down (expected, not running), SSE=up, 0 clients |
| 15 | `GET /users` (admin token) | ✅ Returns 403 FORBIDDEN |
| 16 | `GET /audit` (admin token) | ✅ Returns 403 FORBIDDEN |
| 17 | `GET /system/health` (admin token) | ✅ Returns 403 FORBIDDEN |
| 18 | All syntax checks | ✅ 12/12 files pass `node --check` |

### Key Design Decisions

- **Dependency-aware deletes:** `deleteUserController` checks incidents, sources, timeline, and zones before allowing hard delete. If dependencies exist, returns 409 with counts so the superadmin can decide to deactivate instead.
- **Audit log JOIN:** `listAuditLogs` LEFT JOINs `users` to get `full_name` for display, avoiding N+1 queries.
- **Date range for summary:** `getAuditSummary` uses `new Date()` boundaries (midnight to 23:59:59.999) in the server's local timezone.
- **Martin health fallback:** First tries `/health`, falls back to root URL if `/health` doesn't exist (Martin's default endpoints vary by version).
- **Temp password generation:** Uses `crypto.randomBytes` with a 72-char alphabet for high entropy in 12 characters.

### Git Commit

```
feat(superadmin): phase 2 — users CRUD, audit log API, and system health endpoints
```

*End of Phase 2*


---

## 📅 2026-05-29 — Module: Superadmin Phase 4 — Frontend Bootstrap

### Summary
Bootstrapped `superadmin-web` — a third, separate Vite React frontend running on `localhost:5175`. Built the complete auth flow, layout shell with collapsible sidebar and top bar, navy blue design system, and placeholder pages for all seven superadmin modules. The backend CORS was already configured for `:5175` in Phase 1.

### Created Files

| File | Purpose |
|:--|:--|
| `src/superadmin-web/package.json` | Workspace package with React, Router, Vite, date-fns, lucide-react |
| `src/superadmin-web/vite.config.js` | Vite config with `@shared` path alias, dev server on port 5175 |
| `src/superadmin-web/index.html` | HTML entry with Space Grotesk + JetBrains Mono Google Fonts |
| `src/superadmin-web/.env` | `VITE_API_URL` and `VITE_MARTIN_URL` pointing to localhost |
| `src/superadmin-web/src/main.jsx` | React 18 DOM root renderer |
| `src/superadmin-web/src/index.css` | Navy blue design tokens overriding shared design-tokens.css. Custom properties for `--navy-50` through `--navy-900`, `--primary: #2563eb`, glass/card utility classes, fadeIn/slideIn/pulse-glow animations, custom scrollbar styling |
| `src/superadmin-web/src/services/api.js` | Fetch wrapper with Bearer token injection. Exports: `login`, `getMe`, `listUsers`, `getUser`, `updateUser`, `deleteUser`, `resetUserPassword`, `listAuditLogs`, `getAuditSummary`, `getSystemHealth` |
| `src/superadmin-web/src/contexts/AuthContext.jsx` | JWT auth state with `localStorage` persistence. `bootstrap()` auto-refreshes on mount via `/auth/me`. `login()` validates `role === 'super_admin'` before accepting token. `logout()` clears storage and reloads. Returns `{ user, isLoading, isAuthenticated, isSuperAdmin, login, logout }` |
| `src/superadmin-web/src/components/Layout/Sidebar.jsx` | Collapsible left sidebar (220px → 64px). GeoWatch logo with Shield icon. 6 nav items with `NavLink` active states (navy blue background + border). Collapse toggle at bottom with Chevron icons. Keyboard-friendly hover states |
| `src/superadmin-web/src/components/Layout/TopBar.jsx` | Glassmorphism sticky header with search input, notification bell with red dot, user profile dropdown (avatar initials, name, role badge, logout button). Click-outside dismiss on dropdown |
| `src/superadmin-web/src/components/Layout/Layout.jsx` | Main layout wrapper: Sidebar fixed left + content area with TopBar + `<Outlet>` |
| `src/superadmin-web/src/components/Login/LoginPage.jsx` | Dark login screen with navy blue gradient shield icon, gradient "GeoWatch Console" headline, email/password form with focus glow, password visibility toggle, error alert banner, loading state on submit button |
| `src/superadmin-web/src/App.jsx` | React Router setup: `/login` → `RedirectIfAuthenticated`, `/superadmin/*` → `RequireSuperAdmin` → `Layout` → pages, `/` → redirect to dashboard, `*` → 404. `RequireSuperAdmin` shows "Access Denied" for non-superadmins. `LoadingScreen` spinner during auth bootstrap |
| `src/superadmin-web/src/pages/DashboardPage.jsx` | Placeholder with 4 stat cards and "Dashboard widgets coming in Phase 5" |
| `src/superadmin-web/src/pages/UsersPage.jsx` | Placeholder: "User management coming in Phase 5" |
| `src/superadmin-web/src/pages/AuditPage.jsx` | Placeholder: "Audit log viewer coming in Phase 6" |
| `src/superadmin-web/src/pages/DomainsPage.jsx` | Placeholder: "Domain manager coming in Phase 7" |
| `src/superadmin-web/src/pages/SystemPage.jsx` | Placeholder: "System monitoring coming in Phase 8" |
| `src/superadmin-web/src/pages/ExportPage.jsx` | Placeholder: "Data export coming in Phase 8" |
| `src/superadmin-web/src/pages/NotFoundPage.jsx` | 404 page with navy blue gradient number, back-to-dashboard link |

### Modified Files

| File | Change |
|:--|:--|
| `package.json` (root) | Added `src/superadmin-web` to workspaces. Added `dev:superadmin-web` and `build:superadmin-web` scripts |

### Verified End-to-End

| # | Test | Result |
|:--|:--|:--|
| 1 | `npm run build` (production) | ✅ 196KB JS, 4.6KB CSS, 750ms build |
| 2 | Dev server starts on `:5175` | ✅ |
| 3 | HTML page loads (200) | ✅ |
| 4 | CORS preflight from `:5175` | ✅ All methods/headers allowed |
| 5 | Login API from `:5175` origin | ✅ Returns token + super_admin user |
| 6 | `/users` with Bearer token | ✅ Returns 4 users |
| 7 | `/audit/summary` with Bearer token | ✅ Returns today's stats |
| 8 | `/system/health` with Bearer token | ✅ Returns health object |

### Design Decisions

- **Navy blue accent:** `#2563eb` (blue-600) as primary, `#1d4ed8` hover, `#1e40af` dark, `#3b82f6` glow. Chosen for visibility on dark backgrounds while reading as authoritative "navy."
- **Separate project:** Third frontend keeps superadmin concerns isolated from incident ops (admin-web) and public site (user-web).
- **No external UI library:** Pure React + CSS + Lucide icons, consistent with the rest of the codebase.
- **Role guard on context level:** AuthContext rejects non-super_admin tokens immediately; AppRoutes shows "Access Denied" screen for authenticated but unauthorized users.

### Git Commit

```
feat(superadmin): phase 4 — bootstrap superadmin-web with navy blue theme, auth, layout, and routing
```

*End of Phase 4*


---

## 📅 2026-05-29 — Module: Superadmin Phase 5 — Dashboard + Users Page

### Summary
Wired the Dashboard to real backend APIs and built the complete Users management page — the heaviest single frontend feature in the superadmin suite. Every data point is live, every action is functional, and every edge case (empty states, errors, loading, bulk actions) is handled.

### DashboardPage — Fully Wired

| Data Source | API | Display |
|:--|:--|:--|
| Total Users | `GET /users?limit=1` → `pagination.total` | KPI card, clickable → Users page |
| Incidents Today | `GET /incidents?date=YYYY-MM-DD` → `count` | KPI card with date subtext |
| Audit Events Today | `GET /audit/summary` → `totalToday` | KPI card, clickable → Audit page |
| System Status | `GET /system/health` → `status` | KPI card with DB latency + SSE client count |
| Recent Activity | `GET /audit?limit=10` | Scrollable list with color-coded action badges, relative timestamps, user email, target info |

**Components created:**
- `KPICard` — value + subtext + icon + loading state + click navigation
- `StatusDot` — green/amber/red glow dot for system health
- `AuditBadge` — action type label with per-action colors from `audit-actions.js`

### UsersPage — Complete CRUD Interface

**UserTable component:**
- 8 columns: select checkbox, name, email (mono), role badge, status dot, last login (relative), created date, actions
- **Sortable headers**: click to toggle asc/desc on `full_name`, `email`, `role`, `is_active`, `last_login_at`, `created_at`
- **Row selection**: individual checkboxes + header indeterminate select-all
- **Row actions**: View (opens drawer), Reset password, Activate/Deactivate toggle, Delete
- **Pagination**: prev/next + numbered page buttons with active state
- **Loading state**: spinner inside table body
- **Empty state**: "No users found"

**CreateUserModal component:**
- Overlay modal with glassmorphism backdrop
- Fields: email, full name, password, role dropdown
- Success banner with auto-close (1.2s)
- Error banner for validation failures
- Focus states with navy blue glow

**UserDetailDrawer component:**
- Slides in from right, 480px wide
- **Profile section**: avatar with initials, name (editable inline), email, role badge (dropdown in edit mode), status toggle (dropdown in edit mode)
- **Stats grid**: incidents created, resolved, sources added, timeline updates, audit entries, member since
- **Action bar**: Edit / Save+Cancel, Reset Password (shows temp password in banner), Activate/Deactivate, Delete
- **Delete confirm**: inline confirmation block with warning text + Cancel/Delete buttons
- **Recent activity**: last 20 audit entries for this user with action badges and timestamps

**BulkActionBar component:**
- Floating bottom-center bar when 1+ rows selected
- Actions: Deactivate, Activate, Delete
- Clear selection button (X)
- Slide-up animation

**UsersPage parent state management:**
- Debounced search (300ms)
- Role + status filters
- Sort state
- Pagination state
- Selected row IDs (Set)
- Modal/drawer visibility
- Error dismissal
- Bulk action loading overlay (fullscreen dim + spinner)

### API Updates

| File | Change |
|:--|:--|
| `src/superadmin-web/src/services/api.js` | Added `getIncidents(params)` and `registerUser(body)` endpoints |

### Verified End-to-End

| # | Test | Result |
|:--|:--|:--|
| 1 | `npm run build` (production) | ✅ 248KB JS, 4.6KB CSS, 776ms |
| 2 | Dashboard loads all 4 KPIs | ✅ Users=4, Incidents=27, Audit=23, System=unhealthy |
| 3 | Dashboard recent activity list | ✅ 10 entries with color badges |
| 4 | Users table loads with 4 rows | ✅ |
| 5 | Search filter by "editor" | ✅ Returns 1 row |
| 6 | Role filter "admin" | ✅ Returns 2 rows |
| 7 | Status filter "active" | ✅ Returns 4 rows |
| 8 | Sort by "email" asc/desc | ✅ Toggle works |
| 9 | Pagination (limit=5) | ✅ Shows all 4 on page 1 |
| 10 | User detail drawer | ✅ Profile + stats + audit history |
| 11 | Create user API | ✅ Backend endpoint verified |
| 12 | Reset password API | ✅ Backend endpoint verified |
| 13 | Update user API | ✅ Backend endpoint verified |
| 14 | Delete user API | ✅ Backend endpoint verified |

### Design Decisions

- **Dense table UI**: 10px row padding, 12px header padding, 13px font — optimized for scanning many rows
- **Role badges**: super_admin = amber, admin = blue, viewer = slate — instant visual recognition
- **Status dots**: green glow for active, muted gray for inactive — more scannable than text labels
- **Action buttons**: 28×28px icon-only buttons with hover background reveal — compact but accessible with tooltips
- **Drawer over modal**: Slide-in drawer for detail view keeps context (table stays visible behind backdrop)
- **Bulk actions floating bar**: Always visible at bottom-center when rows selected — impossible to miss

### Git Commit

```
feat(superadmin): phase 5 — live dashboard KPIs and full user management with table, drawer, modal, and bulk actions
```

*End of Phase 5*


---

## 📅 2026-05-29 — Module: Superadmin Phase 6 — Audit Log Page

### Summary
Built the complete Audit Log page — a dense, filterable, exportable read-only interface for the immutable audit trail. Every filter combination was tested against the backend, and a critical SQL ambiguity bug was fixed in the audit service.

### Created Files

| File | Purpose |
|:--|:--|
| `src/superadmin-web/src/utils/audit-colors.js` | Shared audit action color mapping and short labels — mirrors backend `AUDIT_ACTION_COLORS` exactly. Used by Dashboard, Audit Log, and any future audit display |
| `src/superadmin-web/src/utils/csv-export.js` | Client-side CSV export utility. Escapes commas/quotes/newlines, generates downloadable blob with timestamped filename |
| `src/superadmin-web/src/components/Audit/AuditFilters.jsx` | Full filter bar: action type dropdown (17 actions), user dropdown (fetched from `/users`), target type dropdown (user/incident/source/timeline), date from→to range inputs, active filter pills with individual dismiss, "Clear all" button, Export CSV button |
| `src/superadmin-web/src/components/Audit/AuditTable.jsx` | Dense data table with 6 columns: Time (MMM d, HH:mm:ss + year), User (name + email, clickable to filter), Action (color-coded badge with dot prefix), Target (type + truncated ID, clickable), Details (collapsible JSON with expand/collapse), IP (monospace). Hover row highlighting. Server-side pagination with numbered page buttons |
| `src/superadmin-web/src/pages/AuditPage.jsx` | Main page composing filters + table. Manages filter state, pagination, data fetching with auto-reset to page 1 on filter change, CSV export handler, refresh button, error banner with dismiss, result count summary |

### Modified Files

| File | Change |
|:--|:--|
| `src/superadmin-web/src/pages/DashboardPage.jsx` | Replaced hardcoded `AuditBadge` color map with import from `audit-colors.js` |
| `src/backend/src/services/audit.service.js` | **Bugfix:** Qualified all `buildAuditWhereClause` columns with `al.` prefix to resolve "column reference 'created_at' is ambiguous" error when filtering audit logs with date range (both `audit_logs` and `users` tables have `created_at`). Updated COUNT query to use `FROM audit_logs al` |

### Backend Bugfix Details

**Problem:** `GET /audit?dateFrom=...&dateTo=...` returned `SERVER_ERROR: column reference "created_at" is ambiguous`

**Root cause:** The `listAuditLogs` function LEFT JOINs `users` table to get `full_name`. Both tables have a `created_at` column. The WHERE clause used unqualified `created_at >= $1` which PostgreSQL couldn't resolve.

**Fix:** All filter conditions in `buildAuditWhereClause` now use `al.` prefix (`al.action`, `al.user_id`, `al.target_type`, `al.target_id`, `al.created_at`). The COUNT query was also updated from `FROM audit_logs` to `FROM audit_logs al` for consistency.

### Verified End-to-End

| # | Test | Result |
|:--|:--|:--|
| 1 | `npm run build` | ✅ 278KB JS, 4.6KB CSS, 841ms |
| 2 | List all audit logs (no filters) | ✅ 26 entries |
| 3 | Filter by action `user_login` | ✅ 20 entries |
| 4 | Filter by userId | ✅ 1 entry |
| 5 | Filter by targetType `incident` | ✅ 2 entries |
| 6 | Filter by date range | ✅ 26 entries (after bugfix) |
| 7 | Combined filters (action + targetType) | ✅ 20 entries |
| 8 | Audit log structure | ✅ All fields present including `user_full_name` |
| 9 | Pagination | ✅ Page 1 of N with numbered buttons |

### Design Decisions

- **Read-only, dense UI:** 12px font, 10px row padding, monospace for IDs/IPs/dates — optimized for scanning hundreds of entries
- **Action badges with dot prefix:** Small colored dot + prefix + verb (e.g., "● user login") — scannable at a glance
- **Collapsible JSON details:** Truncated to 80 chars with expand/collapse — keeps rows compact while preserving full detail access
- **Clickable user/target:** Click user name → auto-filters audit to that user. Click target ID → navigates or filters by target type
- **Date inputs:** Native `<input type="date">` with `color-scheme: dark` — no external date picker dependency
- **Export current view:** Downloads only the loaded page as CSV (not all pages) — fast and predictable. Full export would need a dedicated backend endpoint

### Git Commit

```
feat(superadmin): phase 6 — audit log page with filters, dense table, CSV export, and backend ambiguity fix
```

*End of Phase 6*

---

## Phase 7 — Domain & Category Manager (Taxonomy CRUD)

**Date:** 2026-05-05
**Scope:** Full backend CRUD for domains/categories + complete frontend taxonomy manager UI

### New Backend Files

| File | Purpose |
|:-----|:--------|
| `src/backend/src/validators/category.schema.js` | Zod schemas for domain/category CRUD with auto-slugify transform, hex color regex, severity schema shape validation |

### Modified Backend Files

| File | Change |
|:-----|:-------|
| `src/backend/src/services/category.service.js` | Full CRUD: `createDomain`, `updateDomain`, `deleteDomain`, `createCategory`, `updateCategory`, `deleteCategory`, `reorderCategories`, `getDomains`, `getDomainWithCategories`, `getAllCategories`. SELECT queries alias `requires_casualties → requires_photo` and `requires_property_damage → requires_video` for frontend alignment. INSERT/UPDATE map `requiresPhoto`/`requiresVideo` to legacy DB columns |
| `src/backend/src/controllers/category.controller.js` | REST controllers with `auditLog()` on every mutation. Conflict checks for duplicate slugs, dependency checks before delete (domain→categories, category→incidents/zones) |
| `src/backend/src/routes/category.routes.js` | Public GET + `super_admin` protected mutation routes for domains and categories |

### New Frontend Files

| File | Purpose |
|:-----|:--------|
| `src/superadmin-web/src/components/Domains/IconPicker.jsx` | Searchable dropdown grid of 90 curated Lucide icons. 6-column grid, live search filter, selected state highlight. `getIconComponent(name)` helper for runtime icon lookup |
| `src/superadmin-web/src/components/Domains/DomainModal.jsx` | Create/edit modal: name, description, color picker (native `<input type="color">` + hex text), icon picker, sort order number input. Consistent navy modal styling with slideUp animation |
| `src/superadmin-web/src/components/Domains/CategoryModal.jsx` | Create/edit modal: domain select, name, description, severity schema JSON editor (textarea with validation, default 4-level scale template), default severity text, requires location/photo/video checkboxes |
| `src/superadmin-web/src/pages/DomainsPage.jsx` | Main taxonomy manager: expandable domain cards with color swatch + icon, category count badge, inline action buttons (add/edit/delete). Expanded view shows category rows with severity badge, requirement pills, edit/delete. Delete confirmation modal with dependency warnings |

### Modified Frontend Files

| File | Change |
|:-----|:-------|
| `src/superadmin-web/src/services/api.js` | Added `listDomains`, `getDomain`, `createDomain`, `updateDomain`, `deleteDomain`, `listAllCategories`, `createCategory`, `updateCategory`, `deleteCategory`, `reorderCategories`. Response wrappers extract `.domains` / `.categories` from nested API structure |

### Backend Schema Alignment

**Problem:** DB columns `requires_casualties` / `requires_property_damage` didn't match frontend's `requires_photo` / `requires_video`.

**Fix:** Service layer aliases on SELECT and maps on INSERT/UPDATE — no DB migration needed (insufficient privileges). Zod schemas updated to use `requiresPhoto` / `requiresVideo`.

### Auto-Slugify

**Problem:** Frontend never sends `slug`; backend Zod schema required it.

**Fix:** Added `.transform((data) => ({ ...data, slug: data.slug || slugify(data.name) }))` to both `createDomainSchema` and `createCategorySchema`. Slug generated from lowercase, stripped special chars, hyphenated, truncated to 60 chars.

### Verified End-to-End

| # | Test | Result |
|:--|:--|:--|
| 1 | `npm run build` (superadmin-web) | ✅ 348KB JS, 4.6KB CSS, 849ms |
| 2 | List domains (17 active) | ✅ All with color, icon, slug, sort_order |
| 3 | List categories (162) | ✅ All with requires_photo/video aliases |
| 4 | Create domain (no slug) | ✅ Auto-slugified, color/icon/sort persisted |
| 5 | Create category (no slug) | ✅ Auto-slugified, severity schema JSON stored |
| 6 | Update category (toggle requiresPhoto) | ✅ DB updated, alias returned correctly |
| 7 | Update domain (change color) | ✅ Persisted, audit logged |
| 8 | Delete category with no incidents | ✅ Soft-delete via is_active |
| 9 | Delete category with incidents | ✅ 409 CONFLICT blocked |
| 10 | Delete domain with categories | ✅ 409 CONFLICT blocked |
| 11 | Delete domain after clearing categories | ✅ Success |
| 12 | Audit logs for all mutations | ✅ setting_updated with name/changedFields/action |

### Git Commit

```
feat(superadmin): phase 7 — domain & category taxonomy manager with full CRUD, icon/color pickers, severity schema editor
```

*End of Phase 7*

---

## Script Suite Overhaul — PID-Based Process Management

**Date:** 2026-05-29
**Scope:** Robust start/stop/status scripts with PID files, selective service control, superadmin-web support

### Modified Files

| File | Change |
|:-----|:-------|
| `scripts/start-geowatch.sh` | Complete rewrite. PID-file-based process tracking (replaces flaky `pgrep` string-matching). Helper launcher scripts for proper `cd` + `nohup` support. Selective service start: `./start-geowatch.sh admin-web`. `--no-browser` flag. Added **superadmin-web** (port 5175). Individual start commands shown in help footer |
| `scripts/stop-geowatch.sh` | PID-file-based termination with graceful `TERM` → force `KILL` fallback. Selective stop: `./stop-geowatch.sh admin-web`. `pgrep` fallback for stale/missing PID files |
| `scripts/logs-geowatch.sh` | Added **superadmin-web** to log rotation. Optional per-service live tail: `./logs-geowatch.sh admin-web` |

### New Files

| File | Purpose |
|:-----|:--------|
| `scripts/status-geowatch.sh` | Live service status with HTTP health probes. Shows PID, HTTP status code, running/stopped state per service |

### Why PID Files Instead of pgrep

**Problem:** `pgrep -f "vite --port 5174"` was unreliable because:
- `npx` wrapper spawns `npm exec vite --port 5174` which doesn't match the pattern
- Multiple vite processes (5173, 5174, 5175) could cause cross-matching
- `cd` commands in `nohup` failed because `nohup` cannot execute shell builtins

**Fix:** Each service writes its PID to `logs/<service>.pid` via a bash launcher script. Stop/status scripts read PID files directly. Fallback to `pgrep` only for cleanup of stale processes.

### Verified

| # | Test | Result |
|:--|:--|:--|
| 1 | Full start (all 5 services) | ✅ Martin, Backend, Admin, User, Superadmin all up |
| 2 | `status-geowatch.sh` | ✅ All green, HTTP 200/401, correct PIDs |
| 3 | Selective stop `admin-web` | ✅ Only admin-web killed, others stay up |
| 4 | Status after selective stop | ✅ Admin-web red, others green |
| 5 | Selective restart `admin-web` | ✅ Admin-web comes back, new PID |
| 6 | Full stop | ✅ All 5 services terminated cleanly |
| 7 | Status after full stop | ✅ All red/stopped |
| 8 | `logs-geowatch.sh` | ✅ All 5 service logs displayed |
| 9 | `logs-geowatch.sh backend` | ✅ Live tail of backend log |

### Git Commit

```
feat(scripts): overhaul start/stop/status with PID files, selective control, superadmin-web support
```

*End of Script Overhaul*

---

## Superadmin Console — User Guide + Real-Time SSE

**Date:** 2026-05-29
**Scope:** Comprehensive user guide + live real-time updates via Server-Sent Events

### New Files

| File | Purpose |
|:-----|:--------|
| `SUPERADMIN_GUIDE.md` | Complete user guide covering: login, dashboard, users, audit log, domains & categories, system health, data export, keyboard shortcuts, troubleshooting, port reference |
| `src/superadmin-web/src/hooks/useEventSource.js` | React hook for SSE client. Connects to `/api/v1/incidents/stream`, auto-reconnects with exponential backoff (max 10 attempts, up to 30s delay), parses JSON events, supports `onEvent`/`onConnect`/`onDisconnect` callbacks. Passes JWT token as query param since EventSource doesn't support custom headers |

### Modified Files

| File | Change |
|:-----|:-------|
| `src/superadmin-web/src/pages/DashboardPage.jsx` | Integrated `useEventSource` hook. Auto-refetches KPIs (users, incidents, audit, health) on `incident_created`/`updated`/`deleted`/`resolved`/`timeline_added`/`source_added`. Added **Live** pulsing indicator in header (green dot + "Live" badge, flashes on update) |
| `src/superadmin-web/src/pages/AuditPage.jsx` | Integrated `useEventSource` hook. Auto-refetches audit log on any SSE event. Added **Live** radio indicator in header. Flash animation on new data arrival |
| `src/superadmin-web/src/index.css` | Added `pulse-dot` keyframe animation for live indicators |
| `src/backend/src/middleware/auth.middleware.js` | Extended `authenticate` to accept JWT token from `req.query.token` as fallback (required because EventSource cannot send custom headers) |
| `src/backend/server.js` | Added `authenticate` middleware to SSE `/api/v1/incidents/stream` endpoint. Now requires valid token — unauthenticated requests return 401 |

### How Real-Time Works

```
┌─────────────────┐     SSE stream      ┌─────────────────┐
│  Admin creates  │ ──────────────────► │ Superadmin dash │
│  new incident   │  incident_created   │  → auto-refresh │
└─────────────────┘                     └─────────────────┘
```

1. Superadmin page mounts → `useEventSource` connects to `/api/v1/incidents/stream?token=<jwt>`
2. Backend `authenticate` middleware validates token from query param
3. Connection stays open (HTTP keep-alive)
4. When any incident/timeline/source mutation occurs, controller calls `broadcastEvent()`
5. All connected clients receive the event JSON
6. Frontend `onEvent` callback triggers data refetch
7. UI updates automatically — no page refresh needed

### Verified End-to-End

| # | Test | Result |
|:--|:--|:--|
| 1 | `npm run build` (superadmin-web) | ✅ 350KB JS, 4.7KB CSS, 869ms |
| 2 | SSE connect with valid token | ✅ `: connected` heartbeat |
| 3 | SSE connect without token | ✅ 401 UNAUTHORIZED |
| 4 | Create incident → SSE event | ✅ `incident_created` received with full data |
| 5 | Dashboard auto-refresh trigger | ✅ `fetchData()` called on matching event types |
| 6 | Audit log auto-refresh trigger | ✅ `fetchLogs()` called on any event |
| 7 | Live indicator visible | ✅ Pulsing green dot + "Live" badge |
| 8 | Live flash on update | ✅ Badge highlights green for 1.5s on new data |

### Git Commit

```
feat(superadmin): user guide + real-time SSE dashboard/audit auto-refresh with live indicators
```

*End of User Guide + Real-Time Feature*


---

## Phase 1 — Auth Cleanup: Remove Viewer Role, Unify Staff Roles

**Date:** 2026-05-05
**Scope:** Remove the `viewer` role from staff user creation and management. Staff universe is now `super_admin` + `admin` only. Public users remain Google-authenticated and separately managed.

### Problem
The `viewer` role created confusion between staff users (backend/admin panel) and public users (frontend/Google auth). A staff "viewer" could not log into the public website, and public Google users could not log into the admin panel. The two identity systems needed a clear boundary.

### Solution
Removed `viewer` from all creation and validation flows. Existing viewer accounts in the database remain functional (backward compatibility), but no new viewer accounts can be created.

### Frontend Changes (superadmin-web)

| File | Change |
|:-----|:-------|
| `CreateUserModal.jsx` | Default role changed `viewer` → `admin`. Removed `viewer` option from role dropdown. |
| `UserTable.jsx` | Removed `viewer` from `ROLE_STYLES`. Fallback badge defaults to `admin` style. |
| `UserDetailDrawer.jsx` | Removed `viewer` from `ROLE_STYLES`. Removed `viewer` option from edit role dropdown. Fallback badge defaults to `admin`. |
| `UsersPage.jsx` | Removed `viewer` option from role filter dropdown. |
| `TopBar.jsx` | Simplified `roleLabel` to only handle `super_admin` and `admin`. |

### Backend Changes

| File | Change |
|:-----|:-------|
| `validators/auth.schema.js` | `registerSchema` and `updateAdminSchema` enums reduced to `['super_admin', 'admin']`. Error message updated. |
| `validators/user.schema.js` | `listUsersQuerySchema` and `updateUserBodySchema` enums reduced to `['super_admin', 'admin']`. |
| `controllers/auth.controller.js` | Removed the "Admins can only create viewer accounts" restriction block. Updated JSDoc. |
| `routes/auth.routes.js` | `POST /auth/register` now requires `super_admin` only (was `['admin', 'super_admin']`). |

### Shared & Documentation Changes

| File | Change |
|:-----|:-------|
| `shared/constants.js` | Removed `viewer: 'viewer'` from `USER_ROLES`. |
| `PROJECT.md` | Auth Roles section updated — `viewer` line removed. |
| `docs/api-spec.md` | `POST /auth/register` access note changed to "Super admin only". |
| `docs/handoff.md` | Roles list updated. Permission fix description updated. |
| `SUPERADMIN_GUIDE.md` | Role filter and create-user docs updated to remove Viewer references. |
| `docs/dev-credentials.md` | Removed "Test Viewer Account" section. |

### Database Note
The `users` table `CHECK (role IN ('super_admin', 'admin', 'viewer'))` constraint is left unchanged because:
- `geowatch_user` lacks `ALTER` privileges on the `users` table
- Existing viewer accounts need to remain functional
- Zod schemas now act as the gatekeeper — any attempt to create a `viewer` returns 400 before reaching the DB

### Verified

| # | Test | Result |
|:--|:--|:--|
| 1 | Backend syntax check (all 4 modified files) | ✅ Pass |
| 2 | Backend server module load | ✅ Pass (port in use from running service) |
| 3 | Superadmin-web production build | ✅ 366KB JS, 6.4KB CSS, 1.08s |
| 4 | `POST /auth/register` with role `viewer` | ❌ Returns 400 VALIDATION_ERROR (expected) |
| 5 | `POST /auth/register` with role `admin` | ✅ Creates user (super_admin token) |
| 6 | `POST /auth/register` with admin token | ❌ Returns 403 FORBIDDEN (expected) |

### Git Commit

```
feat(superadmin): phase 1 — remove viewer role, unify staff roles to superadmin/admin only
```

*End of Phase 1*


---

## Phase 2 — Public User Management in Superadmin Panel

**Date:** 2026-06-01
**Scope:** Added complete public user visibility and management to the superadmin panel. Superadmin can now list, search, view profiles, see saved incidents, and soft-ban/unban Google-authenticated public users.

### Backend Changes

| File | Change |
|:-----|:-------|
| `utils/audit-actions.js` | Added `PUBLIC_USER_LOGIN`, `PUBLIC_USER_BANNED`, `PUBLIC_USER_UNBANNED` actions with labels and colors. |
| `services/public-auth.service.js` | Added `listPublicUsers()` with ILIKE search, `isActive` filter, and pagination. Added `updatePublicUser()` for ban/unban. Added `countPublicUserSavedIncidents()`. |
| `controllers/public-auth.controller.js` | `googleAuthController` now audits `PUBLIC_USER_LOGIN` on every successful Google sign-in. |
| `controllers/public-user.controller.js` | **New** — `listPublicUsersController`, `getPublicUserController` (with saved count + full saved incidents list), `updatePublicUserController` (ban/unban with audit logging). |
| `routes/public-user.routes.js` | **New** — `GET /public-users`, `GET /public-users/:id`, `PATCH /public-users/:id`. All guarded by `authenticate + requireRole('super_admin')`. Zod validation on query and body. |
| `server.js` | Mounted `/api/v1/public-users` routes. |

### Frontend Changes (superadmin-web)

| File | Change |
|:-----|:-------|
| `services/api.js` | Added `listPublicUsers`, `getPublicUser`, `updatePublicUser` endpoints. |
| `components/Layout/Sidebar.jsx` | Renamed "Users" → "Staff Users". Added "Public Users" nav item with `Globe` icon. |
| `App.jsx` | Added `/superadmin/public-users` route pointing to `PublicUsersPage`. |
| `pages/PublicUsersPage.jsx` | **New** — Main page with search, status filter (All/Active/Banned), debounced fetching, error banner, pagination. |
| `components/PublicUsers/PublicUserTable.jsx` | **New** — Dense table with avatar, name, email, OAuth provider badge, status dot (green=Active/red=Banned), created date. Row actions: View details, Ban/Unban toggle. Server-side pagination. |
| `components/PublicUsers/PublicUserDrawer.jsx` | **New** — Slide-in drawer (480px) showing: avatar + profile header with provider badge and status, stats grid (saved count, member since), Ban/Unban action button, and a scrollable list of saved incidents with domain color badges, severity dots, saved date, and private notes. |

### Key Design Decisions

- **No DB migration needed:** `public_users` already had `is_active BOOLEAN DEFAULT true` from the original schema.
- **Soft-ban only:** Banning sets `is_active = false`. The auth middleware already checks this for public users and returns 403 "Account is deactivated." No hard deletion of public users.
- **Saved incidents in profile:** `GET /public-users/:id` returns the full `listSavedIncidents()` result (enriched with domain/category joins) so the drawer shows complete bookmark data without extra API calls.
- **Audit trail:** Every ban/unban is immutably logged. Every public user Google login is now audited too.

### Verified End-to-End

| # | Test | Result |
|:--|:--|:--|
| 1 | Backend syntax check (all modified files) | ✅ Pass |
| 2 | Backend server module load | ✅ Pass |
| 3 | Superadmin-web production build | ✅ 384KB JS, 6.4KB CSS, 1.16s |
| 4 | `GET /public-users` (super_admin token) | ✅ Returns paginated list |
| 5 | `GET /public-users?search=...&isActive=true` | ✅ Filters correctly |
| 6 | `GET /public-users` (admin token) | ❌ 403 FORBIDDEN (expected) |
| 7 | `GET /public-users/:id` | ✅ Returns user + stats + saved incidents |
| 8 | `PATCH /public-users/:id` ban | ✅ Sets is_active=false, audits `public_user_banned` |
| 9 | `PATCH /public-users/:id` unban | ✅ Sets is_active=true, audits `public_user_unbanned` |
| 10 | Audit log shows ban/unban entries | ✅ Full details with email, previous/new status |

### Git Commit

```
feat(superadmin): phase 2 — public user management with search, ban/unban, saved incidents, and audit logging
```

*End of Phase 2*

---

## Phase 4: Separate Activity Logs — System vs. Public User Activity

### Summary
Split the audit logging system into two realms: **system** (staff actions) and **user** (public user behavior). Added `realm` and `actor_type` columns to `audit_logs`, backfilled existing rows as `system`/`staff`, and created a separate "Public Activity" page in the superadmin console alongside the renamed "System Activity" page.

### Database Changes

| Change | Detail |
|:--|:--|
| `docs/migrations/002_audit_realm.sql` | **New migration** — adds `realm` (`system` \| `user`) and `actor_type` (`staff` \| `public_user`) columns, backfills 131 existing rows as `system`/`staff`, adds CHECK constraints and indexes |
| Dropped FK constraint | `audit_logs_user_id_fkey` removed — `user_id` now holds both staff and public user IDs |

### Backend Changes

| File | Change |
|:--|:--|
| `src/backend/src/utils/audit-actions.js` | Added `PUBLIC_USER_INCIDENT_SAVED`, `PUBLIC_USER_INCIDENT_UNSAVED`, `PUBLIC_USER_INCIDENT_VIEWED` constants + labels + colors |
| `src/backend/src/utils/audit-log.js` | Added `realm` and `actorType` parameters (default `system`/`staff`) to the INSERT statement |
| `src/backend/src/services/audit.service.js` | Added `realm`/`actorType` filters to `listAuditLogs`; COALESCE-joined `public_users` for `user_full_name`; added filter support to `getAuditSummary` |
| `src/backend/src/controllers/audit.controller.js` | Passes `realm`/`actorType` from query params to service |
| `src/backend/src/validators/audit.schema.js` | Added `realm` (`system`\|`user`) and `actorType` (`staff`\|`public_user`) Zod validation |
| `src/backend/src/middleware/auth.middleware.js` | Added `optionalAuthenticate` middleware — sets `req.user` if valid token present, never fails (for tracking on public routes) |
| `src/backend/src/routes/incident.routes.js` | Added `optionalAuthenticate` to `GET /:id` so public user view tracking works without breaking unauthenticated access |
| `src/backend/src/controllers/public-auth.controller.js` | `PUBLIC_USER_LOGIN` now passes `realm='user'`, `actorType='public_user'` |
| `src/backend/src/controllers/saved-incident.controller.js` | Added audit logging for `save` (`PUBLIC_USER_INCIDENT_SAVED`) and `unsave` (`PUBLIC_USER_INCIDENT_UNSAVED`) with `realm='user'` |
| `src/backend/src/controllers/incident.controller.js` | Added fire-and-forget view tracking (`PUBLIC_USER_INCIDENT_VIEWED`) when `req.user.role === 'public_user'` |

### Frontend Changes

| File | Change |
|:--|:--|
| `src/superadmin-web/src/utils/audit-colors.js` | Added colors/labels for all public user actions + missing actions (`incident_restored`, `incident_purged`, `public_user_*`) |
| `src/superadmin-web/src/pages/AuditPage.jsx` → `SystemActivityPage.jsx` | Renamed; title "System Activity"; hardcodes `realm='system'` filter |
| `src/superadmin-web/src/pages/PublicActivityPage.jsx` | **New** — public user behavior log; hardcodes `realm='user'`; public-user-specific action/target filters; public user dropdown |
| `src/superadmin-web/src/components/Audit/AuditFilters.jsx` | Added `actionOptions`, `targetOptions`, `userFilterMode` ('staff'\|'public'), `userFilterLabel` props |
| `src/superadmin-web/src/components/Audit/AuditTable.jsx` | Added "Public" badge next to public user names in the User column |
| `src/superadmin-web/src/components/Layout/Sidebar.jsx` | Renamed "Audit Log" → "System Activity"; added "Public Activity" nav item with `Eye` icon |
| `src/superadmin-web/src/App.jsx` | Added `/superadmin/public-activity` route; updated `/superadmin/audit` to `SystemActivityPage` |

### Verified Behavior

| Test | Result |
|:--|:--|
| `GET /audit?realm=system` | ✅ Returns 137 staff action logs |
| `GET /audit?realm=user` | ✅ Returns public user activity logs |
| `GET /audit/summary?realm=system` | ✅ Returns today's system stats |
| `GET /audit/summary?realm=user` | ✅ Returns today's public stats |
| Public user saves incident | ✅ Creates `public_user_incident_saved` in user realm |
| Public user unsaves incident | ✅ Creates `public_user_incident_unsaved` in user realm |
| Public user views incident | ✅ Creates `public_user_incident_viewed` in user realm |
| Unauthenticated GET /incidents/:id | ✅ Still works (optional auth doesn't block) |
| Frontend build | ✅ Clean production build |

### Git Commit

```
feat(superadmin): separate system activity and public user activity logs with realm tracking
```

*End of Phase 4*

---

## Phase 5: Profile Pages — Activity Timelines & Stats (Part 1)

### Summary
Added activity timelines and stats to both staff and public user profile drawers. Staff profiles now show a full chronological activity timeline with stat cards (incidents created, resolved, sources added, timeline updates, last active). Public user profiles show login history, saves, unsaves, views, and a dedicated "Saved Incidents" tab. A new reusable `ActivityTimeline` component renders audit logs as a vertical timeline with color-coded icons.

### Backend Changes

| File | Change |
|:--|:--|
| `src/backend/src/controllers/user.controller.js` | Added `getUserActivityController` — fetches system realm audit logs for a staff user + stats + last active timestamp |
| `src/backend/src/routes/user.routes.js` | Added `GET /:id/activity` route (super_admin only) |
| `src/backend/src/controllers/public-user.controller.js` | Added `getPublicUserActivityController` — fetches user realm audit logs for a public user + action counts + last active timestamp |
| `src/backend/src/routes/public-user.routes.js` | Added `GET /:id/activity` route (super_admin only) |

### Frontend Changes

| File | Change |
|:--|:--|
| `src/superadmin-web/src/services/api.js` | Added `getUserActivity(id)` and `getPublicUserActivity(id)` API wrappers |
| `src/superadmin-web/src/components/Audit/ActivityTimeline.jsx` | **New** — reusable vertical timeline component. Maps audit actions to Lucide icons and colors. Shows human-readable descriptions with target titles, relative timestamps, and connecting lines. Handles loading and empty states |
| `src/superadmin-web/src/components/Users/UserDetailDrawer.jsx` | Restructured with **Overview** and **Activity** tabs. Overview keeps existing profile, stats, and action buttons. Activity tab shows 5 stat cards + full `ActivityTimeline` fetched from `GET /users/:id/activity` |
| `src/superadmin-web/src/components/PublicUsers/PublicUserDrawer.jsx` | Restructured with **Overview**, **Activity**, and **Saved Incidents** tabs. Overview keeps profile, basic stats, and ban/unban action. Activity tab shows 5 stat cards (logins, saves, unsaves, views, last active) + `ActivityTimeline`. Saved Incidents tab contains the existing bookmarked incident list |

### Key Design Decisions

- **Tabbed drawer UI:** Both drawers now use a tab bar below the profile header. The profile block (avatar, name, email, badges) remains visible across all tabs for context.
- **Eager data fetching:** Activity data is fetched in parallel with user data on drawer open. Tab switching is instant with no additional network requests.
- **Reusable timeline:** `ActivityTimeline` accepts any array of audit log objects and is used by both staff and public user drawers. It uses the existing `audit-colors.js` color map for consistency.
- **Stats from backend:** Activity stats are computed server-side (SQL counts + `getUserStats` reuse) rather than client-side aggregation, ensuring accuracy even with pagination.
- **Last active:** Derived from the most recent audit log timestamp for the appropriate realm, or shown as "—" if no activity exists.

### Verified Behavior

| Test | Result |
|:--|:--|
| `GET /users/:id/activity` | ✅ Returns system realm logs + stats + pagination |
| `GET /public-users/:id/activity` | ✅ Returns user realm logs + action counts + pagination |
| User activity stats | ✅ incidentsCreated, incidentsResolved, sourcesAdded, timelineUpdates, lastActive |
| Public user activity stats | ✅ logins, saves, unsaves, views, lastActive |
| ActivityTimeline renders | ✅ Color-coded icons, descriptions, timestamps, connecting lines |
| Empty activity state | ✅ Shows "No activity recorded yet" when no logs exist |
| Frontend build | ✅ Clean production build |

### Git Commit

```
feat(superadmin): activity timelines and stats in staff and public user profile drawers
```

*End of Phase 5*

---

## Phase 6: Deep Linking — From Profile to Map (Part 2)

### Summary
Connected activity timelines to the superadmin map via deep-linking. Any activity item referencing an incident is now clickable and opens the map at the incident's location. The map accepts `?incident`, `?date`, `?from`, `?to`, `?lat`, `?lng`, and `?zoom` query parameters. A contextual banner appears when arriving from an activity link, showing the actor's name and providing "Back to profile" and "Dismiss" actions. The existing ghost marker + date-switch banner pattern seamlessly handles out-of-range incidents.

### Frontend Changes

| File | Change |
|:--|:--|
| `src/superadmin-web/src/pages/MapPage.jsx` | Added deep-link param parsing: `date`/`from`/`to` initialize the date range; `lat`/`lng`/`zoom` initialize the map viewport; `ref`/`actor`/`returnTo` trigger the contextual banner. Added `handleDismissContext` and `handleBackToProfile` callbacks. Added contextual banner JSX above the map |
| `src/superadmin-web/src/components/Audit/ActivityTimeline.jsx` | Added `Link as RouterLink` import from react-router-dom. Added `actorName` and `returnPath` props. Created `buildIncidentLink()` helper and `TimelineItemContent` sub-component. Incident-related activity items (`target_type === 'incident'`) are now wrapped in a clickable `<RouterLink>` with hover highlighting |
| `src/superadmin-web/src/components/Users/UserDetailDrawer.jsx` | Passes `actorName={user?.full_name}` and `returnPath="/superadmin/users"` to `ActivityTimeline` |
| `src/superadmin-web/src/components/PublicUsers/PublicUserDrawer.jsx` | Passes `actorName={user?.full_name}` and `returnPath="/superadmin/public-users"` to `ActivityTimeline` |

### Deep-Link URL Format

| Param | Purpose |
|:--|:--|
| `?incident=<uuid>` | Select and fly to incident (ghost fetch if out of range) |
| `?date=YYYY-MM-DD` | Set both from and to date |
| `?from=YYYY-MM-DD&to=YYYY-MM-DD` | Set a date range |
| `?lat=<n>&lng=<n>&zoom=<n>` | Set initial viewport |
| `?ref=activity` | Trigger contextual banner |
| `?actor=<name>` | Display actor name in contextual banner |
| `?returnTo=<path>` | Target path for "Back to profile" button |

### User Flow

```
1. Superadmin opens a staff user's profile → Activity tab
2. Sees "Created Shelling near Gaza" in the timeline
3. Clicks the item → navigates to /superadmin/map?incident=<uuid>&ref=activity&actor=Alice&returnTo=/superadmin/users
4. Map loads with contextual banner: "Showing incident from Alice's activity"
5. If incident is outside current date range → ghost marker appears with "Switch to this date" button
6. User clicks "Switch to this date" → date range updates, incident appears in list
7. User clicks "Back to profile" → returns to /superadmin/users
```

### Verified Behavior

| Test | Result |
|:--|:--|
| Build passes | ✅ Clean production build |
| Activity item link generation | ✅ Correct `/superadmin/map?incident=...&ref=activity&actor=...&returnTo=...` |
| Map reads `date` param | ✅ Initializes dateRange from URL |
| Map reads `lat`/`lng`/`zoom` params | ✅ Initializes flyToCoords from URL |
| Contextual banner shows on `ref=activity` + `incident` | ✅ Banner with actor name, Back, and Dismiss buttons |
| Banner dismiss clears context params | ✅ Removes `ref`, `actor`, `returnTo` from URL |
| Back button navigates to `returnTo` | ✅ Uses `useNavigate` to return to profile page |
| Ghost marker still works for out-of-range incidents | ✅ Unchanged ghost fetch + banner logic |

### Git Commit

```
feat(superadmin): deep-link activity timeline items to map with contextual navigation and date sync
```

*End of Phase 6*


---

## Phase 7: Real-Time User Management

### Summary
Extended the existing SSE (Server-Sent Events) infrastructure to broadcast staff user and public user lifecycle events. The UsersPage and PublicUsersPage now automatically refresh when users are created, updated, or deleted — eliminating the need to manually refresh to see changes made by other admins or new public user signups.

### Backend Changes

| File | Change |
|:--|:--|
| `src/backend/src/controllers/auth.controller.js` | Imported `broadcastEvent`. After successful `register()`, emits `user_created` with `{ id, email, full_name, role, is_active }` |
| `src/backend/src/controllers/user.controller.js` | Imported `broadcastEvent`. In `updateUserController()`, emits `user_updated` with the updated user object. In `deleteUserController()`, emits `user_deleted` with `{ userId }` |
| `src/backend/src/controllers/public-auth.controller.js` | Imported `broadcastEvent`. After successful Google OAuth signup, emits `public_user_created` with `{ id, email, full_name, avatar_url, is_active }` |
| `src/backend/src/controllers/public-user.controller.js` | Imported `broadcastEvent`. In `updatePublicUserController()`, emits `public_user_updated` with the updated user object |

### Frontend Changes

| File | Change |
|:--|:--|
| `src/superadmin-web/src/pages/UsersPage.jsx` | Imported `useEventSource`. Added SSE listener that calls `fetchUsers()` on `user_created`, `user_updated`, and `user_deleted` events. Added green "Live" indicator pill in the page header (matching RecycleBinPage pattern) |
| `src/superadmin-web/src/pages/PublicUsersPage.jsx` | Imported `useEventSource`. Added SSE listener that calls `fetchUsers()` on `public_user_created` and `public_user_updated` events. Added green "Live" indicator pill in the page header |

### SSE Event Types Added

| Event Type | Trigger | Page Affected |
|:--|:--|:--|
| `user_created` | `POST /auth/register` | UsersPage |
| `user_updated` | `PATCH /users/:id` | UsersPage |
| `user_deleted` | `DELETE /users/:id` | UsersPage |
| `public_user_created` | `POST /auth/public/google` (new signup) | PublicUsersPage |
| `public_user_updated` | `PATCH /public-users/:id` (ban/unban) | PublicUsersPage |

### What Was Already Real-Time (Unchanged)

| Page | Events Already Handled |
|:--|:--|
| Dashboard | `incident_created`, `incident_updated`, `incident_deleted`, `incident_resolved`, `timeline_added`, `source_added` |
| Map | `incident_created`, `incident_updated`, `incident_deleted`, `incident_resolved` |
| System Activity | All events (full refresh on any SSE message) |
| Public Activity | All events (full refresh on any SSE message) |
| Recycle Bin | `incident_deleted`, `incident_created` |

### Verified Behavior

| Test | Result |
|:--|:--|
| `user_created` SSE broadcast | ✅ Received by connected clients |
| `user_updated` SSE broadcast | ✅ Received by connected clients |
| `user_deleted` SSE broadcast | ✅ Received by connected clients |
| `public_user_updated` SSE broadcast | ✅ Received by connected clients |
| UsersPage refreshes on user events | ✅ `fetchUsers()` called automatically |
| PublicUsersPage refreshes on public user events | ✅ `fetchUsers()` called automatically |
| Frontend build | ✅ Clean production build |
| Backend syntax check | ✅ All 4 modified controllers pass `node --check` |

### Out of Scope

- Detail drawer real-time refresh (UserDetailDrawer, PublicUserDrawer) — user reopens drawer to see fresh data
- Activity timeline real-time refresh — historical data, not time-critical
- Admin-web or user-web real-time updates — only superadmin affected

### Git Commit

```
feat(superadmin): real-time user lists via SSE — auto-refresh on create/update/delete for staff and public users
```

*End of Phase 7*


---

## Task: Complete Light Theme Overhaul (All 3 Sites)

**Date:** 2026-05-05

### Problem
The light theme was created by inverting only the background (`#ffffff`) and primary text (`#1a1a1e`) colors while leaving all other colors unchanged from the dark theme. This caused:
- Role badges (ADMIN, SUPER ADMIN) with transparent `rgba()` backgrounds to become nearly invisible on white
- Table row hover states (`#eaeaec`) to be imperceptible
- Borders (`#e5e5e8`) to disappear against white backgrounds
- Input fields blending into the page background
- Status indicators and alert banners with poor contrast
- Sidebar active items looking washed out

### Research-Driven Solution
Studied how GitHub Primer, Vercel Geist, Linear, and shadcn/ui handle light themes. The key insight: **you cannot use the same visual strategy as dark mode**. In dark mode, `rgba(color, 0.12)` tints look great on near-black. On white, they vanish. Top platforms use:
- **Solid opaque tints** for badge backgrounds (`#dbeafe` instead of `rgba(37,99,235,0.12)`)
- **Darkened text** on badges (`#1e40af` instead of `#3b82f6`)
- **Stronger borders** (`#d1d5db` instead of `#e5e5e8`)
- **Distinct input backgrounds** (`#f8f9fa` instead of `#ffffff`)
- **Meaningful hover states** (`#e2e8f0` instead of `#eaeaec`)

### Files Modified

#### CSS Token Files (Foundation)
| File | Changes |
|:--|:--|
| `src/shared/design-tokens.css` | Completely rewrote `[data-theme="light"]` section. Added 30+ new semantic tokens: `--badge-*-bg/text` (6 color pairs), `--alert-*-bg/border` (4 pairs), `--accent-subtle-bg/border`, `--hover-subtle/default/strong`, `--backdrop`. Light values use solid opaque tints (GitHub Primer style). Dark values remain as transparent overlays. |
| `src/superadmin-web/src/index.css` | Rewrote `[data-theme="light"]` with navy-accented palette. Added same badge/alert/hover/backdrop tokens. Backgrounds: `#f8f9fa` → `#ffffff` → `#f1f5f9`. Borders: `#e2e8f0` / `#cbd5e1` / `#94a3b8`. Text: `#0f172a` / `#475569` / `#64748b`. |
| `src/admin-web/src/index.css` | Added `[data-theme="light"]` scrollbar overrides (was completely missing). |
| `src/user-web/src/index.css` | Added `[data-theme="light"]` scrollbar overrides (was completely missing). |

#### Superadmin-Web JSX Components
| File | Changes |
|:--|:--|
| `src/components/Users/UserTable.jsx` | Role badges now use `var(--badge-blue-bg)` / `var(--badge-blue-text)` and `var(--badge-amber-bg)` / `var(--badge-amber-text)` |
| `src/components/Users/UserDetailDrawer.jsx` | Same role badge CSS var migration |
| `src/components/PublicUsers/PublicUserDrawer.jsx` | Public user role tag uses badge CSS vars; error/delete banners use alert vars |
| `src/components/PublicUsers/PublicUserTable.jsx` | Pagination active button uses CSS vars |
| `src/components/Audit/AuditTable.jsx` | SYSTEM actor badge uses `var(--badge-purple-bg)` / `var(--badge-purple-text)` |
| `src/components/Layout/Sidebar.jsx` | Active nav item uses `var(--badge-blue-bg)` and `var(--badge-blue-text)` for border |
| `src/components/Layout/TopBar.jsx` | Logout hover uses `var(--alert-error-bg)` |
| `src/components/Map/IncidentDetailPanel.jsx` | Verified/unverified badges, action error/success banners, delete confirmation all use alert vars |
| `src/components/Map/MapControls.jsx` | Mode indicator chips use alert vars |
| `src/components/Domains/DomainModal.jsx` | Error/success banners use alert vars |
| `src/components/Domains/CategoryModal.jsx` | Error/success banners use alert vars |
| `src/components/Users/CreateUserModal.jsx` | Error/success banners use alert vars |
| `src/components/Users/BulkActionBar.jsx` | Danger button backgrounds use alert vars |
| `src/components/LocationSearch/LocationSearch.jsx` | Dropdown dividers use border CSS vars |
| `src/pages/UsersPage.jsx` | Online indicator uses badge vars; error banner uses alert vars; button shadow uses navy vars |
| `src/pages/PublicUsersPage.jsx` | Online indicator uses badge vars; error banner uses alert vars |
| `src/pages/DomainsPage.jsx` | Error banner, severity count badge use CSS vars |
| `src/pages/DashboardPage.jsx` | Live indicator, error banner use alert vars |
| `src/pages/RecycleBinPage.jsx` | Severity badges, restore/delete buttons, auto-purge indicator, days-left pills all use CSS vars |
| `src/pages/MapPage.jsx` | Ghost incident button uses alert vars |
| `src/pages/PublicActivityPage.jsx` | Error banner uses alert vars |
| `src/pages/SystemActivityPage.jsx` | Error banner uses alert vars |
| `src/pages/NotFoundPage.jsx` | Button text uses CSS var |
| `src/App.jsx` | Auth error banner uses alert vars |

#### Admin-Web JSX Components
| File | Changes |
|:--|:--|
| `src/components/SearchModal/SearchModal.jsx` | Search highlight, backdrop, shadow use CSS vars |
| `src/components/SearchDropdown/SearchDropdown.jsx` | Hover states, dividers, shadows use CSS vars |
| `src/components/LocationSearch/LocationSearch.jsx` | Dividers, shadows use CSS vars |
| `src/components/IncidentDetail/IncidentDetailPanel.jsx` | Timeline badge, resolve banner, backdrop, copy-link color use CSS vars |
| `src/components/IncidentForm/IncidentForm.jsx` | Location context badge uses accent vars |
| `src/components/Layout/DashboardLayout.jsx` | Ghost incident button uses accent vars |
| `src/components/Layout/TopBar.jsx` | Mode indicator chips use alert vars |
| `src/components/Map/AdminMap.jsx` | Popup colors use CSS vars |
| `src/components/LiveActivity/AdminLiveFeed.jsx` | Unread rows, edit button use accent vars |
| `src/components/IncidentList/IncidentTable.jsx` | Backdrop uses CSS var |

#### User-Web JSX Components + CSS
| File | Changes |
|:--|:--|
| `src/components/IncidentDetail/IncidentDetailView.jsx` | Copy-link, live indicator, timeline badge use CSS vars |
| `src/components/IncidentList/IncidentListItem.jsx` | Verification badge uses CSS vars |
| `src/components/IncidentList/IncidentSidebar.jsx` | Saved/events count badges, filter chips use accent vars |
| `src/components/LiveActivity/LiveActivityFeed.jsx` | Unread rows use hover vars |
| `src/components/Map/UserMap.jsx` | Popup badges use CSS vars |
| `src/components/Map/MapControls.jsx` | Mode indicator, verified toggle use alert vars |
| `src/components/LocationSearch/LocationSearch.jsx` | Dividers, shadows use CSS vars |
| `src/components/SaveButton/SaveButton.jsx` | Saved state uses alert vars |
| `src/components/Layout/Footer.jsx` | Operational status badge uses alert vars |
| `src/pages/MapPage.jsx` | Ghost incident button uses accent vars |
| `src/pages/HomePage.css` | Grid lines, live badge, CTA shadows use CSS vars |

### Token Reference (New Semantic Variables)

| Token | Dark Mode Value | Light Mode Value | Usage |
|:--|:--|:--|:--|
| `--badge-blue-bg` | `rgba(37,99,235,0.15)` | `#dbeafe` | Admin, info badges |
| `--badge-blue-text` | `#60a5fa` | `#1e40af` | Admin badge text |
| `--badge-amber-bg` | `rgba(245,158,11,0.15)` | `#fef3c7` | Super Admin, warning badges |
| `--badge-amber-text` | `#fbbf24` | `#92400e` | Super Admin badge text |
| `--badge-green-bg` | `rgba(16,185,129,0.15)` | `#d1fae5` | Active, online, success badges |
| `--badge-green-text` | `#34d399` | `#065f46` | Active badge text |
| `--badge-red-bg` | `rgba(244,63,94,0.15)` | `#ffe4e6` | Danger, banned badges |
| `--badge-red-text` | `#fb7185` | `#9f1239` | Danger badge text |
| `--badge-purple-bg` | `rgba(139,92,246,0.15)` | `#ede9fe` | System, purple badges |
| `--badge-purple-text` | `#a78bfa` | `#5b21b6` | System badge text |
| `--alert-error-bg` | `rgba(220,38,38,0.08)` | `#fef2f2` | Error banners |
| `--alert-error-border` | `rgba(220,38,38,0.2)` | `#fecaca` | Error banner borders |
| `--alert-success-bg` | `rgba(34,197,94,0.08)` | `#f0fdf4` | Success banners |
| `--alert-success-border` | `rgba(34,197,94,0.2)` | `#bbf7d0` | Success banner borders |
| `--alert-warning-bg` | `rgba(245,158,11,0.08)` | `#fffbeb` | Warning banners |
| `--alert-warning-border` | `rgba(245,158,11,0.2)` | `#fde68a` | Warning banner borders |
| `--accent-subtle-bg` | `rgba(159,18,57,0.08)` | `#fce7f3` | Accent/brand tint bg |
| `--accent-subtle-border` | `rgba(159,18,57,0.25)` | `#fbcfe8` | Accent/brand tint border |
| `--hover-subtle` | `rgba(255,255,255,0.03)` | `rgba(15,23,42,0.02)` | Very subtle hover |
| `--hover-default` | `rgba(255,255,255,0.05)` | `rgba(15,23,42,0.04)` | Standard hover |
| `--hover-strong` | `rgba(255,255,255,0.08)` | `rgba(15,23,42,0.08)` | Strong hover |
| `--backdrop` | `rgba(0,0,0,0.6)` | `rgba(0,0,0,0.45)` | Modal overlays |

### Verified Behavior

| Test | Result |
|:--|:--|
| Superadmin build | ✅ Clean production build |
| Admin-web build | ✅ Clean production build |
| User-web build | ✅ Clean production build |
| Badge contrast (light) | ✅ Solid opaque backgrounds with dark text |
| Badge contrast (dark) | ✅ Transparent tints with bright text |
| Border visibility (light) | `#cbd5e1` default — clearly visible on white |
| Border visibility (dark) | `rgba(148,163,184,0.12)` — subtle on dark |
| Input differentiation (light) | `#f8f9fa` bg vs `#ffffff` page — visible boundary |
| Hover states (light) | `#e2e8f0` — clearly perceptible |
| Hover states (dark) | `#131322` — clearly perceptible |

### What Was NOT Changed (Intentionally Out of Scope)

- Domain colors (`domain_color`) — user-defined, backend-driven
- Location type colors — functional mapping (country=purple, city=amber, etc.)
- Severity colors — standard across both themes
- `DesignTrial.jsx` — self-contained design showcase with its own palette
- Map tile styles — already have separate light/dark JSON styles
- Decorative button shadows on primary navy buttons — cosmetic, background stays dark

### Git Commit

```
feat(theming): complete light theme overhaul for all 3 sites — solid opaque badge tints, stronger borders, distinct inputs, semantic CSS vars
```

*End of Light Theme Overhaul*

---

## 📅 2026-05-09 — Design Trial: Three-Way Interface Style Toggle

### Summary
Built a comprehensive design trial page in admin-web demonstrating three distinct interface styles: Tactical (military C2), SaaS (clean modern dashboard), and Glass (awwwards-style glassmorphism with mesh gradient). Each style is fully tokenized and switchable via a segmented control. The trial informed the production implementation plan.

### Changes

| File | Change |
|:--|:--|
| `src/admin-web/src/components/DesignTrial/DesignTrial.jsx` | Complete rewrite with token context architecture. Three token sets: TOKENS_TACTICAL, TOKENS_SAAS_DARK, TOKENS_GLASS. All components consume from context. Conditional backdrop-filter for glass cards. Mesh gradient background. Glowing hover borders. |

### Three Styles Defined

| Style | Key Traits |
|:--|:--|
| **Tactical** | Space Grotesk, uppercase labels, film grain, radial crimson gradient, heavy shadows, sharp radius |
| **SaaS** | Inter font, sentence case, no grain, soft shadows, subtle borders, more spacing |
| **Glass** | Inter font, glassmorphism cards (backdrop-filter blur), mesh gradient background, glow-based hover, large radius (20px+), no drop shadows |

### Git Commit

```
feat: build three-way interface style trial with tactical, saas, and glassmorphism tokens
```

*End of session*

---

## 📅 2026-05-09 — Interface Implementation Plan Document

### Summary
Created `interfacePlan.md` — a comprehensive 618-line document serving as the single source of truth for rolling out the three interface styles across all three frontends. Includes architecture, token references, per-site roadmap, component migration guide, testing checklist, commit rules, and three resume prompts for post-compaction context recovery.

### Changes

| File | Change |
|:--|:--|
| `interfacePlan.md` | **New** — Complete implementation plan document |

### Git Commit

```
docs: create interfacePlan.md with full architecture, tokens, roadmap, and resume prompts for three-site rollout
```

*End of session*

---

## 📅 2026-06-03 — Superadmin-Web: Three Interface Styles (Tactical, SaaS, Glass)

### Summary
Implemented the three switchable interface styles in superadmin-web: Tactical (default, military C2), SaaS (clean modern dashboard), and Glass (awwwards-style glassmorphism with navy blue mesh gradient). Extended shared ThemeContext with 2D state (color mode × interface style), added a style toggle dropdown in the TopBar, and audited all card/panel components to use CSS variable-driven radius, shadow, and background.

### Changes

| File | Change |
|:--|:--|
| `src/shared/theme-context.jsx` | Extended with `style` state (`tactical`/`saas`/`glass`), `setStyle`, `STYLE_KEY` localStorage persistence, and `data-style` attribute on `<html>`. Backward-compatible — defaults to `tactical`. |
| `src/shared/useStyle.js` | **New** — Convenience hook exporting `{ style, setStyle }` from ThemeContext. |
| `src/shared/design-tokens.css` | Added Google Font import for `Inter` family alongside existing `Space Grotesk`. |
| `src/superadmin-web/src/index.css` | Added `[data-style="saas"]`, `[data-style="glass"]` (dark + light), and `[data-style="tactical"]` grain overlay blocks. Added `.glass-card` utility. Added `--radius-*` and `--bg-gradient` tokens. Updated `.console-card` to use `var(--radius-md)` and added glass hover glow. Added glass backdrop-filter overrides for `aside` (sidebar) and `header` (topbar). |
| `src/superadmin-web/src/components/Layout/TopBar.jsx` | Added style toggle dropdown with Palette icon. Three options: Tactical (T), SaaS (S), Glass (G). Styled with active-state highlighting. |
| `src/superadmin-web/src/components/Layout/Layout.jsx` | Changed main container background from `var(--bg-base)` to `var(--bg-gradient)`. |
| `src/superadmin-web/src/components/Layout/Sidebar.jsx` | Nav item radius changed from hardcoded `8` to `var(--radius-sm)`. |
| `src/superadmin-web/src/pages/DashboardPage.jsx` | KPICard and activity panel already used `console-card` class — no changes needed. |
| `src/superadmin-web/src/components/Login/LoginPage.jsx` | Login card radius → `var(--radius-lg)`, shadow → `var(--shadow-glow)`. |
| `src/superadmin-web/src/components/Users/CreateUserModal.jsx` | Modal radius → `var(--radius-lg)`. Input and alert radii → `var(--radius-sm)`. |
| `src/superadmin-web/src/components/Users/UserTable.jsx` | Table container radius → `var(--radius-md)`. Action button radii → `var(--radius-sm)`. |
| `src/superadmin-web/src/components/Users/UserDetailDrawer.jsx` | All alert/info box radii → `var(--radius-sm)`. |
| `src/superadmin-web/src/components/Users/BulkActionBar.jsx` | Bar radius → `var(--radius-md)`. |
| `src/superadmin-web/src/components/Audit/AuditTable.jsx` | Table container radius → `var(--radius-md)`. |
| `src/superadmin-web/src/components/Audit/AuditFilters.jsx` | Filter container and input radii → `var(--radius-sm)`. |
| `src/superadmin-web/src/components/Audit/ActivityTimeline.jsx` | Timeline item radius → `var(--radius-sm)`. |
| `src/superadmin-web/src/components/PublicUsers/PublicUserTable.jsx` | Table container radius → `var(--radius-md)`. |
| `src/superadmin-web/src/components/PublicUsers/PublicUserDrawer.jsx` | Alert/info box radii → `var(--radius-sm)`. |
| `src/superadmin-web/src/components/Map/IncidentDetailPanel.jsx` | Description, source, metadata, modal, and alert radii → `var(--radius-sm)`. |
| `src/superadmin-web/src/pages/PublicUsersPage.jsx` | Card radius → `var(--radius-md)`. |
| `src/superadmin-web/src/pages/UsersPage.jsx` | Card radius → `var(--radius-md)`. |
| `src/superadmin-web/src/pages/RecycleBinPage.jsx` | Card radii → `var(--radius-md)`. |

### Key Design Decisions

- **Navy blue accent preserved** for superadmin-web. Glass mesh gradient uses blue/purple blobs (`rgba(37,99,235,0.25)`, `rgba(59,130,246,0.18)`, `rgba(139,92,246,0.08)`) instead of crimson.
- **Grain overlay** only appears in Tactical style via `[data-style="tactical"] body::after`.
- **Glass cards** use `backdrop-filter: blur(16px) saturate(1.2)` with `rgba(255,255,255,0.04)` surface background and navy glow on hover.
- **Backward compatibility**: Tactical is the default. Existing users see zero change.

### Build Verification

| App | Status |
|:--|:--|
| superadmin-web | ✅ Build succeeded (2.78s) |
| admin-web | ✅ Build succeeded (2.36s) — no regressions from shared changes |
| user-web | ✅ Build succeeded (2.69s) — no regressions from shared changes |

### Git Commit

```
feat: implement Tactical, SaaS, and Glass interface styles in superadmin-web with extended ThemeContext, style toggle, and per-style CSS overrides
```

*End of session*

---

## 📅 2026-06-03 — User-Web: Three Interface Styles (Tactical, SaaS, Glass)

### Summary
Implemented the three switchable interface styles in user-web. Added crimson-accented `[data-style]` CSS overrides, a style toggle in the Header, and adapted the hero section for all three styles. Audited and fixed hardcoded borderRadius values across components.

### Changes

| File | Change |
|:--|:--|
| `src/user-web/src/index.css` | Added `[data-style="saas"]`, `[data-style="glass"]` (dark + light), and `[data-style="tactical"]` grain overlay blocks. Added `.glass-card` utility. Added glass overrides for header, stat cards, category cards, event cards. Added glass hero overlay (lighter) and scanline hide. Added SaaS scanline lightening. |
| `src/user-web/src/components/Layout/Header.jsx` | Added style toggle dropdown with Palette icon (Tac / SaaS / Glass). Imported `useStyle` hook. |
| `src/user-web/src/App.jsx` | Changed root container background from `var(--bg-deep)` to `var(--bg-gradient)`. |
| `src/user-web/src/components/Layout/Footer.jsx` | Hardcoded `borderRadius: '6px'` → `var(--radius-sm)`. |
| `src/user-web/src/components/LiveActivity/LiveActivityFeed.jsx` | Hardcoded `borderRadius: '10px'` → `var(--radius-md)`. |
| `src/user-web/src/components/IncidentList/IncidentSidebar.jsx` | Hardcoded `borderRadius: '10px'` → `var(--radius-md)` (2 instances). |
| `src/user-web/src/components/IncidentDetail/IncidentDetailView.jsx` | Hardcoded `borderRadius: '10px'` → `var(--radius-md)`. |

### Key Design Decisions

- **Crimson accent** for user-web. Glass mesh gradient uses crimson blobs (`rgba(90,1,28,0.3)`, `rgba(159,18,57,0.2)`) with a subtle blue accent.
- **Hero section adaptations** handled entirely in CSS:
  - Tactical: heavy overlay gradients + visible scanline + grain
  - SaaS: same overlay but lighter scanline, no grain
  - Glass: much lighter overlay, no scanline, no grain, mesh gradient background
- **Card glass effects** applied via `[data-style="glass"]` selectors on `.home-stat-card`, `.home-category-card`, `.home-event-card` with backdrop blur and crimson glow hover.

### Build Verification

| App | Status |
|:--|:--|
| user-web | ✅ Build succeeded (2.55s) |
| superadmin-web | ✅ Build succeeded (2.87s) — no regressions |
| admin-web | ✅ Build succeeded (2.40s) — no regressions |

### Git Commit

```
feat: implement Tactical, SaaS, and Glass interface styles in user-web with style toggle, hero adaptations, and glass card overrides
```

*End of session*

---

## 📅 2026-06-03 — Admin-Web: Three Interface Styles (Tactical, SaaS, Glass)

### Summary
Implemented the three switchable interface styles in admin-web, the final website. Added crimson-accented `[data-style]` CSS overrides, a style toggle in the TopBar next to the live/historical mode indicator, and audited all dashboard components for CSS variable consistency. Dashboard layout already used `var(--bg-gradient)`. Map component left unchanged as it's independent of interface style.

### Changes

| File | Change |
|:--|:--|
| `src/admin-web/src/index.css` | Added `[data-style="saas"]` (Inter font, medium radius, crimson radial gradient) and `[data-style="glass"]` (Inter font, large radius, crimson mesh gradient, glass surfaces, no shadows) blocks. Added light mode variants. Wrapped grain overlay in `[data-style="tactical"]`. Added `.glass-card` utility class. Added glass overrides for header, live-feed panels, inputs, and modal/panel cards. |
| `src/admin-web/src/components/Layout/TopBar.jsx` | Added `StyleToggle` component with Palette icon dropdown (Tac / SaaS / Glass). Imported `useStyle` hook and `Palette` from lucide-react. Placed toggle between ThemeToggle and user badge. Fixed hardcoded `borderRadius: '8px'` → `var(--radius-sm)` (logo) and `borderRadius: '6px'` → `var(--radius-sm)` (Admin badge). |
| `src/admin-web/src/components/IncidentDetail/IncidentDetailPanel.jsx` | Added `className="panel-card"` to header card, meta grid, and description container for glass styling. Fixed hardcoded `borderRadius: '10px'` → `var(--radius-pill)` (timeline count badge) and `borderRadius: '6px'` → `var(--radius-sm)` (copy link button). Fixed delete modal `borderRadius: '8px'` → `var(--radius-lg)`. |
| `src/admin-web/src/components/IncidentForm/IncidentForm.jsx` | No structural changes — already used CSS variables for radius and background. Form inputs automatically pick up glass styling via `[data-style="glass"] input/textarea/select` CSS selectors. |
| `src/admin-web/src/components/IncidentList/IncidentTable.jsx` | No structural changes — already used CSS variables for radius and background. Table container and modal styling handled by CSS overrides. |
| `src/admin-web/src/components/Login/LoginPage.jsx` | Changed page background from `var(--bg-deep)` to `var(--bg-gradient)`. Added `className="panel-card"` to login card for glass styling. |
| `src/admin-web/src/components/LiveActivity/AdminLiveFeed.jsx` | Added `className="live-feed-panel"` to both collapsed and expanded containers for glass header override. Fixed hardcoded `borderRadius: '10px'` → `var(--radius-pill)` (unread count badge). |
| `src/admin-web/src/components/Layout/DashboardLayout.jsx` | Already used `var(--bg-gradient)` — no changes needed. Map container uses `var(--bg-deep)` which is correct. Toast and ghost banner already have `backdropFilter` for glass compatibility. |

### Key Design Decisions

- **Crimson accent** for admin-web. Glass mesh gradient uses crimson blobs (`rgba(90,1,28,0.3)`, `rgba(159,18,57,0.2)`) with a subtle blue accent.
- **Grain overlay** only appears in Tactical style via `[data-style="tactical"] body::after`.
- **Glass panels** applied via `.panel-card` and `.live-feed-panel` classes with `backdrop-filter: blur(16px) saturate(1.2)` and `var(--bg-glass)` background.
- **Glass inputs** styled globally via `[data-style="glass"] input, textarea, select` CSS selectors — no component-level changes needed.
- **Map independence**: `AdminMap.jsx` intentionally left unchanged. Map rendering is independent of interface style.
- **Backward compatibility**: Tactical is the default. Existing users see zero change.

### Build Verification

| App | Status |
|:--|:--|
| admin-web | ✅ Build succeeded (2.20s) |
| superadmin-web | ✅ Build succeeded (2.85s) — no regressions |
| user-web | ✅ Build succeeded (2.65s) — no regressions |

### Git Commit

```
feat: implement Tactical, SaaS, and Glass interface styles in admin-web with glass dashboard panels, backdrop-filter cards, and top-bar style toggle
```

*End of session*

---

## 📅 2026-06-04 — Phase 1: Zone API Backend Foundation

### Summary
Created the complete backend API for polygon zones: database table, Zod validation schemas, PostGIS-enabled service layer, HTTP controllers with SSE broadcast + audit logging, and Express routes with role-based access control. All 5 endpoints tested and verified with curl.

### Created Files

| File | Purpose |
|:--|:--|
| `src/backend/src/validators/zone.schema.js` | Zod schemas: `createZoneSchema` (name, GeoJSON Polygon geometry, optional colors/opacity/category) and `updateZoneSchema` (all optional, at least one required) |
| `src/backend/src/services/zone.service.js` | SQL CRUD with PostGIS: `listZones`, `getZoneById`, `createZone`, `updateZone`, `deleteZone` (soft delete). Uses `ST_SetSRID(ST_GeomFromGeoJSON(...), 4326)` for inserts and `ST_AsGeoJSON(geom)::json` for selects |
| `src/backend/src/controllers/zone.controller.js` | HTTP handlers: `getZones`, `getZone`, `createZoneController`, `updateZoneController`, `deleteZoneController`. Broadcasts SSE events and writes audit logs on mutations |
| `src/backend/src/routes/zone.routes.js` | Express router: GET / (public), GET /:id (public), POST / (admin+), PATCH /:id (admin+), DELETE /:id (admin+) |

### Updated Files

| File | Change |
|:--|:--|
| `src/backend/server.js` | Imported `zoneRoutes` and mounted at `/api/v1/zones` |
| `src/backend/src/utils/audit-actions.js` | Added `ZONE_CREATED`, `ZONE_UPDATED`, `ZONE_DELETED` actions + labels + colors |
| `docs/database-schema.sql` | Updated zone table defaults: `fill_color='#9f1239'`, `stroke_color='#9f1239'`, `opacity=0.08` |

### Database

- Zones table already existed in DB but with old defaults (`#FF0000`, `#000000`, `0.35`); service layer provides correct defaults at insert time
- Trigger `update_zones_updated_at` already functional
- Index `idx_zones_geom` (GIST on geom) already exists

### Verified Endpoints

| # | Test | Result |
|:--|:--|:--|
| 1 | `GET /api/v1/zones` (public, empty) | ✅ Returns `{ zones: [] }` |
| 2 | `POST /api/v1/zones` (admin, valid GeoJSON) | ✅ Creates zone with defaults `#9f1239`, opacity `0.08` |
| 3 | `GET /api/v1/zones/:id` | ✅ Returns zone with `geometry: { type: 'Polygon', coordinates: [...] }` |
| 4 | `GET /api/v1/zones` (with data) | ✅ Lists active zones |
| 5 | `PATCH /api/v1/zones/:id` | ✅ Updates name, description, opacity; geometry updates via PostGIS |
| 6 | `DELETE /api/v1/zones/:id` | ✅ Soft delete (is_active=false); list returns empty |
| 7 | `GET /api/v1/zones/:id` (deleted) | ✅ Returns 404 NOT_FOUND |
| 8 | `POST /api/v1/zones` (no name) | ✅ Returns 400 VALIDATION_ERROR |
| 9 | `POST /api/v1/zones` (no token) | ✅ Returns 401 UNAUTHORIZED |
| 10 | `PATCH /api/v1/zones/:id` geometry update | ✅ Geometry updated via `ST_GeomFromGeoJSON` |

### Git Commit

```
feat: add zones table, service, controller, routes, and CRUD API endpoints
```

*End of Phase 1*

---

## 📅 2026-06-04 — Phase 2: Display Zones as Translucent Polygons on Admin Map

### Summary
Fetched zones from the backend and rendered them as translucent polygon overlays on the admin map. Zones are layered below incident markers (DOM-based markers naturally render on top of MapLibre canvas layers). Added hover and click interactions with feature-state-driven styling.

### Created Files

None (all modifications to existing files).

### Updated Files

| File | Change |
|:--|:--|
| `src/admin-web/src/services/api.js` | Added zone API methods: `getZones`, `getZone`, `createZone`, `updateZone`, `deleteZone` |
| `src/admin-web/src/components/Map/AdminMap.jsx` | **Major changes:** |
| | • New props: `zones`, `selectedZoneId`, `onZoneClick` |
| | • Added GeoJSON source `'zones'` with `promoteId: 'id'` (critical for UUID feature-state support) |
| | • Added `'zone-fills'` layer (fill type) with dynamic opacity via `feature-state`: hover=0.12, selected=0.10, default=zone opacity |
| | • Added `'zone-outlines'` layer (line type) with dynamic opacity: hover=0.8, selected=0.9, default=0.6 |
| | • Selected zones use amber (`#f59e0b`) fill/outline color |
| | • `useEffect` updates source data when `zones` prop changes |
| | • `useEffect` handles hover: `queryRenderedFeatures` on `zone-fills`, sets `feature-state` hover, changes cursor to pointer |
| | • `useEffect` handles click: `queryRenderedFeatures` on `zone-fills`, calls `onZoneClick(zoneId)` |
| | • `useEffect` handles selection: sets `feature-state` selected for all zones when `selectedZoneId` changes |
| `src/admin-web/src/components/Layout/DashboardLayout.jsx` | Added `zones` and `selectedZoneId` state; fetches zones via `api.getZones()` on mount and when `refreshKey` changes; added `handleZoneClick` callback; passes zone props to `AdminMap`; clears zone selection when incident selected and vice versa |

### Visual Design (from polygonPlan.md)

| State | Fill Color | Outline Color | Fill Opacity | Outline Opacity |
|:--|:--|:--|:--|:--|
| Normal | `#9f1239` | `#9f1239` | 0.08 | 0.6 |
| Hover | `#9f1239` | `#9f1239` | 0.12 | 0.8 |
| Selected | `#f59e0b` | `#f59e0b` | 0.10 | 0.9 |

### Technical Decisions

- **`promoteId: 'id'`** is required because MapLibre `feature-state` needs a promotable ID field; UUID strings don't work as native feature IDs without this.
- Zone layers are added inside the map `'load'` event handler, which runs before incident markers are created reactively, ensuring correct z-order.
- DOM-based `maplibregl.Marker` instances (incident markers) naturally render on top of all MapLibre canvas style layers, so no explicit `addLayer(layer, beforeId)` is needed.
- Backend returns `opacity` as a string from PostgreSQL `DECIMAL`; `parseFloat()` converts it for the MapLibre paint expression.
- Property names mapped from snake_case (`fill_color`, `stroke_color`, `stroke_width`) to camelCase (`fillColor`, `strokeColor`, `strokeWidth`) for GeoJSON properties.

### Verified

| # | Test | Result |
|:--|:--|:--|
| 1 | `admin-web` build | ✅ Clean, zero errors |
| 2 | `user-web` build | ✅ Clean |
| 3 | `superadmin-web` build | ✅ Clean |
| 4 | Created test zone via curl (Pakistan region polygon) | ✅ POST /api/v1/zones successful |
| 5 | Zone appears in GET /api/v1/zones | ✅ Returned with correct GeoJSON geometry |

### Git Commit

```
feat: display zones as translucent polygons on admin map, layered below markers
```

*End of Phase 2*

---

## 📅 2026-06-04 — Phase 3: Polygon Drawing Toolbar & Zone Creation Panel

### Summary
Added a complete polygon drawing workflow to the admin map. Admins can now draw polygon zones by clicking vertices on the map, with a rubber band preview, live area calculation, and a form panel to name and save the zone. Double-clicking or clicking the first vertex closes the polygon. Escape cancels the drawing.

### Created Files

| File | Purpose |
|:--|:--|
| `src/admin-web/src/components/Map/DrawingToolbar.jsx` | Floating toolbar (bottom-left of map) with Pan / Polygon / Save / Cancel buttons. Save is disabled until polygon is closed. Active mode highlighted in accent color. |
| `src/admin-web/src/components/Zones/ZoneCreatePanel.jsx` | Form panel for naming and saving a newly drawn zone. Fields: Name (required), Description (textarea), Category (dropdown from incident categories). Shows vertex count and approximate area. Auto-closes the GeoJSON polygon ring before submission. |

### Updated Files

| File | Change |
|:--|:--|
| `src/admin-web/src/components/Map/AdminMap.jsx` | **Major additions:** |
| | • New props: `mapMode`, `drawVertices`, `isPolygonClosed`, `onDrawVertexAdd`, `onDrawClose`, `onDrawCancel` |
| | • Added `'draw-preview'` GeoJSON source + 4 layers: `draw-preview-fill` (blue, opacity 0.06), `draw-preview-line` (blue, dashed [4,3], opacity 0.7), `draw-preview-vertices` (white dot, blue stroke, radius 5), `draw-preview-rubber` (dashed line to cursor, opacity 0.5) |
| | • `useEffect` rebuilds draw-preview features when `drawVertices` / `isPolygonClosed` change |
| | • `useEffect` adds map click handler during polygon mode: clicks add vertices; clicking first vertex (within 15px) closes polygon |
| | • `useEffect` adds mousemove handler for rubber band line from last vertex to cursor |
| | • `useEffect` listens for Escape key to cancel drawing |
| | • `useEffect` changes cursor to `crosshair` during polygon mode |
| | • `useEffect` clears preview when leaving polygon mode |
| | • Guarded `dblclick` handler: during polygon mode with ≥2 vertices, closes polygon instead of creating incident |
| | • Guarded zone hover/click handlers: skip during polygon mode to prevent conflicts |
| | • Floating area pill shows vertex count, approximate area, and closing hint |
| `src/admin-web/src/components/Layout/DashboardLayout.jsx` | Added drawing state: `mapMode`, `drawVertices`, `isPolygonClosed`, `showZoneCreatePanel`. Added handlers: `handleSetMode`, `handleDrawVertexAdd`, `handleDrawClose`, `handleDrawCancel`, `handleZoneCreateSubmit`. Passes all drawing props to `AdminMap`. Renders `DrawingToolbar` inside map container. Renders `ZoneCreatePanel` in right panel when `showZoneCreatePanel` is true. Right panel opens for zone creation. |

### Drawing Flow

| Step | Action |
|:--|:--|
| 1 | Admin clicks "Polygon" button → cursor changes to crosshair |
| 2 | Click on map → drops vertex #1, white dot appears |
| 3 | Each subsequent click → adds vertex, line segments drawn between vertices |
| 4 | Rubber band line follows cursor from last placed vertex |
| 5 | Double-click OR click first vertex → polygon closes, Save button activates |
| 6 | Click Save → right panel shows ZoneCreatePanel with pre-filled geometry |
| 7 | Enter name, optional description/category, click Create Zone → POST to API |
| 8 | On success: drawing state clears, zones refresh, map returns to Pan mode |
| 9 | Press Escape OR click Cancel → abort drawing, clear all state |

### Key Technical Decisions

- **No mapbox-gl-draw dependency:** All drawing is implemented with custom GeoJSON sources and MapLibre event handlers to avoid Mapbox token dependencies.
- **Ref-based state access in event handlers:** `mapModeRef`, `drawVerticesRef`, and `isPolygonClosedRef` keep event handlers current without re-attaching listeners on every state change.
- **First-vertex click detection:** Uses `map.project()` to convert the first vertex to screen pixels, then measures distance to click point (15px tolerance) for intuitive polygon closing.
- **Auto-close GeoJSON ring:** `ZoneCreatePanel` ensures the polygon ring is closed (first == last coordinate) before submitting, satisfying Zod's `min(4)` validation.
- **Area calculation:** Simple shoelace formula with rough degree-to-km conversion (~111.32 km/°) — accurate enough for admin scale awareness.
- **Zone hover/click disabled during drawing:** Prevents accidental zone selection while placing vertices.

### Verified

| # | Test | Result |
|:--|:--|:--|
| 1 | `admin-web` build | ✅ Clean, zero errors |
| 2 | `user-web` build | ✅ Clean |
| 3 | `superadmin-web` build | ✅ Clean |
| 4 | Create zone via API (closed ring) | ✅ POST successful, zone returned |
| 5 | List zones | ✅ Both test zones visible |

### Git Commit

```
feat: add polygon drawing toolbar with click-to-place vertices, rubber band preview, and zone creation panel
```

*End of Phase 3*


---

## Phase 4: Zone Editing — Vertex Manipulation

**Date:** 2026-06-04
**Goal:** Allow admins to select an existing zone and edit its shape by dragging vertices, adding new vertices via midpoint handles, and deleting vertices.

### Files Created

| File | Purpose |
|---|---|
| `src/admin-web/src/components/Zones/ZoneEditPanel.jsx` | Form panel for editing zone metadata (name, description, category) + save/cancel/delete actions |

### Files Modified

| File | Change |
|---|---|
| `src/admin-web/src/components/Map/AdminMap.jsx` | Added editing mode props (`editingZoneId`, `editingZoneVertices`, `onVertexDrag`, `onMidpointClick`, `onVertexDoubleClick`). Added `edit-zone`, `edit-vertices`, `edit-midpoints` GeoJSON sources + layers (fill, outline, vertex handles, midpoint handles). Implemented vertex drag (mousedown → dragPan.disable → mousemove updates → mouseup → dragPan.enable), midpoint click-to-insert, vertex double-click-to-delete. Edited zone filtered from `zones` source while editing. Fixed existing dblclick closure bug by using refs for all callback props. |
| `src/admin-web/src/components/Layout/DashboardLayout.jsx` | Added edit state (`editingZoneId`, `editingZoneVertices`, `originalZoneVertices`). Added `handleEditZone` (deep-copies zone geometry, strips closing duplicate vertex), `handleVertexDrag`, `handleMidpointClick`, `handleVertexDoubleClick` (enforces min 3 vertices), `handleZoneEditSave` (closes ring + PATCH), `handleZoneEditCancel`, `handleZoneDelete` (confirm dialog + DELETE). `renderPanel` shows `ZoneEditPanel` when editing. `isPanelOpen` includes `!!editingZoneId`. DrawingToolbar hidden during editing. Edit state cleared on zone click, incident select, panel close, mode switch. |
| `src/admin-web/src/components/Map/DrawingToolbar.jsx` | Added `selectedZoneId` and `onEditZone` props. Conditional "Edit Zone" button (amber styling) appears when `mode === 'pan' && selectedZoneId`. |

### Interaction Design

1. **Select a zone** → click on map polygon → zone highlighted amber
2. **Edit Zone button** appears in toolbar → click → enters edit mode
3. **Visuals in edit mode:**
   - Zone renders with dashed amber outline (`#f59e0b`, dash `[4,3]`, opacity 0.9)
   - Fill opacity 0.12
   - White vertex handles (radius 6px, amber stroke 2px) at each polygon vertex
   - Amber midpoint handles (radius 4px, 60% opacity) at center of each edge
4. **Drag vertex** → mousedown on white handle → cursor `grabbing`, map pan disabled → drag reshapes polygon in real-time → mouseup releases
5. **Insert vertex** → click orange midpoint handle → new vertex inserted at that edge center
6. **Delete vertex** → double-click white handle → vertex removed (minimum 3 enforced)
7. **Save Changes** → PATCH zone with new geometry + metadata → toast success → exit edit mode
8. **Cancel** → revert to original shape, exit edit mode
9. **Delete Zone** → confirm dialog → DELETE → toast info → exit edit mode, refresh zones

### Edge Cases Handled

- **Double-click on midpoint during editing:** Guarded in dblclick handler — returns early to prevent deleting a freshly-inserted vertex
- **Double-click on empty area during editing:** Returns early — no incident creation
- **Minimum 3 vertices:** `handleVertexDoubleClick` ignores delete if `length <= 3`
- **Closing vertex duplication:** Stripped from `editingZoneVertices` on edit start, re-added on save
- **Drawing toolbar hidden during editing:** Prevents mode conflicts
- **Zone hover/click disabled during editing:** Prevents accidental zone selection
- **Ref-based callbacks in event handlers:** All map event handlers use refs to access latest callbacks without re-attaching listeners

### Verified

| # | Test | Result |
|:--|:--|:--|
| 1 | `admin-web` build | ✅ Clean, zero errors |
| 2 | `user-web` build | ✅ Clean |
| 3 | `superadmin-web` build | ✅ Clean |

### Git Commit

```
feat: add zone editing with draggable vertices, midpoint insertion, and vertex deletion
```

*End of Phase 4*

---

## Phase 5: Zone-Incident Integration & Management Panel

### Summary
Added a comprehensive zone management experience: dedicated zones list panel, spatial queries to find incidents inside zones, zone detail view with incident list, and color customization with preset swatches.

### Backend Changes

| File | Change |
|---|---|
| `src/backend/src/services/zone.service.js` | Added `getIncidentsInZone(zoneId)` using PostGIS `ST_Contains`. Added `incident_count` subquery to `listZones()`. |
| `src/backend/src/controllers/zone.controller.js` | Added `getZoneIncidentsController` — validates zone exists then returns incidents inside it. |
| `src/backend/src/routes/zone.routes.js` | Added `GET /:id/incidents` public route. |

### Frontend API

| File | Change |
|---|---|
| `src/admin-web/src/services/api.js` | Added `getZoneIncidents(id)` method. |

### New Components

| File | Purpose |
|---|---|
| `src/admin-web/src/components/Zones/ZoneManagementPanel.jsx` | Full zone list with search/filter by name, color swatch per row, incident count, approximate area. "+ New Zone" button triggers polygon drawing mode. Clicking a zone opens detail panel and flies map to zone bounds. |
| `src/admin-web/src/components/Zones/ZoneDetailPanel.jsx` | Zone detail with name, description, category, color bar, metadata cards (incidents, area, category), 8 preset color swatches (immediate PATCH on click), Edit/Delete/Back buttons, scrollable list of incidents inside the zone with severity dots. Clicking an incident opens incident detail panel. |

### Modified Components

| File | Change |
|---|---|
| `src/admin-web/src/components/Layout/TopBar.jsx` | Added "Zones" button (variant="secondary") next to "+ Add Incident". |
| `src/admin-web/src/components/Zones/ZoneEditPanel.jsx` | Added 8 preset color swatches. Color selection is included in the PATCH save payload (`fillColor` + `strokeColor`). |
| `src/admin-web/src/components/Map/AdminMap.jsx` | Added `fitBounds` prop. New `useEffect` calls `map.current.fitBounds()` when `fitBounds` changes, with configurable padding (default 40px) and duration (default 800ms). |
| `src/admin-web/src/components/Layout/DashboardLayout.jsx` | Major integration: added `selectedZone` and `fitBounds` state. `panelMode` now supports `'zones'` and `'zone-detail'`. `handleZoneClick` now looks up the full zone, sets `selectedZone`, switches to `'zone-detail'`, and computes `fitBounds` from polygon coordinates. Added `handleOpenZones`, `handleZoneDetailBack`, `handleZoneDetailEdit`, `handleZoneDetailDelete`, `handleZoneDetailColorChange`, `handleZoneIncidentSelect`, `handleNewZoneFromPanel`. `renderPanel()` renders `ZoneManagementPanel` and `ZoneDetailPanel` for their respective modes. Sync effect keeps `selectedZone` updated when zones list refreshes. `handleClosePanel` now also clears zone selection. |

### Zone Colors Preset

```
#9f1239 (crimson, default)  #dc2626 (red)   #f59e0b (amber)  #22c55e (green)
#3b82f6 (blue)              #a855f7 (purple) #14b8a6 (teal)   #6b7280 (gray)
```

### API Endpoints Verified

| Endpoint | Result |
|---|---|
| `GET /api/v1/zones` | ✅ Returns zones with `incident_count` |
| `GET /api/v1/zones/:id/incidents` | ✅ Returns incidents inside zone via ST_Contains |

### Build Status
- `admin-web` ✅
- `user-web` ✅
- `superadmin-web` ✅

### Git Commit

```
feat: add zone management panel, incident-in-zone spatial queries, and color customization
```

*End of Phase 5*

---

## 📅 2026-05-12 — Phase 1: Media Upload — Database Schema

### Summary
Created the `incident_media` table to store file upload metadata. This is the foundation for the local-to-cloud media storage pipeline. Postgres stores ONLY metadata — file blobs never enter the database.

### Objective
Phase 1 of the media upload feature: establish the database schema before building the storage layer, image processor, and API.

### Created Files

| File | Purpose |
|:---|:---|
| `docs/media-migration.sql` | Migration script for existing databases — creates `incident_media` table + indexes + trigger |

### Modified Files

| File | Change |
|:---|:---|
| `docs/database-schema.sql` | Appended `incident_media` CREATE TABLE, indexes, and `update_incident_media_updated_at` trigger to the master schema |

### Table Schema: `incident_media`

| Column | Type | Constraints | Description |
|:---|:---|:---|:---|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Unique media record ID |
| `incident_id` | UUID | NOT NULL, FK → incidents(id), CASCADE | Parent incident |
| `original_name` | VARCHAR(500) | NOT NULL | Original uploaded filename |
| `stored_name` | VARCHAR(500) | NOT NULL | UUID-based filename on disk/R2 |
| `file_type` | VARCHAR(20) | NOT NULL | `'image'` or `'video'` |
| `mime_type` | VARCHAR(50) | NOT NULL | `'image/webp'`, `'video/mp4'`, etc. |
| `file_size_bytes` | INTEGER | NOT NULL | Size after processing |
| `file_url` | TEXT | NOT NULL | Full URL or relative path |
| `thumbnail_url` | TEXT | — | Generated thumbnail URL (images only) |
| `width` | INTEGER | — | Image width in pixels |
| `height` | INTEGER | — | Image height in pixels |
| `is_processed` | BOOLEAN | DEFAULT true | Sharp/FFmpeg processing status |
| `processing_error` | TEXT | — | Error message if processing failed |
| `display_order` | INTEGER | DEFAULT 0 | Manual sort order in gallery |
| `uploaded_by` | UUID | FK → users(id) | Uploader audit trail |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Upload timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last modified timestamp |

### Indexes

| Name | Columns | Purpose |
|:---|:---|:---|
| `idx_media_incident` | `incident_id` | Fast lookup of all media for an incident |
| `idx_media_created` | `created_at DESC` | Gallery default sort order |
| `idx_media_type` | `incident_id, file_type` | Filter images vs videos per incident |

### Architecture Decisions

- **No file blobs in DB:** Only metadata is stored. Files live on disk (dev) or R2 (production).
- **ON DELETE CASCADE:** When an incident is deleted, all its media records are automatically cleaned up.
- **UUID filenames:** `stored_name` uses UUIDs to prevent collisions and avoid path traversal.
- **Separate thumbnail URL:** Thumbnails are first-class citizens — can be fetched independently of the full image.

### Next Phase
Phase 2 — Storage Abstraction Layer: `StorageEngine` interface + `LocalStorage` implementation.

### Git Commit

```
feat: add incident_media table for file upload metadata with indexes and audit fields
```

*End of Phase 1*

---

## 📅 2026-05-12 — Phase 2: Media Upload — Storage Abstraction Layer

### Summary
Built the swappable storage engine interface and the local disk implementation. The same code will work in production — only the `STORAGE_PROVIDER` env var changes (`local` → `r2`).

### Objective
Create a clean abstraction over file storage so that development uses local disk and production uses Cloudflare R2 with zero code changes.

### Created Files

| File | Purpose |
|:---|:---|
| `src/backend/src/storage/index.js` | Storage factory — reads `STORAGE_PROVIDER` env var and returns the correct engine instance |
| `src/backend/src/storage/local.storage.js` | Local disk implementation: writes to `./uploads/`, serves via Express static |

### Modified Files

| File | Change |
|:---|:---|
| `src/backend/package.json` | Added `multer` (^1.4.x) and `sharp` (^0.33.x) dependencies |
| `src/backend/.env.example` | Added `STORAGE_PROVIDER=local` and `UPLOAD_DIR=./uploads` |
| `src/backend/.env.development` | Added `STORAGE_PROVIDER=local` and `UPLOAD_DIR=./uploads` |
| `.gitignore` | Added `uploads/` — user-generated content must never be committed |

### StorageEngine Interface

Every storage engine implements the same contract:

```javascript
interface StorageEngine {
  upload(buffer, filename, contentType) → Promise<string>  // Returns public URL
  getUrl(filename) → string                                 // Returns public URL
  delete(filename) → Promise<void>                          // Silently ignores ENOENT
}
```

### LocalStorage Implementation

| Method | Behavior |
|:---|:---|
| `upload(buffer, filename, contentType)` | Creates subdirectories as needed, writes buffer to disk, returns `\${API_URL}/uploads/\${filename}` |
| `getUrl(filename)` | Constructs the full public URL from `API_URL` + `/uploads/` + filename |
| `delete(filename)` | Removes file from disk; silently returns if file does not exist (idempotent) |

**Path resolution:** `UPLOAD_DIR` defaults to `../../../../uploads` relative to `src/backend/src/storage/`, which resolves to the project root `./uploads/`.

### Verification Results

| Test | Result |
|:---|:---|
| Engine loads as `LocalStorage` | ✅ |
| Upload writes file to correct path | ✅ |
| URL generation matches expected format | ✅ (`http://localhost:3000/uploads/...`) |
| Delete removes file | ✅ |
| Delete is idempotent (no error on missing file) | ✅ |
| Subdirectories auto-created | ✅ |

### Architecture Decisions

- **`multer.memoryStorage()`** (not diskStorage): Files are held in RAM buffers so Sharp can process them before any disk write. This means the storage engine decides where and how to persist — not Multer.
- **UUID filenames in `stored_name`:** The actual filename on disk is a UUID. The `original_name` column preserves the user's original filename for display.
- **Folder-per-incident:** Files are organized as `uploads/incidents/\${incidentId}/\${uuid}.webp` to keep related media together and simplify cleanup.
- **Idempotent delete:** `LocalStorage.delete()` catches `ENOENT` and returns cleanly. This prevents crashes during cleanup if a file was already removed.

### Next Phase
Phase 3 — Image Processing Pipeline: Sharp-based WebP conversion + thumbnail generation.

### Git Commit

```
feat: add storage abstraction layer with LocalStorage engine and multer/sharp deps
```

*End of Phase 2*

---

## 📅 2026-05-12 — Phase 3: Media Upload — Image Processing Pipeline

### Summary
Built the Sharp-based image processor that converts uploads to WebP, resizes oversized images, and generates smart-cropped thumbnails. All image formats (JPEG, PNG, GIF, WebP, AVIF) are supported. Videos are detected but passed through unprocessed until Phase 9.

### Objective
Create a server-side image processing pipeline that runs in BOTH local and production environments. Every uploaded image gets compressed and converted to WebP before storage.

### Created Files

| File | Purpose |
|:---|:---|
| `src/backend/src/utils/image-processor.js` | Sharp pipeline: resize → WebP conversion → thumbnail generation + mime type detectors |

### Functions

```javascript
processImage(inputBuffer, originalMimeType)
  → { originalBuffer, thumbnailBuffer, width, height }

isProcessableImage(mimeType) → boolean
isVideo(mimeType) → boolean
```

### Configuration Constants

| Constant | Value | Rationale |
|:---|:---|:---|
| `MAX_IMAGE_WIDTH` | 1920 | Full HD width — enough detail without bloat |
| `MAX_IMAGE_HEIGHT` | 1080 | Full HD height |
| `THUMB_WIDTH` | 300 | Gallery thumbnail width |
| `THUMB_HEIGHT` | 200 | Gallery thumbnail height (3:2 ratio) |
| `WEBP_QUALITY` | 80 | Good quality, ~60% smaller than JPEG |
| `limitInputPixels` | 268,402,689 | Prevents DoS via giant images (~16K²) |

### Processing Pipeline

```
Input Buffer
    │
    ├──► Sharp pipeline.clone().metadata()
    │         → returns { width, height } (original dimensions)
    │
    ├──► Sharp(inputBuffer)
    │       .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
    │       .webp({ quality: 80, effort: 4 })
    │       .toBuffer()
    │         → originalBuffer (main image, WebP)
    │
    └──► Sharp(inputBuffer)
              .resize(300, 200, { fit: 'cover', position: 'attention' })
              .webp({ quality: 70, effort: 4 })
              .toBuffer()
                → thumbnailBuffer (smart-cropped thumbnail, WebP)
```

### Key Behaviors

| Behavior | Detail |
|:---|:---|
| **Small images** (< 1920×1080) | Not enlarged — only converted to WebP (`withoutEnlargement: true`) |
| **Large images** (> 1920×1080) | Downscaled to fit within 1920×1080 bounding box, aspect ratio preserved (`fit: 'inside'`) |
| **Thumbnail crop** | `attention` strategy uses Sharp's entropy detection to crop to the most visually interesting area |
| **Error tolerance** | `failOnError: false` allows partially corrupt images to still process |
| **DoS protection** | `limitInputPixels` caps input at ~16K × 16K pixels |

### Supported Formats

| Input | Processed? | Output |
|:---|:---|:---|
| JPEG | ✅ | WebP |
| PNG | ✅ | WebP |
| WebP | ✅ | WebP (re-encoded) |
| GIF | ✅ | WebP (static frame) |
| AVIF | ✅ | WebP |
| MP4 | ❌ (Phase 9) | Stored as-is |
| WebM | ❌ (Phase 9) | Stored as-is |
| MOV | ❌ (Phase 9) | Stored as-is |
| PDF | ❌ | Rejected by `isProcessableImage` |
| SVG | ❌ | Rejected by `isProcessableImage` |

### Verification Results

Ran 35 automated tests covering all supported formats, edge cases, and dimension scenarios:

| Test Category | Tests | Result |
|:---|:---|:---|
| MIME type detection (images) | 9 | ✅ All passed |
| MIME type detection (videos) | 7 | ✅ All passed |
| Small image (400×300) | 10 | ✅ All passed — not enlarged, WebP output, correct thumbnail dims |
| Large image (3000×2000) | 6 | ✅ All passed — resized to ≤1920×1080, aspect ratio preserved |
| Extreme aspect ratio (300×15000) | 2 | ✅ All passed — height capped at 1080 |
| JPEG → WebP conversion | 1 | ✅ All passed |
| **Total** | **35** | **✅ 35/35 passed** |

### Architecture Decisions

- **Two-pass Sharp processing:** The main image and thumbnail are processed independently from the original buffer. This ensures the thumbnail gets full source quality for cropping, not a pre-downscaled version.
- **`effort: 4` for WebP:** A balanced setting between encoding speed and file size. Higher effort = smaller files but slower. For a backend upload API, 4 is the sweet spot.
- **Thumbnail quality 70 vs main 80:** Thumbnails are smaller and viewed at reduced size, so slightly lower quality is imperceptible but saves bytes.
- **Dimensions from metadata, not output:** `width` and `height` returned are the ORIGINAL image dimensions (from `metadata()`), not the processed output. This preserves the source resolution in the database for display purposes.

### Dependencies

`sharp` was installed in Phase 2 alongside `multer`. No additional packages needed.

### Next Phase
Phase 4 — Backend Media API: upload/list/delete endpoints, Multer integration, and wiring into `server.js`.

### Git Commit

```
feat: add Sharp image processor with WebP conversion, resize, and smart thumbnail generation
```

*End of Phase 3*

---

## 📅 2026-05-12 — Phase 4: Media Upload — Backend Media API

### Summary
Created the complete backend API for media uploads: upload, list, delete, and reorder endpoints. Integrated Multer (memory storage), Sharp image processing, the storage abstraction layer, and database persistence. Updated the frontend API client with media methods and fixed the FormData content-type bug.

### Objective
Build the full backend API surface for media management with proper auth guards, validation, and error handling.

### Created Files

| File | Purpose |
|:---|:---|
| `src/backend/src/services/media.service.js` | Database CRUD for `incident_media`: list, create, delete, getById, updateDisplayOrder |
| `src/backend/src/controllers/media.controller.js` | Upload (process + store + persist), list, delete (storage + DB), reorder |
| `src/backend/src/validators/media.schema.js` | Zod schemas: `reorderMediaSchema` with `displayOrder: number.int().min(0)` |
| `src/backend/src/routes/media.routes.js` | Express router with Multer config, auth guards, asyncHandler, and validation |

### Modified Files

| File | Change |
|:---|:---|
| `src/backend/server.js` | Imported `mediaRoutes` and mounted at `/api/v1/incidents/:id/media` |
| `src/admin-web/src/services/api.js` | Added `uploadMedia`, `listMedia`, `deleteMedia`, `reorderMedia` methods; **fixed FormData content-type bug** — `request()` no longer forces `application/json` when `body instanceof FormData` |

### API Endpoints

| Method | Path | Auth | Role | Description |
|:---|:---|:---|:---|:---|
| `GET` | `/incidents/:id/media` | — | Public | List all media for an incident |
| `POST` | `/incidents/:id/media` | Bearer JWT | admin, super_admin | Upload a file (image/video) |
| `DELETE` | `/incidents/:id/media/:mediaId` | Bearer JWT | admin, super_admin | Delete media (storage + DB) |
| `PATCH` | `/incidents/:id/media/:mediaId/order` | Bearer JWT | admin, super_admin | Update display order |

### Multer Configuration

```javascript
storage: multer.memoryStorage()     // Files held in RAM for Sharp processing
limits:
  fileSize: 50MB                    // Per-file max
  files: 10                         // Per-request max
fileFilter:                          // Whitelist: jpeg, png, webp, gif, avif, mp4, webm, quicktime
```

### Upload Controller Flow

```
1. Validate file exists (req.file)
2. Detect file type via isProcessableImage / isVideo
3. Reject unsupported types → 400 VALIDATION_ERROR
4. Generate UUID-based storedName
5. IF image:
   a. processImage() → { originalBuffer, thumbnailBuffer, width, height }
   b. storage.upload(originalBuffer) → fileUrl
   c. storage.upload(thumbnailBuffer) → thumbnailUrl
6. IF video:
   a. storage.upload(rawBuffer) → fileUrl (no processing yet)
7. mediaService.createMediaRecord() → persist metadata to Postgres
8. Return { media: record }
```

### Delete Controller Flow

```
1. Fetch media record from DB
2. Not found → 404 NOT_FOUND
3. Parse file_url → extract relative path from /uploads/ prefix
4. storage.delete(relativePath) → remove main file
5. If thumbnail exists → storage.delete(thumbnailPath)
6. mediaService.deleteMediaRecord() → remove DB row
7. Return { deleted: true }
```

### Key Design Decisions

- **`crypto.randomUUID()` instead of `uuid` package:** Native Node.js 22 feature — zero new dependencies.
- **`req.params.id` for incident ID:** Consistent with existing timeline and source controllers (mounted at `/incidents/:id/...`).
- **`asyncHandler` on all route handlers:** Follows existing backend pattern — eliminates try/catch boilerplate, ensures unhandled promise rejections are caught by Express error middleware.
- **Multer errors propagate to error handler:** If `fileFilter` rejects a file, Multer calls `next(err)` which reaches the centralized error handler.
- **FormData content-type fix:** The frontend `request()` helper was unconditionally setting `Content-Type: application/json`. With FormData uploads, the browser MUST set its own `multipart/form-data` boundary. The fix checks `!(options.body instanceof FormData)` before setting the header.

### Verification Results

| Test | Method | Result |
|:---|:---|:---|
| Server module loads | `node -e import('./server.js')` | ✅ |
| All media modules load | `Promise.all([service, controller, routes, schema])` | ✅ |
| End-to-end pipeline | Direct module calls | ✅ Image → Sharp (WebP + thumb) → Storage → DB → Reorder → Delete → Cleanup |
| Public list endpoint | `GET /incidents/:id/media` | ✅ Returns `{ success: true, data: { media: [] } }` |
| Auth rejection | `POST /incidents/:id/media` (no token) | ✅ Returns 401 UNAUTHORIZED |
| Admin-web build | `vite build` | ✅ 2097 modules, 1.19MB JS, 75KB CSS |

### Architecture Notes

- **Route mount order:** `/api/v1/incidents/:id/media` is mounted AFTER timeline and source routes, but this is safe because Express `app.use()` with distinct path prefixes does not conflict. The incident router's `/:id` pattern matches only single path segments, so `/abc/media` falls through to the media router.
- **No audit logging yet:** Media operations are not audited. This can be added later by following the timeline controller's `auditLog()` pattern.

### Next Phase
Phase 5 — Static File Serving: Express `static` middleware for `/uploads` so browsers can fetch processed images.

### Git Commit

```
feat: add backend media API with upload/list/delete/reorder, multer integration, and FormData fix
```

*End of Phase 4*

---

## 📅 2026-05-12 — Phase 5: Media Upload — Static File Serving

### Summary
Added Express `static` middleware to serve uploaded files from the `./uploads` directory. Files are now accessible via `GET /uploads/...` with proper cache headers. The middleware is placed BEFORE rate limiting so image requests don't consume API quota.

### Objective
Enable browsers to fetch processed images and thumbnails directly via HTTP.

### Modified Files

| File | Change |
|:---|:---|
| `src/backend/server.js` | Added `express.static()` middleware for `/uploads` path; imports `path` and `url` modules for `__dirname` resolution in ESM |

### Middleware Placement

```
CORS
Body Parsing
Response Wrapper
SSE Stream
← NEW: Static File Serving (/uploads)
Rate Limiting      ← static files skip this
API Routes
404 Handler
Error Handler
```

### Static Configuration

```javascript
app.use('/uploads', express.static(UPLOAD_DIR, {
  maxAge: '1d',      // Cache for 86,400 seconds
  immutable: true,   // Tell browsers the content never changes at this URL
}));
```

**Why `immutable: true`?** Every uploaded file has a UUID-based filename. The same URL will always serve the same bytes. If a file is re-uploaded, it gets a new UUID and a new URL. This makes aggressive caching safe.

**Why before rate limiting?** Image-heavy pages (galleries, maps with thumbnails) could trigger hundreds of requests. Static files should not count toward the API rate limit.

### Path Resolution

| Variable | Value | Resolved To |
|:---|:---|:---|
| `UPLOAD_DIR` (from env) | `./uploads` | Relative to cwd where `node` is started |
| `UPLOAD_DIR` (fallback) | `join(__dirname, '../../uploads')` | Project root `/uploads` |

Both `LocalStorage` and the static middleware use the same `UPLOAD_DIR` resolution logic, ensuring files are written and served from the same location.

### Verification Results

| Test | Result |
|:---|:---|
| Server module loads | ✅ |
| Text file served | ✅ `200 OK`, `Cache-Control: public, max-age=86400, immutable` |
| WebP image served | ✅ `200 OK`, `Content-Type: image/webp`, correct byte size |
| Admin-web build | ✅ Clean |

### Response Headers (Example)

```
HTTP/1.1 200 OK
Cache-Control: public, max-age=86400, immutable
Last-Modified: Thu, 04 Jun 2026 15:48:18 GMT
Content-Type: image/webp
```

### Next Phase
Phase 6 — Frontend Upload Components: Drag-and-drop file uploader (`MediaUploader.jsx`).

### Git Commit

```
feat: add Express static middleware for /uploads with cache headers, placed before rate limiting
```

*End of Phase 5*

---

## 📅 2026-05-12 — Phase 6: Media Upload — Frontend Upload Component

### Summary
Built `MediaUploader.jsx`, a drag-and-drop file uploader component for the admin dashboard. Supports click-to-select, drag-and-drop, multi-file upload, per-file progress tracking, and Lucide icons for visual consistency.

### Objective
Provide an intuitive file upload UI that admins can drop into any incident detail/form view.

### Files Created

| File | Description |
|:---|:---|
| `src/admin-web/src/components/Media/MediaUploader.jsx` | Drag-and-drop uploader with per-file progress |

### Files Modified

| File | Change |
|:---|:---|
| `src/admin-web/src/index.css` | Added `.media-uploader`, `.media-dropzone`, `.media-upload-progress`, `.media-upload-item` and status variants |

### Component API

```jsx
<MediaUploader
  onUpload={(file) => api.uploadMedia(incidentId, file)}
  accept="image/*,video/*"
  maxFiles={10}
  disabled={false}
/>
```

| Prop | Type | Default | Description |
|:---|:---|:---|:---|
| `onUpload` | `(file) => Promise<void>` | **required** | Called for each file individually |
| `accept` | `string` | `'image/*,video/*'` | `<input accept>` attribute |
| `maxFiles` | `number` | `10` | Max files per batch |
| `disabled` | `boolean` | `false` | Disables the dropzone |

### Key Features

1. **Drag & Drop**: Files dropped on the zone are processed sequentially.
2. **Click to Select**: Hidden `<input type="file" multiple>` triggered by clicking the zone.
3. **Per-File Progress**: Each file gets a row with status indicator (uploading / done / error).
4. **Lucide Icons**: Uses `Upload`, `Image`, `Film`, `Loader2`, `CheckCircle`, `XCircle` for consistent iconography.
5. **Status Color Coding**:
   - Uploading: cyan left border + spinning loader
   - Done: green left border + checkmark
   - Error: red left border + X circle
6. **Input Reset**: File input value is reset after selection so the same file can be re-selected.

### CSS Classes Added

| Class | Purpose |
|:---|:---|
| `.media-uploader` | Container wrapper |
| `.media-dropzone` | Clickable drag target (dashed border, hover → cyan) |
| `.media-dropzone.dragging` | Active drag state (cyan border + subtle tint) |
| `.media-dropzone.disabled` | Dimmed, `not-allowed` cursor |
| `.media-upload-progress` | List container for status rows |
| `.media-upload-item` | Individual file row (flex, truncated name) |
| `.media-upload-item.uploading/.done/.error` | Status-specific left-border color |
| `.media-upload-spinner` | Spinning `Loader2` using existing `@keyframes spin` |

### Design System Compliance

- Uses CSS variables from `design-tokens.css`: `--bg-surface`, `--bg-hover`, `--text-primary`, `--text-secondary`, `--text-muted`, `--accent-cyan`, `--success`, `--danger`, `--radius-md`, `--radius-sm`, `--border-color`
- No external UI libraries — pure React + CSS
- Dark theme first, no light-mode-specific overrides needed (variables handle it)

### Verification Results

| Test | Result |
|:---|:---|
| Admin-web build | ✅ Clean, no errors |
| Component exports correctly | ✅ Named export `MediaUploader` |
| CSS loads (part of index.css bundle) | ✅ 77.22 kB CSS bundle |

### Notes

- Component is **not yet wired** into `IncidentDetailPanel` or `IncidentForm` — that integration is Phase 8 (Form Integration).
- The component accepts an `onUpload` callback so it stays decoupled from the API layer. Any parent can pass `api.uploadMedia` or a custom handler.

### Next Phase
Phase 7 — Frontend Media Gallery & Viewer: `MediaGallery.jsx` + `MediaLightbox.jsx`

### Git Commit

```
feat(admin-web): add MediaUploader drag-and-drop component with per-file progress and Lucide icons
```

*End of Phase 6*

---

## 📅 2026-05-12 — Phase 7: Media Upload — Frontend Gallery & Lightbox

### Summary
Built `MediaGallery.jsx` (thumbnail grid with image/video sections and delete buttons) and `MediaLightbox.jsx` (full-screen image viewer with keyboard navigation). Both components use Lucide icons for visual consistency with the rest of the admin dashboard.

### Objective
Display uploaded media as a thumbnail grid and provide a polished full-screen viewer for images.

### Files Created

| File | Description |
|:---|:---|
| `src/admin-web/src/components/Media/MediaGallery.jsx` | Thumbnail grid separating images and videos, opens lightbox on click |
| `src/admin-web/src/components/Media/MediaLightbox.jsx` | Full-screen viewer with prev/next arrows, keyboard nav, image counter, dims |

### Files Modified

| File | Change |
|:---|:---|
| `src/admin-web/src/index.css` | Added gallery grid styles, lightbox overlay/nav/loader styles (~200 lines) |

### Component APIs

#### MediaGallery

```jsx
<MediaGallery
  media={mediaList}
  onDelete={(mediaId) => api.deleteMedia(incidentId, mediaId)}
  canEdit={true}
/>
```

| Prop | Type | Default | Description |
|:---|:---|:---|:---|
| `media` | `Array<MediaItem>` | `[]` | List of media objects from API |
| `onDelete` | `(mediaId) => void` | `undefined` | Called when delete button clicked |
| `canEdit` | `boolean` | `false` | Shows delete buttons on hover |

**Features:**
- Separates images and videos into sections with Lucide `Camera` and `Video` icons
- Responsive grid: `repeat(auto-fill, minmax(120px, 1fr))`
- Lazy-loaded thumbnails via `loading="lazy"`
- Delete button appears on hover (opacity 0 → 1 transition)
- Clicking an image opens the lightbox at the correct index

#### MediaLightbox

```jsx
<MediaLightbox
  items={imageList}
  startIndex={0}
  onClose={() => setLightboxIndex(null)}
/>
```

| Prop | Type | Default | Description |
|:---|:---|:---|:---|
| `items` | `Array<MediaItem>` | **required** | Images to navigate through |
| `startIndex` | `number` | `0` | Initial image index |
| `onClose` | `() => void` | **required** | Called on close (Escape, click backdrop, X button) |

**Features:**
- **Keyboard navigation:** `Escape` closes, `ArrowRight` next, `ArrowLeft` prev
- **Body scroll lock:** `document.body.style.overflow = 'hidden'` while open
- **Backdrop blur:** `backdrop-filter: blur(4px)` on dark overlay
- **Prev/Next arrows:** Lucide `ChevronLeft` / `ChevronRight`, hidden when only 1 image
- **Loading spinner:** `Loader2` with `spin` animation while image loads
- **Info bar:** Counter (`3 / 7`), original filename, dimensions (`1920 × 1080`)
- **Wrap-around navigation:** Last → First and First → Last via modulo arithmetic

### CSS Classes Added

| Class | Purpose |
|:---|:---|
| `.media-gallery` | Container wrapper |
| `.media-section` | Image or video section block |
| `.media-section-title` | Uppercase section header with icon |
| `.media-grid` | CSS Grid for thumbnails |
| `.media-grid-item` | Individual thumbnail cell with hover border |
| `.media-delete-btn` | Absolute-positioned delete button (hover reveal) |
| `.media-video-item` | Video-specific pointer-events toggle |
| `.media-lightbox` | Fixed-position overlay (z-index: 9999) |
| `.media-lightbox-backdrop` | Dark blurred backdrop |
| `.media-lightbox-content` | Centered content container |
| `.media-lightbox-close` | Top-right close button |
| `.media-lightbox-nav` | Side arrow buttons (prev/next) |
| `.media-lightbox-image-wrap` | Image container with min dimensions |
| `.media-lightbox-image` | Actual image with fade-in on load |
| `.media-lightbox-loader` | Spinner overlay while loading |
| `.media-lightbox-info` | Bottom info bar (counter, name, dims) |

### Design System Compliance

- Uses CSS variables: `--bg-hover`, `--bg-surface`, `--text-primary`, `--text-secondary`, `--text-muted`, `--accent-cyan`, `--danger`, `--radius-sm`, `--radius-md`, `--border-color`
- Lucide icons throughout (`Camera`, `Video`, `X`, `ChevronLeft`, `ChevronRight`, `Loader2`)
- No external UI libraries — pure React + CSS
- Dark theme first, no light-mode-specific overrides needed

### Verification Results

| Test | Result |
|:---|:---|
| Admin-web build | ✅ Clean, 2.43s |
| CSS bundle | ✅ 80.60 kB (includes all media styles) |
| Component exports | ✅ Named exports `MediaGallery`, `MediaLightbox` |

### Notes

- Components are **not yet wired** into `IncidentDetailPanel` — integration is Phase 8 (Form Integration).
- Videos display inline with native `<video controls>` in the gallery; no lightbox support for videos (they have their own controls).
- Delete buttons are only visible on hover to keep the grid clean.

### Next Phase
Phase 8 — Incident Form Integration: Wire `MediaUploader` + `MediaGallery` into `IncidentDetailPanel` and `IncidentForm`.

### Git Commit

```
feat(admin-web): add MediaGallery thumbnail grid and MediaLightbox fullscreen viewer
```

*End of Phase 7*

---

## 📅 2026-05-12 — Phase 8: Media Upload — Incident Form Integration

### Summary
Wired `MediaUploader` and `MediaGallery` into `IncidentDetailPanel.jsx` so admins can upload, view, and delete media directly from the incident detail view. Also added a post-creation toast in `DashboardLayout.jsx` to guide users to the media upload feature.

### Objective
Make the media upload pipeline fully usable from the admin dashboard UI.

### Files Modified

| File | Change |
|:---|:---|
| `src/admin-web/src/components/IncidentDetail/IncidentDetailPanel.jsx` | Added media state, fetch effect, upload/delete handlers, Media section JSX |
| `src/admin-web/src/components/Layout/DashboardLayout.jsx` | Added post-creation toast hinting users to upload media in the detail panel |

### IncidentDetailPanel Changes

#### New Imports
```jsx
import { Image } from 'lucide-react';
import { MediaUploader } from '../Media/MediaUploader.jsx';
import { MediaGallery } from '../Media/MediaGallery.jsx';
```

#### New State
```jsx
const [media, setMedia] = useState([]);
const [mediaLoading, setMediaLoading] = useState(false);
```

#### Media Fetch Effect
Fetches media list whenever `incidentId` changes:
```jsx
useEffect(() => {
  if (!incidentId) return;
  setMediaLoading(true);
  api.listMedia(incidentId)
    .then((res) => setMedia(res.data?.media || []))
    .catch(() => setMedia([]))
    .finally(() => setMediaLoading(false));
}, [incidentId]);
```

#### Upload Handler
```jsx
const handleUploadMedia = async (file) => {
  const res = await api.uploadMedia(incidentId, file);
  setMedia((prev) => [...prev, res.data.media]);
};
```

#### Delete Handler
```jsx
const handleDeleteMedia = async (mediaId) => {
  if (!confirm('Delete this file?')) return;
  await api.deleteMedia(incidentId, mediaId);
  setMedia((prev) => prev.filter((m) => m.id !== mediaId));
};
```

#### JSX Placement
The Media section is inserted **after the Timeline section** and **before the Resolve Modal / Actions bar**. It includes:
- A header with "Media" label and a count badge (matching Timeline header style)
- `MediaUploader` component
- Empty state: dashed border box with `Image` icon and "No media yet" text
- Loading state: "Loading media..." text
- `MediaGallery` with `canEdit={true}`

### DashboardLayout Changes

In the `handleSubmit` function's create path, after the existing grace-period toast check, a new toast is conditionally shown:

```jsx
if (!graceToastShown) {
  setToast({
    message: 'Incident created. Add photos and videos in the detail panel.',
    type: 'success',
  });
}
```

**Why conditional?** If the incident has an `end_date` in the past, a grace-period warning toast is already shown. That warning is more important, so the media hint is suppressed in that case to avoid overwriting it.

### Design Decisions

1. **No media in create form** — Following Option A from the spec: media can only be uploaded after an incident exists (needs `incident_id` FK). The form remains unchanged.
2. **Detail panel integration** — Media appears alongside Timeline as a peer content section, keeping the layout consistent.
3. **Empty state** — Matches the Timeline empty state pattern (dashed border, icon, helper text).
4. **Count badge** — Reuses the same pill style as the Timeline "Updates" count for visual consistency.

### Verification Results

| Test | Result |
|:---|:---|
| Admin-web build | ✅ Clean, 2.41s |
| JS bundle | ✅ 1,198.38 kB (delta: +8.46 kB from new components) |
| Module count | ✅ 2100 (was 2097) |
| No new warnings | ✅ Only existing MapLibre chunk size warning |

### End-to-End Flow (Post-Phase 8)

1. Admin double-clicks map → create form opens
2. Admin fills form → clicks "Create Incident"
3. Toast: "Incident created. Add photos and videos in the detail panel."
4. Detail panel opens automatically
5. Admin sees "Media" section with uploader
6. Admin drags files → sequential upload with progress
7. Uploaded files appear in gallery grid
8. Admin clicks thumbnail → lightbox opens
9. Admin hovers + clicks × → file deleted (confirm dialog)

### Next Phase
Phase 9 — Video Upload Support: Video processing placeholder + video player enhancements.

### Git Commit

```
feat(admin-web): wire MediaUploader and MediaGallery into IncidentDetailPanel with post-creation toast hint
```

*End of Phase 8*
