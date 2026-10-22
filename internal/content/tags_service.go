package content

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"time"
)

// ListTags 查询分页标签及未删除文章的关联数量，公开读取仅返回启用标签
func (s *Service) ListTags(ctx context.Context, opt ListOptions) ([]Tag, int64, error) {
	where := []string{"t.deleted_at IS NULL"}
	args := []any{}
	if !opt.Admin || opt.Status == "active" {
		where = append(where, "t.status='active'")
	} else if opt.Status == "disabled" {
		where = append(where, "t.status='disabled'")
	}
	if opt.Search != "" {
		where = append(where, "(t.name LIKE ? OR t.slug LIKE ? OR t.description LIKE ?)")
		needle := "%" + opt.Search + "%"
		args = append(args, needle, needle, needle)
	}
	clause := strings.Join(where, " AND ")
	var total int64
	if err := s.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM tags t WHERE "+clause, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	order := orderBy(opt.Sort, opt.Order, "t.created_at", map[string]string{"name": "t.name", "created_at": "t.created_at", "updated_at": "t.updated_at"})
	rows, err := s.db.QueryContext(ctx, `SELECT t.id,t.name,t.slug,t.description,t.status,t.created_at,t.updated_at,(SELECT COUNT(*) FROM post_tags pt JOIN posts p ON p.id=pt.post_id AND p.deleted_at IS NULL WHERE pt.tag_id=t.id) FROM tags t WHERE `+clause+` ORDER BY `+order+` LIMIT ? OFFSET ?`, append(args, opt.Size, (opt.Page-1)*opt.Size)...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	items := make([]Tag, 0)
	for rows.Next() {
		var i Tag
		var desc sql.NullString
		var status string
		if err = rows.Scan(&i.ID, &i.Name, &i.Slug, &desc, &status, &i.CreatedAt, &i.UpdatedAt, &i.PostCount); err != nil {
			return nil, 0, err
		}
		i.Description = nullString(desc)
		i.Activate = status == "active"
		items = append(items, i)
	}
	return items, total, rows.Err()
}

func (s *Service) GetTag(ctx context.Context, id uint64, admin bool) (Tag, error) {
	where := "id=? AND deleted_at IS NULL"
	if !admin {
		where += " AND status='active'"
	}
	var i Tag
	var desc sql.NullString
	var status string
	err := s.db.QueryRowContext(ctx, `SELECT id,name,slug,description,status,created_at,updated_at,(SELECT COUNT(*) FROM post_tags pt JOIN posts p ON p.id=pt.post_id AND p.deleted_at IS NULL WHERE pt.tag_id=tags.id) FROM tags WHERE `+where, id).Scan(&i.ID, &i.Name, &i.Slug, &desc, &status, &i.CreatedAt, &i.UpdatedAt, &i.PostCount)
	if errors.Is(err, sql.ErrNoRows) {
		return Tag{}, ErrNotFound
	}
	if err != nil {
		return Tag{}, err
	}
	i.Description = nullString(desc)
	i.Activate = status == "active"
	return i, nil
}

func (s *Service) SaveTag(ctx context.Context, id uint64, input ResourceInput) (Tag, error) {
	if input.Name == nil || strings.TrimSpace(*input.Name) == "" || input.Slug == nil || !validSlug(*input.Slug) {
		return Tag{}, ErrInvalid
	}
	desc := ""
	if input.Description != nil {
		desc = *input.Description
	}
	active := true
	if input.Activate != nil {
		active = *input.Activate
	}
	status := "disabled"
	if active {
		status = "active"
	}
	now := time.Now().UTC()
	if id == 0 {
		res, err := s.db.ExecContext(ctx, "INSERT INTO tags(name,slug,description,status,created_at,updated_at) VALUES(?,?,?,?,?,?)", strings.TrimSpace(*input.Name), strings.TrimSpace(*input.Slug), nullable(desc), status, now, now)
		if err != nil {
			return Tag{}, classifyDB(err)
		}
		v, _ := res.LastInsertId()
		id = uint64(v)
	} else {
		res, err := s.db.ExecContext(ctx, "UPDATE tags SET name=?,slug=?,description=?,status=?,updated_at=? WHERE id=? AND deleted_at IS NULL", strings.TrimSpace(*input.Name), strings.TrimSpace(*input.Slug), nullable(desc), status, now, id)
		if err != nil {
			return Tag{}, classifyDB(err)
		}
		if n, _ := res.RowsAffected(); n == 0 {
			return Tag{}, ErrNotFound
		}
	}
	return s.GetTag(ctx, id, true)
}

func (s *Service) SetTagStatus(ctx context.Context, id uint64, active bool) (Tag, error) {
	status := "disabled"
	if active {
		status = "active"
	}
	res, err := s.db.ExecContext(ctx, "UPDATE tags SET status=?,updated_at=? WHERE id=? AND deleted_at IS NULL", status, time.Now().UTC(), id)
	if err != nil {
		return Tag{}, err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return Tag{}, ErrNotFound
	}
	return s.GetTag(ctx, id, true)
}

// DeleteTags 在同一事务中解除文章关联并软删除标签
func (s *Service) DeleteTags(ctx context.Context, ids []uint64) error {
	if len(ids) == 0 {
		return ErrInvalid
	}
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	for _, id := range ids {
		if _, err = tx.ExecContext(ctx, "DELETE FROM post_tags WHERE tag_id=?", id); err != nil {
			return err
		}
		if _, err = tx.ExecContext(ctx, "UPDATE tags SET deleted_at=?,updated_at=? WHERE id=? AND deleted_at IS NULL", time.Now().UTC(), time.Now().UTC(), id); err != nil {
			return err
		}
	}
	return tx.Commit()
}
