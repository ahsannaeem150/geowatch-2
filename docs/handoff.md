# GeoWatch — Complete Project Handoff Document

> **Read this file first** before doing any work on GeoWatch.
> This document contains the full context of everything built so far, our work patterns, and what's next.

---

## 1. Project Overview

**GeoWatch** is a map-based global conflict and major events visualization platform. Think of it as a tactical intelligence dashboard — Bloomberg Terminal aesthetic meets dark-mode SaaS.

- **Admin Dashboard** (Module 7, built): Split-screen map + event management for admins
- **Public User Website** (Module 8, pending): Read-only public-facing map site
- **Backend API** (Modules 3–5, built): Express + PostGIS + JWT auth

---

## 2. Tech Stack (Exact Versions)

| Layer | Technology | Version |
|:--|:--|:--|
| Frontend | React + Vite + MapLibre GL JS | React 18, Vite 5.4, MapLibre 4.x |
| Backend | Node.js + Express | Node 22, Express 4 |
| Database | PostgreSQL + PostGIS | PG 16, PostGIS 3 |
| Tile Server | Martin | v1.8.2 (self-hosted binary) |
| Auth | JWT + bcryptjs | jsonwebtoken, bcryptjs |
| Validation | Zod | zod |
| Date formatting | date-fns | date-fns |
| Monorepo | npm workspaces | — |

**Path alias:** `@shared` resolves to `src/shared/` in both frontends.

---

## 3. Project Structure

```
geowatch/
├── src/
│   ├── backend/              # Express API
│   │   ├── server.js         # Entry point
│   │   ├── src/
│   │   │   ├── config/       # database.js, env.js
│   │   │   ├── controllers/  # auth, event, timeline, source
│   │   │   ├── services/     # auth, event, timeline, source
│   │   │   ├── routes/       # auth, event, timeline, source, health
│   │   │   ├── middleware/   # auth, role, rate-limit, validate, error-handler, response-wrapper
│   │   │   ├── validators/   # Zod schemas
│   │   │   └── utils/        # api-response, async-handler, oembed
│   │   ├── .env.development  # Dev env (loaded first by env.js)
│   │   └── .env.example
│   ├── admin-web/            # Admin dashboard (COMPLETE)
│   │   ├── index.html        # Twitter widgets.js script included
│   │   ├── vite.config.js
│   │   ├── public/
│   │   │   └── map-style-dark.json
│   │   └── src/
│   │       ├── main.jsx
│   │       ├── App.jsx       # React Router: /login + protected /
│   │       ├── index.css     # Global styles + shimmer + slideUp + pulse
│   │       ├── services/api.js
│   │       ├── contexts/AuthContext.jsx
│   │       └── components/
│   │           ├── Layout/
│   │           │   ├── TopBar.jsx           # Logo, date range, LIVE/HISTORIC pill, Today btn, user
│   │           │   └── DashboardLayout.jsx  # 60/40 split, smart viewport filtering, toast
│   │           ├── Map/
│   │           │   └── AdminMap.jsx         # MapLibre, markers, viewport reporting
│   │           ├── EventForm/
│   │           │   └── EventForm.jsx        # Create/edit with datetime-local, sources
│   │           ├── EventList/
│   │           │   └── EventTable.jsx       # Sortable table, resolve modal, delete
│   │           ├── EventDetail/
│   │           │   └── EventDetailPanel.jsx # Read-only viewer, timeline CRUD, meta cards
│   │           └── Login/
│   │               └── LoginPage.jsx
│   ├── user-web/             # Public website (NOT BUILT YET — Module 8)
│   │   ├── index.html
│   │   ├── vite.config.js
│   │   ├── public/
│   │   │   └── map-style-dark.json
│   │   └── src/
│   │       └── (empty — bootstrap only)
│   └── shared/               # Shared across both frontends
│       ├── constants.js      # Category colors, severity scale, enums, API URLs
│       ├── design-tokens.css # Dark-mode CSS variables
│       └── components/
│           ├── Button.jsx
│           ├── Badge.jsx
│           ├── Skeleton.jsx
│           ├── TimelineEntry.jsx
│           └── DateTimePicker.jsx
├── assets/
│   └── tiles/                # tiles.mbtiles (gitignored)
├── tools/
│   └── martin                # Binary (~35MB, gitignored)
├── scripts/
│   ├── start-martin.sh
│   ├── download-martin.sh
│   └── test-tiles.html
├── docs/
│   ├── api-spec.md
│   ├── database-schema.sql
│   ├── design-brief.md
│   ├── dev-credentials.md
│   ├── env-template.md
│   ├── grant-permissions.sql
│   └── handoff.md           # ← This file
├── seeds.sql
├── package.json              # npm workspaces
├── readme.md
├── commit.md                 # Full build history — append to this
└── PROJECT.md                # Master project document
```

