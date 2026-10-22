# Docker 维护说明

## 服务与配置

`compose.yaml` 管理 `mysql`、`api`、`admin` 和 `web`。Web 是浏览器统一入口，Admin 只提供 `/admin/` 静态页面；Web 将 API、附件和文档请求代理到 API。API 等待 MySQL 的实际应用账号查询成功后启动，Web 等待 API 和 Admin 健康后启动。

`docker/api.Dockerfile` 使用与 `go.mod` 一致的 Go 工具链编译，运行镜像只包含程序、证书和时区数据。`docker/frontend.Dockerfile` 使用 `FRONTEND_DIR` 参数选择前端，并通过 `web` / `admin` 构建目标放置静态文件和 Nginx 配置。依赖清单先于源码复制，以复用依赖安装层；前端通过锁文件和 `npm ci` 安装。Dockerfile 同时兼容 BuildKit 与传统构建器。

Web 使用 Docker 内置 DNS 动态解析上游，单独更新 API 或 Admin 后无需重启 Web。静态资源缺失时返回 404，页面路由回退到各自的 `index.html`。带哈希的资源长期缓存，HTML 每次重新验证。

API 构建默认使用官方 Go 模块代理。网络无法访问 `proxy.golang.org` 时，可在 `.env` 设置 `MOSSLINE_DOCKER_GO_PROXY=https://goproxy.cn,direct` 后重新构建；该选项仅用于构建，不影响运行时数据库连接。

Compose 自动读取项目根目录的 `.env`，只将显式列出的运行参数注入 API，数据库 root 密码仅交给 MySQL。`MOSSLINE_STORAGE_LOCAL_DIR` 固定为容器内的 `/app/data/uploads`。默认代理本地附件路径 `/uploads/`；若修改 `MOSSLINE_STORAGE_PUBLIC_URL` 为其他本地路径，需要同步修改 Web 的 Nginx 代理规则。使用外部 HTTP(S) 附件 URL 时，应自行提供该地址的文件访问服务。

`MOSSLINE_DATABASE_USERNAME` 必须是普通应用账号（默认 `mossline`），不能设为 `root`。官方 MySQL 镜像通过 `MYSQL_USER` 创建普通账号，传入 `root` 会在初始化前直接退出；root 密码应由 `.env` 中的 `MOSSLINE_DOCKER_MYSQL_ROOT_PASSWORD` 单独配置，Compose 将其映射为 MySQL 官方变量 `MYSQL_ROOT_PASSWORD`。遇到 MySQL unhealthy 时先运行 `docker compose logs --tail=100 mysql` 查看实际错误。

`make docker-up` 失败后会自动打印容器状态及 MySQL、API 最近的日志；也可随时执行 `make docker-diagnose` 获取这些信息。`unhealthy` 只是健康检查的结果，具体原因需要结合日志判断；不要通过删除数据卷来尝试修复。

终端中已导出的环境变量优先于 `.env`。即使文件已改为 `MOSSLINE_DATABASE_USERNAME=mossline`，此前通过 `export` 或 dotenv 加载的 `MOSSLINE_DATABASE_USERNAME=root` 仍可能覆盖它。在启动终端执行 `unset MOSSLINE_DATABASE_USERNAME` 后重新运行 `make docker-up`。管理命令会先检查有效账号，发现 `root` 时直接报错，避免等到容器健康检查失败。已有数据库卷不会根据新的环境变量重置账号或密码。

服务变为 unhealthy 后 Docker 不会仅因健康检查失败而重启它；`restart: unless-stopped` 负责进程退出后的恢复。可通过 `make docker-ps` 和 `make docker-logs SERVICE=api` 排查。Compose 的依赖检查用于启动顺序，不会持续级联停止其他容器。

## 环境变量命名与容器映射

应用在宿主机和容器中统一读取 `MOSSLINE_*`；`MOSSLINE_DOCKER_*` 由 Compose 读取，用于构建和宿主机端口等部署配置。`.env.example` 提供中文注释，Go 程序不会自行读取 `.env`。

| 变量组 | 用途 |
| --- | --- |
| `MOSSLINE_ENV` | 运行环境，可选 development、test、production |
| `MOSSLINE_HTTP_*` | 监听地址、读写与关闭超时、可信代理网段 |
| `MOSSLINE_DATABASE_*` | 数据库连接、完整 DSN、字符集、连接池 |
| `MOSSLINE_BOOTSTRAP_ADMIN_*` | 没有用户时创建首个管理员 |
| `MOSSLINE_AUTH_*` | 会话时长、随机令牌字节数 |
| `MOSSLINE_STORAGE_*` | 附件目录、公开路径、大小限制、MIME 类型 |
| `MOSSLINE_CORS_*` | 跨域来源与凭据设置 |
| `MOSSLINE_DOCKER_*` | 构建代理、MySQL root 密码、端口映射、停机等待时间 |
| `MOSSLINE_SMOKE_*` | 冒烟脚本的 API 地址与管理员凭据，不传入应用容器 |

