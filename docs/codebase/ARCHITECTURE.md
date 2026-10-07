# Architecture

## Core Sections (Required)

### 1) Architectural Style

- Primary style: Staged frontend-first architecture with separated frontend, optional Go backend, and database concerns.
- Why this classification: Release 1 calls TMDB and Supabase directly from the browser; Go is introduced only when server-side control is needed.
- Primary constraints: Keep V1 simple, enforce Supabase RLS, and hide secret/service-role credentials from browser code.

### 2) System Flow

```text
Browser route -> frontend page/component -> API abstraction -> TMDB or Supabase -> normalized UI/state
```

The planned flow is: Vite serves the frontend; a small client-side router selects pages; API modules call TMDB or Supabase; provider responses are normalized into a Mosaic media object; components render the result. Go becomes an additional boundary for later server-side features.

### 3) Layer/Module Responsibilities

| Layer or module | Owns | Must not own | Evidence |
|---|---|---|---|
| `frontend/src/app/` | Routing, browser state, route guards. | Provider-specific rendering. | `Mosaic_Project_Complete_Plan_Final.md:1989-1995` |
| `frontend/src/api/` | External service client abstractions. | Page DOM composition. | `Mosaic_Project_Complete_Plan_Final.md:1996-2000` |
| `frontend/src/components/` | Reusable UI pieces. | Database schema ownership. | `Mosaic_Project_Complete_Plan_Final.md:2001-2014` |
| `backend/internal/` | Future server handlers, services, repositories, and providers. | Mandatory proxying of every V1 request. | `Mosaic_Project_Complete_Plan_Final.md:2039-2077` |
| `database/` | Schema, migrations, RLS, and seeds. | External API response mapping. | `Mosaic_Project_Complete_Plan_Final.md:2078-2094` |

### 4) Reused Patterns

| Pattern | Where found | Why it exists |
|---|---|---|
| Adapter/normalization boundary | Planned TMDB adapter to Mosaic media object | Prevent pages from depending on external schemas. |
| Provider abstraction | Planned `backend/internal/provider/` and frontend API modules | Enable additional media sources without redesigning pages. |
| Repository separation | Planned Go `internal/repository/` | Keep data access separate from handlers/services. |

Evidence: `Mosaic_Project_Complete_Plan_Final.md:687-771`, `2039-2077`.

### 5) Known Architectural Risks

- Browser-exposed Vite variables are public by design; secret keys must never be placed there.
- Explore and search implement loading, empty, error, and retry states. The Go
  foundation still needs request logging and feature-specific observability as
  server-side modules are added.

### 6) Evidence

- `Mosaic_Project_Complete_Plan_Final.md:117-317`
- `Mosaic_Project_Complete_Plan_Final.md:687-771`
- `Mosaic_Project_Complete_Plan_Final.md:1949-2117`
