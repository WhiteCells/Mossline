package content

import (
	"github.com/gin-gonic/gin"

	"mossline/internal/apidoc"
	"mossline/internal/httpx"
)

func registerTagsRoutes(api *apidoc.Router, handler *Handler, optional, editor gin.HandlerFunc) {
	api.GET("/tag", apidoc.Operation{
		Summary:      "分页查询标签",
		Tag:          "标签",
		Output:       httpx.Response[TagPage]{},
		OptionalAuth: true,
		Query:        ListOptions{},
		Description:  "匿名用户仅能查看公开内容，管理员和编辑登录后可查看非公开内容。",
	}, optional, handler.ListTags)
	api.GET("/tag/:id", apidoc.Operation{
		Summary:      "获取标签",
		Tag:          "标签",
		Output:       httpx.Response[Tag]{},
		OptionalAuth: true,
	}, optional, handler.GetTag)
	api.POST("/tag", apidoc.Operation{
		Summary:   "创建或更新标签",
		Tag:       "标签",
		Output:    httpx.Response[Tag]{},
		Input:     ResourceInput{},
		Protected: true,
		Created:   true,
	}, editor, handler.SaveTag)
	api.PUT("/tag/:id", apidoc.Operation{
		Summary:   "创建或更新标签",
		Tag:       "标签",
		Output:    httpx.Response[Tag]{},
		Input:     ResourceInput{},
		Protected: true,
	}, editor, handler.SaveTag)
	api.PATCH("/tag/:id/status", apidoc.Operation{
		Summary:   "修改标签状态",
		Tag:       "标签",
		Output:    httpx.Response[Tag]{},
		Input:     ActivateRequest{},
		Protected: true,
	}, editor, handler.TagStatus)
	api.DELETE("/tag/:id", apidoc.Operation{
		Summary:     "删除单个或批量标签",
		Tag:         "标签",
		Output:      httpx.Response[map[string]any]{},
		Protected:   true,
		Description: "按 ID 删除时无需请求体；批量删除需提供 ids。",
	}, editor, handler.DeleteTags)
	api.DELETE("/tag", apidoc.Operation{
		Summary:     "删除单个或批量标签",
		Tag:         "标签",
		Output:      httpx.Response[map[string]any]{},
		Input:       BatchIDsRequest{},
		Protected:   true,
		Description: "按 ID 删除时无需请求体；批量删除需提供 ids。",
	}, editor, handler.DeleteTags)
}
