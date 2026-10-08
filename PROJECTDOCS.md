# Mosaic Project Documentation

Mosaic is an open-source media discovery and personal collection platform for
movies and TV shows. The current release is a frontend-first public discovery
application: visitors can explore TMDB-powered media rows, search movies and
TV shows, inspect search suggestions, switch themes, and use the responsive
desktop/mobile shell.

The repository also contains a Go API foundation and PostgreSQL Docker
scaffolding for later modules. Authentication, collections, favorites,
watchlists, ratings, reviews, media details, and user data persistence are
planned but are not implemented in the current source tree.

> **Current implementation note:** This document describes what exists in the
> repository today. Planned directories are preserved with `.gitkeep` files,
> but an empty directory is not a completed feature.

## Quick overview

### What Mosaic does today

- Provides a responsive media-discovery shell for desktop, tablet, and mobile.
- Loads Explore content from TMDB:
  - Trending now
  - Popular movies
  - Popular TV shows
  - Top rated
  - Upcoming
- Attempts to show up to 20 safe, unique titles per Explore section.
- Filters TMDB adult flags and focused explicit sexual-content terms.
- Does not blanket-filter mature content, violence, or gore.
- Provides horizontal row navigation and native horizontal scrolling.
- Provides global search at `/search?q=...`.
- Excludes people from search results and keeps movies and TV shows.
- Supports All, Movies, and TV Shows search filters.
- Supports loading, empty, error, retry, and Load More states.
- Provides debounced search suggestions with keyboard navigation.
- Supports dark/light theme persistence through `localStorage`.
- Provides a Go `/health` endpoint.
- Provides local PostgreSQL infrastructure through Docker Compose.

### What is not implemented yet

- Authentication and account management.
- Media details pages.
- User collections, favorites, and watchlists.
- Ratings, reviews, social features, and profile pages.
- Supabase integration and row-level security.
- Application database schema, seeds, and policies.
- Backend media services and repositories.
- Automated frontend tests and browser end-to-end tests.

## Documentation map

| Document | Purpose |
|---|---|
| [`README.md`](README.md) | Short setup, deployment, licensing, Docker, and TMDB guidance |
| [`docs/codebase/STRUCTURE.md`](docs/codebase/STRUCTURE.md) | Directory map, entrypoints, and module boundaries |
| [`docs/codebase/ARCHITECTURE.md`](docs/codebase/ARCHITECTURE.md) | Data flow and architecture boundaries |
| [`docs/codebase/STACK.md`](docs/codebase/STACK.md) | Runtime, dependencies, and configuration |
| [`docs/codebase/CONVENTIONS.md`](docs/codebase/CONVENTIONS.md) | Naming, imports, formatting, error, and testing conventions |
| [`docs/codebase/INTEGRATIONS.md`](docs/codebase/INTEGRATIONS.md) | External services and integration concerns |
| [`docs/codebase/TESTING.md`](docs/codebase/TESTING.md) | Current test commands and coverage gaps |
| [`docs/codebase/CONCERNS.md`](docs/codebase/CONCERNS.md) | Current risks, technical debt, and scaling concerns |

## Project structure

```text
.
├── backend/
│   ├── cmd/api/main.go                 Go API entrypoint
│   ├── internal/config/config.go       Environment configuration
│   ├── internal/httpserver/server.go   HTTP routes and CORS
│   ├── internal/httpserver/server_test.go
│   ├── .env.example
│   └── go.mod
├── database/
│   ├── policies/                        Planned database policies
│   ├── schema/                         Planned database schema
│   └── seeds/                          Planned seed data
├── docs/codebase/                      Repository knowledge documents
├── frontend/
│   ├── index.html                      Application shell
│   ├── package.json                    Vite scripts
│   ├── package-lock.json               Locked npm dependency graph
│   ├── vite.config.js                  Vite server/build settings
│   ├── public/                         Static assets and config fallback
│   └── src/
│       ├── api/                        TMDB request and normalization layer
│       ├── components/                 Reusable UI components
│       ├── pages/                      Route-level page modules
│       ├── styles/                     Global and responsive CSS
│       ├── utils/                      Small shared utilities
│       └── main.js                     Browser entrypoint and route controller
├── scripts/                            Planned seed/maintenance scripts
├── compose.yml                         Local PostgreSQL service
├── LICENSE                             Apache License 2.0
├── NOTICE                              Project attribution notice
└── PROJECTDOCS.md                      This project-level document
```

Generated files under `frontend/dist/` are Vite build output and are ignored
by Git. They should be regenerated rather than edited manually.

