# Free hosting plan

## Current decision

Keep the deployed Cloudflare Pages frontend unchanged. The current repository
does not yet have an implemented authentication or database API, so deploying
new backend infrastructure now would add operational risk without serving a
working feature. Module M05 must be implemented before connecting production
accounts or persistent user data.

Cloudflare cannot host the current Go `net/http` server directly as a normal
long-running process. Cloudflare Workers/Pages Functions use an edge runtime,
and D1 is SQLite-compatible rather than PostgreSQL. Moving the backend to
Cloudflare would therefore require a separate Go-to-Workers adaptation and a
database migration. That is not a safe no-break change for the current
application.

## Recommended zero-cost shape

| Layer | Service | Reason |
| --- | --- | --- |
| Static frontend | Cloudflare Pages | The current Vite frontend already deploys here. |
| Go API | Render Free Web Service | Native Go `net/http` deployment without rewriting the API for Workers. |
| PostgreSQL | Supabase Free PostgreSQL | Managed PostgreSQL compatible with the revised M05 schema and migrations. |
| Local development | Docker Compose PostgreSQL + host Go/Vite | Fast feedback and the same database engine as production. |

Cloudflare remains the preferred frontend platform. Use Cloudflare D1 only if
the project intentionally changes its persistence model from PostgreSQL to
SQLite and implements a Workers/Pages Functions backend as a later
architecture migration. Do not introduce D1 beside PostgreSQL.

Render's free service can sleep when idle, so the first API request may be
slow. Supabase's free database is suitable for a student/demo deployment, but
free projects pause after inactivity and have limited storage/egress. Render
also offers free Postgres, but keeping the API and database at separate
providers avoids coupling the database lifecycle to the sleeping Go service.

## Safe rollout order

1. Keep Cloudflare Pages serving the current frontend.
2. Implement and test M05 locally against Docker PostgreSQL.
3. Deploy a Go API to Render Free and PostgreSQL to Supabase Free.
4. Set backend-only `DATABASE_URL` and CORS/API settings in Render.
5. Verify health, migrations, cookies, and authentication before exposing
   private frontend routes.
6. Consider Cloudflare Workers + D1 only as a deliberate future migration,
   not as a parallel database.

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
- <https://developers.cloudflare.com/d1/>
- <https://render.com/docs/free>
- <https://render.com/docs/deploy-go-nethttp>
- <https://supabase.com/pricing>
