package content

import (
	"testing"
	"time"
)

func TestValidSlug(t *testing.T) {
	for _, value := range []string{"hello-world", "go-语言", "post-2026"} {
		if !validSlug(value) {
			t.Fatalf("validSlug(%q) = false", value)
		}
	}
	for _, value := range []string{"", "Uppercase", "white space", "-leading", "trailing-", "../escape"} {
		if validSlug(value) {
			t.Fatalf("validSlug(%q) = true", value)
		}
	}
}

func TestParseDateAndIDs(t *testing.T) {
	value := "2026-09-01T12:30"
	parsed, err := parseDate(&value)
	if err != nil || parsed.Location() != time.UTC {
		t.Fatalf("parseDate() = %v, %v", parsed, err)
	}
	ids, err := parseIDs([]any{"1", float64(2), "1"})
	if err != nil || len(ids) != 2 || ids[0] != 1 || ids[1] != 2 {
		t.Fatalf("parseIDs() = %v, %v", ids, err)
	}
	if _, err := parseIDs([]any{"bad"}); err == nil {
		t.Fatal("parseIDs accepted invalid ID")
	}
}

func TestOrderByUsesAllowList(t *testing.T) {
	allowed := map[string]string{"name": "t.name"}
	if got := orderBy("name", "asc", "t.created_at", allowed); got != "t.name ASC" {
		t.Fatalf("orderBy = %q", got)
	}
	if got := orderBy("name; DROP TABLE users", "desc", "t.created_at", allowed); got != "t.created_at DESC" {
		t.Fatalf("unsafe sort was not rejected: %q", got)
	}
}
