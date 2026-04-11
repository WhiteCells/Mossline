# Mossline 文档

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
