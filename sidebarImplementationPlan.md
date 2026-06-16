# GeoWatch — Trial Sidebar & Incident Page Implementation Plan

> **Status:** Phase 8 complete. Ready for Phase 9 (QA, docs, cleanup).  
> **Goal:** Port the trial sidebars (`/sidebarTrial2/*`) and full incident pages (`/incident-trial/*`) into the live admin-web, user-web, and superadmin-web apps, with all features working end-to-end.

---

## 1. Decisions & constraints (agreed with stakeholders)

| Topic | Decision |
|-------|----------|
| **Scope** | Deploy both the **sidebar (Option F)** and the **full-page (Option 1)** designs into all three live apps. |
| **user-web routes** | Keep the existing `/map` sidebar detail, and add a new dedicated `/incident/:id` full page. |
| **Evidence ownership** | Move from incident-level sources/media to **per-update evidence** by adding `update_id` to `incident_sources` and `incident_media`. |
| **Feature set** | Implement **every** trial feature meticulously: featured item per update, pinned evidence, X snapshot/archive fallback, media captions, hero image per incident, update type/verification, full source/media/timeline edit & delete. |
| **Data backfill** | Attach all existing sources/media to the **initial report update** (earliest `incident_updates` row per incident). |
| **X snapshots** | Re-use the existing `POST /incidents/:id/media` endpoint for screenshots, then link the uploaded media row via `incident_sources.archive_media_id`. |
| **Routing dependency** | Upgrade **admin-web** and **superadmin-web** from `react-router-dom` v6 to **v7** so shared components can safely use `useNavigate`. |
| **Component sharing** | Refactor production-ready trial components and move them into **`src/shared/`**; import from `@shared` in all three apps. |
| **Icons** | Keep the trial inline SVG icons to avoid adding `lucide-react` to admin-web. |
| **DB operations** | Migrations will be run with `sudo -u postgres psql`. The sudo password is available in the session context and will not be persisted in files. |

---

## 2. Current state summary

### Frontends

- **admin-web** — `DashboardLayout` + `IncidentDetailPanel`. Incident-level sources/timeline/media. Full CRUD for incidents/timeline/media, but **no** source delete/edit, **no** featured/pinned/archive, **no** per-update evidence grouping.
- **user-web** — `/map` sidebar `IncidentDetailView`. Public read-only. No dedicated incident page. No featured/pinned/archive.
- **superadmin-web** — `/superadmin/map` sidebar `IncidentDetailPanel`. View-only evidence/timeline; no source/timeline/media mutations exposed in the UI.

### Backend

- Tables: `incidents`, `incident_updates`, `incident_sources`, `incident_media`, `users`, `public_users`, `audit_logs`.
- Current `GET /incidents/:id` returns `{ incident, sources, timeline }` as flat lists.
- Missing primitives: `update_id`, `pinned`, `featured_*`, `archived`, `archive_media_id`, `caption`, `hero_image_url`, update `type`/`verification_status`.

### Trial components (source of truth for the new UX)

- `src/admin-web/src/components/DesignTrial/IncidentDetailOptionF.jsx` → sidebar card design, per-update featured block, evidence drawer.
- `src/admin-web/src/components/DesignTrial/SidebarTrial2Option1Base.jsx` → full page design with left timeline + right evidence rail.
- `src/admin-web/src/components/DesignTrial/IncidentDetailTrialCommon.jsx` → `XPostCompactList`, `XEmbed`, `ArchivedPost`, `ArchiveLightbox`, compact media grid.
- `src/admin-web/src/components/DesignTrial/SidebarTrialShared.jsx` → icons, read-only cards, `sortPinned`, helpers.
- `src/admin-web/src/components/DesignTrial/SidebarTrial2Option1SuperAdminAudit.jsx` → audit/user profile drawers.

---

## 3. Target architecture

### 3.1 Data model (after migration)

```text
incidents
  └── hero_image_url | hero_media_id
  └── verification_status (computed)

incident_updates
  ├── id, incident_id, summary, update_date, created_by
  ├── type ('report' | 'update')
  ├── verification_status ('unverified' | 'verified' | 'disputed' | 'debunked')
  ├── featured_source_type ('media' | 'x_post' | 'news_article' | 'admin_note' | null)
  ├── featured_source_id (UUID | null)
  └── featured_media_id (UUID | null, references incident_media)

incident_sources
  ├── id, incident_id, update_id (new, FK → incident_updates)
  ├── source_type ('x_post' | 'news_article' | 'admin_note' | 'image' | 'video')
  ├── source_url, embed_html, media_url, description
  ├── display_order, verification_status
  ├── pinned BOOLEAN DEFAULT false
  ├── archived BOOLEAN DEFAULT false
  ├── archive_media_id UUID REFERENCES incident_media(id) ON DELETE SET NULL
  ├── archive_reason TEXT
  └── archived_at TIMESTAMPTZ

incident_media
  ├── id, incident_id, update_id (new, FK → incident_updates)
  ├── file_url, thumbnail_url, file_type, mime_type, display_order
  ├── caption TEXT (new)
  └── pinned BOOLEAN DEFAULT false
```

