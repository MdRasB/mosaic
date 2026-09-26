# Codebase Concerns

## Core Sections (Required)

### 1) Top Risks (Prioritized)

| Severity | Concern | Evidence | Impact | Suggested action |
|---|---|---|---|---|
| high | The repository has no runnable application or configured dependencies yet. | `README.md`, `.gitignore` | Foundation work cannot be verified until initialized. | Implement M00 in a follow-up change. |
| high | Browser-exposed credentials must not include Supabase secret/service-role keys. | `Mosaic_Project_Complete_Plan_Final.md:185-201`, `2194-2216` | Credential exposure could bypass RLS. | Add env templates and review configuration before auth/data work. |
| medium | External API terms, quotas, provider links, and free-tier limits can change. | `Mosaic_Project_Complete_Plan_Final.md:1345-1347`, `2248-2267` | Deployment or provider behavior may change. | Re-check official terms before implementation and deployment. |

### 2) Technical Debt

| Debt item | Why it exists | Where | Risk if ignored | Suggested fix |
|---|---|---|---|---|
| No implementation baseline | Repository is at the structure-only stage. | Repository root | Features cannot be developed consistently. | Initialize Vite, environment handling, and the application shell. |

### 3) Security Concerns

| Risk | OWASP category | Evidence | Current mitigation | Gap |
|---|---|---|---|---|
| Misuse of browser-visible credentials | A05 | `Mosaic_Project_Complete_Plan_Final.md:185-201`, `2194-2216` | Plan distinguishes publishable and secret keys. | No env/config or RLS implementation exists yet. |
| Missing server-side admin enforcement | A01 | `Mosaic_Project_Complete_Plan_Final.md:1801-1809` | Plan requires server-side/strong database policies. | Admin controls are not implemented. |

### 4) Performance and Scaling Concerns

| Concern | Evidence | Current symptom | Scaling risk | Suggested improvement |
|---|---|---|---|---|
| No implementation or performance baseline | `README.md`, `.gitignore` | No measurable runtime behavior. | Unknown until features exist. | Add targeted performance checks with relevant modules. |

### 5) Fragile/High-Churn Areas

| Area | Why fragile | Churn signal | Safe change strategy |
|---|---|---|---|
| `.gitignore`, `README.md` | Only files with recent history. | Scan reports 2 and 1 commits respectively. | Preserve existing user changes; update only when foundation needs it. |

### 6) `[ASK USER]` Questions

1. [ASK USER] Should the optional Go skeleton be initialized now in M00, or remain directory-only until a server-side feature requires it?
2. [ASK USER] Should the planned documentation files under `docs/` be created in the next implementation step, or maintained separately from the repository?

### 7) Evidence

- `README.md`
- `.gitignore`
- `Mosaic_Project_Complete_Plan_Final.md:1769-1809`
- `Mosaic_Project_Complete_Plan_Final.md:2194-2267`
