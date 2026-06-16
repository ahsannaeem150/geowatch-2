# GeoWatch — Project Master Document

## Product
Map-based global conflict and major events visualization platform.

## Platforms
| Platform | Status | Stack |
|:--|:--|:--|
| **Backend API** | ✅ Complete | Express 4 + PostGIS + JWT |
| **Admin Dashboard** | ✅ Complete | React 18 + Vite + MapLibre GL JS |
| **Public Website** | ✅ Complete | React 18 + Vite + MapLibre GL JS |
| **Superadmin Console** | ✅ Complete | React 18 + Vite + MapLibre GL JS |
| Native Android App | 🔮 Phase 2 (future) | React Native |

## Tech Stack
| Layer | Technology |
|-------|------------|
| Frontend | React 18 + Vite + MapLibre GL JS |
| Backend | Node.js 22 + Express 4 |
| Real-time | Server-Sent Events (SSE) |
| Database | PostgreSQL 16 + PostGIS 3 |
| Map Tiles | Martin (self-hosted `.mbtiles`) |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Validation | Zod |
| Rate Limit | express-rate-limit |
| CORS | cors |
| Environment | dotenv |
| Dev Runner | nodemon |
| Image Processing | Sharp |
| File Storage | Local disk (dev) → Cloudflare R2 (production) |

## Auth Roles
- `super_admin`: Full access, manage all users, delete incidents, access superadmin console
- `admin`: Create/edit incidents, timeline updates, sources, zones. Cannot manage staff users.
- `public_user`: Google-authenticated public users. Read-only + save/bookmark incidents.

## Map Rules
- Self-hosted `.mbtiles` via Martin on localhost:8080
- MapLibre GL JS renders vector tiles
- NO Google Maps API. NO MapTiler for MVP.

## Media Storage Strategy
- **Development:** Files stored on local disk (`./uploads/`) via abstracted storage interface
- **Production:** Flip `STORAGE_PROVIDER=r2` — same code, Cloudflare R2 backend
- **Why:** Zero cloud cost during dev, no internet dependency, no API keys to manage
- **Migration:** Change one env var. Postgres stores URLs only — no data migration needed.

## Admin Dashboard Features
- Map-first HUD with live activity feed (SSE)
- Double-click map → place marker → create incident
- Click marker → read-only detail panel
- Edit incident metadata, timeline CRUD, source management
- Media upload (images + videos) with WebP compression
- Polygon zone drawing with vertex editing
- Location search (Nominatim) + coordinate parsing
- Full-text search with dropdown + modal
- Smart viewport filtering (100-event threshold)
- Live/historical mode indicator
- Ghost markers for out-of-range results
- Real-time SSE updates

## Public Website Features
- Awwwards-level homepage with live map hero background
- Interactive map explorer with incident details
- Real-time live activity feed + scrolling ticker
- "While you were away" banner
- Shareable incident URLs (deep-linking)
- Google OAuth sign-in
- Save/bookmark incidents
- Verification status filter

## Superadmin Console Features
- Live dashboard KPIs (users, incidents, audit, system health)
- Full staff user management with table, drawer, modal, bulk actions
- Public user management (search, ban/unban, saved incidents)
- Audit log viewer with filters, dense table, CSV export
- Domain & category taxonomy manager (17 domains, 162 categories)
- Recycle bin for soft-deleted incidents
- Real-time SSE auto-refresh across all pages
- Activity timelines in user profile drawers
- Deep-linking from activity to map

## Database Conventions
- Tables: plural, snake_case
- Columns: snake_case
- PK: UUID v4 (except domains/categories use SERIAL)
- Dates: UTC storage, local display
- Geometry: PostGIS Point (4326) for markers, Polygon (4326) for zones
- Flexible arrays: JSONB

## API Conventions
- Base: `/api/v1`
- Response: `{ success, data, message, error }`
- Auth header: `Authorization: Bearer <token>`

## Code Conventions
- Files: kebab-case
- Variables/functions: camelCase
- Components: PascalCase
- Constants: UPPER_SNAKE_CASE

## Cost Rules
- NO per-request pricing
- NO paid APIs for MVP
- Free tiers only until revenue justifies paid plans

## Shared Incident Detail System

All three frontends render incidents from a single shared component package under `src/shared/components/incident-detail/`.

### Routes

| App | Sidebar route | Full-page route |
|:--|:--|:--|
| user-web | `/map` (selected incident) | `/incident/:id` |
| admin-web | `DashboardLayout` selected incident panel | `/incident/:id` |
| superadmin-web | `/superadmin/map` selected incident panel | `/superadmin/incident/:id` |

### Design reference routes (admin-web only)

The original trial/prototype routes are preserved in `admin-web` for side-by-side comparison. See `trialRoutes.md`.

### Shared components

- `IncidentDetailSidebar.jsx` — compact card-style panel used inside map layouts.
- `IncidentDetailPage.jsx` — full-page layout with timeline rail + evidence rail.
- `EvidenceRail.jsx` / `EvidenceBundle.jsx` — evidence tabs and per-update evidence drawers.
- `XPostCompactList.jsx` — X/Twitter post list with archive screenshot fallback.
- `SourceCards.jsx` — media/article/admin-note cards.
- `SummaryCard.jsx`, `TimelineItem.jsx`, `StatusHistory.jsx`, `DebugMetadata.jsx`.

