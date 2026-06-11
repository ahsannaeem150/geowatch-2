# GeoWatch API Specification

## Base URL
- Development: http://localhost:3000/api/v1
- Production: https://api.geowatch.app/api/v1

## Response Format
All responses follow this structure:
```json
{
  "success": true,
  "data": {},
  "message": "Optional",
  "error": null
}
```

Error response:
```json
{
  "success": false,
  "data": null,
  "message": "Error description",
  "error": "ERROR_CODE"
}
```

## Authentication
- Header: `Authorization: Bearer <jwt_token>`
- Token obtained from `POST /auth/login`
- SSE stream accepts token via query param: `?token=<jwt>` (EventSource cannot send custom headers)

## Auth Roles
- `super_admin` — Full access, manage all users, delete incidents, access superadmin endpoints
- `admin` — Create/edit incidents, timeline updates, sources, zones. Cannot manage staff users.
- `public_user` — Google-authenticated public users. Read-only + save/bookmark incidents.

---

## AUTH ENDPOINTS

### POST /auth/login
Access: Public  
Body: `{ email, password }`  
Response: `{ data: { token, user: { id, email, fullName, role } } }`

### POST /auth/register
Access: `super_admin` only  
Body: `{ email, password, fullName, role }` (role: `admin` | `super_admin`)  
Response: `{ data: { user: { id, email, fullName, role } } }`

### GET /auth/me
Access: Any authenticated staff user  
Response: `{ data: { user: { id, email, fullName, role, lastLoginAt } } }`

### GET /auth/admins
Access: `super_admin` only  
Response: `{ data: { admins: [ { id, email, fullName, role, isActive, lastLoginAt, createdAt } ] } }`

### PATCH /auth/admins/:id
Access: `super_admin` only  
Body: `{ role?, isActive?, fullName? }`  
Response: Updated admin user

### POST /auth/public/google
Access: Public  
Body: `{ idToken }` (Google ID token from frontend)  
Response: `{ data: { token, user: { id, email, fullName, avatarUrl, role: 'public_user' } } }`

---

## INCIDENT ENDPOINTS (Public)

### GET /incidents
Access: Public (no auth)  
Optional auth: `optionalAuthenticate` middleware tracks public user views  
Query Parameters:
- `dateFrom` (string, YYYY-MM-DD) — defaults to today
- `dateTo` (string, YYYY-MM-DD) — defaults to today
- `categoryId` (integer, optional)
- `severity` (integer, optional, 1-5)
- `status` (string, optional: `active`, `resolved`, `hidden`)
- `viewport` (string, optional) — `minLng,minLat,maxLng,maxLat`
- `verifiedOnly` (boolean, optional) — client-side filter hint

Response:
```json
{
  "data": {
    "incidents": [
      {
        "id": "uuid",
        "title": "Incident Title",
        "description": "...",
        "latitude": 31.5204,
        "longitude": 74.3587,
        "categoryId": 42,
        "categoryName": "Shelling",
        "domainName": "Conflict",
        "domainColor": "#ef4444",
        "severity": 4,
        "status": "active",
        "verificationStatus": "verified",
        "locationContext": "Punjab, Pakistan",
        "startDate": "2024-01-15T10:00:00Z",
        "endDate": null,
        "createdAt": "2024-01-15T10:00:00Z"
      }
    ],
    "count": 25,
    "hasMore": false,
    "date": "2024-01-15"
  }
}
```

### GET /incidents/search
Access: Public  
Query: `?q=protest+lahore&limit=25&offset=0&dateFrom=&dateTo=&categoryId=&severity=&status=`  
Response: `{ data: { incidents: [...], count, limit, offset, hasMore } }`

### GET /incidents/:id
Access: Public (optional auth for view tracking)  
Response:
```json
{
  "data": {
    "incident": { ... },
    "sources": [
      {
        "id": "uuid",
        "sourceType": "x_post",
        "sourceUrl": "https://x.com/...",
        "embedHtml": "<blockquote...>",
        "description": "Context from admin",
        "verificationStatus": "verified",
        "displayOrder": 0
      }
    ],
    "timeline": [
      {
        "id": "uuid",
        "summary": "Update text",
        "updateDate": "2024-01-16T14:00:00Z",
        "sourceUrl": "...",
        "embedHtml": "...",
        "createdBy": "Admin Name"
      }
    ]
  }
}
```

---

## INCIDENT ENDPOINTS (Admin)

