# Project Handoff Context

> **Read this file first** before doing any work on GeoWatch.
> This document is the single source of truth for the next AI agent.

---

## 1. Project Identity

**Name:** GeoWatch  
**Purpose:** Map-based global conflict and major events visualization platform.  
**Value Proposition:** A tactical intelligence dashboard that combines premium newsroom aesthetics with powerful geospatial tooling, enabling users to explore real-world incidents on an interactive map with credible source-backed timelines.

**Target Users:**
- **Public users** — anyone exploring global events (read-only)
- **Admin staff** — trusted users creating and managing incidents
- **Super admins** — platform operators with full system access

**Deployment:** Local development (Pop!_OS), planned for Oracle Cloud Free Tier + Vercel.

---

## 2. Current State Snapshot

### ✅ Fully Working Right Now

| Feature | Status | Location |
|---------|--------|----------|
| Express backend with JWT auth | ✅ | `src/backend/` |
| PostGIS incident CRUD | ✅ | `src/backend/src/services/incident.service.js` |
| Timeline CRUD with oEmbed | ✅ | `src/backend/src/services/timeline.service.js` |
| Source CRUD with verification | ✅ | `src/backend/src/services/source.service.js` |
| Media upload (images → WebP + thumbnail, videos pass-through) | ✅ | `src/backend/src/controllers/media.controller.js` |
| Zone CRUD with PostGIS polygons | ✅ | `src/backend/src/services/zone.service.js` |
| 17-domain / 162-category taxonomy | ✅ | `src/backend/src/services/category.service.js` |
| Full-text search (PostgreSQL tsvector) | ✅ | `src/backend/src/services/incident.service.js` |
| SSE real-time broadcasting | ✅ | `src/backend/src/utils/sse-broadcast.js` |
| Immutable audit logging | ✅ | `src/backend/src/utils/audit-log.js` |
| Public user OAuth (Google) | ✅ | `src/backend/src/controllers/public-auth.controller.js` |
| Saved incidents / bookmarks | ✅ | `src/backend/src/controllers/saved-incident.controller.js` |
| Superadmin user management | ✅ | `src/backend/src/controllers/user.controller.js` |
| Public user management (ban/unban) | ✅ | `src/backend/src/controllers/public-user.controller.js` |
| Admin dashboard (map-first HUD) | ✅ | `src/admin-web/` |
| Public website (hero map + explorer) | ✅ | `src/user-web/` |
| Superadmin console (navy theme) | ✅ | `src/superadmin-web/` |
| Three interface styles (Tactical/SaaS/Glass) | ✅ | All 3 frontends |
| Light + dark themes | ✅ | All 3 frontends |
| Smart viewport filtering (100-event threshold) | ✅ | `DashboardLayout.jsx`, `MapPage.jsx` |
| Location search (Nominatim) | ✅ | `LocationSearch.jsx` |
| Coordinate parsing (DD/DDM/DMS) | ✅ | `parseCoordinates.js` |
| Polygon drawing + vertex editing | ✅ | `DrawingToolbar.jsx`, `AdminMap.jsx` |
| Shareable incident URLs | ✅ | `MapPage.jsx` |
| One-command service launcher | ✅ | `scripts/start-geowatch.sh` |
| Shared incident-detail components | ✅ | `src/shared/components/incident-detail/` |
| X/Twitter post archive workflow | ✅ | `XPostCompactList.jsx` + source archive API |

### ⏳ Partially Implemented / WIP

| Feature | Status | Notes |
|---------|--------|-------|
| Video processing | Pass-through only | `video-processor.js` is a placeholder. Future: ffmpeg compression + poster frames |
| Marker clustering | Not started | Supercluster post-MVP |
| Heatmap layer | Not started | Post-MVP |
| Mobile responsiveness | Basic | Desktop-primary; mobile adaptive is post-MVP |
| Self-hosted fonts | Using MapLibre CDN | Future enhancement |
| Sidebar/page visual polish | In progress | Aligning implemented sidebars with trial designs; see `sidebarImplementationPlan.md` |

