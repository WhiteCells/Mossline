# 项目维护说明

## 目录结构

```text
Mossline/
├── cmd/                    # 可执行程序入口
│   ├── server/main.go
│   └── docs/main.go
├── internal/               # Go 应用内部代码
│   ├── app/                # 初始化、迁移模式、服务生命周期
│   ├── httpserver/         # 路由汇总、HTTP 配置、中间件、健康探针和审计
│   ├── httpx/              # 通用响应、分页和 JSON 绑定
│   ├── apidoc/             # Huma 适配、模型生成和文档导出
│   ├── config/             # 环境变量配置
│   ├── database/           # MySQL 连接、迁移和首次管理员初始化
│   ├── security/           # 密码安全规则
│   ├── auth/               # 登录、会话、角色权限和认证中间件
│   ├── user/               # 用户管理
│   ├── content/            # 文章、分类、标签、动态、友链和关于页
│   ├── attachment/         # 附件存储和内容引用
│   └── admin/              # 控制台统计
├── migrations/             # 按版本排列的 SQL 和内嵌入口
├── web/                    # 公开站点的独立前端项目
├── admin/                  # 管理端的独立前端项目
├── docs/                   # 维护说明、接口说明和 OpenAPI 导出
│   └── reference/          # 历史需求和状态记录
└── scripts/                # 开发与验证脚本
```

两个前端均使用 React、TypeScript 和 Vite，统一采用以下职责划分，保留各自的依赖和构建配置：

```text
src/
├── main.tsx                # 挂载 React 应用及全局 Provider
├── app/                    # 路由装配、应用布局和全局样式
├── features/               # 按业务功能归组的页面、专用组件和请求
│   ├── posts/              # 文章列表与编辑或详情
│   ├── moments/            # 动态
│   └── ...
└── shared/                 # 多个功能共用的代码
    ├── api/                # HTTP 客户端、接口路径及查询缓存（管理端）
    ├── hooks/              # 通用请求、分页和防抖 Hook
    ├── ui/                 # 基础展示、表格、弹窗和状态组件
    ├── editor/             # Markdown 编辑器（管理端）
    ├── resources/          # 分类、标签、友链的通用表单流程（管理端）
    ├── content/            # 文章和动态的通用列表流程（管理端）
    ├── types/              # 跨功能共享类型（管理端）
    └── utils/              # 日期和数据转换（管理端）
```

## 文件职责与依赖

Go 按业务模块组织包，在模块内使用 `routes.go`、`handler.go`、`service.go`、`model.go` 和 `dto.go`。`model.go` 存放业务数据结构，`dto.go` 存放接口请求、查询和分页响应。内容模块包含多种资源，因此使用 `<资源>_routes.go`、`<资源>_handler.go` 和 `<资源>_service.go`，文件名即可显示资源和职责。

HTTP 处理函数负责绑定、身份读取、参数校验和响应；服务负责业务与数据库操作。现有服务直接使用 `database/sql`，数据库查询跟随对应业务服务维护。只有确实出现独立存储实现或复用需求时再引入仓储接口，避免为每个文件增加无实际作用的转发层。

`cmd/server/main.go` 仅加载配置和接收进程信号，调用 `app.Run`。`app` 初始化数据库并管理服务启停，`httpserver` 装配 HTTP 服务并汇总各模块路由。通用协议能力放在 `httpx`，业务模块不再为了分页和响应依赖认证包。`database` 分别用 `mysql.go`、`migrate.go` 和 `bootstrap.go` 表达连接、迁移和初始化职责。

前端 `app` 组合各个功能；专用组件留在所属 `features/<功能>` 中；被多个功能使用的组件才进入 `shared`。`shared` 不导入业务页面或应用入口。公开站点首页可组合文章功能的卡片，文章列表转换和请求仍在 `features/posts`。管理端 API 路径统一在 `shared/api/paths.ts`，不要在类型文件或客户端实现中重复定义。

测试与被测代码放在同目录，以 `.test.ts` 或 `_test.go` 命名。构建产物仍位于各前端的 `dist/`，SQL 迁移、运行时上传目录和开发命令保持原位置。

## 常用阅读入口

| 任务 | 入口 |
| --- | --- |
| 启动与关闭服务 | `cmd/server/main.go` → `internal/app/app.go` |
| 全局中间件、静态文件、文档页面 | `internal/httpserver/server.go` |
| 路由汇总 | `internal/httpserver/routes.go` |
| 响应与分页协议 | `internal/httpx/` |
| 文章接口 | `internal/content/posts_routes.go` → `posts_handler.go` → `posts_service.go` |
| 上传与引用 | `internal/attachment/upload.go`、`references.go` |
| Huma 与 Gin 的调用边界 | `internal/apidoc/router.go` 及其测试 |
| 管理端路由和布局 | `admin/src/app/` |
| 管理端文章功能 | `admin/src/features/posts/` |
| 管理端共享表单 | `admin/src/shared/resources/` |
| 公开站点文章功能 | `web/src/features/posts/` |

