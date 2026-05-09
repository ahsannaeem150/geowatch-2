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
