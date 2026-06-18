# GeoWatch — Trial Routes Reference

> Quick reference for the admin-web trial pages used to compare against the implemented incident-detail UI.
> All routes run on the admin dashboard dev server (`http://localhost:5174` by default).

---

## Trial Routes

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

## Implemented Routes (for comparison)

| Platform | Route |
|:--|:--|
| Public website | `http://localhost:5173/incident/:id` |
| Admin dashboard | `http://localhost:5174/incident/:id` |
| Superadmin console | `http://localhost:5175/superadmin/incident/:id` |

---

## User-web Zone Trials

| Route | Purpose |
|:--|:--|
| `/trial/zone-sidebar` | Zone detail sidebar trial — 630px sidebar with polygon preview, full-status effective-window meter, and a second drawer for per-update evidence |
| `/trial/zone` | Full-page zone layout — immersive map hero with floating glass metadata panel; timeline cards open a clean sources modal |
| `/trial/zone-meter` | 20 visual variations of the effective-window / time-remaining component for side-by-side comparison |
| `/trial/zone-styles` | Zone shape + treatment gallery on a grid background for picking the final map overlay style |
| `/trial/zone-heroes` | Six animated zone-detail hero header concepts to choose from |

---

*Last updated: Zone UI trial refined to the chosen full-page layout + new evidence drawer/modal + redesigned effective-window meter.*
