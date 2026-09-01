package auth

import (
	"database/sql"
	"github.com/gin-gonic/gin"
)

// RegisterRoutes mounts authentication endpoints below an /api router group.
func RegisterRoutes(api *gin.RouterGroup, db *sql.DB) {
	handler := NewHandler(NewService(db))
	api.POST("/login", handler.Login)
	api.POST("/logout", handler.Logout)
	api.GET("/me", Middleware(db), handler.Me)
}
