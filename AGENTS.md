# IntelMap24 — Agent Guide

> For AI coding agents — read first. Architecture, conventions, commands, gotchas (verified 2026-09-10).

---

## 1. Project Overview

**IntelMap24** (formerly GeoWatch — full rebrand completed 2026-08-08): map-based global conflict and major-events visualization platform — tactical intelligence dashboard with a premium newsroom aesthetic. Three web frontends + one shared backend:

- **user-web** (`:5173`) — Public site: home, `/map` explorer, incident/zone directories + detail pages, about, 404. Read-only + Google sign-in bookmarks.
- **admin-web** (`:5174`) — Staff dashboard: create/curate incidents, timeline updates, sources, media, polygon zones (map-first workspace + directory pages).
- **superadmin-web** (`:5175`) — Super-admin console: staff/public user management, audit/activity logs, taxonomy, recycle bin, system health, export, X-archive debug, Theme Lab + same map workspace/directories.
- **backend** (`:3100`) — Express REST API: JWT auth, PostGIS, SSE, audit logging, notifications, media uploads.

Single npm-workspace monorepo. PostgreSQL 16 + PostGIS 3. Tiles served by a self-hosted Martin binary reading a local `.mbtiles`; map styles + font glyphs self-hosted from `assets/`.

---

## 2. Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend frameworks | React 18 + Vite 5 + React Router DOM 7 |
| Map rendering | MapLibre GL JS 4.x |
| Backend runtime | Node.js >= 20 + Express 4 (ESM — all packages `"type": "module"`) |
| Database | PostgreSQL 16 + PostGIS 3 |
| Real-time | Server-Sent Events (SSE) |
| Tile server | Martin v1.8.2 (self-hosted binary in `tools/`) |
| Auth | JWT (`jsonwebtoken`) + `bcryptjs` + Google OAuth for public users |
| Validation | Zod |
| Dates / Icons / Animation | `date-fns` / `lucide-react` / `framer-motion` (user-web only) |
| Images / Uploads / Storage | Sharp (WebP + thumbnail) / Multer / local disk (`./uploads`) with factory ready for R2 |
| Monorepo | npm workspaces |

### Workspace Packages

`src/backend` (intelmap24-backend), `src/user-web`, `src/admin-web`, `src/superadmin-web`.

### Key Dependency Versions

- Backend: express ^4.19.2, pg ^8.12.0, zod ^3.23.8, jsonwebtoken ^9.0.2, bcryptjs ^2.4.3, express-rate-limit ^7.3.1, multer ^2.1.1, sharp ^0.34.5, playwright ^1.61.0, nodemon (dev)
- Frontends: react ^18.3.1, vite ^5.3.1, maplibre-gl ^4.5.0 (user-web + admin-web only — superadmin-web renders no map), react-router-dom ^7.15.0, date-fns ^3.6.0
- user-web: framer-motion ^12.40.0, lucide-react ^1.17.0; superadmin-web: lucide-react ^0.468.0
- `lucide-react` versions differ across workspaces and admin-web doesn't declare it — hoisting resolves it. Don't add it without checking the lockfile.

---

## 3. Project Structure

```
intelmap24/
├── src/
│   ├── backend/              # Express API
│   │   ├── server.js         # Entry: CORS, SSE, static uploads, rate limits, routes
│   │   └── src/
│   │       ├── config/       # database.js, env.js
│   │       ├── controllers/  # Route handlers
│   │       ├── services/     # Business logic + SQL
│   │       ├── routes/       # Express routers
│   │       ├── middleware/   # auth, role, rate-limiter, validate-request, error-handler, response-wrapper
│   │       ├── validators/   # Zod schemas
│   │       ├── storage/      # local.storage.js + index.js (getStorageEngine factory)
│   │       └── utils/        # api-response, async-handler, audit-log(-actions), sse-broadcast,
│   │                         # image/video-processor, oembed, x-oembed, x-screenshot, slugify, media-url
│   ├── user-web/  admin-web/  superadmin-web/   # the three frontends
│   └── shared/               # Design tokens, constants, shared components, hooks, utils
├── assets/                   # map-style-{dark,light}.json, fonts/ (Noto Sans), tiles/ (gitignored .mbtiles)
├── docs/                     # api-spec, database-schema, design-brief, env-template, incident-taxonomy,
│                             # grant-permissions.sql, media-migration.sql, dev-credentials.md (gitignored), migrations/
├── scripts/                  # Service launchers + Playwright verify/screenshot utilities, favicon rasterizers, backfills
├── uploads/                  # User-generated content (gitignored)
├── tools/                    # martin + ffmpeg binaries (gitignored)
├── logo/                     # Brand artwork + previews
├── seeds.sql                 # Sample dev data
├── commit.md                 # Full build history (append every change)
├── trialRoutes.md            # Trial-route reference (stale since 2026-06-16; App.jsx files authoritative)
├── PROJECT.md                # Architecture + requirements traceability
└── AGENTS.md                 # This file
```

