# GeoWatch — Agent Guide

> This file is written for AI coding agents. Read it first when working on GeoWatch. It describes the project's actual architecture, conventions, commands, and gotchas as of the latest codebase state.

---

## 1. Project Overview

**GeoWatch** is a map-based global conflict and major-events visualization platform — a tactical intelligence dashboard with a premium newsroom aesthetic. The platform has three web frontends and one shared backend:

- **user-web** (`:5173`) — Public website: home page, interactive `/map` explorer, incident/zone detail pages, about page. Read-only plus Google sign-in for saving/bookmarking incidents.
- **admin-web** (`:5174`) — Internal staff dashboard for creating and curating incidents, timeline updates, sources, media, and polygon zones.
- **superadmin-web** (`:5175`) — System console for super admins (staff + public user management, audit/activity logs, taxonomy, recycle bin, system health, data export, X-archive debug).
- **backend** (`:3000`) — Express REST API with JWT auth, PostGIS queries, SSE broadcasting, audit logging, notifications, and media upload processing.

The code lives in a single npm-workspace monorepo. The database is PostgreSQL 16 with PostGIS 3. Map tiles are served by a self-hosted Martin binary reading a local `.mbtiles` file; map styles and font glyphs are self-hosted from `assets/`.

---

## 2. Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend frameworks | React 18 + Vite 5 + React Router DOM 7 |
| Map rendering | MapLibre GL JS 4.x |
| Backend runtime | Node.js >= 20 + Express 4 (ESM — all packages use `"type": "module"`) |
| Database | PostgreSQL 16 + PostGIS 3 |
| Real-time | Server-Sent Events (SSE) over HTTP |
| Tile server | Martin v1.8.2 (self-hosted binary in `tools/`) |
| Auth | JWT (`jsonwebtoken`) + `bcryptjs` + Google OAuth for public users |
| Validation | Zod |
| Date handling | `date-fns` |
| Icons | `lucide-react` |
| Animation | `framer-motion` (user-web only) |
| Image processing | Sharp (WebP + thumbnail) |
| File uploads | Multer |
| Storage abstraction | Local disk (`./uploads`) with a factory ready for Cloudflare R2 |
| Monorepo | npm workspaces |

### Workspace Packages

- `src/backend` — `geowatch-backend`
- `src/user-web` — `geowatch-user-web`
- `src/admin-web` — `geowatch-admin-web`
- `src/superadmin-web` — `geowatch-superadmin-web`

### Key Dependency Versions (from each workspace's `package.json`)

- Backend: `express` ^4.19.2, `pg` ^8.12.0, `zod` ^3.23.8, `jsonwebtoken` ^9.0.2, `bcryptjs` ^2.4.3, `express-rate-limit` ^7.3.1, `multer` ^2.1.1, `sharp` ^0.34.5, `playwright` ^1.61.0, `nodemon` (dev)
- Frontends: `react` ^18.3.1, `vite` ^5.3.1, `maplibre-gl` ^4.5.0 (user-web + admin-web), `react-router-dom` ^7.15.0, `date-fns` ^3.6.0
- user-web extras: `framer-motion` ^12.40.0, `lucide-react` ^1.17.0
- superadmin-web extras: `lucide-react` ^0.468.0
- Note: `lucide-react` versions differ across workspaces and admin-web does not declare it directly — npm workspace hoisting makes the import resolve anyway. Do not "fix" this by adding dependencies without checking the lockfile behavior first.

---

## 3. Project Structure

