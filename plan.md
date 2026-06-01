# Phase 3 Superadmin Map — Code Review Findings & Fix Plan

## Code Review Summary

The superadmin map integration is structurally sound: routes work, build passes, map initializes, markers render, deep-linking works, and the SSE connection is properly configured. However, several issues prevent the admin-only overlays from being actually usable, and the layout is broken by the global `<main>` padding.

---

## Issues Found

### 🔴 Critical

1. **Layout padding breaks full-bleed map**
   - `Layout.jsx` wraps every page in `<main style={{ padding: '24px 28px' }}>`
   - `MapPage` expects `height: calc(100vh - var(--topbar-height))` edge-to-edge
   - Result: map overflows viewport, unwanted scrollbars, overlays misaligned

2. **IncidentDetailPanel has NO real admin actions**
   - `adminMode` prop exists but is only used for:
     - "Open in Admin →" link (goes to admin-web root, not the incident)
     - Debug metadata section
   - Missing: Edit inline form, Resolve modal, Delete confirmation
   - Superadmin cannot mutate incidents from the map view

3. **Missing incident mutation APIs in superadmin `api.js`**
   - No `updateIncident()`, `deleteIncident()`, or `resolveIncident()` exports
   - Backend endpoints exist (`PATCH /incidents/:id`, `DELETE /incidents/:id`, `POST /incidents/:id/resolve`)
   - Frontend has no way to call them

4. **Popup admin link hidden behind debug toggle**
   - `buildPopupHTML()` only shows "Open in Admin →" when `showDebug` is true
   - Superadmin must enable debug mode to see the admin shortcut in popups

### 🟡 Medium

5. **"Open in Admin" links don't include incident ID**
   - Both popup and detail panel link to `adminUrl` root (`http://localhost:5174`)
   - Admin-web uses internal state, not URL routes, for incident selection
   - Link is essentially useless for opening a specific incident

6. **No `status` filter passed to API**
   - `getIncidents()` calls don't include `status: 'active'`
   - Resolved incidents appear on the map alongside active ones

7. **MapPage doesn't pass `onRefresh` to IncidentDetailPanel**
   - After edit/resolve/delete, the incident list won't refresh

---

## Fix Plan

### 1. Fix Layout padding for MapPage
**File:** `src/superadmin-web/src/components/Layout/Layout.jsx`
- Use `useLocation` to detect `/superadmin/map`
- Conditionally set `padding: 0` and `overflow: hidden` for the map route
- Preserve existing padding for all other routes

### 2. Add missing incident APIs to superadmin `api.js`
**File:** `src/superadmin-web/src/services/api.js`
- Add `updateIncident(id, body)` → `PATCH /incidents/:id`
- Add `deleteIncident(id)` → `DELETE /incidents/:id`
- Add `resolveIncident(id, body)` → `POST /incidents/:id/resolve`

### 3. Enhance IncidentDetailPanel with real admin actions
**File:** `src/superadmin-web/src/components/Map/IncidentDetailPanel.jsx`

**Edit flow:**
- Add "Edit" button in header (adminMode only)
- Toggle inline edit form with fields: Title, Description, Severity (1-5), Category (dropdown), Start Date, End Date, Location Context, Verification Override
- "Save" calls `updateIncident()`
- "Cancel" returns to view mode
- Show success/error inline

**Resolve flow:**
- Add "Resolve" button (adminMode only, hidden if status !== 'active')
- Opens a small modal: "Resolve this incident? It will be marked as resolved and removed from the live map."
- Calls `resolveIncident(id)`
- On success, show resolved state and refresh parent

**Delete flow:**
- Add "Delete" button (adminMode only, styled dangerously)
- Confirm dialog: "Move to Recycle Bin? This incident will be hidden from all views but can be restored."
- Calls `deleteIncident(id)`
- On success, dispatch `incident-deleted` custom event (same pattern as admin-web) so MapPage refreshes its list

**Metadata:**
- Keep existing debug metadata section
- Add `created_by_name` if available from backend

### 4. Fix popup admin link visibility
**File:** `src/superadmin-web/src/components/Map/SuperadminMap.jsx`
- In `buildPopupHTML`, show "Open in Admin →" when `adminMode` is true
- Keep debug metadata behind `showDebug` toggle
- Remove the now-redundant admin link from the debug section

### 5. Add status filter support to MapPage
**File:** `src/superadmin-web/src/pages/MapPage.jsx`
- Add `status` to filters state (default `'active'`)
- Pass `status` to `getIncidents()` calls
- Add a status toggle in `MapControls` (Active / Resolved / All)

### 6. Pass `onRefresh` from MapPage to IncidentDetailPanel
**File:** `src/superadmin-web/src/pages/MapPage.jsx`
- Provide `onRefresh` callback that re-fetches incidents
- Wire it to IncidentDetailPanel so mutations refresh the list

### 7. Add category dropdown data for edit form
**File:** `src/superadmin-web/src/pages/MapPage.jsx` + `src/superadmin-web/src/services/api.js`
- Fetch categories via `listAllCategories()` already in api.js
- Pass categories down to IncidentDetailPanel for the edit form dropdown

---

## Testing Checklist (runtime verification)

1. Navigate to `/superadmin/map` — map fills viewport edge-to-edge, no scrollbars
2. Markers load with correct domain colors and severity sizes
3. Click a marker — sidebar opens with incident details
4. Debug toggle appears bottom-left; click it — popup shows metadata
5. Popup shows "Open in Admin →" without debug mode being on
6. Click "Edit" in sidebar — form appears, fields pre-filled
7. Change severity, save — marker size updates on map after refresh
8. Click "Resolve" — confirm, incident status changes to resolved
9. Click "Delete" — confirm, incident disappears from map and sidebar closes
10. Deep-link `?incident=uuid` — ghost marker appears, "Switch to this date" works
11. Date range picker switches between Live/Historic modes
12. Domain legend toggles visibility correctly
13. Location search flies to result
14. SSE stream connects and receives updates
15. Status filter toggles between Active/Resolved/All

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/superadmin-web/src/components/Layout/Layout.jsx` | Conditional padding for map route |
| `src/superadmin-web/src/services/api.js` | Add updateIncident, deleteIncident, resolveIncident |
| `src/superadmin-web/src/components/Map/IncidentDetailPanel.jsx` | Add edit/resolve/delete UI + inline form |
| `src/superadmin-web/src/components/Map/SuperadminMap.jsx` | Fix popup admin link visibility |
| `src/superadmin-web/src/pages/MapPage.jsx` | Add status filter, onRefresh, pass categories |
| `src/superadmin-web/src/components/Map/MapControls.jsx` | Add status filter toggle |