### 3.2 API response shape for `GET /incidents/:id`

```jsonc
{
  "incident": {
    "id": "...",
    "title": "...",
    "description": "...",
    "heroImageUrl": "...",
    "verificationStatus": "verified",
    /* ...geometry, dates, category, etc. */
  },
  "timeline": [
    {
      "id": "u1",
      "summary": "Initial report",
      "updateDate": "2026-06-13T17:00:00Z",
      "type": "report",
      "verificationStatus": "verified",
      "createdByName": "Ops Desk",
      "sources": {
        "x_post": [ /* sorted: pinned first, then display_order */ ],
        "news_article": [],
        "admin_note": []
      },
      "media": [ /* sorted: pinned first, then display_order */ ],
      "featuredItem": {
        "sourceType": "x_post",
        "itemId": "source-uuid"
      }
    },
    /* more updates */
  ]
}
```

Notes:
- `sources.image` and `sources.video` will continue to be returned from `incident_sources`, but the canonical media carousel will use `incident_media`. During the migration we will reconcile: uploaded media lives in `incident_media`; image/video source rows without a linked media row can be deprecated or treated as external links.
- The backend sorts sources and media with `pinned DESC, display_order ASC, created_at ASC`.

### 3.3 New & updated API endpoints

| Method | Endpoint | Purpose | Access |
|--------|----------|---------|--------|
| `GET` | `/api/v1/incidents/:id` | Full incident with nested per-update evidence | public (optional auth) |
| `POST` | `/api/v1/incidents/:id/timeline` | Create a timeline update | admin, superadmin |
| `PATCH` | `/api/v1/incidents/:id/timeline/:updateId` | Edit summary/date/type/verification | admin, superadmin |
| `DELETE` | `/api/v1/incidents/:id/timeline/:updateId` | Delete a timeline update | admin, superadmin |
| `PATCH` | `/api/v1/incidents/:id/timeline/:updateId/featured` | Set/clear featured item for this update | admin, superadmin |
| `POST` | `/api/v1/incidents/:id/sources` | Create a source (already exists; extend) | admin, superadmin |
| `PATCH` | `/api/v1/incidents/:id/sources/:sourceId` | Edit URL/description/archive state | admin, superadmin |
| `DELETE` | `/api/v1/incidents/:id/sources/:sourceId` | Delete a source | admin, superadmin |
| `PATCH` | `/api/v1/incidents/:id/sources/:sourceId/pin` | Pin/unpin a source | admin, superadmin |
| `POST` | `/api/v1/incidents/:id/media` | Upload media (extend with `caption`, `updateId`) | admin, superadmin |
| `PATCH` | `/api/v1/incidents/:id/media/:mediaId` | Edit caption/pin/update linkage | admin, superadmin |
| `DELETE` | `/api/v1/incidents/:id/media/:mediaId` | Delete media (already exists) | admin, superadmin |
| `PATCH` | `/api/v1/incidents/:id/media/:mediaId/pin` | Pin/unpin media | admin, superadmin |
| `PATCH` | `/api/v1/incidents/:id` | Edit incident incl. hero image | admin, superadmin |

### 3.4 Audit actions to add

In `src/backend/src/utils/audit-actions.js`:

- `TIMELINE_FEATURED_SET`
- `TIMELINE_FEATURED_CLEARED`
- `SOURCE_PINNED`
- `SOURCE_UNPINNED`
- `SOURCE_DELETED`
- `SOURCE_ARCHIVED`
- `SOURCE_UNARCHIVED`
- `MEDIA_PINNED`
- `MEDIA_UNPINNED`
- `MEDIA_CAPTION_UPDATED`
- `MEDIA_LINKED_TO_UPDATE`
- `INCIDENT_HERO_IMAGE_UPDATED`

---

## 4. Shared component refactor

### 4.1 New shared directory layout