| 项目配置 | 容器内的变量或行为 |
| --- | --- |
| `MOSSLINE_DATABASE_NAME` | MySQL 的 `MYSQL_DATABASE`，API 使用同名项目变量 |
| `MOSSLINE_DATABASE_USERNAME` | MySQL 的 `MYSQL_USER`，API 使用同名项目变量 |
| `MOSSLINE_DATABASE_PASSWORD` | MySQL 的 `MYSQL_PASSWORD`，API 使用同名项目变量 |
| `MOSSLINE_DOCKER_MYSQL_ROOT_PASSWORD` | 仅映射到 MySQL 的 `MYSQL_ROOT_PASSWORD` |
| `MOSSLINE_DOCKER_GO_PROXY` | API 构建参数 `GOPROXY`，不注入运行容器 |
| `MOSSLINE_DOCKER_MYSQL_HOST_PORT`、`MOSSLINE_DOCKER_API_HOST_PORT`、`MOSSLINE_DOCKER_WEB_HOST_PORT` | 宿主机端口，容器内端口固定为 3306、8081、80 |
| `MOSSLINE_DOCKER_BIND_IP` | 宿主机端口绑定地址，默认 127.0.0.1 |
| `MOSSLINE_DOCKER_API_STOP_GRACE_PERIOD` | Docker 等待 API 退出的时长，应大于 HTTP 关闭超时 |

Compose 中 API 固定使用 `MOSSLINE_HTTP_ADDR=:8081`、`MOSSLINE_DATABASE_HOST=mysql`、`MOSSLINE_DATABASE_PORT=3306`，完整 DSN 留空，附件驱动为 local，目录为 `/app/data/uploads`。宿主机连接配置不会覆盖这些容器内部地址。本地直接运行 Go 时，将 `MOSSLINE_DATABASE_PORT` 设为 MySQL 映射到宿主机的端口（默认 3307）。

### 从旧名称迁移

旧变量名不再读取。已有 `.env` 需保留原值，仅更新名称；不要直接覆盖数据库密码和管理员凭据。

| 旧名称 | 新名称 |
| --- | --- |
| `APP_ENV` | `MOSSLINE_ENV` |
| `SERVER_ADDR` | `MOSSLINE_HTTP_ADDR` |
| `SERVER_READ_TIMEOUT` | `MOSSLINE_HTTP_READ_TIMEOUT` |
| `SERVER_WRITE_TIMEOUT` | `MOSSLINE_HTTP_WRITE_TIMEOUT` |
| `SERVER_SHUTDOWN_TIMEOUT` | `MOSSLINE_HTTP_SHUTDOWN_TIMEOUT` |
| `TRUSTED_PROXY_CIDRS` | `MOSSLINE_HTTP_TRUSTED_PROXY_CIDRS` |
| `DATABASE_URL` | `MOSSLINE_DATABASE_DSN` |
| `DB_HOST` | `MOSSLINE_DATABASE_HOST` |
| `DB_PORT` | `MOSSLINE_DATABASE_PORT` |
| `DB_NAME` | `MOSSLINE_DATABASE_NAME` |
| `DB_USER` | `MOSSLINE_DATABASE_USERNAME` |
| `DB_PASSWORD` | `MOSSLINE_DATABASE_PASSWORD` |
| `DB_CHARSET` | `MOSSLINE_DATABASE_CHARSET` |
| `DB_TIMEZONE` | `MOSSLINE_DATABASE_TIMEZONE` |
| `DB_MAX_OPEN_CONNS` | `MOSSLINE_DATABASE_MAX_OPEN_CONNS` |
| `DB_MAX_IDLE_CONNS` | `MOSSLINE_DATABASE_MAX_IDLE_CONNS` |
| `DB_CONN_MAX_LIFETIME` | `MOSSLINE_DATABASE_CONN_MAX_LIFETIME` |
| `DB_CONN_MAX_IDLE_TIME` | `MOSSLINE_DATABASE_CONN_MAX_IDLE_TIME` |
| `AUTH_SESSION_TTL` | `MOSSLINE_AUTH_SESSION_TTL` |
| `AUTH_TOKEN_BYTES` | `MOSSLINE_AUTH_TOKEN_BYTES` |
| `BOOTSTRAP_ADMIN_USERNAME` | `MOSSLINE_BOOTSTRAP_ADMIN_USERNAME` |
| `BOOTSTRAP_ADMIN_PASSWORD` | `MOSSLINE_BOOTSTRAP_ADMIN_PASSWORD` |
| `BOOTSTRAP_ADMIN_EMAIL` | `MOSSLINE_BOOTSTRAP_ADMIN_EMAIL` |
| `STORAGE_DRIVER` | `MOSSLINE_STORAGE_DRIVER` |
| `UPLOAD_DIR` | `MOSSLINE_STORAGE_LOCAL_DIR` |
| `UPLOAD_PUBLIC_URL` | `MOSSLINE_STORAGE_PUBLIC_URL` |
| `UPLOAD_MAX_BYTES` | `MOSSLINE_STORAGE_MAX_UPLOAD_BYTES` |
| `UPLOAD_ALLOWED_MIME_TYPES` | `MOSSLINE_STORAGE_ALLOWED_MIME_TYPES` |
| `CORS_ALLOWED_ORIGINS` | `MOSSLINE_CORS_ALLOWED_ORIGINS` |
| `CORS_ALLOW_CREDENTIALS` | `MOSSLINE_CORS_ALLOW_CREDENTIALS` |
| `DOCKER_BIND_IP` | `MOSSLINE_DOCKER_BIND_IP` |
| `MYSQL_PORT` | `MOSSLINE_DOCKER_MYSQL_HOST_PORT` |
| `API_PORT` | `MOSSLINE_DOCKER_API_HOST_PORT` |
| `WEB_PORT` | `MOSSLINE_DOCKER_WEB_HOST_PORT` |
| `DOCKER_STOP_GRACE_PERIOD` | `MOSSLINE_DOCKER_API_STOP_GRACE_PERIOD` |
| `DOCKER_GOPROXY` | `MOSSLINE_DOCKER_GO_PROXY` |
| `MYSQL_ROOT_PASSWORD` | `MOSSLINE_DOCKER_MYSQL_ROOT_PASSWORD` |
| `MOSSLINE_API_URL` | `MOSSLINE_SMOKE_API_URL` |
| `MOSSLINE_ADMIN_USER` | `MOSSLINE_SMOKE_ADMIN_USERNAME` |
| `MOSSLINE_ADMIN_PASSWORD` | `MOSSLINE_SMOKE_ADMIN_PASSWORD` |

