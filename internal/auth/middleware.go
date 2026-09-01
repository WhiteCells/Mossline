package auth

import (
	"database/sql"
	"net/http"

	"github.com/gin-gonic/gin"
)

func CurrentUser(c *gin.Context) (User, bool) {
	value, ok := c.Get(ContextUserKey)
	if !ok {
		return User{}, false
	}
	user, ok := value.(User)
	return user, ok
}

func Middleware(db *sql.DB, roles ...string) gin.HandlerFunc {
	allowed := make(map[string]struct{}, len(roles))
	for _, role := range roles {
		allowed[role] = struct{}{}
	}
	service := NewService(db)
	return func(c *gin.Context) {
		user, err := service.Authenticate(c.Request.Context(), BearerToken(c))
		if err != nil {
			Failure(c, http.StatusUnauthorized, "UNAUTHORIZED", "登录已过期或无效，请重新登录", nil)
			c.Abort()
			return
		}
		if len(allowed) > 0 {
			if _, ok := allowed[user.Role]; !ok {
				Failure(c, http.StatusForbidden, "FORBIDDEN", "当前账号没有执行该操作的权限", nil)
				c.Abort()
				return
			}
		}
		c.Set(ContextUserKey, user)
		c.Next()
	}
}

func OptionalMiddleware(db *sql.DB) gin.HandlerFunc {
	service := NewService(db)
	return func(c *gin.Context) {
		if token := BearerToken(c); token != "" {
			if user, err := service.Authenticate(c.Request.Context(), token); err == nil {
				c.Set(ContextUserKey, user)
			}
		}
		c.Next()
	}
}
