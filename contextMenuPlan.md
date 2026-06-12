# GeoWatch Map Context Menu — Implementation Plan

> **Document Purpose:** Define a right-click/long-press context menu for the map in all three frontends. This plan is designed to survive context compaction. Each phase contains the exact menu options, UX rules, file targets, and technical notes needed for any AI instance to pick up the work.

---

## 1. Project Context

**GeoWatch** is a monorepo with three React frontends and one Express backend:

```
/src
  /backend          → Express 4 API, PostgreSQL 16 + PostGIS 3, port 3000
  /admin-web        → React 18 + Vite, MapLibre GL JS, port 5173
  /user-web         → React 18 + Vite, MapLibre GL JS, port 5174
  /superadmin-web   → React 18 + Vite, MapLibre GL JS, port 5175
  /shared           → Design tokens, constants, shared React components/hooks
```

- **Map library:** `maplibre-gl` (NOT Mapbox).
- **Markers:** DOM-based (`new maplibregl.Marker({ element })`) stored in a `Map()` called `markers.current`.
- **Zones:** Rendered as MapLibre GeoJSON vector layers (`zone-fills`, `zone-outlines`) beneath markers.
- **Auth:** JWT Bearer tokens, different per frontend.

---

## 2. Design Decisions (Locked)

The following decisions were confirmed before writing this plan:

| Decision | Choice |
|---|---|
| **Reset map** | Reset only **pitch and bearing to 0**; do NOT change center or zoom. |
| **Create Here** | Start the drawing/placement tool **immediately** at the cursor. For a zone, drop the first vertex. For an incident, trigger the existing point-incident creation flow (same as double-click). |
| **Marker vs zone overlap** | Since zones render **beneath** markers, if the cursor is over a marker, show the **incident** menu. Only show the zone menu when the cursor is over a zone but not over a marker. |
| **Destructive actions** | Use a **styled in-app confirmation modal** (not the browser `confirm()` dialog). |
| **Save/Unsave bookmark** | Only in **user-web** for now. Admin/superadmin do not have a bookmark feature yet. |
| **Touch support** | Yes — implement **long-press** to open the same menu. |

---

## 3. Menu Options by Web

### 3.1 Admin Web & Superadmin Web

Both operator dashboards share the same menu options. Implementation files differ, but the user-visible behavior is identical.

#### Right-click on empty map area

| Option | Action |
|---|---|
| **Create Zone Here** | Enter polygon drawing mode and drop the first vertex at the cursor. |
| **Create Incident Here** | Trigger the existing point-incident creation flow at the cursor (equivalent to double-click). |
| **Center Map Here** | Pan so the cursor location becomes the map center. |
| **Copy Coordinates** | Copy `lat, lng` to the clipboard. |
| **Reset Map View** | Animate pitch and bearing back to `0`. |

#### Right-click on an incident marker

| Option | Action |
|---|---|
| **View Details** | Open the incident detail panel. |
| **Edit Incident** | Open the incident info edit form. |
| **Resolve** | Mark the incident resolved (styled confirmation modal). |
| **Delete** | Delete the incident (styled confirmation modal). |
| **Copy Link** | Copy a shareable `?incident=<id>` URL. |

#### Right-click on a polygon zone

| Option | Action |
|---|---|
| **View Zone Details** | Open the zone detail panel. |
| **Edit Zone Shape** | Enter vertex-edit mode for this zone. |
| **Edit Zone Info** | Open `ZoneForm` for metadata editing. |
| **Resolve** | Mark the zone incident resolved (styled confirmation modal). |
| **Delete** | Delete the zone incident (styled confirmation modal). |
| **Copy Link** | Copy a shareable `?zone=<id>` URL. |

> **Note:** Admin-web already has a `MapContextMenu.jsx` used for vertex/edge editing. That existing behavior is preserved and extended; it is NOT replaced.

---

### 3.2 User Web

User-web is read-mostly, so the menu is shorter and focused on viewing, sharing, and personal bookmarks.

#### Right-click on empty map area

