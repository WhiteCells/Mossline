package user

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
)

var ErrNotFound = errors.New("user not found")
var ErrProtected = errors.New("protected user")

type Service struct{ db *sql.DB }

func NewService(db *sql.DB) *Service { return &Service{db: db} }

const userColumns = `id, username, email, nickname, avatar_url, bio, role, status, created_at, updated_at`

func scanUser(scanner interface{ Scan(...any) error }) (User, error) {
	var value User
	var email, avatar, bio sql.NullString
	err := scanner.Scan(&value.ID, &value.Username, &email, &value.Nickname, &avatar, &bio, &value.Role, &value.Status, &value.CreatedAt, &value.UpdatedAt)
	if email.Valid {
		value.Email = email.String
	}
	if avatar.Valid {
		value.Avatar = avatar.String
	}
	if bio.Valid {
		value.Bio = bio.String
	}
	return value, err
}

func (s *Service) List(ctx context.Context, query ListQuery) ([]User, int64, error) {
	where := []string{"deleted_at IS NULL"}
	args := []any{}
	if query.Search != "" {
		where = append(where, "(username LIKE ? OR nickname LIKE ? OR email LIKE ?)")
		pattern := "%" + query.Search + "%"
		args = append(args, pattern, pattern, pattern)
	}
	if query.Role != "" {
		where = append(where, "role = ?")
		args = append(args, query.Role)
	}
	if query.Status != "" {
		where = append(where, "status = ?")
		args = append(args, query.Status)
	}
	clause := strings.Join(where, " AND ")
	var total int64
	if err := s.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM users WHERE "+clause, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	sortColumns := map[string]string{"id": "id", "username": "username", "nickname": "nickname", "email": "email", "role": "role", "status": "status", "created_at": "created_at", "updated_at": "updated_at"}
	sort := sortColumns[query.Sort]
	if sort == "" {
		sort = "created_at"
	}
	order := "DESC"
	if strings.EqualFold(query.Order, "asc") {
		order = "ASC"
	}
	args = append(args, query.Size, (query.Page-1)*query.Size)
	rows, err := s.db.QueryContext(ctx, fmt.Sprintf("SELECT %s FROM users WHERE %s ORDER BY %s %s LIMIT ? OFFSET ?", userColumns, clause, sort, order), args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	items := make([]User, 0)
	for rows.Next() {
		item, err := scanUser(rows)
		if err != nil {
			return nil, 0, err
		}
		items = append(items, item)
	}
	return items, total, rows.Err()
}

func (s *Service) Get(ctx context.Context, id uint64) (User, error) {
	value, err := scanUser(s.db.QueryRowContext(ctx, "SELECT "+userColumns+" FROM users WHERE id = ? AND deleted_at IS NULL", id))
	if errors.Is(err, sql.ErrNoRows) {
		return User{}, ErrNotFound
	}
	return value, err
}

func nullable(value string) any {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	return strings.TrimSpace(value)
}

func (s *Service) Create(ctx context.Context, input CreateRequest) (User, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return User{}, err
	}
	now := time.Now().UTC()
	result, err := s.db.ExecContext(ctx, `INSERT INTO users (username,email,password_hash,nickname,avatar_url,bio,role,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)`, input.Username, nullable(input.Email), string(hash), input.Nickname, nullable(input.Avatar), nullable(input.Bio), input.Role, input.Status, now, now)
	if err != nil {
		return User{}, err
	}
	id, err := result.LastInsertId()
	if err != nil {
		return User{}, err
	}
	return s.Get(ctx, uint64(id))
}

func (s *Service) Update(ctx context.Context, id uint64, input UpdateRequest) (User, error) {
	set := []string{}
	args := []any{}
	add := func(column string, value any) {
		set = append(set, column+" = ?")
		args = append(args, value)
	}
	if input.Username != nil {
		add("username", strings.TrimSpace(*input.Username))
	}
	if input.Nickname != nil {
		add("nickname", strings.TrimSpace(*input.Nickname))
	}
	if input.Email != nil {
		add("email", nullable(*input.Email))
	}
	if input.Avatar != nil {
		add("avatar_url", nullable(*input.Avatar))
	}
	if input.Bio != nil {
		add("bio", nullable(*input.Bio))
	}
	if input.Role != nil {
		add("role", *input.Role)
	}
	if input.Status != nil {
		add("status", *input.Status)
	}
	if input.Password != nil && *input.Password != "" {
		hash, err := bcrypt.GenerateFromPassword([]byte(*input.Password), bcrypt.DefaultCost)
		if err != nil {
			return User{}, err
		}
		add("password_hash", string(hash))
	}
	if len(set) == 0 {
		return s.Get(ctx, id)
	}
	add("updated_at", time.Now().UTC())
	args = append(args, id)
	result, err := s.db.ExecContext(ctx, "UPDATE users SET "+strings.Join(set, ", ")+" WHERE id = ? AND deleted_at IS NULL", args...)
	if err != nil {
		return User{}, err
	}
	affected, _ := result.RowsAffected()
	if affected == 0 {
		return User{}, ErrNotFound
	}
	return s.Get(ctx, id)
}

func (s *Service) Delete(ctx context.Context, ids []uint64) error {
	if len(ids) == 0 {
		return nil
	}
	placeholders := strings.TrimRight(strings.Repeat("?,", len(ids)), ",")
	args := make([]any, len(ids))
	for i, id := range ids {
		args[i] = id
	}
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if _, err = tx.ExecContext(ctx, "DELETE FROM sessions WHERE user_id IN ("+placeholders+")", args...); err != nil {
		return err
	}
	deleteArgs := append([]any{time.Now().UTC(), time.Now().UTC()}, args...)
	if _, err = tx.ExecContext(ctx, "UPDATE users SET deleted_at = ?, updated_at = ? WHERE id IN ("+placeholders+") AND deleted_at IS NULL", deleteArgs...); err != nil {
		return err
	}
	return tx.Commit()
}

func (s *Service) CountActiveAdmins(ctx context.Context) (int, error) {
	var count int
	err := s.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM users WHERE role='admin' AND status='active' AND deleted_at IS NULL").Scan(&count)
	return count, err
}
