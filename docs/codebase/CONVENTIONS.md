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

- Formatter: No formatter configured; preserve the existing two-space
  JavaScript/CSS style and run `gofmt` for Go files.
- Linter: No project linter configured.
- Most relevant enforced rules: `npm run build`, `git diff --check`, and
  `gofmt`/`go test ./...` for backend changes.
- Run commands: `cd frontend && npm run build`; `cd backend && go test ./...`.

### 3) Import and Module Conventions

- Import grouping/order: explicit relative imports at the top of each module.
- Alias vs relative import policy: relative paths; no alias configuration.
- Public exports/barrel policy: modules export named functions directly; no
  barrel files are currently used.

### 4) Error and Logging Conventions

- Error strategy by layer: frontend pages render explicit loading, empty,
  API-failure, and retry states; backend handlers return HTTP errors and log
  startup failures.
- Logging style and required context fields: contextual `console.error` in
  frontend failures and standard Go `log` for the current API foundation.
- Sensitive-data redaction rules: Supabase secret/service-role keys must remain server-side.

### 5) Testing Conventions

- Test file naming/location rule: Go tests use `_test.go` beside the package;
  frontend tests are not configured.
- Mocking strategy norm: use `httptest` for HTTP boundaries and avoid external
  services in tests.
- Coverage expectation: no threshold currently configured.

### 6) Evidence

- `Mosaic_Project_Complete_Plan_Final.md:2272-2319`
- `Mosaic_Project_Complete_Plan_Final.md:2194-2224`
- `frontend/src/main.js`
- `frontend/src/styles/*.css`