| Option | Action |
|---|---|
| **Center Map Here** | Pan so the cursor location becomes the map center. |
| **Copy Coordinates** | Copy `lat, lng` to the clipboard. |
| **Reset Map View** | Animate pitch and bearing back to `0`. |

#### Right-click on an incident marker

| Option | Action |
|---|---|
| **View Details** | Open the incident detail panel. |
| **Save Incident** / **Unsave Incident** | Toggle the authenticated user’s saved incident. Hidden for anonymous users. |
| **Share Incident** | Copy a shareable `?incident=<id>` URL. |

#### Right-click on a polygon zone

| Option | Action |
|---|---|
| **View Zone Details** | Open the zone detail panel. |
| **Share Zone** | Copy a shareable `?zone=<id>` URL. |

---

## 4. Shared UX Rules

1. **Prevent the native menu.** Call `event.preventDefault()` on the map/container `contextmenu` event.
2. **Close behavior.** Close the menu when:
   - The user clicks outside it.
   - The user presses `Escape`.
   - The map moves, zooms, or rotates.
   - The user selects any menu item.
3. **Positioning.** Render the menu at the click/touch point. If it would overflow the viewport, flip it left/up so it stays fully visible.
4. **Destructive actions.** Resolve and Delete are grouped at the bottom and styled in the danger color (`var(--danger, #ef4444)`).
5. **Disabled items.** If an action is impossible in the current state (e.g., editing a zone already), show it disabled with a muted style.
6. **Long-press on touch.** A `touchstart` timer of ~500ms opens the menu at the touch point. `touchmove` cancels it.
7. **Layer IDs used for detection.** The plan assumes these MapLibre layer IDs exist:
   - `zone-fills` / `zone-outlines`
   - `draw-preview-fill` / `draw-preview-line` (during drawing)
   - Marker detection is done via DOM event listeners on the marker elements, not `queryRenderedFeatures`.

---

## 5. Technical Notes

### 5.1 Marker Right-Click Detection

Markers are DOM elements. When a marker is created, attach:

```js
element.addEventListener('contextmenu', (e) => {
  e.stopPropagation();
  onMarkerContextMenu?.(incident, { x: e.clientX, y: e.clientY });
});
```

For long-press, attach the same timer logic to the marker element and call `onMarkerContextMenu` with the touch coordinates.

Because the marker listener stops propagation, a right-click on a marker inside a zone will never reach the map’s `contextmenu` handler. This enforces the **incident-first** overlap rule.

### 5.2 Zone Right-Click Detection

On the map container, listen for `contextmenu`:

```js
mapInstance.getContainer().addEventListener('contextmenu', (e) => {
  e.preventDefault();
  const point = { x: e.clientX, y: e.clientY };
  const features = mapInstance.queryRenderedFeatures(
    [e.point.x - 5, e.point.y - 5, e.point.x + 5, e.point.y + 5],
    { layers: ['zone-fills'] }
  );
  if (features.length > 0) {
    onZoneContextMenu?.(features[0], point);
  } else {
    onMapContextMenu?.(point, { lng: e.lngLat.lng, lat: e.lngLat.lat });
  }
});
```

Use a small bounding box around the cursor for reliable detection without requiring pixel-perfect precision.

### 5.3 Reset Map View

Only reset pitch and bearing:

```js
mapInstance.easeTo({ pitch: 0, bearing: 0, duration: 500 });
```

### 5.4 Copy Coordinates

```js
await navigator.clipboard.writeText(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
```

### 5.5 Copy Link

Preserve the current path and replace/add the query param:

```js
const url = new URL(window.location.href);
url.searchParams.set('incident', incidentId);
// or url.searchParams.set('zone', zoneId);
await navigator.clipboard.writeText(url.toString());
```

### 5.6 Create Zone Here

In the page component:

```js
setMapMode('polygon');
onDrawVertexAdd({ lat, lng }); // drops the first vertex
```

The existing drawing toolbar and preview rendering take over from there.

### 5.7 Create Incident Here