```
geowatch/
├── src/
│   ├── backend/              # Express API
│   │   ├── server.js         # App entry point; mounts CORS, SSE, static uploads, rate limits, routes
│   │   └── src/
│   │       ├── config/       # database.js, env.js
│   │       ├── controllers/  # Express route handlers
│   │       ├── services/     # Business logic + SQL queries
│   │       ├── routes/       # Express routers
│   │       ├── middleware/   # auth, role, rate-limiter, validate-request, error-handler, response-wrapper
│   │       ├── validators/   # Zod schemas
│   │       ├── storage/      # local.storage.js + index.js (getStorageEngine factory)
│   │       └── utils/        # api-response, async-handler, audit-log, audit-actions, sse-broadcast,
│   │                         # image-processor, video-processor (placeholder), oembed, x-oembed,
│   │                         # x-screenshot, slugify
│   ├── user-web/             # Public website
│   ├── admin-web/            # Admin dashboard
│   ├── superadmin-web/       # Superadmin console
│   └── shared/               # Cross-app design tokens, constants, shared components, hooks
├── assets/                   # map-style-{dark,light}.json, fonts/ (Noto Sans fontstacks), tiles/ (gitignored .mbtiles)
├── docs/                     # api-spec.md, database-schema.sql, design-brief.md, env-template.md,
│                             # incident-taxonomy.md, grant-permissions.sql, migrations/
├── scripts/                  # Service launcher/stopper/logs + Playwright verification & screenshot utilities
├── uploads/                  # Local user-generated content (gitignored)
├── tools/                    # Downloaded martin binary (gitignored)
├── seeds.sql                 # Sample dev data
├── commit.md                 # Full build history (append every change)
├── handoff.md                # Current project state and focus
├── trialRoutes.md            # Reference for active design/trial routes
├── PROJECT.md                # Architecture, conventions, and requirements traceability
└── AGENTS.md                 # This file
```

### Shared Code (`src/shared/`)

Each frontend imports shared code through the `@shared` Vite alias (`resolve.alias` in each `vite.config.js`).

- `design-tokens.css` — Dark-first CSS variable system (Crimson Seal theme) with light-mode overrides via `[data-theme="light"]`.
- `constants.js` — Severity scale, event statuses, source types, user roles, verification statuses, API base URL, Martin URL.
- `theme-context.jsx`, `useTheme.js`, `useStyle.js` — Light/dark and interface-style providers/hooks. Supported styles: `tactical` (default), `saas`, `glass` (persisted in `localStorage`, applied via the `data-style` HTML attribute).
- `components/` — `Button`, `Badge`, `SeverityBadge`, `Skeleton`, `TimelineEntry`, `MapContextMenu`, `MapLegend`, `ThemeToggle`, `MediaGallery`, `MediaLightbox`, `ConfirmDialog`, `DateTimePicker`, `ZoneSvgOverlay`, `GhostIncidentBanner`, `RightPanelCollapseButton`.
- `components/incident-detail/` — Shared incident detail package (sidebar + full page + evidence rail + timeline items + X-post list + source cards). Reused across all three frontends.
- `components/zone/` — Shared zone/polygon detail components (`ZoneDetailSidebar`, `ZoneDetailPage`, `ZoneEditorSidebar`) plus trial-only styles/components.
- `marker-builder.js`, `marker-icons.js` — Map marker generation helpers.
- `styles/incident-detail.css`, `media-components.css` — Imported in each app's `main.jsx`.
- `hooks/` — `useCategories.js`, `useZoneCategories.js`, `useLongPress.js`, `useMapContextMenu.js`.
- `utils/` — `zoneGeometry.js`, `themeColors.js`.
- `index.js` — Public exports (incident-detail package, zone components, `RightPanelCollapseButton`).

### Backend Layered Architecture

| Layer | Responsibility | Example |
|-------|----------------|---------|
| `routes/` | Mount HTTP verbs + middleware | `incident.routes.js` |
| `controllers/` | Parse request, call service, return response | `incident.controller.js` |
| `services/` | Business logic and SQL | `incident.service.js` |
| `validators/` | Zod input schemas | `incident.schema.js` |
| `middleware/` | Auth, roles, rate limits, validation, error handling | `auth.middleware.js` |
| `storage/` | File persistence abstraction | `local.storage.js` |
| `utils/` | Cross-cutting helpers | `audit-log.js`, `sse-broadcast.js` |

Feature modules follow this stack end-to-end: incidents, timeline, sources (+ public sources, source accounts, X ingestion/snapshot/availability), media, categories, zone-categories, users, public-users, auth (+ public auth), audit, system, saved-incidents (+ staff saved), staff-recents, notifications, x-archive-debug.

### Geometry: Incidents and Zones

There is **no separate `zones` table** (and no `zone.service.js`/`zone.routes.js`). Both point incidents and polygon zones live in the `incidents` table:

