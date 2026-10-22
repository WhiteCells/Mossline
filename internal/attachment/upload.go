package attachment

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"mime"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

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

// safeDisplayName 去除路径和不适合展示的字符，并将名称限制为一百八十个字符
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

// Upload 根据文件内容识别 MIME 类型，校验大小后写入随机存储路径
// 记录附件及可选关联，写入失败时尽力清理已生成的文件和记录
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
