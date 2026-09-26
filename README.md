# MOSAIC

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

Then open `frontend/index.html` through Live Server. The committed example
files intentionally contain no credentials.

The frontend entrypoint uses relative paths, so opening `frontend/` as the
workspace in a generic Live Server also works. Do not open the repository root
as the Live Server root because the frontend entrypoint is inside `frontend/`.

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
