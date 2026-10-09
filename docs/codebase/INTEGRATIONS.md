# External Integrations

## Inventory

| System | Purpose | Current access | Evidence |
|---|---|---|---|
| TMDB API v3 | Explore, Search, media details, related/provider metadata | Browser Fetch with public `VITE_TMDB_API_KEY` or `window.MOSAIC_CONFIG` | `frontend/src/api/tmdb.js` |
| TMDB image CDN | Posters, backdrops, people, provider logos | URL construction in `imageUrl()` | `frontend/src/api/tmdb.js` |
| PostgreSQL | Local persistence foundation | Docker Compose only; application queries are `[TODO]` | `compose.yml` |
| Cloudflare Pages | Intended static frontend deployment | Build settings documented, not configured in repo | `README.md` |

The earlier plan mentioned Supabase, but the revised M05 plan selects Go-owned
authentication with PostgreSQL. Supabase remains a possible managed PostgreSQL
host in `docs/deployment/FREE-HOSTING.md`, not an active browser auth client.

## Credentials

`VITE_TMDB_API_KEY` is intentionally public browser configuration. `.env`,
`frontend/config.js`, secrets, and PEM files are ignored. `[TODO]` Add
backend-only `DATABASE_URL` and auth/email secrets when M05 is implemented.

## Failure behavior

TMDB 401/403/404/429 and network failures become user-facing errors. Explore,
Search, and Media Details expose retry states. Optional detail data is
requested with the core response and is rendered only when available.

## Evidence

- `frontend/src/api/tmdb.js`
- `frontend/src/pages/explore/explore.js`
- `frontend/src/pages/search/search.js`
- `frontend/src/pages/media/media-details.js`
- `.gitignore`
- `compose.yml`
- `docs/deployment/FREE-HOSTING.md`