### Data flow

1. Frontend calls `api.getIncident(id)`.
2. Backend returns `{ incident, timeline }` where each timeline entry contains grouped `sources` and `media`.
3. Each app uses `mapIncidentForShared()` to normalize snake_case backend fields to the camelCase props the shared components expect.
4. Shared components render role-aware UI based on `mode` prop: `user` (read-only), `admin`, `superadmin`.

### CSS

`src/shared/styles/incident-detail.css` is imported in each app entry:
- `src/user-web/src/main.jsx`
- `src/admin-web/src/main.jsx`
- `src/superadmin-web/src/main.jsx`

### Curation callbacks

Admin/superadmin wrappers implement: `onUpdateIncident`, `onResolveIncident`, `onDeleteIncident`, `onRestoreIncident`, `onPurgeIncident`, `onAddUpdate`, `onEditUpdate`, `onDeleteUpdate`, `onAddEvidence`, `onEditEvidence`, `onDeleteEvidence`, `onPinEvidence`, `onFeatureEvidence`, `onClearFeatureEvidence`, `onArchiveSource`.

### X-post archive workflow

1. Admin clicks **Archive** on an X post.
2. Frontend uploads screenshot via `POST /incidents/:id/media` with `updateId`.
3. Frontend PATCHes source with `{ archived: true, archiveMediaId, archiveReason }`.
4. UI falls back to archived screenshot; **Unarchive** restores live embed.

### Current phase

The 9-phase `sidebarImplementationPlan.md` is complete. Work has shifted to minor UI tweaks and bug fixes in the implementation (sidebar widths, scrolling, spacing, etc.).

### Legacy cleanup

The following were removed in Phase 9:
- `src/admin-web/src/components/IncidentDetail/IncidentDetailPanel.jsx`
- `src/admin-web/src/components/DesignTrial/` (restored on request for comparison, now lives only in admin-web)
- `src/user-web/src/components/IncidentDetail/IncidentDetailView.jsx`

## Build Rules for Kimi Code
1. **Read `handoff.md` FIRST** — this is the single most important document
2. Read `PROJECT.md` for architecture and conventions
3. Read `commit.md` for full build history
4. Read `docs/design-brief.md` for frontend work
5. Read `docs/api-spec.md` for backend API work
6. Read `docs/database-schema.sql` for database work
7. Follow tech stack exactly — no unauthorized dependencies
8. Save code to correct src/ folder (backend/ vs user-web/ vs admin-web/ vs superadmin-web/)
9. Use database schema as single source of truth
10. Respect auth roles and security middleware
11. If requirement conflicts with cost, flag it immediately
12. Write Zod schemas for all API inputs
13. Include error handling in every function
14. **After every feature/fix: build → append to commit.md → give commit message**
15. Make MINIMAL changes — don't refactor unrelated code
16. When unsure, reference FR/NFR numbers below

## Functional Requirements
FR-1: Interactive world map with pan and zoom
FR-2: Event markers (dots) on map
FR-3: Marker color = event domain color
FR-4: Marker size = event severity
FR-5: Markers cluster at low zoom (Post-MVP)
FR-6: Date selector, today default
FR-7: Only active events on selected date visible
FR-8: Ongoing events persist across dates
FR-9: Past dates = Historical Mode
FR-10: Click marker → event detail panel
FR-11: Panel shows metadata (title, status, category, severity, verification)
FR-12: Panel shows chronological timeline
FR-13: Each update has timestamp + summary
FR-14: Embed X/Twitter post links
FR-15: Embedded sources in event timeline
FR-16: Embedding fallback to link + description
FR-17: Live Mode real-time updates via SSE ✅
FR-18: Real-time includes new events + status changes ✅
FR-19: Real-time via SSE ✅
FR-20: Admins create new events ✅
FR-21: Admins add timeline updates ✅
FR-22: Admins edit event metadata ✅
FR-23: Admins mark events resolved ✅
FR-24: Admins hide/delete events ✅
FR-25: Filter by category ✅
FR-26: Filter by severity ✅
FR-27: Filter by status ✅
FR-28: Media upload (images + videos) ✅
FR-29: Polygon zone drawing ✅
FR-30: Public user OAuth sign-in ✅
FR-31: Save/bookmark incidents ✅
FR-32: Full-text search ✅
FR-33: Audit logging ✅
FR-34: Superadmin user management ✅
FR-35: Public user management ✅

## Non-Functional Requirements
NFR-1: Map data loads within 2 seconds
NFR-2: Real-time updates within 5 seconds ✅
NFR-3: Support 10k+ concurrent read-only users
NFR-4: Backend supports horizontal scaling
NFR-5: Real-time multi-instance with Redis (Post-MVP)
NFR-6: 99% uptime excluding maintenance
NFR-7: Graceful network interruption handling
NFR-8: Admin endpoints require auth + authorization ✅
NFR-9: Public users cannot modify data ✅
NFR-10: Rate limiting against abuse ✅
NFR-11: Historical data modification requires audit ✅
NFR-12: Timeline chronological consistency ✅
NFR-13: Modular architecture ✅
NFR-14: Codebase supports future expansion ✅
NFR-15: Avoid per-request pricing ✅
NFR-16: Predictable monthly costs ✅
