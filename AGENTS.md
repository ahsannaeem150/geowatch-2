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

Backend flows routes → controllers → services, with Zod/middleware, service-owned SQL, local storage factory, and audit/SSE/media/X utilities. Modules cover incidents/zones/timelines/sources/media, taxonomy, staff/public identities, saved/recents/activity, notifications, system/stats/geocode and X archives. Zones have no separate service/table.

### Shared web code (`src/shared/`)

Vite maps `@shared` here in every web app:

- `design-tokens.css` — dark/light tokens, typography, focus, reduced motion; `constants.js` — domain/API constants.
- `theme-context.jsx`, `useTheme.js`, `useStyle.js` — dark/light and `tactical`/`saas` persisted in localStorage.
- `components/` includes shared controls, map/media UI, palette and detail/zone packages. `Skeleton.jsx`/`LoadingStates.jsx` supply shimmers/status; `XPostSkeleton` mirrors live X cards everywhere. `DetailSkeletons.jsx` keeps full-page skeletons but progressive sidebars show an available incident's actual summary immediately while timeline/evidence shimmers. `AsyncStates.jsx` supplies errors; `LoadingImage.jsx` reserves media space. `utils/recovery.js` runs all mounted Retry handlers on one Retry or browser `online`; `retryScope="local"` excludes mutations. Keep empty UI out of initial loading, preserve stale results, and never fake SSE activity shimmer (API backfill may shimmer).
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

- Map error strips use `bg-glass`, primary text, blur and shadow; Power Search offset is topbar + chips + 12px in all three web maps.
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
- Web zoom-6 gating, viewport bounds, explicit geometry type, ghost selection rules still apply. `utils/mapZoomPolicy.js` mirrors web exactly: center inside `[26.3125, 5.7626, 104.1831, 41.5531]` allows z22, outside caps z10. Main/embedded region handlers clamp over-zoom; buttons and programmatic flights use the target center's cap and update React state only when crossing the boundary.
- Physical: `DEV_HOST = '127.0.0.1'` + `adb reverse` ports 3100, 8080, 8081. Emulator: `DEV_HOST = '10.0.2.2'`.
- `services/api.js` unwraps envelopes and rewrites local media hosts. SSE uses `react-native-sse` + `?token=`; signed-out clients use client-side list-diff alerts, not staff-only backend notifications.

Launch and first run:

- `LaunchScreen` runs the GlassGhost → IntelMap24 reveal for 1.6s before pending onboarding and 0.6s on returning cold starts; reduced motion is static. `OnboardingContext` persists completion in `STORAGE_KEYS.ONBOARDING_COMPLETE`; Help replays the four-page tour without the cinematic. Temporary `FORCE_ONBOARDING_EVERY_LAUNCH` forces the tour on cold starts without clearing completion—set false before distribution.
- AndroidX SplashScreen covers native startup until React readiness (5s timeout). `LaunchPreferencesModule` syncs resolved dark/light theme to native preferences (dark fallback). Map/data providers mount only after launch/onboarding.
- Onboarding uses static map/evidence assets, SVG branding and Reanimated transform/opacity only—no MapLibre/video/WebGL or per-second countdown timers. Both Pakistan maps are 2016×1920 lossless WebP at 3× density; preserve their established camera/crop, aspect ratio and overlay positions. Pager dots animate `scaleX`, never layout. Pager uses `onScrollEndDrag` + shared `goTo` (not `pagingEnabled`): 18% drag or a 12dp flick above 0.35dp/ms commits one page; buttons/reduced motion remain intact.
- Map scenes keep the Pakistan/Afghanistan crops, Afghanistan-interior border markers plus separate Pakistan marker, and number-free `GLOBAL COVERAGE` on 97%-opaque glass. `NeonZone` uses radial fill + supported outer-stroke glow (native SVG filters made polygons invisible): 1dp inner/3dp lighter glow, 1.25dp ghost border. Fourth-page active NOTAM stays inside east/south Pakistan in `#e01b24`; compact upcoming NOTMAR `GhostZone` stays farther left along Karachi coastal water in `#0ea5e9`. Glass `ACTIVE`/`UPCOMING` pills use bent leaders in label-free gaps, never zone-internal text or label overlaps; first-screen NOTAM badge is red on 97%-opaque glass. Dark launch/grid lines are more visible than light.
- Four scenes share responsive height: roughly 50% up to 470dp on large screens, 200–260dp below an 800dp viewport. Evidence media/Search results flex to fill; fourth map uses `flex:1` with expired history only in copy. Metadata stays 9.5–10px. Evidence has a taller two-image grid and bottom-padded sources. Search has two attributed Kabul examples dated 09/15 October 2025, bookmarks, and a bottom-centered revisit helper about 12dp from list and border; large result cards use 108dp minimum height + 12dp vertical padding to avoid clipped footers.

Navigation and appearance:

- Bookmarks, History, Settings, Notification Preferences and Default Map Layers are full-screen `NavigationHeader` destinations; sheets remain contextual auth/map/incident/evidence flows. Do not reintroduce Selection Behavior mode cards. Preferences consolidate under Settings; Help/About stay sheets. `ProfileDrawer.go` marks `restoreProfileDrawer`; `closeOverlay` returns to that drawer for hardware/arrow Back, nested filters handle Back first, and TabBar `closeAll` does not force a drawer return.
- History/Bookmarks share `SavedItemRow`/`SavedEntries`: neutral cards, 5% accent corner glow, actual type/category/severity/location/time and type icons. Reanimated viewport reveals use 70ms stagger capped at 350ms, never replay revealed IDs on reverse scroll, and show immediately under reduced motion. Preserve handoffs/insets; do not apply the glow elsewhere.
- Theme supports `system`/`dark`/`light`; Settings → Appearance is its only editor. TabBar is opaque/sticky/full-width with accent active background, sentence-case labels, List icon, 58dp inset, 2dp extra nav gap and visible bottom divider. Profile drawer remains mounted offscreen in `OverlayHost`; only retarget its hardware-cached Reanimated translation (remounts dropped it to ~60fps versus retained ~109–111fps).

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
- Power Search suppression follows the topmost fullscreen owner via `utils/overlayStack.js`, never `stack.some()`. Other fullscreens may sit above it without clearing ownership; when topmost, hide retained fullscreens so only live map shows through. Tab switches preserve background state but dismiss transient UI: Map minimizes to pills, embedded previews close to origin, and non-owner Power Search closes detail/evidence to its retained results list.
- Sheet entry waits for camera idle/layout; preview maps use 54/46 split + 22dp corners. Embedded maps skip the hidden flight and share `previewPos` for sync (no timers/render resets), unmounting after hidden. Final Evidence closes both to origin without a pill; normal Map/Power Search keep pills. Use native `easeTo`, defer heavy content to camera idle, and supply real insets. `EmbeddedMapPanel` suppresses non-idle/non-preview renders to prevent retained-map drops.
- Selection title rows use copy-link + bookmark icons, with no Full Details button. `ZoneInfo` shows actual description and centered single-line area/perimeter/vertices values.
- Shared `DirCard` keeps History-style elevated cards, 1dp border, 12dp radius/margins, 8dp separation, existing accents/selection and compensated end padding. Power Search fetches text only on bar/keyboard submit (same query refreshes; Clear restores defaults); initial/filter fetches remain automatic. Applied tags/counts cover status, severity, selected verification, domains and zone categories. Verification defaults to an empty Set with no API param; reset/tag removal restores each default in the live flow. Badges count options individually (four verification states = 4).

- `Skeleton.jsx` owns Reanimated shimmer/`SkeletonImage`: one UI-thread driver per group, no JS timers/layout animation, static reduced motion, no gesture/detent changes. `AsyncStates.jsx` provides matched skeletons and recoverable errors; `services/recovery.js` makes one Retry run every mounted error handler, with `retryScope="local"` for mutations. `useTaxonomy` independently loads/dedupes taxonomy with silent refresh. Preserve stale content, show empty UI only after successful empty responses, and bypass cached X-post failures on Retry.

Gaps: signed-in E2E needs matching Google Cloud/Android/backend OAuth; videos keep original encoding.

## 10. Testing and Verification

**No automated unit/integration suite or CI exists.** Backend Playwright powers ad-hoc `scripts/`, not a standard runner.

- Ordinary web changes: run affected production builds; shared changes: build every affected web app.
- Use Playwright verification/screenshots only for major behavioral changes or on request; requires running services and may use gitignored `docs/dev-credentials.md`. Do not repeatedly read screenshots unless investigating a visible problem; owner normally reviews.
- Repeated automated logins can trigger auth rate limits; reuse valid tokens or allow cooldown.
- Detail-skeleton changes must compare real vs loading DOM measurements at the same incident/zone and viewport. Preserve actual classes, timeline spines, scroll containers and representative dimensions; avoid redundant refresh spinners and label-width shifts.
- Dev-only network-state review: open any web app with `?network=delay` for 5-second API/media shimmer, `?network=error` for a simulated 503 after 1.5 seconds, or `?network=detail-error` to keep lists/search live while only incident/zone detail GETs fail. Use `?network=off` to restore normal requests. The mode persists in tab `sessionStorage` across routes; auth requests stay live, error modes block matching API calls before fetch, and production builds always disable simulation (`shared/utils/networkSimulation.js`).
- Mobile: `npm run lint`, relevant Metro/native build, and release-device gesture/map checks covering MapLibre's separate SurfaceView plus app-view frames. Settings → Developer → Network state testing provides dev-only `delay` (4s), `error` (1.2s), `detail-error` (1.2s; lists stay live) and `off`; the mode persists in AsyncStorage, skips auth, also covers X-post fetch failures, and is disabled in release (`services/networkSimulation.js`).

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

Read `PROJECT.md` and `commit.md` for context/history; `docs/design-brief.md` for UI; relevant API routes/services plus `docs/api-spec.md` for API work; and schema + migrations for DB work. Check the target app's `src/App.jsx` and manifest for routes/dependencies. Current source overrides stale docs.