### ❌ Explicitly Deprioritized or Removed

| Feature | Decision | Reason |
|---------|----------|--------|
| Socket.IO | Replaced by SSE | SSE is simpler, works over HTTP, no extra dependencies |
| `viewer` staff role | Removed | Confused public vs staff identity boundary |
| Direct media embeds (pre-upload) | Replaced by upload pipeline | Upload pipeline is now complete |
| DateTimePicker shared component | Reverted | Native `datetime-local` used instead; poor dark theme visibility |

---

## 3. Tech Stack & Architecture

### Languages, Frameworks, Libraries

| Layer | Technology | Version |
|:--|:--|:--|
| Frontend | React + Vite + MapLibre GL JS | React 18, Vite 5.4, MapLibre 4.x |
| Backend | Node.js + Express | Node 22, Express 4 |
| Database | PostgreSQL + PostGIS | PG 16, PostGIS 3 |
| Tile Server | Martin | v1.8.2 (self-hosted binary) |
| Auth | JWT + bcryptjs | jsonwebtoken, bcryptjs |
| Validation | Zod | zod |
| Date formatting | date-fns | date-fns |
| Icons | Lucide React | lucide-react |
| Animation | Framer Motion | framer-motion (user-web only) |
| Image Processing | Sharp | sharp |
| File Upload | Multer | multer |
| Monorepo | npm workspaces | — |

### High-Level Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   user-web      │     │   admin-web     │     │ superadmin-web  │
│  (public site)  │     │  (ops dashboard)│     │ (system console)│
│   :5173         │     │    :5174        │     │    :5175        │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │  HTTP / SSE
                                 ▼
                    ┌─────────────────────────┐
                    │   Express Backend API   │
                    │        :3000            │
                    │  JWT · Rate Limit · CORS│
                    │  Zod · Audit Log · SSE  │
                    └───────────┬─────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              ▼                 ▼                 ▼
        ┌──────────┐     ┌──────────┐     ┌──────────┐
        │PostgreSQL│     │  Local   │     │  Martin  │
        │+ PostGIS │     │  Disk    │     │ :8080    │
        │          │     │ ./uploads│     │ .mbtiles │
        └──────────┘     └──────────┘     └──────────┘
