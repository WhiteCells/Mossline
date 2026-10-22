# Mossline API

> 本文件保留简要说明。完整、可导入的 OpenAPI 3.1 文档由服务暴露在 `/openapi.yaml`，浏览入口为 `/docs`。

所有 JSON 接口使用统一响应：`{ "code": 200, "data": {}, "msg": "" }`。错误会额外提供稳定的 `error_code`，参数错误可包含 `errors`；列表统一返回 `items` 与 `pagination`。

## 接口清单

- 认证：`POST /api/login`、`POST /api/logout`、`GET /api/me`
- 文章：`/api/post`，支持 CRUD、批量状态、分页及关键词/分类/标签/状态/时间筛选
- 分类：`/api/category`，支持 CRUD、排序和启用状态
- 标签：`/api/tag`，支持 CRUD、状态和文章多对多关联
- 动态：`/api/moment`，支持 CRUD、状态、可见性、发布时间和附件
- 友链：`/api/friend`，支持 CRUD、排序和启用状态
- 关于：`GET/PUT /api/about`，固定单例 `id=1`
- 附件：`/api/attachment`，支持校验上传、列表、详情、重命名和安全删除
- 用户：`/api/admin/users`，管理员专属 CRUD 和状态管理
- 控制台：`/api/admin/dashboard`
- 健康检查：`/healthz`

匿名读取仅返回已发布或启用的内容。写操作要求 `admin` 或 `editor`，用户管理仅允许 `admin`。

主要错误状态：`401` 会话无效、`403` 权限不足、`404` 资源不存在、`409` 唯一冲突或关联保护、`422` 参数校验失败、`429` 登录尝试过频、`500` 服务异常。

---

## 历史设计草案（仅供参考）

## 后端

技术栈:
- go(gin)
- mysql
- redis

### 数据库表

#### 用户表

- id
- username
- password
- desc
- created_at
- updated_at

#### 文章表

- id
- title
- slug
- desc
- word
- tag
- category
- like_count
- is_top
- view_count
- comment_count
- author
- status(发布、草稿、下架)
- content_type
- content
- published_at
- created_at
- updated_at

#### 分类表

- id
- name
- activate
- created_at
- updated_at

#### 标签表

- id
- name
- activate
- created_at
- updated_at

#### 网站设置表

- id
- title
- desc
- run_time
- view_count
- created_at
- updated_at

#### 友链表

- id
- name
- desc
- cover
- uri
- created_at
- updated_at

#### 留言表



### 前台接口

统一回包类型

```json
{
    "code": 200,
    "data": {},
    "msg": ""
}
```

失败统一回包

```json
{
    "code": 400, // 4xx/5xx
    "data": null,
    "msg": ""
}
```

#### 获取文章

GET `/api/post`

```param
?page=1
&size=10
```

成功返回

```json
{
    "code": 200,
    "data": {
        "pagination": {
            "page": 1,
            "size": 10,
            "total": 132,
            "total_pages": 13,
            "has_more": true
        },
        "post": [
            {
                "id": "唯一标识",
                "slug": "路径标识",
                "title": "标题",
                "cover": "封面图",
                "desc": "摘要",
                "word": "字数",
                "tags": [],
                "category": [],
                "like_count": "点赞数",
                "is_top": "是否置顶",
                "view_count": "阅读量",
                "comments_count": "评论数",
                "author": "作者信息",
                "published_at": "发布时间",
                "updated_at": "更新时间",
            }
        ]
    },
    "msg": ""
}
```

#### 获取文章内容

GET `/api/post/:slug`

成功返回

```json
{
    "code": 200,
    "data": {
        "id": "唯一标识",
        "slug": "路径标识",
        "title": "标题",
        "cover": "封面图",
        "desc": "摘要",
        "word": "字数",
        "tags": [],
        "category": [],
        "like_count": "点赞数",
        "is_top": "是否置顶",
        "view_count": "阅读量",
        "comments_count": "评论数",
        "author": "作者信息",
        "published_at": "发布时间",
        "updated_at": "更新时间",
        "content_type": "markdown",
        "content": "# 标题"
    },
    "msg": ""
}
```

### 后台接口

#### 登陆

POST `/api/login`

body:

```json
{
    "username": "",
    "password": ""
}
```

成功返回

```json
{
    "code": 200,
    "data": {
        "token": "",
    },
    "msg": ""
}
```

#### 注销

POST `/api/logout`

body:

```json
{
    "token": ""
}
```

成功返回

```json
{
    "code": 200,
    "data": {},
    "msg": ""
}
```

#### 创建文章

POST `/api/post`

body:

```json
{
    "title": "标题",
    "cover": "封面图",
    "desc": "摘要",
    "tags": [],
    "category": [],
    "is_top": false,
    "status": "draft", // 草稿、发布、定时发布
    "published_at": "发布时间",
    "updated_at": "更新时间",
    "content": "# 标题"
}
```

成功返回

```json
{
    "code": 200,
    "data": {
        "id": 1,
        "slug": ""
    },
    "msg": "",
}
```

#### 创建分类

POST `/api/category`

对应的查询、删除

#### 创建标签

POST `/api/tag`

对应的查询、删除

#### 获取评论

GET `/api/comment`

对应的删除、回复

#### 获取日志

GET `/api/log`


## 前端

### React

用户界面

- 首页顶部导航栏
  - 标题
  - 首页
  - 分类
  - 标签
  - 动态
  - 留言
  - 友链
  - 关于
  - 搜索
  - 主题
  - 登陆

管理界面

- 仪表盘
  - 文章数
  - 评论数
  - 访问量
    - ip
    - 地区
    - 波动（图）
- 文章管理
  - 发布
  - 编辑草稿
  - 已发布
  - 回收站
- 附件管理
- 评论管理
- 分类管理
- 标签管理
- 个人管理
- 全局设置
