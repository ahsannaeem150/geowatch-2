# GeoWatch Polygon / Zone Feature — Implementation Plan

> **Document Purpose:** This plan is designed to survive context compaction. After each phase, the user's context will be compacted, and they will copy-paste the "Initiation Prompt" for the next phase into a fresh conversation. Every phase contains exhaustive technical detail, file references, architectural decisions, and exact specifications so that ANY AI instance can pick up where the previous one left off.

---

## Project Context (Read This First)

### Architecture Overview

**GeoWatch** is a monorepo with three React frontends and one Express backend:

```
/src
  /backend          → Express 4 API, PostgreSQL 16 + PostGIS 3, port 3000
  /admin-web        → React 18 + Vite, MapLibre GL JS, port 5173
  /user-web         → React 18 + Vite, MapLibre GL JS, port 5174
  /superadmin-web   → React 18 + Vite, MapLibre GL JS, port 5175
  /shared           → Design tokens, constants, shared React components/hooks
```

### Key Technologies

- **Map library:** `maplibre-gl` (NOT Mapbox — no Mapbox token, open source)
- **Database:** PostgreSQL with PostGIS extension (`geowatch_dev` database)
- **Query pattern:** `import { query } from '../config/database.js'` — simple async pg pool wrapper
- **API pattern:** Controllers use `res.apiSuccess(data, message)` / `res.apiError(message, code, status)` via response-wrapper middleware
- **Auth:** JWT Bearer tokens, `authenticate` middleware, `requireRole(['admin','super_admin'])`
- **Validation:** Zod schemas in `src/backend/src/validators/`
- **Frontend API:** `src/admin-web/src/services/api.js` — fetch wrapper with automatic Bearer token injection

### Existing Database Schema (Relevant Tables)

The `zones` table already exists in `docs/database-schema.sql` as a "Post-MVP" stub:

```sql
CREATE TABLE zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    geom GEOMETRY(Polygon, 4326) NOT NULL,
    fill_color VARCHAR(7) NOT NULL DEFAULT '#FF0000',
    stroke_color VARCHAR(7) NOT NULL DEFAULT '#000000',
    stroke_width INTEGER NOT NULL DEFAULT 2,
    opacity DECIMAL(3, 2) NOT NULL DEFAULT 0.35,
    category VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_zones_geom ON zones USING GIST(geom);
```

**Important:** The `zones` table may or may not exist in the actual database yet. If it doesn't, run the CREATE TABLE + INDEX + trigger statements. The `update_updated_at_column()` trigger function and `update_zones_updated_at` trigger already exist in the schema file.

### Existing Map Component (`AdminMap.jsx`)

The admin map is in `src/admin-web/src/components/Map/AdminMap.jsx`. Key facts:

- Uses `maplibregl.Map` with style loaded from `/map-style-dark.json` (and light variant)
- Markers are DOM-based (`new maplibregl.Marker({ element: el })`) stored in a `Map()` called `markers.current`
- Markers are managed through `useEffect` hooks: one for create/update/remove, one for selection styling
- Map has `onMapDblClick`, `onEventClick`, `onViewportChange` callbacks passed from parent
- Double-click on map creates an incident (handled by parent `DashboardLayout`)
- `flyToCoords` prop triggers `map.current.flyTo()`
- The map returns a single `<div>` with the map container and some `<style>` for animations

### Design Tokens (Relevant for Zone Colors)

From `src/shared/design-tokens.css`:

```css
--accent: #5a011c;
--accent-light: #9f1239;
--accent-glow: rgba(90, 1, 28, 0.35);
--bg-surface: #0a0a0c;
--border-subtle: #242429;
--text-primary: #f2f2f2;
--text-secondary: #9ca3af;
--text-muted: #6b7280;
```

### API Service Pattern

`src/admin-web/src/services/api.js` exports an `api` object with methods like:

```js
export const api = {
  getIncidents: (params = {}) => { /* ... */ },
  createIncident: (body) => request('/incidents', { method: 'POST', body: JSON.stringify(body) }),
  // etc.
};
```

Add new zone methods to this object. The `request()` helper automatically injects the Bearer token from `localStorage.getItem('geowatch_token')`.

### Backend Route/Controller/Service Pattern

**Route file** (`src/backend/src/routes/*.routes.js`):
- Uses `Router()` from express
- Imports `asyncHandler`, `validateRequest`, `authenticate`, `requireRole`, `adminWriteLimiter`
- Imports Zod schemas from `../validators/*.schema.js`
- Imports controllers from `../controllers/*.controller.js`
- Exports `router`

**Controller file** (`src/backend/src/controllers/*.controller.js`):
- Imports service functions
- Each function is `async (req, res) => { ... res.apiSuccess(data) }`
- Uses `res.apiError(message, code, status)` for errors

**Service file** (`src/backend/src/services/*.service.js`):
- Imports `{ query } from '../config/database.js'`
- Contains SQL queries with parameterized `$1, $2, ...`
- Returns plain objects or arrays

**Validator file** (`src/backend/src/validators/*.schema.js`):
- Uses Zod (`import { z } from 'zod'`)
- Exports schemas like `createZoneSchema`, `updateZoneSchema`

**Server wiring** (`src/backend/server.js`):
- Import the route file
- Mount with `app.use('/api/v1/zones', zoneRoutes)` (or appropriate path)

---

## Visual Design Specification for Zones

This spec is derived from research into Mapbox GL Draw, Google My Maps, ArcGIS, and Auterion Mission Control. It is NON-NEGOTIABLE — every phase must follow these exact values.

### Rendering Style

| State | Fill | Outline | Opacity |
|---|---|---|---|
| **Normal (inactive)** | `#9f1239` (accent-light) | `#9f1239` | fill: 0.08, outline: 0.6 |
| **Hover** | `#9f1239` | `#9f1239` | fill: 0.12, outline: 0.8 |
| **Selected** | `#f59e0b` (warning) | `#f59e0b` | fill: 0.10, outline: 0.9 |
| **Drawing (in-progress)** | `#3b82f6` (info) | `#3b82f6` dashed | fill: 0.06, outline: 0.7 |

**Outline dash array for drawing:** `[4, 3]` (4px line, 3px gap)

**Outline width:** 2px for all states

### Vertex Handles (visible only when selected)

- Shape: Circle
- Radius: 6px
- Fill: `#fff`
- Stroke: 2px, color matches zone state (accent/warning/info)
- Appear at each polygon vertex when the zone is selected

### Midpoint Handles (visible only when selected)

- Shape: Circle
- Radius: 4px
- Fill: current state color at 60% opacity
- Appear at the midpoint of each edge — clicking adds a new vertex

### Layer Ordering (CRITICAL)

MapLibre renders layers in declaration order — later layers paint ON TOP of earlier layers.

```
Order of layer addition (bottom → top):
1. Map base tiles (already there)
2. Zone fill layers    ← add FIRST
3. Zone outline layers ← add SECOND
4. Zone vertex layers  ← add THIRD (only when editing)
5. Incident markers    ← add LAST (already done by existing code)
6. Popups / tooltips   ← add LAST (already done by existing code)
```

