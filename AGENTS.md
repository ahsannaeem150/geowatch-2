# GeoWatch — Agent Guide

> This file is written for AI coding agents. Read it first when working on GeoWatch. It describes the project's actual architecture, conventions, commands, and gotchas as of the latest codebase state.

---

## 1. Project Overview

**GeoWatch** is a map-based global conflict and major-events visualization platform. It is a tactical intelligence dashboard with a premium newsroom aesthetic. The platform has three web frontends and one shared backend:

- **user-web** (`:5173`) — Public read-only map and incident explorer.
- **admin-web** (`:5174`) — Internal staff dashboard for creating and curating incidents.
- **superadmin-web** (`:5175`) — System console for super admins (user management, audit log, taxonomy, recycle bin).
- **backend** (`:3000`) — Express REST API with JWT auth, PostGIS queries, SSE broadcasting, audit logging, and media upload processing.

The code lives in a single npm-workspace monorepo. The database is PostgreSQL 16 with PostGIS 3. Map tiles are served by a self-hosted Martin binary reading a local `.mbtiles` file.

---

## 2. Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend frameworks | React 18 + Vite 5 + React Router DOM 7 |
| Map rendering | MapLibre GL JS 4.x |
| Backend runtime | Node.js >= 20 + Express 4 |
| Database | PostgreSQL 16 + PostGIS 3 |
| Real-time | Server-Sent Events (SSE) over HTTP |
| Tile server | Martin v1.8.2 (self-hosted binary) |
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

### Key Dependency Versions (from `package.json` files)

- Backend: `express` ^4.19.2, `pg` ^8.12.0, `zod` ^3.23.8, `jsonwebtoken` ^9.0.2, `bcryptjs` ^2.4.3, `express-rate-limit` ^7.3.1, `multer` ^2.1.1, `sharp` ^0.34.5, `playwright` ^1.61.0
- Frontends: `react` ^18.3.1, `vite` ^5.3.1, `maplibre-gl` ^4.5.0, `react-router-dom` ^7.15.0, `date-fns` ^3.6.0
- Note: `lucide-react` versions differ across workspaces because of npm workspace hoisting; imports still work in all frontends.

---

## 3. Project Structure

```
geowatch/
├── src/
│   ├── backend/              # Express API
│   │   ├── server.js         # App entry point; mounts routes, CORS, rate limits, SSE
│   │   └── src/
│   │       ├── config/       # database.js, env.js
│   │       ├── controllers/  # Express route handlers
│   │       ├── services/     # Business logic + SQL queries
│   │       ├── routes/       # Express routers
│   │       ├── middleware/   # auth, role, rate-limit, validate, error-handler, response-wrapper
│   │       ├── validators/   # Zod schemas
│   │       ├── storage/      # LocalStorage engine + getStorageEngine factory
│   │       └── utils/        # api-response, async-handler, audit-log, sse-broadcast, image-processor, oembed, slugify, x-oembed, x-screenshot, etc.
│   ├── user-web/             # Public website
│   ├── admin-web/            # Admin dashboard
│   ├── superadmin-web/       # Superadmin console
│   └── shared/               # Cross-app design tokens, constants, shared components, hooks
├── assets/                   # Map styles, fonts, tiles (large binaries are gitignored)
├── docs/                     # api-spec.md, database-schema.sql, design-brief.md, env-template.md, migrations/
├── scripts/                  # start-geowatch.sh, stop-geowatch.sh, status-geowatch.sh, logs-geowatch.sh, download-martin.sh
├── uploads/                  # Local user-generated content (gitignored)
├── tools/                    # Downloaded martin binary (gitignored)
├── seeds.sql                 # Sample dev data
├── commit.md                 # Full build history (append every change)
├── handoff.md                # Current project state and focus
├── PROJECT.md                # Architecture, conventions, and requirements traceability
└── AGENTS.md                 # This file
```

### Shared Code (`src/shared/`)

The shared directory is imported by each frontend through the `@shared` Vite alias.

- `design-tokens.css` — Dark-first CSS variable system (Crimson Seal theme) with light-mode overrides via `[data-theme="light"]`.
- `constants.js` — Severity scale, event statuses, source types, user roles, verification statuses, API base URL, Martin URL.
- `theme-context.jsx`, `useTheme.js`, `useStyle.js` — Light/dark/theme-style providers and hooks. Supported styles: `tactical` (default), `saas`, `glass`.
- `components/` — Shared reusable components including `Button`, `Badge`, `SeverityBadge`, `Skeleton`, `TimelineEntry`, `MapContextMenu`, `MapLegend`, `ThemeToggle`, `MediaGallery`, `MediaLightbox`, `ConfirmDialog`, `DateTimePicker`, `ZoneSvgOverlay`.
- `components/incident-detail/` — Shared incident detail package (sidebar + full page + evidence rail + timeline items + X-post list + source cards). Reused across all three frontends.
- `components/zone/` — Shared zone/polygon detail components (`ZoneDetailSidebar`, `ZoneDetailPage`, `ZoneEditorSidebar`) and trial styles.
- `marker-builder.js`, `marker-icons.js` — Map marker generation helpers.
- `styles/incident-detail.css`, `media-components.css` — Imported in each app's `main.jsx`.
- `hooks/` — `useCategories.js`, `useZoneCategories.js`, `useLongPress.js`, `useMapContextMenu.js`.
- `utils/` — `zoneGeometry.js`, `themeColors.js`.
- `index.js` — Public exports for the shared package (incident-detail package + zone components).

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

