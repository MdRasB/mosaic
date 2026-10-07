# Testing Patterns

## Core Sections (Required)

### 1) Test Stack and Commands

- Primary test framework: Go's standard `testing` package for the backend; no
  frontend test framework is configured. The Vite production build is the
  frontend verification command.
- Assertion/mocking tools: Standard-library Go assertions and `httptest`.
- Commands:

```bash
cd frontend
npm run build
```

### 2) Test Layout

- Test file placement pattern: Go tests live beside the package under test;
  `backend/tests/` remains reserved for future cross-package tests.
- Naming convention: Go files use the `_test.go` suffix.
- Setup files and where they run: No shared setup is required currently.

### 3) Test Scope Matrix

| Scope | Covered? | Typical target | Notes |
|---|---|---|---|
| Unit | Partial | Go configuration and future services | Current packages without tests are still pending coverage. |
| Integration | Partial | Go HTTP handler via `httptest` | Health endpoint and method handling are covered. |
| E2E | No current tests | Release 1 guest-to-collection flow | The plan defines this flow as Release 1 done criteria. |

### 4) Mocking and Isolation Strategy

- Main mocking approach: `httptest` for HTTP requests; provider mocks are not
  needed until backend integrations are implemented.
- Isolation guarantees: Tests construct an in-memory HTTP handler and do not
  require a running database or external API.
- Common failure mode in tests: Environment-dependent behavior should be
  covered explicitly as configuration and provider modules are added.

### 5) Coverage and Quality Signals

- Coverage tool + threshold: No threshold is configured.
- Current reported coverage: Backend health handler tests pass; frontend has
  no automated test suite.
- Known gaps/flaky areas: Browser interaction, TMDB responses, and responsive
  layout remain manual-test areas.

### 6) Evidence

- `Mosaic_Project_Complete_Plan_Final.md:2354-2415`
- `Mosaic_Project_Complete_Plan_Final.md:3349-3394`
- `frontend/package.json`
- `frontend/src/main.js`
