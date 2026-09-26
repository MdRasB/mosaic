# MOSAIC

## Local database

The initial local database runs as PostgreSQL through Docker Compose.

```bash
cp .env.example .env
# Change POSTGRES_PASSWORD in .env for local use.
docker compose up -d database
docker compose ps
```

By default, the database is available at `localhost:5432`; if `POSTGRES_PORT` is set in `.env`, connect using that host port.
`mosaic-postgres-data` Docker volume. SQL files placed in `database/schema/`
are applied automatically when the database volume is created.

To stop the database without deleting its data:

```bash
docker compose down
```
