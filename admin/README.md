# Mossline Admin

独立的 React + TypeScript 管理端，开发地址为 `http://localhost:5174/admin/`。

## 本地运行

```bash
npm install
npm run dev
```

开发服务器会将 `/api` 代理到 `http://localhost:8081`。生产构建：

```bash
npm run typecheck
npm run lint
npm run build
```

管理端的文章“前台查看”在本地开发时默认打开
`http://localhost:5173`。如果 Web 端使用其他地址，可设置
`VITE_PUBLIC_SITE_URL`；生产环境未设置时默认使用当前站点同源地址。

产物位于 `admin/dist`，Vite base 为 `/admin/`。生产服务器需要配置：

- `/admin/assets/*` 读取 `admin/dist/assets/*`；
- `/admin/*` history fallback 到 `admin/dist/index.html`；
- `/api/*` 反向代理到 Go 服务；
- `/` 继续使用现有博客前端。

项目已提供 Docker 配置，从根目录运行 `make docker-up` 后访问 `http://localhost:8080/admin/`。管理端由独立容器提供静态文件，经 Web 统一入口代理；单独更新可运行 `make docker-up SERVICE=admin`。详情见 [Docker 维护说明](../docs/docker.md)。

## API 契约

管理端不提供演示数据。接口不可用时页面会展示错误，`/admin/api-status` 可探测主要接口。

- 统一响应：`{ "code": 200, "data": ..., "msg": "" }`；也兼容直接返回 JSON 数据。
- 登录：`POST /api/login`，返回 `{ token, user? }`。
- 当前用户：`GET /api/me`。如果登录响应不包含 user，该接口是完成登录所必需的。
- Token：当前通过 `Authorization: Bearer ...` 发送，并仅存放于 `sessionStorage`。
- 列表查询：`page`、`size`、`search`、`status`、`sort`、`order`。
- 字段错误：建议返回 `errors`、`fieldErrors` 或 `field_errors`，字段值为字符串数组。
- 附件上传：`POST /api/attachment` multipart，字段包括 `file`、`filename`、`relation_type`、`relation_id` 或 `relation_key`。

接口状态及后续增强项见 [接口状态记录](../docs/reference/admin-api-status.md)。

## 源码组织

`src/app` 负责路由、布局和样式，`src/features` 按功能组织页面，`src/shared` 放置跨功能组件、HTTP 客户端、接口路径和工具。测试与代码同目录，执行 `npm run test`。目录约定见 [项目维护说明](../docs/maintenance.md)。
