package content

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"time"
)

// ListCategories 查询分页分类并统计未删除文章数量，公开读取仅返回启用分类
func (s *Service) ListCategories(ctx context.Context, opt ListOptions) ([]Category, int64, error) {
	where := []string{"c.deleted_at IS NULL"}
	args := []any{}
	if !opt.Admin || opt.Status == "active" {
		where = append(where, "c.status='active'")
	} else if opt.Status == "disabled" {
		where = append(where, "c.status='disabled'")
	}
	if opt.Search != "" {
		where = append(where, "(c.name LIKE ? OR c.slug LIKE ? OR c.description LIKE ?)")
		needle := "%" + opt.Search + "%"
		args = append(args, needle, needle, needle)
	}
	clause := strings.Join(where, " AND ")
	var total int64
	if err := s.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM categories c WHERE "+clause, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	order := orderBy(opt.Sort, opt.Order, "c.sort_order", map[string]string{"name": "c.name", "sort": "c.sort_order", "created_at": "c.created_at", "updated_at": "c.updated_at"})
	rows, err := s.db.QueryContext(ctx, `SELECT c.id,c.name,c.slug,c.description,c.parent_id,c.sort_order,c.status,c.created_at,c.updated_at,
		(SELECT COUNT(*) FROM posts p WHERE p.category_id=c.id AND p.deleted_at IS NULL) post_count
		FROM categories c WHERE `+clause+` ORDER BY `+order+` LIMIT ? OFFSET ?`, append(args, opt.Size, (opt.Page-1)*opt.Size)...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	items := make([]Category, 0)
	for rows.Next() {
		var item Category
		var desc sql.NullString
		var parent sql.NullInt64
		var status string
		if err := rows.Scan(&item.ID, &item.Name, &item.Slug, &desc, &parent, &item.Sort, &status, &item.CreatedAt, &item.UpdatedAt, &item.PostCount); err != nil {
			return nil, 0, err
		}
		item.Description = nullString(desc)
		if parent.Valid {
			id := uint64(parent.Int64)
			item.ParentID = &id
		}
		item.Activate = status == "active"
		items = append(items, item)
	}
	return items, total, rows.Err()
}

func (s *Service) GetCategory(ctx context.Context, id uint64, admin bool) (Category, error) {
	items, _, err := s.listCategoryID(ctx, id, admin)
	if err != nil {
		return Category{}, err
	}
	if len(items) == 0 {
		return Category{}, ErrNotFound
	}
	return items[0], nil
}

func (s *Service) listCategoryID(ctx context.Context, id uint64, admin bool) ([]Category, int64, error) {
	where := "c.deleted_at IS NULL AND c.id=?"
	if !admin {
		where += " AND c.status='active'"
	}
	var item Category
	var desc sql.NullString
	var parent sql.NullInt64
	var status string
	err := s.db.QueryRowContext(ctx, `SELECT c.id,c.name,c.slug,c.description,c.parent_id,c.sort_order,c.status,c.created_at,c.updated_at,(SELECT COUNT(*) FROM posts p WHERE p.category_id=c.id AND p.deleted_at IS NULL) FROM categories c WHERE `+where, id).Scan(&item.ID, &item.Name, &item.Slug, &desc, &parent, &item.Sort, &status, &item.CreatedAt, &item.UpdatedAt, &item.PostCount)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, 0, nil
	}
	if err != nil {
		return nil, 0, err
	}
	item.Description = nullString(desc)
	if parent.Valid {
		v := uint64(parent.Int64)
		item.ParentID = &v
	}
	item.Activate = status == "active"
	return []Category{item}, 1, nil
}

// SaveCategory 创建或更新分类，校验父分类存在并拒绝循环层级
func (s *Service) SaveCategory(ctx context.Context, id uint64, input ResourceInput) (Category, error) {
	if input.Name == nil || strings.TrimSpace(*input.Name) == "" || input.Slug == nil || !validSlug(*input.Slug) {
		return Category{}, ErrInvalid
	}
	parent, err := nullableUint(input.ParentID)
	if err != nil {
		return Category{}, err
	}
	if parent != nil && parent.(uint64) == id {
		return Category{}, ErrInvalid
	}
	if parent != nil {
		var exists int
		if err = s.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM categories WHERE id=? AND deleted_at IS NULL", parent).Scan(&exists); err != nil {
			return Category{}, err
		}
		if exists == 0 {
			return Category{}, ErrInvalid
		}
		if id > 0 {
			var createsCycle int
			if err = s.db.QueryRowContext(ctx, `WITH RECURSIVE descendants AS (
				SELECT id FROM categories WHERE parent_id=? AND deleted_at IS NULL
				UNION ALL
				SELECT c.id FROM categories c JOIN descendants d ON c.parent_id=d.id WHERE c.deleted_at IS NULL
			) SELECT COUNT(*) FROM descendants WHERE id=?`, id, parent).Scan(&createsCycle); err != nil {
				return Category{}, err
			}
			if createsCycle > 0 {
				return Category{}, ErrInvalid
			}
		}
	}
	name := strings.TrimSpace(*input.Name)
	slug := strings.TrimSpace(*input.Slug)
	desc := ""
	if input.Description != nil {
		desc = *input.Description
	}
	sort := 0
	if input.Sort != nil {
		sort = *input.Sort
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
		res, err := s.db.ExecContext(ctx, `INSERT INTO categories(parent_id,name,slug,description,sort_order,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)`, parent, name, slug, nullable(desc), sort, status, now, now)
		if err != nil {
			return Category{}, classifyDB(err)
		}
		value, _ := res.LastInsertId()
		id = uint64(value)
	} else {
		res, err := s.db.ExecContext(ctx, `UPDATE categories SET parent_id=?,name=?,slug=?,description=?,sort_order=?,status=?,updated_at=? WHERE id=? AND deleted_at IS NULL`, parent, name, slug, nullable(desc), sort, status, now, id)
		if err != nil {
			return Category{}, classifyDB(err)
		}
		if n, _ := res.RowsAffected(); n == 0 {
			return Category{}, ErrNotFound
		}
	}
	return s.GetCategory(ctx, id, true)
}

func (s *Service) SetCategoryStatus(ctx context.Context, id uint64, active bool) (Category, error) {
	status := "disabled"
	if active {
		status = "active"
	}
	res, err := s.db.ExecContext(ctx, "UPDATE categories SET status=?,updated_at=? WHERE id=? AND deleted_at IS NULL", status, time.Now().UTC(), id)
	if err != nil {
		return Category{}, err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return Category{}, ErrNotFound
	}
	return s.GetCategory(ctx, id, true)
}

// DeleteCategories 在事务中软删除分类，被文章或子分类引用时拒绝整次操作
func (s *Service) DeleteCategories(ctx context.Context, ids []uint64) error {
	if len(ids) == 0 {
		return ErrInvalid
	}
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	for _, id := range ids {
		var used, children int
		if err = tx.QueryRowContext(ctx, "SELECT COUNT(*) FROM posts WHERE category_id=? AND deleted_at IS NULL", id).Scan(&used); err != nil {
			return err
		}
		if err = tx.QueryRowContext(ctx, "SELECT COUNT(*) FROM categories WHERE parent_id=? AND deleted_at IS NULL", id).Scan(&children); err != nil {
			return err
		}
		if used > 0 || children > 0 {
			return ErrReferenced
		}
		if _, err = tx.ExecContext(ctx, "UPDATE categories SET deleted_at=?,updated_at=? WHERE id=? AND deleted_at IS NULL", time.Now().UTC(), time.Now().UTC(), id); err != nil {
			return err
		}
	}
	return tx.Commit()
}
