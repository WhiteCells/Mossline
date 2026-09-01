package content

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"
)

type Service struct{ db *sql.DB }

func NewService(db *sql.DB) *Service { return &Service{db: db} }

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

func (s *Service) ListFriends(ctx context.Context, opt ListOptions) ([]Friend, int64, error) {
	where := []string{"deleted_at IS NULL"}
	args := []any{}
	if !opt.Admin || opt.Status == "active" {
		where = append(where, "is_active=TRUE")
	} else if opt.Status == "disabled" {
		where = append(where, "is_active=FALSE")
	}
	if opt.Search != "" {
		where = append(where, "(name LIKE ? OR url LIKE ? OR description LIKE ?)")
		needle := "%" + opt.Search + "%"
		args = append(args, needle, needle, needle)
	}
	clause := strings.Join(where, " AND ")
	var total int64
	if err := s.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM friends WHERE "+clause, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	order := orderBy(opt.Sort, opt.Order, "sort_order", map[string]string{"name": "name", "sort": "sort_order", "created_at": "created_at", "updated_at": "updated_at"})
	rows, err := s.db.QueryContext(ctx, "SELECT id,name,url,logo_url,description,group_name,sort_order,is_active,created_at,updated_at FROM friends WHERE "+clause+" ORDER BY "+order+" LIMIT ? OFFSET ?", append(args, opt.Size, (opt.Page-1)*opt.Size)...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	items := make([]Friend, 0)
	for rows.Next() {
		var i Friend
		var logo, desc, group sql.NullString
		if err = rows.Scan(&i.ID, &i.Name, &i.URI, &logo, &desc, &group, &i.Sort, &i.Activate, &i.CreatedAt, &i.UpdatedAt); err != nil {
			return nil, 0, err
		}
		i.Logo = nullString(logo)
		i.Desc = nullString(desc)
		i.Group = nullString(group)
		items = append(items, i)
	}
	return items, total, rows.Err()
}
func (s *Service) GetFriend(ctx context.Context, id uint64, admin bool) (Friend, error) {
	where := "id=? AND deleted_at IS NULL"
	if !admin {
		where += " AND is_active=TRUE"
	}
	var i Friend
	var logo, desc, group sql.NullString
	err := s.db.QueryRowContext(ctx, "SELECT id,name,url,logo_url,description,group_name,sort_order,is_active,created_at,updated_at FROM friends WHERE "+where, id).Scan(&i.ID, &i.Name, &i.URI, &logo, &desc, &group, &i.Sort, &i.Activate, &i.CreatedAt, &i.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return Friend{}, ErrNotFound
	}
	if err != nil {
		return Friend{}, err
	}
	i.Logo = nullString(logo)
	i.Desc = nullString(desc)
	i.Group = nullString(group)
	return i, nil
}
func (s *Service) SaveFriend(ctx context.Context, id uint64, input ResourceInput) (Friend, error) {
	if input.Name == nil || strings.TrimSpace(*input.Name) == "" || input.URI == nil || !validHTTPURL(*input.URI) {
		return Friend{}, ErrInvalid
	}
	logo, desc, group := "", "", ""
	if input.Logo != nil {
		logo = *input.Logo
		if logo != "" && !validHTTPURL(logo) {
			return Friend{}, ErrInvalid
		}
	}
	if input.Desc != nil {
		desc = *input.Desc
	}
	if input.Group != nil {
		group = *input.Group
	}
	sort := 0
	if input.Sort != nil {
		sort = *input.Sort
	}
	active := true
	if input.Activate != nil {
		active = *input.Activate
	}
	now := time.Now().UTC()
	if id == 0 {
		res, err := s.db.ExecContext(ctx, "INSERT INTO friends(name,url,logo_url,description,group_name,sort_order,is_active,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)", strings.TrimSpace(*input.Name), strings.TrimSpace(*input.URI), nullable(logo), nullable(desc), nullable(group), sort, active, now, now)
		if err != nil {
			return Friend{}, classifyDB(err)
		}
		v, _ := res.LastInsertId()
		id = uint64(v)
	} else {
		res, err := s.db.ExecContext(ctx, "UPDATE friends SET name=?,url=?,logo_url=?,description=?,group_name=?,sort_order=?,is_active=?,updated_at=? WHERE id=? AND deleted_at IS NULL", strings.TrimSpace(*input.Name), strings.TrimSpace(*input.URI), nullable(logo), nullable(desc), nullable(group), sort, active, now, id)
		if err != nil {
			return Friend{}, classifyDB(err)
		}
		if n, _ := res.RowsAffected(); n == 0 {
			return Friend{}, ErrNotFound
		}
	}
	return s.GetFriend(ctx, id, true)
}
func (s *Service) SetFriendStatus(ctx context.Context, id uint64, active bool) (Friend, error) {
	res, err := s.db.ExecContext(ctx, "UPDATE friends SET is_active=?,updated_at=? WHERE id=? AND deleted_at IS NULL", active, time.Now().UTC(), id)
	if err != nil {
		return Friend{}, err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return Friend{}, ErrNotFound
	}
	return s.GetFriend(ctx, id, true)
}
func (s *Service) DeleteFriends(ctx context.Context, ids []uint64) error {
	return s.softDelete(ctx, "friends", ids)
}
func (s *Service) softDelete(ctx context.Context, table string, ids []uint64) error {
	if len(ids) == 0 {
		return ErrInvalid
	}
	allowed := map[string]bool{"friends": true, "moments": true, "posts": true}
	if !allowed[table] {
		return ErrInvalid
	}
	query := fmt.Sprintf("UPDATE %s SET deleted_at=?,updated_at=? WHERE id IN (%s) AND deleted_at IS NULL", table, placeholders(len(ids)))
	args := []any{time.Now().UTC(), time.Now().UTC()}
	for _, id := range ids {
		args = append(args, id)
	}
	_, err := s.db.ExecContext(ctx, query, args...)
	return err
}

func classifyDB(err error) error {
	if err == nil {
		return nil
	}
	message := err.Error()
	if strings.Contains(message, "Duplicate entry") {
		return fmt.Errorf("%w: value already exists", ErrConflict)
	}
	if strings.Contains(message, "foreign key constraint fails") {
		return fmt.Errorf("%w: invalid relation", ErrInvalid)
	}
	return err
}