```text
src/shared/
  components/
    incident-detail/
      IncidentDetailSidebar.jsx      (from IncidentDetailOptionF)
      IncidentDetailPage.jsx         (from SidebarTrial2Option1Base)
      EvidenceRail.jsx
      EvidenceToolbar.jsx
      EditableMediaThumb.jsx
      EditableArticleCard.jsx
      EditableAdminNoteCard.jsx
      XPostCompactList.jsx           (from IncidentDetailTrialCommon)
      XEmbed.jsx
      ArchivedPost.jsx
      ArchiveLightbox.jsx
      ArticleCard.jsx
      AdminNoteCard.jsx
      MediaThumb.jsx
      MediaGrid.jsx
      Lightbox.jsx
      FeaturedSection.jsx
      FeatureTrigger.jsx
      AuditLogDrawer.jsx             (shared wrapper for audit/user drawers)
      Icons.jsx                      (consolidated inline SVGs)
    ...existing shared components
  styles/
    incident-detail.css              (merged trial CSS)
    x-post-compact-list.css
```

### 4.2 Refactor rules

- **No mock data.** All shared components receive data and callbacks via props.
- **No `react-router-dom` version assumptions inside shared components.** Navigation will be done via callbacks (`onNavigate`) or `useNavigate` only after all apps are on v7.
- **Role-aware rendering via `mode` prop:** `mode` can be `'user'`, `'admin'`, or `'superadmin'`. `isAdmin = mode === 'admin' || mode === 'superadmin'`.
- **Inline SVG icons only.** Keep the existing `Icons` object from `SidebarTrialShared.jsx`.
- **Use existing shared primitives where possible** (`Button`, `Badge`, `SeverityBadge`, `MediaLightbox`) **only if** they do not break the trial layout; otherwise keep the trial variants and note them for later consolidation.
- **CSS strategy:** Merge `SidebarTrial2Option1.css`, `IncidentDetailTrial.css`, and `XPostCompactList.css` into scoped shared styles and import them in each app’s `main.jsx` or at the component level.

### 4.3 Component APIs (proposed)

#### `IncidentDetailSidebar`
Used inside map sidebars (admin-web dashboard, user-web `/map`, superadmin-web `/superadmin/map`).

```jsx
<IncidentDetailSidebar
  incident={incident}
  timeline={timeline}
  mode="admin" | "user" | "superadmin"
  onFeatureItem={(updateId, sourceType, itemId) => ...}
  onClearFeature={(updateId) => ...}
  onPinItem={(updateId, sourceType, itemId, pinned) => ...}
  onDeleteItem={(updateId, sourceType, itemId) => ...}
  onEditItem={(updateId, sourceType, item) => ...}
  onArchiveSource={(sourceId, archiveMediaId, reason) => ...}
  onUploadSnapshot={async (file) => mediaId}
  onUpdateCaption={(mediaId, caption) => ...}
  onOpenAudit={() => ...}          // superadmin only
  onViewCreator={(userId) => ...}  // superadmin only
/>
```

#### `IncidentDetailPage`
Used on dedicated full pages.

```jsx
<IncidentDetailPage
  incident={incident}
  timeline={timeline}
  mode="admin" | "user" | "superadmin"
  /* same callbacks as sidebar */
/>
```

Both components transform the backend response internally into the shape the existing trial components expect (`events` array with `sources: { media, x_post, news_article, admin_note }`).

---

## 5. Per-app integration

### 5.1 admin-web

1. **Upgrade** `react-router-dom` to v7 in `src/admin-web/package.json` and run `npm install`.
2. **Add route** `/incident/:id` in `src/admin-web/src/App.jsx` pointing to a new `IncidentDetailPage` wrapper.
3. **Replace** `src/admin-web/src/components/IncidentDetail/IncidentDetailPanel.jsx` usage in `DashboardLayout` with `IncidentDetailSidebar`.
4. **Extend API service** in `src/admin-web/src/services/api.js` with all new endpoints.
5. **Update incident creation/editing forms** to support:
   - Hero image upload/selection.
   - Choosing which update a source or media file belongs to.
   - Creating the initial report update automatically on incident creation.
6. **Connect SSE handlers** to refresh the detail view after relevant mutations.
7. **Remove or archive** old `IncidentDetailPanel` and `SourceItem` components once migration is verified.

### 5.2 user-web

