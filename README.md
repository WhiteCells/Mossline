# Mossline

> Mossline 寓意“时间留下的痕迹”。

一套基于 Go/Gin、MySQL 与 React 的内容管理系统，包含公开 Web 站点、Admin 管理端、附件本地存储、Bearer 会话认证和 OpenAPI 文档。

## 本地启动

1. 复制配置：`cp .env.example .env`，修改数据库密码与初始管理员密码，并通过 shell 或 dotenv 工具载入环境变量。
2. 启动 MySQL：`docker compose up -d mysql`。
3. 安装前端依赖：`npm --prefix web ci && npm --prefix admin ci`。
4. 迁移数据库：`go run ./cmd/server migrate`。
5. 启动 API：`go run ./cmd/server`。
6. 分别运行 `npm --prefix web run dev` 与 `npm --prefix admin run dev`。

API 默认位于 `http://localhost:8081`，OpenAPI 文档位于 `/docs` 与 `/openapi.yaml`。Vite 开发服务器会将 `/api` 和 `/uploads` 代理到 API。

## 验证

```sh
go test ./cmd/... ./internal/... ./migrations/...
npm --prefix web run lint && npm --prefix web run build
npm --prefix admin run typecheck && npm --prefix admin run lint && npm --prefix admin run build
```

针对已启动的完整环境，可设置 `MOSSLINE_API_URL`、`MOSSLINE_ADMIN_USER`、`MOSSLINE_ADMIN_PASSWORD` 后执行 `bash scripts/smoke.sh`。脚本会创建隔离命名的内容、验证权限与错误响应并清理测试内容。

迁移 SQL 位于 `migrations/`，服务会在启动时幂等执行未应用的迁移；也可使用 `make migrate` 独立执行。
