package content

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/url"
	"strconv"
	"strings"
	"time"
)

var (
	ErrNotFound   = errors.New("resource not found")
	ErrConflict   = errors.New("resource conflict")
	ErrInvalid    = errors.New("invalid input")
	ErrReferenced = errors.New("resource is referenced")
)

func nullable(value string) any {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	return strings.TrimSpace(value)
}

func nullableUint(value any) (any, error) {
	if value == nil {
		return nil, nil
	}
	switch typed := value.(type) {
	case float64:
		if typed <= 0 || typed != float64(uint64(typed)) {
			return nil, ErrInvalid
		}
		return uint64(typed), nil
	case string:
		if strings.TrimSpace(typed) == "" {
			return nil, nil
		}
		id, err := strconv.ParseUint(typed, 10, 64)
		if err != nil || id == 0 {
			return nil, ErrInvalid
		}
		return id, nil
	case json.Number:
		id, err := strconv.ParseUint(string(typed), 10, 64)
		if err != nil || id == 0 {
			return nil, ErrInvalid
		}
		return id, nil
	default:
		return nil, ErrInvalid
	}
}

func parseIDs(values []any) ([]uint64, error) {
	seen := map[uint64]struct{}{}
	ids := make([]uint64, 0, len(values))
	for _, value := range values {
		parsed, err := nullableUint(value)
		if err != nil || parsed == nil {
			return nil, ErrInvalid
		}
		id := parsed.(uint64)
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		ids = append(ids, id)
	}
	return ids, nil
}

func parseDate(value *string) (*time.Time, error) {
	if value == nil || strings.TrimSpace(*value) == "" {
		return nil, nil
	}
	for _, layout := range []string{time.RFC3339, "2006-01-02T15:04", "2006-01-02 15:04:05"} {
		if parsed, err := time.Parse(layout, *value); err == nil {
			utc := parsed.UTC()
			return &utc, nil
		}
	}
	return nil, ErrInvalid
}

func validSlug(value string) bool {
	value = strings.TrimSpace(value)
	if value == "" || len(value) > 255 || strings.HasPrefix(value, "-") || strings.HasSuffix(value, "-") {
		return false
	}
	for _, r := range value {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' || (r >= '\u4e00' && r <= '\u9fff') {
			continue
		}
		return false
	}
	return true
}

func validStatus(value string, allowed ...string) bool {
	for _, candidate := range allowed {
		if value == candidate {
			return true
		}
	}
	return false
}

func validHTTPURL(value string) bool {
	parsed, err := url.ParseRequestURI(strings.TrimSpace(value))
	return err == nil && (parsed.Scheme == "http" || parsed.Scheme == "https") && parsed.Host != ""
}

func nullString(value sql.NullString) string {
	if value.Valid {
		return value.String
	}
	return ""
}
func nullTime(value sql.NullTime) *time.Time {
	if value.Valid {
		item := value.Time
		return &item
	}
	return nil
}

func orderBy(requested, direction, fallback string, allowed map[string]string) string {
	column := allowed[requested]
	if column == "" {
		column = fallback
	}
	order := "DESC"
	if strings.EqualFold(direction, "asc") {
		order = "ASC"
	}
	return fmt.Sprintf("%s %s", column, order)
}

func placeholders(size int) string { return strings.TrimRight(strings.Repeat("?,", size), ",") }
