package user

import (
	"database/sql"

	"mossline/internal/apidoc"
	"mossline/internal/auth"
	"mossline/internal/httpx"
)

// RegisterRoutes 注册用户管理接口，所有操作仅允许管理员访问
func RegisterRoutes(api *apidoc.Router, db *sql.DB) {
	handler := NewHandler(NewService(db))
	guard := auth.Middleware(db, "admin")
	api.GET("/users", apidoc.Operation{
		Summary:   "分页查询用户",
		Tag:       "用户管理",
		Output:    httpx.Response[UserPage]{},
		Protected: true,
		Query:     ListQuery{},
	}, guard, handler.List)
	api.GET("/users/:id", apidoc.Operation{
		Summary:   "获取用户",
		Tag:       "用户管理",
		Output:    httpx.Response[User]{},
		Protected: true,
	}, guard, handler.Get)
	api.POST("/users", apidoc.Operation{
		Summary:   "创建用户",
		Tag:       "用户管理",
		Output:    httpx.Response[User]{},
		Input:     CreateRequest{},
		Protected: true,
		Created:   true,
	}, guard, handler.Create)
	api.PUT("/users/:id", apidoc.Operation{
		Summary:   "更新用户",
		Tag:       "用户管理",
		Output:    httpx.Response[User]{},
		Input:     UpdateRequest{},
		Protected: true,
	}, guard, handler.Update)
	api.PATCH("/users/:id/status", apidoc.Operation{
		Summary:   "修改用户状态",
		Tag:       "用户管理",
		Output:    httpx.Response[User]{},
		Input:     StatusRequest{},
		Protected: true,
	}, guard, handler.Status)
	api.DELETE("/users/:id", apidoc.Operation{
		Summary:     "删除单个或批量用户",
		Tag:         "用户管理",
		Output:      httpx.Response[map[string]any]{},
		Protected:   true,
		Description: "按 ID 删除时无需请求体；批量删除需提供 ids。",
	}, guard, handler.Delete)
	api.DELETE("/users", apidoc.Operation{
		Summary:     "删除单个或批量用户",
		Tag:         "用户管理",
		Output:      httpx.Response[map[string]any]{},
		Input:       httpx.BatchIDsRequest{},
		Protected:   true,
		Description: "按 ID 删除时无需请求体；批量删除需提供 ids。",
	}, guard, handler.Delete)
}