This means: **markers always sit on top of zones**. A marker inside a zone is fully visible.

In `AdminMap.jsx`, when adding zone layers, use `map.current.addLayer(layerConfig, 'some-marker-layer-id')` or simply ensure zone layers are added before any code that adds markers. Since markers are added reactively via `useEffect`, the safest approach is to add zone layers during map initialization (inside the first `useEffect` that creates the map).

---

## Phase Breakdown

---

# Phase 1: Backend — Zone API & Database

## Goal
Create the complete backend API for zones: database table, CRUD endpoints, validation, and service layer.

## Files to Create

| File | Purpose |
|---|---|
| `src/backend/src/validators/zone.schema.js` | Zod schemas for create, update, list queries |
| `src/backend/src/services/zone.service.js` | SQL queries for zone CRUD + PostGIS geometry handling |
| `src/backend/src/controllers/zone.controller.js` | HTTP controllers: list, get, create, update, delete |
| `src/backend/src/routes/zone.routes.js` | Express router with auth + role guards |

## Files to Modify

| File | Change |
|---|---|
| `src/backend/server.js` | Import zone routes, mount at `/api/v1/zones` |
| `docs/database-schema.sql` | Ensure zones table definition is present and correct |

## Database Details

### Zone Table Schema

```sql
CREATE TABLE IF NOT EXISTS zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    geom GEOMETRY(Polygon, 4326) NOT NULL,
    fill_color VARCHAR(7) NOT NULL DEFAULT '#9f1239',
    stroke_color VARCHAR(7) NOT NULL DEFAULT '#9f1239',
    stroke_width INTEGER NOT NULL DEFAULT 2,
    opacity DECIMAL(3, 2) NOT NULL DEFAULT 0.08,
    category VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_zones_geom ON zones USING GIST(geom);

CREATE TRIGGER IF NOT EXISTS update_zones_updated_at 
    BEFORE UPDATE ON zones 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**Note:** The default colors have been updated from the original schema (`#FF0000`/`#000000`) to match GeoWatch's crimson accent (`#9f1239`). The default opacity was changed from `0.35` to `0.08` to match the translucent overlay research.

### GeoJSON ↔ PostGIS Conversion

Frontend sends/receives polygons as GeoJSON coordinate arrays: `[[[lng, lat], [lng, lat], ...]]`.

**Insert (frontend → DB):**
```sql
INSERT INTO zones (name, description, geom, fill_color, stroke_color, stroke_width, opacity, category, created_by)
VALUES ($1, $2, ST_SetSRID(ST_GeomFromGeoJSON($3), 4326), $4, $5, $6, $7, $8, $9)
RETURNING *;
```

**Select (DB → frontend):**
```sql
SELECT 
    id, name, description, category, is_active,
    fill_color, stroke_color, stroke_width, opacity,
    created_by, created_at, updated_at,
    ST_AsGeoJSON(geom)::json AS geometry
FROM zones
WHERE is_active = true;
```

**Update geometry:**
```sql
UPDATE zones 
SET name = $1, description = $2, geom = ST_SetSRID(ST_GeomFromGeoJSON($3), 4326),
    fill_color = $4, stroke_color = $5, stroke_width = $6, opacity = $7, category = $8
WHERE id = $9
RETURNING *, ST_AsGeoJSON(geom)::json AS geometry;
```

## API Endpoints

| Method | Path | Auth | Body | Returns |
|---|---|---|---|---|
| GET | `/api/v1/zones` | Optional | — | `{ zones: [...] }` |
| GET | `/api/v1/zones/:id` | Optional | — | `{ zone: {...} }` |
| POST | `/api/v1/zones` | Required (admin+) | `{ name, geometry, description?, fillColor?, strokeColor?, strokeWidth?, opacity?, category? }` | `{ zone: {...} }` |
| PATCH | `/api/v1/zones/:id` | Required (admin+) | `{ name?, geometry?, description?, fillColor?, strokeColor?, strokeWidth?, opacity?, category?, isActive? }` | `{ zone: {...} }` |
| DELETE | `/api/v1/zones/:id` | Required (admin+) | — | `{ deleted: true, zoneId }` |

## Zod Schemas

```js
// createZoneSchema (body)
{
  name: z.string().min(1).max(255),
  geometry: z.object({
    type: z.literal('Polygon'),
    coordinates: z.array(z.array(z.tuple([z.number(), z.number()]))).min(1)
  }),
  description: z.string().optional(),
  fillColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  strokeColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  strokeWidth: z.number().int().min(1).max(10).optional(),
  opacity: z.number().min(0).max(1).optional(),
  category: z.string().max(50).optional(),
}

// updateZoneSchema (body) — all fields optional, at least one required
// Same fields as create but all optional, plus isActive: z.boolean().optional()
```

## Service Function Specs

```js
// zone.service.js

async function listZones() 
// Returns all active zones with ST_AsGeoJSON(geom)::json as geometry

async function getZoneById(id)
// Returns single zone or null

async function createZone(data, userId)
// data = { name, geometry, description, fillColor, strokeColor, strokeWidth, opacity, category }
// Returns created zone

async function updateZone(id, data)
// data = partial update fields
// Returns updated zone or null

async function deleteZone(id)
// Soft delete: sets is_active = false
// Returns { id } or null
```

## Implementation Order

1. Create `zone.schema.js`
2. Create `zone.service.js` 
3. Create `zone.controller.js`
4. Create `zone.routes.js`
5. Wire into `server.js`
6. Run the CREATE TABLE SQL if table doesn't exist
7. Test all endpoints with curl

## Commit Summary Line
```
feat: add zones table, service, controller, routes, and CRUD API endpoints
```

## Initiation Prompt for Phase 1

```
Implement Phase 1 of the GeoWatch Polygon/Zone feature.

CONTEXT: GeoWatch is an Express + PostgreSQL + PostGIS app. The backend is in src/backend/. Database queries use `import { query } from '../config/database.js'`. Responses use `res.apiSuccess(data)` and `res.apiError(message, code, status)`. Auth uses JWT Bearer tokens with `authenticate` middleware and `requireRole(['admin','super_admin'])`. Validation uses Zod schemas.

The zones table already exists in docs/database-schema.sql but may not be in the actual database yet. Create it if needed.

TASKS:
1. Create src/backend/src/validators/zone.schema.js with createZoneSchema and updateZoneSchema (Zod). Geometry is GeoJSON Polygon format.
2. Create src/backend/src/services/zone.service.js with listZones, getZoneById, createZone, updateZone, deleteZone (soft delete via is_active=false). Use ST_SetSRID(ST_GeomFromGeoJSON(...), 4326) for geometry inserts and ST_AsGeoJSON(geom)::json for selects.
3. Create src/backend/src/controllers/zone.controller.js with getZones, getZone, createZoneController, updateZoneController, deleteZoneController.
4. Create src/backend/src/routes/zone.routes.js — GET / (public), GET /:id (public), POST / (admin+, validated), PATCH /:id (admin+, validated), DELETE /:id (admin+).
5. Wire the routes into src/backend/server.js at /api/v1/zones.
6. Ensure the zones table exists in the geowatch_dev database with the correct schema (see docs/database-schema.sql lines 72-86, but use defaults: fill_color='#9f1239', stroke_color='#9f1239', opacity=0.08).
7. Test all 5 endpoints with curl and verify they work.
8. Append to commit.md with the phase summary.

DEFAULT ZONE COLORS (must match design tokens):
- fill_color: '#9f1239'
- stroke_color: '#9f1239'
- stroke_width: 2
- opacity: 0.08
```

