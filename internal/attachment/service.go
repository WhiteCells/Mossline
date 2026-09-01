package attachment

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"mime"
	"mime/multipart"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
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

type ListOptions struct {
	Page, Size                                              int
	Search, Type, Referenced, DateFrom, DateTo, Sort, Order string
}

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

func adminURL(ownerType string, id uint64) string {
	switch ownerType {
	case "post":
		return fmt.Sprintf("/admin/posts/%d/edit", id)
	case "moment":
		return fmt.Sprintf("/admin/moments/%d/edit", id)
	case "user":
		return "/admin/users"
	case "friend":
		return "/admin/friends"
	case "about":
		return "/admin/about"
	}
	return ""
}

func randomName() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func safeDisplayName(value string) string {
	value = filepath.Base(strings.TrimSpace(value))
	value = strings.Map(func(r rune) rune {
		if r < 32 || strings.ContainsRune(`<>:"/\\|?*`, r) {
			return -1
		}
		return r
	}, value)
	if value == "" || value == "." {
		return "attachment"
	}
	if len([]rune(value)) > 180 {
		value = string([]rune(value)[:180])
	}
	return value
}

var canonicalExt = map[string]string{"image/jpeg": ".jpg", "image/png": ".png", "image/gif": ".gif", "image/webp": ".webp", "application/pdf": ".pdf", "text/plain": ".txt"}

func (s *Service) Upload(ctx context.Context, userID uint64, header *multipart.FileHeader, displayName, ownerType, ownerIDText, relationKey string) (Attachment, error) {
	if ownerType == "article" {
		ownerType = "post"
	}
	if header == nil || header.Size <= 0 || header.Size > s.storage.MaxUploadBytes {
		return Attachment{}, ErrInvalid
	}
	file, err := header.Open()
	if err != nil {
		return Attachment{}, err
	}
	defer file.Close()
	peek := make([]byte, 512)
	n, err := io.ReadFull(file, peek)
	if err != nil && !errors.Is(err, io.ErrUnexpectedEOF) {
		return Attachment{}, ErrInvalid
	}
	peek = peek[:n]
	mimeType := http.DetectContentType(peek)
	if normalized, _, parseErr := mime.ParseMediaType(mimeType); parseErr == nil {
		mimeType = normalized
	}
	allowed := false
	for _, m := range s.storage.AllowedMIMETypes {
		if mimeType == m {
			allowed = true
			break
		}
	}
	if !allowed {
		return Attachment{}, ErrInvalid
	}
	if _, err = file.Seek(0, io.SeekStart); err != nil {
		return Attachment{}, err
	}
	random, err := randomName()
	if err != nil {
		return Attachment{}, err
	}
	now := time.Now().UTC()
	ext := canonicalExt[mimeType]
	if ext == "" {
		ext = strings.ToLower(filepath.Ext(header.Filename))
		if len(ext) > 10 {
			ext = ""
		}
	}
	storageKey := filepath.ToSlash(filepath.Join(now.Format("2006"), now.Format("01"), random+ext))
	fullPath := filepath.Join(s.storage.LocalDirectory, filepath.FromSlash(storageKey))
	if err := os.MkdirAll(filepath.Dir(fullPath), 0750); err != nil {
		return Attachment{}, err
	}
	out, err := os.OpenFile(fullPath, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0640)
	if err != nil {
		return Attachment{}, err
	}
	hash := sha256.New()
	written, copyErr := io.Copy(io.MultiWriter(out, hash), io.LimitReader(file, s.storage.MaxUploadBytes+1))
	closeErr := out.Close()
	if copyErr != nil || closeErr != nil || written > s.storage.MaxUploadBytes {
		_ = os.Remove(fullPath)
		return Attachment{}, ErrInvalid
	}
	original := safeDisplayName(displayName)
	if strings.TrimSpace(displayName) == "" {
		original = safeDisplayName(header.Filename)
	}
	publicURL := strings.TrimRight(s.storage.PublicURLPrefix, "/") + "/" + storageKey
	result, err := s.db.ExecContext(ctx, `INSERT INTO attachments(user_id,original_name,file_name,storage_key,mime_type,size,url,checksum_sha256,created_at) VALUES(NULLIF(?,0),?,?,?,?,?,?,?,?)`, userID, original, filepath.Base(storageKey), storageKey, mimeType, written, publicURL, hex.EncodeToString(hash.Sum(nil)), now)
	if err != nil {
		_ = os.Remove(fullPath)
		return Attachment{}, err
	}
	id, _ := result.LastInsertId()
	if validOwnerType(ownerType) {
		var ownerID any = nil
		if parsed, e := strconv.ParseUint(ownerIDText, 10, 64); e == nil && parsed > 0 {
			ownerID = parsed
		}
		relationKey = strings.TrimSpace(relationKey)
		if relationKey == "" {
			relationKey = "content"
		}
		if len(relationKey) > 64 {
			relationKey = relationKey[:64]
		}
		_, err = s.db.ExecContext(ctx, `INSERT INTO attachment_refs(attachment_id,owner_type,owner_id,relation_key,title,created_at) VALUES(?,?,?,?,?,?)`, id, ownerType, ownerID, relationKey, original, now)
		if err != nil {
			_, _ = s.db.ExecContext(ctx, "DELETE FROM attachments WHERE id=?", id)
			_ = os.Remove(fullPath)
			return Attachment{}, err
		}
	}
	return s.Get(ctx, uint64(id))
}

func validOwnerType(v string) bool {
	switch v {
	case "post", "moment", "about", "user", "friend":
		return true
	}
	return false
}

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
		// Compensate the soft-delete if local storage removal failed so the
		// attachment remains visible and the operator can retry safely.
		_, _ = s.db.ExecContext(ctx, "UPDATE attachments SET deleted_at=NULL WHERE id=?", id)
		return fmt.Errorf("file removal failed and record was restored: %w", err)
	}
	return nil
}

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

// SyncReferences finalizes uploads made before an owner existed and records any
// existing attachment URLs embedded in Markdown. It must be called in the same
// transaction as the content write.
func SyncReferences(ctx context.Context, tx *sql.Tx, ownerType string, ownerID uint64, relationKey, title, content string) error {
	if !validOwnerType(ownerType) {
		return ErrInvalid
	}
	if relationKey != "" {
		// Provisional editor references exist only to protect uploads before the
		// owning record is saved. Rebuild authoritative references from the
		// submitted Markdown so removed images do not remain falsely referenced.
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

func IDsFromURLs(content string) []string {
	re := regexp.MustCompile(`https?://[^\s)]+|/uploads/[^\s)]+`)
	return re.FindAllString(content, -1)
}

func ValidatePublicURL(raw string) bool {
	parsed, err := url.Parse(raw)
	return err == nil && (parsed.Scheme == "http" || parsed.Scheme == "https") && parsed.Host != ""
}