### Shared Code (`src/shared/`)

Frontends import shared code via the `@shared` Vite alias (`resolve.alias` in each `vite.config.js`).

- `design-tokens.css` — Dark-first CSS variables, light via `[data-theme="light"]`: display scale (`--display-2xl/xl/lg`, `--title`, `--body`, `--caption`), `--font-longform` (Inter), keyboard-only `:focus-visible` rings, reduced-motion suppression (media query + `.reduce-motion` class), `--border-strong`.
- `constants.js` — Severity scale, statuses, source types, roles, verification statuses, API base URL, Martin URL.
- `theme-context.jsx`, `useTheme.js`, `useStyle.js` — Light/dark + interface-style providers/hooks. Styles: `tactical` (default), `saas` (localStorage, `data-style` attribute).
- `components/` — Button, Badge, SeverityBadge, Skeleton, TimelineEntry, MapContextMenu, MapLegend, ThemeToggle, MediaGallery, MediaLightbox, ConfirmDialog, DateTimePicker, ZoneSvgOverlay, GhostIncidentBanner, RightPanelCollapseButton, CategoryMultiSelect, WorkspaceRail; `command-palette/` — shared ⌘K palette (backend-fed, per-app actions, all three apps).
- `components/incident-detail/` — Shared incident detail package (sidebar + full page + evidence rail + timeline items + X-post list + source cards + procedural `TargetingCard` hero), all three frontends.
- `components/zone/` — Zone detail components (`ZoneDetailSidebar`, `ZoneDetailPage`, `ZoneEditorSidebar`) + trial-only ones.
- `marker-builder.js`, `marker-icons.js` — Map marker helpers.
- `styles/incident-detail.css`, `media-components.css` — Imported in each app's `main.jsx`.
- `hooks/` — useCategories, useZoneCategories, useLongPress, useMapContextMenu, useReducedMotion.
- `utils/` — zoneGeometry, themeColors, cssVar, selectionCamera (shared smart selection camera policy), themePreview (boot snippet in all three `main.jsx` — `?tokens=` base64url/session overrides from Theme Lab + floating "THEME PREVIEW" badge).
- `index.js` — Public exports.

Note: `BrandHomeLink` is **user-web local** (`src/user-web/src/components/Layout/BrandHomeLink.jsx`), not shared; staff apps use per-app `BrandLogo` in the power-search topbar.

### Backend Layered Architecture

| Layer | Responsibility | Example |
|-------|----------------|---------|
| `routes/` | Mount HTTP verbs + middleware | `incident.routes.js` |
| `controllers/` | Parse request, call service, return response | `incident.controller.js` |
| `services/` | Business logic and SQL | `incident.service.js` |
| `validators/` | Zod input schemas | `incident.schema.js` |
| `middleware/` | Auth, roles, rate limits, validation, errors | `auth.middleware.js` |
| `storage/` | File persistence abstraction | `local.storage.js` |
| `utils/` | Cross-cutting helpers | `audit-log.js`, `sse-broadcast.js` |

Feature modules follow this stack end-to-end: incidents, timeline, sources (+ public sources, source accounts, X ingestion/snapshot/availability), media, categories, zone-categories, users, public-users, auth (+ public auth), audit, system, saved-incidents (+ staff saved), staff-recents, staff-activity, notifications, x-archive-debug.

### Geometry: Incidents and Zones

**No separate `zones` table** (and no `zone.service.js`/`zone.routes.js`). Points and polygon zones both live in `incidents`:

- `geometry_type` = `'point'` | `'polygon'`; `geom` = `GEOMETRY(Geometry, 4326)`.
- Polygons use `zone_category_id` → `zone_categories`; area/perimeter via PostGIS `ST_Area`/`ST_Perimeter`.
- Zone categories: `services/zone-category.service.js` + `routes/zone-category.routes.js`.
- Zones DO carry severity (editable in `ZoneEditorSidebar`) — severity is a common filter in search/drawers.

### Database Tables

Core: `users` (staff), `public_users`, `domains`, `categories`, `incidents`, `source_accounts`, `incident_sources`, `incident_updates`, `incident_media`, `zone_categories`, `user_saved_incidents`, `audit_logs`, `deleted_incidents_log`. Migration `012_admin_workspace_support.sql` adds `staff_saved_incidents`, `staff_recents`, `notifications`.

---

## 4. Build and Development Commands

