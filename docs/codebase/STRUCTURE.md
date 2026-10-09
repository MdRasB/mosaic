# Codebase Structure

## Top-level map

| Path | Purpose | Evidence |
|---|---|---|
| `frontend/` | Vite static application and source UI | `frontend/index.html`, `frontend/src/` |
| `backend/` | Go HTTP health-service foundation | `backend/cmd/api/main.go`, `backend/internal/` |
| `database/` | PostgreSQL initialization/schema location | `compose.yml`, `database/schema/` |
| `docs/` | Project and codebase documentation | `docs/` |
| `Makefile` | Local development and verification shortcuts | `Makefile` |
| `compose.yml` | Local PostgreSQL service | `compose.yml` |

## Frontend entry points

`frontend/index.html` loads `frontend/src/main.js`. `main.js` handles the
client-side route switch and shell events. Page modules live under
`frontend/src/pages/`; shared renderers live under `frontend/src/components/`;
TMDB access is centralized in `frontend/src/api/tmdb.js`.

## Current page modules

- `pages/explore/`: public discovery rows and featured media.
- `pages/search/`: search landing, filters, pagination, and errors.
- `pages/media/`: validated movie/TV detail routes and detail styles.
- `[TODO] pages/login/`, `pages/register/`, and `pages/dashboard/` for M05.

## Backend entry points

`backend/cmd/api/main.go` loads configuration, creates the HTTP server, and
handles graceful shutdown. `backend/internal/httpserver/server.go` currently
owns `/health` and CORS. `backend/internal/config/config.go` owns environment
defaults.

## Evidence

- `frontend/index.html`
- `frontend/src/main.js`
- `frontend/src/pages/media/media-details.js`
- `backend/cmd/api/main.go`
- `backend/internal/httpserver/server.go`
- `compose.yml`
