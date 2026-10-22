package content

import (
	"github.com/gin-gonic/gin"

	"mossline/internal/apidoc"
	"mossline/internal/httpx"
)

func registerMomentsRoutes(api *apidoc.Router, handler *Handler, optional, editor gin.HandlerFunc) {
	api.GET("/moment", apidoc.Operation{
		Summary:      "分页查询动态",
		Tag:          "动态",
		Output:       httpx.Response[MomentPage]{},
		OptionalAuth: true,
		Query:        ListOptions{},
		Description:  "匿名用户仅能查看公开内容，管理员和编辑登录后可查看非公开内容。",
	}, optional, handler.ListMoments)
	api.GET("/moment/:id", apidoc.Operation{
		Summary:      "获取动态",
		Tag:          "动态",
		Output:       httpx.Response[Moment]{},
		OptionalAuth: true,
	}, optional, handler.GetMoment)
	api.POST("/moment", apidoc.Operation{
		Summary:   "创建或更新动态",
		Tag:       "动态",
		Output:    httpx.Response[Moment]{},
		Input:     MomentInput{},
		Protected: true,
		Created:   true,
	}, editor, handler.SaveMoment)
	api.PUT("/moment/:id", apidoc.Operation{
		Summary:   "创建或更新动态",
		Tag:       "动态",
		Output:    httpx.Response[Moment]{},
		Input:     MomentInput{},
		Protected: true,
	}, editor, handler.SaveMoment)
	api.PATCH("/moment/:id/status", apidoc.Operation{
		Summary:   "修改动态状态",
		Tag:       "动态",
		Output:    httpx.Response[Moment]{},
		Input:     StatusRequest{},
		Protected: true,
	}, editor, handler.MomentStatus)
	api.DELETE("/moment/:id", apidoc.Operation{
		Summary:     "删除单个或批量动态",
		Tag:         "动态",
		Output:      httpx.Response[map[string]any]{},
		Protected:   true,
		Description: "按 ID 删除时无需请求体；批量删除需提供 ids。",
	}, editor, handler.DeleteMoments)
	api.DELETE("/moment", apidoc.Operation{
		Summary:     "删除单个或批量动态",
		Tag:         "动态",
		Output:      httpx.Response[map[string]any]{},
		Input:       BatchIDsRequest{},
		Protected:   true,
		Description: "按 ID 删除时无需请求体；批量删除需提供 ids。",
	}, editor, handler.DeleteMoments)
}