Run from repo root. Prerequisites: Node >= 20, npm >= 10, PostgreSQL 16 + PostGIS 3, Martin-compatible `.mbtiles` at `assets/tiles/tiles.mbtiles`.

```bash
# Setup
npm install                # all workspace deps
npm run setup:martin       # download Martin binary

# Database (as postgres superuser)
sudo -u postgres psql -f docs/database-schema.sql
sudo -u postgres psql -d intelmap24_dev -f seeds.sql
```

Incremental schema changes: `docs/migrations/` (numbered `001`–`012` + older named ones) — apply in order.

Env files: `cp src/backend/.env.example src/backend/.env.development`, then edit DB creds, `JWT_SECRET`, `MARTIN_URL`. Each frontend has its own `.env` with `VITE_API_URL`/`VITE_MARTIN_URL` (only `VITE_`-prefixed vars reach the client). `src/backend/src/config/env.js` loads `.env.development` in dev, `.env.production` in prod; full variable list in `docs/env-template.md`.

```bash
# Services (launcher writes logs + PIDs to logs/, opens admin dashboard unless --no-browser)
./scripts/start-intelmap24.sh [--no-browser]     # all five: Martin + backend + 3 frontends
./scripts/start-intelmap24.sh martin|backend|admin-web|user-web|superadmin-web
./scripts/stop-intelmap24.sh [service]
./scripts/status-intelmap24.sh
./scripts/logs-intelmap24.sh [service]

# Manual (without launcher)
./scripts/start-martin.sh
npm run dev:backend        # nodemon → :3100
npm run dev:admin-web      # vite :5174
npm run dev:user-web       # vite :5173
npm run dev:superadmin-web # vite :5175

# Production builds → each app's dist/ (no backend build; prod runs `node server.js`)
npm run build:user-web
npm run build:admin-web
npm run build:superadmin-web
```

---

## 5. Runtime Architecture and Service URLs

| Service | Dev URL | Notes |
|---------|---------|-------|
| User website | http://localhost:5173 | Public read-only + Google sign-in bookmarks |
| Admin dashboard | http://localhost:5174 | Staff-only, protected by login |
| Superadmin console | http://localhost:5175 | `super_admin` only |
| Backend API | http://localhost:3100/api/v1 | Moved 3000 → 3100 on 2026-07-31; media URLs origin-normalized at read time (`utils/media-url.js`) |
| Martin tiles | http://localhost:8080 | Self-hosted `.mbtiles` |

Frontends talk to the backend over HTTP + SSE; only the backend talks to PostgreSQL. Martin serves tiles directly to frontends.

### Auth Roles

- `super_admin` — Full access, user management, delete/restore/purge incidents.
- `admin` — Incidents, timeline, sources, zones. Cannot manage staff users.
- `public_user` — Google-authenticated; read-only + bookmarks.

Staff (`users`) and public (`public_users`) are separate identities; `public_user` JWTs resolve from the public table.

### Frontend Routing

- **user-web**: `/` (home), `/map`, `/incidents`, `/zones`, `/incident/:id`, `/zone/:id`, `/about`, `*` → NotFound, + `/trial/zone*` design trials.
- **admin-web**: `/login`, `/*` → DashboardLayout (map-first HUD; `/search` Power Search handled inside the layout), `/incidents`, `/zones`, `/incident/:id`, `/zone/:id`, + `/trial*`, `/sidebarTrial*`.
- **superadmin-web**: everything under `/superadmin/*` — dashboard, users, public-users, map (full-viewport page rendered outside the sidebar Layout), incidents, zones, audit, public-activity, domains, zone-categories, system, export, theme-lab, recycle-bin, x-archive-debug, `incident/:id`, `zone/:id`, `*` → NotFound.

All apps set per-route `document.title` via `RouteTitle` and ship an inline SVG favicon + meta in `index.html` (PNG fallbacks 16/32/apple-touch-180, `?v=` cache-busts).

---

## 6. API Conventions

