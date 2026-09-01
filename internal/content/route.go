package content

import (
	"database/sql"

	"github.com/gin-gonic/gin"

	"mossline/internal/auth"
)

func RegisterRoutes(api *gin.RouterGroup, db *sql.DB) {
	h := NewHandler(NewService(db))
	optional := auth.OptionalMiddleware(db)
	editor := auth.Middleware(db, "admin", "editor")
	api.GET("/category", optional, h.ListCategories)
	api.GET("/category/:id", optional, h.GetCategory)
	api.POST("/category", editor, h.SaveCategory)
	api.PUT("/category/:id", editor, h.SaveCategory)
	api.PATCH("/category/:id/status", editor, h.CategoryStatus)
	api.DELETE("/category/:id", editor, h.DeleteCategories)
	api.DELETE("/category", editor, h.DeleteCategories)
	api.GET("/tag", optional, h.ListTags)
	api.GET("/tag/:id", optional, h.GetTag)
	api.POST("/tag", editor, h.SaveTag)
	api.PUT("/tag/:id", editor, h.SaveTag)
	api.PATCH("/tag/:id/status", editor, h.TagStatus)
	api.DELETE("/tag/:id", editor, h.DeleteTags)
	api.DELETE("/tag", editor, h.DeleteTags)
	api.GET("/friend", optional, h.ListFriends)
	api.GET("/friend/:id", optional, h.GetFriend)
	api.POST("/friend", editor, h.SaveFriend)
	api.PUT("/friend/:id", editor, h.SaveFriend)
	api.PATCH("/friend/:id/status", editor, h.FriendStatus)
	api.DELETE("/friend/:id", editor, h.DeleteFriends)
	api.DELETE("/friend", editor, h.DeleteFriends)
	api.GET("/post", optional, h.ListPosts)
	api.GET("/post/:identifier", optional, h.GetPost)
	api.POST("/post", editor, h.SavePost)
	api.PUT("/post/:id", editor, h.SavePost)
	api.PATCH("/post/:id", editor, h.SavePost)
	api.PATCH("/post/status", editor, h.PostStatus)
	api.DELETE("/post/:id", editor, h.DeletePosts)
	api.DELETE("/post", editor, h.DeletePosts)
	api.GET("/moment", optional, h.ListMoments)
	api.GET("/moment/:id", optional, h.GetMoment)
	api.POST("/moment", editor, h.SaveMoment)
	api.PUT("/moment/:id", editor, h.SaveMoment)
	api.PATCH("/moment/:id/status", editor, h.MomentStatus)
	api.DELETE("/moment/:id", editor, h.DeleteMoments)
	api.DELETE("/moment", editor, h.DeleteMoments)
	api.GET("/about", optional, h.GetAbout)
	api.PUT("/about", editor, h.SaveAbout)
}
