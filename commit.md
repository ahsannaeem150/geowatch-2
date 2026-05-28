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
