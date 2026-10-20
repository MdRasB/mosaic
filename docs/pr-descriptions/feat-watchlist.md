## Summary

Implements the watchlist module (M09): users can put a movie or TV show on a
watchlist from the media details page, and manage that list from `/watchlist`
with type/status filters, sorting, and per-title status transitions.

The watchlist is the third view over the existing `user_media` relationship
that already backs collection and favorites. No new tables are introduced:
membership uses the reserved `user_media.status` column, which was defined in
the M07/M08 migration and is still unused.

## Changes

**Database**
- `supabase/migrations/20261017120000_watchlist.sql` — constrains
  `user_media.status` to the project's documented state model
  (`watchlist`, `watching`, `completed`, `paused`, `dropped`, or `NULL`) and
  adds a partial index for the watchlist listing. The constraint is added
  through a guarded `DO` block so re-running the migration is safe.

**Backend**
- `backend/internal/domain/collection/watchlist.go` (new) — `AddWatchlist`,
  `ListWatchlist`, `SetStatus`, `RemoveWatchlist`, and status validation.
- `service.go` — extracts the shared `upsertMedia` upsert so collection and
  watchlist cannot drift; refactors listing into a scoped `list` helper;
  `ParseFilters` now validates an optional `status` filter.
- `handler.go` — adds the watchlist handlers plus a shared status request
  shape, and makes the not-found message list-agnostic.
- `server.go` — registers `/api/v1/watchlist` and `/api/v1/watchlist/`.
- `watchlist_test.go` (new) — status validation and filter parsing tests.

**Frontend**
- `frontend/src/watchlist/watchlist-service.js` (new).
- `frontend/src/pages/watchlist/watchlist.{js,css}` (new) — filters in the URL,
  loading/empty/error states with retry, Load More, per-card status select and
  remove button.
- `index.html` — the Watchlist sidebar link is now live (its icon already
  existed).
- `main.js` — imports and auth-gates `/watchlist`.
- `pages/media/media-details.js` — adds a watchlist toggle next to the existing
  collection and favorite actions, including `aria-pressed` state.
- `styles/main.css` — imports the new stylesheet.

## API

```text
GET    /api/v1/watchlist?type=&status=&sort=&limit=&offset=
POST   /api/v1/watchlist
DELETE /api/v1/watchlist/{id}
PUT    /api/v1/watchlist/{id}/status     { "status": "watching" }
```

All routes require the session cookie and return `{"code","message"}` errors,
matching the existing collection and favorites endpoints.

## Behaviour notes

- Adding is idempotent: an already-tracked title keeps its current status, and a
  title that is not tracked yet starts at `watchlist`.
- Watchlist membership is independent of the other lists. Adding to the
  watchlist does not add the title to the collection, and removing a collection
  entry keeps a favorite or watchlist status intact. A `user_media` row is
  deleted only when the title belongs to no list.
- The details page derives its button state from the existing
  `/api/v1/collection/check` response, which already carries `status`, so no
  extra lookup endpoint is required.
- The watchlist page defaults to showing every status so completed titles stay
  reachable; the status filter narrows to one state.

## Testing

- `gofmt` clean on all changed Go files.
- `go build ./...`, `go vet ./...`, and `go test ./...` pass.
- `npm run build` passes with the new page and stylesheet.
- Manual flow to re-check against a local database: add a title from
  `/media/movie/:id`, open `/watchlist`, filter by type and status, change a
  status, remove the title, and confirm it survives a refresh. Also confirm
  removing a watchlisted title from `/collection` leaves the watchlist entry
  intact.

> Local verification needs `make db-up && make db-migrate && make run`; Docker
> was unavailable in the authoring environment, so the database flow above was
> not executed there.

## Out of scope

Favorites/collection UI changes, dashboard status widgets (M13), ratings and
reviews (M11/M12), RLS policies, and media-card quick-add affordances.