```

### Key Environment Variables

See `docs/env-template.md` for full template. Critical vars:

| Var | Purpose |
|-----|---------|
| `DB_HOST/PORT/NAME/USER/PASSWORD` | PostgreSQL connection |
| `JWT_SECRET` | JWT signing key (≥32 chars) |
| `MARTIN_URL` | Tile server URL |
| `STORAGE_PROVIDER` | `local` (dev) or `r2` (production) |
| `UPLOAD_DIR` | Local disk path for uploads |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `USER_WEB_URL` / `ADMIN_WEB_URL` / `SUPERADMIN_WEB_URL` | CORS allowed origins |

### Config Files
- `src/backend/.env.development` — dev env (loaded first by `env.js`)
- `src/backend/.env.example` — template for other devs
- `src/admin-web/.env` — Vite env vars
- `src/user-web/.env` — Vite env vars
- `src/superadmin-web/.env` — Vite env vars
- `package.json` (root) — npm workspaces

---

## 4. File Map (The "Where to Look" Index)

> **Do NOT paste schemas or code here.** Open the referenced file.

### Backend — Ground Truth Files

| Concern | File(s) |
|---------|---------|
| Server entry & route mounting | `src/backend/server.js` |
| DB connection pool | `src/backend/src/config/database.js` |
| Env loading | `src/backend/src/config/env.js` |
| Incident CRUD + search + viewport | `src/backend/src/services/incident.service.js` |
| Timeline CRUD | `src/backend/src/services/timeline.service.js` |
| Source CRUD + verification | `src/backend/src/services/source.service.js` |
| Media CRUD | `src/backend/src/services/media.service.js` |
| Zone CRUD + spatial queries | `src/backend/src/services/zone.service.js` |
| Category/domain taxonomy | `src/backend/src/services/category.service.js` |
| User management | `src/backend/src/services/user.service.js` |
| Public user management | `src/backend/src/services/public-auth.service.js` |
| Audit log queries | `src/backend/src/services/audit.service.js` |
| System health | `src/backend/src/services/system.service.js` |
| Incident routes | `src/backend/src/routes/incident.routes.js` |
| Auth routes | `src/backend/src/routes/auth.routes.js` |
| Media routes | `src/backend/src/routes/media.routes.js` |
| Zone routes | `src/backend/src/routes/zone.routes.js` |
| SSE broadcast utility | `src/backend/src/utils/sse-broadcast.js` |
| Audit logger | `src/backend/src/utils/audit-log.js` |
| Image processor (Sharp) | `src/backend/src/utils/image-processor.js` |
| Video processor (placeholder) | `src/backend/src/utils/video-processor.js` |
| oEmbed fetcher | `src/backend/src/utils/oembed.js` |
| Storage factory | `src/backend/src/storage/index.js` |
| Local storage engine | `src/backend/src/storage/local.storage.js` |
| Auth middleware | `src/backend/src/middleware/auth.middleware.js` |
| Role middleware | `src/backend/src/middleware/role.middleware.js` |
| Rate limiters | `src/backend/src/middleware/rate-limiter.js` |
| Error handler | `src/backend/src/middleware/error-handler.js` |

### Admin-Web — Ground Truth Files

| Concern | File(s) |
|---------|---------|
| App entry & routing | `src/admin-web/src/App.jsx` |
| API client | `src/admin-web/src/services/api.js` |
| Auth context | `src/admin-web/src/contexts/AuthContext.jsx` |
| Dashboard layout (HUD) | `src/admin-web/src/components/Layout/DashboardLayout.jsx` |
| Top bar | `src/admin-web/src/components/Layout/TopBar.jsx` |
| Map component | `src/admin-web/src/components/Map/AdminMap.jsx` |
| Drawing toolbar | `src/admin-web/src/components/Map/DrawingToolbar.jsx` |
| Incident form | `src/admin-web/src/components/IncidentForm/IncidentForm.jsx` |
| Shared incident-detail sidebar | `src/admin-web/src/components/Layout/DashboardLayout.jsx` (wrapper) |
| Shared incident-detail full page | `src/admin-web/src/pages/IncidentDetailPage.jsx` |
| Incident table | `src/admin-web/src/components/IncidentList/IncidentTable.jsx` |
| Live activity feed | `src/admin-web/src/components/LiveActivity/AdminLiveFeed.jsx` |
| Media uploader | `src/admin-web/src/components/Media/MediaUploader.jsx` |
| Media gallery | `src/admin-web/src/components/Media/MediaGallery.jsx` |
| Media lightbox | `src/admin-web/src/components/Media/MediaLightbox.jsx` |
| Zone management panel | `src/admin-web/src/components/Zones/ZoneManagementPanel.jsx` |
| Zone detail panel | `src/admin-web/src/components/Zones/ZoneDetailPanel.jsx` |
| Zone edit panel | `src/admin-web/src/components/Zones/ZoneEditPanel.jsx` |
| Location search | `src/admin-web/src/components/LocationSearch/LocationSearch.jsx` |
| Search dropdown | `src/admin-web/src/components/SearchDropdown/SearchDropdown.jsx` |
| Search modal | `src/admin-web/src/components/SearchModal/SearchModal.jsx` |
| Date picker | `src/admin-web/src/components/DatePicker/DatePicker.jsx` |
| Login page | `src/admin-web/src/components/Login/LoginPage.jsx` |
| Trial / design reference routes | `src/admin-web/src/components/DesignTrial/` (read-only reference) |
| Global styles | `src/admin-web/src/index.css` |

### User-Web — Ground Truth Files

| Concern | File(s) |
|---------|---------|
| App entry & routing | `src/user-web/src/App.jsx` |
| API client | `src/user-web/src/services/api.js` |
| Public auth context | `src/user-web/src/contexts/PublicAuthContext.jsx` |
| Map page | `src/user-web/src/pages/MapPage.jsx` |
| Home page | `src/user-web/src/pages/HomePage.jsx` |
| User map component | `src/user-web/src/components/Map/UserMap.jsx` |
| Map controls | `src/user-web/src/components/Map/MapControls.jsx` |
| Shared incident-detail sidebar | `src/user-web/src/components/IncidentList/IncidentSidebar.jsx` (wrapper) |
| Shared incident-detail full page | `src/user-web/src/pages/IncidentDetailPage.jsx` |
| Live activity feed | `src/user-web/src/components/LiveActivity/LiveActivityFeed.jsx` |
| Ticker bar | `src/user-web/src/components/Ticker/TickerBar.jsx` |
| Away banner | `src/user-web/src/components/AwayBanner/AwayBanner.jsx` |
| Save button | `src/user-web/src/components/SaveButton/SaveButton.jsx` |
| Header | `src/user-web/src/components/Layout/Header.jsx` |
| Footer | `src/user-web/src/components/Layout/Footer.jsx` |
| Hero section | `src/user-web/src/components/Home/HeroSection.jsx` |
| Hero map | `src/user-web/src/components/Home/HeroMap.jsx` |
| Stats section | `src/user-web/src/components/Home/StatsSection.jsx` |
| Category grid | `src/user-web/src/components/Home/CategoryGrid.jsx` |
| Featured events | `src/user-web/src/components/Home/FeaturedEvents.jsx` |
| SSE service | `src/user-web/src/services/sse.js` |
| Global styles | `src/user-web/src/index.css` |

### Superadmin-Web — Ground Truth Files

| Concern | File(s) |
|---------|---------|
| App entry & routing | `src/superadmin-web/src/App.jsx` |
| API client | `src/superadmin-web/src/services/api.js` |
| Auth context | `src/superadmin-web/src/contexts/AuthContext.jsx` |
| Layout shell | `src/superadmin-web/src/components/Layout/Layout.jsx` |
| Sidebar | `src/superadmin-web/src/components/Layout/Sidebar.jsx` |
| Top bar | `src/superadmin-web/src/components/Layout/TopBar.jsx` |
| Dashboard | `src/superadmin-web/src/pages/DashboardPage.jsx` |
| Users page | `src/superadmin-web/src/pages/UsersPage.jsx` |
| Public users page | `src/superadmin-web/src/pages/PublicUsersPage.jsx` |
| Audit / System Activity | `src/superadmin-web/src/pages/SystemActivityPage.jsx` |
| Public Activity | `src/superadmin-web/src/pages/PublicActivityPage.jsx` |
| Domains page | `src/superadmin-web/src/pages/DomainsPage.jsx` |
| Recycle bin | `src/superadmin-web/src/pages/RecycleBinPage.jsx` |
| Map page | `src/superadmin-web/src/pages/MapPage.jsx` |
| Shared incident-detail sidebar | `src/superadmin-web/src/pages/MapPage.jsx` (wrapper) |
| Shared incident-detail full page | `src/superadmin-web/src/pages/IncidentDetailPage.jsx` |
| User table | `src/superadmin-web/src/components/Users/UserTable.jsx` |
| User detail drawer | `src/superadmin-web/src/components/Users/UserDetailDrawer.jsx` |
| Public user table | `src/superadmin-web/src/components/PublicUsers/PublicUserTable.jsx` |
| Public user drawer | `src/superadmin-web/src/components/PublicUsers/PublicUserDrawer.jsx` |
| Audit filters | `src/superadmin-web/src/components/Audit/AuditFilters.jsx` |
| Audit table | `src/superadmin-web/src/components/Audit/AuditTable.jsx` |
| Activity timeline | `src/superadmin-web/src/components/Audit/ActivityTimeline.jsx` |
| Domain modal | `src/superadmin-web/src/components/Domains/DomainModal.jsx` |
| Category modal | `src/superadmin-web/src/components/Domains/CategoryModal.jsx` |
| SSE hook | `src/superadmin-web/src/hooks/useEventSource.js` |
| Global styles | `src/superadmin-web/src/index.css` |

### Shared — Ground Truth Files

| Concern | File(s) |
|---------|---------|
| Design tokens (CSS variables) | `src/shared/design-tokens.css` |
| Constants (severity, roles, URLs) | `src/shared/constants.js` |
| Theme context (light/dark + style) | `src/shared/theme-context.jsx` |
| Use theme hook | `src/shared/useTheme.js` |
| Use style hook | `src/shared/useStyle.js` |
| Button component | `src/shared/components/Button.jsx` |
| Badge component | `src/shared/components/Badge.jsx` |
| Severity badge | `src/shared/components/SeverityBadge.jsx` |
| Skeleton component | `src/shared/components/Skeleton.jsx` |
| Timeline entry | `src/shared/components/TimelineEntry.jsx` |
| Category hook | `src/shared/hooks/useCategories.js` |
| Incident-detail component package | `src/shared/components/incident-detail/` |
| Shared incident-detail styles | `src/shared/styles/incident-detail.css` |

### Infrastructure & Docs

| Concern | File(s) |
|---------|---------|
| Database schema | `docs/database-schema.sql` |
| API specification | `docs/api-spec.md` |
| Design brief | `docs/design-brief.md` |
| Environment template | `docs/env-template.md` |
| Dev credentials | `docs/dev-credentials.md` |
| Build history | `commit.md` |
| Project conventions | `PROJECT.md` |
| Incident-detail implementation plan | `sidebarImplementationPlan.md` |
| Trial route reference list | `trialRoutes.md` |
| One-command launcher | `scripts/start-geowatch.sh` |
| Service status | `scripts/status-geowatch.sh` |
| Service stopper | `scripts/stop-geowatch.sh` |
| Log viewer | `scripts/logs-geowatch.sh` |
| Martin downloader | `scripts/download-martin.sh` |

---

## 5. Critical Implementation Details

### Express Route Mount Order (IMPORTANT)
The SSE stream endpoint MUST be mounted BEFORE `app.use('/api/v1/incidents', incidentRoutes)` because `/:id` would otherwise catch `/stream` ("stream" parsed as a UUID).

```js
// server.js — CORRECT order:
app.get('/api/v1/incidents/stream', authenticate, ...);  // ← FIRST
app.use('/api/v1/incidents', incidentRoutes);            // ← SECOND
app.use('/api/v1/incidents/:id/timeline', timelineRoutes);
app.use('/api/v1/incidents/:id/sources', sourceRoutes);
app.use('/api/v1/incidents/:id/media', mediaRoutes);     // ← mergeParams: true
```

### Media Routes: `mergeParams: true` is CRITICAL
`media.routes.js` uses `Router({ mergeParams: true })` because it's mounted at `/incidents/:id/media`. Without this, `req.params.id` is `undefined` and uploads fail with a Postgres NOT NULL violation.

### SSE Auth via Query Param
`EventSource` cannot send custom headers. The auth middleware accepts the JWT token from `req.query.token` as a fallback. SSE URL format: `/api/v1/incidents/stream?token=<jwt>`.

### Smart Viewport Filtering Logic
```
1. Fetch WITHOUT viewport → get total count
2. IF count <= 100: viewportFiltering = false, load all events
3. IF count > 100: viewportFiltering = true, fetch WITH viewport bounds
4. Every map pan/zoom re-fetches ONLY when viewportFiltering is true
```

### Incident → Source Verification Cascade
The backend auto-computes `incident.verification_status` from its sources:
- No sources → `unverified`
- All unverified → `unverified`
- ≥1 verified, no disputes → `verified`
- ≥2 independent verified → `confirmed`
- Any disputed/debunked → `contested`
Admin can override via `verification_override` column.

### Date Visibility Logic
- Active incidents: visible until `end_date`
- Resolved incidents: visible until `end_date + 1 day` (grace period)
- Range mode: `start_date <= range_end AND (end_date + grace) >= range_start`

### PostgreSQL `DECIMAL` Returns Strings
`latitude` and `longitude` columns are `DECIMAL`. PostgreSQL returns them as strings. Always use `parseFloat()` before `.toFixed()` or arithmetic.

### MapLibre Marker Effects
- Visual effects (scale, shadow) apply to a **child element** inside the marker
- MapLibre positions the parent via `translate3d`; never override the parent's transform
- Split marker effects into two `useEffect`s: one for create/remove/position (`[events]`), one for selection styles only (`[selectedIncidentId]`)

---

## 6. Design System Quick Reference

### Crimson Seal (Current)
| Token | Dark | Light |
|-------|------|-------|
| Background | `#050505` | `#f8f9fa` |
| Surface | `#121215` | `#ffffff` |
| Accent | `#9f1239` (maroon) | `#9f1239` |
| Font | Space Grotesk | Space Grotesk |