---

# Phase 2: Frontend — Display Zones on Map

## Goal
Fetch zones from the backend and render them as translucent polygon overlays on the admin map. Zones must render BELOW incident markers. Add basic hover and click interactions.

## Files to Create

| File | Purpose |
|---|---|
| `src/admin-web/src/components/Map/ZoneLayers.jsx` | MapLibre source + layer configuration for zones |
| `src/admin-web/src/components/Zones/ZoneListPanel.jsx` | Sidebar list of all zones (optional for this phase, can defer to Phase 5) |

## Files to Modify

| File | Change |
|---|---|
| `src/admin-web/src/services/api.js` | Add `getZones`, `getZone`, `createZone`, `updateZone`, `deleteZone` methods |
| `src/admin-web/src/components/Map/AdminMap.jsx` | Add zone GeoJSON source + fill/outline layers; layer ordering below markers; hover/click handlers |
| `src/admin-web/src/components/Layout/DashboardLayout.jsx` | Fetch zones on mount; pass zones to AdminMap; handle zone selection |

## AdminMap.jsx Changes (Detailed)

### New Props

```js
export default function AdminMap({
  incidents = [],
  zones = [],              // NEW
  selectedEventId,
  selectedZoneId,          // NEW
  onEventClick,
  onZoneClick,             // NEW
  onMapDblClick,
  onViewportChange,
  flyToCoords,
  markerCoords,
  ghostIncident,
  newIncidentIds = new Set(),
}) {
```

### Map Initialization (inside the first useEffect)

After `map.current.on('load', ...)`, add zone source and layers:

```js
map.current.on('load', () => {
  // ... existing code ...

  // Add zone source
  map.current.addSource('zones', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
  });

  // Zone fill layer — ADDED BEFORE MARKERS (so markers render on top)
  map.current.addLayer({
    id: 'zone-fills',
    type: 'fill',
    source: 'zones',
    paint: {
      'fill-color': ['get', 'fillColor'],
      'fill-opacity': [
        'case',
        ['boolean', ['feature-state', 'hover'], false], 0.12,
        ['boolean', ['feature-state', 'selected'], false], 0.10,
        ['get', 'opacity'],
      ],
    },
  });

  // Zone outline layer
  map.current.addLayer({
    id: 'zone-outlines',
    type: 'line',
    source: 'zones',
    paint: {
      'line-color': ['get', 'strokeColor'],
      'line-width': ['get', 'strokeWidth'],
      'line-opacity': [
        'case',
        ['boolean', ['feature-state', 'hover'], false], 0.8,
        ['boolean', ['feature-state', 'selected'], false], 0.9,
        0.6,
      ],
    },
  });
});
```

### Zone Data Update Effect

```js
useEffect(() => {
  if (!map.current) return;
  const source = map.current.getSource('zones');
  if (!source) return;

  const features = zones.map((zone) => ({
    type: 'Feature',
    id: zone.id,
    geometry: zone.geometry,
    properties: {
      name: zone.name,
      fillColor: zone.fillColor || '#9f1239',
      strokeColor: zone.strokeColor || '#9f1239',
      strokeWidth: zone.strokeWidth || 2,
      opacity: zone.opacity ?? 0.08,
    },
  }));

  source.setData({ type: 'FeatureCollection', features });
}, [zones]);
```

### Hover Interaction

```js
useEffect(() => {
  if (!map.current) return;
  const mapInstance = map.current;
  let hoveredZoneId = null;

  const onMouseMove = (e) => {
    const features = mapInstance.queryRenderedFeatures(e.point, { layers: ['zone-fills'] });
    if (features.length > 0) {
      const feature = features[0];
      if (hoveredZoneId !== feature.id) {
        if (hoveredZoneId !== null) {
          mapInstance.setFeatureState({ source: 'zones', id: hoveredZoneId }, { hover: false });
        }
        hoveredZoneId = feature.id;
        mapInstance.setFeatureState({ source: 'zones', id: hoveredZoneId }, { hover: true });
        mapInstance.getCanvas().style.cursor = 'pointer';
      }
    } else {
      if (hoveredZoneId !== null) {
        mapInstance.setFeatureState({ source: 'zones', id: hoveredZoneId }, { hover: false });
        hoveredZoneId = null;
      }
      mapInstance.getCanvas().style.cursor = '';
    }
  };

  const onClick = (e) => {
    const features = mapInstance.queryRenderedFeatures(e.point, { layers: ['zone-fills'] });
    if (features.length > 0) {
      const zoneId = features[0].id;
      onZoneClick?.(zoneId);
    }
  };

  mapInstance.on('mousemove', onMouseMove);
  mapInstance.on('click', onClick);

  return () => {
    mapInstance.off('mousemove', onMouseMove);
    mapInstance.off('click', onClick);
  };
}, [onZoneClick]);
```

### Selection State Effect

```js
useEffect(() => {
  if (!map.current) return;
  // Clear all selection states
  zones.forEach((zone) => {
    map.current.setFeatureState({ source: 'zones', id: zone.id }, { selected: zone.id === selectedZoneId });
  });
}, [selectedZoneId, zones]);
```

## API Service Additions

Add to `src/admin-web/src/services/api.js`:

```js
// Zones
getZones: () => request('/zones'),
getZone: (id) => request(`/zones/${id}`),
createZone: (body) => request('/zones', { method: 'POST', body: JSON.stringify(body) }),
updateZone: (id, body) => request(`/zones/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
deleteZone: (id) => request(`/zones/${id}`, { method: 'DELETE' }),
```

## DashboardLayout.jsx Changes

Add zone state and fetch:

```js
const [zones, setZones] = useState([]);
const [selectedZoneId, setSelectedZoneId] = useState(null);

// Fetch zones on mount
useEffect(() => {
  api.getZones().then((res) => {
    setZones(res.data.zones || []);
  }).catch(() => setZones([]));
}, [refreshKey]); // re-fetch when refreshKey changes

const handleZoneClick = useCallback((zoneId) => {
  setSelectedZoneId(zoneId);
  // Future: open zone detail panel
}, []);
```

Pass `zones`, `selectedZoneId`, `onZoneClick` to `<AdminMap />`.

## Visual Verification Checklist

- [ ] Zones render as translucent crimson polygons on the map
- [ ] Incident markers inside zones are fully visible (on top)
- [ ] Hovering a zone brightens its fill slightly
- [ ] Clicking a zone triggers the onZoneClick callback
- [ ] Map pan/zoom works smoothly with zones visible
- [ ] Build passes with zero errors

## Commit Summary Line
```
feat: display zones as translucent polygons on admin map, layered below markers
```

## Initiation Prompt for Phase 2

```
Implement Phase 2 of the GeoWatch Polygon/Zone feature.