## 修改接口

1. 在所属模块的 `dto.go` 中修改请求和查询字段，在 `model.go` 中修改业务数据结构。部分更新字段标记 `required:"false"`；查询参数使用 `query` 标签。
2. 在所属资源的路由文件中修改路径、类型和文档描述。将每个配置字段放在独立一行，避免把处理函数、鉴权和类型声明挤在一起。
3. 在处理函数中绑定请求和返回统一响应，在服务中处理业务和数据库操作。
4. 注册需要鉴权的接口时，同时配置鉴权中间件与 `Protected`。`Protected` 只描述文档，实际权限由中间件执行。
5. 运行 `make docs` 更新 `docs/openapi.json` 和 `docs/openapi.yaml`，随后执行 Go 测试。路由覆盖测试会检查接口与文档是否一致。

Huma 使用官方 Gin 适配器注册接口，并提供默认 Stoplight Elements 文档页面。请求绑定、业务校验与响应仍由现有 Gin 处理函数完成；审计、鉴权的 `Next` 和 `Abort` 在 Gin 中间件链中执行。需要理解这个边界时，先阅读 `internal/apidoc/router.go` 及其测试。

## 修改前端

页面负责组织数据和布局，将重复卡片、表单字段等拆成有具体职责的组件。将日期、图片筛选等计算放在 JSX 外，避免在 `map` 中堆叠计算和多层条件。通用组件优先使用已有组件；只有存在实际重复时再抽取共享逻辑。

两个前端均开启 TypeScript 严格模式、索引访问检查和未使用代码检查，`build` 会先执行类型检查。公开站点的文章、友链和动态类型放在各自功能目录；HTTP 请求、分页和加载状态类型放在 `shared/api`。请求生命周期由 `useAsyncResource` 统一处理，切换资源、重试和卸载时取消旧请求。查询参数对象需保持稳定引用，避免无意义地重复请求。

样式入口为 `app/styles/index.css`，只负责固定加载顺序。主题、重置和全局布局放在 `app/styles`；布局样式跟随布局组件；通用组件样式放在 `shared/ui`；业务样式放在对应 `features`。响应式和深色主题规则跟随所属组件，同一尺寸的媒体查询合并维护。编辑器内部样式保留在 `shared/editor`，不要重新集中到全局文件。

请求状态在 `shared/hooks/resource.ts` 中使用联合类型，成功时有数据、失败时有错误。页面属性定义在组件附近，业务模型留在功能目录。HTTP 客户端返回 `unknown`，通过功能目录的解析函数校验后使用，避免用泛型断言替代校验。解析函数和查询对象需保持稳定引用。

TypeScript 开启 `verbatimModuleSyntax`，类型使用 `import type` 导入；ESLint 检查类型导入并禁止非空断言。必要的运行时判空不能通过 `!` 绕过。

两个前端各自固定 Prettier 版本和配置。公开站点使用单引号、无分号，管理端使用双引号、分号。运行 `make format` 可以应用对应项目的排版。

## 注释规范

方法和函数的说明注释使用中文，结尾不加中文句号 `。`。Go 方法注释以方法名开头，方便在编辑器和文档中定位。保留 `go:embed`、ESLint 和类型引用等工具指令的原始语法。

优先说明权限边界、输入约定、状态转换、事务范围、副作用和失败行为，避免只复述方法名。简单转发方法和纯展示组件无需机械添加注释。修改行为时同步更新注释，尤其注意区分服务层约束和 HTTP 层校验。

## 验证

```sh
make format-check
go test ./cmd/... ./internal/... ./migrations/...
npm --prefix web run typecheck
npm --prefix web run lint
npm --prefix web run test
npm --prefix web run build
npm --prefix admin run lint
npm --prefix admin run typecheck
npm --prefix admin run test
npm --prefix admin run build
```

前端测试使用 Node.js 24 的原生 TypeScript 支持，测试文件与源码放在一起；运行前请使用 Node.js 24 或更新版本。

以上测试不需要 MySQL。数据库或跨模块业务行为变更还应在本地完整环境中运行 `make smoke`；所需环境变量和清理行为见 `README.md`。

`docs/openapi.json` 和 `docs/openapi.yaml` 是导出文件，不要手动编辑。`docs/maintenance.md` 是人工维护的说明，不会被 `make docs` 覆盖。服务的 `/docs`、`/openapi.json` 和 `/openapi.yaml` 从当前注册的接口生成，不读取导出文件。