## Application architecture

Mosaic uses a staged frontend-first architecture:

```text
Browser
  |
  v
frontend/index.html
  |
  v
frontend/src/main.js
  |
  +--> page module: Explore or Search
  |       |
  |       v
  |   frontend/src/api/tmdb.js
  |       |
  |       v
  |   TMDB REST API
  |       |
  |       v
  |   normalize + safety filter
  |       |
  |       v
  |   reusable media components
  |
  +--> future Go API and database modules
```

### Layer responsibilities

| Layer | Responsibility |
|---|---|
| `frontend/index.html` | Static application shell and mount points |
| `frontend/src/main.js` | Theme, navigation, route selection, global interactions |
| `frontend/src/pages/` | Page composition and page-level async state |
| `frontend/src/components/` | Reusable markup and UI behavior |
| `frontend/src/api/` | Provider requests, caching, filtering, normalization |
| `frontend/src/styles/` | Tokens, reset, layout, components, pages, responsiveness |
| `backend/internal/` | Private Go server foundation and future server modules |
| `database/` | Future SQL schema, policies, and seed data |

Pages consume normalized Mosaic media objects instead of depending directly on
TMDB field differences. This keeps provider-specific details inside
`frontend/src/api/tmdb.js`.

## Frontend behavior

### Shell and navigation

`frontend/index.html` defines the sidebar, topbar, search form, theme controls,
auth placeholders, profile placeholder, toast, modal, and `#app-content`.

`frontend/src/main.js`:

1. Restores the saved theme.
2. Configures desktop sidebar collapse and mobile drawer behavior.
3. Handles placeholder authentication/profile actions.
4. Prevents the active Explore sidebar link from reloading the current page.
5. Preserves ordinary navigation for Mosaic branding links.
6. Routes `/`, `/explore`, `/search`, and `/media/...`.
7. Handles search submission with `history.pushState`.
8. Rerenders routes when browser Back/Forward emits `popstate`.

### Explore page

`frontend/src/pages/explore/explore.js` owns the public Explore page.

The page loads its featured panel and five media sections independently. Each
section displays loading cards while its request is pending and then renders
cards, an empty state, or an error/retry state.

Rows contain:

- a previous control;
- a horizontally scrollable media row;
- a next control;
- scroll-boundary disabled states;
- resize recalculation;
- mobile swipe support through horizontal overflow.

Render tokens prevent an old asynchronous request from updating a newer page
render. Cleanup functions prevent duplicate retry and resize listeners when
the page is entered repeatedly.

### Global search

The search flow is:

```text
User enters a title
  -> global form submit or suggestion selection
  -> /search?q=title
  -> TMDB /search/multi
  -> remove people and restricted items
  -> normalize movie/TV objects
  -> render reusable media cards
```

Search supports:

- URL-preserved queries;
- refresh and browser history;
- All, Movies, and TV Shows filters;
- loading skeletons;
- no-result state;
- provider error state with retry;
- Load More pagination;
- duplicate removal across appended pages;
- stale-request protection.

The suggestion dropdown starts after two characters and waits 250 ms after the
last input before requesting TMDB results. It supports ArrowUp, ArrowDown,
Enter, Escape, focus reopening, outside-click dismissal, and accessible
combobox/listbox attributes.

## TMDB and content safety

`frontend/src/api/tmdb.js` is the centralized TMDB client.

It:

- reads `VITE_TMDB_API_KEY` through Vite;
- falls back to `window.MOSAIC_CONFIG.tmdbApiKey` for Live Server;
- caches requests by complete URL;
- removes failed requests from the cache so retry works;
- creates TMDB image URLs;
- normalizes movie and TV field differences;
- rejects TMDB `adult: true` items;
- rejects focused sexual-content terms in title, name, and overview;
- excludes people from multi-search and trending rows;
- fetches additional pages for Explore sections until the safe-title target is
  reached or the page limit is exhausted.

The browser-visible TMDB key is public by design in the current frontend-only
release. It must never be replaced with a Supabase secret or service-role key.

## Backend and database foundation

### Go API

`backend/cmd/api/main.go`:

- loads `PORT` and CORS configuration;
- creates an explicitly configured `http.Server`;
- sets read-header, read, write, and idle timeouts;
- listens for interrupt and SIGTERM;
- shuts down gracefully within ten seconds.

`backend/internal/httpserver/server.go`:

- registers `GET /health`;
- returns `{"status":"ok"}`;
- rejects non-GET health requests with HTTP 405;
- handles CORS headers and OPTIONS preflight requests.

