# Architecture

## Architectural style

Mosaic is a Vite-served, client-routed public catalog application with a
separate Go HTTP API and PostgreSQL persistence. Public catalog requests go
from the browser to TMDB. Authentication, profile, and personal-list data go
through the Go API; the browser does not access PostgreSQL or Supabase directly.

## Current flow

```text
browser route
  -> main.js route switch
  -> page module
  -> API client
  -> normalized media renderers
```

TMDB pages use the TMDB request/cache layer. Authentication, profile, and
personal-list pages use the credentialed API client. Profile avatar uploads use
multipart `FormData`; the client omits `Content-Type` so the browser supplies
the multipart boundary.

## Responsibilities

| Layer | Owns | Evidence |
|---|---|---|
| `main.js` | Shell events and route selection | `frontend/src/main.js` |
| `pages/` | Page markup, page requests, page state | `frontend/src/pages/` |
| `components/` | Reusable media/state markup | `frontend/src/components/` |
| `api/` | TMDB request, caching, normalization | `frontend/src/api/tmdb.js` |
| `collection/` | Collection/favorite API requests | `frontend/src/collection/collection-service.js` |
| `watchlist/` | Watchlist API requests | `frontend/src/watchlist/watchlist-service.js` |
| Go `httpserver` | HTTP handlers and CORS | `backend/internal/httpserver/server.go` |
| Go `auth`/`profile` | Sessions, profile validation, avatar persistence | `backend/internal/auth`, `backend/internal/profile` |
| Go `domain/collection` | Collection, favorites, watchlist, and status-history reads/writes | `backend/internal/domain/collection/service.go`, `backend/internal/domain/collection/watchlist.go`, `backend/internal/domain/collection/status_history.go` |
| Supabase PostgreSQL | Users, sessions, profiles, saved media, watchlist status | `supabase/migrations/` |
| Compose/database | Local PostgreSQL lifecycle | `compose.yml` |

## Personal lists

Collection, favorites, and watchlist are three views over one `user_media`
relationship rather than three tables:

- `in_collection` marks collection membership.
- `is_favorite` marks favorite membership, with `favorited_at`.
- `status` is the watchlist marker: a row is on the watchlist when `status` is
  set, and the value (`watchlist`, `watching`, `completed`, `paused`,
  `dropped`) records progress.

A `user_media` row is deleted only once the title belongs to no list, so
removing a collection entry does not silently clear a favorite or a watchlist
status. Ownership is enforced in Go with `WHERE user_id = $1`; the database
uses constraints for value validity rather than row-level security.

## Evidence

- `frontend/src/main.js`
- `frontend/src/api/tmdb.js`
- `frontend/src/pages/watchlist/watchlist.js`
- `frontend/src/pages/media/media-details.js`
- `frontend/src/components/media-card/media-card.js`
- `backend/internal/httpserver/server.go`
- `backend/internal/domain/collection/watchlist.go`
- `supabase/migrations/20261015120000_collection_favorites.sql`
- `backend/internal/domain/collection/status.go`
- `backend/internal/domain/collection/status_history.go`
- `supabase/migrations/20261017120000_watchlist.sql`
- `supabase/migrations/20261020120000_status_tracking.sql`