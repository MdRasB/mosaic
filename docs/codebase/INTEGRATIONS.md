# External Integrations

## Inventory

| System | Purpose | Current access | Evidence |
|---|---|---|---|
| TMDB API v3 | Explore, Search, media details, related/provider metadata | Browser Fetch with public `VITE_TMDB_API_KEY` or `window.MOSAIC_CONFIG` | `frontend/src/api/tmdb.js` |
| TMDB image CDN | Posters, backdrops, people, provider logos | URL construction in `imageUrl()` | `frontend/src/api/tmdb.js` |
| PostgreSQL | User, session, profile, collection, favorite, and watchlist persistence | Go `pgxpool` queries; local Docker Compose or Supabase-hosted PostgreSQL | `compose.yml`, `backend/internal/auth/service.go`, `backend/internal/domain/collection/service.go`, `backend/internal/domain/collection/watchlist.go` |
| Cloudflare Pages | Static frontend deployment | Vite build output and `VITE_API_BASE_URL` | `README.md`, `docs/deployment/FREE-HOSTING.md` |
| Render | Go API deployment | `render.yaml` and environment configuration | `render.yaml` |

Supabase is used as a managed PostgreSQL host, not as a browser auth client.
The Go API owns authentication, authorization, collection, favorite, and
watchlist reads/writes.

## Personal-list endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/collection` | Saved collection, with `type`, `sort`, `limit`, `offset` |
| POST | `/api/v1/collection` | Add a title to the collection |
| DELETE | `/api/v1/collection/{id}` | Remove a title from the collection |
| PUT/DELETE | `/api/v1/collection/{id}/favorite` | Set or clear a favorite |
| GET | `/api/v1/collection/check` | Current saved state for one title |
| GET | `/api/v1/favorites` | Favorite titles |
| PUT | `/api/v1/favorites/media` | Favorite a title directly |
| GET | `/api/v1/watchlist` | Watchlisted titles, with `type`, `status`, `sort`, `limit`, `offset` |
| POST | `/api/v1/watchlist` | Add a title to the watchlist |
| DELETE | `/api/v1/watchlist/{id}` | Remove a title from the watchlist |
| PUT | `/api/v1/watchlist/{id}/status` | Set watchlist status |

All of these require the session cookie and return `{"code","message"}` errors.

## Credentials

`VITE_TMDB_API_KEY` is intentionally public browser configuration. `.env`,
`frontend/config.js`, secrets, and PEM files are ignored. The backend only reads
`DATABASE_URL`, session-cookie configuration, and CORS settings from the server
environment; these must never be placed in frontend configuration.

## Failure behavior

TMDB 401/403/404/429 and network failures become user-facing errors. Explore,
Search, and Media Details expose retry states. Optional detail data is
requested with the core response and is rendered only when available.

## Evidence

- `frontend/src/api/tmdb.js`
- `frontend/src/pages/explore/explore.js`
- `frontend/src/pages/search/search.js`
- `frontend/src/pages/media/media-details.js`
- `backend/internal/auth/service.go`
- `backend/internal/auth/handler.go`
- `backend/internal/domain/collection/handler.go`
- `backend/internal/domain/collection/service.go`
- `backend/internal/domain/collection/watchlist.go`
- `frontend/src/watchlist/watchlist-service.js`
- `.gitignore`
- `compose.yml`
- `render.yaml`
- `supabase/migrations/20261015120000_collection_favorites.sql`
- `supabase/migrations/20261017120000_watchlist.sql`
- `docs/deployment/FREE-HOSTING.md`
