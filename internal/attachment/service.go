package attachment

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"mossline/internal/config"
)

var (
	ErrNotFound   = errors.New("attachment not found")
	ErrReferenced = errors.New("attachment is referenced")
	ErrInvalid    = errors.New("invalid attachment")
)

type Service struct {
	db      *sql.DB
	storage config.Storage
}

func NewService(db *sql.DB, storage config.Storage) *Service {
	return &Service{db: db, storage: storage}
}

// List 查询附件及已保存内容的引用，临时上传关联不计入已引用筛选
func (s *Service) List(ctx context.Context, opt ListOptions) ([]Attachment, int64, error) {
	where := []string{"a.deleted_at IS NULL"}
	args := []any{}
	if opt.Search != "" {
		where = append(where, "(a.original_name LIKE ? OR a.file_name LIKE ?)")
		needle := "%" + opt.Search + "%"
		args = append(args, needle, needle)
	}
	switch opt.Type {
	case "image":
		where = append(where, "a.mime_type LIKE 'image/%'")
	case "document":
		where = append(where, "a.mime_type NOT LIKE 'image/%' AND a.mime_type <> 'application/octet-stream'")
	case "other":
		where = append(where, "a.mime_type = 'application/octet-stream'")
	}
	if opt.Referenced == "true" {
		where = append(where, "EXISTS (SELECT 1 FROM attachment_refs ar WHERE ar.attachment_id=a.id AND ar.owner_id IS NOT NULL)")
	} else if opt.Referenced == "false" {
		where = append(where, "NOT EXISTS (SELECT 1 FROM attachment_refs ar WHERE ar.attachment_id=a.id AND ar.owner_id IS NOT NULL)")
	}
	if opt.DateFrom != "" {
		where = append(where, "a.created_at >= ?")
		args = append(args, opt.DateFrom)
	}
	if opt.DateTo != "" {
		where = append(where, "a.created_at < DATE_ADD(?, INTERVAL 1 DAY)")
		args = append(args, opt.DateTo)
	}
	clause := strings.Join(where, " AND ")
	var total int64
	if err := s.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM attachments a WHERE "+clause, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	sortColumn := map[string]string{"name": "a.original_name", "size": "a.size", "created_at": "a.created_at"}[opt.Sort]
	if sortColumn == "" {
		sortColumn = "a.created_at"
	}
	order := "DESC"
	if strings.EqualFold(opt.Order, "asc") {
		order = "ASC"
	}
	query := `SELECT a.id,a.original_name,a.file_name,a.storage_key,a.mime_type,a.size,a.url,a.created_at,u.nickname
		FROM attachments a LEFT JOIN users u ON u.id=a.user_id WHERE ` + clause + ` ORDER BY ` + sortColumn + ` ` + order + ` LIMIT ? OFFSET ?`
	rows, err := s.db.QueryContext(ctx, query, append(args, opt.Size, (opt.Page-1)*opt.Size)...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	items := make([]Attachment, 0)
	for rows.Next() {
		item, err := scan(rows)
		if err != nil {
			return nil, 0, err
		}
		item.References, err = s.references(ctx, item.ID)
		if err != nil {
			return nil, 0, err
		}
		items = append(items, item)
	}
	return items, total, rows.Err()
}

func (s *Service) Get(ctx context.Context, id uint64) (Attachment, error) {
	item, err := scan(s.db.QueryRowContext(ctx, `SELECT a.id,a.original_name,a.file_name,a.storage_key,a.mime_type,a.size,a.url,a.created_at,u.nickname FROM attachments a LEFT JOIN users u ON u.id=a.user_id WHERE a.id=? AND a.deleted_at IS NULL`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return Attachment{}, ErrNotFound
	}
	if err != nil {
		return Attachment{}, err
	}
	item.References, err = s.references(ctx, item.ID)
	return item, err
}

func (s *Service) references(ctx context.Context, id uint64) ([]Reference, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT id,owner_type,COALESCE(title,''),owner_id FROM attachment_refs WHERE attachment_id=? AND owner_id IS NOT NULL ORDER BY created_at DESC`, id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	refs := make([]Reference, 0)
	for rows.Next() {
		var ref Reference
		var ownerID sql.NullInt64
		if err := rows.Scan(&ref.ID, &ref.Type, &ref.Title, &ownerID); err != nil {
			return nil, err
		}
		if ownerID.Valid {
			ref.URL = adminURL(ref.Type, uint64(ownerID.Int64))
		}
		refs = append(refs, ref)
	}
	return refs, rows.Err()
}

// Rename 仅修改展示名称，保留存储路径和公开地址
func (s *Service) Rename(ctx context.Context, id uint64, name string) (Attachment, error) {
	name = safeDisplayName(name)
	if name == "attachment" {
		return Attachment{}, ErrInvalid
	}
	res, err := s.db.ExecContext(ctx, `UPDATE attachments SET original_name=? WHERE id=? AND deleted_at IS NULL`, name, id)
	if err != nil {
		return Attachment{}, err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return Attachment{}, ErrNotFound
	}
	return s.Get(ctx, id)
}

// Delete 拒绝删除被已保存内容引用的附件，先提交软删除再移除本地文件
// 文件移除失败时尝试恢复记录，数据库和文件系统之间不具备原子事务
func (s *Service) Delete(ctx context.Context, id uint64) error {
	item, err := s.Get(ctx, id)
	if err != nil {
		return err
	}
	var refs int
	if err = s.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM attachment_refs WHERE attachment_id=? AND owner_id IS NOT NULL", id).Scan(&refs); err != nil {
		return err
	}
	if refs > 0 {
		return ErrReferenced
	}
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	res, err := tx.ExecContext(ctx, "UPDATE attachments SET deleted_at=? WHERE id=? AND deleted_at IS NULL", time.Now().UTC(), id)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrNotFound
	}
	if err = tx.Commit(); err != nil {
		return err
	}
	if err = os.Remove(filepath.Join(s.storage.LocalDirectory, filepath.FromSlash(item.StorageKey))); err != nil && !errors.Is(err, os.ErrNotExist) {
		// 文件删除失败时尝试撤销软删除，使附件保持可见以便重试
		_, _ = s.db.ExecContext(ctx, "UPDATE attachments SET deleted_at=NULL WHERE id=?", id)
		return fmt.Errorf("file removal failed and record was restored: %w", err)
	}
	return nil
}

// DeleteBatch 先检查全部附件的引用，再逐个删除
// 中途失败会保留此前已完成的删除，不保证整批回滚
func (s *Service) DeleteBatch(ctx context.Context, ids []uint64) error {
	for _, id := range ids {
		var n int
		if err := s.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM attachment_refs WHERE attachment_id=? AND owner_id IS NOT NULL", id).Scan(&n); err != nil {
			return err
		}
		if n > 0 {
			return ErrReferenced
		}
	}
	for _, id := range ids {
		if err := s.Delete(ctx, id); err != nil {
			return err
		}
	}
	return nil
}
