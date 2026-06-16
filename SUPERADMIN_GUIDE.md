# GeoWatch Superadmin Console — User Guide

> **URL:** http://localhost:5175  
> **Login:** `admin@geowatch.local` / `AdminPass123!`

---

## What Is This?

The Superadmin Console is the mission-control panel for GeoWatch. It lets you manage the entire platform: users, audit logs, incident taxonomy (domains & categories), zone taxonomy, and system health. Only users with the `super_admin` role can access it.

---

## Logging In

1. Open http://localhost:5175
2. Enter email: `admin@geowatch.local`
3. Enter password: `AdminPass123!`
4. Click **Sign In**

If your session expires, you'll be redirected back to the login page automatically.

---

## Dashboard (Home)

The dashboard is your at-a-glance command center.

| Card | What It Shows | Click To |
|:-----|:--------------|:---------|
| **Total Users** | Number of registered accounts | Go to Users page |
| **Incidents Today** | Events created today | — |
| **Audit Events Today** | Actions logged today | Go to Audit page |
| **System Status** | DB + SSE health, active clients | Go to System page |

### Recent Activity Feed
Below the cards is a live feed of the last 10 audit log entries. Each row shows:
- **Action badge** — color-coded (e.g., green for `user_login`, red for `user_deleted`)
- **Who** — user email or "System"
- **What** — target type and ID
- **When** — relative time (e.g., "2 minutes ago")

> 💡 **Real-time:** The dashboard refreshes automatically when new incidents are created or updated. No need to hit F5.

---

## Users Page

Manage every account on the platform.

### User Table
- **Search** — type a name or email (200ms debounce)
- **Filter by role** — Admin / Super Admin
- **Filter by status** — Active / Inactive
- **Sort** — click any column header
- **Pagination** — 25 users per page

### Bulk Actions
Select multiple users with checkboxes, then:
- **Activate / Deactivate** — toggle account status
- **Delete** — permanent removal (with confirmation)

### Create User
Click the **+ New User** button. Fill in:
- Email
- Full Name
- Password
- Role (Admin / Super Admin)

### User Detail Drawer
Click any user's row to open a side panel showing:
- Profile info & role badge
- Activity stats (last login, incidents created)
- Recent audit history for that user
- **Reset password** — generates a new random password
- **Edit** — change name, email, role, status
- **Delete** — remove the account

---

## Audit Log Page

The audit log is an immutable record of every significant action on the platform.

### What Gets Logged?
| Action | When It Fires |
|:-------|:--------------|
| `user_login` | Every successful sign-in |
| `user_logout` | Every sign-out |
| `user_created` | New account registered |
| `user_updated` | Profile/role/status changed |
| `user_deleted` | Account removed |
| `password_reset` | Password changed by admin |
| `incident_created` | New incident added |
| `incident_updated` | Incident edited |
| `incident_deleted` | Incident removed |
| `incident_resolved` | Marked as resolved |
| `incident_restored` | Restored from Recycle Bin |
| `incident_purged` | Permanently deleted from Recycle Bin |
| `timeline_added` | Timeline entry created |
| `timeline_updated` | Timeline entry edited |
| `timeline_deleted` | Timeline entry removed |
| `timeline_featured_set` | Featured evidence selected for an update |
| `timeline_featured_cleared` | Featured evidence removed |
| `source_added` | Source link attached |
| `source_updated` | Source edited or archived |
| `source_deleted` | Source removed |
| `source_pinned` / `source_unpinned` | Source pin toggled |
| `source_archived` / `source_unarchived` | X-post archive/unarchive |
| `media_added` | Media file uploaded |
| `media_updated` | Media caption/pin/link changed |
| `media_deleted` | Media file removed |
| `media_pinned` / `media_unpinned` | Media pin toggled |
| `incident_hero_image_updated` | Hero image changed |
| `setting_updated` | Domain/category changed |

### Filtering
- **Action type** — dropdown of all 17 action types
- **User** — filter to a specific person
- **Target type** — user, incident, source, timeline, domain, category
- **Date range** — from / to calendar pickers
- **Clear all** — one-click reset

### Export to CSV
Click **Export CSV** to download the current page as a spreadsheet. Useful for compliance reporting.

> 💡 **Real-time:** New audit events appear automatically while you're on this page.

---

## Domains & Categories Page

This is the **taxonomy manager** — it controls how incidents are classified.

### Domains
A **domain** is a top-level bucket (e.g., "Conflict", "Natural Hazard", "Health Emergency"). Each domain has:
- **Name** — displayed label
- **Slug** — URL-friendly identifier (auto-generated)
- **Color** — hex code for map markers and UI badges
- **Icon** — Lucide icon name (searchable picker)
- **Sort order** — controls display sequence

### Categories
A **category** lives inside a domain (e.g., "Air Strike" under "Conflict"). Each category has:
- **Name & slug**
- **Severity schema** — JSON defining severity levels (e.g., 1=Low, 2=Medium, 3=High, 4=Critical)
- **Default severity** — pre-selected level
- **Requirements** — whether incidents in this category require location, photo, or video evidence