旧 `AUTH_SESSION_HOURS` 不再读取，请改用带单位的 `MOSSLINE_AUTH_SESSION_TTL`，例如 `24h`。更新后运行 `make docker-config` 和 `make docker-up`，继续使用原数据库和附件卷。

## 数据持久化与迁移

数据库和附件分别存放在 `mossline_mysql`、`mossline_uploads` 命名卷。沿用原项目目录或固定同一个 Compose 项目名，避免意外创建空的新卷。服务更新使用 `make docker-up`，常规关闭使用 `make docker-down`。

API 启动时自动迁移，也可在 MySQL 启动且健康后独立执行：

```sh
make docker-up SERVICE=mysql
make docker-build SERVICE=api
make docker-migrate
```

从原宿主机 API 切换到容器 API 时，数据库卷可以继续使用。附件须从 `data/uploads/` 复制到容器卷；在首次启动 API 前执行，避免与上传操作并发：

```sh
make docker-build SERVICE=api
docker compose run --rm --no-deps --user root --entrypoint sh \
  -v "$PWD/data/uploads:/source:ro" api \
  -c 'cp -a /source/. /app/data/uploads/ && chown -R 10001:10001 /app/data/uploads'
make docker-up
```

新卷中的目录默认归 API 的 UID/GID `10001:10001` 所有；从宿主机导入或恢复文件后需恢复该所有权。

## 备份与恢复

数据库备份使用容器内的应用账号，不在命令中展开密码：

```sh
docker compose exec -T mysql sh -c \
  'MYSQL_PWD="$MYSQL_PASSWORD" exec mysqldump --no-tablespaces --single-transaction --skip-lock-tables -u "$MYSQL_USER" "$MYSQL_DATABASE"' \
  > mossline-db.sql
```

附件备份使用一次性容器读取同一个卷：

```sh
docker compose run --rm --no-deps --entrypoint tar api \
  -C /app/data/uploads -czf - . > mossline-uploads.tar.gz
```

需要一致的数据库与附件快照时，先停止 Web 和 API，完成两份备份后再通过 `make docker-up` 恢复服务。不要将备份文件放入版本库。

恢复数据库会写入目标数据库，应先停止 API 并确认使用正确的项目和备份；在空数据库或已处理冲突的目标数据库上执行：

```sh
docker compose exec -T mysql sh -c \
  'MYSQL_PWD="$MYSQL_PASSWORD" exec mysql -u "$MYSQL_USER" "$MYSQL_DATABASE"' \
  < mossline-db.sql
docker compose run --rm --no-deps -T --user root --entrypoint sh api \
  -c 'tar -C /app/data/uploads -xzf - && chown -R 10001:10001 /app/data/uploads' \
  < mossline-uploads.tar.gz
make docker-up
```

## 验证

```sh
make docker-config
make docker-build
make docker-up
curl --fail http://localhost:8080/healthz
curl --fail http://localhost:8080/admin/
MOSSLINE_SMOKE_API_URL=http://localhost:8080 \
MOSSLINE_SMOKE_ADMIN_USERNAME=admin \
MOSSLINE_SMOKE_ADMIN_PASSWORD='实际管理员密码' make smoke
```

冒烟测试会创建并清理测试内容，应在测试环境执行。验证另一套隔离环境时，使用 `docker compose --env-file <测试配置> -p <独立项目名>`，并为三个宿主机端口设置空闲值，避免连接现有数据卷或占用现有端口。
