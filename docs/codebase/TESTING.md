# Testing

## Test stack and commands

### 1) Test Stack and Commands

- **Backend**: Go's standard `testing` package with `httptest`.
- **Frontend Build Verification**: Vite production build.
- **Provider & Integration Tests**:
  - Standalone CLI integration test runner: `scripts/test_tmdb_integration.py`
  - Browser interactive test runner: `frontend/test-runner.html`
- **Commands**:

```bash
# Frontend build verification
cd frontend
npm run build

# Provider & TMDB integration tests
python scripts/test_tmdb_integration.py
```

### 2) Test Layout

- **Backend tests**: Go files live beside packages with the `_test.go` suffix.
- **Integration tests**: `scripts/test_tmdb_integration.py` and `frontend/test-runner.html`.
- **Naming convention**: `*_test.go` for Go; `test_*.py` for Python CLI integration scripts; `test-*.html` for browser test runners.

Backend tests sit beside the package under test, for example
`backend/internal/httpserver/server_test.go`. Frontend behavior is currently
manual browser verification.

| Scope | Covered? | Typical target | Notes |
|---|---|---|---|
| Unit | Partial | Go configuration, data normalizers, content safety filters | Normalization, safety filter, and error taxonomy covered. |
| Integration | Yes | Go HTTP `/health` via `httptest`; TMDB provider integration & error taxonomy | Fully covered via `scripts/test_tmdb_integration.py` and `frontend/test-runner.html`. |
| E2E | No current tests | Release 1 guest-to-collection flow | The plan defines this flow as Release 1 done criteria. |

The health handler and method rejection are covered. Password hashing has unit
coverage, and a local PostgreSQL smoke test covers registration, session
restoration, and logout. There are no automated tests for TMDB requests, route
parsing, M04 rendering, responsive layout, browser history, or full
authentication database behavior.

- **Main mocking approach**: In-memory test payloads and HTTP status simulation for external provider testing; `httptest` for Go HTTP handlers.
- **Isolation guarantees**: Integration tests can run without live TMDB network access or live database services.
- **Error taxonomy coverage**: Explicitly asserts 401 Unauthorized, 404 Not Found, 429 Rate Limit, 5xx Server Error, and timeout handling.

M04 needs route-shape, missing-metadata, not-found, retry, and stale-render
checks. M05 still needs database integration tests for unique emails,
expiry/revocation, malformed input, rate limiting, and token use. The local
migration and endpoint flow can be exercised with `make db-migrate` and the API
running with `DATABASE_URL` configured.

- **Coverage tool + threshold**: No formal threshold configured.
- **Current reported coverage**:
  - Backend health handler tests pass.
  - TMDB provider integration test suite passes (5/5 suites: Security, Safety Filtering, Media Normalization, M04 Details, and Error Taxonomy).
- **Known gaps/flaky areas**: Complex browser animations and mobile drawer swipe gestures remain manual-verification areas.

## Evidence

- `backend/internal/auth/password_test.go`
- `backend/internal/httpserver/server_test.go`
- `frontend/package.json`
- `frontend/src/api/tmdb.js`
- `frontend/test-runner.html`
- `scripts/test_tmdb_integration.py`
