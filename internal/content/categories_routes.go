package content

import (
	"github.com/gin-gonic/gin"

	"mossline/internal/apidoc"
	"mossline/internal/httpx"
)

func registerCategoriesRoutes(api *apidoc.Router, handler *Handler, optional, editor gin.HandlerFunc) {
	api.GET("/category", apidoc.Operation{
		Summary:      "分页查询分类",
		Tag:          "分类",
		Output:       httpx.Response[CategoryPage]{},
		OptionalAuth: true,
		Query:        ListOptions{},
		Description:  "匿名用户仅能查看公开内容，管理员和编辑登录后可查看非公开内容。",
	}, optional, handler.ListCategories)
	api.GET("/category/:id", apidoc.Operation{
		Summary:      "获取分类",
		Tag:          "分类",
		Output:       httpx.Response[Category]{},
		OptionalAuth: true,
	}, optional, handler.GetCategory)
	api.POST("/category", apidoc.Operation{
		Summary:   "创建或更新分类",
		Tag:       "分类",
		Output:    httpx.Response[Category]{},
		Input:     ResourceInput{},
		Protected: true,
		Created:   true,
	}, editor, handler.SaveCategory)
	api.PUT("/category/:id", apidoc.Operation{
		Summary:   "创建或更新分类",
		Tag:       "分类",
		Output:    httpx.Response[Category]{},
		Input:     ResourceInput{},
		Protected: true,
	}, editor, handler.SaveCategory)
	api.PATCH("/category/:id/status", apidoc.Operation{
		Summary:   "修改分类状态",
		Tag:       "分类",
		Output:    httpx.Response[Category]{},
		Input:     ActivateRequest{},
		Protected: true,
	}, editor, handler.CategoryStatus)
	api.DELETE("/category/:id", apidoc.Operation{
		Summary:     "删除单个或批量分类",
		Tag:         "分类",
		Output:      httpx.Response[map[string]any]{},
		Protected:   true,
		Description: "按 ID 删除时无需请求体；批量删除需提供 ids。",
	}, editor, handler.DeleteCategories)
	api.DELETE("/category", apidoc.Operation{
		Summary:     "删除单个或批量分类",
		Tag:         "分类",
		Output:      httpx.Response[map[string]any]{},
		Input:       BatchIDsRequest{},
		Protected:   true,
		Description: "按 ID 删除时无需请求体；批量删除需提供 ids。",
	}, editor, handler.DeleteCategories)
}
