# Technology Stack

## Core Sections (Required)

### 1) Runtime Summary

| Area | Value | Evidence |
|------|-------|----------|
| Primary language | [TODO] No implementation language is present yet; the plan specifies Vanilla JavaScript for V1 and Go for later server-side work. | `Mosaic_Project_Complete_Plan_Final.md:1949-1966` |
| Runtime + version | [TODO] | `README.md`, `.gitignore` |
| Package manager | [TODO] | `README.md`, `.gitignore` |
| Module/build system | Planned Vite frontend; not initialized yet. | `Mosaic_Project_Complete_Plan_Final.md:2117-2141` |

### 2) Production Frameworks and Dependencies

| Dependency | Version | Role in system | Evidence |
|------------|---------|----------------|----------|
| Vanilla JavaScript | [TODO] | V1 browser application | `Mosaic_Project_Complete_Plan_Final.md:3460-3466` |
| Vite | [TODO] | Frontend development/build tool | `Mosaic_Project_Complete_Plan_Final.md:2117-2141` |
| Supabase | [TODO] | Auth, PostgreSQL, RLS, and storage | `Mosaic_Project_Complete_Plan_Final.md:3469-3474` |
| TMDB API | [TODO] | Public media discovery | `Mosaic_Project_Complete_Plan_Final.md:3476-3477` |
| Go / net/http / chi / pgx | [TODO] | Later server-side API | `Mosaic_Project_Complete_Plan_Final.md:3482-3487` |

### 3) Development Toolchain

| Tool | Purpose | Evidence |
|------|---------|----------|
| [TODO] | No development tooling is configured in the current repository. | `README.md`, `.gitignore` |

### 4) Key Commands

```bash
[TODO] No install, build, test, or lint commands are configured yet.
```

### 5) Environment and Config

- Config sources: [TODO] No environment template exists yet.
- Required env vars: Planned V1 variables are `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_TMDB_API_KEY`; implementation is pending.
- Deployment/runtime constraints: Release 1 is planned for Cloudflare Pages, Supabase, and TMDB; Go/Render is optional later.

### 6) Evidence

- `README.md`
- `.gitignore`
- `Mosaic_Project_Complete_Plan_Final.md:2194-2224`
- `Mosaic_Project_Complete_Plan_Final.md:3460-3509`
