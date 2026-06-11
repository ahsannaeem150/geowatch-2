# GeoWatch

> Map-based global conflict and major events visualization platform.

GeoWatch is a tactical intelligence dashboard that displays real-world incidents on an interactive dark-themed map. It combines a premium newsroom aesthetic with powerful geospatial tooling to help users explore events, filter by date and category, and dive into detailed timelines with credible source-backed updates.

---

## Platforms

| Platform | Status | Stack | URL |
|----------|--------|-------|-----|
| Public Website | ✅ MVP | React 18 + Vite + MapLibre GL JS | http://localhost:5173 |
| Admin Dashboard | ✅ MVP | React 18 + Vite + MapLibre GL JS | http://localhost:5174 |
| Superadmin Console | ✅ MVP | React 18 + Vite + MapLibre GL JS | http://localhost:5175 |
| Backend API | ✅ Complete | Express 4 + PostGIS + JWT | http://localhost:3000 |
| Native Android | 🔮 Future | React Native | — |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + Vite + MapLibre GL JS |
| Backend | Node.js 22 + Express 4 |
| Real-time | Server-Sent Events (SSE) |
| Database | PostgreSQL 16 + PostGIS 3 |
| Map Tiles | Martin (self-hosted `.mbtiles`) |
| Auth | JWT + bcryptjs |
| Validation | Zod |
| File Storage | Local disk (dev) → Cloudflare R2 (production) |
| Image Processing | Sharp (WebP + thumbnail) |

---

## Project Structure

```
geowatch/
├── src/
│   ├── backend/              # Express API
│   │   ├── server.js         # Entry point
│   │   └── src/
│   │       ├── config/       # database.js, env.js
│   │       ├── controllers/  # auth, incident, timeline, source, media, zone, user, audit, system
│   │       ├── services/     # business logic + SQL
│   │       ├── routes/       # Express routers
│   │       ├── middleware/   # auth, role, rate-limit, validate, error-handler
│   │       ├── validators/   # Zod schemas
│   │       ├── storage/      # LocalStorage engine + factory
│   │       └── utils/        # api-response, async-handler, oembed, audit-log, sse-broadcast
│   ├── user-web/             # Public-facing map website
│   ├── admin-web/            # Internal admin dashboard
│   ├── superadmin-web/       # Superadmin console (navy theme)
│   └── shared/               # Design tokens, constants, shared components
├── assets/
│   └── tiles/                # Self-hosted .mbtiles (gitignored)
├── docs/
│   ├── api-spec.md
│   ├── database-schema.sql
│   ├── design-brief.md
│   ├── env-template.md
│   ├── dev-credentials.md
│   └── migrations/           # SQL migration scripts
├── scripts/
│   ├── start-geowatch.sh     # One-command launcher
│   ├── stop-geowatch.sh
│   ├── status-geowatch.sh
│   ├── logs-geowatch.sh
│   └── download-martin.sh
├── seeds.sql                 # Sample data for development
├── srs.docx                  # Software Requirements Specification
├── commit.md                 # Full build history
├── PROJECT.md                # Architecture & conventions
└── readme.md                 # This file
```

---

## Quick Start

### Prerequisites

- Node.js >= 20
- PostgreSQL 16 + PostGIS 3
- Martin tile server

### 1. Download Martin (Tile Server)

```bash
npm run setup:martin
```

This downloads the Martin binary (~35MB) to `tools/martin`. It is **not** committed to Git.

### 2. Database Setup

```bash
# Create database and user (requires postgres role)
sudo -u postgres psql -f docs/database-schema.sql
sudo -u postgres psql -d geowatch_dev -f seeds.sql
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Environment Variables

```bash
cp src/backend/.env.example src/backend/.env.development
# Edit values as needed
```

### 5. Start All Services (One Command)

```bash
# Start Martin + Backend + Admin Web + User Web + Superadmin Web
./scripts/start-geowatch.sh
```

This launches all five services in the background, opens the admin dashboard in your default browser, and writes logs to `./logs/`.

| Service | URL |
|---------|-----|
| Backend API | http://localhost:3000/api/v1 |
| Admin Dashboard | http://localhost:5174 |
| Public Website | http://localhost:5173 |
| Superadmin Console | http://localhost:5175 |
| Tile Server | http://localhost:8080 |

**Helper scripts:**

```bash
# Stop all services
./scripts/stop-geowatch.sh

# Check service status
./scripts/status-geowatch.sh

