package httpserver

import (
	"database/sql"
	"net/http"

	"github.com/gin-gonic/gin"
)

type HealthResponse struct {
	Status   string `json:"status"`
	Database string `json:"database"`
}

// health 检查数据库连通性，异常时返回 503，供服务探针使用
func health(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		if err := db.PingContext(ctx); err != nil {
			c.JSON(http.StatusServiceUnavailable, HealthResponse{Status: "down", Database: "unavailable"})
			return
		}
		c.JSON(http.StatusOK, HealthResponse{Status: "ok", Database: "connected"})
	}
}
