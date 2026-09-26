# External Integrations

## Core Sections (Required)

### 1) Integration Inventory

| System | Type | Purpose | Auth model | Criticality | Evidence |
|---|---|---|---|---|---|
| TMDB | External API | Public media discovery and provider metadata. | Planned browser API key in V1; privacy requirements must be reviewed at implementation time. | High for Explore. | `Mosaic_Project_Complete_Plan_Final.md:156-183` |
| Supabase Auth/Data/Storage | Managed auth, database, and storage | User accounts, PostgreSQL data, RLS, and photos. | Planned publishable browser key with RLS; secret key server-only. | High for user features. | `Mosaic_Project_Complete_Plan_Final.md:185-201` |
| Go API | Planned HTTP service | Server-side aggregation/business logic in later releases. | [TODO] | Later | `Mosaic_Project_Complete_Plan_Final.md:203-232` |

### 2) Data Stores

| Store | Role | Access layer | Key risk | Evidence |
|---|---|---|---|---|
| Supabase PostgreSQL | User, media, social, photo, and moderation data. | Planned supabase-js in V1; Go/pgx later. | RLS and constraints must be correct. | `Mosaic_Project_Complete_Plan_Final.md:1478-1809` |
| Supabase Storage | Planned photo storage. | Supabase client with access policies. | Free-tier size limits and privacy. | `Mosaic_Project_Complete_Plan_Final.md:1349-1421` |

### 3) Secrets and Credentials Handling

- Credential sources: Planned environment variables; no `.env.example` exists yet.
- Hardcoding checks: No application code exists; scan found no source/config.
- Rotation or lifecycle notes: [TODO]

### 4) Reliability and Failure Behavior

- Retry/backoff behavior: [TODO]
- Timeout policy: [TODO]
- Circuit-breaker or fallback behavior: [TODO]

### 5) Observability for Integrations

- Logging around external calls: [TODO]
- Metrics/tracing coverage: [TODO]
- Missing visibility gaps: All integration observability is unimplemented.

### 6) Evidence

- `Mosaic_Project_Complete_Plan_Final.md:1811-1947`
- `Mosaic_Project_Complete_Plan_Final.md:2194-2267`
- `README.md`
- `.gitignore`
