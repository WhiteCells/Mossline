package attachment

import (
	"database/sql"
	"github.com/gin-gonic/gin"
	"mossline/internal/auth"
	"mossline/internal/config"
)

// RegisterRoutes mounts the authenticated attachment library and upload API.
func RegisterRoutes(api *gin.RouterGroup, db *sql.DB, storage config.Storage) {
	h := NewHandler(NewService(db, storage))
	guard := auth.Middleware(db, "admin", "editor")
	api.GET("/attachment", guard, h.List)
	api.GET("/attachment/:id", guard, h.Get)
	api.POST("/attachment", guard, h.Upload)
	api.PATCH("/attachment/:id", guard, h.Rename)
	api.DELETE("/attachment/:id", guard, h.Delete)
	api.DELETE("/attachment", guard, h.DeleteBatch)
}
