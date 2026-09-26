# Coding Conventions

## Core Sections (Required)

### 1) Naming Rules

| Item | Rule | Example | Evidence |
|---|---|---|---|
| Files | [TODO] Planned lowercase JavaScript and Go filenames. | `router.js`, `main.go` | `Mosaic_Project_Complete_Plan_Final.md:1989-2077` |
| Functions/methods | camelCase | `themeToggle.addEventListener(...)` | `frontend/src/main.js` |
| Types/interfaces | Not applicable in current JavaScript frontend | [TODO] | `frontend/src/main.js` |
| Constants/env vars | Environment variables use the `VITE_` prefix for V1 browser configuration. | `VITE_TMDB_API_KEY` | `Mosaic_Project_Complete_Plan_Final.md:2194-2216` |

### 2) Formatting and Linting

- Formatter: [TODO] No formatter configured.
- Linter: [TODO] No linter configured.
- Most relevant enforced rules: [TODO]
- Run commands: [TODO]

### 3) Import and Module Conventions

- Import grouping/order: [TODO]
- Alias vs relative import policy: [TODO]
- Public exports/barrel policy: [TODO]

### 4) Error and Logging Conventions

- Error strategy by layer: The plan requires explicit loading, empty, API-failure, and database-failure states; implementation is pending.
- Logging style and required context fields: [TODO]
- Sensitive-data redaction rules: Supabase secret/service-role keys must remain server-side.

### 5) Testing Conventions

- Test file naming/location rule: Planned backend tests are under `backend/tests/`; frontend convention is [TODO].
- Mocking strategy norm: [TODO]
- Coverage expectation: [TODO]

### 6) Evidence

- `Mosaic_Project_Complete_Plan_Final.md:2272-2319`
- `Mosaic_Project_Complete_Plan_Final.md:2194-2224`
- `frontend/src/main.js`
- `frontend/src/styles/*.css`
