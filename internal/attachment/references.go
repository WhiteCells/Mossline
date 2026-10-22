package attachment

import (
	"context"
	"database/sql"
	"net/url"
	"regexp"
	"strings"
	"time"
)

// SyncReferences 按内容中包含的附件 URL 重建引用，并清除当前编辑关联键的临时引用
// 必须使用内容写入的同一事务，提交和回滚由调用方负责
func SyncReferences(ctx context.Context, tx *sql.Tx, ownerType string, ownerID uint64, relationKey, title, content string) error {
	if !validOwnerType(ownerType) {
		return ErrInvalid
	}
	if relationKey != "" {
		// 清除编辑期间的临时关联，再按提交正文中的附件 URL 重建正式引用
		// 这样从正文移除的图片不会继续被标记为已引用
		if _, err := tx.ExecContext(ctx, `DELETE FROM attachment_refs WHERE owner_type=? AND relation_key=? AND (owner_id IS NULL OR owner_id=?)`, ownerType, relationKey, ownerID); err != nil {
			return err
		}
	}
	rows, err := tx.QueryContext(ctx, `SELECT id,url FROM attachments WHERE deleted_at IS NULL`)
	if err != nil {
		return err
	}
	defer rows.Close()
	type found struct {
		id  uint64
		url string
	}
	var all []found
	for rows.Next() {
		var f found
		if err := rows.Scan(&f.id, &f.url); err != nil {
			return err
		}
		all = append(all, f)
	}
	if err := rows.Err(); err != nil {
		return err
	}
	if _, err = tx.ExecContext(ctx, `DELETE FROM attachment_refs WHERE owner_type=? AND owner_id=? AND relation_key='content'`, ownerType, ownerID); err != nil {
		return err
	}
	for _, f := range all {
		if !strings.Contains(content, f.url) {
			continue
		}
		_, err = tx.ExecContext(ctx, `INSERT IGNORE INTO attachment_refs(attachment_id,owner_type,owner_id,relation_key,title,created_at) VALUES(?,?,?,?,?,?)`, f.id, ownerType, ownerID, "content", title, time.Now().UTC())
		if err != nil {
			return err
		}
	}
	return nil
}

// IDsFromURLs 提取内容中的 HTTP 地址和上传路径，返回的是 URL 而非数据库 ID
func IDsFromURLs(content string) []string {
	re := regexp.MustCompile(`https?://[^\s)]+|/uploads/[^\s)]+`)
	return re.FindAllString(content, -1)
}

// ValidatePublicURL 检查地址是否为带主机名的 HTTP 或 HTTPS URL，不验证可访问性
func ValidatePublicURL(raw string) bool {
	parsed, err := url.Parse(raw)
	return err == nil && (parsed.Scheme == "http" || parsed.Scheme == "https") && parsed.Host != ""
}