- `geometry_type` column is `'point'` or `'polygon'`; `geom` is `GEOMETRY(Geometry, 4326)`.
- Polygon incidents use `zone_category_id` (foreign key to `zone_categories`).
- Area and perimeter are computed with PostGIS `ST_Area`/`ST_Perimeter` when `geometry_type = 'polygon'`.
- Zone categories are managed by `src/backend/src/services/zone-category.service.js` and `src/backend/src/routes/zone-category.routes.js`.

### Database Tables (docs/database-schema.sql + migrations)

Core: `users` (staff), `public_users`, `domains`, `categories`, `incidents`, `source_accounts`, `incident_sources`, `incident_updates`, `incident_media`, `zone_categories`, `user_saved_incidents`, `audit_logs`, `deleted_incidents_log`. Migration `012_admin_workspace_support.sql` adds `staff_saved_incidents`, `staff_recents`, and `notifications`.

---

## 4. Build and Development Commands

All commands are run from the repository root unless noted.

### Prerequisites

- Node.js >= 20 and npm >= 10
- PostgreSQL 16 with PostGIS 3 extension
- A Martin-compatible `.mbtiles` file at `assets/tiles/tiles.mbtiles`

### Initial Setup

```bash
# Install all workspace dependencies
npm install

# Download the Martin tile server binary
npm run setup:martin
```

### Database Setup

```bash
# Create the database, roles, and schema (run as postgres superuser)
sudo -u postgres psql -f docs/database-schema.sql

# Seed sample data (superadmin + sample incidents)
sudo -u postgres psql -d geowatch_dev -f seeds.sql
```

Incremental schema changes live in `docs/migrations/` (numbered SQL files). Apply them in order when setting up an existing database.

### Environment Files

```bash
# Backend
cp src/backend/.env.example src/backend/.env.development
# Edit DB credentials, JWT_SECRET, MARTIN_URL, etc.

# Frontends each have their own .env with VITE_API_URL and VITE_MARTIN_URL.
# Vite only exposes env vars prefixed with VITE_ to the client.
```

`src/backend/src/config/env.js` loads `.env.development` in development and `.env.production` in production. See `docs/env-template.md` for the full variable list.

### Start Services

```bash
# Start all five services (Martin + backend + three frontends)
./scripts/start-geowatch.sh

# Start without opening the browser
./scripts/start-geowatch.sh --no-browser

# Start individual services
./scripts/start-geowatch.sh martin
./scripts/start-geowatch.sh backend
./scripts/start-geowatch.sh admin-web
./scripts/start-geowatch.sh user-web
./scripts/start-geowatch.sh superadmin-web
```

The launcher writes logs and PID files to `logs/` and opens the admin dashboard in a browser unless `--no-browser` is passed.

### Stop / Status / Logs

```bash
./scripts/stop-geowatch.sh              # Stop all services
./scripts/stop-geowatch.sh backend      # Stop one service
./scripts/status-geowatch.sh            # Check which services are running
./scripts/logs-geowatch.sh              # Tail all logs
./scripts/logs-geowatch.sh backend      # Tail one service log
```

### Manual Dev Commands (without the launcher)

```bash
# Terminal 1
./scripts/start-martin.sh

# Terminal 2
npm run dev:backend        # nodemon server.js

# Terminal 3
npm run dev:admin-web      # vite --port 5174

# Terminal 4
npm run dev:user-web       # vite --port 5173

# Terminal 5
npm run dev:superadmin-web # vite --port 5175
```

### Production Builds

```bash
npm run build:user-web
npm run build:admin-web
npm run build:superadmin-web
```

Build outputs go to each frontend's `dist/` directory. There is no backend build step; production runs `node server.js`.

### Scripts Directory

Besides the service launcher/stopper/status/logs helpers, `scripts/` contains Playwright-driven verification and screenshot utilities (`verify-*.mjs`, `screenshot-*.mjs`, `check-*.mjs`), one-off data backfills (`backfill-*.mjs`), and tile debugging pages. These are dev aids, not a test suite — most assume the dev services are already running.

---

## 5. Runtime Architecture and Service URLs

| Service | Dev URL | Notes |
|---------|---------|-------|
| User website | http://localhost:5173 | Public read-only + Google sign-in bookmarks |
| Admin dashboard | http://localhost:5174 | Staff-only, protected by login |
| Superadmin console | http://localhost:5175 | `super_admin` only |
| Backend API | http://localhost:3000/api/v1 | Base path is `/api/v1` |
| Martin tiles | http://localhost:8080 | Self-hosted `.mbtiles` |

