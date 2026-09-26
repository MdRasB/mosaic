# Testing Patterns

## Core Sections (Required)

### 1) Test Stack and Commands

- Primary test framework: [TODO] No test framework is configured; the Vite production build is currently the available verification.
- Assertion/mocking tools: [TODO]
- Commands:

```bash
cd frontend
npm run build
```

### 2) Test Layout

- Test file placement pattern: Planned `backend/tests/`; frontend placement is [TODO].
- Naming convention: [TODO]
- Setup files and where they run: [TODO]

### 3) Test Scope Matrix

| Scope | Covered? | Typical target | Notes |
|---|---|---|---|
| Unit | No current tests | Planned utilities, adapters, services | [TODO] |
| Integration | No current tests | Planned Supabase/Go boundaries | [TODO] |
| E2E | No current tests | Release 1 guest-to-collection flow | The plan defines this flow as Release 1 done criteria. |

### 4) Mocking and Isolation Strategy

- Main mocking approach: [TODO]
- Isolation guarantees: [TODO]
- Common failure mode in tests: [TODO]

### 5) Coverage and Quality Signals

- Coverage tool + threshold: [TODO]
- Current reported coverage: 0 tests / no implementation.
- Known gaps/flaky areas: All test infrastructure is pending.

### 6) Evidence

- `Mosaic_Project_Complete_Plan_Final.md:2354-2415`
- `Mosaic_Project_Complete_Plan_Final.md:3349-3394`
- `frontend/package.json`
- `frontend/src/main.js`
