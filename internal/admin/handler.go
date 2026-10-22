package admin

import (
	"database/sql"
	"runtime"
	"time"

	"github.com/gin-gonic/gin"

	"mossline/internal/content"
	"mossline/internal/httpx"
)

type Handler struct {
	db      *sql.DB
	started time.Time
}

func NewHandler(db *sql.DB, started time.Time) *Handler { return &Handler{db: db, started: started} }

// Dashboard 汇总资源数量、近期文章和操作记录，供控制台展示
func (h *Handler) Dashboard(c *gin.Context) {
	ctx := c.Request.Context()
	tables := map[string]string{"users": "users", "posts": "posts", "categories": "categories", "tags": "tags", "moments": "moments", "attachments": "attachments"}
	stats := gin.H{}
	for key, table := range tables {
		query := "SELECT COUNT(*) FROM " + table
		switch table {
		case "users", "posts", "categories", "tags", "moments", "attachments":
			query += " WHERE deleted_at IS NULL"
		}
		var count int64
		if err := h.db.QueryRowContext(ctx, query).Scan(&count); err != nil {
			httpx.Failure(c, 500, "INTERNAL_ERROR", "无法读取控制台统计", nil)
			return
		}
		stats[key] = count
	}
	service := content.NewService(h.db)
	posts, _, err := service.ListPosts(ctx, content.ListOptions{Page: 1, Size: 6, Admin: true, Sort: "updated_at", Order: "desc"})
	if err != nil {
		httpx.Failure(c, 500, "INTERNAL_ERROR", "无法读取近期文章", nil)
		return
	}
	var used int64
	_ = h.db.QueryRowContext(ctx, "SELECT COALESCE(SUM(size),0) FROM attachments WHERE deleted_at IS NULL").Scan(&used)
	rows, err := h.db.QueryContext(ctx, `SELECT l.id,l.action,u.nickname,l.created_at FROM audit_logs l LEFT JOIN users u ON u.id=l.actor_id ORDER BY l.created_at DESC LIMIT 10`)
	operations := make([]gin.H, 0)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var id uint64
			var action string
			var operator sql.NullString
			var created time.Time
			if rows.Scan(&id, &action, &operator, &created) == nil {
				operations = append(operations, gin.H{"id": id, "action": action, "operator": operator.String, "created_at": created})
			}
		}
	}
	httpx.Success(c, gin.H{"stats": stats, "recent_posts": posts, "recent_operations": operations, "storage": gin.H{"used": used, "total": int64(10) << 30}, "system": gin.H{"api": "healthy", "database": "MySQL 已连接", "cache": "未启用", "uptime": int64(time.Since(h.started).Seconds()), "go": runtime.Version()}})
}
