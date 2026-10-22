package content

import (
	"context"
	"database/sql"
	"errors"
	"strconv"
	"strings"
	"time"

	"mossline/internal/attachment"
)

func scanMoment(scanner interface{ Scan(...any) error }) (Moment, error) {
	var i Moment
	var published sql.NullTime
	err := scanner.Scan(&i.ID, &i.Content, &i.Status, &i.Visibility, &published, &i.CreatedAt, &i.UpdatedAt)
	i.PublishedAt = nullTime(published)
	i.Attachments = []AttachmentView{}
	return i, err
}

func (s *Service) momentAttachments(ctx context.Context, id uint64) ([]AttachmentView, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT DISTINCT a.id,a.original_name,a.url,a.mime_type,a.size FROM attachments a JOIN attachment_refs ar ON ar.attachment_id=a.id WHERE ar.owner_type='moment' AND ar.owner_id=? AND a.deleted_at IS NULL`, id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]AttachmentView, 0)
	for rows.Next() {
		var i AttachmentView
		if err = rows.Scan(&i.ID, &i.Name, &i.URL, &i.MIMEType, &i.Size); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	return items, rows.Err()
}

// ListMoments 查询动态并触发到期发布，公开读取仅包含已到发布时间的公开动态
func (s *Service) ListMoments(ctx context.Context, opt ListOptions) ([]Moment, int64, error) {
	if err := s.publishDue(ctx); err != nil {
		return nil, 0, err
	}
	where := []string{"deleted_at IS NULL"}
	args := []any{}
	if !opt.Admin {
		where = append(where, "status='published'", "visibility='public'", "published_at IS NOT NULL", "published_at<=UTC_TIMESTAMP(6)")
	} else if opt.Status != "" {
		if !validStatus(opt.Status, "draft", "published", "scheduled", "offline") {
			return nil, 0, ErrInvalid
		}
		where = append(where, "status=?")
		args = append(args, opt.Status)
	}
	if opt.Search != "" {
		where = append(where, "content LIKE ?")
		args = append(args, "%"+opt.Search+"%")
	}
	clause := strings.Join(where, " AND ")
	var total int64
	if err := s.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM moments WHERE "+clause, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	order := orderBy(opt.Sort, opt.Order, "published_at", map[string]string{"status": "status", "published_at": "published_at", "created_at": "created_at", "updated_at": "updated_at"})
	rows, err := s.db.QueryContext(ctx, "SELECT id,content,status,visibility,published_at,created_at,updated_at FROM moments WHERE "+clause+" ORDER BY "+order+" LIMIT ? OFFSET ?", append(args, opt.Size, (opt.Page-1)*opt.Size)...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	items := make([]Moment, 0)
	for rows.Next() {
		i, err := scanMoment(rows)
		if err != nil {
			return nil, 0, err
		}
		i.Attachments, err = s.momentAttachments(ctx, i.ID)
		if err != nil {
			return nil, 0, err
		}
		items = append(items, i)
	}
	return items, total, rows.Err()
}

// GetMoment 读取动态及附件，管理模式可读取非公开内容
func (s *Service) GetMoment(ctx context.Context, id uint64, admin bool) (Moment, error) {
	if err := s.publishDue(ctx); err != nil {
		return Moment{}, err
	}
	where := "id=? AND deleted_at IS NULL"
	if !admin {
		where += " AND status='published' AND visibility='public' AND published_at<=UTC_TIMESTAMP(6)"
	}
	i, err := scanMoment(s.db.QueryRowContext(ctx, "SELECT id,content,status,visibility,published_at,created_at,updated_at FROM moments WHERE "+where, id))
	if errors.Is(err, sql.ErrNoRows) {
		return Moment{}, ErrNotFound
	}
	if err != nil {
		return Moment{}, err
	}
	i.Attachments, err = s.momentAttachments(ctx, id)
	return i, err
}

// SaveMoment 创建或合并更新动态，定时发布必须指定未来时间
// 动态写入和附件引用同步共用事务
func (s *Service) SaveMoment(ctx context.Context, id, userID uint64, input MomentInput) (Moment, error) {
	var existing Moment
	var err error
	if id > 0 {
		existing, err = s.GetMoment(ctx, id, true)
		if err != nil {
			return Moment{}, err
		}
		if input.Content == nil {
			input.Content = &existing.Content
		}
		if input.Status == nil {
			input.Status = &existing.Status
		}
		if input.Visibility == nil {
			input.Visibility = &existing.Visibility
		}
		if input.PublishedAt == nil && existing.PublishedAt != nil {
			v := existing.PublishedAt.Format(time.RFC3339)
			input.PublishedAt = &v
		}
	}
	if input.Content == nil || strings.TrimSpace(*input.Content) == "" {
		return Moment{}, ErrInvalid
	}
	status := "draft"
	if input.Status != nil {
		status = *input.Status
	}
	if !validStatus(status, "draft", "published", "scheduled", "offline") {
		return Moment{}, ErrInvalid
	}
	visibility := "public"
	if input.Visibility != nil {
		visibility = *input.Visibility
	}
	if !validStatus(visibility, "public", "private", "unlisted") {
		return Moment{}, ErrInvalid
	}
	published, err := parseDate(input.PublishedAt)
	if err != nil {
		return Moment{}, err
	}
	now := time.Now().UTC()
	if status == "published" && published == nil {
		published = &now
	}
	if status == "scheduled" && (published == nil || !published.After(now)) {
		return Moment{}, ErrInvalid
	}
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return Moment{}, err
	}
	defer tx.Rollback()
	if id == 0 {
		res, err := tx.ExecContext(ctx, "INSERT INTO moments(user_id,content,status,visibility,published_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?)", userID, *input.Content, status, visibility, published, now, now)
		if err != nil {
			return Moment{}, err
		}
		v, _ := res.LastInsertId()
		id = uint64(v)
	} else {
		res, err := tx.ExecContext(ctx, "UPDATE moments SET content=?,status=?,visibility=?,published_at=?,updated_at=? WHERE id=? AND deleted_at IS NULL", *input.Content, status, visibility, published, now, id)
		if err != nil {
			return Moment{}, err
		}
		if n, _ := res.RowsAffected(); n == 0 {
			return Moment{}, ErrNotFound
		}
	}
	if err = attachment.SyncReferences(ctx, tx, "moment", id, input.AttachmentRelationKey, "动态 #"+strconv.FormatUint(id, 10), *input.Content); err != nil {
		return Moment{}, err
	}
	if err = tx.Commit(); err != nil {
		return Moment{}, err
	}
	return s.GetMoment(ctx, id, true)
}

// SetMomentStatus 批量修改状态，发布时仅补全缺失的发布时间，保留已有时间
func (s *Service) SetMomentStatus(ctx context.Context, ids []uint64, status string) error {
	if len(ids) == 0 || !validStatus(status, "draft", "published", "scheduled", "offline") {
		return ErrInvalid
	}
	set := "status=?,updated_at=?"
	args := []any{status, time.Now().UTC()}
	if status == "published" {
		set += ",published_at=COALESCE(published_at,UTC_TIMESTAMP(6))"
	}
	for _, id := range ids {
		args = append(args, id)
	}
	_, err := s.db.ExecContext(ctx, "UPDATE moments SET "+set+" WHERE id IN ("+placeholders(len(ids))+") AND deleted_at IS NULL", args...)
	return err
}

// DeleteMoments 在同一事务中清除附件引用并软删除动态
func (s *Service) DeleteMoments(ctx context.Context, ids []uint64) error {
	if len(ids) == 0 {
		return ErrInvalid
	}
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	for _, id := range ids {
		if _, err = tx.ExecContext(ctx, "DELETE FROM attachment_refs WHERE owner_type='moment' AND owner_id=?", id); err != nil {
			return err
		}
		if _, err = tx.ExecContext(ctx, "UPDATE moments SET deleted_at=?,updated_at=? WHERE id=? AND deleted_at IS NULL", time.Now().UTC(), time.Now().UTC(), id); err != nil {
			return err
		}
	}
	return tx.Commit()
}
