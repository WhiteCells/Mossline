// httpserver 负责 HTTP 路由装配、中间件和服务配置
package httpserver

import (
	"database/sql"
	"time"

	"github.com/gin-gonic/gin"

	"mossline/internal/admin"
	"mossline/internal/apidoc"
	"mossline/internal/attachment"
	"mossline/internal/auth"
	"mossline/internal/config"
	"mossline/internal/content"
	"mossline/internal/httpx"
	"mossline/internal/user"
)

// RegisterRoutes 汇总业务接口及文档模型，供服务和导出命令共用
// 文档导出时可传入空数据库，但不能实际调用业务处理函数
func RegisterRoutes(router *gin.Engine, db *sql.DB, storage config.Storage, started time.Time) *apidoc.Document {
	doc := apidoc.NewDocument(router, httpx.Response[any]{})
	root := apidoc.NewRouter(router.Group(""), doc)
	root.GET("/healthz", apidoc.Operation{
		Summary:         "服务及数据库健康检查",
		Tag:             "系统",
		Output:          HealthResponse{},
		FailureStatuses: []int{503},
	}, health(db))
	api := root.Group("/api", audit(db))
	auth.RegisterRoutes(api, db)
	content.RegisterRoutes(api, db)
	attachment.RegisterRoutes(api, db, storage)
	admin.RegisterRoutes(api, db, started)
	adminGroup := api.Group("/admin")
	admin.RegisterRoutes(adminGroup, db, started)
	user.RegisterRoutes(adminGroup, db)
	return doc
}