Reuse the existing double-click handler:

```js
onMapDblClick?.({ lat, lng });
```

For admin-web, this already opens the create-incident form at the clicked location.

### 5.8 Confirmation Modal

Create or reuse a small shared/styled modal component. Example API:

```jsx
<ConfirmDialog
  isOpen={true}
  title="Delete incident?"
  message="This cannot be undone."
  confirmText="Delete"
  danger
  onConfirm={doDelete}
  onCancel={closeDialog}
/>
```

If the target frontend already has a modal primitive, use it.

---

## 6. Phase Breakdown

---

## Phase 1: Shared Context-Menu Primitive

### Goal
Build the reusable pieces every frontend will use: a styled context menu component, a hook for menu state/positioning, and a long-press helper.

### Files to Create

| File | Purpose |
|---|---|
| `src/shared/components/MapContextMenu.jsx` | Styled context menu UI: items list, separators, danger style, click-outside, Escape-to-close, viewport-bound positioning. |
| `src/shared/hooks/useMapContextMenu.js` | Manages `isOpen`, `position`, `feature`, `close()`, `open(point, feature)`. |
| `src/shared/hooks/useLongPress.js` | Touch long-press detection that works on both the map container and marker elements. |
| `src/shared/components/ConfirmDialog.jsx` | Reusable styled confirmation modal for destructive actions. |

### Files to Modify

| File | Change |
|---|---|
| `src/admin-web/src/components/Map/MapContextMenu.jsx` | Replace local implementation with the shared component (or re-export it). Preserve the same prop interface so existing callers keep working. |

### Acceptance Criteria
- [ ] Shared `MapContextMenu` renders correctly in all three apps.
- [ ] Menu flips to stay inside viewport.
- [ ] Escape and click-outside close it.
- [ ] Long-press hook fires after ~500ms and cancels on move.
- [ ] `ConfirmDialog` matches each app’s existing visual style.

### Commit Summary
```
feat: add shared MapContextMenu, useMapContextMenu hook, long-press helper, and ConfirmDialog
```

---

## Phase 2: Admin Web — Full Map Context Menu

### Goal
Extend admin-web’s existing partial context menu to cover the full map, markers, and zones.

### Files to Modify

| File | Change |
|---|---|
| `src/admin-web/src/components/Map/AdminMap.jsx` | Emit `onMarkerContextMenu(incident, point)` from marker DOM listeners. Emit `onZoneContextMenu(zoneFeature, point)` and `onMapContextMenu(point, latLng)` from the map container `contextmenu` listener. Pass these callbacks up as props. |
| `src/admin-web/src/components/Layout/DashboardLayout.jsx` | Import `useMapContextMenu` and `MapContextMenu`. Build menu item arrays for empty map, marker, and zone. Handle actions: create zone/incident, center map, copy coords, reset view, view/edit/resolve/delete/copy link. |
| `src/admin-web/src/services/api.js` | Ensure `resolveIncident`, `deleteIncident`, `updateIncident` are available. |
| `src/admin-web/src/components/Map/MapContextMenu.jsx` | Re-export or remove in favor of shared component. |

### Menu Wiring

Empty area → items:
- Create Zone Here
- Create Incident Here
- Center Map Here
- Copy Coordinates
- Reset Map View

Marker → items:
- View Details
- Edit Incident
- Resolve
- Delete
- Copy Link

Zone → items:
- View Zone Details
- Edit Zone Shape
- Edit Zone Info
- Resolve
- Delete
- Copy Link

### Acceptance Criteria
- [ ] Right-click empty map shows the empty-area menu.
- [ ] Right-click marker shows incident menu.
- [ ] Right-click zone shows zone menu.
- [ ] Right-click on a marker inside a zone shows the incident menu.
- [ ] Create Zone Here enters polygon mode with first vertex placed.
- [ ] Create Incident Here opens the create form at the cursor.
- [ ] Reset Map View resets pitch/bearing to 0.
- [ ] Resolve/Delete show the styled confirmation modal.
- [ ] Copy Link writes the correct `?incident=` or `?zone=` URL.
- [ ] Long-press on touch opens the menu.
- [ ] Existing vertex/edge context menus during drawing still work.
- [ ] Build passes with zero errors.

