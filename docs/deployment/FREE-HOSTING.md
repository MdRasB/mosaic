# Free hosting plan

## Recommended zero-cost shape

| Layer | Service | Reason |
| --- | --- | --- |
| Static frontend | Cloudflare Pages | The current Vite frontend already deploys here. |
| Go API | Render Free Web Service | Native Go `net/http` deployment without rewriting the API for Workers. |
| PostgreSQL | Supabase Free PostgreSQL | Managed PostgreSQL compatible with the revised M05 schema and migrations. |
| Local development | Docker Compose PostgreSQL + host Go/Vite | Fast feedback and the same database engine as production. |

Cloudflare remains the preferred frontend platform. Cloudflare Workers or
Pages Functions are not selected for the Go API because the current service is
a long-running Go HTTP server, and Cloudflare's edge runtime would require a
separate adapter/rewrite. Cloudflare D1 is SQLite-compatible, so it is not a
drop-in replacement for the PostgreSQL persistence model.

Render's free service can sleep when idle, so the first API request may be
slow. Supabase's free database is suitable for a student/demo deployment, but
the project must be treated as non-production until backups, uptime, and
email delivery are deliberately addressed.

## Required deployment configuration

### Cloudflare Pages

- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `dist`
- Public variable: `VITE_TMDB_API_KEY`
- API URL: use a same-origin `/api/v1` proxy when the Pages project is given a
  compatible route; otherwise configure the public API origin and verify
  credentialed cookie behavior with an intentional CORS policy.

### Render

- Build: `go build -o mosaic-api ./cmd/api`
- Start: `./mosaic-api`
- Environment: `PORT`, `DATABASE_URL`, `CORS_ALLOWED_ORIGINS`, and later
  email/rate-limit secrets.
- Never place `DATABASE_URL` or server secrets in `frontend/.env`,
  `VITE_*` variables, JavaScript, or HTML.

### Supabase PostgreSQL

Use the direct PostgreSQL connection string as `DATABASE_URL` in Render,
with the TLS mode required by the provider. Apply versioned migrations
against both a fresh local database and the remote database. Do not rely only
on Docker's first-volume initialization hook.

## Local commands

```bash
cp .env.example .env
make db-up
make run
make check
```

The official platform pages should be checked before deployment because free
limits and policies change:

- <https://developers.cloudflare.com/pages/platform/limits/>
- <https://developers.cloudflare.com/pages/functions/pricing/>
- <https://render.com/docs/free>
- <https://render.com/docs/deploy-go-nethttp>
- <https://supabase.com/pricing>
