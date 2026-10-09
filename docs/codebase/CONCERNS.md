# Codebase Concerns

## Prioritized risks

| Severity | Concern | Evidence | Mitigation/next step |
|---|---|---|---|
| high | TMDB key is visible in browser output | `frontend/src/api/tmdb.js`, `README.md` | Treat it as public; move sensitive/provider-controlled calls behind Go if required. |
| high | Authentication and private persistence are not implemented | `backend/internal/httpserver/server.go`, `docs/M04-M05-MERGED-PLAN.md` | Implement M05 before claiming protected user features. |
| medium | Free hosting services may sleep or change limits | `docs/deployment/FREE-HOSTING.md` | Recheck provider terms before release and document cold starts. |
| medium | Frontend has no automated browser tests | `frontend/package.json` | Add route/page tests or a browser smoke suite when auth is introduced. |

## Technical debt

- The current Go service does not connect to PostgreSQL.
- `database/schema/` contains only a placeholder; versioned migrations are
  `[TODO]`.
- Vite output is intentionally non-minified in `frontend/vite.config.js`;
  this improves inspection but increases deployed asset size.
- The existing page shell contains placeholder auth controls until M05.

## Security gaps

No passwords, session cookies, or database credentials are currently handled by
the application. M05 must add server-side sessions, Argon2id, CSRF/origin
controls, rate limiting, and neutral auth error messages before production
deployment.

## Evidence

- `frontend/vite.config.js`
- `frontend/src/api/tmdb.js`
- `backend/internal/httpserver/server.go`
- `database/schema/.gitkeep`
- `docs/M04-M05-MERGED-PLAN.md`
- `docs/deployment/FREE-HOSTING.md`
