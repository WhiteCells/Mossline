package admin

import (
	"database/sql"
	"github.com/gin-gonic/gin"
	"mossline/internal/auth"
	"time"
)

func RegisterRoutes(api *gin.RouterGroup, db *sql.DB, started time.Time) {
	h := NewHandler(db, started)
	api.GET("/dashboard", auth.Middleware(db, "admin", "editor"), h.Dashboard)
}
