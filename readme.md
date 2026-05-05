# GeoWatch

> Map-based global conflict and major events visualization platform.

GeoWatch is a tactical intelligence dashboard that displays real-world incidents on an interactive dark-themed map. It combines a premium newsroom aesthetic with powerful geospatial tooling to help users explore events, filter by date and category, and dive into detailed timelines with credible source-backed updates.

---

## Platforms

| Platform | Status | Stack |
|----------|--------|-------|
| Public Website | MVP | React 18 + Vite + MapLibre GL JS |
| Admin Dashboard | MVP | React 18 + Vite + MapLibre GL JS |
| Native Android | Future | React Native |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + Vite + MapLibre GL JS |
| Backend | Node.js + Express 4 |
| Real-time | Socket.IO (backend ready, frontend post-MVP) |
| Database | PostgreSQL 16 + PostGIS 3 |
| Map Tiles | Martin (self-hosted `.mbtiles`) |
| Auth | JWT + bcryptjs |
| Validation | Zod |

---

## Project Structure

```
geowatch/
├── src/
│   ├── backend/         # Node.js + Express API
│   ├── user-web/        # Public-facing map website
│   ├── admin-web/       # Internal admin dashboard
│   └── shared/          # Design tokens & constants
├── assets/
│   └── tiles/           # Self-hosted .mbtiles (gitignored)
├── docs/
│   ├── api-spec.md
│   ├── database-schema.sql
│   ├── design-brief.md
│   └── env-template.md
├── seeds.sql            # Sample data for development
├── srs.docx             # Full specification
└── readme.md            # This file
```

---

## Quick Start

### Prerequisites

- Node.js >= 20
- PostgreSQL 16 + PostGIS 3
- Martin tile server

### 1. Database Setup

```bash
# Create database and user (requires postgres role)
sudo -u postgres psql -f docs/database-schema.sql
sudo -u postgres psql -d geowatch_dev -f seeds.sql
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Variables

```bash
cp src/backend/.env.example src/backend/.env.development
# Edit values as needed
```

### 4. Start Services

```bash
# Terminal 1: Martin tile server
./scripts/start-martin.sh

# Terminal 2: Backend API
npm run dev:backend

# Terminal 3: Public website
npm run dev:user-web

# Terminal 4: Admin dashboard
npm run dev:admin-web
```

| Service | URL |
|---------|-----|
| Backend API | http://localhost:3000/api/v1 |
| User Website | http://localhost:5173 |
| Admin Dashboard | http://localhost:5174 |
| Tile Server | http://localhost:8080 |

---

## Default Admin Credentials

| Field | Value |
|-------|-------|
| Email | `admin@geowatch.local` |
| Password | `AdminPass123!` |

> Change this password before any production deployment.

---

## Design Philosophy

GeoWatch is **not** a generic maps clone. It is a tactical intelligence dashboard meets premium newsroom aesthetic — think Bloomberg Terminal + modern dark-mode SaaS.

- **Dark mode only** (deep charcoal `#0f1117`)
- **Sharp, serious UI** — no rounded bubbly components
- **Data-first layout** — the map is king
- **Electric cyan accents** on subtle grey surfaces

Full design specs: [`docs/design-brief.md`](docs/design-brief.md)

---

## API Documentation

All endpoints use the standard response format:

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

## Database Schema

PostgreSQL with PostGIS extensions. Key tables:

- `users` — admins and super admins
- `events` — geolocated incidents with PostGIS `geom` points
- `event_sources` — embedded sources (X/Twitter, news, notes)
- `event_updates` — chronological timeline entries
- `zones` — polygon regions (post-MVP)

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