1. **Upgrade** `react-router-dom` to v7 (it may already be on v7; confirm exact version).
2. **Add route** `/incident/:id` in `src/user-web/src/App.jsx`.
3. **Replace** `src/user-web/src/components/IncidentDetail/IncidentDetailView.jsx` in the `/map` sidebar with `IncidentDetailSidebar`.
4. **Extend API service** in `src/user-web/src/services/api.js`.
5. **Pass only read-only callbacks** (or none) to the sidebar/page; mutation props are omitted for `mode="user"`.
6. **Update map marker behavior:** decide whether a click opens the sidebar or navigates to `/incident/:id`. Recommendation: click opens sidebar; a “View full page” link inside the sidebar navigates to `/incident/:id`.
7. **Remove or archive** old `IncidentDetailView`.

### 5.3 superadmin-web

1. **Upgrade** `react-router-dom` to v7 in `src/superadmin-web/package.json` and run `npm install`.
2. **Add route** `/superadmin/incident/:id` (or `/incident/:id` behind `RequireSuperAdmin`) in `App.jsx`.
3. **Replace** `src/superadmin-web/src/components/Map/IncidentDetailPanel.jsx` in `MapPage` with `IncidentDetailSidebar`.
4. **Extend API service** in `src/superadmin-web/src/services/api.js`.
5. **Superadmin gets full admin-like controls** (`mode="superadmin"`).
6. **Wire audit/user profile drawers:** reuse existing `AuditLogPanel` / `UserProfileDrawer` or the shared `AuditLogDrawer`.
7. **Remove or archive** old `IncidentDetailPanel`.

---

## 6. Detailed phase breakdown

### Phase 1 — Database migration & backfill

**Files to create/modify:**
- `docs/migrations/005_incident_detail_evidence.sql`
- `docs/database-schema.sql` (update canonical schema)

**Tasks:**
1. Add columns to `incident_updates`, `incident_sources`, `incident_media`, `incidents`.
2. Add FK constraints:
   - `incident_sources.update_id → incident_updates(id) ON DELETE CASCADE`
   - `incident_media.update_id → incident_updates(id) ON DELETE CASCADE`
   - `incident_sources.archive_media_id → incident_media(id) ON DELETE SET NULL`
3. Add indexes on new foreign keys and `pinned` columns.
4. Backfill:
   - For each incident, find the earliest `incident_updates` row and set its `type = 'report'`, `verification_status = 'verified'`.
   - Set all other updates’ `type = 'update'`.
   - Set `update_id` on all existing `incident_sources` and `incident_media` to that initial report update.
5. Run migration with `sudo -u postgres psql -d geowatch_dev -f docs/migrations/005_incident_detail_evidence.sql`.
6. Verify constraints and backfill counts.

**Commit message suggestion:**
`feat(db): add per-update evidence, featured/pinned/archive, and hero image columns`

---

### Phase 2 — Backend services, controllers, validators, routes

**Files to create/modify:**
- `src/backend/src/services/incident.service.js`
- `src/backend/src/services/source.service.js`
- `src/backend/src/services/media.service.js`
- `src/backend/src/services/timeline.service.js`
- `src/backend/src/controllers/incident.controller.js`
- `src/backend/src/controllers/source.controller.js`
- `src/backend/src/controllers/media.controller.js`
- `src/backend/src/controllers/timeline.controller.js`
- `src/backend/src/routes/source.routes.js`
- `src/backend/src/routes/media.routes.js`
- `src/backend/src/routes/timeline.routes.js`
- `src/backend/src/validators/source.schema.js`
- `src/backend/src/validators/media.schema.js`
- `src/backend/src/validators/timeline.schema.js`
- `src/backend/src/utils/audit-actions.js`
- `docs/api-spec.md`

**Tasks:**
1. Update `getEventById` to:
   - Fetch incident, timeline, sources, media.
   - Group sources/media under the correct update.
   - Sort each group by `pinned DESC, display_order ASC, created_at ASC`.
   - Compute `verification_status` for the incident.
   - Attach `featuredItem` to each update.
   - Include `hero_image_url` in incident response.
2. Extend `source.service.js`:
   - `updateSource`, `deleteSource`, `pinSource`, `archiveSource`.
   - `createSource` should accept `updateId`.
3. Extend `media.service.js`:
   - `updateMedia` (caption, pin, update linkage), `pinMedia`.
   - `createMedia` (upload) accept `caption` and `updateId`.
4. Extend `timeline.service.js`:
   - `updateTimeline` supports `type` and `verificationStatus`.
   - `setFeaturedItem`, `clearFeaturedItem`.
5. Add/update controllers, validators, routes for all new endpoints.
6. Add audit logging for every mutation.
7. Update `api-spec.md` with request/response examples.
8. Run backend tests (or manual smoke tests with curl/Postman).

