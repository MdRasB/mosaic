# Mosaic Project Documentation

Mosaic is an open-source media discovery and personal collection platform for
movies and TV shows. The current release is a frontend-first public discovery
application: visitors can explore TMDB-powered media rows, search movies and
TV shows, inspect search suggestions, switch themes, and use the responsive
desktop/mobile shell.

The repository also contains the Go API, PostgreSQL scaffolding, and the
public M04 media-details page. Signed-in users get Go-owned accounts and
profiles plus three personal lists: a collection, favorites, and a watchlist
with per-title status. Ratings, reviews, social features, and photos remain
planned for later modules.

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
- Provides public `/media/movie/:id` and `/media/tv/:id` details pages with
  loading, invalid-route, retry, related-media, and metadata states.
- Provides email/password accounts with an HttpOnly session cookie, Argon2id
  password hashing, session restore, and protected routes.
- Provides a profile with username, display name, bio, visibility, and avatar
  upload.
- Provides `/collection` and `/favorites` pages with type and sort filters.
- Provides `/watchlist` with add/remove from the media details page, type and
  status filters, sorting, and per-title status transitions.

### What is not implemented yet

- Ratings and reviews.
- Status tracking dashboards (for example "continue watching" and "completed").
- Social features: friends, activity, notifications, and comparison.
- Photos and albums.
- Row-level security policies and automated frontend/browser tests.

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
| [`docs/Mosaic_Project_Complete_Plan_Final.md`](docs/Mosaic_Project_Complete_Plan_Final.md) | Canonical project plan and module roadmap |
| [`docs/deployment/FREE-HOSTING.md`](docs/deployment/FREE-HOSTING.md) | Free hosting and local deployment model |

## Project structure

```text
.
├── backend/
│   ├── cmd/api/main.go                 Go API entrypoint
│   ├── internal/auth/                  Registration, login, sessions, Argon2id
│   ├── internal/profile/               Profile reads, updates, avatar storage
│   ├── internal/domain/collection/     Collection, favorites, watchlist
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
│       ├── auth/                       Session API client
│       ├── collection/                 Collection and favorites API client
│       ├── watchlist/                  Watchlist API client
│       ├── profile/                    Profile API client and avatar helpers
│       ├── components/                 Reusable UI components
│       ├── pages/                      Route-level page modules
│       ├── styles/                     Global and responsive CSS
│       ├── utils/                      Small shared utilities
│       └── main.js                     Browser entrypoint and route controller
├── supabase/migrations/               Versioned PostgreSQL migrations
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
6. Routes `/`, `/explore`, `/search`, and `/media/...` publicly, and
   `/collection`, `/favorites`, `/watchlist`, `/profile`, `/settings/profile`,
   and `/dashboard` for signed-in users.
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

## Personal lists

Collection, favorites, and watchlist are three views over one `user_media`
relationship, not three tables. The Go API owns every read and write and filters
each query by the authenticated `user_id`.

| List | Membership marker | Page |
|---|---|---|
| Collection | `in_collection` | `/collection` |
| Favorites | `is_favorite` (with `favorited_at`) | `/favorites` |
| Watchlist | `status IS NOT NULL` | `/watchlist` |

Watchlist status is one of `watchlist`, `watching`, `completed`, `paused`, or
`dropped`. `user_media` rows are deleted only once a title belongs to no list,
so removing a collection entry keeps a favorite or watchlist status intact.

`frontend/src/pages/watchlist/watchlist.js` reads `type`, `status`, and `sort`
from the query string so the view is refresh- and history-safe, renders
loading/empty/error states with retry, and applies status changes and removals
without a full reload.

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
- registers the auth, profile, collection, favorites, and watchlist routes when
  a database pool is configured;
- handles CORS headers and OPTIONS preflight requests.

`backend/internal/httpserver/server_test.go` uses `httptest` to verify the
health response and method rejection without external services.

### Personal-list API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/collection` | Saved collection, with `type`, `sort`, `limit`, `offset` |
| POST | `/api/v1/collection` | Add a title to the collection |
| DELETE | `/api/v1/collection/{id}` | Remove a title from the collection |
| PUT/DELETE | `/api/v1/collection/{id}/favorite` | Set or clear a favorite |
| GET | `/api/v1/collection/check` | Saved state for one title |
| GET | `/api/v1/favorites` | Favorite titles |
| PUT | `/api/v1/favorites/media` | Favorite a title directly |
| GET | `/api/v1/watchlist` | Watchlisted titles, with `type`, `status`, `sort`, `limit`, `offset` |
| POST | `/api/v1/watchlist` | Add a title to the watchlist |
| DELETE | `/api/v1/watchlist/{id}` | Remove a title from the watchlist |
| PUT | `/api/v1/watchlist/{id}/status` | Set watchlist status |

Watchlist status must be one of `watchlist`, `watching`, `completed`, `paused`,
or `dropped`; the database enforces the same list with a check constraint.

### PostgreSQL

`compose.yml` defines PostgreSQL 18 Alpine with:

- database name, user, password, and port from environment variables;
- localhost-only host binding;
- persistent `mosaic-postgres-data` volume;
- read-only schema initialization mount;
- `pg_isready` healthcheck.

The `database/` directories are still scaffolding. The applied schema lives in
`supabase/migrations/` and is the source of truth: accounts and sessions,
profiles and avatar bytes, saved media with collection/favorite membership,
and the watchlist status constraint. `make db-migrate` applies those files
locally, and the Supabase GitHub integration applies pending files in
production. No seed data or row-level security policies exist yet.

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
| M04 media details | Implemented |
| M05 authentication | Implemented |
| M06 profile | Implemented |
| M07 collection | Implemented |
| M08 favorites | Implemented |
| M09 watchlist | Implemented |
| M10 status dashboards | Planned |
| M11 ratings and reviews | Planned |
| Social, photos, and multi-media types | Planned |
| Row-level security policies | Planned |

M03 ends at search results and navigation to media routes. M09 completes the
first personal-collection slice: saved titles, favorites, and the watchlist with
status transitions. Status dashboards, ratings, and reviews build on that
relationship and should not be introduced into the public search layer
prematurely.

## Team responsibilities

The project has five team members. Names and student IDs are intentionally left
as editable placeholders so the team can add the correct information later.

| Member | ID | Responsibility |
|---|---:|---|
| **Muhammad Rasek Biswas** | 39 | Project lead, planning, backend, deployment, database |
| **Md. Migdadur Rahman Khan** | 46 | TMDB/provider integrations, Integration Testing , Error Handling for External Services, API Key/Security Management |
| **Md. Ashikur Rifat** | 40 | Frontend shell, responsive UI, visual design, accessibility , Doploying MERN Concept (NodeJs , MongoDB, React, HTML, CSS)|
| **Md. Abirul Alam Apurbo** | 59 | Frontend, communication, image/icon generation, future server boundaries, visual design |
| **Rafiur Rahman** | 62 | Testing, documentation, design |

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