---

## 4. Complete Build History (What Exists)

### Module 1 — Dev Environment & Database
- PostgreSQL schema with PostGIS, seeds with UUIDs, `.env` files, professional readme

### Module 2 — Martin Tile Server
- Martin v1.8.2 binary, start script, dark map style, test HTML
- **Later removed binary** from git → `scripts/download-martin.sh` + `npm run setup:martin`

### Module 3 — Backend Foundation
- Express with `{ success, data, message, error }` response wrapper
- Error handling, rate limiting (general/auth/admin-write), Zod validation, async handler
- Health check endpoint

### Module 4 — Backend Authentication
- JWT with bcryptjs, login/register/me/admins routes
- Auth middleware (Bearer JWT), role middleware (`requireRole`)
- Roles: `super_admin`, `admin`, `viewer`
- DB permission fix (`grant-permissions.sql`)

### Module 5 — Backend Events API
- Full CRUD with PostGIS, date-based visibility filtering
- Viewport filtering (bounding box queries)
- Timeline and sources endpoints with X/Twitter oEmbed auto-fetch

### Permission Fix
- `admin` can delete events and create `viewer` users
- `super_admin` has full access

### Module 6 — Shared Design System
- CSS tokens (`design-tokens.css`), shared constants
- `Button`, `Badge`, `Skeleton` components
- Both frontends bootstrapped with Vite + `@shared` alias

### Module 7 — Admin Dashboard (Fully Built)
- Split-screen 60/40 layout with bottom event table strip
- Login page, JWT auth with localStorage persistence
- **Map interaction model:**
  - Double-click empty map → Create form with coordinates
  - Single-click existing marker → Read-only detail panel
  - Click "Edit Event" in detail → Switches to edit form
  - Click table row → Map flies to event, detail panel opens
- **EventForm**: datetime-local inputs, dynamic sources builder
- **EventTable**: sortable, Edit/Resolve/Delete actions, resolve modal with smart warning
- **EventDetailPanel**: full timeline CRUD (add/edit/delete), Twitter/X embed support, redesigned meta cards
- **Date range picker**: From → To with auto-sync logic
- **TopBar**: LIVE MODE / HISTORIC MODE pill, Today reset button
- **Smart viewport filtering**: ≤100 events = load all, >100 events = viewport-only

### Map Style Rewrite
- Full rewrite of `map-style-dark.json` with visible street-level detail
- All road classes, buildings, road names, POIs, villages
- Water darkened to `#1c2636` (muted slate blue)

### Key Bug Fixes Along the Way
- Map marker hover/click bugs (child element scaling, separate selection effect)
- White-screen crash (`parseFloat` before `toFixed` for PostgreSQL DECIMAL strings)
- Deleted marker stale state (`onRefresh` → `refreshKey` pattern)
- Map text labels restored (MapLibre free font CDN)
- Empty source URL validation (strip empty strings before sending)
- Twitter/X embed dark mode (`theme=dark` + `data-theme="dark"` injection)
- Event datetime support (`DATE` → `TIMESTAMP WITH TIME ZONE`)
- Resolved event 1-day grace period

---

## 5. Design System

### Colors (from `design-tokens.css`)
```css
--bg-deep: #0f1117       /* Deepest background */
--bg-surface: #1a1d29    /* Cards/panels */
--bg-input: #161822      /* Input fields */
--bg-hover: #222636      /* Hover states */
--text-primary: #e8e9ec  /* Headings */
--text-secondary: #9a9da8 /* Body */
--text-muted: #5a5e6b    /* Labels */
--accent-cyan: #00d4ff   /* Primary accent */
--danger: #ff4757        /* Errors/destructive */
--warning: #ffa502       /* Warnings */
--success: #2ed573       /* Success */
```

### Category Colors
```js
conflict: '#ff4757',      // Red
protest: '#ffa502',       // Orange
disaster: '#ff6348',      // Coral
diplomacy: '#00d4ff',     // Cyan
humanitarian: '#2ed573',  // Green
other: '#778ca3'          // Gray
```