**Commit message suggestion:**
`feat(api): per-update evidence grouping, featured/pinned/archive endpoints, and hero image`

---

### Phase 3 — react-router-dom v7 upgrade (admin-web + superadmin-web)

**Files to create/modify:**
- `src/admin-web/package.json`
- `src/superadmin-web/package.json`
- `package-lock.json`
- Any import differences caused by v7 (usually minimal).

**Tasks:**
1. Bump `react-router-dom` to the same major/minor version as user-web.
2. Run `npm install` at the workspace root.
3. Run builds for admin-web and superadmin-web to catch any router API drift.
4. Fix any v7 warnings/errors (e.g., `<Routes>` usage, `useNavigate` args).

**Commit message suggestion:**
`chore(deps): upgrade admin-web and superadmin-web to react-router-dom v7`

---

### Phase 4 — Shared component refactor

**Files to create/modify:**
- `src/shared/components/incident-detail/*` (new)
- `src/shared/styles/incident-detail.css` (new)
- `src/shared/styles/x-post-compact-list.css` (new)
- `src/admin-web/src/components/DesignTrial/*` (source copies; kept until migration is verified, then removed)

**Tasks:**
1. Create `src/shared/components/incident-detail/` directory.
2. Move and rename components:
   - `IncidentDetailOptionF.jsx` → `IncidentDetailSidebar.jsx`
   - `SidebarTrial2Option1Base.jsx` → `IncidentDetailPage.jsx`
   - Extract common logic into `EvidenceRail.jsx` if beneficial.
   - Move `XPostCompactList`, `XEmbed`, `ArchivedPost`, `ArchiveLightbox`, cards, toolbars, icons.
3. Remove mock data; wire real props.
4. Ensure all components use `mode` prop for role-aware UI.
5. Merge CSS into shared styles; keep BEM class names to avoid conflicts.
6. Export shared components from `src/shared/index.js` (or per-directory index).
7. Build admin-web (which temporarily still imports from the old location) to confirm no shared breakage.

**Commit message suggestion:**
`refactor(shared): move trial incident-detail components into shared package`

---

### Phase 5 — admin-web integration

**Files to create/modify:**
- `src/admin-web/src/App.jsx`
- `src/admin-web/src/components/Layout/DashboardLayout.jsx`
- `src/admin-web/src/services/api.js`
- `src/admin-web/src/components/IncidentDetail/IncidentDetailPage.jsx` (new wrapper)
- `src/admin-web/src/components/IncidentForm/IncidentForm.jsx`
- `src/admin-web/src/main.jsx` (import shared CSS)

**Tasks:**
1. Import shared CSS in `main.jsx`.
2. Add `/incident/:id` route with a wrapper that fetches incident and renders `IncidentDetailPage`.
3. Replace `IncidentDetailPanel` usage in `DashboardLayout` with `IncidentDetailSidebar`.
4. Add API methods for all new endpoints.
5. Implement callback handlers in wrappers:
   - Feature/unfeature, pin/unpin, delete, edit, archive, upload snapshot, update caption.
6. Update `IncidentForm`:
   - Add hero image upload.
   - When creating an incident, create the initial report update automatically and attach initial sources/media to it.
7. Add SSE refresh for detail view.
8. Build and manually verify admin flows.

**Commit message suggestion:**
`feat(admin-web): integrate shared incident detail sidebar and full page`

---

### Phase 6 — user-web integration

**Files to create/modify:**
- `src/user-web/src/App.jsx`
- `src/user-web/src/pages/MapPage.jsx`
- `src/user-web/src/services/api.js`
- `src/user-web/src/components/IncidentDetail/IncidentDetailPage.jsx` (new wrapper)
- `src/user-web/src/main.jsx` (import shared CSS)

**Tasks:**
1. Import shared CSS in `main.jsx`.
2. Add `/incident/:id` route.
3. Replace `IncidentDetailView` in `MapPage` with `IncidentDetailSidebar`.
4. Add API methods (read-only endpoints only needed, but share service code).
5. Pass only read-only callbacks; omit mutation handlers so controls do not render.
6. Add “View full page” link from sidebar to `/incident/:id`.
7. Build and verify public view.

**Commit message suggestion:**
`feat(user-web): add public incident detail sidebar and full page`

---

### Phase 7 — superadmin-web integration

