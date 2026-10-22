// apidoc 将 Gin 处理函数接入 Huma，统一注册路由并生成接口模型
package apidoc

import (
	"net/http"
	"regexp"
	"strings"

	"github.com/danielgtaylor/huma/v2"
	"github.com/danielgtaylor/huma/v2/adapters/humagin"
	"github.com/gin-gonic/gin"
)

type Operation struct {
	Summary     string
	Description string
	Tag         string

	// 通过 Go 类型样例生成请求体、响应体和查询参数的模型
	Input  any
	Output any
	Query  any

	// 鉴权标记仅用于文档，实际权限检查由 Gin 中间件执行
	Protected       bool
	OptionalAuth    bool
	OptionalBody    bool
	Created         bool
	FailureStatuses []int
}

type Router struct {
	group *gin.RouterGroup
	doc   *Document
}

// NewRouter 将 Gin 路由组与共享文档关联，使路由和文档同时注册
func NewRouter(group *gin.RouterGroup, doc *Document) *Router {
	return &Router{group: group, doc: doc}
}

// Group 创建继承 Gin 中间件的子路由组，并继续使用同一份文档
func (r *Router) Group(path string, handlers ...gin.HandlerFunc) *Router {
	return NewRouter(r.group.Group(path, handlers...), r.doc)
}

func (r *Router) GET(path string, op Operation, handlers ...gin.HandlerFunc) {
	r.handle(http.MethodGet, path, op, handlers...)
}

func (r *Router) POST(path string, op Operation, handlers ...gin.HandlerFunc) {
	r.handle(http.MethodPost, path, op, handlers...)
}

func (r *Router) PUT(path string, op Operation, handlers ...gin.HandlerFunc) {
	r.handle(http.MethodPut, path, op, handlers...)
}

func (r *Router) PATCH(path string, op Operation, handlers ...gin.HandlerFunc) {
	r.handle(http.MethodPatch, path, op, handlers...)
}

func (r *Router) DELETE(path string, op Operation, handlers ...gin.HandlerFunc) {
	r.handle(http.MethodDelete, path, op, handlers...)
}

var ginParam = regexp.MustCompile(`:([^/]+)`)

// handle 生成操作描述并通过 Huma 的 Gin 适配器挂载处理函数
// 最后一个处理函数是业务入口，之前的处理函数作为 Gin 中间件执行
func (r *Router) handle(method, path string, info Operation, handlers ...gin.HandlerFunc) {
	if len(handlers) == 0 {
		panic("Huma route requires a Gin handler")
	}
	fullPath := strings.TrimRight(r.group.BasePath(), "/") + "/" + strings.TrimLeft(path, "/")
	op := r.doc.operation(method, fullPath, info)
	r.doc.api.OpenAPI().AddOperation(op)

	// 中间件必须进入 Gin 的真实调用链，确保 Next、Abort 和审计逻辑正常执行
	handler := handlers[len(handlers)-1]
	middleware := handlers[:len(handlers)-1]
	group := r.group.Group("", middleware...)
	scopedAPI := humagin.NewWithGroup(r.doc.engine, group, config(r.doc.api.OpenAPI()))
	mountedOp := *op
	mountedOp.Path = ginParam.ReplaceAllString(path, "{$1}")
	scopedAPI.Adapter().Handle(&mountedOp, func(ctx huma.Context) {
		handler(humagin.Unwrap(ctx))
	})
}