### Severity Scale
```js
1: { label: 'Minimal', radius: 6 }
2: { label: 'Low', radius: 8 }
3: { label: 'Moderate', radius: 10 }
4: { label: 'High', radius: 12 }
5: { label: 'Critical', radius: 14 }
```

### Typography
- Sans: `'Inter', -apple-system, sans-serif`
- Mono: `'JetBrains Mono', 'Fira Code', monospace`

---

## 6. Backend Architecture

### API Response Format
```json
{
  "success": true,
  "data": {},
  "message": "Optional",
  "error": null
}
```

### Rate Limiters
- General: 100 requests / 15 min
- Auth: 10 requests / 15 min
- Admin write: 50 requests / 15 min

### Auth Middleware
- Verifies Bearer JWT, attaches `req.user` with `{ id, email, role, full_name }`
- `requireRole(['admin', 'super_admin'])` guards admin endpoints

### Key Services

**`event.service.js`:**
- `listEvents(filters)` → `{ events, count, hasMore }` (LIMIT 301, COUNT(*))
- `getEventById(id)` → `{ event, sources, timeline }`
- `createEvent(data, createdBy)` — auto-sets `status = 'resolved'` if `endDate` provided
- `updateEvent(id, data)` — auto-sets `status` based on `endDate`
- `resolveEvent(id, resolvedBy, resolvedAt)` — sets status + end_date

**`timeline.service.js`:**
- `createTimelineUpdate` — fetches oEmbed for X URLs
- `updateTimelineEntry` — edit summary/date/source
- `deleteTimelineEntry`

**`source.service.js`:**
- `createEventSource` — fetches oEmbed for X URLs

### Date Filtering Logic (Grace Period)
- Active events: visible until `end_date`
- Resolved events: visible until `end_date + 1 day`
- Range mode: overlap check — `start_date <= range_end AND (end_date + grace) >= range_start`

---

## 7. Frontend Architecture

### Admin Dashboard Interaction Flow
```
DashboardLayout
├── TopBar (date range, mode pill, Today btn)
├── 60%: AdminMap (markers, viewport reporting)
├── 40%: Panel
│   ├── 'empty' → instructional screen
│   ├── 'detail' → EventDetailPanel
│   └── 'form' → EventForm (create/edit)
└── Bottom: EventTable
```

### Smart Viewport Filtering
```
1. Date range changes
2. Fetch WITHOUT viewport → get { events, count, hasMore }
3. IF count <= 100:
   → viewportFiltering = false
   → show all events
   → map pans freely, NO re-fetches
4. IF count > 100:
   → viewportFiltering = true
   → fetch WITH current viewport bounds
   → every map pan/zoom re-fetches with new bounds
   → overlay shows: "47 visible in current area · 1,247 total — zoom or pan to explore"
```

### Date Range Auto-Sync
```
When user changes From date:
  IF newFrom < today AND currentTo === today:
    → auto-set To = From (single day view)
  ELSE IF newFrom > currentTo:
    → auto-set To = From (fix invalid range)

When user changes To date:
  IF newTo < currentFrom:
    → auto-set From = To (fix invalid range)
```

### API Client (`src/admin-web/src/services/api.js`)
```js
api.getEvents({ dateFrom, dateTo, viewport, category, severity, status })
api.getEvent(id)
api.createEvent(body)
api.updateEvent(id, body)
api.deleteEvent(id)
api.resolveEvent(id, { resolvedAt })
api.addTimeline(eventId, { summary, updateDate, sourceUrl })
api.updateTimeline(eventId, updateId, { summary, updateDate, sourceUrl })
api.deleteTimeline(eventId, updateId)
api.addSource(eventId, { sourceType, sourceUrl, description })
```

---

## 8. Database Schema (Key Tables)

```sql
users (id UUID PK, email, password_hash, full_name, role, created_at)
events (id UUID PK, title, description, latitude, longitude, geom(Point,4326),
        category, severity, status, start_date, end_date,
        created_by FK, created_at, updated_at, resolved_at, resolved_by)
event_sources (id UUID PK, event_id FK, source_type, source_url, embed_html,
               media_url, description, display_order, created_at)
event_updates (id UUID PK, event_id FK, summary, update_date,
               source_url, embed_html, created_by FK, created_at)
```

**Key schema details:**
- `events.start_date` and `events.end_date` are `TIMESTAMP WITH TIME ZONE`
- `events.status` defaults to `'active'`, auto-set to `'resolved'` when `end_date` is provided
- `events.geom` is auto-generated from lat/lng on insert/update

---

## 9. Default Dev Credentials

