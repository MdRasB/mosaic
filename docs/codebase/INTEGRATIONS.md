# External Integrations

## Inventory

| System | Purpose | Current access | Evidence |
|---|---|---|---|
| TMDB API v3 | Explore, Search, media details, related/provider metadata | Browser Fetch with public `VITE_TMDB_API_KEY` or `window.MOSAIC_CONFIG` | `frontend/src/api/tmdb.js` |
| TMDB image CDN | Posters, backdrops, people, provider logos | URL construction in `imageUrl()` | `frontend/src/api/tmdb.js` |
| PostgreSQL | User and session persistence for M05 | Go `pgxpool` queries; local Docker Compose or Supabase-hosted PostgreSQL | `compose.yml`, `backend/internal/auth/service.go` |
| Cloudflare Pages | Intended static frontend deployment | Build settings documented, not configured in repo | `README.md` |

| System | Type | Purpose | Auth model | Criticality | Evidence |
|---|---|---|---|---|---|
| TMDB | External API | Public media discovery, media details, credits, videos, and recommendations. | Browser API key through `VITE_TMDB_API_KEY` in V1 (or `config.js` for Live Server); public by design. | High for Explore, Search, & Media Details. | `frontend/src/api/tmdb.js` |
| Supabase Auth/Data/Storage | Managed auth, database, and storage | User accounts, PostgreSQL data, RLS, and photos. | Planned publishable browser key with RLS; secret key server-only. | High for user features. | `Mosaic_Project_Complete_Plan_Final.md:185-201` |
| Go API | Planned HTTP service | Server-side aggregation/business logic in later releases. | Bearer JWT / Internal API Token. | Later | `Mosaic_Project_Complete_Plan_Final.md:203-232` |

## Credentials

`VITE_TMDB_API_KEY` is intentionally public browser configuration. `.env`,
`frontend/config.js`, secrets, and PEM files are ignored. The backend only reads
`DATABASE_URL`, session-cookie configuration, and CORS settings from the server
environment; these must never be placed in frontend configuration.

## Failure behavior

- **Credential sources**: `frontend/.env` via Vite environment variables (`VITE_TMDB_API_KEY`), with fallback to `window.MOSAIC_CONFIG.tmdbApiKey` for Live Server development.
- **Hardcoding checks**: No TMDB key is hardcoded in the codebase. `.gitignore` strictly excludes `.env` and `frontend/config.js`.
- **Security guards**: `getApiKey()` in `frontend/src/api/tmdb.js` prevents accidental leakage of server secrets (e.g. Supabase service-role keys or private JWTs) into browser requests.
- **Rotation and lifecycle notes**: TMDB API keys are created via TMDB developer settings. If compromised, generate a new key on TMDB and update `frontend/.env` locally and in the Cloudflare Pages environment variables.

## Evidence

- **Retry/backoff behavior**: Section-level and page-level retry buttons are implemented in Explore, Search, and Media Details. Failed requests are evicted from `responseCache` so retry triggers make fresh requests.
- **Timeout policy**: All TMDB requests enforce an `AbortController` timeout (10,000 ms / 10s default), throwing a structured `TmdbError` with `isTimeout: true`.
- **Circuit-breaker and fallback behavior**: Structured error taxonomy via `TmdbError` classifies 401 (Auth error), 404 (Not found), 429 (Rate limit), 5xx (Server error), and network failures. Composite media fetching (`getCompleteMediaDetails`) uses `Promise.allSettled` to guarantee fault tolerance: failures in sub-endpoints (such as watch providers or trailers) do not break page rendering.

### 5) Observability for Integrations

- **Logging around external calls**: Failed requests log HTTP status, URL path, and user-friendly error taxonomy to the browser console.
- **Diagnostics check**: `checkProviderHealth()` verifies TMDB endpoint reachability and key validation.
- **Integration testing**:
  - In-browser interactive test suite: `frontend/test-runner.html`
  - Automated CLI test script: `scripts/test_tmdb_integration.py`

### 6) Evidence

- `Mosaic_Project_Complete_Plan_Final.md:1811-1947`
- `Mosaic_Project_Complete_Plan_Final.md:2194-2267`
- `frontend/src/api/tmdb.js`
- `frontend/test-runner.html`
- `scripts/test_tmdb_integration.py`
- `README.md`
- `.gitignore`
- `compose.yml`
- `docs/deployment/FREE-HOSTING.md`
