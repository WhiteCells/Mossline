package content

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"mossline/internal/attachment"
)

// GetAbout 读取固定 ID 的关于页面，公开模式只允许读取已发布内容
func (s *Service) GetAbout(ctx context.Context, admin bool) (About, error) {
	where := "id=1"
	if !admin {
		where += " AND status='published'"
	}
	var i About
	var published sql.NullTime
	err := s.db.QueryRowContext(ctx, "SELECT id,content,content_type,status,published_at,created_at,updated_at FROM about WHERE "+where).Scan(&i.ID, &i.Content, &i.ContentType, &i.Status, &published, &i.CreatedAt, &i.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return About{}, ErrNotFound
	}
	i.PublishedAt = nullTime(published)
	return i, err
}

// SaveAbout 新增或覆盖单例关于页面，并在同一事务中同步附件引用
func (s *Service) SaveAbout(ctx context.Context, userID uint64, input AboutInput) (About, error) {
	if !validStatus(input.Status, "draft", "published") {
		return About{}, ErrInvalid
	}
	now := time.Now().UTC()
	var published any = nil
	if input.Status == "published" {
		published = now
	}
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return About{}, err
	}
	defer tx.Rollback()
	_, err = tx.ExecContext(ctx, `INSERT INTO about(id,content,content_type,status,published_at,updated_by,created_at,updated_at) VALUES(1,?,'markdown',?,?,?,?,?) ON DUPLICATE KEY UPDATE content=VALUES(content),content_type='markdown',status=VALUES(status),published_at=CASE WHEN VALUES(status)='published' THEN COALESCE(about.published_at,VALUES(published_at)) ELSE about.published_at END,updated_by=VALUES(updated_by),updated_at=VALUES(updated_at)`, input.Content, input.Status, published, userID, now, now)
	if err != nil {
		return About{}, err
	}
	if err = attachment.SyncReferences(ctx, tx, "about", 1, input.AttachmentRelationKey, "关于页面", input.Content); err != nil {
		return About{}, err
	}
	if err = tx.Commit(); err != nil {
		return About{}, err
	}
	return s.GetAbout(ctx, true)
}
