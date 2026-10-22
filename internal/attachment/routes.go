package attachment

import (
	"database/sql"

	"mossline/internal/apidoc"
	"mossline/internal/auth"
	"mossline/internal/config"
	"mossline/internal/httpx"
)

// RegisterRoutes 注册需要登录权限的附件库和上传接口
func RegisterRoutes(api *apidoc.Router, db *sql.DB, storage config.Storage) {
	handler := NewHandler(NewService(db, storage))
	guard := auth.Middleware(db, "admin", "editor")
	api.GET("/attachment", apidoc.Operation{
		Summary:   "分页查询附件",
		Tag:       "附件",
		Output:    httpx.Response[AttachmentPage]{},
		Protected: true,
		Query:     ListOptions{},
	}, guard, handler.List)
	api.GET("/attachment/:id", apidoc.Operation{
		Summary:   "获取附件",
		Tag:       "附件",
		Output:    httpx.Response[Attachment]{},
		Protected: true,
	}, guard, handler.Get)
	api.POST("/attachment", apidoc.Operation{
		Summary:   "上传附件",
		Tag:       "附件",
		Output:    httpx.Response[Attachment]{},
		Protected: true,
		Input:     UploadRequest{},
		Created:   true,
	}, guard, handler.Upload)
	api.PATCH("/attachment/:id", apidoc.Operation{
		Summary:   "重命名附件",
		Tag:       "附件",
		Output:    httpx.Response[Attachment]{},
		Input:     RenameRequest{},
		Protected: true,
	}, guard, handler.Rename)
	api.DELETE("/attachment/:id", apidoc.Operation{
		Summary:   "删除附件",
		Tag:       "附件",
		Output:    httpx.Response[map[string]any]{},
		Protected: true,
	}, guard, handler.Delete)
	api.DELETE("/attachment", apidoc.Operation{
		Summary:   "批量删除附件",
		Tag:       "附件",
		Output:    httpx.Response[map[string]any]{},
		Input:     httpx.BatchIDsRequest{},
		Protected: true,
	}, guard, handler.DeleteBatch)
}
