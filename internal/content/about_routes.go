package content

import (
	"github.com/gin-gonic/gin"

	"mossline/internal/apidoc"
	"mossline/internal/httpx"
)

func registerAboutRoutes(api *apidoc.Router, handler *Handler, optional, editor gin.HandlerFunc) {
	api.GET("/about", apidoc.Operation{
		Summary:      "获取关于页面",
		Tag:          "关于",
		Output:       httpx.Response[About]{},
		OptionalAuth: true,
	}, optional, handler.GetAbout)
	api.PUT("/about", apidoc.Operation{
		Summary:   "更新关于页面",
		Tag:       "关于",
		Output:    httpx.Response[About]{},
		Input:     AboutInput{},
		Protected: true,
	}, editor, handler.SaveAbout)
}