**Files to create/modify:**
- `src/superadmin-web/src/App.jsx`
- `src/superadmin-web/src/pages/MapPage.jsx`
- `src/superadmin-web/src/services/api.js`
- `src/superadmin-web/src/components/IncidentDetail/IncidentDetailPage.jsx` (new wrapper)
- `src/superadmin-web/src/main.jsx` (import shared CSS)

**Tasks:**
1. Import shared CSS in `main.jsx`.
2. Add `/superadmin/incident/:id` route.
3. Replace `IncidentDetailPanel` in `MapPage` with `IncidentDetailSidebar`.
4. Add API methods for all new endpoints.
5. Implement callback handlers in wrappers (full controls).
6. Wire existing audit/user profile drawers via `onOpenAudit` / `onViewCreator` props.
7. Build and verify superadmin flows.

**Commit message suggestion:**
`feat(superadmin-web): integrate incident detail with full curation controls`

---

### Phase 8 — X snapshot / archive workflow

**Files to create/modify:**
- Shared `XPostCompactList.jsx`, `ArchivedPost.jsx`, `ArchiveLightbox.jsx`
- Admin/superadmin wrappers (upload handler)
- Backend `source.service.js`, `media.service.js`, `source.controller.js`, validators, routes

**Tasks:**
1. In admin/superadmin UI, add an “Archive / Upload snapshot” action on X-post sources.
2. Upload screenshot via existing `POST /incidents/:id/media` (with `updateId`).
3. PATCH source with `archiveMediaId` and `archiveReason`.
4. Backend marks `archived = true` and stores `archive_media_id`.
5. In shared `XEmbed`, if `post.archived` is true, render `ArchivedPost` instead of the live embed.
6. `ArchivedPost` click opens `ArchiveLightbox`.
7. Add ability to unarchive (clear `archive_media_id`, set `archived = false`).
8. Test the full flow: live embed → archive → fallback screenshot → lightbox.

**Commit message suggestion:**
`feat(x-post): archived tweet screenshot upload and fallback viewer`

---

### Phase 9 — QA, docs, cleanup

**Files to create/modify:**
- `SUPERADMIN_GUIDE.md`
- `docs/api-spec.md`
- `docs/database-schema.sql`
- `README.md` (if needed)
- All three `package.json` (confirm versions)

**Tasks:**
1. Build all three apps successfully.
2. Manual cross-role verification:
   - Admin: feature/pin/edit/delete/archive.
   - Superadmin: same + audit/user drawers.
   - User: view-only, featured block, pinned sorting, no controls.
3. Responsive checks (sidebar widths, mobile stacking).
4. Remove old `IncidentDetailPanel`, `IncidentDetailView`, `SourceItem`, and unused DesignTrial files from production routes (keep them until verified).
5. Update documentation.
6. Final Playwright screenshots or manual capture.

**Commit message suggestion:**
`docs(qa): finalize incident detail integration, update docs, remove legacy panels`

---

## 7. Risk register & mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Per-update migration breaks existing sources/media display | High | Backfill to initial report; keep old flat endpoints unused during transition; verify counts. |
| react-router v7 upgrade breaks existing admin/superadmin routes | Medium | Upgrade in isolated phase; run builds before shared refactor. |
| Shared CSS conflicts with existing app styles | Medium | Scope CSS with `.gw-incident-*` prefixes; import only in components that need it. |
| Backend nested response shape breaks existing `IncidentDetailPanel` | Medium | Replace frontend panel in same phase; do not run old panel against new shape. |
| X snapshot upload requires media + source PATCH in two steps | Low | Frontend orchestrates both calls; show loading state. |
| Large shared refactor loses context | Medium | Move files incrementally; keep git history; build after each move. |

---

## 8. Definition of done

- All three apps build without errors.
- `/map` sidebars and new `/incident/:id` pages render the same layout as the trial routes.
- Admin and superadmin can feature, pin, edit, delete, and archive evidence.
- User sees featured/pinned evidence, but cannot mutate.
- X posts with `archived=true` show the uploaded screenshot fallback.
- Media captions are editable and displayed.
- Hero image is settable per incident.
- Backend returns correct nested data for public and authenticated users.
- Audit logs record all curation actions.
- Legacy detail panels are removed.

---

## 9. How we will work

1. I will implement one phase at a time, in order, only after you explicitly say “start Phase N”.
2. After each phase I will:
   - Append a detailed summary of what was done to `commit.md`.
   - Reply here in the chat with a single-line commit message for you to push to GitHub.
3. You review the phase, then tell me the next phase to start.

**I am ready. Tell me which phase to start first.**
