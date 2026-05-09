# GeoWatch — Project Master Document

## Product
Map-based global conflict and major events visualization platform.

## Platforms (Phase 1)
| Platform | Status | Stack |
|:--|:--|:--|
| **Backend API** | ✅ Complete | Express 4 + PostGIS + JWT |
| **Admin Dashboard** | ✅ Complete | React 18 + Vite + MapLibre GL JS |
| **Public Website** | ⏳ Not Started (Module 8) | React 18 + Vite + MapLibre GL JS |
| Native Android App | 🔮 Phase 2 (future) | React Native |

### Module Status
| Module | Status | Description |
|:--|:--|:--|
| Module 1 — Dev Environment | ✅ | Postgres, schema, seeds, env, workspaces |
| Module 2 — Martin Tile Server | ✅ | Binary, start script, dark style |
| Module 3 — Backend Foundation | ✅ | Express, middleware, rate limiting, health check |
| Module 4 — Backend Auth | ✅ | JWT, bcrypt, role guards, /auth endpoints |
| Module 5 — Backend Events API | ✅ | CRUD, PostGIS, date filtering, viewport, oEmbed |
| Module 6 — Shared Design System | ✅ | CSS tokens, Button, Badge, Skeleton |
| Module 7 — Admin Dashboard | ✅ | Split-screen, map CRUD, timeline, viewport filtering |
| Module 8 — Public User Website | ⏳ | Read-only map site. Next priority. |
| UI Template Overhaul | 🔮 | User wants web template. Do NOT start until template chosen. |

## Tech Stack
| Layer | Technology |
|-------|------------|
| Frontend | React 18 + Vite + MapLibre GL JS |
| Backend | Node.js + Express 4 |
| Real-time | Socket.IO (backend ready, frontend Post-MVP) |
| Database | PostgreSQL 16 + PostGIS 3 |
| Map Tiles | Martin (self-hosted .mbtiles) |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Validation | Zod |
| Rate Limit | express-rate-limit |
| CORS | cors |
| Environment | dotenv |
| Dev Runner | nodemon |

## Auth Roles
- super_admin: Full access, manage admins, delete events
- admin: Create/edit events, timeline updates, cannot manage users
- viewer: Future read-only role

## Map Rules
- Self-hosted .mbtiles via Martin on localhost:8080
- MapLibre GL JS renders vector tiles
- NO Google Maps API. NO MapTiler for MVP.

## Media Rules (MVP)
- NO direct image/video uploads
- External embeds only: X/Twitter oEmbed, news article links
- Post-MVP: Direct uploads via Cloudflare R2

## Admin MVP Features
- Click map to place marker
- Paste lat/lng → map flies there → place marker
- Event form: title, category, severity, status, date range, description
- Add X URL → auto-fetch oEmbed → store as source tab
- Multi-admin support (super_admin manages roles)

## Admin Post-MVP
- Location search by city/landmark
- Draw polygons/zones with colors
- Image/video upload tabs
- News article embeds
- Real-time updates

## Database Conventions
- Tables: plural, snake_case
- Columns: snake_case
- PK: UUID v4
- Dates: UTC storage, local display
- Geometry: PostGIS Point (4326) for markers, Polygon (4326) for zones
- Flexible arrays: JSONB

## API Conventions
- Base: /api/v1
- Response: { success, data, message, error }
- Auth header: Authorization: Bearer &lt;token&gt;

## Code Conventions
- Files: kebab-case
- Variables/functions: camelCase
- Components: PascalCase
- Constants: UPPER_SNAKE_CASE

## Cost Rules
- NO per-request pricing
- NO paid APIs for MVP
- Free tiers only until revenue justifies paid plans

## Build Rules for Kimi Code
1. **Read `docs/handoff.md` FIRST** — this is the single most important document
2. Read `PROJECT.md` for architecture and conventions
3. Read `commit.md` for full build history
4. Read `docs/design-brief.md` for frontend work
5. Read `docs/api-spec.md` for backend API work
6. Read `docs/database-schema.sql` for database work
7. Follow tech stack exactly — no unauthorized dependencies
8. Save code to correct src/ folder (backend/ vs user-web/ vs admin-web/)
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
FR-3: Marker color = event category
FR-4: Marker size = event severity
FR-5: Markers cluster at low zoom
FR-6: Date selector, today default
FR-7: Only active events on selected date visible
FR-8: Ongoing events persist across dates
FR-9: Past dates = Historical Mode
FR-10: Click marker → event detail panel
FR-11: Panel shows metadata (title, status, category, severity)
FR-12: Panel shows chronological timeline
FR-13: Each update has timestamp + summary
FR-14: Embed X/Twitter post links
FR-15: Embedded sources in event timeline (tabs)
FR-16: Embedding fallback to link + description
FR-17: Live Mode real-time updates (Post-MVP)
FR-18: Real-time includes new events + status changes (Post-MVP)
FR-19: Real-time via Socket.IO (Post-MVP)
FR-20: Admins create new events
FR-21: Admins add timeline updates
FR-22: Admins edit event metadata
FR-23: Admins mark events resolved
FR-24: Admins hide/delete events (super_admin only for delete)
FR-25: Filter by category
FR-26: Filter by severity
FR-27: Filter by status

## Non-Functional Requirements
NFR-1: Map data loads within 2 seconds
NFR-2: Real-time updates within 5 seconds (Post-MVP)
NFR-3: Support 10k+ concurrent read-only users
NFR-4: Backend supports horizontal scaling
NFR-5: Real-time multi-instance with Redis (Post-MVP)
NFR-6: 99% uptime excluding maintenance
NFR-7: Graceful network interruption handling
NFR-8: Admin endpoints require auth + authorization
NFR-9: Public users cannot modify data
NFR-10: Rate limiting against abuse
NFR-11: Historical data modification requires audit
NFR-12: Timeline chronological consistency
NFR-13: Modular architecture
NFR-14: Codebase supports future expansion
NFR-15: Avoid per-request pricing
NFR-16: Predictable monthly costs