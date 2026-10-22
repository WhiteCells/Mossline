package httpserver

import (
	"database/sql"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"mossline/internal/auth"
)

// audit 在请求完成后记录有登录身份且响应未失败的非 GET 操作
// 审计写入失败不会影响原请求结果
func audit(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()
		if c.Request.Method == http.MethodGet || c.Writer.Status() >= 400 {
			return
		}
		user, ok := auth.CurrentUser(c)
		if !ok {
			return
		}
		_, _ = db.ExecContext(c.Request.Context(), `INSERT INTO audit_logs(actor_id,action,resource_type,summary,ip_address,user_agent,created_at) VALUES(?,?,?,?,?,?,?)`, user.ID, c.Request.Method+" "+c.FullPath(), "api", c.Request.URL.Path, c.ClientIP(), c.Request.UserAgent(), time.Now().UTC())
	}
}
