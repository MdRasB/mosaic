# Architecture

## Architectural style

Mosaic is a Vite-served, client-routed public catalog application with a
separate Go HTTP API and PostgreSQL persistence. Public catalog requests go
from the browser to TMDB. Authentication and profile data go through the Go
API; the browser does not access PostgreSQL or Supabase directly.

## Current flow

```text
browser route
  -> main.js route switch
  -> page module
  -> API client
  -> normalized media renderers
```

TMDB pages use the TMDB request/cache layer. Authentication and profile pages
use the credentialed API client. Profile avatar uploads use multipart
`FormData`; the client omits `Content-Type` so the browser supplies the
multipart boundary.

## Responsibilities

| Layer | Owns | Evidence |
|---|---|---|
| `main.js` | Shell events and route selection | `frontend/src/main.js` |
| `pages/` | Page markup, page requests, page state | `frontend/src/pages/` |
| `components/` | Reusable media/state markup | `frontend/src/components/` |
| `api/` | TMDB request, caching, normalization | `frontend/src/api/tmdb.js` |
| Go `httpserver` | HTTP handlers and CORS | `backend/internal/httpserver/server.go` |
| Go `auth`/`profile` | Sessions, profile validation, avatar persistence | `backend/internal/auth`, `backend/internal/profile` |
| Supabase PostgreSQL | Users, sessions, profiles, avatar bytes | `supabase/migrations/`, `backend/internal/profile/service.go` |
| Compose/database | Local PostgreSQL lifecycle | `compose.yml` |

## Evidence

- `frontend/src/main.js`
- `frontend/src/api/tmdb.js`
- `frontend/src/pages/media/media-details.js`
- `frontend/src/components/media-card/media-card.js`
- `backend/internal/httpserver/server.go`
- `docs/M04-M05-MERGED-PLAN.md`
