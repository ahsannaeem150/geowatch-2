# GeoWatch Build History

> Document tracking every module built in sequence.  
> Append new modules below as development progresses.

---

## 📅 2026-05-05 — Module 1: Dev Environment & Database

### Summary
Established the full project monorepo structure, workspace configuration, environment variables, shared design system, PostgreSQL database schema execution, seed data, and project documentation.

### Created Files & Folders

| File / Folder | Purpose |
|:--|:--|
| `src/backend/` | Express API project structure |
| `src/user-web/` | Public website project structure |
| `src/admin-web/` | Admin dashboard project structure |
| `src/shared/` | Design tokens & constants shared across frontends |
| `package.json` (root) | npm workspaces for monorepo management |
| `src/backend/package.json` | Backend dependencies (express, pg, bcryptjs, jwt, zod, etc.) |
| `src/backend/.env.development` | Backend env with DB credentials, JWT secret, Martin URL |
| `src/backend/.env.example` | Template for other developers |
| `src/user-web/package.json` | React + Vite + MapLibre + date-fns |
| `src/user-web/.env` | Points API and Martin to localhost |
| `src/admin-web/package.json` | React + Vite + MapLibre + react-router-dom + date-fns |
| `src/admin-web/.env` | Points API and Martin to localhost |
| `src/shared/constants.js` | Category colors, severity scale, enums, API URLs |
| `src/shared/design-tokens.css` | Full dark-mode CSS variable system (colors, fonts, shadows, transitions) |
| `seeds.sql` | Creates super_admin user + 6 sample events + 4 timeline updates |
| `readme.md` | Professional project README with quick start guide |
| `.gitignore` | Expanded with node_modules, env files, build outputs, OS/editor files |
| `docs/dev-credentials.md` | Development credentials and local service URLs |

### Git Commit

```
chore: setup postgres, postgis, schema, env, seeds, readme, and workspace config
```

---

*End of Module 1*
