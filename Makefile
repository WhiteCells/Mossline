.PHONY: migrate server test build lint smoke dev-web dev-admin

migrate:
	go run ./cmd/server migrate

server:
	go run ./cmd/server

test:
	go test ./cmd/... ./internal/... ./migrations/...

build:
	go build ./cmd/server
	npm --prefix web run build
	npm --prefix admin run build

lint:
	npm --prefix web run lint
	npm --prefix admin run lint
	npm --prefix admin run typecheck

smoke:
	bash scripts/smoke.sh

dev-web:
	npm --prefix web run dev

dev-admin:
	npm --prefix admin run dev
