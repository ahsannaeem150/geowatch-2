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