CONTEXT: The backend Zone API was completed in Phase 1. The endpoints are:
- GET /api/v1/zones (public)
- GET /api/v1/zones/:id (public)
- POST /api/v1/zones (admin+)
- PATCH /api/v1/zones/:id (admin+)
- DELETE /api/v1/zones/:id (admin+)

The frontend is React 18 + MapLibre GL JS. AdminMap.jsx currently renders incident markers via DOM-based maplibregl.Marker elements. We need to add zone polygon layers as MapLibre vector layers (fill + outline) that render BELOW the markers.

TASKS:
1. Add zone API methods to src/admin-web/src/services/api.js: getZones, getZone, createZone, updateZone, deleteZone.
2. Modify src/admin-web/src/components/Map/AdminMap.jsx:
   - Add new props: zones=[], selectedZoneId=null, onZoneClick=null
   - Inside the map 'load' event handler, add a GeoJSON source called 'zones' and two layers: 'zone-fills' (type: fill) and 'zone-outlines' (type: line). These must be added BEFORE any marker logic runs so markers render on top.
   - Add a useEffect that updates the 'zones' source data when the zones prop changes. Map each zone to a GeoJSON Feature with properties: fillColor, strokeColor, strokeWidth, opacity.
   - Add hover interaction: mousemove on zone-fills sets feature-state 'hover' = true/false. Cursor changes to pointer on hover.
   - Add click interaction: clicking a zone polygon calls onZoneClick(zoneId).
   - Add selection effect: when selectedZoneId changes, set feature-state 'selected' = true for that zone.
   - Paint expressions for fill-opacity and line-opacity must use feature-state 'hover' and 'selected' with case expressions.
   - Default zone style: fillColor='#9f1239', strokeColor='#9f1239', strokeWidth=2, opacity=0.08. Hover: fill 0.12, outline 0.8. Selected: fill 0.10, outline 0.9 (use '#f59e0b' for selected).
3. Modify src/admin-web/src/components/Layout/DashboardLayout.jsx:
   - Add zones state: const [zones, setZones] = useState([]);
   - Add selectedZoneId state: const [selectedZoneId, setSelectedZoneId] = useState(null);
   - Fetch zones on mount and when refreshKey changes: api.getZones().then(res => setZones(res.data.zones || []))
   - Pass zones, selectedZoneId, and onZoneClick handler to AdminMap.
4. Build admin-web and verify no errors.
5. Manually test: create a zone via curl/Postman, refresh the admin page, verify the polygon appears on the map, verify markers inside the polygon are visible on top of it.
6. Append to commit.md.
```

---

# Phase 3: Zone Creation — Drawing Toolbar & Polygon Tool

## Goal
Add a drawing toolbar to the admin map that lets admins create polygon zones by clicking vertices on the map. Double-click or click the first vertex to close the polygon. Show live area calculation. Save to backend.

## Files to Create

| File | Purpose |
|---|---|
| `src/admin-web/src/components/Map/DrawingToolbar.jsx` | Floating toolbar with Pan / Marker / Polygon / Circle / Trash / Done buttons |
| `src/admin-web/src/components/Map/PolygonDrawMode.js` | Custom polygon drawing logic (or inline in AdminMap if preferred) |
| `src/admin-web/src/components/Zones/ZoneCreatePanel.jsx` | Form panel for naming and saving a newly drawn zone |

## Files to Modify

| File | Change |
|---|---|
| `src/admin-web/src/components/Map/AdminMap.jsx` | Add drawing mode state; render drawing cursor; handle vertex clicks; render in-progress polygon as a dynamic line + fill |
| `src/admin-web/src/components/Layout/DashboardLayout.jsx` | Manage drawing mode state; coordinate between toolbar, map, and save panel |
| `src/admin-web/src/components/Layout/TopBar.jsx` | Add "Zones" button to open zone management (optional — can be in a floating toolbar instead) |

## Drawing Interaction Design

### Toolbar Layout

Floating toolbar, bottom-left of the map (above the attribution):

```
┌─────────────────────────────────────────┐
│ [👆 Pan] [⬡ Polygon] [✓ Save] [✕ Cancel] │
└─────────────────────────────────────────┘
```

- **Pan** (default): Normal map interaction, clicking map does not draw
- **Polygon**: Enters polygon drawing mode
- **Save**: Only active when a valid polygon (≥3 vertices, closed) exists
- **Cancel**: Aborts current drawing, clears vertices

### Polygon Drawing Flow

1. User clicks "Polygon" button → mode = 'polygon'
2. Cursor changes to `crosshair`
3. First click on map → drops vertex #1, shows a small dot
4. Each subsequent click → adds vertex N, draws line segment from N-1 to N
5. A "rubber band" line follows the cursor from last vertex to mouse position
6. Double-click → closes polygon (connects last vertex to first)
7. OR click on vertex #1 → closes polygon
8. Live area shown in a floating pill near the cursor (using Turf.js `area` or a simple shoelace formula)
9. User clicks "Save" → opens ZoneCreatePanel with the polygon geometry pre-filled
10. User enters name, optional description/category, clicks "Create Zone" → POST to API

### In-Progress Polygon Rendering

Since we're NOT using mapbox-gl-draw (to avoid Mapbox dependency issues), render the in-progress polygon using a separate GeoJSON source:

```js
// Source for drawing preview
map.current.addSource('draw-preview', {
  type: 'geojson',
  data: { type: 'FeatureCollection', features: [] },
});

map.current.addLayer({
  id: 'draw-preview-fill',
  type: 'fill',
  source: 'draw-preview',
  paint: {
    'fill-color': '#3b82f6',
    'fill-opacity': 0.06,
  },
});