All three frontends talk to the backend over HTTP and SSE; only the backend talks to PostgreSQL. Martin serves tiles directly to the frontends.

### Auth Roles

- `super_admin` — Full platform access, user management, delete/restore/purge incidents.
- `admin` — Create/edit incidents, timeline updates, sources, zones. Cannot manage staff users.
- `public_user` — Google-authenticated public users; read-only plus save/bookmark incidents.

Staff users (`users` table) and public users (`public_users` table) are separate identities; `public_user` JWTs are resolved from the public table.

### Frontend Routing (production routes)

- **user-web**: `/` (home), `/map`, `/incident/:id`, `/zone/:id`, `/about`, plus `/trial/zone*` design trials.
- **admin-web**: `/login`, `/*` → `DashboardLayout` (map-first HUD, includes `/search` Power Search handled inside the layout), `/incident/:id`, `/zones`, `/zone/:id`, plus `/trial*` and `/sidebarTrial*` design trials.
- **superadmin-web**: everything under `/superadmin/*` — dashboard, users, public-users, map (full-viewport workspace page rendered outside the sidebar `Layout`), audit, public-activity, domains, zone-categories, system, export, recycle-bin, x-archive-debug, `incident/:id`, `zone/:id`.

---

## 6. API Conventions

- Base path: `/api/v1`
- Standard response envelope:
  ```json
  { "success": true, "data": {}, "message": null, "error": null }
  ```
- Auth header: `Authorization: Bearer <jwt>`
- SSE auth uses `?token=<jwt>` query parameter because `EventSource` cannot send custom headers. SSE URL: `/api/v1/incidents/stream?token=<jwt>`.
- Zod validates all request bodies, queries, and params.
- Controllers use `asyncHandler` so errors reach the centralized error handler.
- Controllers return responses via `res.apiSuccess(data, message)` or `res.apiError(message, errorCode, statusCode)` (attached by the `responseWrapper` middleware).

### Critical Mount Ordering in `server.js`

1. **SSE stream endpoint first**: `app.get('/api/v1/incidents/stream', authenticate, ...)` is registered before the incident router so `/:id` never interprets `stream` as an incident ID. It is also mounted **before** `generalLimiter` so long-lived connections don't count toward the rate limit.
2. **Static `/uploads` second**: also before `generalLimiter` so image requests don't consume API quota.
3. **`generalLimiter` third**, then all API routers.

Actual route mounting order:

```js
app.get('/api/v1/incidents/stream', authenticate, ...);   // SSE — FIRST, before limiter
app.use('/uploads', express.static(UPLOAD_DIR, ...));     // static — before limiter
app.use(generalLimiter);

app.use('/api/v1', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/auth/public', publicAuthRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/public-users', publicUserRoutes);
app.use('/api/v1/audit', auditRoutes);
app.use('/api/v1/system', systemRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/incidents', savedIncidentRoutes);
app.use('/api/v1/incidents', incidentRoutes);
app.use('/api/v1/incidents/:id/timeline', timelineRoutes);
app.use('/api/v1/incidents/:id/sources/public', publicSourceRoutes);
app.use('/api/v1/incidents/:id/sources', sourceRoutes);
app.use('/api/v1/incidents/:id/media', mediaRoutes);
app.use('/api/v1/zone-categories', zoneCategoryRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/staff/recents', staffRecentRoutes);
app.use('/api/v1/x-archive-debug', xArchiveDebugRoutes);
```

The media router uses `Router({ mergeParams: true })` because it is mounted at `/api/v1/incidents/:id/media` — without it `req.params.id` is `undefined` and uploads fail with a Postgres NOT NULL violation. The same pattern applies to the other nested `:id` routers (timeline, sources).

---

## 7. Code Style Guidelines

### File and Naming Conventions

- Backend/service files: `kebab-case` (e.g., `incident.service.js`).
- React component files: `PascalCase.jsx` (e.g., `IncidentDetailPage.jsx`).
- Variables/functions: `camelCase`.
- React components: `PascalCase`.
- Constants/enums: `UPPER_SNAKE_CASE`.
- SQL tables: plural, `snake_case`. SQL columns: `snake_case`.
- All packages are ESM (`"type": "module"`); use `import`/`export` with explicit `.js` / `.jsx` extensions on local imports.

