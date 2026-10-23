package content

import (
	"database/sql"

	"mossline/internal/apidoc"
	"mossline/internal/auth"
)

// RegisterRoutes 注册公开读取和编辑接口，读取范围由登录身份决定
// 写入接口统一要求管理员或编辑者角色
func RegisterRoutes(api *apidoc.Router, db *sql.DB) {
	handler := NewHandler(NewService(db))
	optional := auth.OptionalMiddleware(db)
	editor := auth.Middleware(db, "admin", "editor")
	registerCategoriesRoutes(api, handler, optional, editor)
	registerTagsRoutes(api, handler, optional, editor)
	registerFriendsRoutes(api, handler, optional, editor)
	registerPostsRoutes(api, handler, optional, editor)
	registerMomentsRoutes(api, handler, optional, editor)
	registerAboutRoutes(api, handler, optional, editor)
	registerAppearanceRoutes(api, handler, auth.Middleware(db, "admin"))
}