### Severity Scale
| Level | Label | Color |
|:-----:|:------|:------|
| 1 | Minimal | `#4ade80` |
| 2 | Low | `#fbbf24` |
| 3 | Moderate | `#fb923c` |
| 4 | Severe | `#f87171` |
| 5 | Critical | `#dc2626` |

### Three Interface Styles
All frontends support `tactical` (default), `saas`, and `glass` styles via `ThemeContext` + `data-style` HTML attribute. Styles are persisted in `localStorage`.

---

## 7. Work Patterns (MUST FOLLOW)

### After Every Feature/Fix:
1. **Build the app** — verify no compile errors
2. **Append to `commit.md`** — document what changed, why, and files affected
3. **Give a git commit message** — conventional commits format

### Commit Message Format:
```
feat: description
fix: description
style: description
chore: description
```

### Code Style:
- Follow existing code style in the file you're editing
- Make MINIMAL changes — don't refactor unrelated code
- Use `@shared` path alias for shared components/constants
- No external UI libraries — pure React + CSS
- Dark theme first, light theme via CSS variables

---

## 8. Known Issues & Active Decisions

| Issue | Status | Notes |
|:--|:--|:--|
| Video processing | Placeholder | `video-processor.js` is pass-through. Future: ffmpeg |
| Marker clustering | Not started | Supercluster post-MVP |
| Heatmap layer | Not started | Post-MVP |
| MapLibre chunk size | Known | Vite warns about JS chunk >500KB. Code-splitting is post-MVP |
| Martin manual restart | Known | `start-geowatch.sh` handles this automatically |
| Self-hosted fonts | Future | Using MapLibre's free font CDN |
| Sidebar / full-page visual alignment | Active | Tweaking widths, scroll behavior, spacing against trial routes in `src/admin-web/src/components/DesignTrial/` |

---

## 9. What's Next (Priority Order)

1. **Production Migration (Cloudflare R2)** — Flip `STORAGE_PROVIDER=r2`, write `r2.storage.js`
2. **Marker Clustering** — Supercluster for dense marker situations
3. **Heatmap Layer** — Density visualization at low zoom
4. **Mobile Responsiveness** — Full mobile-adaptive layouts
5. **Video Processing** — ffmpeg compression + poster frames
6. **Notifications** — Push/webhook notifications for new incidents

---

*Last updated: 2026-06-13*  
*Next agent: Read this file first, then `PROJECT.md`, then `commit.md` for full history.*
