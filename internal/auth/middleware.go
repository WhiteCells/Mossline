package auth

import (
	"database/sql"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"mossline/internal/httpx"
)

const ContextUserKey = "mossline.auth.user"

// CurrentUser 读取鉴权中间件写入的登录身份，未登录时返回 false
func CurrentUser(c *gin.Context) (User, bool) {
	value, ok := c.Get(ContextUserKey)
	if !ok {
		return User{}, false
	}
	user, ok := value.(User)
	return user, ok
}

// Middleware 要求有效会话，并在指定角色时检查角色权限
// 鉴权失败会终止 Gin 调用链，成功后将用户写入上下文
func Middleware(db *sql.DB, roles ...string) gin.HandlerFunc {
	allowed := make(map[string]struct{}, len(roles))
	for _, role := range roles {
		allowed[role] = struct{}{}
	}
	service := NewService(db)
	return func(c *gin.Context) {
		user, err := service.Authenticate(c.Request.Context(), BearerToken(c))
		if err != nil {
			httpx.Failure(c, http.StatusUnauthorized, "UNAUTHORIZED", "登录已过期或无效，请重新登录", nil)
			c.Abort()
			return
		}
		if len(allowed) > 0 {
			if _, ok := allowed[user.Role]; !ok {
				httpx.Failure(c, http.StatusForbidden, "FORBIDDEN", "当前账号没有执行该操作的权限", nil)
				c.Abort()
				return
			}
		}
		c.Set(ContextUserKey, user)
		c.Next()
	}
}

// OptionalMiddleware 允许匿名访问，但携带令牌时必须通过会话校验
// 无效令牌会返回未授权错误，不会退回匿名身份
func OptionalMiddleware(db *sql.DB) gin.HandlerFunc {
	service := NewService(db)
	return func(c *gin.Context) {
		if token := BearerToken(c); token != "" {
			user, err := service.Authenticate(c.Request.Context(), token)
			if err != nil {
				httpx.Failure(c, http.StatusUnauthorized, "UNAUTHORIZED", "登录已过期或无效，请重新登录", nil)
				c.Abort()
				return
			}
			c.Set(ContextUserKey, user)
		}
		c.Next()
	}
}

// BearerToken 提取 Authorization 中的 Bearer 令牌，格式不符时返回空字符串
func BearerToken(c *gin.Context) string {
	header := strings.TrimSpace(c.GetHeader("Authorization"))
	parts := strings.Fields(header)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		return ""
	}
	return parts[1]
}
