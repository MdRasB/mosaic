# MOSAIC

## License

Mosaic is open-source software licensed under the
[Apache License 2.0](LICENSE). The license preserves copyright and license
notices and includes an express patent grant, while allowing free use,
modification, and redistribution.

This license does not prevent copying or forks; it requires recipients to
keep the project’s license and attribution notices. Copyright ownership
remains with the project’s copyright holders. Because Mosaic is developed
with university collaborators, confirm the named copyright holders and
university policies before public release.

### TMDB content safety

Explore requests ask TMDB for non-adult results, then apply a focused safety
check for explicit sexual-content terms. Certification ratings are not used as
a blanket filter because ratings such as `TV-MA` and `NC-17` can also describe
violence or gore. Each section fetches additional TMDB pages until it collects
20 safe, unique titles or reaches the endpoint's available pages.

## Local development

### Frontend

Use Vite for the application server:

```bash
cd frontend
npm install
npm run dev
```

Then open <http://localhost:5173>.

For the public Explore page, from the repository root, add the TMDB key to
`frontend/.env`:

```bash
cp frontend/.env.example frontend/.env
# Set VITE_TMDB_API_KEY in frontend/.env.
```

Open <http://localhost:5173/explore> to browse live TMDB content. The key is
bundled into the browser for this public V1 integration and must not be a
Supabase secret or service-role key.

### Live Server

Live Server does not read `.env` files. To use it, create the ignored local
runtime configuration:

```bash
cp frontend/config.example.js frontend/config.js
# Set tmdbApiKey in frontend/config.js.
```

Open the `frontend/` folder as the Live Server workspace, then browse to its
root URL (usually `http://127.0.0.1:5500/`).

The frontend entrypoint uses relative paths, so opening `frontend/` as the
workspace in a generic Live Server also works. Do not open the repository root
as the Live Server root because the frontend entrypoint is inside `frontend/`.

### Cloudflare Pages deployment

The frontend is a static Vite application. Configure the Cloudflare Pages
project with:

```text
Production branch: deploy
Root directory: frontend
Build command: npm run build
Build output directory: dist
```

Set this production environment variable in Cloudflare Pages:

```text
VITE_TMDB_API_KEY=your_tmdb_key
```

Cloudflare Pages runs the Vite build with that variable; do not upload
`frontend/.env`, `frontend/config.js`, or any other credential file. The
`deploy` branch is for deployment synchronization only. Application changes
must be made on a `feature/<kebab-case-description>` or
`fix/<kebab-case-description>` branch and merged into `main` first.

### Backend health endpoint

The Go API is a small M00 foundation service:

```bash
cd backend
go run ./cmd/api
```

Check <http://localhost:8080/health>.

### Local database

The initial local database runs as PostgreSQL through Docker Compose.

```bash
cp .env.example .env
# Change POSTGRES_PASSWORD in .env for local use.
docker compose up -d database
docker compose ps
```

By default, the database is available at `localhost:5432`; if `POSTGRES_PORT` is set in `.env`, connect using that host port.
Data is persisted in the `mosaic-postgres-data` Docker volume. SQL files placed
in `database/schema/` are applied automatically when the database volume is
created.

To stop the database without deleting its data:

```bash
docker compose down
```
