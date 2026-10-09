# Architecture

## Architectural style

Mosaic is a Vite-served, client-routed public catalog application with a
separate Go HTTP foundation and local PostgreSQL service. Public catalog
requests currently go from the browser to TMDB; account data is not yet
implemented. The intended M05 boundary is browser → Go API → PostgreSQL, with
no direct browser database access.

## Current flow

```text
browser route
  -> main.js route switch
  -> page module
  -> tmdb.js request/cache/normalization
  -> normalized media renderers
```

`getMediaDetails()` uses the same TMDB request/cache layer as Explore and
Search. Details rendering escapes API text and uses a render token to prevent
late responses replacing a newer route.

## Responsibilities

| Layer | Owns | Evidence |
|---|---|---|
| `main.js` | Shell events and route selection | `frontend/src/main.js` |
| `pages/` | Page markup, page requests, page state | `frontend/src/pages/` |
| `components/` | Reusable media/state markup | `frontend/src/components/` |
| `api/` | TMDB request, caching, normalization | `frontend/src/api/tmdb.js` |
| Go `httpserver` | HTTP handlers and CORS foundation | `backend/internal/httpserver/server.go` |
| Compose/database | Local PostgreSQL lifecycle | `compose.yml` |

## Planned M05 boundary

The merged M04/M05 plan requires Go to own password hashing, session
validation, authorization, and database access. Versioned migrations and the
auth repository/service layers are `[TODO]`; they are not present in the
current tree.

## Evidence

- `frontend/src/main.js`
- `frontend/src/api/tmdb.js`
- `frontend/src/pages/media/media-details.js`
- `frontend/src/components/media-card/media-card.js`
- `backend/internal/httpserver/server.go`
- `docs/M04-M05-MERGED-PLAN.md`
