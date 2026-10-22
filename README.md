# Mossline

> Mossline 寓意“时间留下的痕迹”。

一套基于 Go/Gin、MySQL 与 React / TypeScript 的内容管理系统，包含公开 Web 站点、Admin 管理端、附件本地存储、Bearer 会话认证和 OpenAPI 文档。

## Docker 启动与管理

安装 Docker Engine 和 Docker Compose v2.24 或更新版本，然后运行：

```sh
cp .env.example .env # 已有 .env 时保留原配置，按 .env.example 补齐新增项
# 编辑 .env，设置数据库密码和初始管理员密码
make docker-up
```

Compose 自动读取 `.env`，构建并启动 MySQL、API、Admin 和 Web，等待健康检查通过后返回。API 启动时自动执行数据库迁移。两个前端共用构建流程，运行时仅包含 Nginx 与静态产物；API 使用多阶段构建并以非 root 用户运行。构建上下文排除环境配置、上传文件和本机依赖。

应用配置统一使用 `MOSSLINE_` 前缀，Docker 专用配置使用 `MOSSLINE_DOCKER_` 前缀，完整中文说明见 `.env.example`。旧版 `DB_*`、`APP_ENV`、`UPLOAD_*` 等名称不再读取；已有部署须按 [变量迁移说明](docs/docker.md#从旧名称迁移) 更新环境变量名称，再重建服务。

| 入口 | 默认地址 |
| --- | --- |
| 公开站点 | http://localhost:8080/ |
| 管理端 | http://localhost:8080/admin/ |
| 接口文档 | http://localhost:8080/docs |
| 健康检查 | http://localhost:8080/healthz |
| API 直连 | http://localhost:8081/ |
| 宿主机 MySQL | `127.0.0.1:3307` |

Web 统一代理 `/admin/`、`/api/`、`/uploads/` 和接口文档，浏览器使用同源请求。Admin 不单独映射宿主机端口。各服务的日志自动轮转，每个服务最多保留 3 个 10 MB 日志文件。

```sh
make docker-ps                   # 查看全部服务及健康状态
make docker-logs SERVICE=api     # 跟踪单个服务日志；省略 SERVICE 查看全部
make docker-up SERVICE=api       # 重建并更新 API，同时启动所需依赖
make docker-up SERVICE=admin     # 单独更新管理端
make docker-restart SERVICE=api  # 重启现有容器
make docker-stop                # 停止容器，保留容器及数据
make docker-down                # 移除容器和网络，保留数据卷
make docker-config              # 校验 Compose 配置
make docker-build               # 仅构建镜像
make docker-migrate             # MySQL 健康后，运行一次性 API 容器执行迁移
```

代码或 `.env` 变更后使用 `docker-up` 更新；`docker-restart` 不会应用新配置。容器数据库固定使用 `mysql:3306`，忽略宿主机的 `MOSSLINE_DATABASE_HOST`、`MOSSLINE_DATABASE_PORT` 和 `MOSSLINE_DATABASE_DSN`，用户名、库名和密码仍由 `MOSSLINE_DATABASE_*` 配置。`MOSSLINE_DOCKER_MYSQL_HOST_PORT`、`MOSSLINE_DOCKER_API_HOST_PORT`、`MOSSLINE_DOCKER_WEB_HOST_PORT` 控制宿主机端口，默认仅监听 `127.0.0.1`；需从其他机器访问时可设置 `MOSSLINE_DOCKER_BIND_IP=0.0.0.0`。修改 `MOSSLINE_HTTP_SHUTDOWN_TIMEOUT` 后，请将 `MOSSLINE_DOCKER_API_STOP_GRACE_PERIOD` 设得更长。

数据库沿用 `mossline_mysql` 命名卷，附件使用 `mossline_uploads` 命名卷，实际卷名带 Compose 项目前缀。保持项目名称不变即可复用原数据库。已有数据卷的 MySQL 账号密码不会随 `.env` 自动修改，需要与数据库中的凭据保持一致。原先 `data/uploads/` 中的附件需要迁入新卷，操作示例见 [Docker 维护说明](docs/docker.md)。常规停机使用 `make docker-down`，`docker compose down -v` 会删除持久化数据。

## 本地开发

前端开发与测试使用 Node.js 24 或更新版本。

1. 复制配置：`cp .env.example .env`，修改数据库密码与初始管理员密码，并通过 shell 或 dotenv 工具载入环境变量。
2. 只启动 MySQL：`make docker-up SERVICE=mysql`；宿主机 API 的 `MOSSLINE_DATABASE_PORT` 应与 `MOSSLINE_DOCKER_MYSQL_HOST_PORT` 一致（默认 `3307`）。
3. 安装前端依赖：`npm --prefix web ci && npm --prefix admin ci`。
4. 迁移数据库：`go run ./cmd/server migrate`。
5. 启动 API：`go run ./cmd/server`。
6. 分别运行 `npm --prefix web run dev` 与 `npm --prefix admin run dev`。

API 默认位于 `http://localhost:8081`，Huma 默认交互式文档位于 `/docs`，原生 OpenAPI 3.1 文档位于 `/openapi.json` 与 `/openapi.yaml`。Vite 开发服务器会将 `/api` 和 `/uploads` 代理到 API。

## 接口文档

接口使用 Huma v2 的官方 Gin 适配器注册，Huma 从 Go 请求、响应类型生成 OpenAPI 3.1，并通过默认的 Stoplight Elements 页面提供文档浏览、请求示例、认证和在线接口调用。无需维护接口注释、HTML 或 YAML。

接口通过 `internal/apidoc.Router` 对接 Huma，在同一处指定请求、响应类型和访问权限；路径参数从路由自动推导，查询参数从结构体的 `query` 标签生成。现有处理函数继续使用 Gin 的参数绑定、业务校验和统一响应，中间件在 Gin 链中执行。服务启动时直接生成当前文档，修改接口后无需额外运行生成器。

运行 `make docs` 可将当前文档导出为 `docs/openapi.json` 和 `docs/openapi.yaml`，无需连接数据库或全局安装工具。修改接口后请更新并提交导出文件；`make build` 会先更新它们。

在文档页面的认证设置中填写登录返回的 token（HTTP Bearer 模式会自动添加前缀），即可调试需要登录的接口。Huma 默认文档页面的前端资源从 unpkg CDN 加载，浏览器需要能够访问该 CDN。

## 验证

```sh
go test ./cmd/... ./internal/... ./migrations/...
npm --prefix web run lint && npm --prefix web run test && npm --prefix web run build
npm --prefix admin run typecheck && npm --prefix admin run lint && npm --prefix admin run test && npm --prefix admin run build
```

针对已启动的完整环境，可设置 `MOSSLINE_SMOKE_API_URL`、`MOSSLINE_SMOKE_ADMIN_USERNAME`、`MOSSLINE_SMOKE_ADMIN_PASSWORD` 后执行 `bash scripts/smoke.sh`。脚本会创建隔离命名的内容、验证权限与错误响应并清理测试内容。

迁移 SQL 位于 `migrations/`，服务会在启动时幂等执行未应用的迁移；也可使用 `make migrate` 独立执行。

## 项目结构

- `cmd/`：服务与文档导出的程序入口
- `internal/`：应用生命周期、HTTP 基础设施及按业务划分的 Go 模块
- `migrations/`：版本化数据库迁移
- `web/`、`admin/`：两个独立前端，内部按 `app`、`features`、`shared` 划分职责
- `docs/`：维护说明、[接口概要](docs/api.md)和生成文档；`reference/` 保存历史需求及状态记录
- `scripts/`：验证脚本

## 开发与维护

目录职责、接口修改流程和验证命令见 [维护说明](docs/maintenance.md)。提交前运行 `make format-check` 检查排版；`make format` 会使用 Go 和各前端项目固定版本的格式化工具统一排版。
