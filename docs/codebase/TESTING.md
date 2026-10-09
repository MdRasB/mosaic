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

The health handler and method rejection are covered. Password hashing has unit
coverage, and a local PostgreSQL smoke test covers registration, session
restoration, and logout. There are no automated tests for TMDB requests, route
parsing, M04 rendering, responsive layout, browser history, or full
authentication database behavior.

## Required next tests

M04 needs route-shape, missing-metadata, not-found, retry, and stale-render
checks. M05 still needs database integration tests for unique emails,
expiry/revocation, malformed input, rate limiting, and token use. The local
migration and endpoint flow can be exercised with `make db-migrate` and the API
running with `DATABASE_URL` configured.

Passwords are accepted from 8 through 128 characters. A local API smoke test
should verify registration, `/auth/me`, logout, and the expected `401` after
logout.

## Evidence

- `backend/internal/auth/password_test.go`
- `backend/internal/httpserver/server_test.go`
- `frontend/package.json`
- `Makefile`
- `frontend/src/pages/media/media-details.js`
- `docs/M04-M05-MERGED-PLAN.md`
