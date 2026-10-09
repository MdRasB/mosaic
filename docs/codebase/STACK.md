# Technology Stack

## Runtime summary

| Area | Current implementation | Evidence |
|---|---|---|
| Frontend | Vanilla JavaScript ES modules | `frontend/src/main.js` |
| Frontend tooling | Vite 7.x, npm | `frontend/package.json`, `frontend/vite.config.js` |
| Backend | Go 1.27, `net/http` | `backend/go.mod`, `backend/cmd/api/main.go` |
| Database | PostgreSQL 18 through Docker Compose | `compose.yml`, `.env.example` |
| Production frontend | Cloudflare Pages-compatible static Vite output | `README.md`, `frontend/package.json` |

## Dependencies

The frontend currently has only Vite as a development dependency. The browser
calls TMDB through the native Fetch API. The Go backend uses `pgx/v5` for
PostgreSQL access and `golang.org/x/crypto/argon2` for password hashing.

## Commands

```bash
make run
make check
make build
make test
```

Equivalent frontend/backend commands are documented in `README.md`.

## Configuration

- `frontend/.env.example`: public `VITE_TMDB_API_KEY`.
- `frontend/config.example.js`: ignored Live Server runtime configuration.
- `.env.example`: local PostgreSQL variables.
- Backend `PORT` and `CORS_ALLOWED_ORIGINS` are read by
  `backend/internal/config/config.go`.
- Backend `DATABASE_URL`, `SESSION_COOKIE_NAME`, and `APP_ENV` configure
  authentication and session cookies.

## Evidence

- `frontend/package.json`
- `frontend/vite.config.js`
- `frontend/src/api/tmdb.js`
- `backend/go.mod`
- `backend/internal/config/config.go`
- `compose.yml`
- `Makefile`
