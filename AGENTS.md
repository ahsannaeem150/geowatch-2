# IntelMap24 — Agent Guide

> Read before changing the repository. Architecture, commands, conventions, and non-obvious implementation rules for AI coding agents. Verified against source on 2026-11-03.

## 1. Project Overview

**IntelMap24** (formerly GeoWatch) visualizes global conflicts and major events on a map, combining a tactical intelligence dashboard with a newsroom interface.

Five applications:

- **user-web** (`:5173`) — public home, `/map`, incident/zone directories and details, About, 404; read access plus Google sign-in/bookmarks.
- **admin-web** (`:5174`) — staff incident/zone curation, timelines, sources, media, map-first workspace, directories.
- **superadmin-web** (`:5175`) — staff/public users, audit/activity, taxonomy, recycle bin, system health, export, X-archive debug, Theme Lab, map workspace/directories.
- **backend** (`:3100`) — Express REST API: JWT, PostGIS, SSE, audit logs, staff notifications, geocoding, uploads.
- **mobile-app** — standalone bare React Native Android app: one map screen with overlays, sheets, search, directories, evidence, public Google sign-in.

The root npm workspaces contain backend + three web apps. Mobile is deliberately **not a workspace**, avoiding Metro hoisting conflicts. PostgreSQL 16 + PostGIS 3 stores data; self-hosted Martin serves a local `.mbtiles`; map styles and Noto Sans glyphs live in `assets/`.

## 2. Stack and Configuration

| Layer | Technology |
|---|---|
| Web | React 18.3, Vite 5, React Router DOM 7, plain CSS |
| Web maps | MapLibre GL JS 4.5 |
| Backend | Node.js >= 20, Express 4, native ESM |
| Database | PostgreSQL 16, PostGIS 3, `pg` |
| Real-time / tiles | SSE; Martin v1.8.2 binary in `tools/` |
| Auth | JWT (`jsonwebtoken`), `bcryptjs`, public Google OAuth |
| Validation | Zod 3 backend; Zod 4 mobile |
| Media / storage | Multer, Sharp (WebP + thumbnails), ffmpeg video posters; local-disk storage factory (R2 planned, not implemented) |
| Mobile | React 19.2.3, React Native 0.87.1, MapLibre RN 11, React Navigation 7 |
| Mobile gestures | Gesture Handler 3, Reanimated 4, Worklets |

Key configuration:

- Root/package manifests and lockfile: workspaces, engines, dependencies, scripts. Mobile has its own manifest, requires Node >= 22.11, and runs `patch-package` after install.
- `src/*/vite.config.js` — React, `@shared` alias, `copyMapAssetsPlugin`.
- `src/backend/server.js` — composition root/mount order; `src/backend/src/config/env.js` — env loading.
- `docs/database-schema.sql` — base schema; `docs/migrations/` — incremental changes.
- Mobile: `babel.config.js` includes `react-native-worklets/plugin`; standalone `metro.config.js` does not watch `src/shared`; Android Gradle files configure SDK, Hermes/new architecture, signing, MapLibre native variant.

Web/backend use ESM and explicit `.js`/`.jsx` local-import extensions. Mobile Babel/Metro config uses CommonJS; mobile source commonly uses extensionless RN imports.

All three web apps render MapLibre, but superadmin-web resolves `maplibre-gl` through hoisting; admin-web similarly imports undeclared `lucide-react`, and Lucide versions differ across apps. Check the relevant manifest/lockfile before dependency changes; hoisting does not make a dependency declared or safe to assume.

## 3. Repository and Modules

```text
src/
├── backend/
│   ├── server.js
│   └── src/{config,routes,controllers,services,validators,middleware,storage,utils}/
├── user-web/                 # public React app
├── admin-web/                # staff React app
├── superadmin-web/           # super-admin React app
├── shared/                   # web tokens, constants, components, hooks, utilities
└── mobile-app/               # standalone bare RN Android app
assets/                       # map styles/fonts; gitignored .mbtiles
docs/                         # API/schema/design/env docs and migrations
scripts/                      # launchers, backfills, Playwright utilities
uploads/, tools/              # generated media/downloaded binaries; gitignored
logo/, seeds.sql              # brand artwork; development seed data
PROJECT.md, commit.md         # architecture/history; detailed build history
```

