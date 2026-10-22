package content

import (
	"github.com/gin-gonic/gin"

	"mossline/internal/apidoc"
	"mossline/internal/httpx"
)

func registerFriendsRoutes(api *apidoc.Router, handler *Handler, optional, editor gin.HandlerFunc) {
	api.GET("/friend", apidoc.Operation{
		Summary:      "分页查询友链",
		Tag:          "友链",
		Output:       httpx.Response[FriendPage]{},
		OptionalAuth: true,
		Query:        ListOptions{},
		Description:  "匿名用户仅能查看公开内容，管理员和编辑登录后可查看非公开内容。",
	}, optional, handler.ListFriends)
	api.GET("/friend/:id", apidoc.Operation{
		Summary:      "获取友链",
		Tag:          "友链",
		Output:       httpx.Response[Friend]{},
		OptionalAuth: true,
	}, optional, handler.GetFriend)
	api.POST("/friend", apidoc.Operation{
		Summary:   "创建或更新友链",
		Tag:       "友链",
		Output:    httpx.Response[Friend]{},
		Input:     ResourceInput{},
		Protected: true,
		Created:   true,
	}, editor, handler.SaveFriend)
	api.PUT("/friend/:id", apidoc.Operation{
		Summary:   "创建或更新友链",
		Tag:       "友链",
		Output:    httpx.Response[Friend]{},
		Input:     ResourceInput{},
		Protected: true,
	}, editor, handler.SaveFriend)
	api.PATCH("/friend/:id/status", apidoc.Operation{
		Summary:   "修改友链状态",
		Tag:       "友链",
		Output:    httpx.Response[Friend]{},
		Input:     ActivateRequest{},
		Protected: true,
	}, editor, handler.FriendStatus)
	api.DELETE("/friend/:id", apidoc.Operation{
		Summary:     "删除单个或批量友链",
		Tag:         "友链",
		Output:      httpx.Response[map[string]any]{},
		Protected:   true,
		Description: "按 ID 删除时无需请求体；批量删除需提供 ids。",
	}, editor, handler.DeleteFriends)
	api.DELETE("/friend", apidoc.Operation{
		Summary:     "删除单个或批量友链",
		Tag:         "友链",
		Output:      httpx.Response[map[string]any]{},
		Input:       BatchIDsRequest{},
		Protected:   true,
		Description: "按 ID 删除时无需请求体；批量删除需提供 ids。",
	}, editor, handler.DeleteFriends)
}