### How to Use
1. Click a **domain card** to expand and see its categories
2. Click **+** on a domain card to add a category to it
3. Click the **pencil** icon to edit
4. Click the **trash** icon to delete (blocked if incidents reference it)
5. Click **+ New Domain** at the top right to create a new domain

> ⚠️ You cannot delete a domain that still has categories. Move or delete the categories first.

---

## Zone Categories Page

Zones are **polygon incidents** (e.g., No-Fly Zones, Curfews, Maritime Exclusion Zones). This page manages their taxonomy separately from marker domains/categories.

### Zone Category Fields
- **Name & slug** — displayed label and URL-friendly identifier
- **Color** — hex code for polygon fill/outline and UI badges
- **Icon** — Lucide icon name (searchable picker)
- **Description** — optional context
- **Sort order** — controls display sequence
- **Active** — inactive categories are hidden from admin/user dropdowns

### How to Use
1. Click **+ New Zone Category** to create a category
2. Click the **pencil** icon to edit
3. Click the **trash** icon to delete (blocked if any zone incident references it)

> ⚠️ Deleting a zone category that is in use will fail with a conflict error. Reassign or delete those zones first.

---

## Incident Map & Detail

The map page (`/superadmin/map`) is the operational view for reviewing and curating incidents.

### Map Controls
- **Date range** — filter markers by start/end date
- **Domain/category filters** — narrow by taxonomy
- **Viewport filtering** — when more than 100 incidents match the current range, only visible map area events are loaded
- **Location search** — type a place name to fly the map there
- **Drawing tools** — create polygon zones or edit existing zone geometry

### Incident Detail Sidebar
Click any marker to open the shared incident-detail sidebar on the right.

| Control | What It Does |
|:--------|:-------------|
| **Edit** | Change title, description, severity, location context, or hero image |
| **Resolve** | Mark the incident as resolved and set its end date |
| **Delete** | Soft-delete the incident (moves it to the Recycle Bin) |
| **Restore / Purge** | Superadmin-only actions for deleted incidents |
| **Add update** | Create a new timeline entry with type and verification status |
| **Feature** | Set a source/media item as the featured evidence for an update |
| **Pin** | Pin an item to the top of its section |
| **Archive X post** | Upload a screenshot to replace the live embed with an archived fallback |
| **Audit log** | Open the incident's audit history inline |
| **View creator** | Open the profile drawer for the user who created the incident |

### Full Incident Page
Click **View full details** (or navigate directly to `/superadmin/incident/:id`) to see the two-column full-page layout: timeline on the left, evidence rail on the right. All curation controls from the sidebar are available here too.

> 💡 Deleted or purged incidents from the Recycle Bin still render the legacy read-only detail panel because their timeline data is not preserved in the recycle bin.

---

## System Health Page

(Placeholder — coming in a future update)

Will show:
- Service status grid (API, DB, Martin tiles)
- Database metrics
- API latency charts
- Storage usage

---

## Data Export Page

(Placeholder — coming in a future update)

Will let you:
- Pick entity type (incidents, users, audit logs)
- Set date range and filters
- Choose format: CSV / JSON / GeoJSON
- Preview first rows
- Download

---

## Keyboard Shortcuts

| Key | Action |
|:----|:-------|
| `Esc` | Close any modal or drawer |
| `Ctrl+K` | Focus search (on Users / Audit pages) |

---

## Troubleshooting

| Problem | Solution |
|:--------|:---------|
| "Session expired" redirect | Log in again. Token expires after 24h. |
| Dashboard numbers don't update | Check that the backend is running on port 3000 |
| Audit log empty | Audit logging starts from when the feature was added. Earlier actions weren't recorded. |
| Cannot delete a category | It has incidents attached. Reassign or delete those incidents first. |
| Cannot delete a domain | It still has categories. Remove them first. |
| Map not loading in other apps | Check that Martin tile server is running on port 8080 |

---

## Starting / Stopping Everything

From the project root:

```bash
# Start all services
./scripts/start-geowatch.sh

# Start just the superadmin console
./scripts/start-geowatch.sh superadmin-web

# Check what's running
./scripts/status-geowatch.sh

# Stop everything
./scripts/stop-geowatch.sh

# Stop just the superadmin console
./scripts/stop-geowatch.sh superadmin-web

# View logs
./scripts/logs-geowatch.sh
./scripts/logs-geowatch.sh superadmin-web
```

---

## Quick Reference: All Ports

| Service | URL | Purpose |
|:--------|:----|:--------|
| Superadmin Console | http://localhost:5175 | This panel |
| Admin Dashboard | http://localhost:5174 | Create/edit incidents |
| User Website | http://localhost:5173 | Public read-only map |
| Backend API | http://localhost:3000 | REST API |
| Martin Tiles | http://localhost:8080 | Map tile server |
