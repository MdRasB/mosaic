# Testing

## Test stack and commands

- Backend: Go standard `testing` package and `httptest`.
- Frontend: no test framework; production build is the automated check.
- Repository checks: `make check`.

```bash
make check
# or
cd frontend && npm run build
cd backend && go test ./...
docker compose config --quiet
```

## Test layout

Backend tests sit beside the package under test, for example
`backend/internal/httpserver/server_test.go`. Frontend behavior is currently
manual browser verification.

## Current coverage

The health handler and method rejection are covered. There are no automated
tests for TMDB requests, route parsing, M04 rendering, responsive layout,
browser history, or authentication.

## Required next tests

M04 needs route-shape, missing-metadata, not-found, retry, and stale-render
checks. M05 needs database integration tests for unique emails, Argon2id
verification, expiry/revocation, logout, cookie behavior, malformed input,
rate limiting, and token use. These are `[TODO]`.

## Evidence

- `backend/internal/httpserver/server_test.go`
- `frontend/package.json`
- `Makefile`
- `frontend/src/pages/media/media-details.js`
- `docs/M04-M05-MERGED-PLAN.md`