### POST /incidents
Access: `admin` / `super_admin`  
Body:
```json
{
  "title": "Clashes in Region",
  "description": "Detailed description",
  "latitude": 31.5204,
  "longitude": 74.3587,
  "categoryId": 42,
  "severity": 4,
  "startDate": "2024-01-15T10:00:00Z",
  "endDate": null,
  "locationContext": "Punjab, Pakistan",
  "verificationOverride": null,
  "sources": [
    {
      "sourceType": "x_post",
      "sourceUrl": "https://x.com/user/status/123456",
      "description": "Official statement",
      "verificationStatus": "verified"
    }
  ]
}
```
Response: `{ data: { incident: { ... } } }`  
Note: Backend fetches oEmbed HTML automatically for X posts.

### PATCH /incidents/:id
Access: `admin` / `super_admin`  
Body: Same as POST but partial  
Response: Updated incident

### DELETE /incidents/:id
Access: `admin` / `super_admin`  
Response: `{ data: { deleted: true } }`  
Note: Soft delete — incident moved to `deleted_incidents_log`

### POST /incidents/:id/resolve
Access: `admin` / `super_admin`  
Body: `{ resolvedAt: "2024-01-15T10:00:00Z" }`  
Response: `{ data: { incident: { ...status: 'resolved'... } } }`

### POST /incidents/:id/restore
Access: `super_admin` only  
Response: Restored incident

### POST /incidents/:id/purge
Access: `super_admin` only  
Response: `{ data: { purged: true } }`  
Note: Hard delete from `deleted_incidents_log`

### GET /incidents/deleted
Access: `super_admin` only  
Response: `{ data: { incidents: [...], count } }`

### GET /incidents/deleted/:id
Access: `super_admin` only  
Response: `{ data: { incident: { ... }, sources: [...], timeline: [...] } }`

---

## TIMELINE ENDPOINTS

### POST /incidents/:id/timeline
Access: `admin` / `super_admin`  
Body:
```json
{
  "summary": "New developments reported...",
  "updateDate": "2024-01-16T14:00:00Z",
  "sourceUrl": "https://x.com/..."
}
```

### PATCH /incidents/:id/timeline/:updateId
Access: `admin` / `super_admin`  
Body: `{ summary?, updateDate?, sourceUrl? }`

### DELETE /incidents/:id/timeline/:updateId
Access: `admin` / `super_admin`

---

## SOURCE ENDPOINTS

### POST /incidents/:id/sources
Access: `admin` / `super_admin`  
Body:
```json
{
  "sourceType": "x_post",
  "sourceUrl": "https://x.com/...",
  "description": "...",
  "displayOrder": 1,
  "verificationStatus": "verified"
}
```

### PATCH /incidents/:id/sources/:sourceId
Access: `admin` / `super_admin`  
Body: `{ verificationStatus: 'verified' | 'disputed' | 'debunked' | 'unverified' }`

---

## MEDIA ENDPOINTS

### GET /incidents/:id/media
Access: Public  
Response: `{ data: { media: [ { id, originalName, storedName, fileType, mimeType, fileSizeBytes, fileUrl, thumbnailUrl, width, height, displayOrder, createdAt } ] } }`

### POST /incidents/:id/media
Access: `admin` / `super_admin`  
Content-Type: `multipart/form-data`  
Field: `file` (image or video, max 50MB)  
Response: `{ data: { media: { ... } }, message: "File uploaded successfully" }`

### DELETE /incidents/:id/media/:mediaId
Access: `admin` / `super_admin`

### PATCH /incidents/:id/media/:mediaId/order
Access: `admin` / `super_admin`  
Body: `{ displayOrder: number }`

---

## ZONE ENDPOINTS

### GET /zones
Access: Public  
Query: `?active=true`  
Response: `{ data: { zones: [ { id, name, description, geometry, fillColor, strokeColor, strokeWidth, opacity, category, incidentCount, isActive } ] } }`

### GET /zones/:id
Access: Public  
Response: `{ data: { zone: { ... } } }`

### GET /zones/:id/incidents
Access: Public  
Response: `{ data: { incidents: [...] } }` (incidents inside zone via `ST_Contains`)

### POST /zones
Access: `admin` / `super_admin`  
Body:
```json
{
  "name": "Red Zone A",
  "description": "...",
  "geometry": { "type": "Polygon", "coordinates": [...] },
  "fillColor": "#9f1239",
  "strokeColor": "#9f1239",
  "strokeWidth": 2,
  "opacity": 0.08,
  "category": "conflict"
}
```

### PATCH /zones/:id
Access: `admin` / `super_admin`