Backend flow is routes → controllers → services, with Zod validators/middleware. Config handles DB/env; services own business logic/SQL; storage contains local engine + factory; utils cover audit, SSE, media, oEmbed/X, slugs, URLs. Features include incidents, timelines, sources/public sources, source accounts and X ingestion/snapshots/availability, media, categories, zone categories, staff/public users, auth, audit, system, stats, geocoding, saved incidents, staff saved/recents/activity, notifications, X-archive debug. There is no separate zone service/table.

### Shared web code (`src/shared/`)

Vite maps `@shared` here in every web app:

- `design-tokens.css` — dark-first/light tokens, typography, focus, reduced motion; `constants.js` — domain/API constants.
- `theme-context.jsx`, `useTheme.js`, `useStyle.js` — dark/light and `tactical`/`saas` persisted in localStorage.
- `components/` — controls, map UI, media, drawers, zone overlays, command palette; `incident-detail/` and `zone/` contain shared role-aware detail/editor packages. `Skeleton.jsx`/`LoadingStates.jsx` provide token-based transform shimmer, result/table/activity skeletons and map/inline status; `DetailSkeletons.jsx` mirrors incident/zone sidebar and full-page structures. `AsyncStates.jsx` owns modern panel/inline errors and stale-data banners with scoped retry. `LoadingImage.jsx` reserves media space until load/error. Keep empty/error UI out of initial loading, preserve stale results on refresh, and do not show artificial list shimmer for SSE-only Live Activity—use connection/empty states instead.
- `marker-builder.js`, `marker-icons.js` — web markers; mobile generation reads icon paths.
- `hooks/` — taxonomy, long-press, context menu, reduced motion; `utils/` — zone geometry, theme/CSS colors, selection camera, return-view, Theme Lab preview.
- `media-components.css`, `styles/incident-detail.css`, `styles/table-chips.css` — imported by every web `main.jsx`.

`BrandHomeLink` is user-web local; staff apps have their own `BrandLogo`.

## 4. Setup, Build, and Development

Run web/backend commands from repo root. Prerequisites: Node >= 20/npm >= 10 (mobile Node >= 22.11), PostgreSQL 16 + PostGIS 3, `assets/tiles/tiles.mbtiles`; mobile also needs Android SDK `~/Android/Sdk`, JDK `~/jdk`, adb, emulator/device.

```bash
npm install
npm run setup:martin       # Martin v1.8.2 → tools/martin
sudo -u postgres psql -f docs/database-schema.sql
sudo -u postgres psql -d intelmap24_dev -f seeds.sql
cp src/backend/.env.example src/backend/.env.development
# Edit DB credentials, JWT_SECRET, URLs, storage settings.
```

For existing databases, inspect/apply relevant migrations in `docs/migrations/` (through `012_admin_workspace_support.sql` plus older named ones); do not blindly rerun base/destructive setup. Production loads `.env.production`; every other `NODE_ENV` loads `.env.development`. Web uses `VITE_API_URL`/`VITE_MARTIN_URL`; only `VITE_` variables reach browsers. Local fallbacks are in `src/shared/constants.js`; verify `docs/env-template.md` examples against source.

```bash
# All services; logs/PIDs → logs/
./scripts/start-intelmap24.sh [--no-browser]
# Selected services
./scripts/start-intelmap24.sh martin backend admin-web user-web superadmin-web --no-browser
./scripts/stop-intelmap24.sh [service]
./scripts/status-intelmap24.sh
./scripts/logs-intelmap24.sh [service]

# Manual equivalents
./scripts/start-martin.sh
npm run dev:backend        # nodemon :3100
npm run dev:user-web       # Vite :5173
npm run dev:admin-web      # Vite :5174
npm run dev:superadmin-web # Vite :5175

# Production builds → each app's dist/
npm run build:user-web
npm run build:admin-web
npm run build:superadmin-web
```

`copyMapAssetsPlugin` copies root styles/glyphs into each app's `public/` at build start. Backend has no build step; production runs `node server.js` or `npm start -w src/backend`.

## 5. Runtime, URLs, and Routes

| Service | Development URL | Access |
|---|---|---|
| User web | http://localhost:5173 | Public + optional public auth |
| Admin web | http://localhost:5174 | Staff login |
| Superadmin web | http://localhost:5175 | `super_admin` only |
| Backend | http://localhost:3100/api/v1 | Role-dependent |
| Martin | http://localhost:8080 | Direct to map clients |