### Commit Summary
```
feat: add full right-click/long-press context menu to admin-web map
```

---

## Phase 3: Superadmin Web — Full Map Context Menu

### Goal
Add the same context-menu behavior to superadmin-web. Superadmin already exposes `onContextMenu` from `SuperadminMap`, so the page layer needs the menu logic.

### Files to Modify

| File | Change |
|---|---|
| `src/superadmin-web/src/components/Map/SuperadminMap.jsx` | Attach marker DOM `contextmenu` listeners that call `onMarkerContextMenu`. Attach map container `contextmenu` listener for zones/empty area. Wire long-press on markers and container. |
| `src/superadmin-web/src/pages/MapPage.jsx` | Use `useMapContextMenu` and `MapContextMenu`. Build the same item arrays as admin-web. Wire handlers to existing state setters (`setMapMode`, `onDrawVertexAdd`, `handleEditZone`, `handleZoneInfoEdit`, resolve, delete, etc.). |
| `src/superadmin-web/src/services/api.js` | Ensure `resolveIncident`, `deleteIncident`, `updateIncident` are available. |

### Acceptance Criteria
- [ ] Same behavior as admin-web context menu.
- [ ] Edit Zone Shape enters vertex-edit mode for the selected zone.
- [ ] Edit Zone Info opens `ZoneForm` in edit mode.
- [ ] Resolve/Delete use the styled confirmation modal.
- [ ] Copy Link works for incidents and zones.
- [ ] Long-press works.
- [ ] Build passes with zero errors.

### Commit Summary
```
feat: add right-click/long-press context menu to superadmin-web map
```

---

## Phase 4: User Web — Read-Only Context Menu

### Goal
Add the user-web context menu with only view/share/save actions and empty-map utilities.

### Files to Modify

| File | Change |
|---|---|
| `src/user-web/src/components/Map/UserMap.jsx` | Attach marker DOM `contextmenu` listeners. Attach map container `contextmenu` listener for zones/empty area. Wire long-press. |
| `src/user-web/src/pages/MapPage.jsx` | Use `useMapContextMenu` and `MapContextMenu`. Build item arrays for empty map, marker, and zone. Wire save/unsave, view details, share, center, copy coordinates, reset view. |
| `src/user-web/src/services/api.js` | Ensure `saveIncident` / `unsaveIncident` endpoints exist. |

### Menu Wiring

Empty area → items:
- Center Map Here
- Copy Coordinates
- Reset Map View

Marker → items:
- View Details
- Save Incident / Unsave Incident (hidden if anonymous)
- Share Incident

Zone → items:
- View Zone Details
- Share Zone

### Acceptance Criteria
- [ ] Right-click empty map shows Center / Copy / Reset.
- [ ] Right-click marker shows View / Save / Share.
- [ ] Save/Unsave toggles correctly and updates label on next open.
- [ ] Share copies the correct `?incident=` URL.
- [ ] Right-click zone shows View / Share.
- [ ] Long-press works.
- [ ] Build passes with zero errors.

### Commit Summary
```
feat: add right-click/long-press context menu to user-web map
```

---

## 7. Cross-Cutting Considerations

### 7.1 Styling

The shared `MapContextMenu` must adapt to each app’s CSS variables:

```css
background: var(--bg-surface);
border: 1px solid var(--border-subtle);
border-radius: var(--radius-sm);
box-shadow: var(--shadow-lg);
color: var(--text-primary);
font-family: var(--font-sans);
```

No hardcoded colors. Superadmin uses navy accent; admin/user use crimson. The menu does not need per-app accent colors unless active/hover states require them.

### 7.2 Existing Vertex/Edge Menus

Admin-web already shows a context menu while drawing or editing a zone:
- Delete vertex
- Add vertex here