### Geometry: Incidents and Zones

There is **no separate `zones` table**. Both point incidents and polygon zones are stored in the `incidents` table:

- `geometry_type` column is `'point'` or `'polygon'`.
- Polygon incidents use `zone_category_id` (foreign key to `zone_categories`).
- Area and perimeter are computed with PostGIS `ST_Area`/`ST_Perimeter` when `geometry_type = 'polygon'`.
- Zone categories are managed by `src/backend/src/services/zone-category.service.js` and `src/backend/src/routes/zone-category.routes.js`.

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

### Environment Files

```bash
# Backend
cp src/backend/.env.example src/backend/.env.development
# Edit DB credentials, JWT_SECRET, MARTIN_URL, etc.

# Frontends each have their own .env with VITE_API_URL and VITE_MARTIN_URL.
# Vite only exposes env vars prefixed with VITE_ to the client.
```

`src/backend/src/config/env.js` loads `.env.development` in development and `.env.production` in production.

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
npm run dev:backend

# Terminal 3
npm run dev:admin-web

# Terminal 4
npm run dev:user-web

# Terminal 5
npm run dev:superadmin-web
```

### Production Builds

```bash
npm run build:user-web
npm run build:admin-web
npm run build:superadmin-web
```

Build outputs go to each frontend's `dist/` directory. There is no backend build step; production runs `node server.js`.

---

## 5. Runtime Architecture and Service URLs

| Service | Dev URL | Notes |
|---------|---------|-------|
| User website | http://localhost:5173 | Public read-only |
| Admin dashboard | http://localhost:5174 | Staff-only, protected by login |
| Superadmin console | http://localhost:5175 | `super_admin` only |
| Backend API | http://localhost:3000/api/v1 | Base path is `/api/v1` |
| Martin tiles | http://localhost:8080 | Self-hosted `.mbtiles` |

### Auth Roles

- `super_admin` — Full platform access, user management, delete/restore/purge incidents.
- `admin` — Create/edit incidents, timeline updates, sources, zones. Cannot manage staff users.
- `public_user` — Google-authenticated public users; read-only plus save/bookmark incidents.

---

## 6. API Conventions

- Base path: `/api/v1`
- Standard response envelope:
  ```json
  { "success": true, "data": {}, "message": null, "error": null }
  ```
- Auth header: `Authorization: Bearer <jwt>`
- SSE auth uses `?token=<jwt>` query parameter because `EventSource` cannot send custom headers.
- Zod validates all request bodies, queries, and params.
- Controllers use `asyncHandler` so errors reach the centralized error handler.
- Controllers return responses via `res.apiSuccess(data, message)` or `res.apiError(message, errorCode, statusCode)`.

### Critical Route Ordering (Backend)

In `server.js`, the SSE stream endpoint must be mounted **before** the incident router so that `/:id` does not interpret `stream` as an incident ID:

```js
app.get('/api/v1/incidents/stream', authenticate, ...);  // FIRST
app.use('/api/v1/incidents', incidentRoutes);            // SECOND
```

The media router uses `Router({ mergeParams: true })` because it is mounted at `/api/v1/incidents/:id/media`.

### Actual Route Mounting Order in `server.js`

```js
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
app.use('/api/v1/x-archive-debug', xArchiveDebugRoutes);
```

---

## 7. Code Style Guidelines

### File and Naming Conventions

- Files: `kebab-case` (e.g., `incident.service.js`, `IncidentDetailPage.jsx`).
- Variables/functions: `camelCase`.
- React components: `PascalCase`.
- Constants/enums: `UPPER_SNAKE_CASE`.
- SQL tables: plural, `snake_case`.
- SQL columns: `snake_case`.

### Frontend Conventions

- Pure React + CSS; no external UI component libraries.
- Use `@shared` alias for shared components and constants.
- Dark theme first; light theme is driven by CSS variables and `[data-theme="light"]`.
- Three interface styles are supported via `data-style` HTML attribute: `tactical` (default), `saas`, `glass`.
- Import shared styles in each app's `main.jsx`:
  ```js
  import '@shared/media-components.css';
  import '@shared/styles/incident-detail.css';
  ```
- Each frontend has a `ThemeProvider` wrapping the app.

### Backend Conventions

- Use `asyncHandler` on every route handler.
- Write a Zod schema for every API input and validate with `validateRequest(schema, 'body' | 'query' | 'params')`.
- Business logic and SQL live in `services/`.
- Always include error handling; prefer `throw` with `{ status, errorCode }` for the centralized handler.
- Audit-log all significant create/update/delete actions.

### Database Conventions

- Primary keys: UUID v4 for most tables; `domains`, `categories`, and `zone_categories` use `SERIAL`.
- Geometry: PostGIS `Geometry(4326)`; point markers and polygon zones share the `incidents` table via `geometry_type`.
- Dates stored in UTC; displayed in local time on the client.
- Flexible metadata stored in `JSONB`.

---

## 8. Testing Instructions

**There are currently no automated tests in this repository.** No Jest, Vitest, Playwright test suites, or CI pipelines are configured for the project code. (`playwright` is listed in backend dependencies but is used for screenshot utilities in `scripts/`, not for test automation.)

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

If you add automated tests, place them in a `tests/` directory or `__tests__/` folders per workspace and update this section.

---

## 9. Security Considerations

### Auth and Authorization

- JWT tokens sign with `JWT_SECRET` (>= 32 characters in dev; >= 64 in production).
- Tokens expire per `JWT_EXPIRES_IN` (default `7d`).
- Passwords are hashed with `bcryptjs` using `BCRYPT_ROUNDS` (default `12`).
- `authenticate` middleware verifies the Bearer token and attaches `req.user`.
- `requireRole(...)` must be applied **after** `authenticate`.
- Staff users and public users are resolved from separate tables; public users get role `public_user`.
- Deactivated accounts (`is_active = false`) receive `403 FORBIDDEN`.

### Rate Limiting

- `generalLimiter` — 300 requests per minute per IP on most API routes. Env vars: `RATE_LIMIT_WINDOW_MS` (default 60000) and `RATE_LIMIT_MAX_REQUESTS` (default 300).
- `authLimiter` — 10 auth attempts per 15 minutes per IP.
- `adminWriteLimiter` — 50 write operations per 15 minutes per user.
- SSE and static `/uploads` are excluded from rate limits.

### CORS

- Allowed origins are configured from `USER_WEB_URL`, `ADMIN_WEB_URL`, `SUPERADMIN_WEB_URL`, plus Vite preview ports.
- In `development`, any origin is allowed for local testing.
- `credentials: true` is enabled.

### Secrets and Environment

- `.env` files are gitignored. Only `.env.example` is committed.
- `docs/dev-credentials.md` is gitignored and contains local default passwords.
- Never commit the Martin binary, `.mbtiles` files, uploads, or generated screenshots.

### Input Validation and SQL

- All API inputs are validated with Zod.
- Services use parameterized `pg` queries; do not concatenate user input into SQL.
- File uploads are processed through Multer and stored with generated filenames.

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
- Logs written to `logs/`.

### Planned Production Architecture

- Backend + PostgreSQL + Martin on Oracle Cloud Free Tier.
- Frontends on Vercel free tier.
- Cloudflare R2 for object storage (flip `STORAGE_PROVIDER` from `local` to `r2`).

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

---

## 12. Current Focus and Known Issues

### Active Work (as of the latest `handoff.md`)

- **user-web `/map` layout port is complete.** The public map now uses the finalized admin-web dashboard chrome: top bar with public nav + Google auth, left rail/drawer, absolute-overlay right detail panel, Power Search full-viewport overlay, compact/focus modes, and Settings-drawer auto-zoom toggle.
- Key files: `src/user-web/src/pages/MapPage.jsx`, `src/user-web/src/components/Map/UserMap.jsx`, `src/user-web/src/components/Layout/UserCommandPalette.jsx`, and the reused `WorkspaceTopBar` / `WorkspaceRail` / `WorkspaceDrawer` / `PowerSearchPanel` components in `src/user-web/src/components/Layout/`.
- The old `LiveActivityFeed`, `TickerBar`, `IncidentSidebar`, `MapControls`, and floating `LocationSearch` were removed from `/map`.
- Next: port the same layout patterns to `superadmin-web` and run browser smoke tests on user-web.

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

### Known Non-Blocking Issues

- Google Sign-In returns 403 on localhost due to unauthorized OAuth origin.
- `XPostCompactList` has a DOM nesting warning (toolbar buttons inside a `<button>` summary).
- Vite warns about JS chunks > 500 KB; code-splitting is post-MVP.

### Post-MVP Backlog

- Video processing with `ffmpeg` (currently pass-through only).
- Marker clustering with Supercluster.
- Heatmap layer.
- Full mobile responsiveness.
- Push/webhook notifications.

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
8. Provide a conventional-commit style message in your final response.

---

*This guide reflects the actual state of the GeoWatch repository. Update it when the architecture, stack, or conventions change.*