Only backend talks to PostgreSQL. Clients use backend HTTP/SSE and Martin tiles directly. Backend also serves `/uploads` and `/fonts`, so mobile needs no web frontend for media/glyphs.

Roles: `super_admin` has full user/system management and incident delete/restore/purge; `admin` curates incidents/timelines/sources/media/zones but cannot manage staff; `public_user` is Google-authenticated, read-only + bookmarks. Staff (`users`) and public (`public_users`) identities are separate; auth resolves staff first.

Main routes:

- **user-web**: `/`, `/map`, `/incidents`, `/zones`, `/incident/:id`, `/zone/:id`, `/about`, catch-all 404; lazy `/trial/zone*`.
- **admin-web**: `/login`, protected map-first `/*`, `/incidents`, `/zones`, `/incident/:id`, `/zone/:id`, legacy trials; `/search` is inside dashboard layout.
- **superadmin-web**: `/login`, protected `/superadmin/*` for dashboard, users, public-users, map, incidents, zones, audit, public-activity, domains, zone-categories, system, export, theme-lab, recycle-bin, x-archive-debug, incident/zone details.

Each app's `src/App.jsx` is authoritative; `trialRoutes.md` and older route summaries may be stale.

## 6. API and Database

### API

- Base `/api/v1`; envelope `{ "success": true, "data": {}, "message": null, "error": null }` (failures set corresponding fields).
- Auth: `Authorization: Bearer <jwt>`; SSE: `/api/v1/incidents/stream?token=<jwt>` because `EventSource` cannot set headers.
- Validate body/query/params with Zod + `validateRequest(schema, location)`; wrap async handlers in `asyncHandler`; use `res.apiSuccess()`/`res.apiError()` and centralized errors.
- Nested media/timeline/source routers need `Router({ mergeParams: true })` so `req.params.id` survives.

Critical `server.js` mount order:

1. JSON parsing + response wrapper.
2. Authenticated SSE stream, before general limiter and before `incidentRoutes` treats `stream` as `/:id`.
3. Public `/api/v1/taxonomy/stream`, static `/uploads` and `/fonts`, before general limiter.
4. `generalLimiter`.
5. API routers, 404, error handler last.

API groups: health, staff/public auth/users, audit, system, categories, incidents/saved incidents, timeline, public/staff sources, media, media proxy, zone categories, geocode, stats, notifications, staff recents/activity, X-archive debug. Public `GET /media-proxy/video?url=` streams only HTTPS `video.twimg.com` URLs without forwarding browser Origin, preserves byte ranges for seeking, rejects redirects/other hosts, and applies the general rate limit; shared web X cards route Twitter playback through it, while uploaded MP4 metadata supplies thumbnails plus `type`/`videoUrl` to the shared lightbox.

Taxonomy lifecycle: public domain/category reads are active-only and `no-store`; `/all` variants are superadmin management views including archived records. Used slugs are locked—rename labels/colors/icons rather than changing identifiers. Archive/restore hides taxonomy from new selections without touching historical incident joins. Category/domain merges run in DB transactions with active-target validation and slug-conflict rollback, then audit and emit `taxonomy_updated` over the public taxonomy stream. `src/shared/services/taxonomy-events.js` and mobile `services/taxonomy-events.js` refresh filters on all four apps; never rely on cached taxonomy after CRUD.

### Geometry and schema

Points and polygon zones share `incidents`: `geometry_type` is `'point'`/`'polygon'`; `geom` is `GEOMETRY(Geometry, 4326)`; polygons use `zone_category_id` → `zone_categories`, with PostGIS area/perimeter. Zones also have severity and share filters/search.

Base tables: `users`, `public_users`, `domains`, `categories`, `incidents`, `source_accounts`, `incident_sources`, `incident_updates`, `incident_media`, `zone_categories`, `user_saved_incidents`, `audit_logs`, `deleted_incidents_log`. Migration 012 adds `staff_saved_incidents`, `staff_recents`, `notifications`.