These menus are **local to drawing/edit mode** and take precedence over the general map menu. In implementation, check for drawing/edit mode **before** falling back to the general menu.

### 7.3 Query Thickness

For zone detection, use a 10px × 10px bounding box around the cursor rather than a single point. This matches the visual thickness of zone outlines and is forgiving for users.

### 7.4 State Synchronization

After Resolve or Delete, increment the frontend’s `refreshKey` so the map and lists update. After Save/Unsave in user-web, update local saved-state if needed.

### 7.5 Accessibility

- Menu items are focusable `<button>` elements.
- `Escape` closes the menu.
- Use `aria-label` on the map container to advertise right-click/long-press actions (optional).

---

## 8. Resume Prompts (After Context Compaction)

### Prompt: Implement Phase 1

```
Implement Phase 1 of contextMenuPlan.md.

TASKS:
1. Create src/shared/components/MapContextMenu.jsx — styled context menu that accepts items array, position {x,y}, and onClose. Support danger items, separators, viewport-bound positioning, Escape, and click-outside.
2. Create src/shared/hooks/useMapContextMenu.js — manages open/close state, position, and attached feature.
3. Create src/shared/hooks/useLongPress.js — 500ms long-press detection for touch, cancel on move.
4. Create src/shared/components/ConfirmDialog.jsx — styled confirmation modal for destructive actions.
5. Update src/admin-web/src/components/Map/MapContextMenu.jsx to use the shared component or re-export it without breaking existing callers.
6. Verify the shared component renders and basic interactions work.

Use existing CSS variables: var(--bg-surface), var(--border-subtle), var(--radius-sm), var(--shadow-lg), var(--text-primary), var(--danger, #ef4444).
```

### Prompt: Implement Phase 2 (Admin Web)

```
Implement Phase 2 of contextMenuPlan.md: admin-web full context menu.

TASKS:
1. In AdminMap.jsx, attach contextmenu listeners to marker elements that call onMarkerContextMenu(incident, {x,y}).
2. In AdminMap.jsx, attach a map container contextmenu listener that queriesRenderedFeatures for 'zone-fills' layer and calls onZoneContextMenu(feature, point) or onMapContextMenu(point, latLng).
3. In DashboardLayout.jsx, wire useMapContextMenu and MapContextMenu. Build item arrays for empty map, marker, and zone using the options listed in contextMenuPlan.md section 3.1.
4. Implement handlers: create zone here (set polygon mode + first vertex), create incident here (call onMapDblClick), center map, copy coordinates, reset view, view details, edit incident, edit zone shape, edit zone info, resolve, delete, copy link.
5. Resolve and Delete must use ConfirmDialog.
6. Preserve existing vertex/edge context menus during drawing/editing.
7. Build and verify.
```

### Prompt: Implement Phase 3 (Superadmin Web)

```
Implement Phase 3 of contextMenuPlan.md: superadmin-web full context menu.

TASKS:
1. In SuperadminMap.jsx, attach marker DOM contextmenu listeners and map container contextmenu listener for zones/empty area. Wire long-press.
2. In MapPage.jsx, use useMapContextMenu and MapContextMenu. Build item arrays matching admin-web.
3. Wire handlers to existing functions: handleSetMode, handleDrawVertexAdd, handleEditZone, handleZoneInfoEdit, resolveIncident, deleteIncident, updateIncident, copy link.
4. Resolve/Delete use ConfirmDialog.
5. Build and verify.
```

### Prompt: Implement Phase 4 (User Web)

```
Implement Phase 4 of contextMenuPlan.md: user-web read-only context menu.

TASKS:
1. In UserMap.jsx, attach marker DOM contextmenu listeners and map container contextmenu listener for zones/empty area. Wire long-press.
2. In MapPage.jsx, use useMapContextMenu and MapContextMenu. Build item arrays from contextMenuPlan.md section 3.2.
3. Implement handlers: center map, copy coordinates, reset view, view details, save/unsave incident (hide if anonymous), share incident, view zone details, share zone.
4. Build and verify.
```

---

*End of Context Menu Plan*