map.current.addLayer({
  id: 'draw-preview-line',
  type: 'line',
  source: 'draw-preview',
  paint: {
    'line-color': '#3b82f6',
    'line-width': 2,
    'line-dasharray': [4, 3],
    'line-opacity': 0.7,
  },
});
```

### Vertex Dots During Drawing

Render each placed vertex as a small circle feature in the draw-preview source:

```js
{
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [lng, lat] },
  properties: { isVertex: true }
}
```

Add a circle layer:

```js
map.current.addLayer({
  id: 'draw-preview-vertices',
  type: 'circle',
  source: 'draw-preview',
  filter: ['==', ['get', 'isVertex'], true],
  paint: {
    'circle-radius': 5,
    'circle-color': '#fff',
    'circle-stroke-width': 2,
    'circle-stroke-color': '#3b82f6',
  },
});
```

### Rubber Band Line

The rubber band (line from last vertex to cursor) is NOT a GeoJSON feature — it's drawn as an additional line feature that updates on mousemove:

```js
// In polygon mode, on mousemove:
if (drawVertices.length > 0) {
  const last = drawVertices[drawVertices.length - 1];
  const rubberBandFeature = {
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: [last, [e.lngLat.lng, e.lngLat.lat]] },
    properties: { isRubberBand: true },
  };
  // Include this in the setData call
}
```

Add a line layer filtered to `isRubberBand: true` with dashed style.

### Area Calculation

Use Turf.js `@turf/area` or implement shoelace formula:

```js
function calculatePolygonArea(coords) {
  // coords is [[lng, lat], [lng, lat], ...] (closed or not)
  if (coords.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < coords.length; i++) {
    const j = (i + 1) % coords.length;
    area += coords[i][0] * coords[j][1];
    area -= coords[j][0] * coords[i][1];
  }
  return Math.abs(area) / 2 * 111320 * 111320; // rough square meters at equator
}
```

Better: install `@turf/area` in admin-web if not already available. Check first: `npm list @turf/area` or just implement the shoelace + haversine approximation inline to avoid a new dependency.

Actually, for simplicity and to avoid dependency bloat, implement a simple area calculator inline. The exact square-meter precision is not critical for this feature — admins just need a sense of scale.

### Closing the Polygon

- **Double-click** anywhere: close by connecting last vertex to first
- **Click on first vertex dot**: close the polygon
- After closing, the polygon is "completed" — Save button becomes active
- **Escape key**: cancel drawing, clear all vertices

## ZoneCreatePanel.jsx

A simple form panel that appears when the user clicks "Save":

```
┌─────────────────────────────┐
│ Create New Zone              │
├─────────────────────────────┤
│ Name *                       │
│ [______________________]     │
│                              │
│ Description                  │
│ [______________________]     │
│                              │
│ Category                     │
│ [Dropdown: conflict, etc.]   │
│                              │
│ Area: ~1,247 km²             │
│ Vertices: 5                  │
│                              │
│ [Create Zone] [Cancel]       │
└─────────────────────────────┘
```

On "Create Zone":
```js
api.createZone({
  name,
  description,
  geometry: { type: 'Polygon', coordinates: [drawVertices] },
  category,
}).then(() => {
  // Clear drawing state, refresh zones list
});
```

## DashboardLayout Integration

Add drawing mode state:

```js
const [mapMode, setMapMode] = useState('pan'); // 'pan' | 'polygon'
const [drawVertices, setDrawVertices] = useState([]);
const [isPolygonClosed, setIsPolygonClosed] = useState(false);
const [showZoneCreatePanel, setShowZoneCreatePanel] = useState(false);
```

When `mapMode === 'polygon'`, pass the drawing state to AdminMap:

```jsx
<AdminMap
  incidents={filteredIncidents}
  zones={zones}
  mapMode={mapMode}
  drawVertices={drawVertices}
  isPolygonClosed={isPolygonClosed}
  onDrawVertexAdd={handleDrawVertexAdd}
  onDrawClose={handleDrawClose}
  onDrawCancel={handleDrawCancel}
  // ... existing props
/>
```

## Important: Don't Break Existing Double-Click

The existing `onMapDblClick` creates incidents. During polygon drawing mode, double-click should CLOSE the polygon, NOT create an incident.

In AdminMap, modify the dblclick handler:

```js
map.current.on('dblclick', (e) => {
  if (mapMode === 'polygon' && drawVertices.length >= 2) {
    onDrawClose?.();
    return;
  }
  const { lng, lat } = e.lngLat;
  onMapDblClick?.({ lat, lng });
});
```

## Commit Summary Line
```
feat: add polygon drawing toolbar with click-to-place vertices, rubber band preview, and zone creation panel
```

## Initiation Prompt for Phase 3

```
Implement Phase 3 of the GeoWatch Polygon/Zone feature.

CONTEXT: Phases 1 and 2 are complete. The backend has zone CRUD endpoints. The admin map renders existing zones as translucent MapLibre fill+outline layers below incident markers.

Now we need to let admins DRAW new polygon zones directly on the map.

TASKS:
1. Create src/admin-web/src/components/Map/DrawingToolbar.jsx:
   - A small floating toolbar (position: absolute, bottom: 24px, left: 12px, zIndex: 20)
   - Buttons: Pan (default), Polygon, Save (disabled until polygon closed), Cancel
   - Active button highlighted with accent color. Use CSS var(--accent-light) for active state.
   - Props: mode ('pan'|'polygon'), hasClosedPolygon (boolean), onSetMode(mode), onSave(), onCancel()