- Tables plural snake_case; columns snake_case. Most PKs UUID v4 (`gen_random_uuid()`); taxonomy SERIAL; `audit_logs` BIGSERIAL.
- UTC `TIMESTAMP WITH TIME ZONE`; format locally in clients. JSONB for flexible metadata; parameterized `pg` values always.
- DECIMAL `latitude`/`longitude` arrive as strings: `parseFloat()` before arithmetic/`.toFixed()`.
- Manual verification: `unverified` (default), `verified`, `disputed`, `debunked`; no automatic per-source cascade.

## 7. Code Style and Frontend Rules

- Backend/service files kebab-case; React components PascalCase `.jsx`; variables/functions camelCase; constants UPPER_SNAKE_CASE.
- Keep business logic/SQL in services. Audit significant create/update/delete via `utils/audit-log.js` and `utils/audit-actions.js`.
- Minimal, file-consistent changes; no unrelated refactors or unapproved dependencies.
- Plain React + CSS and `@shared`; no configured external UI library. Use design tokens, not hardcoded production colors.
- Brand/severity/verification colors come from `design-tokens.css` (`--accent*`, `--sev-*`, `--ver-*`). Final turquoise: `--accent: #0e4f4a`, `--accent-light: #14b8a6`; rebrand only marked `/* === BRAND ACCENT === */` blocks.
- Inline JS may use `'var(--sev-N)'`; canvas/hex math resolves tokens through `utils/cssVar.js`/`themeColors.js`. superadmin-web also owns `src/styles/tokens.css` and `--sa-accent*`.
- Interface styles: `tactical` default and `saas`, via `data-style`. Theme Lab: `/superadmin/theme-lab`; `shared/utils/themePreview.js` handles `?tokens=` before first paint in every web `main.jsx`.
- Honor OS reduced motion, `.reduce-motion`, and per-app settings; guard animation with `useReducedMotion`. Production labels >= 10px; `.font-longform` (Inter) for prose.
- Scope-prefix trial CSS and lazy-load new trials with `React.lazy`/`Suspense`; user-web zone trials follow this, some legacy admin trials remain eager.
- Brand assets live in each `public/brand/`; recolor SVG internal variables, never artwork geometry. Artwork changes require favicon rasterizer scripts and `index.html` cache-bust updates.

## 8. Map and Data-Loading Rules

These prevent previously fixed bugs:

- MapLibre positions marker parents with `translate3d`; effects belong on children—never override parent transforms.
- Separate marker creation/removal/positioning effects from selection styling; do not rebuild markers for selection.
- Bind zone hover/click once per map and read current zones through a ref; rebinding per zone set causes stale closures.
- Initial smart loading fetches without viewport; totals > 100 enable viewport-bounded fetching on pan/zoom.
- Ranges > 31 days or All time withhold points below zoom 6 but still load polygons. At zoom >= 6, point requests become viewport-bounded.
- Never send null date endpoints: unbounded means `1970-01-01`/`2099-12-31`; omitted dates mean “visible today.”
- Point-only list queries require `geometryType: 'point'`, or polygons arrive through both point and zone paths.
- Active incidents remain visible until `end_date`; resolved incidents get one-day grace.
- Drawer lists combine points/visible zones, newest first, respect Layers toggles, and use the real selected incident ID for highlighting.
- Keep domain/category-slug SQL filters polygon-safe; incident-only conditions applied to zones make zone search results disappear.

## 9. Mobile App (`src/mobile-app/`)

### Architecture and native build

One root `MapScreen` plus custom LIFO overlays:

- `OverlayContext`/`OverlayHost` manage sheets, fullscreens, left drawers, top panels, modals, backdrop, Android Back. Contexts divide theme, auth, map/fetch/camera, selection/navigation, live activity.
- `src/theme/tokens.js` and `src/constants.js` manually mirror web values; Metro does not import `src/shared`.
- `AuthContext`: Google sign-in → `/auth/public/google`; JWT in `react-native-keychain`.
- Hermes/new architecture enabled; minSdk 24, compileSdk 37, targetSdk 36.

Map/networking:

- `@maplibre/maplibre-react-native` renders bundled `assets/map/` styles; `mapStyles.js` rewrites host to `DEV_HOST` at load.
- Physical devices use `androidView="surface"` + default OpenGL. Gradle Vulkan override + `"texture"` are emulator-only SwiftShader workarounds.
- `suppressUnusedFrameEvents` is enabled by `patches/` via `patch-package`/`postinstall`; it preserves `onRegionDidChange`. Do not suppress callbacks new code consumes.
- `scripts/generate-mobile-markers.mjs` generates domain PNG markers from shared icon paths/mobile colors; rerun after artwork/color changes.
- Web zoom-6 gating, viewport bounds, explicit geometry type, ghost selection rules still apply.
- Physical: `DEV_HOST = '127.0.0.1'` + `adb reverse` ports 3100, 8080, 8081. Emulator: `DEV_HOST = '10.0.2.2'`.
- `services/api.js` unwraps envelopes and rewrites local media hosts. SSE uses `react-native-sse` + `?token=`; signed-out clients use client-side list-diff alerts, not staff-only backend notifications.

Launch and first run:

- `LaunchScreen` owns the cinematic GlassGhost → IntelMap24 reveal: 1.6s only when onboarding is pending, 0.6s on returning cold starts, static under reduced motion. `OnboardingContext` persists completion in `STORAGE_KEYS.ONBOARDING_COMPLETE`; Help & Feedback replays the four-page tour without replaying the cinematic. Temporary design-review flag `FORCE_ONBOARDING_EVERY_LAUNCH` currently forces the tour on every cold start without clearing stored completion; set it false before release.
- AndroidX SplashScreen covers native startup until React signals readiness (5s safety timeout). `LaunchPreferencesModule` syncs the selected app theme into native shared preferences so the native frame follows dark/light; app-default dark is the no-preference fallback. Map/data providers mount after launch/onboarding, not behind them.
- Onboarding uses lightweight static map/evidence assets, SVG brand components and Reanimated transforms/opacity only—no MapLibre/video/WebGL. Both Pakistan map assets are 2016×1920 lossless WebP renders (3× source density) with identical established camera/crop composition; preserve their aspect ratio and do not replace them with low-resolution upscales, so native labels stay sharp without moving the SVG zones or marker overlays. Pager dots use `scaleX`, never animated width/layout; preserve this pattern for 120Hz. Horizontal pages use `onScrollEndDrag` + the shared `goTo` scrollTo path (not native `pagingEnabled`): an 18% drag or a short flick above 0.35dp/ms with 12dp travel commits one page, preserving both buttons and reduced motion. Map artwork uses expanded Pakistan/Afghanistan static crops, Afghanistan-interior border markers plus a separate Pakistan marker, and number-free `GLOBAL COVERAGE` on a 97%-opaque glass footer. `NeonZone` supplies the web-style radial-gradient fill and outer-glow border to the Pakistan NOTAM and fourth-page `TemporalZoneScene`; native SVG filter primitives made polygons invisible, so keep the supported outer-stroke glow. All four scenes share a responsive outer height: roughly 50% up to 470dp on large screens and a compact 200–260dp below an 800dp viewport. Evidence media and the Search result flex to fill it, with bottom-padded result metadata on large screens and compact two-card layouts on small screens. The fourth page uses `flex:1` for its enlarged map with large active/upcoming zones; expired history remains described in copy rather than a separate row. Its east/south Pakistan active zone uses actual NOTAM red `#e01b24`; the compact `GhostZone` uses NOTMAR cyan `#0ea5e9` farther left along Karachi's coastal waters. Onboarding metadata uses a balanced 9.5–10px type scale—readable without oversized labels; avoid both tiny 7–9px text and unnecessarily large metadata. `NeonZone` uses a 1dp inner border with a lighter 3dp glow; ghost borders are 1.25dp. External glass `ACTIVE`/`UPCOMING` pills use bent leader paths attached to zones in label-free gaps—never text inside zones or overlapping map labels. The first-screen NOTAM badge uses the same red on 97%-opaque glass. Countdowns and UTC periods are representative static content—no per-second JS timers. Evidence uses a taller two-image grid with bottom-padded source row; Search uses two attributed Kabul airstrike/explosion examples dated 09 and 15 October 2025 with bookmark affordances and a compact bottom-centered `Bookmark incidents to revisit them later` helper with roughly 12dp separation from both the result list and card border; large result cards use 108dp minimum height and 12dp vertical padding so their footers remain comfortable and unclipped. Dark launch/grid lines use higher opacity than light.

Navigation and appearance:

- Bookmarks, History, Settings, Notification Preferences and Default Map Layers are full-screen destinations with `NavigationHeader`; bottom sheets are reserved for contextual auth/map/incident/evidence flows. Selection Behavior is no longer user-configurable in Settings—keep the existing default selection state machine rather than reintroducing mode cards. Saved lists share `ProfilePanelBody`'s pattern. Profile/sidebar consolidate preferences under Settings; Help/About remain contextual sheets. `ProfileDrawer.go` marks destinations `restoreProfileDrawer`; `closeOverlay` reopens the origin drawer for both hardware and arrow Back, while nested filters/subsections handle their own Back first and TabBar `closeAll` does not force a drawer return.
- History and Bookmarks share `SavedItemRow`/`SavedEntries` in `profileShared`: neutral `bgElevated`/`borderSubtle` cards with a 5% accent corner glow, title, actual domain/zone category + severity, location and compact time, using type icons rather than a generic thumbnail. Both use viewport-driven Reanimated side/opacity reveals with 70ms stagger capped at 350ms; offscreen rows reveal near the viewport and revealed IDs never replay on reverse scroll. `SheetScrollView` handoff and bottom insets stay unchanged; reduced-motion shows all rows immediately. Do not apply this glow to unrelated lists.
- `ThemeContext.themePreference` supports `system`/`dark`/`light` via `useColorScheme`; native launch stores the resolved mode. Settings → Appearance is the only theme editor. TabBar is a full-width opaque sticky bar with a strong accent active-tab background, sentence-case labels and a List incidents icon; keep its 58dp total inset, 2dp extra system-nav gap and visible bottom divider. Profile drawer stays mounted offscreen in `OverlayHost` and open/close only retargets a hardware-cached Reanimated translation—do not remount it per entry (remounts dropped drawer FPS to ~60; retained entry measured ~109–111fps).

### Mobile commands

Mobile-only work needs backend + Martin, not web frontends.

```bash
# USB: rerun after every replug
./scripts/start-mobile-intelmap24.sh connect
# Wireless adb; optional pairing arguments
./scripts/start-mobile-intelmap24.sh connect-wireless <ip:port> [pair-ip:port pair-code]
./scripts/start-mobile-intelmap24.sh services  # backend + Martin
./scripts/start-mobile-intelmap24.sh metro     # foreground :8081
./scripts/start-mobile-intelmap24.sh logs
./scripts/start-mobile-intelmap24.sh build     # debug APK → phone Download
./scripts/start-mobile-intelmap24.sh all       # connect + services
./scripts/stop-mobile-intelmap24.sh metro|services|connect|all
./scripts/stop-all-intelmap24.sh               # mobile + all web services

cd src/mobile-app
npm install
npm run lint

# Emulator native install
cd android
JAVA_HOME="$HOME/jdk" ./gradlew installDebug \
  -Porg.maplibre.reactnative.nativeVariant=vulkan
```

Physical build pushes APK to Download because documented MIUI blocks adb install. Release needs committed localhost-only `network_security_config.xml`, or RN release cleartext policy blocks local API/tiles. Gradle release signing currently uses debug keystore; replace before distribution.

### Bottom-sheet invariants

Map PeekSheet and Power Search ResultsSheet share `DetentSheet`/`DetentScrollView` over Reanimated/Worklets; other overlay sheets use legacy `useSheetGesture`. These device-verified constraints are mandatory:

- Legacy handoff pans must declare `.runOnJS(true)`. Reanimated changes require Worklets Babel plugin + native rebuild.
- Sheet transforms and detail/list bottom padding share one Reanimated UI-thread position stream; no JS listeners or mirrored springs.
- Apply `blocksExternalGesture(scrollRefs)` only while its handoff pan is enabled; re-resolve refs on the next frame after pane/item identity changes, not every scroll-edge flip (which can cancel card presses). Disabled pans retaining relations can deadlock native scrolling.
- Capture gesture-start position before JS motion callbacks; defer completion commits until spring completion to avoid stalls/jumps.
- `useScrollEdge.reset()` resets edge flags but preserves dimensions. Non-scrollable panes are at top (`maxY = 0`). Settle events accompany `onScroll` because Fabric can coalesce the final frame.
- Re-pin stale offsets only during owned momentum flings with native `scrollToEnd`; Android owns normal pad-shrink clamping, with one exact motion-end correction.
- Hardware texture promotion is motion-driven. Heavy Evidence stays direct-composited; judge performance on release, not dev.
- Dismissed map pill sheets/Evidence may stay mounted to preserve media/X trees and native scroll. Detail/evidence offsets reset on item/update identity changes, not same-item pill restoration.
- Evidence title/tabs share one scrollable padded layout at every detent; never reparent on detent changes.
- Evidence uses mapped rows through `EvidenceScrollView`, not `HandoffFlatList`; dedupe X-post requests; mount gallery modals only while open. Evidence is strictly update-specific: empty Initial Report sections stay empty and must never borrow later updates' media, X posts, articles or notes.
- Evidence media order is Featured → Pinned → remaining (`featured_item.item_id`). Odd totals use one full-width hero + two-column pairs; even totals use pairs. All media stays visible (no `+N`), with 12-item batches appended only on scroll-end—no per-frame JS pagination or nested list. Mixed videos use poster + play/duration, with missing/failed-thumbnail fallbacks. `scripts/backfill-video-thumbnails.mjs` repairs legacy null posters; backend media list/detail order is pinned, display order, then `created_at ASC`.
- Evidence expansion/collapse uses progressive UI-thread reveal/scroll anchoring; never translate outer pane/clip or reintroduce hold-then-reset compensation.
- `OverlayHost` solely owns persistent opaque TabBar. Shared bottom chrome is 58dp + system inset, applied exactly once per surface. Scrollable content keeps a 10dp visible end-gap above that chrome, matching Evidence; do not add legacy 28dp body tails or remove the final gap. Every vertical plain `ScrollView` uses `overScrollMode="never"`. `SheetScrollView` disables scrolling only inside `SheetContainer`'s handoff context; standalone/fullscreen instances stay scroll-enabled.
- Power Search suppression follows the topmost fullscreen owner via `utils/overlayStack.js`; never use `stack.some()`. Directory/Activity/Alerts fullscreens may sit above retained Power Search, while its sheets/modals must not clear ownership. When Power Search is topmost, other retained fullscreens are hidden so its transparent container shows only the live map. Tab switches preserve background state but dismiss transient UI: Map selections minimize to pills, embedded previews close to origin, and Power Search resets to its open results list on non-owner tabs (detail/evidence closed; query/results retained).
- Sheet entry waits for selection camera idle and initial layout/presented frames. Map, Power Search and embedded previews share a 54/46 map-sheet split and 22dp top corners. Embedded list previews skip the hidden main-map flight and share one live `previewPos` Reanimated stream for gesture/spring map+sheet sync (never independent timers or render-time `pos === 0` resets); the map unmounts only at hidden completion. “View on map” flies then. Their final Evidence dismiss closes sheet + embedded map and restores origin—never a pill. Normal map/Power Search still wait for camera idle and keep their pill. Selection flights use direct native `easeTo`; heavy timeline content defers until camera idle. `App.jsx` supplies real initial safe-area metrics. `EmbeddedMapPanel` permits the `idle` close animation but suppresses non-idle/non-preview renders, preventing a retained mount from dropping over a later normal map selection after History swipe-down + hardware Back.
- Shared `DirCard` (Power Search + incident/zone directories) uses History-style `bgElevated`, 1dp border, 12dp radius/margins and 8dp separation; content/accent/selection tint stay intact and final list padding compensates the added margin. Power Search text fetches only on the bar icon or keyboard submit (same-query submit refreshes; Clear restores defaults), dismissing the keyboard; filters and initial results still auto-fetch—no per-keystroke debounce requests. Directory applied tags/counts must include Active/Resolved status, severity, only the actually selected verification states, domains and zone categories; verification defaults to an empty Set (no filter and no verification API param), reset/deselection returns to that unfiltered state, and tag removal restores each filter's default within the existing live results/count flow. Directory and Power Search badges/counts use actual selected option counts—four verification states = 4, and domain/zone categories count individually rather than as one group.

- `components/skeleton/Skeleton.jsx` owns shared Reanimated shimmer groups and `SkeletonImage` media placeholders. Use one UI-thread driver per visible group, never JS timers/layout animation; reduced motion is static and loaders must not alter sheet gestures/detents.

Current gaps: placeholder `GOOGLE_WEB_CLIENT_ID` requires matching Google Cloud/Android/backend OAuth before signed-in E2E; incident “Full details” still shows a later-prompt toast; videos retain original encoding.