# View recent logs from all services
./scripts/logs-geowatch.sh

# Watch a specific service log live
./scripts/logs-geowatch.sh backend
```

**Manual start (if you prefer separate terminals):**

```bash
# Terminal 1: Martin tile server
./scripts/start-martin.sh

# Terminal 2: Backend API
npm run dev:backend

# Terminal 3: Admin dashboard
npm run dev:admin-web

# Terminal 4: Public website
npm run dev:user-web

# Terminal 5: Superadmin console
npm run dev:superadmin-web
```

### 6. Build Commands

```bash
npm run build:admin-web
npm run build:user-web
npm run build:superadmin-web
```

---

## API Response Format

All responses follow this structure:

```json
{
  "success": true,
  "data": {},
  "message": "Optional",
  "error": null
}
```

Full spec: [`docs/api-spec.md`](docs/api-spec.md)

---

## Default Dev Credentials

| Email | Password | Role |
|-------|----------|------|
| `admin@geowatch.local` | `AdminPass123!` | `super_admin` |
| `editor@geowatch.local` | `EditorPass123!` | `admin` |

> Change these passwords before any production deployment.

---

## Key Features

### Admin Dashboard
- Map-first HUD with live activity feed
- Double-click to create incidents, click markers to view/edit
- Full incident CRUD with timeline and source management
- Media upload (images + videos) with WebP compression
- Polygon zone drawing with vertex editing
- Smart viewport filtering (auto-switches at 100+ incidents)
- Live/historical mode indicator
- Location search (Nominatim geocoding) + coordinate parsing (DD/DDM/DMS)
- Full-text event search with dropdown + modal
- Ghost markers for out-of-range search results
- Real-time SSE updates

### Public Website
- Awwwards-level homepage with live map hero
- Interactive map explorer with incident details
- Real-time live activity feed + scrolling ticker
- "While you were away" banner
- Shareable incident URLs (deep-linking)
- Google OAuth sign-in
- Save/bookmark incidents
- Verification status indicators

### Superadmin Console
- Live dashboard KPIs (users, incidents, audit, system health)
- Full user management (staff + public users) with bulk actions
- Audit log viewer with filters and CSV export
- Domain & category taxonomy manager (17 domains, 162 categories)
- Recycle bin for soft-deleted incidents
- Real-time SSE auto-refresh
- Activity timelines in user profiles
- Deep-linking from activity to map

### Backend
- JWT authentication with role-based access control
- PostGIS geospatial queries with viewport filtering
- Full-text search across incidents and timeline updates
- SSE real-time broadcasting
- Immutable audit logging
- Image processing (Sharp: WebP + thumbnail)
- Video pass-through support
- Zone management with spatial queries
- Public user OAuth (Google)
- Saved incidents / bookmarks

---

## Design Philosophy

GeoWatch is **not** a generic maps clone. It is a tactical intelligence dashboard meets premium newsroom aesthetic — think Bloomberg Terminal + modern dark-mode SaaS.

- **Dark mode first** (deep charcoal `#050505`)
- **Crimson Seal accent** (`#5a011c` / `#9f1239`)
- **Three interface styles**: Tactical (default), SaaS, Glassmorphism
- **Sharp, serious UI** — no rounded bubbly components
- **Data-first layout** — the map is king

Full design specs: [`docs/design-brief.md`](docs/design-brief.md)

---

## Database Schema

PostgreSQL with PostGIS extensions. Key tables:

- `users` — staff admins and super admins
- `public_users` — Google-authenticated public users
- `incidents` — geolocated incidents with PostGIS `geom` points
- `incident_sources` — embedded sources (X/Twitter, news, notes, images, videos)
- `incident_updates` — chronological timeline entries
- `incident_media` — file upload metadata
- `zones` — polygon regions with PostGIS `geom`
- `domains` / `categories` — hierarchical incident taxonomy (17 domains, 162 categories)
- `audit_logs` — immutable action audit trail
- `deleted_incidents_log` — soft-delete tracking
- `user_saved_incidents` — public user bookmarks

Full schema: [`docs/database-schema.sql`](docs/database-schema.sql)

---

## Cost Constraints

- **Development:** $0 (local machine)
- **Launch:** $0–10/month (Oracle Cloud Free Tier + Vercel free + domain)
- **No per-request pricing models**
- **Free tiers only** until revenue justifies paid plans

---

## License

Proprietary — All rights reserved.

---

*Built with precision. Designed for clarity.*