### Frontend Conventions

- Pure React + CSS; no external UI component libraries.
- Use the `@shared` alias for shared components, hooks, and constants.
- Dark theme first; light theme is driven by CSS variables and `[data-theme="light"]`.
- Three interface styles are supported via the `data-style` HTML attribute: `tactical` (default), `saas`, `glass`.
- Import shared styles in each app's `main.jsx`:
  ```js
  import '@shared/media-components.css';
  import '@shared/styles/incident-detail.css';
  ```
- Each frontend wraps the app in the shared `ThemeProvider`.
- Each frontend's `vite.config.js` includes a `copyMapAssetsPlugin` that copies `assets/map-style-*.json` and `assets/fonts/` into the app's `public/` at build/dev start — map styles and font glyphs are served as same-origin static files.

### Backend Conventions

- Use `asyncHandler` on every route handler.
- Write a Zod schema for every API input and validate with `validateRequest(schema, 'body' | 'query' | 'params')`.
- Business logic and SQL live in `services/`.
- Always include error handling; prefer `throw` with `{ status, errorCode }` for the centralized handler.
- Audit-log all significant create/update/delete actions (`utils/audit-log.js`, action names in `utils/audit-actions.js`).

### Database Conventions

- Primary keys: UUID v4 (`gen_random_uuid()`) for most tables; `domains`, `categories`, and `zone_categories` use `SERIAL`; `audit_logs` uses `BIGSERIAL`.
- Geometry: PostGIS `Geometry(4326)`; point markers and polygon zones share the `incidents` table via `geometry_type`.
- Dates stored in UTC (`TIMESTAMP WITH TIME ZONE`); displayed in local time on the client.
- `latitude`/`longitude` are `DECIMAL` — PostgreSQL returns them as **strings**; always `parseFloat()` before `.toFixed()` or arithmetic.
- Flexible metadata stored in `JSONB`.
- `verification_status` on incidents and updates: `unverified` (default), `verified`, `disputed`, `debunked`. Verification is manual; there is no per-source verification or auto-compute cascade.

### Map-Specific Gotchas

- MapLibre positions markers via `translate3d` on the parent element — apply visual effects (scale, shadow) to a child element, never override the parent transform.
- Split marker effects into separate `useEffect`s: one for create/remove/position (`[events]`), one for selection styling (`[selectedIncidentId]`).
- Smart viewport filtering: fetch without viewport first; if total count > 100, enable viewport-bounded fetching on pan/zoom, otherwise load everything.
- Date visibility: active incidents visible until `end_date`; resolved incidents get a 1-day grace period.

---

## 8. Testing Instructions

**There are currently no automated tests in this repository.** No Jest, Vitest, Playwright test suites, or CI pipelines are configured for the project code. (`playwright` is a backend dependency but powers the screenshot/verification utilities in `scripts/`, not test automation.)

### Manual Verification Steps

After making changes, run these commands to verify the project still builds and runs:

```bash
# 1. Build each frontend to catch compile errors
npm run build:user-web
npm run build:admin-web
npm run build:superadmin-web

# 2. Restart services and smoke-test the affected app
./scripts/stop-geowatch.sh
./scripts/start-geowatch.sh

# 3. Check service status
./scripts/status-geowatch.sh

# 4. Tail logs if a service fails
./scripts/logs-geowatch.sh <service>
```

The `scripts/verify-*.mjs` Playwright utilities can drive a headless browser against the running dev servers for visual/behavioral checks; they assume services are up and may need dev credentials (see gitignored `docs/dev-credentials.md`). Note: repeated login attempts can trip the auth rate limiter — allow a cooldown or reuse a long-lived token when running scripts repeatedly.

If you add automated tests, place them in a `tests/` directory or `__tests__/` folders per workspace and update this section.

---

## 9. Security Considerations

### Auth and Authorization

- JWT tokens sign with `JWT_SECRET` (>= 32 characters in dev; >= 64 in production).
- Tokens expire per `JWT_EXPIRES_IN` (default `7d`).
- Passwords are hashed with `bcryptjs` using `BCRYPT_ROUNDS` (default `12`).
- `authenticate` middleware verifies the Bearer token (header first, `?token=` query fallback for SSE) and attaches `req.user`.
- `requireRole(...)` must be applied **after** `authenticate`.
- Staff users and public users are resolved from separate tables; public users get role `public_user`.
- Deactivated accounts (`is_active = false`) receive `403 FORBIDDEN`.

