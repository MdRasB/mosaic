# Codebase Concerns

## Core Sections (Required)

### 1) Top Risks (Prioritized)

| Severity | Concern | Evidence | Impact | Suggested action |
|---|---|---|---|---|
| high | Browser-exposed credentials must not include Supabase secret/service-role keys. | `frontend/src/api/tmdb.js`, `README.md` | Credential exposure could bypass RLS. | Keep only publishable TMDB configuration in the browser; add server-side boundaries before auth/data work. |
| medium | External API terms, quotas, provider links, and free-tier limits can change. | `Mosaic_Project_Complete_Plan_Final.md:1345-1347`, `2248-2267` | Deployment or provider behavior may change. | Re-check official terms before implementation and deployment. |

### 2) Technical Debt

| Debt item | Why it exists | Where | Risk if ignored | Suggested fix |
|---|---|---|---|---|
| Browser-only API integration | The current public V1 calls TMDB from the frontend. | `frontend/src/api/tmdb.js` | The TMDB key is observable and provider quotas apply per client. | Move protected/provider-sensitive requests behind Go when server-side features require them. |

### 3) Security Concerns

| Risk | OWASP category | Evidence | Current mitigation | Gap |
|---|---|---|---|---|
| Misuse of browser-visible credentials | A05 | `frontend/src/api/tmdb.js`, `README.md` | TMDB uses publishable browser configuration; no Supabase secret is exposed. | RLS and protected server-side data access are not implemented yet. |
| Missing server-side admin enforcement | A01 | Planned auth/data modules | Plan requires server-side/strong database policies. | Admin controls are not implemented until those modules are added. |

### 4) Performance and Scaling Concerns

| Concern | Evidence | Current symptom | Scaling risk | Suggested improvement |
|---|---|---|---|---|
| Browser API request volume | `frontend/src/api/tmdb.js`, `frontend/src/components/search/search-suggestions.js` | Explore rows paginate to safe titles and suggestions debounce input. | Provider quotas can still be reached by many users. | Keep caching/debouncing and add server-side controls if traffic grows. |

### 5) Fragile/High-Churn Areas

| Area | Why fragile | Churn signal | Safe change strategy |
|---|---|---|---|
| Frontend/API boundary | Pages consume normalized TMDB objects through `api/tmdb.js`. | M03 added search and suggestions. | Preserve the API normalization boundary as modules expand. |

### 6) `[ASK USER]` Questions

No blocking architecture question is currently open. Authentication, database
policies, and server-side provider boundaries remain intentionally deferred to
their planned modules.

### 7) Evidence

- `README.md`
- `frontend/src/api/tmdb.js`
- `frontend/src/components/search/search-suggestions.js`
- `backend/cmd/api/main.go`
