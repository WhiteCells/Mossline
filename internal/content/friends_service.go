package content

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"time"
)

// ListFriends 查询分页友链，公开读取仅返回启用项
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

// SaveFriend 创建或更新友链，站点和非空图标地址必须为完整 HTTP 或 HTTPS URL
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
