# Technology Stack

## Core Sections (Required)

### 1) Runtime Summary

| Area | Value | Evidence |
|------|-------|----------|
| Primary language | Vanilla JavaScript ES modules | `frontend/src/main.js` |
| Runtime + version | Node.js runtime for Vite tooling; version not pinned | `frontend/package.json` |
| Package manager | npm | `frontend/package-lock.json` |
| Module/build system | Vite | `frontend/package.json`, `frontend/vite.config.js` |

### 2) Production Frameworks and Dependencies

| Dependency | Version | Role in system | Evidence |
|------------|---------|----------------|----------|
| Vanilla JavaScript | ES modules | V1 browser application | `frontend/src/main.js` |
| Vite | 7.x | Frontend development/build tool | `frontend/package.json`, `frontend/package-lock.json` |
| Supabase | [TODO] | Auth, PostgreSQL, RLS, and storage | `Mosaic_Project_Complete_Plan_Final.md:3469-3474` |
| TMDB API | [TODO] | Public media discovery | `Mosaic_Project_Complete_Plan_Final.md:3476-3477` |
| Go / net/http / chi / pgx | [TODO] | Later server-side API | `Mosaic_Project_Complete_Plan_Final.md:3482-3487` |

### 3) Development Toolchain

| Tool | Purpose | Evidence |
|------|---------|----------|
| Vite | Development server and production build | `frontend/package.json` |

### 4) Key Commands

```bash
cd frontend
npm install
npm run dev
npm run build
npm run preview
```

### 5) Environment and Config

- Config sources: Root `.env.example` for database; frontend has no runtime secrets yet.
- Required env vars: Planned V1 variables are `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_TMDB_API_KEY`; implementation is pending.
- Deployment/runtime constraints: Release 1 is planned for Cloudflare Pages, Supabase, and TMDB; Go/Render is optional later.

### 6) Evidence

- `frontend/package.json`
- `frontend/vite.config.js`
- `frontend/package-lock.json`
- `Mosaic_Project_Complete_Plan_Final.md:2194-2224`
- `Mosaic_Project_Complete_Plan_Final.md:3460-3509`
