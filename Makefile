-include .env

export POSTGRES_DB POSTGRES_USER POSTGRES_PASSWORD POSTGRES_PORT DATABASE_URL

POSTGRES_DB ?= mosaic
POSTGRES_USER ?= mosaic
POSTGRES_PORT ?= 5432
DATABASE_URL := $(or $(DATABASE_URL),postgres://$(POSTGRES_USER):$(POSTGRES_PASSWORD)@127.0.0.1:$(POSTGRES_PORT)/$(POSTGRES_DB)?sslmode=disable)

.PHONY: run frontend backend db-up db-down db-migrate build test check clean

run: db-up db-migrate
	@trap 'kill 0' INT TERM; \
		(cd backend && go run ./cmd/api) & \
		(cd frontend && npm run dev -- --host 127.0.0.1) & \
		wait

frontend:
	cd frontend && npm run dev

backend:
	cd backend && go run ./cmd/api

db-up:
	docker compose up -d --wait database

db-down:
	docker compose down

db-migrate:
	@set -eu; \
	for migration in supabase/migrations/*.sql; do \
		echo "Applying $$migration"; \
		docker compose exec -T database psql -U "$${POSTGRES_USER:-mosaic}" -d "$${POSTGRES_DB:-mosaic}" < "$$migration"; \
	done

build:
	cd frontend && npm run build

test:
	cd backend && go test ./...

check:
	POSTGRES_PASSWORD=check docker compose config --quiet
	cd frontend && npm run build
	cd backend && go test ./...

clean:
	rm -rf frontend/dist
