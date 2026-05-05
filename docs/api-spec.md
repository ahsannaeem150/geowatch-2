# GeoWatch API Specification

## Base URL
- Development: http://localhost:3000/api/v1
- Production: https://api.geowatch.app/api/v1

## Response Format
All responses follow this structure:
{ success: true, data: {}, message: "Optional", error: null }

Error response:
{ success: false, data: null, message: "Error description", error: "ERROR_CODE" }

## Authentication
- Header: Authorization: Bearer &lt;jwt_token&gt;
- Token obtained from /auth/login
- Super admin endpoints check role === 'super_admin'

---

## AUTH ENDPOINTS

POST /auth/register
Access: Super admin only
Body: { email, password, fullName, role }
Response: { data: { user: { id, email, fullName, role } } }

POST /auth/login
Access: Public
Body: { email, password }
Response: { data: { token, user: { id, email, fullName, role } } }

GET /auth/me
Access: Any authenticated user
Response: { data: { user: { id, email, fullName, role } } }

GET /auth/admins
Access: Super admin only
Response: { data: { admins: [ { id, email, fullName, role, isActive, createdAt } ] } }

PATCH /auth/admins/:id
Access: Super admin only
Body: { role, isActive }

---

## EVENTS ENDPOINTS (Public)

GET /events
Access: Public (no auth)
Query Parameters:
- date (string, YYYY-MM-DD) — defaults to today
- category (string, optional)
- severity (integer, optional, 1-5)
- status (string, optional)
- viewport (string, optional) — minLng,minLat,maxLng,maxLat

Response:
{
  data: {
    events: [
      {
        id: "uuid",
        title: "Event Title",
        description: "...",
        latitude: 31.5204,
        longitude: 74.3587,
        category: "conflict",
        severity: 4,
        status: "active",
        startDate: "2024-01-15",
        endDate: null,
        createdAt: "2024-01-15T10:00:00Z"
      }
    ],
    count: 25,
    date: "2024-01-15"
  }
}

GET /events/:id
Access: Public
Response:
{
  data: {
    event: { ... },
    sources: [
      {
        id: "uuid",
        sourceType: "x_post",
        sourceUrl: "https://x.com/...",
        embedHtml: "&lt;blockquote...&gt;",
        description: "Context from admin",
        displayOrder: 0
      }
    ],
    timeline: [
      {
        id: "uuid",
        summary: "Update text",
        updateDate: "2024-01-16T14:00:00Z",
        createdBy: "Admin Name"
      }
    ]
  }
}

---

## EVENTS ENDPOINTS (Admin)

POST /events
Access: Admin / Super admin
Body:
{
  title: "Clashes in Region",
  description: "Detailed description",
  latitude: 31.5204,
  longitude: 74.3587,
  category: "conflict",
  severity: 4,
  startDate: "2024-01-15",
  endDate: null,
  sources: [
    {
      sourceType: "x_post",
      sourceUrl: "https://x.com/user/status/123456",
      description: "Official statement"
    }
  ]
}
Response: { data: { event: { ... } } }
Note: Backend fetches oEmbed HTML automatically for X posts

PATCH /events/:id
Access: Admin / Super admin
Body: Same as POST but partial
Response: Updated event

DELETE /events/:id
Access: Super admin only
Response: { data: { deleted: true } }

POST /events/:id/resolve
Access: Admin / Super admin
Body: { resolutionNotes: "..." } (optional)
Response: { data: { event: { ...status: 'resolved'... } } }

POST /events/:id/sources
Access: Admin / Super admin
Body:
{
  sourceType: "x_post",
  sourceUrl: "https://x.com/...",
  description: "...",
  displayOrder: 1
}

POST /events/:id/timeline
Access: Admin / Super admin
Body:
{
  summary: "New developments reported...",
  updateDate: "2024-01-16T14:00:00Z"
}

---

## ZONES ENDPOINTS (Post-MVP)

GET /zones
Access: Public
Query: ?active=true
Response: Array of zone objects with GeoJSON geometry

POST /zones
Access: Admin / Super admin
Body:
{
  name: "Red Zone A",
  description: "...",
  geometry: { type: "Polygon", coordinates: [...] },
  fillColor: "#FF0000",
  strokeColor: "#000000",
  strokeWidth: 2,
  opacity: 0.35
}

---

## ERROR CODES

UNAUTHORIZED — 401 — Missing or invalid token
FORBIDDEN — 403 — Valid token but insufficient role
NOT_FOUND — 404 — Resource does not exist
VALIDATION_ERROR — 400 — Zod validation failed
RATE_LIMITED — 429 — Too many requests
SERVER_ERROR — 500 — Unexpected server error

---

## RATE LIMITS

Public read (GET /events): 100 requests per 15 min per IP
Auth (login/register): 10 requests per 15 min per IP
Admin write (POST/PATCH/DELETE): 50 requests per 15 min per user

---

## ZOD SCHEMAS (Reference)

Event creation:
const createEventSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  category: z.enum(['conflict', 'protest', 'disaster', 'diplomacy', 'humanitarian', 'other']),
  severity: z.number().int().min(1).max(5),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  sources: z.array(z.object({
    sourceType: z.enum(['x_post', 'news_article', 'admin_note']),
    sourceUrl: z.string().url().optional(),
    description: z.string().optional()
  })).optional()
});

Login:
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});