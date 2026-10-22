package admin

import (
	"database/sql"
	"time"

	"mossline/internal/apidoc"
	"mossline/internal/auth"
	"mossline/internal/httpx"
)

// RegisterRoutes 注册控制台接口，允许管理员和编辑者访问
func RegisterRoutes(api *apidoc.Router, db *sql.DB, started time.Time) {
	handler := NewHandler(db, started)
	api.GET("/dashboard", apidoc.Operation{
		Summary:   "获取控制台统计",
		Tag:       "控制台",
		Output:    httpx.Response[map[string]any]{},
		Protected: true,
	}, auth.Middleware(db, "admin", "editor"), handler.Dashboard)
}
