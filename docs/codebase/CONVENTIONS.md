# Coding Conventions

## Naming and organization

- JavaScript/CSS files use lowercase kebab-case or established names such as
  `media-details.js` and `main.css`.
- JavaScript functions and variables use camelCase.
- Go packages and files follow standard lowercase Go naming.
- Frontend imports are explicit relative imports; no aliases or barrel files
  are configured.

Evidence: `frontend/src/main.js`, `frontend/src/pages/media/media-details.js`,
`backend/internal/config/config.go`.

## Formatting and checks

No formatter or linter is configured. Existing JavaScript and CSS use two-space
indentation. Go changes should be formatted with `gofmt`. `git diff --check`,
`npm run build`, and `go test ./...` are the available checks.

## Error handling

Frontend pages render explicit loading/error/empty states and log contextual
failures with `console.error`. The TMDB client removes failed requests from
its cache so retry can make a fresh request. Go handlers return HTTP errors;
startup and shutdown failures are logged by `main.go`.

## Security conventions

API-provided strings rendered into HTML pass through `escapeHtml()`. New-tab
external links use `rel="noopener noreferrer"`. Browser configuration is
public; database and future auth secrets must remain backend-only.

## Evidence

- `frontend/src/utils/escape-html.js`
- `frontend/src/api/tmdb.js`
- `frontend/src/pages/explore/explore.js`
- `frontend/src/pages/media/media-details.js`
- `backend/cmd/api/main.go`
- `.gitignore`