`backend/internal/httpserver/server_test.go` uses `httptest` to verify the
health response and method rejection without external services.

### PostgreSQL

`compose.yml` defines PostgreSQL 18 Alpine with:

- database name, user, password, and port from environment variables;
- localhost-only host binding;
- persistent `mosaic-postgres-data` volume;
- read-only schema initialization mount;
- `pg_isready` healthcheck.

The database directories are currently scaffolding. No application schema,
seed data, or policy implementation is present yet.

## Configuration

### Frontend Vite

```bash
cd frontend
cp .env.example .env
# Set VITE_TMDB_API_KEY in frontend/.env
npm install
npm run dev
```

Open `http://localhost:5173` or `/explore`.

### Live Server

Live Server does not load Vite `.env` variables. Use:

```bash
cd frontend
cp config.example.js config.js
# Set tmdbApiKey in frontend/config.js
```

`frontend/config.js` is ignored and must not be committed.

### Backend

```bash
cd backend
go run ./cmd/api
```

The default health endpoint is `http://localhost:8080/health`.

### Docker database

```bash
cp .env.example .env
# Set a local POSTGRES_PASSWORD
docker compose up -d database
docker compose ps
```

Stop the service without deleting the named volume:

```bash
docker compose down
```

## Development and verification

### Frontend

```bash
cd frontend
npm install
npm run dev
npm run build
npm run preview
```

### Backend

```bash
cd backend
gofmt -w .
go test ./...
```

There is currently no frontend unit test runner or automated browser test
suite. TMDB-backed behavior requires manual browser verification with a
configured key.

## Deployment

The frontend is a static Vite application. Existing deployment documentation
uses Cloudflare Pages with:

```text
Production branch: deploy
Root directory: frontend
Build command: npm run build
Output directory: dist
```

Configure `VITE_TMDB_API_KEY` in the Cloudflare Pages project environment. Do
not upload `.env`, `frontend/config.js`, or secret/service-role credentials.

Application work should be made on a feature or fix branch, merged into
`main`, and then synchronized to the deployment branch according to the
repository workflow.

## Current progress and module boundaries

| Area | Status |
|---|---|
| Project structure and documentation | Implemented |
| Docker PostgreSQL foundation | Implemented |
| Go health API foundation | Implemented |
| M01 shell/design foundation | Implemented |
| M02 public Explore | Implemented |
| M03 global search | Implemented |
| M04 media details | Planned |
| M05 authentication | Planned |
| Collections/favorites/watchlist | Planned |
| Ratings/reviews/social features | Planned |
| Database schema and policies | Planned |

M03 ends at search results and navigation to media routes. M04 begins at the
media details experience. Authentication and user-owned features should not be
introduced into the public search layer prematurely.

## Team responsibilities

The project has five team members. Names and student IDs are intentionally left
as editable placeholders so the team can add the correct information later.

| Member | ID | Responsibility |
|---|---:|---|
| **Muhammad Rasek Biswas** | 39 | Project lead, planning, backend, release |
| **Md. Migdadur Rahman Khan** | 46 | TMDB/provider integrations, Integration Testing , Error Handling for External Services, API Key/Security Management |
| **Md. Ashikur Rifat** | 40 | Frontend shell, responsive UI, visual design, accessibility , Doploying MERN Concept (NodeJs , MongoDB, React, HTML, CSS)|
| **Md. Abirul Alam Apurbo** | 59 | Frontend, image/icon generation, future server boundaries, visual design |
| **Rafiur Rahman** | 62 | Testing, documentation, deployment |

### Responsibility boundaries

- The project lead coordinates scope and confirms that module boundaries remain
  aligned with the project plan.
- Frontend/UI work should preserve desktop and mobile behavior and reuse the
  existing component and token systems.
- Provider work should remain centralized in the TMDB API module and must not
  expose secrets.
- Backend/database work should keep server-side credentials and future
  user-owned data away from browser-only code.
- Testing/documentation/deployment work should verify reproducible setup,
  update source documentation, and check production builds.

Replace the placeholder member names and IDs after the team confirms the
assignment. Keep responsibilities explicit when ownership changes.

## License and attribution

Mosaic is licensed under the Apache License 2.0. See [`LICENSE`](LICENSE) and
[`NOTICE`](NOTICE). The license permits use, modification, and redistribution
while requiring preservation of applicable notices and license terms.

TMDB content and imagery remain subject to TMDB's terms and policies. Mosaic's
content-safety filtering is an application policy and is not a replacement for
provider classification or legal review.