| Email | Password | Role |
|:--|:--|:--|
| `admin@geowatch.local` | `AdminPass123!` | `super_admin` |
| `editor@geowatch.local` | `EditorPass123!` | `admin` |
| `viewer@geowatch.local` | `ViewerPass123!` | `viewer` |

**Database:** `geowatch_dev` | **User:** `geowatch_user` | **Pass:** `geowatch_dev_pass_2024`

---

## 10. How to Run

```bash
# 1. Martin tile server
./scripts/start-martin.sh

# 2. Backend
npm run dev:backend        # localhost:3000

# 3. Admin dashboard
npm run dev:admin-web      # localhost:5174

# 4. User website (not built yet)
npm run dev:user-web       # localhost:5173
```

**Build commands:**
```bash
npm run build:admin-web
npm run build:user-web
npm run build:backend
```

---

## 11. Work Patterns (IMPORTANT — Follow These)

### After Every Feature/Fix:
1. **Build the app** (`npm run build:admin-web`) — verify no compile errors
2. **Append to `commit.md`** — document what changed, why, and files affected
3. **Give a git commit message** — conventional commits format

### Commit Message Format:
```
feat: description
fix: description
style: description
chore: description
```

### Documentation Maintenance:
- `commit.md` — append new entries, never overwrite
- `readme.md` — update if setup steps or features change
- `docs/api-spec.md` — update if endpoints change
- `PROJECT.md` — update if architecture or conventions change

### Code Style:
- Follow existing code style in the file you're editing
- Make MINIMAL changes — don't refactor unrelated code
- Use `@shared` path alias for shared components/constants
- Dark theme only — no light mode
- No external UI libraries — pure React + CSS

---

## 12. Known Issues & Active Decisions

| Issue | Status | Notes |
|:--|:--|:--|
| **Module 8 — Public User Website** | Pending | Not started. Will share admin layout but read-only. |
| **UI overhaul** | Planned | User said current UI is "generic." Will search web for a template to copy. **Do NOT do full UI changes until template is chosen.** |
| **DateTimePicker component** | Shelved | Built but reverted — native `datetime-local` inputs have poor dark theme visibility. Will revisit during UI overhaul. |
| **Self-hosted fonts** | Future | Currently using MapLibre's free font CDN (`demotiles.maplibre.org`). Self-hosting is a future enhancement. |
| **Martin manual restart** | Known | `./scripts/start-martin.sh` must be run after PC restart. |
| **MapLibre chunk size warning** | Known | Vite warns about JS chunk >500KB due to MapLibre. Not urgent — code-splitting is post-MVP. |

---

## 13. What's Next (Priority Order)

1. **Module 8 — Public User Website**
   - Same split-screen layout as admin but read-only
   - No auth required
   - Same map, same event data, same date range picker
   - Event detail panel (read-only, no timeline CRUD)
   - Possibly a sidebar with event list

2. **UI Template Overhaul**
   - User explicitly said current UI looks generic
   - Will search web for a template and copy it
   - Wait for user to choose template before implementing

3. **Marker Clustering (Supercluster)**
   - When events exceed viewport filtering comfort
   - Industry standard for dense marker situations

4. **Heatmap Layer**
   - At low zoom / large ranges, show density instead of individual markers

---

## 14. Quick Reference: Key Files by Task

| Task | Key Files |
|:--|:--|
| Add backend endpoint | `src/backend/src/routes/*.routes.js`, `src/backend/src/controllers/*.controller.js`, `src/backend/src/services/*.service.js`, `src/backend/src/validators/*.schema.js` |
| Add frontend component | `src/admin-web/src/components/`, `src/shared/components/` |
| Change map style | `assets/map-style-dark.json` → copy to `src/admin-web/public/` and `src/user-web/public/` |
| Change colors/tokens | `src/shared/design-tokens.css`, `src/shared/constants.js` |
| Change auth behavior | `src/backend/src/middleware/auth.middleware.js`, `src/backend/src/middleware/role.middleware.js` |
| Change event filtering | `src/backend/src/services/event.service.js` |
| Change date picker | `src/admin-web/src/components/Layout/TopBar.jsx` |
| Change map behavior | `src/admin-web/src/components/Map/AdminMap.jsx` |
| Change API calls | `src/admin-web/src/services/api.js` |
| Add shared component | `src/shared/components/` + import in Vite config |

---

*Last updated: 2026-05-08*
*Next Kimi: Read this file first, then `PROJECT.md`, then `commit.md` for full history.*