### Rate Limiting

- `generalLimiter` — 300 requests per minute per IP on most API routes. Env vars: `RATE_LIMIT_WINDOW_MS` (default 60000) and `RATE_LIMIT_MAX_REQUESTS` (default 300).
- `authLimiter` — 10 auth attempts per 15 minutes per IP, on login/register endpoints.
- `adminWriteLimiter` — 50 write operations per 15 minutes per user, keyed by `req.user.id`.
- SSE (`/api/v1/incidents/stream`) and static `/uploads` are excluded — they are mounted before `generalLimiter` in `server.js`.

### CORS

- Allowed origins are configured from `USER_WEB_URL`, `ADMIN_WEB_URL`, `SUPERADMIN_WEB_URL`, plus Vite preview ports (`:4173–4175`).
- In `development`, any origin is allowed for local testing.
- `credentials: true` is enabled; requests with no origin (curl, server-to-server) are allowed.

### Secrets and Environment

- `.env` files are gitignored. Only `.env.example` is committed.
- `docs/dev-credentials.md` is gitignored and contains local default passwords.
- Never commit the Martin binary, `.mbtiles` files, uploads, or generated screenshots.

### Input Validation and SQL

- All API inputs are validated with Zod.
- Services use parameterized `pg` queries; do not concatenate user input into SQL.
- File uploads are processed through Multer, converted by Sharp (images → WebP + thumbnail), and stored with generated filenames. Videos are pass-through for now.

### Production Checklist

- Use strong, unique `JWT_SECRET` and `DB_PASSWORD`.
- Run PostgreSQL behind a firewall; do not expose it to the internet.
- Use HTTPS for all frontends and the API.
- Set `STORAGE_PROVIDER=r2` and configure Cloudflare R2 credentials when moving off local disk.
- Remove or restrict development CORS allowances.

---

## 10. Deployment Notes

There is **no automated CI/CD, Docker, or deployment pipeline** in this repository. Deployment is currently manual.

### Current Dev Deployment

- Local Pop!_OS workstation.
- Services launched via `scripts/start-geowatch.sh`.
- Logs and PID files written to `logs/`.

### Planned Production Architecture

- Backend + PostgreSQL + Martin on Oracle Cloud Free Tier.
- Frontends on Vercel free tier.
- Cloudflare R2 for object storage (flip `STORAGE_PROVIDER` from `local` to `r2`; write `r2.storage.js` behind the existing `storage/index.js` factory — Postgres stores URLs only, so no data migration is needed).

### Cost Constraints

- No per-request pricing services for MVP.
- Free tiers only until revenue justifies paid plans.

---

## 11. Key Files to Read Before Working

Read these files in order when starting on a task:

1. `handoff.md` — Current state, file map, active focus, known issues.
2. `PROJECT.md` — Architecture, conventions, functional/non-functional requirements.
3. `commit.md` — Full build history; append every change.
4. `docs/design-brief.md` — UI/UX direction.
5. `docs/api-spec.md` — Backend API contract.
6. `docs/database-schema.sql` — Database schema (single source of truth).
7. `trialRoutes.md` — Reference for active design/trial routes.

Note: `handoff.md`'s file map predates some refactors — trust the actual tree over the doc when they disagree (e.g., there is no `zone.service.js`; user-web's incident detail wrapper lives at `src/user-web/src/components/IncidentDetail/IncidentDetailPage.jsx`).

---

## 12. Current Focus and Known Issues

### Active Work (as of the latest `handoff.md`)