- Base path `/api/v1`; envelope `{ "success": true, "data": {}, "message": null, "error": null }`.
- Auth: `Authorization: Bearer <jwt>`; SSE uses `?token=<jwt>` (EventSource can't send headers): `/api/v1/incidents/stream?token=<jwt>`.
- Zod validates all bodies/queries/params; `asyncHandler` on handlers so errors reach the centralized handler; responses via `res.apiSuccess(data, message)` / `res.apiError(message, errorCode, statusCode)` (responseWrapper middleware).

### Critical Mount Ordering in `server.js`

1. **SSE stream first** (before the incident router so `/:id` never eats `stream`; also before `generalLimiter` so long-lived connections don't count toward the limit).
2. **Static `/uploads` second** (before `generalLimiter` so image requests don't consume quota).
3. **`generalLimiter` third**, then all routers.

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
app.use('/api/v1/geocode', geocodeRoutes);
app.use('/api/v1/stats', statsRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/staff/recents', staffRecentRoutes);
app.use('/api/v1/staff/activity', staffActivityRoutes);
app.use('/api/v1/x-archive-debug', xArchiveDebugRoutes);
```

Nested `:id` routers (media, timeline, sources) use `Router({ mergeParams: true })` — without it `req.params.id` is `undefined` and uploads fail with a Postgres NOT NULL violation.

---

## 7. Code Style Guidelines

### Naming

Backend/service files kebab-case (`incident.service.js`); React components PascalCase.jsx; vars/functions camelCase; components PascalCase; constants UPPER_SNAKE_CASE; SQL tables plural snake_case, columns snake_case. All packages ESM — `import`/`export` with explicit `.js`/`.jsx` extensions on local imports.

### Frontend

- Pure React + CSS; no external UI component libraries. Use the `@shared` alias for shared code. Dark-first; light via CSS variables + `[data-theme="light"]`. Token-only colors — never hardcode hex in components.
- **Color tokens are the single source of truth**: accent lives in one marked `/* === BRAND ACCENT === */` block per theme atop `design-tokens.css` (rebrand = edit that block only). **Final brand colors (owner-selected 2026-08-08): `--accent: #0e4f4a`, `--accent-light: #14b8a6` (turquoise).** Severity/verification colors are `--sev-*`/`--ver-*` tokens — JS uses `'var(--sev-N)'` strings in inline styles, or `getCssVar()` (`utils/cssVar.js`) for canvas/hex-math (`themeColors.js resolveColor()` resolves them). superadmin-web owns `src/styles/tokens.css` (navy console palette + `--sa-accent*` turquoise ramp, referenced by shared CSS with hex fallbacks). Never hardcode brand/severity hex in production files.
- **Theme Lab** (`/superadmin/theme-lab`): 26 presets, live whole-app preview, per-token overrides, cross-app `?tokens=` base64url links, Finalize export. Drafts in localStorage. Runtime half: `utils/themePreview.js`, boot-imported by all three `main.jsx`.
- **Brand assets** (`public/brand/` per app — identical 9-file set: lockup dark/light + no-tag crops, `intelmap24-mark.svg` topbar tile, `intelmap24-favicon.svg`, PNG fallbacks; per-app `BrandLogo.jsx`): recolor ONLY via each SVG's internal `<style>` vars (`--text/--brand-1/--brand-2/--alert/--muted/--bg`) — already final turquoise. If artwork changes: regenerate PNG favicons with `scripts/rasterize-favicon.mjs` (user-web) / `rasterize-favicon-admin-superadmin.mjs` (staff, dot removed), bump `?v=` in `index.html`, never edit paths/geometry.
- Interface styles via `data-style`: `tactical` (default), `saas`.
- Import shared styles in each `main.jsx`: `import '@shared/media-components.css';` + `import '@shared/styles/incident-detail.css';` Wrap each app in the shared `ThemeProvider`.
- Each `vite.config.js` has `copyMapAssetsPlugin` copying `assets/map-style-*.json` + `assets/fonts/` into the app's `public/` — map styles and glyphs served same-origin.
- **Reduced motion**: OS `prefers-reduced-motion` + `.reduce-motion` class honored via `design-tokens.css`; per-app Settings switch persisted in localStorage (`intelmap24_{user,admin,superadmin}_reduce_motion`, boot-applied in `main.jsx`). Guard new animation with the shared `useReducedMotion` hook.
- Typography: 10px floor for production labels; display scale vars; `.font-longform` (Inter) for long-form prose (incident descriptions, About copy).
- **Trial pages must be lazy-loaded** (`React.lazy` + `Suspense` in `App.jsx`) with scope-prefixed CSS — trial CSS (e.g. `ZoneTrial.css`) once leaked globally into production pages.

### Backend

- `asyncHandler` on every route handler. Zod schema for every API input via `validateRequest(schema, 'body' | 'query' | 'params')`. Business logic + SQL in `services/`. Throw `{ status, errorCode }` for the centralized handler.
- Audit-log significant create/update/delete (`utils/audit-log.js`; action names in `utils/audit-actions.js`).
- Domain/category-slug filter conditions in search queries must be wrapped polygon-safe — otherwise zone results silently vanish under incident filters (fixed once in `searchIncidents`; keep new filters the same way).

### Database

- PKs: UUID v4 (`gen_random_uuid()`) mostly; `domains`/`categories`/`zone_categories` SERIAL; `audit_logs` BIGSERIAL.
- Geometry: PostGIS `Geometry(4326)`; points + polygons share `incidents` via `geometry_type`.
- Dates UTC (`TIMESTAMP WITH TIME ZONE`), displayed in local time on the client.
- `latitude`/`longitude` are DECIMAL — Postgres returns them as **strings**; always `parseFloat()` before `.toFixed()` or arithmetic.
- Flexible metadata in JSONB.
- `verification_status`: `unverified` (default) / `verified` / `disputed` / `debunked`. Manual; no per-source verification or auto-compute cascade. UI: verification badge renders only when ≠ `unverified`; status label only when Active (Resolved renders nothing).

### Map-Specific Gotchas

- MapLibre positions markers via `translate3d` on the parent element — apply visual effects to a child, never override the parent transform.
- Split marker effects into separate `useEffect`s: one for create/remove/position (`[events]`), one for selection styling (`[selectedIncidentId]`).
- Zone hover/click handlers bound ONCE per map (delegated bindings reading a `zonesRef` at event time) — rebinding per zone-set change causes stale-closure bugs. All three map components follow this pattern.
- Smart viewport filtering: fetch without viewport first; if total > 100, enable viewport-bounded fetching on pan/zoom, else load everything.
- Large-range gating (all apps): ranges > 31 days or All-time withhold point incidents below zoom 6 (zones always load); ≥ zoom 6 point fetches become viewport-bounded. Null date-range ends must never reach the API — translate to `1970-01-01`/`2099-12-31` (endpoint defaults to "visible today" when dates are absent).
- Date visibility: active incidents visible until `end_date`; resolved get a 1-day grace period.
- Point-incident list queries must pass `geometryType` — otherwise polygon zones arrive twice (point query + zone path).
- Drawer lists (all apps): zones included via `drawerIncidents` memos (points+zones, `created_at` desc, Layers-toggle-aware); selection highlight wired from the real `selectedIncidentId` (accent border + tint) — don't hardcode selection to null.

---

## 8. Testing Instructions

### Token-Saving Working Protocol (owner-approved, overrides older habits)

- **Verify with builds only** (`npm run build:<app>`). Playwright verify/screenshot scripts **only for major behavioral changes or when the owner asks** — the owner tests manually otherwise.
- **Do not read screenshots back** unless something looks wrong; the owner inspects them.
- **Batch small tweaks** into one task. **commit.md**: append a short 2–3 line summary per change (terse format).
- Keep agent reports and user-facing replies terse.
- **Agent delegation**: Kimi orchestrates (plan, precise briefs, build checks, terse reports); coder/explore subagents do file-heavy work. Agents never edit `commit.md`/`AGENTS.md`/`trialRoutes.md` (Kimi does docs). Ports: user-web first → owner tests → parallel admin/superadmin agents; sequence shared-file edits. Resume by id: agent-1 admin, agent-2 superadmin, agent-3 user-web/backend, agent-4 explore.

**No automated tests in this repository** — no Jest/Vitest/Playwright suites or CI. (`playwright` is a backend dependency but powers the `scripts/` utilities, not test automation.)

### Manual Verification

```bash
npm run build:user-web && npm run build:admin-web && npm run build:superadmin-web
./scripts/stop-intelmap24.sh && ./scripts/start-intelmap24.sh
./scripts/status-intelmap24.sh
./scripts/logs-intelmap24.sh <service>   # if a service fails
```

Playwright utilities drive headless browsers against running dev servers; may need gitignored `docs/dev-credentials.md`. Repeated logins trip the auth rate limiter — allow cooldown or reuse a long-lived token. New automated tests go in `tests/` or `__tests__/` per workspace (update this section if added).

---

## 9. Security

- JWT signs with `JWT_SECRET` (≥ 32 chars dev, ≥ 64 prod); expiry per `JWT_EXPIRES_IN` (default `7d`). Passwords: bcryptjs, `BCRYPT_ROUNDS` (default 12).
- `authenticate` verifies the Bearer token (header first, `?token=` fallback for SSE) and attaches `req.user`. `requireRole(...)` must come **after** `authenticate`. Deactivated accounts (`is_active = false`) → 403.
- Rate limits: `generalLimiter` 300 req/min/IP (`RATE_LIMIT_WINDOW_MS` default 60000, `RATE_LIMIT_MAX_REQUESTS` default 300); `authLimiter` 10 attempts/15 min/IP on login/register; `adminWriteLimiter` 50 writes/15 min/user (keyed by `req.user.id`). SSE + static `/uploads` excluded (mounted before `generalLimiter`).
- CORS: origins from `USER_WEB_URL`/`ADMIN_WEB_URL`/`SUPERADMIN_WEB_URL` + Vite preview `:4173–4175`; development allows any origin; `credentials: true`; origin-less requests (curl, server-to-server) allowed.
- Secrets: `.env` files gitignored (only `.env.example` committed); `docs/dev-credentials.md` gitignored. Never commit the Martin binary, `.mbtiles`, uploads, or screenshots.
- All inputs Zod-validated; parameterized `pg` queries — never concatenate user input into SQL. Uploads: Multer → Sharp (images → WebP + thumbnail), generated filenames; videos pass-through for now.
- Production checklist: strong unique `JWT_SECRET`/`DB_PASSWORD`; PostgreSQL firewalled (never internet-exposed); HTTPS everywhere; `STORAGE_PROVIDER=r2` + R2 credentials; restrict dev CORS allowances.

---

## 10. Deployment Notes

No CI/CD, Docker, or pipeline — deployment is manual. Current dev: local Pop!_OS workstation, services via `scripts/start-intelmap24.sh`, logs/PIDs in `logs/`.

Planned production: backend + PostgreSQL + Martin on Oracle Cloud Free Tier; frontends on Vercel free tier; Cloudflare R2 for object storage (flip `STORAGE_PROVIDER` local → r2; write `r2.storage.js` behind the existing `storage/index.js` factory — Postgres stores URLs only, no data migration needed). Cost: free tiers only until revenue; no per-request pricing for MVP.

---

## 11. Key Files to Read Before Working

1. `PROJECT.md` — architecture, conventions, requirements. 2. `commit.md` — build history (append every change). 3. `docs/design-brief.md` — UI/UX direction. 4. `docs/api-spec.md` — API contract. 5. `docs/database-schema.sql` — schema (single source of truth). 6. `trialRoutes.md` — trial routes (stale; each app's `src/App.jsx` is authoritative).

---

## 12. Current Focus and Known Issues

### Recently Completed

Full GeoWatch → IntelMap24 rebrand (name + logo + turquoise palette, 2026-08-08), brand asset set in all three apps, Theme Lab, Power Search overhaul (compact cards, zone/incident distinction, polygon-safe filters), drawer overhaul port to staff apps, workspace chrome on all maps (top bar, rail/drawers, right detail panel, ⌘K palette), smart selection camera, TableUI directories + CategoryMultiSelect, placement mode + drawing toolbar 2.0, deterministic Back navigation (`utils/returnView.js`), incident-detail overhaul (silent SSE refetch, `TargetingCard`), trial CSS leak fix. Mobile app (P1–P12): see §14. Full history: `commit.md`.

### Active Trial Routes

- **user-web**: `/trial/zone-sidebar`, `/trial/zone`, `/trial/zone-meter`, `/trial/zone-styles`, `/trial/zone-heroes`, `/trial/zone-sidebar-animations`, `/trial/zone-create` — all React.lazy.
- **admin-web**: `/trial`, `/sidebarTrial`, `/sidebarTrial2` (+ `/optionF`, `/xGallery`, `/admin`, `/superadmin`), `/xPostOptions`, `/incident-trial/{user,admin,superadmin}`, `/trial/map-workspace-a`, `/trial/power-search`, `/trial/layer-drawer-options` — read-only design references.
- File mappings in `trialRoutes.md` (partially stale) and each app's `src/App.jsx`.

### Known Non-Blocking Issues

- Google Sign-In returns 403 on localhost (unauthorized OAuth origin).
- `XPostCompactList` DOM nesting warning (toolbar buttons inside a `<button>` summary) — fix in `src/shared/components/incident-detail/XPostCompactList.jsx`.
- Vite warns about JS chunks > 500 KB; code-splitting is post-MVP.
- Backend login rate limiting can trigger after many consecutive test runs; allow cooldown or reuse a long-lived token.

### Post-MVP Backlog

Video processing with ffmpeg (`utils/video-processor.js` is a pass-through placeholder), Supercluster marker clustering, heatmap layer, full mobile responsiveness, push/webhook notifications.

---

## 13. Agent Workflow Checklist

1. Read this file, `PROJECT.md`, `commit.md`. 2. Identify the workspace (backend / user-web / admin-web / superadmin-web / shared). 3. **Minimal** changes; no unrelated refactors. 4. Match the file's existing style. 5. Backend changes: Zod validators + audit logging as needed. 6. Build the affected frontend(s) before finishing. 7. Append `commit.md` (`feat:` / `fix:` / `style:` / `chore:`). 8. Update `trialRoutes.md` if routes change. 9. Provide a conventional-commit style message in the final response.

---

## 14. Mobile App (`src/mobile-app/`) — Android (added 2026-09-20)

Bare **React Native 0.87** (react 19.2), Android-only. **Standalone package — NOT in root npm workspaces** (avoids Metro hoisting conflicts); own `package.json`/`node_modules`. UI flow follows the prototype `src/mobile-app/index.html` (structure/flow exact, sizing free-form).

- **Architecture**: single-screen map-first. One root `MapScreen` + custom overlay system — `OverlayContext`/`OverlayHost` (LIFO stack: sheet / fullscreen / drawerLeft / topPanel / modal; backdrop; Android BackHandler closes topmost). Contexts: `ThemeContext` (tokens in `theme/tokens.js`, ported from `design-tokens.css`), `AuthContext` (Google sign-in → `/auth/public/google`, JWT in react-native-keychain), `MapContext` (fetch pipeline + camera), `SelectionContext` (peek/compact/direct state machine + origin stack + view history), `LiveContext` (alerts/activity/away banner).
- **Map**: `@maplibre/maplibre-react-native` 11; bundled copies of `assets/map-style-{dark,light}.json` in `assets/map/` with rewritten URLs (tiles → Martin :8080, glyphs → backend static `/fonts` :3100 — Express serves `assets/fonts` directly, no user-web dependency). All web map gotchas apply (zoom-6 gating, viewport bounding, `geometryType`, ghost selection). `androidView`: **`"surface"` on physical devices** (hardware-composited by SurfaceFlinger — `"texture"` forces every map frame through the app window's GPU pass, ~+3ms renderThread/frame and sheet-motion judder, device-verified); `"texture"` + `nativeVariant=vulkan` is an EMULATOR-ONLY SwiftShader workaround. **Incident markers are web-style PNGs**: `scripts/generate-mobile-markers.mjs` bakes domain-colored circle+glow+white-icon images (paths from `src/shared/marker-icons.js`, colors from mobile `DOMAINS`) into `assets/markers/` + `src/screens/map/markerImages.js`; MapScreen renders them via `<Images>` + symbol layer (color/icon = domain, size = severity radii 6–14, constant across zoom; selection = white ring + colored glow halo; ghost = 50% opacity). Re-run the generator if web marker artwork changes.
- **Networking**: emulator hits host via `10.0.2.2` (API+fonts :3100, Martin :8080); `services/api.js` unwraps the envelope + rewrites media URL hosts. Physical device: `adb reverse` those ports + `DEV_HOST = '127.0.0.1'` in `src/constants.js` (mapStyles.js rewrites bundled-style hosts from DEV_HOST at load; flip back to `10.0.2.2` for emulator work). SSE via `react-native-sse` with `?token=`; signed-out clients fall back to list-diff alerts (client-side by design — backend notifications stay staff-only).
- **Run**: mobile-only needs just **backend + martin**. Emulator: `cd src/mobile-app && npx react-native run-android` (SDK `~/Android/Sdk`, JDK `~/jdk` as JAVA_HOME, AVD `intelmap24`). **Physical device (preferred)**: `./scripts/start-mobile-intelmap24.sh <connect|services|metro|build|logs|all>` + `./scripts/stop-mobile-intelmap24.sh <metro|services|connect|all>`; `connect` = adb reverse (every replug), `services` = backend+martin only, `build` = APK → phone Download (MIUI blocks adb install). Total shutdown of everything: `./scripts/stop-all-intelmap24.sh`. Verify: `npx eslint .` + Metro bundle; emulator screenshots under `temp_screenshots/mobile-map-engine/`. **Release APKs** need the committed `android/app/src/main/res/xml/network_security_config.xml` (localhost/127.0.0.1/10.0.2.2-only cleartext, wired in AndroidManifest) — RN's Gradle plugin forces `usesCleartextTraffic=false` in release, which silently blocks the local backends (app boots to a dead/black map).
- **Sheets** (Google-Maps-style bottom sheets, all apps of the overlay system): overlay sheets use `hooks/useSheetGesture.js` (legacy JS Animated callbacks; every handoff pan MUST declare `.runOnJS(true)` so Reanimated/Worklets never executes `motionBump` on the UI runtime); the map PeekSheet and Power Search ResultsSheet share `components/sheets/DetentSheet.jsx` over `hooks/useReanimatedSheetGesture.js` (Reanimated 4 + Worklets, UI-thread grabber/handoff pans and springs, with detent selection/state commits on JS). DetentSheet owns mount/detent effects, the shared position-driven pad, moving hardware layer and optional overlay/header/body composition; each adapter keeps its own detent/navigation policy. Both use two direction-gated RNGH v2 handoff pans with render-time `enabled` flags (per-touch JS activation loses the native-scroll race) + `hooks/useScrollEdge.js` (per-pane edge tracker; `HandoffScrollView` = RNGH `LegacyScrollView`, `overScrollMode="never"`, `removeClippedSubviews={false}`). Reanimated requires `react-native-worklets/plugin` in `babel.config.js` and a native APK rebuild. Hard-won rules, all device-verified: (1) `blocksExternalGesture(scrollRefs)` goes on a handoff pan ONLY while that pan is enabled — a disabled pan keeping the relation deadlocks the awaiting native scroll handler until remount; re-resolve refs after pane remounts via an epoch bump. (2) PeekSheet's bottom pad and sheet transform share one Reanimated `pos` value (`useAnimatedStyle`, pad = `pos + 62`) — never a listener or mirrored second spring. Position updates, drag physics and springs stay on the UI thread; the animated pad still causes native layout, so keep pane renders and scroll corrections minimal. (3) Defer gesture `after()` state commits to spring completion — a launch-time commit stalls JS ~150ms and a JS spring teleports over the stalled wall-time. (4) RN never re-clamps scrollY when the pad shrink lands mid-fling → blank white sheet; `useScrollEdge(onFlip, scrollRef)` re-pins stale offsets with an instant `scrollToEnd` behind a 40dp deadband (smaller corrections jerk a frame late). (5) `useScrollEdge.reset()` must force only the edge flags and PRESERVE `dims` — `onLayout` never re-fires for an already-laid-out view, so zeroing `viewH` on a same-mount content swap (incident A→B at one detent) strands `scrollable=false` → dead scroll until remount. (6) Sheet-motion perf: PeekSheet promotes its sheet view to a hardware texture layer WHILE MOVING — `renderToHardwareTextureAndroid={moving}`, driven by an `onMotionChange` counter in the active gesture hook (grabs + handoff pans + every spring incl. programmatic; counter, not a flag, because overlapping motion sources nest) — a translate then costs one GPU texture move instead of a display-list re-record (evidence-pane gesture jank 60%→~10-30%, device-measured via `dumpsys gfxinfo … framestats`). OFF at rest so content scrolling keeps the cheap raster path. Also: dev-mode JS runs springs at ~35-46fps vs release ~55-60fps — judge sheet smoothness on a RELEASE build, never dev. (7) ALWAYS wire `onScrollEndDrag` + `onMomentumScrollEnd` alongside `onScroll` into every edge-tracked ScrollView: those one-shot settle events are the only guaranteed final-offset delivery — Fabric coalescing can drop the last `onScroll` frame (y→0). But settle events do NOT fire for programmatic scrolls, and a non-scrollable pane (`scrollEnabled=false`, short content at FULL) produces no scroll events at all — so `recompute` ALSO derives `atTop=true` unconditionally when `!scrollable` (maxY=0 definitionally) and records the re-pin's corrected offset itself instead of trusting the scrollTo's onScroll. Without all three, a stale `atTop=false` at the visual top strands the down-drag handoff disabled forever; the ownerless drag falls through to child pressables and a "scroll" ending inside a tall card fires its onPress on finger-lift (phantom INSPECT/evidence open seconds later — verified, short-timeline incidents). (8) The re-pin from rule (4) must fire ONLY while a momentum fling owns the scroller (`momentumActive` via `onMomentumScrollBegin`, cleared in the settle handlers — wire that prop at every edge-tracked ScrollView too) and must use `scrollToEnd({animated:false})`, never a JS-computed `scrollTo(maxY)`: Android's layout clamp already tracks a shrinking pad EXACTLY per committed frame, while a dims-snapshot maxY is 1-2 frames stale and FIGHTS it (one-frame content down-then-up oscillation on flick expands — device-verified). Do NOT issue a competing `scrollToEnd` on every shrinking content-size commit: let Android clamp during motion, then use `onSheetMotionEnd()` for the one exact end correction. Growth-side re-pinning in `onContentSizeChange` is still required when a pane was pinned at its end. (9) Programmatic entry springs (pill→mid) must wait for the sheet root's first `onLayout` + ~3 presented frames (rAF chain, with a bail-out if a gesture owns the position), so the mount's heavy first draw does not consume the entry animation's first visible frames. (10) Timeline→evidence entry must stay lightweight: `EvidenceBody` mounts media/X-post/article/note content after 320ms via `startTransition`, `XPostCard` is memoized, and gallery Modals mount ONLY when their index is non-null (timeline cards, archived/live X cards, EvidenceBody). Never mount the full evidence tree or hidden Modals in the cross-slide's first commit.
- **Known gaps**: signed-in E2E unverified until Google Cloud OAuth is configured (`GOOGLE_WEB_CLIENT_ID` in `src/constants.js` + Android client/SHA-1 + backend `GOOGLE_CLIENT_ID` match); "Full details" page is a stub; videos pass-through.

---

*This guide reflects the actual state of the IntelMap24 repository. Update it when the architecture, stack, or conventions change.*
