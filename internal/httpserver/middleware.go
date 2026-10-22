package httpserver

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"mossline/internal/config"
	"mossline/internal/httpx"
)

// recovery 将处理请求时的异常转换为统一的服务错误响应
func recovery() gin.HandlerFunc {
	return gin.CustomRecovery(func(c *gin.Context, _ any) {
		httpx.Failure(c, http.StatusInternalServerError, "INTERNAL_ERROR", "服务发生异常", nil)
	})
}

// securityHeaders 为响应添加内容类型、嵌入页面和浏览器权限限制
func securityHeaders() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "DENY")
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Header("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
		c.Next()
	}
}

// cors 按来源白名单设置跨域响应头，并直接处理 OPTIONS 预检请求
func cors(cfg config.CORS) gin.HandlerFunc {
	allowed := map[string]struct{}{}
	for _, origin := range cfg.AllowedOrigins {
		allowed[origin] = struct{}{}
	}
	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if _, ok := allowed[origin]; ok {
			c.Header("Access-Control-Allow-Origin", origin)
			c.Header("Vary", "Origin")
			c.Header("Access-Control-Allow-Headers", "Authorization, Content-Type, Accept")
			c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
			if cfg.AllowCredentials {
				c.Header("Access-Control-Allow-Credentials", "true")
			}
		}
		if c.Request.Method == http.MethodOptions {
			if _, ok := allowed[origin]; !ok && origin != "" {
				httpx.Failure(c, http.StatusForbidden, "CORS_FORBIDDEN", "来源不受允许", nil)
			} else {
				c.Status(http.StatusNoContent)
			}
			c.Abort()
			return
		}
		c.Next()
	}
}