- **user-web `/map` layout port is complete and polished.** The public map now uses the finalized admin-web dashboard chrome: top bar with public nav + Google avatar, left rail/drawer, absolute-overlay right detail panel with collapse/reopen handle, Power Search full-viewport overlay, compact/focus modes, Settings-drawer auto-zoom toggle, and an admin-style ⌘K command palette with tabbed scopes (All/Incidents/Locations/Actions), recent incidents, public quick actions, footer shortcuts, and concise Nominatim location labels with working fly-to.
- Key files: `src/user-web/src/pages/MapPage.jsx`, `src/user-web/src/components/Map/UserMap.jsx`, `src/user-web/src/components/Layout/UserCommandPalette.jsx`, and the `WorkspaceTopBar` / `WorkspaceRail` / `WorkspaceDrawer` / `PowerSearchPanel` components in `src/user-web/src/components/Layout/`.
- The old flat command palette, `LiveActivityFeed`, `TickerBar`, `IncidentSidebar`, `MapControls`, and floating `LocationSearch` were removed from `/map` (some of those components still exist for other pages).
- **DONE (2026-07-26):** the same workspace chrome is now ported to `superadmin-web` — `/superadmin/map` is a full-viewport workspace page (WorkspaceTopBar with Dashboard button + Super Admin pill + Add Incident/Add Zone, 8-item rail with drawers, Power Search overlay, ⌘K palette with Nominatim locations + console page-jump actions, absolute-overlay right panel) rendered outside the sidebar `Layout`; console pages keep the sidebar shell. Old map chrome (`MapControls`, floating `LocationSearch`, `DatePicker`, `MapLegend` overlay) removed. Smoke-tested via `scripts/verify-superadmin-workspace.mjs` (13/13). Remaining follow-ups: browser smoke tests on user-web; console TopBar cleanup (dead search box/bell).

### Active Trial Routes (user-web)

| Route | File | Purpose |
|:--|:--|:--|
| `/trial/zone-sidebar` | `ZoneTrialSidebarPage.jsx` | 630 px sidebar with polygon preview, full meter, and per-update evidence drawer |
| `/trial/zone` | `ZoneTrialLayoutB.jsx` | Full-page zone layout trial with customized HUD hero |
| `/trial/zone-meter` | `ZoneTrialMeterPage.jsx` | Meter component laboratory |
| `/trial/zone-styles` | `ZoneStylesTrialPage.jsx` | Shape + treatment gallery |
| `/trial/zone-heroes` | `ZoneHeroesTrialPage.jsx` | Hero header laboratory |
| `/trial/zone-sidebar-animations` | `ZoneSidebarAnimationTrialPage.jsx` | Sidebar mini-map pulse laboratory |
| `/trial/zone-create` | `ZoneTrialCreatePage.jsx` | Polygon-incident creation sidebar trial |

Admin-web also keeps incident/sidebar trials (`/trial`, `/sidebarTrial*`, `/xPostOptions`, `/incident-trial/*`, `/trial/map-workspace-a`, `/trial/power-search`, `/trial/layer-drawer-options`) as read-only design references. See `trialRoutes.md` for the full list.

### Known Non-Blocking Issues

- Google Sign-In returns 403 on localhost due to unauthorized OAuth origin.
- `XPostCompactList` has a DOM nesting warning (toolbar buttons inside a `<button>` summary) — fix belongs in `src/shared/components/incident-detail/XPostCompactList.jsx`.
- Vite warns about JS chunks > 500 KB; code-splitting is post-MVP.
- Backend login rate limiting can trigger after many consecutive test runs; allow a cooldown or reuse a long-lived token.

### Post-MVP Backlog

- Video processing with `ffmpeg` (`utils/video-processor.js` is currently a pass-through placeholder).
- Marker clustering with Supercluster.
- Heatmap layer.
- Full mobile responsiveness.
- Push/webhook notifications.
- Native Android app (React Native, Phase 2).

---

## 13. Agent Workflow Checklist

When handed a task:

1. Read this file, `handoff.md`, `PROJECT.md`, and `commit.md`.
2. Identify the correct workspace (`backend`, `user-web`, `admin-web`, `superadmin-web`, or `shared`).
3. Make **minimal** changes; do not refactor unrelated code.
4. Follow existing code style in the file you edit.
5. For backend changes, add or update Zod validators and audit logging as needed.
6. Build the affected frontend(s) before finishing.
7. Append a summary of the change to `commit.md` in the format:
   ```
   feat: description
   fix: description
   style: description
   chore: description
   ```
8. Update `handoff.md` and `trialRoutes.md` if you change project status, add routes, or make architectural decisions.
9. Provide a conventional-commit style message in your final response.

---

*This guide reflects the actual state of the GeoWatch repository. Update it when the architecture, stack, or conventions change.*
