package auth

import (
	"database/sql"

	"mossline/internal/apidoc"
	"mossline/internal/httpx"
)

// RegisterRoutes 在 API 路由组下注册登录、注销和当前用户接口
func RegisterRoutes(api *apidoc.Router, db *sql.DB) {
	handler := NewHandler(NewService(db))
	api.POST("/login", apidoc.Operation{
		Summary: "登录并获取令牌",
		Tag:     "认证",
		Output:  httpx.Response[LoginResponse]{},
		Input:   LoginRequest{},
	}, loginLimiter(), handler.Login)
	api.POST("/logout", apidoc.Operation{
		Summary:      "注销令牌",
		Tag:          "认证",
		Input:        LogoutRequest{},
		OptionalBody: true,
		Output:       httpx.Response[map[string]any]{},
		OptionalAuth: true,
	}, handler.Logout)
	api.GET("/me", apidoc.Operation{
		Summary:   "获取当前用户",
		Tag:       "认证",
		Output:    httpx.Response[User]{},
		Protected: true,
	}, Middleware(db), handler.Me)
}
