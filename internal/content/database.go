package content

import (
	"context"
	"fmt"
	"strings"
	"time"
)

// softDelete 为白名单中的资源批量标记删除，表名不能直接来自用户输入
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

// classifyDB 将重复值和外键错误转换为业务错误，其余数据库错误原样返回
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
