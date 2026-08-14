package main

import (
	"github.com/danielgtaylor/huma/v2"
	"github.com/danielgtaylor/huma/v2/adapters/humagin"
	"github.com/gin-gonic/gin"

	"mossline/internal/user"
)

func main() {
	r := gin.Default()

	api := humagin.New(
		r,
		huma.DefaultConfig("Mossline", "1.0.0"),
	)

	userService := user.NewService()
	userHandler := user.NewHandler(userService)

	user.RegisterRoutes(api, userHandler)

	r.Run(":8081")
}
