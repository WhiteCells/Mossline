package user

import (
	"database/sql"
	"github.com/gin-gonic/gin"
	"mossline/internal/auth"
)

func RegisterRoutes(api *gin.RouterGroup, db *sql.DB) {
	h := NewHandler(NewService(db))
	guard := auth.Middleware(db, "admin")
	api.GET("/users", guard, h.List)
	api.GET("/users/:id", guard, h.Get)
	api.POST("/users", guard, h.Create)
	api.PUT("/users/:id", guard, h.Update)
	api.PATCH("/users/:id/status", guard, h.Status)
	api.DELETE("/users/:id", guard, h.Delete)
	api.DELETE("/users", guard, h.Delete)
}
