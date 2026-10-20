# Codebase Structure

## Top-level map

| Path | Purpose | Evidence |
|---|---|---|
| `frontend/` | Vite static application and source UI | `frontend/index.html`, `frontend/src/` |
| `backend/` | Go HTTP API, authentication, and profiles | `backend/cmd/api/main.go`, `backend/internal/` |
| `database/` | PostgreSQL initialization/schema location | `compose.yml`, `database/schema/` |
| `docs/` | Project and codebase documentation | `docs/` |
| `Makefile` | Local development and verification shortcuts | `Makefile` |
| `compose.yml` | Local PostgreSQL service | `compose.yml` |

## Frontend entry points

`frontend/index.html` loads `frontend/src/main.js`. `main.js` handles the
client-side route switch and shell events. Page modules live under
`frontend/src/pages/`; shared renderers live under `frontend/src/components/`;
TMDB access is centralized in `frontend/src/api/tmdb.js`, while personal-list
requests are centralized in `frontend/src/collection/collection-service.js` and
`frontend/src/watchlist/watchlist-service.js`.

## Current page modules

- `pages/explore/`: public discovery rows and featured media.
- `pages/search/`: search landing, filters, pagination, and errors.
- `pages/media/`: validated movie/TV detail routes and detail styles.
- `pages/auth/`: login, registration, and dashboard placeholder.
- `pages/profile/`: profile card and editable settings, including avatar upload
  controls.
- `pages/collection/`: authenticated collection and favorites pages.
- `pages/watchlist/`: authenticated watchlist page with type, status, and sort
  filters.

## Backend entry points

`backend/cmd/api/main.go` loads configuration, creates the HTTP server, and
handles graceful shutdown. `backend/internal/httpserver/server.go` owns
`/health`, auth, profile, collection, favorite, and watchlist routes, and CORS.
`backend/internal/domain/collection/` owns the shared saved-media queries:
`service.go` (collection and favorites), `watchlist.go` (watchlist operations),
`status.go` and `status_history.go` (centralized status and history),
and `handler.go` (HTTP handlers for all three). `backend/internal/config/config.go`
owns environment defaults.

## Evidence

- `frontend/index.html`
- `frontend/src/main.js`
- `frontend/src/pages/media/media-details.js`
- `frontend/src/pages/watchlist/watchlist.js`
- `backend/cmd/api/main.go`
- `backend/internal/httpserver/server.go`
- `backend/internal/domain/collection/handler.go`
- `backend/internal/domain/collection/service.go`
- `backend/internal/domain/collection/watchlist.go`
- `supabase/migrations/20261015120000_collection_favorites.sql`
- `supabase/migrations/20261017120000_watchlist.sql`
- `compose.yml`
