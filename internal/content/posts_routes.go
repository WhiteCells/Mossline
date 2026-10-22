package content

import (
	"github.com/gin-gonic/gin"

	"mossline/internal/apidoc"
	"mossline/internal/httpx"
)

func registerPostsRoutes(api *apidoc.Router, handler *Handler, optional, editor gin.HandlerFunc) {
	api.GET("/post", apidoc.Operation{
		Summary:      "分页查询文章",
		Tag:          "文章",
		Output:       httpx.Response[PostPage]{},
		OptionalAuth: true,
		Query:        ListOptions{},
		Description:  "匿名用户仅能查看公开内容，管理员和编辑登录后可查看非公开内容。",
	}, optional, handler.ListPosts)
	api.GET("/post/:identifier", apidoc.Operation{
		Summary:      "获取文章",
		Tag:          "文章",
		Output:       httpx.Response[Post]{},
		OptionalAuth: true,
	}, optional, handler.GetPost)
	api.POST("/post", apidoc.Operation{
		Summary:   "创建或更新文章",
		Tag:       "文章",
		Output:    httpx.Response[Post]{},
		Input:     PostInput{},
		Protected: true,
		Created:   true,
	}, editor, handler.SavePost)
	api.PUT("/post/:id", apidoc.Operation{
		Summary:   "创建或更新文章",
		Tag:       "文章",
		Output:    httpx.Response[Post]{},
		Input:     PostInput{},
		Protected: true,
	}, editor, handler.SavePost)
	api.PATCH("/post/:id", apidoc.Operation{
		Summary:   "创建或更新文章",
		Tag:       "文章",
		Output:    httpx.Response[Post]{},
		Input:     PostInput{},
		Protected: true,
	}, editor, handler.SavePost)
	api.PATCH("/post/status", apidoc.Operation{
		Summary:   "批量修改文章状态",
		Tag:       "文章",
		Output:    httpx.Response[map[string]any]{},
		Input:     PostStatusRequest{},
		Protected: true,
	}, editor, handler.PostStatus)
	api.DELETE("/post/:id", apidoc.Operation{
		Summary:     "删除单个或批量文章",
		Tag:         "文章",
		Output:      httpx.Response[map[string]any]{},
		Protected:   true,
		Description: "按 ID 删除时无需请求体；批量删除需提供 ids。",
	}, editor, handler.DeletePosts)
	api.DELETE("/post", apidoc.Operation{
		Summary:     "删除单个或批量文章",
		Tag:         "文章",
		Output:      httpx.Response[map[string]any]{},
		Input:       BatchIDsRequest{},
		Protected:   true,
		Description: "按 ID 删除时无需请求体；批量删除需提供 ids。",
	}, editor, handler.DeletePosts)
}
