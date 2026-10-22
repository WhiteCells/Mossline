.PHONY: docs migrate server test build lint format format-check smoke dev-web dev-admin
.DEFAULT_GOAL := docs

DOCKER_COMPOSE ?= docker compose
SERVICE ?=

.PHONY: docker-config docker-build docker-up docker-down docker-stop docker-restart docker-logs docker-ps docker-migrate docker-diagnose

docker-config:
	$(DOCKER_COMPOSE) config --quiet
	@$(DOCKER_COMPOSE) config --environment | awk '/^MOSSLINE_DATABASE_USERNAME=root$$/ { print "错误：Compose 的有效配置为 MOSSLINE_DATABASE_USERNAME=root。MySQL 需要普通应用账号；请将 .env 中 MOSSLINE_DATABASE_USERNAME 设为 mossline，并执行 unset MOSSLINE_DATABASE_USERNAME 清除终端中的覆盖值。" > "/dev/stderr"; exit 1 }'

docker-build: docker-config
	$(DOCKER_COMPOSE) build $(SERVICE)

docker-up: docker-config
	$(DOCKER_COMPOSE) up -d --build --wait $(SERVICE) || { compose_exit_code=$$?; $(MAKE) --no-print-directory docker-diagnose; exit $$compose_exit_code; }

docker-diagnose:
	$(DOCKER_COMPOSE) ps -a
	$(DOCKER_COMPOSE) logs --no-color --tail=60 mysql api

docker-down:
	$(DOCKER_COMPOSE) down

docker-stop:
	$(DOCKER_COMPOSE) stop $(SERVICE)

docker-restart:
	$(DOCKER_COMPOSE) restart $(SERVICE)

docker-logs:
	$(DOCKER_COMPOSE) logs --follow --tail=100 $(SERVICE)

docker-ps:
	$(DOCKER_COMPOSE) ps -a

docker-migrate: docker-config
	$(DOCKER_COMPOSE) run --rm --no-deps api migrate

docs:
	go run ./cmd/docs

migrate:
	go run ./cmd/server migrate

server:
	go run ./cmd/server

test:
	go test ./cmd/... ./internal/... ./migrations/...

build: docs
	go build ./cmd/server
	npm --prefix web run build
	npm --prefix admin run build

lint:
	npm --prefix web run typecheck
	npm --prefix web run lint
	npm --prefix admin run lint
	npm --prefix admin run typecheck

format:
	gofmt -w cmd internal migrations
	npm --prefix web run format
	npm --prefix admin run format

format-check:
	@test -z "$$(gofmt -l cmd internal migrations)" || { gofmt -l cmd internal migrations; exit 1; }
	npm --prefix web run format:check
	npm --prefix admin run format:check

smoke:
	bash scripts/smoke.sh

dev-web:
	npm --prefix web run dev

dev-admin:
	npm --prefix admin run dev
