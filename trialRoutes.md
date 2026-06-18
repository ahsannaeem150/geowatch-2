# GeoWatch — Trial Routes Reference

> Quick reference for the design/trial pages used to compare concepts before integrating them into the main apps.
>
> Admin/incident trials run on the admin dashboard dev server (`http://localhost:5174` by default).  
> User-web zone trials run on the public site dev server (`http://localhost:5173` by default).

---

## Admin-Web Incident / Sidebar Trials

| Route | Purpose |
|:--|:--|
| `/trial` | Original design trial |
| `/sidebarTrial` | First sidebar trial |
| `/sidebarTrial2` | Option F sidebar |
| `/sidebarTrial2/optionF` | Option F detail |
| `/sidebarTrial2/xGallery` | X-post gallery options |
| `/sidebarTrial2/admin` | Sidebar trial — admin view |
| `/sidebarTrial2/superadmin` | Sidebar trial — superadmin view |
| `/xPostOptions` | X-post option picker |
| `/incident-trial/user` | Full incident page trial — user mode |
| `/incident-trial/admin` | Full incident page trial — admin mode |
| `/incident-trial/superadmin` | Full incident page trial — superadmin mode |

---

## User-Web Zone Trials

| Route | Purpose |
|:--|:--|
| `/trial/zone-sidebar` | Zone detail sidebar trial — 630 px sidebar with polygon preview, full-status effective-window meter, and a second drawer for per-update evidence |
| `/trial/zone` | Full-page zone layout trial — immersive map hero with floating glass metadata panel; timeline cards open a clean sources modal |
| `/trial/zone-meter` | Effective-window / time-remaining component laboratory — visual variations of the meter for side-by-side comparison |
| `/trial/zone-styles` | Zone shape + treatment gallery on a grid background — used to pick the final map overlay style |
| `/trial/zone-heroes` | Zone-detail hero header laboratory — currently narrowed to the original HUD command center and the customized tag + countdown version |
| `/trial/zone-sidebar-animations` | Sidebar mini-map pulse laboratory — full-screen preview of the chosen inward-traveling neon pulse animation for the polygon preview card |

---

## Implemented Routes (for comparison)

| Platform | Route |
|:--|:--|
| Public website | `http://localhost:5173/incident/:id` |
| Admin dashboard | `http://localhost:5174/incident/:id` |
| Superadmin console | `http://localhost:5175/superadmin/incident/:id` |

---

## Key Zone Trial Files

| File | What it contains |
|:--|:--|
| `src/user-web/src/pages/ZoneTrialLayoutB.jsx` | `/trial/zone` full-page layout |
| `src/user-web/src/pages/ZoneTrialSidebarPage.jsx` | `/trial/zone-sidebar` sidebar layout |
| `src/user-web/src/pages/ZoneTrialMeterPage.jsx` | `/trial/zone-meter` meter laboratory |
| `src/user-web/src/pages/ZoneStylesTrialPage.jsx` | `/trial/zone-styles` shape/style gallery |
| `src/user-web/src/pages/ZoneHeroesTrialPage.jsx` | `/trial/zone-heroes` hero concepts |
| `src/user-web/src/pages/ZoneSidebarAnimationTrialPage.jsx` | `/trial/zone-sidebar-animations` mini-map pulse preview |
| `src/user-web/src/pages/ZoneTrialCommon.jsx` | Shared zone helpers: `ZoneNeonMap`, `EffectiveWindowMeter`, `useZoneTimeState`, badges, evidence drawer/modal |
| `src/user-web/src/pages/ZoneTrial.css` | Shared styles for zone trial pages |
| `src/user-web/src/pages/ZoneStylesTrial.css` | Shape/style gallery specific styles |
| `src/user-web/src/pages/ZoneHeroesTrial.css` | Hero laboratory specific styles |
| `src/user-web/src/pages/ZoneSidebarAnimationTrial.css` | Mini-map animation gallery specific styles |
| `src/user-web/src/pages/zoneTrialData.js` | Mock zone + timeline data for the trials |

---

*Last updated: 2026-06-16 — Zone hero laboratory trimmed to two HUD variants; zone trial files listed above are the current reference set.*
