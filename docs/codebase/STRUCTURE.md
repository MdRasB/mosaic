# Codebase Structure

## Core Sections (Required)

### 1) Top-Level Map

| Path | Purpose | Evidence |
|------|---------|----------|
| `frontend/` | Planned HTML, CSS, Vanilla JS, and Vite application. | `Mosaic_Project_Complete_Plan_Final.md:1978-2041` |
| `backend/` | Planned Go server for features requiring server-side logic. | `Mosaic_Project_Complete_Plan_Final.md:2042-2077` |
| `database/` | Planned SQL schema, seeds, and RLS policies. | `Mosaic_Project_Complete_Plan_Final.md:2078-2094` |
| `docs/` | Project documentation and codebase knowledge. | `Mosaic_Project_Complete_Plan_Final.md:2096-2108` |
| `scripts/` | Planned seed and maintenance utilities. | `Mosaic_Project_Complete_Plan_Final.md:2109-2110` |

### 2) Entry Points

- Main runtime entry: `frontend/index.html`, loading `frontend/src/main.js`.
- Secondary entry point: Go API entry at `backend/cmd/api/main.go`, currently
  serving the `/health` foundation endpoint.
- How entry is selected: `frontend/package.json` scripts invoke Vite.

### 3) Module Boundaries

| Boundary | What belongs here | What must not be here |
|----------|-------------------|------------------------|
| `frontend/src/pages/` | Route-level page composition. | Direct provider schema coupling. |
| `frontend/src/components/` | Reusable UI components. | Page-specific data access. |
| `frontend/src/api/` | TMDB, Supabase, and future Go client abstractions. | DOM rendering. |
| `backend/internal/` | Future private Go application code, services, repositories, and providers. | Public package API without a deliberate boundary. |
| `database/` | Schema, seed, and RLS SQL. | UI or provider logic. |

These boundaries are represented by the current frontend page/API/component
layers and the Go `internal/` foundation. Planned module directories remain
empty until their corresponding feature is implemented.

### 4) Naming and Organization Rules

- File naming pattern: Lowercase JavaScript and CSS filenames such as `main.js`, `variables.css`, and `vite.config.js`.
- Directory organization pattern: frontend by technical UI layer/page, backend by internal layer/domain/provider, database by SQL concern.
- Import aliasing: frontend modules use explicit relative imports; no barrel
  modules or aliases are configured.

### 5) Evidence

- `Mosaic_Project_Complete_Plan_Final.md:1949-2117`
- `frontend/index.html`
- `frontend/package.json`
- `frontend/src/main.js`
- Current scaffold directories created on `feature/project-structure`