2. Modify src/admin-web/src/components/Map/AdminMap.jsx:
   - Add props: mapMode='pan', drawVertices=[], isPolygonClosed=false, onDrawVertexAdd(coords), onDrawClose(), onDrawCancel()
   - Add a 'draw-preview' GeoJSON source and three layers: 'draw-preview-fill' (fill, blue #3b82f6, opacity 0.06), 'draw-preview-line' (line, blue, dashed [4,3], opacity 0.7), 'draw-preview-vertices' (circle, white fill, blue stroke, radius 5).
   - When mapMode === 'polygon':
     - Cursor = crosshair
     - Click on map → call onDrawVertexAdd({lat, lng})
     - Render all placed vertices as Point features in draw-preview source
     - Render polygon line connecting vertices (LineString) + fill (Polygon) if >=3 vertices
     - Render rubber band line from last vertex to current mouse position
     - Double-click → call onDrawClose() (closes polygon, connects last to first)
     - Escape key → call onDrawCancel()
   - When mapMode !== 'polygon': draw-preview source is cleared (empty FeatureCollection)
   - IMPORTANT: During polygon mode, double-click must NOT trigger the existing incident creation (onMapDblClick). Guard the dblclick handler.
   - Add a simple inline area calculator (shoelace formula) and display it in a small floating div near the cursor or bottom-right of map during drawing.

3. Create src/admin-web/src/components/Zones/ZoneCreatePanel.jsx:
   - A form panel (similar style to IncidentForm — use panel-card class, var(--bg-surface), var(--border-subtle))
   - Fields: Name (required, text input), Description (textarea), Category (dropdown with incident categories)
   - Shows: vertex count, approximate area
   - Buttons: "Create Zone" (primary, accent color), "Cancel" (secondary)
   - Props: geometry (GeoJSON Polygon), vertexCount, onSubmit(data), onCancel()
   - On submit, calls api.createZone({ name, description, geometry, category }) then onSubmit()

4. Modify src/admin-web/src/components/Layout/DashboardLayout.jsx:
   - Add state: mapMode ('pan'), drawVertices ([]), isPolygonClosed (false), showZoneCreatePanel (false)
   - Add handlers: handleSetMode, handleDrawVertexAdd, handleDrawClose, handleDrawCancel, handleZoneCreateSubmit
   - When a polygon is closed (isPolygonClosed = true), show the ZoneCreatePanel in the right panel (replace incident detail/form, or overlay — your choice; using the right panel is simplest)
   - After successful zone creation: clear drawing state, refresh zones (increment refreshKey), switch mapMode back to 'pan'
   - Pass all drawing-related props to AdminMap
   - Render DrawingToolbar as a child of the map container div (positioned absolute)

5. Build admin-web and verify:
   - Click Polygon button → cursor changes, click places vertices
   - At least 3 vertices + double-click → polygon closes, Save activates
   - Save opens zone create panel
   - Creating zone saves to backend and polygon appears on map
   - Cancel clears everything
   - Existing double-click-to-create-incident still works when NOT in polygon mode

6. Append to commit.md.
```

---

# Phase 4: Zone Editing — Vertex Manipulation

## Goal
Allow admins to select an existing zone and edit its shape by dragging vertices, adding new vertices via midpoint handles, and deleting vertices.

## Files to Create

| File | Purpose |
|---|---|
| `src/admin-web/src/components/Map/ZoneEditMode.jsx` | Logic + rendering for zone editing: vertex drag, midpoint click, vertex delete |

## Files to Modify

| File | Change |
|---|---|
| `src/admin-web/src/components/Map/AdminMap.jsx` | Add zone editing mode; render vertex/midpoint handles; handle drag interactions |
| `src/admin-web/src/components/Layout/DashboardLayout.jsx` | Track editing zone state; coordinate save/cancel |
| `src/admin-web/src/components/Zones/ZoneEditPanel.jsx` | Panel for editing zone metadata + save/cancel shape changes |

## Editing Interaction Design

### Selecting a Zone for Editing

- Click a zone polygon → zone is selected (already works from Phase 2)
- A new "Edit Zone" button appears in the UI (could be in the toolbar, or in a zone detail panel)
- Click "Edit Zone" → enters EDIT mode for that zone

### Edit Mode Visuals

When a zone is being edited:

1. The zone fill becomes slightly more opaque (`0.12`)
2. The zone outline becomes dashed (`[4, 3]`) in the warning color (`#f59e0b`)
3. **Vertex handles** appear at every polygon vertex:
   - White circle, 6px radius, 2px stroke in warning color
   - Draggable — mouse down on vertex → drag → mouse up = new position
4. **Midpoint handles** appear at the center of every edge:
   - Smaller circle, 4px radius, fill in warning color at 60% opacity
   - Clicking a midpoint = inserts a new vertex at that position

### Vertex Drag Implementation

MapLibre doesn't have native draggable point features. Implement manually:

```js
// When in edit mode, render vertices as DOM markers (NOT maplibregl.Marker — too heavy)
// Instead, use a GeoJSON source with circle layers for handles
// Dragging is implemented via map mouse events:

let isDraggingVertex = false;
let draggedVertexIndex = null;

// On mousedown on a vertex feature:
//   - set isDraggingVertex = true
//   - store draggedVertexIndex
//   - disable map panning temporarily

// On mousemove while dragging:
//   - update the vertex coordinate to the mouse lngLat
//   - re-render the zone polygon + all handles

// On mouseup:
//   - set isDraggingVertex = false
//   - re-enable map panning
```

To disable map panning during drag:
```js
map.current.dragPan.disable();
// ... during drag ...
map.current.dragPan.enable();
```

### Midpoint Calculation

For each edge between vertex[i] and vertex[i+1]:

```js
function getMidpoint(a, b) {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}
```

Render midpoints as Point features in a separate source or the same source with a filter.

### Deleting a Vertex

- Double-click a vertex handle → delete that vertex
- Minimum 3 vertices enforced — if attempting to delete would leave < 3, show a toast/error
- After deletion, re-render handles

### Saving Edits

- "Save Changes" button → PATCH to `/api/v1/zones/:id` with the new geometry
- "Cancel" button → revert to original geometry, exit edit mode

### Edge Cases

- Self-intersecting polygons: Don't validate for now (PostGIS will accept them). Future enhancement.
- Dragging a vertex off-screen: MapLibre handles this gracefully — lngLat wraps.
- Very large polygons (many vertices): Performance should be fine for < 100 vertices. Most zones will have 4-20 vertices.

## ZoneEditPanel.jsx

Similar to ZoneCreatePanel but for editing:

```
┌─────────────────────────────┐
│ Edit Zone                    │
├─────────────────────────────┤
│ Name *                       │
│ [______________________]     │
│                              │
│ Description                  │
│ [______________________]     │
│                              │
│ Category                     │
│ [Dropdown]                   │
│                              │
│ [Save Changes] [Cancel]      │
│ [Delete Zone]                │
└─────────────────────────────┘
```

## DashboardLayout Integration

Add edit state:

```js
const [editingZoneId, setEditingZoneId] = useState(null);
const [editingZoneVertices, setEditingZoneVertices] = useState([]);
const [originalZoneVertices, setOriginalZoneVertices] = useState([]);
```

When editing:
- The zone being edited is rendered from `editingZoneVertices` instead of the original zone data
- All other zones render normally
- On save: PATCH the zone, clear edit state, refresh zones
- On cancel: restore original vertices, clear edit state

## Commit Summary Line
```
feat: add zone editing with draggable vertices, midpoint insertion, and vertex deletion
```

## Initiation Prompt for Phase 4

```
Implement Phase 4 of the GeoWatch Polygon/Zone feature.

CONTEXT: Phases 1-3 are complete. Backend has zone CRUD. Map displays zones as translucent polygons. Admins can draw new polygons with a toolbar and save them. Now we need to EDIT existing zones.

TASKS:
1. Modify src/admin-web/src/components/Map/AdminMap.jsx:
   - Add new props: editingZoneId=null, editingZoneVertices=[], onVertexDrag(index, newCoords), onMidpointClick(edgeIndex), onVertexDoubleClick(index)
   - When editingZoneId is set:
     - The zone being edited renders with a dashed outline (#f59e0b, dash [4,3]) and fill opacity 0.12
     - Render vertex handles as a GeoJSON Point source ('edit-vertices') with a circle layer: white fill, warning (#f59e0b) stroke, radius 6, stroke-width 2
     - Render midpoint handles as a GeoJSON Point source ('edit-midpoints') with a circle layer: warning color fill at 60% opacity, radius 4
     - Implement vertex dragging:
       - mousedown on a vertex handle → start drag, call map.dragPan.disable()
       - mousemove during drag → call onVertexDrag(index, {lng, lat}) with current mouse lngLat
       - mouseup → end drag, call map.dragPan.enable()
     - Double-click on a vertex handle → call onVertexDoubleClick(index) to delete it
     - Click on a midpoint handle → call onMidpointClick(edgeIndex) to insert a new vertex there
   - The edited zone polygon is rendered from editingZoneVertices, NOT from the zones prop
   - All other zones render normally from the zones prop
   - IMPORTANT: Minimum 3 vertices. If a delete would leave < 3, ignore it and maybe console.warn.

2. Create src/admin-web/src/components/Zones/ZoneEditPanel.jsx:
   - Form panel for editing a zone (same visual style as ZoneCreatePanel)
   - Fields: Name, Description, Category
   - Buttons: "Save Changes" (PATCH to api.updateZone), "Cancel" (revert and exit edit mode), "Delete Zone" (red, calls api.deleteZone with confirm dialog)
   - Props: zone (the zone object being edited), onSave(data), onCancel(), onDelete()

3. Modify src/admin-web/src/components/Layout/DashboardLayout.jsx:
   - Add state: editingZoneId, editingZoneVertices, originalZoneVertices
   - When a zone is clicked and user clicks "Edit" (add an "Edit Zone" button somewhere — maybe in the toolbar when a zone is selected, or as a new panel mode):
     - Set editingZoneId to the zone id
     - Set editingZoneVertices to a DEEP COPY of the zone's geometry coordinates[0]
     - Set originalZoneVertices to a deep copy (for cancel)
   - Handle onVertexDrag: update editingZoneVertices[index] = [lng, lat]
   - Handle onMidpointClick: insert a new vertex at the midpoint of edge edgeIndex (between vertices edgeIndex and edgeIndex+1)
   - Handle onVertexDoubleClick: remove vertex at index, but only if editingZoneVertices.length > 3
   - Handle save: api.updateZone(editingZoneId, { geometry: { type: 'Polygon', coordinates: [editingZoneVertices] }, ...otherFields }).then(() => { clear edit state; refresh zones; })
   - Handle cancel: restore editingZoneVertices from originalZoneVertices, clear edit state
   - When editingZoneId is set, show ZoneEditPanel in the right panel
   - The DrawingToolbar should be hidden or disabled during zone editing

4. Add an "Edit Zone" entry point:
   - When a zone is selected (selectedZoneId is set), show an "Edit Zone" button. This could be in the DrawingToolbar (showing only when a zone is selected), or as a button in the map overlay. Simplest: add to DrawingToolbar as a conditional button.

5. Build admin-web and verify:
   - Select a zone → Edit Zone button appears
   - Click Edit → vertex and midpoint handles appear
   - Drag a vertex → polygon reshapes in real-time
   - Click midpoint → new vertex inserted
   - Double-click vertex → vertex deleted (if > 3 remain)
   - Save → zone updates on map
   - Cancel → reverts to original shape
   - Delete → zone removed from map

6. Append to commit.md.
```

---

# Phase 5: Zone-Incident Integration & Management Panel

## Goal
Create a comprehensive zone management experience: a dedicated zones list panel, spatial queries to find incidents inside zones, zone detail view with incident list, and color customization.

## Files to Create

| File | Purpose |
|---|---|
| `src/admin-web/src/components/Zones/ZoneManagementPanel.jsx` | Full zone list with search, sort, create/edit/delete actions |
| `src/admin-web/src/components/Zones/ZoneDetailPanel.jsx` | Zone detail with metadata, incident count, list of incidents inside |

## Files to Modify

| File | Change |
|---|---|
| `src/backend/src/services/zone.service.js` | Add `getIncidentsInZone(zoneId)` using PostGIS `ST_Contains` |
| `src/backend/src/controllers/zone.controller.js` | Add `getZoneIncidentsController` |
| `src/backend/src/routes/zone.routes.js` | Add `GET /:id/incidents` endpoint |
| `src/admin-web/src/services/api.js` | Add `getZoneIncidents(id)` method |
| `src/admin-web/src/components/Layout/TopBar.jsx` | Add "Zones" button to open zone management panel |
| `src/admin-web/src/components/Layout/DashboardLayout.jsx` | Add zone management panel mode; handle zone detail view; integrate incident-in-zone queries |

## Backend: Incidents in Zone Query

```sql
SELECT 
    i.id, i.title, i.latitude, i.longitude, i.severity, i.status, i.start_date, i.category_id,
    c.name AS category_name, d.name AS domain_name, d.color AS domain_color
FROM incidents i
LEFT JOIN categories c ON i.category_id = c.id
LEFT JOIN domains d ON c.domain_id = d.id
WHERE i.status != 'hidden'
  AND ST_Contains(
    (SELECT geom FROM zones WHERE id = $1),
    i.geom
  )
ORDER BY i.start_date DESC;
```

Add endpoint: `GET /api/v1/zones/:id/incidents`

## Zone Management Panel

A new right-panel mode alongside 'empty' | 'detail' | 'form':

```js
const [panelMode, setPanelMode] = useState('empty'); // 'empty' | 'detail' | 'form' | 'zones'
```

The Zones panel shows:

```
┌─────────────────────────────┐
│ Zones                        │
│ [Search zones...]  [+ New]   │
├─────────────────────────────┤
│ ▶ Conflict Zone A            │
│   12 incidents · 247 km²     │
│                              │
│ ▶ Prohibited Area B          │
│   3 incidents · 89 km²       │
│                              │
│ ▶ Safe Corridor C            │
│   0 incidents · 1,203 km²    │
└─────────────────────────────┘
```

Each zone row shows:
- Name (bold)
- Color swatch (small circle with the zone's fill color)
- Incident count
- Approximate area
- Click to fly map to zone + show zone detail

## Zone Detail Panel

When clicking a zone in the list or on the map:

```
┌─────────────────────────────┐
│ ◀ Back to Zones              │
├─────────────────────────────┤
│ Conflict Zone A              │
│ ━━━━━━━ (color bar)          │
│                              │
│ 📍 12 incidents inside       │
│ 📐 ~247 km²                  │
│ 🏷️ Conflict                  │
│                              │
│ [Edit Zone] [Delete Zone]    │
├─────────────────────────────┤
│ Incidents in this zone:      │
│ • Title One (Severe)         │
│ • Title Two (Moderate)       │
│ • ...                        │
└─────────────────────────────┘
```

## Color Customization

Allow admins to change zone colors. In the edit panel, add a color picker:

```jsx
// Simple preset color swatches
const ZONE_COLORS = [
  '#9f1239', // crimson (default)
  '#dc2626', // red
  '#f59e0b', // amber
  '#22c55e', // green
  '#3b82f6', // blue
  '#a855f7', // purple
  '#14b8a6', // teal
  '#6b7280', // gray
];
```

Clicking a swatch updates the zone's `fillColor` and `strokeColor` (both use the same color for consistency).

## DashboardLayout Integration

Add zone panel mode handling:

```js
const [panelMode, setPanelMode] = useState('empty'); // add 'zones' as a mode
const [selectedZone, setSelectedZone] = useState(null);
```

When `panelMode === 'zones'`:
- Show `ZoneManagementPanel` in the right panel
- Hide incident detail/form panels

When a zone is clicked (from map or list):
- `setSelectedZone(zone)`
- `setPanelMode('zone-detail')`
- Fly map to zone bounds (compute from polygon coordinates)

Add a new panel mode `'zone-detail'` for the detail view, OR reuse `'detail'` and determine type by checking if `selectedZone` is set.

## TopBar Addition

Add a "Zones" button next to "Add Event" in the top bar:

```jsx
<button onClick={() => setPanelMode('zones')}>
  Zones
</button>
```

## Commit Summary Line
```
feat: add zone management panel, incident-in-zone spatial queries, and color customization
```

## Initiation Prompt for Phase 5

```
Implement Phase 5 of the GeoWatch Polygon/Zone feature.

CONTEXT: Phases 1-4 are complete. Backend has zone CRUD. Map renders zones. Admins can draw and edit polygons. Now we need a comprehensive zone management panel and incident integration.

TASKS:
1. Backend additions:
   - Add getIncidentsInZone(zoneId) to src/backend/src/services/zone.service.js using ST_Contains PostGIS query.
   - Add getZoneIncidentsController to src/backend/src/controllers/zone.controller.js.
   - Add GET /:id/incidents route to src/backend/src/routes/zone.routes.js (public or optional auth).

2. Add api.getZoneIncidents(id) to src/admin-web/src/services/api.js.

3. Create src/admin-web/src/components/Zones/ZoneManagementPanel.jsx:
   - Panel showing all zones as a scrollable list
   - Each row: zone name, small color swatch (the zone's fill color), incident count, approximate area
   - Search/filter by name
   - "+ New Zone" button → sets mapMode to 'polygon' (triggers Phase 3 drawing flow)
   - Click a zone → selects it, flys map to zone, opens ZoneDetailPanel
   - Style: use panel-card CSS class, var(--bg-surface), var(--border-subtle), etc. Match existing admin UI style.

4. Create src/admin-web/src/components/Zones/ZoneDetailPanel.jsx:
   - Shows zone name, description, category, color swatch, incident count, area
   - List of incidents inside the zone (fetched via api.getZoneIncidents)
   - Each incident is clickable → opens incident detail (sets panelMode to 'detail', selectedIncident to the incident)
   - Buttons: "Edit Zone" (enters edit mode from Phase 4), "Delete Zone" (confirm then delete), "Back" (returns to ZoneManagementPanel)
   - Color customization: show 8 preset color swatches. Clicking changes the zone color immediately (PATCH update) or on save.

5. Modify src/admin-web/src/components/Layout/TopBar.jsx:
   - Add a "Zones" button next to "Add Event" that sets panelMode to 'zones'.

6. Modify src/admin-web/src/components/Layout/DashboardLayout.jsx:
   - Add 'zones' and 'zone-detail' to panelMode states (or reuse 'detail' with selectedZone check)
   - Add selectedZone state
   - Fetch zone incident counts for the ZoneManagementPanel (could be included in the main zones fetch or fetched per-zone)
   - Handle zone selection: flyTo zone bounds. Compute bounds from polygon coordinates using simple min/max lat/lng.
   - Integrate ZoneManagementPanel and ZoneDetailPanel into renderPanel()
   - When clicking an incident inside a zone detail, switch to incident detail panel

7. Build and test all three apps (admin-web at minimum; user-web and superadmin-web just need to build cleanly).

8. Append to commit.md.
```

---

## Appendix A: Coordinate Handling Reference

### GeoJSON ↔ MapLibre

MapLibre uses GeoJSON format everywhere. A Polygon coordinate array:

```js
// GeoJSON Polygon
{
  type: 'Polygon',
  coordinates: [
    [
      [lng1, lat1],
      [lng2, lat2],
      [lng3, lat3],
      [lng1, lat1], // last == first (closed)
    ]
  ]
}
```

### PostGIS ↔ GeoJSON

**Insert:** `ST_SetSRID(ST_GeomFromGeoJSON($geojson), 4326)`
**Select:** `ST_AsGeoJSON(geom)::json AS geometry`

### Coordinate Array Conventions

- Frontend stores/works with: `[[lng, lat], [lng, lat], ...]` (GeoJSON order)
- Turf.js uses GeoJSON order: `[lng, lat]`
- Leaflet uses `[lat, lng]` — NOT used here, but beware if copying code

### Computing Bounds from Polygon

```js
function getBoundsFromPolygon(coordinates) {
  const coords = coordinates[0]; // outer ring
  let minLng = Infinity, minLat = Infinity;
  let maxLng = -Infinity, maxLat = -Infinity;
  coords.forEach(([lng, lat]) => {
    minLng = Math.min(minLng, lng);
    minLat = Math.min(minLat, lat);
    maxLng = Math.max(maxLng, lng);
    maxLat = Math.max(maxLat, lat);
  });
  return { minLng, minLat, maxLng, maxLat };
}
```

### Flying to Bounds

```js
const bounds = getBoundsFromPolygon(zone.geometry.coordinates);
map.current.fitBounds(
  [[bounds.minLng, bounds.minLat], [bounds.maxLng, bounds.maxLat]],
  { padding: 40, duration: 800 }
);
```

---

## Appendix B: Layer ID Reference for AdminMap.jsx

When working with AdminMap, these are the layer/source IDs in use:

| ID | Type | Purpose |
|---|---|---|
| `zones` | source (geojson) | Zone polygon data |
| `zone-fills` | layer (fill) | Zone polygon fills |
| `zone-outlines` | layer (line) | Zone polygon outlines |
| `draw-preview` | source (geojson) | In-progress polygon drawing |
| `draw-preview-fill` | layer (fill) | Drawing fill preview |
| `draw-preview-line` | layer (line) | Drawing line preview |
| `draw-preview-vertices` | layer (circle) | Placed vertex dots |
| `edit-vertices` | source (geojson) | Editable zone vertices |
| `edit-midpoints` | source (geojson) | Editable zone midpoints |

**Critical rule:** Zone layers must be added BEFORE incident markers are created. Since markers are DOM-based `maplibregl.Marker` instances (not style layers), they naturally render on top of all style layers. However, if you ever add incident markers as symbol/circle layers instead, you must use `map.addLayer(layer, beforeId)` to control ordering.

---

## Appendix C: Common Pitfalls & Solutions

### Pitfall 1: Map not loaded when adding layers
**Solution:** Always add sources/layers inside the `map.on('load', ...)` handler, or check `map.loaded()` before adding.

### Pitfall 2: feature-state requires source + numeric ID
**Solution:** MapLibre feature-state requires the feature to have a numeric `id` field. UUID strings won't work for feature-state. Use `promoteId: 'id'` in the source config, or convert UUIDs to numeric indices.

```js
map.current.addSource('zones', {
  type: 'geojson',
  data: { type: 'FeatureCollection', features: [] },
  promoteId: 'id', // ← THIS IS CRITICAL for UUID feature IDs
});
```

### Pitfall 3: setData on removed source
**Solution:** Always check `if (map.current.getSource('zones'))` before calling `setData()`.

### Pitfall 4: Cursor not resetting after hover
**Solution:** In the mousemove handler's "else" branch (no features under cursor), always set `map.getCanvas().style.cursor = ''`.

### Pitfall 5: Drawing mode conflicts with double-click incident creation
**Solution:** In the dblclick handler, check drawing mode FIRST and return early before calling `onMapDblClick`.

### Pitfall 6: Mutating state arrays
**Solution:** Always create new arrays when updating vertices:
```js
setEditingZoneVertices(prev => [...prev]); // copy
// or:
setEditingZoneVertices(prev => prev.map((v, i) => i === index ? newCoord : v));
```

---

*End of Polygon Plan Document*
