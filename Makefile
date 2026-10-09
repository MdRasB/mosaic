.PHONY: run frontend backend db-up db-down build test check clean

run: db-up
	@trap 'kill 0' INT TERM; \
		(cd backend && go run ./cmd/api) & \
		(cd frontend && npm run dev -- --host 127.0.0.1) & \
		wait

frontend:
	cd frontend && npm run dev

backend:
	cd backend && go run ./cmd/api

db-up:
	docker compose up -d database

db-down:
	docker compose down

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