### DELETE /zones/:id
Access: `admin` / `super_admin`  
Note: Soft delete (`is_active = false`)

---

## CATEGORY / TAXONOMY ENDPOINTS

### GET /categories
Access: Public  
Response: `{ data: { categories: [ { id, domainId, name, slug, description, severitySchema, defaultSeverity, requiresLocation, requiresPhoto, requiresVideo, sortOrder, isActive } ] } }`

### GET /categories/domains
Access: Public  
Response: `{ data: { domains: [ { id, name, slug, description, color, icon, sortOrder, isActive } ] } }`

### GET /categories/domains/:slug
Access: Public  
Response: `{ data: { domain: { ... }, categories: [...] } }`

---

## USER MANAGEMENT (Superadmin)

### GET /users
Access: `super_admin` only  
Query: `?search=&role=&isActive=&sort=&page=&limit=`  
Response: `{ data: { users: [...], pagination: { page, limit, total, totalPages } } }`

### GET /users/:id
Access: `super_admin` only  
Response: `{ data: { user: { ... }, stats: { incidentsCreated, incidentsResolved, sourcesAdded, timelineUpdates, auditEntries } } } }`

### GET /users/:id/activity
Access: `super_admin` only  
Response: `{ data: { logs: [...], stats: { ... }, pagination: { ... } } }`

### PATCH /users/:id
Access: `super_admin` only  
Body: `{ role?, isActive?, fullName? }`

### DELETE /users/:id
Access: `super_admin` only  
Note: Returns 409 CONFLICT if user has dependencies

### POST /users/:id/reset-password
Access: `super_admin` only  
Response: `{ data: { tempPassword: "..." } }`

---

## PUBLIC USER MANAGEMENT (Superadmin)

### GET /public-users
Access: `super_admin` only  
Query: `?search=&isActive=&page=&limit=`

### GET /public-users/:id
Access: `super_admin` only  
Response: `{ data: { user: { ... }, savedIncidents: [...], savedCount } } }`

### GET /public-users/:id/activity
Access: `super_admin` only

### PATCH /public-users/:id
Access: `super_admin` only  
Body: `{ isActive: boolean }` (ban/unban)

---

## SAVED INCIDENTS (Public Users)

### GET /incidents/saved
Access: `public_user` (Bearer JWT)  
Response: `{ data: { savedIncidents: [...] } }`

### POST /incidents/:id/save
Access: `public_user`  
Body: `{ notes? }`

### DELETE /incidents/:id/save
Access: `public_user`

---

## AUDIT LOG ENDPOINTS

### GET /audit
Access: `super_admin` only  
Query: `?action=&userId=&targetType=&targetId=&dateFrom=&dateTo=&realm=system|user&actorType=staff|public_user&page=&limit=`  
Response: `{ data: { logs: [...], pagination: { ... } } }`

### GET /audit/summary
Access: `super_admin` only  
Query: `?realm=`  
Response: `{ data: { totalToday, uniqueUsers, actionBreakdown: { ... } } }`

---

## SYSTEM ENDPOINTS

### GET /system/health
Access: `super_admin` only  
Response: `{ data: { status: 'healthy'|'degraded'|'unhealthy', checks: { database: { status, latencyMs }, martin: { status }, sse: { status, clientCount } } } }`

---

## SSE STREAM

### GET /incidents/stream
Access: Authenticated (token via `?token=` query param)  
Content-Type: `text/event-stream`  
Event types: `incident_created`, `incident_updated`, `incident_deleted`, `incident_resolved`, `timeline_added`, `timeline_updated`, `timeline_deleted`, `source_added`, `user_created`, `user_updated`, `user_deleted`, `public_user_created`, `public_user_updated`

---

## ERROR CODES

| Code | HTTP | Meaning |
|------|------|---------|
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `FORBIDDEN` | 403 | Valid token but insufficient role |
| `NOT_FOUND` | 404 | Resource does not exist |
| `VALIDATION_ERROR` | 400 | Zod validation failed |
| `RATE_LIMITED` | 429 | Too many requests |
| `SERVER_ERROR` | 500 | Unexpected server error |
| `CONFLICT` | 409 | Resource has dependencies |

---

## RATE LIMITS

| Endpoint Group | Limit |
|---------------|-------|
| Public read (GET /incidents) | 100 requests / 15 min per IP |
| Auth (login/register) | 10 requests / 15 min per IP |
| Admin write (POST/PATCH/DELETE) | 50 requests / 15 min per user |
