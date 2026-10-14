# Codebase Concerns

## Prioritized risks

| Severity | Concern | Evidence | Mitigation/next step |
|---|---|---|---|
| high | TMDB key is visible in browser output | `frontend/src/api/tmdb.js`, `README.md` | Treat it as public; move sensitive/provider-controlled calls behind Go if required. |
| medium | Uploaded avatar bytes are stored in the profile row | `backend/internal/profile/service.go`, `supabase/migrations/20261014120000_profile_avatar_upload.sql` | Keep the 2 MiB cap; migrate to object storage if profile volume or traffic grows. |
| medium | Free hosting services may sleep or change limits | `docs/deployment/FREE-HOSTING.md` | Recheck provider terms before release and document cold starts. |
| medium | Frontend has no automated browser tests | `frontend/package.json` | Add route/page tests or a browser smoke suite when auth is introduced. |

## Technical debt

- PostgreSQL 18 requires its volume mounted at `/var/lib/postgresql` so the
  image can manage its version-specific data directory.
- Vite output is intentionally non-minified in `frontend/vite.config.js`;
  this improves inspection but increases deployed asset size.
- Frontend has no automated test harness for multipart upload or browser
  navigation.
- Avatar validation limits bytes and MIME signatures but does not enforce
  decoded image dimensions; add bounded image-dimension validation before
  accepting untrusted uploads if avatar usage expands.

## Security gaps

Production sessions use `HttpOnly`, `Secure`, and `SameSite=None`; state
changing requests use an exact configured Origin check. Authentication uses
Argon2id and hashed session tokens. Rate limiting and a browser-level multipart
upload test remain `[TODO]`.

## Evidence

- `frontend/vite.config.js`
- `frontend/src/api/tmdb.js`
- `backend/internal/httpserver/server.go`
- `backend/internal/profile/handler.go`
- `backend/internal/profile/service.go`
- `frontend/src/api/http.js`
- `frontend/src/profile/profile-service.js`
- `supabase/migrations/20261014120000_profile_avatar_upload.sql`
- `database/schema/.gitkeep`
- `docs/M04-M05-MERGED-PLAN.md`
- `docs/deployment/FREE-HOSTING.md`