## 10. Testing and Verification

**No automated unit/integration suite or CI exists.** Backend Playwright powers ad-hoc `scripts/`, not a standard runner.

- Ordinary web changes: run affected production builds; shared changes: build every affected web app.
- Use Playwright verification/screenshots only for major behavioral changes or on request; requires running services and may use gitignored `docs/dev-credentials.md`. Do not repeatedly read screenshots unless investigating a visible problem; owner normally reviews.
- Repeated automated logins can trigger auth rate limits; reuse valid tokens or allow cooldown.
- Detail-skeleton changes must compare real vs loading DOM measurements at the same incident/zone and viewport. Preserve actual classes, timeline spines, scroll containers and representative dimensions; avoid redundant refresh spinners and label-width shifts.
- Dev-only network-state review: open any web app with `?network=delay` for 5-second API/media shimmer, `?network=error` for a simulated 503 after 1.5 seconds, or `?network=detail-error` to keep lists/search live while only incident/zone detail GETs fail. Use `?network=off` to restore normal requests. The mode persists in tab `sessionStorage` across routes; auth requests stay live, error modes block matching API calls before fetch, and production builds always disable simulation (`shared/utils/networkSimulation.js`).
- Mobile: `npm run lint` in `src/mobile-app`, relevant Metro/native build, and release-device verification for gesture/map performance. Android map performance must account for MapLibre's separate SurfaceView as well as app-view frames.

```bash
npm run build:user-web && npm run build:admin-web && npm run build:superadmin-web
./scripts/stop-intelmap24.sh && ./scripts/start-intelmap24.sh --no-browser
./scripts/status-intelmap24.sh
./scripts/logs-intelmap24.sh <service>
```

After features/fixes, append a terse 2–3 line `commit.md` entry, update routes/docs when behavior changes, and provide a conventional-commit message (`feat:`, `fix:`, `style:`, `chore:`, etc.).

## 11. Security

- Never commit `.env`, `docs/dev-credentials.md`, uploads, screenshots, `.mbtiles`, or downloaded binaries; only example env values belong in Git.
- Use strong unique `JWT_SECRET` (>= 32 chars dev, >= 64 prod) and DB password. JWT expiry defaults `7d`; bcrypt rounds 12.
- `requireRole(...)` follows `authenticate`. Deactivated accounts get 403; optional auth deliberately ignores invalid/expired tokens.
- Defaults: general 300 requests/min/IP; auth 10/15 min/IP; admin writes 50/15 min/user. SSE/static mount before general limiter.
- CORS uses configured frontend URLs + preview ports 4173–4175. Development accepts any origin; production must restrict it. Credentialed CORS and origin-less server/curl requests are enabled.
- Zod-validate API input and parameterize SQL; never concatenate user input.
- Multer holds uploads in memory. Images become WebP + thumbnails; videos retain bytes and get best-effort ffmpeg posters.
- Storage implements only `local`; do not set `STORAGE_PROVIDER=r2` until an R2 engine exists behind `storage/index.js`.
- Production: firewall PostgreSQL, HTTPS, rotate dev credentials, real OAuth origins/client IDs, restricted CORS, replace Android debug release signing.

## 12. Deployment and Limitations

No CI/CD, Docker, or automated deployment. Local services use shell launchers and `logs/`.

Documented production plan, not implemented deployment: backend/PostgreSQL/Martin on Oracle Cloud Free Tier; static web apps on Vercel free tier; Cloudflare R2 behind storage factory after `r2.storage.js` exists; free tiers/no per-request paid APIs for MVP.

Other current/post-MVP gaps: no clustering/heatmap, video transcoding, push/webhook notifications; mobile gaps above. Older `readme.md`/`PROJECT.md` may describe Android as future, a separate `zones` table, or old crimson branding; current source, schema, and this guide take precedence.

## 13. Files to Read Before a Change

1. `AGENTS.md` — architecture/current rules.
2. `PROJECT.md` — requirements/historical context.
3. `commit.md` — implementation history and prior bug causes.
4. `docs/design-brief.md` — UI direction for frontend work.
5. `docs/api-spec.md` + relevant route/service — API work; source is authoritative if they differ.
6. `docs/database-schema.sql` + relevant migrations — database work.
7. Target app's `src/App.jsx` and manifest — routes and available dependencies.
