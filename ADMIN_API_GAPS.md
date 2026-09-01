# Admin API 缺失项

管理端已按真实接口接入，但当前 Go 后端仅实现了无鉴权的 `GET /users/{id}` 示例。因此下列能力需要后端实现后才能完成端到端操作。

## P0：认证与权限

- `POST /api/login`、`POST /api/logout`、`GET /api/me`。
- 用户需增加 `username`、`password_hash`、`avatar`、`email`、`role`、`status`；不得保存明文密码。
- 所有管理写接口统一鉴权和服务端授权；前端路由守卫不是安全边界。
- 明确 Token 过期、撤销、刷新机制，增加登录限流、失败锁定与审计。
- 如果改用 Cookie 会话，应使用 Secure、HttpOnly、SameSite，并增加 CSRF 防护。

## P0：统一资源接口

- 控制台：`GET /api/dashboard`，返回 stats、recent_posts，可选 recent_operations、storage、system。
- 用户：`/api/users` 的分页 CRUD、状态更新与批量删除。
- 文章：`/api/post` 的分页、详情、CRUD、批量状态、置顶与定时发布。
- 分类、标签：`/api/category`、`/api/tag` 的分页 CRUD、状态、排序、关联数量和批量删除。
- 动态：`/api/moment` 的分页 CRUD、发布状态和可见性。
- 友链：`/api/friend` 的分页 CRUD、排序与状态。
- 关于：`GET/PUT /api/about`，以及可选版本列表、详情和恢复接口。

## P0：附件与引用完整性

- `/api/attachment` 支持分页、类型/时间/关联筛选、上传进度、重命名和删除。
- 建立附件与文章、动态、用户头像、友链、关于页之间的引用表。
- 新内容上传附件时接受 `relation_key`，内容保存后在同一事务中绑定真实 ID。
- 删除接口必须在服务端重新检查引用并拒绝危险删除，不能信任前端显示的引用数量。
- 定义文件名冲突、允许的 MIME/扩展名、大小限制、恶意文件检测和对象存储访问策略。

## P1：契约一致性

- 列表统一返回 `items` 与 `pagination: { page, size, total, total_pages, has_more }`。
- 错误统一包含 `code`、`msg` 及字段级 `errors`；区分 401、403、404、409、422 和 5xx。
- 高风险批量操作必须事务化，并报告失败项。
- 分类树需要 `parent_id`、循环依赖检查和删除时的迁移策略。
- 删除用户时保护当前用户、最后一个管理员以及作者/审计归属。
- 通知、审计日志、存储容量和系统健康状态目前没有接口。

## 部署

生产环境建议同域部署：博客 `/`、管理端 `/admin/`、API `/api/`。服务器需要为 `/admin/*` 配置 SPA history fallback，并启用 TLS、CSP、安全响应头、密钥管理、备份和健康检查。
