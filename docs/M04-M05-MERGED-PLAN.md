# Mosaic M04/M05 merged implementation plan

This document merges `m_4_5.md`, `m_4_5_revised.md`, and the corresponding
sections of `Mosaic_Project_Complete_Plan_Final.md`. The revised plan wins
where the documents disagree.

## Locked architecture

- Vanilla JavaScript and Vite own the public interface and TMDB catalog views.
- Go owns authentication, validation, sessions, authorization, and business rules.
- PostgreSQL is the account and application-data source of truth.
- The browser never connects directly to PostgreSQL and never stores session
  tokens in `localStorage` or `sessionStorage`.
- M04 is public and must not add account or database requirements.
- M05 protects private routes and APIs; frontend route guards are only a UX
  layer, never the security boundary.

## M04 — public media details

Supported routes are `/media/movie/:id` and `/media/tv/:id`, with a positive
integer ID. The page is directly navigable and refresh-safe, and renders a
backdrop, poster, title, media type, release data, rating, genres, overview,
runtime or season/episode information, people, trailers/providers when
available, and related titles. Missing fields use deliberate fallbacks.

The existing TMDB request/cache layer remains the only catalog client.
Optional supplementary data must fail independently from core details.
Invalid routes, not-found responses, network/rate-limit errors, retry,
loading, and stale-request states are required. API-provided text is escaped,
external links are restricted to safe HTTP(S) destinations, and new-tab links
use `noopener noreferrer`.

## M05 — Go authentication

The first secure milestone is registration, login, logout, session restore,
and `GET /api/v1/auth/me`. Accounts use normalized unique emails and Argon2id
password hashes. Sessions use cryptographically random server-side records;
only a protected cookie crosses the browser boundary. Logout revokes the
database session as well as expiring the cookie.

The schema is introduced through versioned migrations for `users`, `sessions`,
and single-use verification/reset tokens. API errors are consistent and safe;
passwords, cookies, raw session tokens, and reset tokens are never logged.
Origin checks, SameSite/HttpOnly/Secure cookies, CSRF protection for
state-changing requests, rate limiting, and parameterized SQL are required
before production claims are made.

Email verification and password recovery are part of the production gate, but
require an email provider. They remain an explicit follow-up unless local
Mailpit and a deployment email provider are configured.

### Current implementation milestone

The local core milestone now includes registration, login, logout, session
restoration, protected `/dashboard`, an HttpOnly SameSite session cookie,
Argon2id password hashing, PostgreSQL migrations, and a Vite `/api` proxy.
Email verification, password recovery, CSRF tokens for future authenticated
write operations, and distributed rate limiting remain production hardening
work before public launch.

## Execution order

1. M04 route/API/page and responsive acceptance checks.
2. Choose and document the API/database deployment path.
3. Add PostgreSQL migrations and Go database boundaries.
4. Implement password hashing and registration/login handlers.
5. Implement protected sessions, logout, and session restoration.
6. Add login/register UI and session-aware shell behavior.
7. Add email verification, password recovery, rate limits, and production
   deployment checks.

## Sources

- `docs/Mosaic_Project_Complete_Plan_Final.md:66-67, 1980-2117, 3460-3509`
- `m_4_5.md:38-434`
- `m_4_5_revised.md:1-647`
- `frontend/src/api/tmdb.js`
- `frontend/src/main.js`
- `backend/internal/httpserver/server.go`
