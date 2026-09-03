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

func TestNormalizePostPublishedAt(t *testing.T) {
	now := time.Date(2026, time.September, 2, 1, 2, 3, 456000000, time.FixedZone("CST", 8*60*60))
	nowUTC := now.UTC()
	past := nowUTC.Add(-time.Hour)
	future := nowUTC.Add(time.Hour)

	tests := []struct {
		name      string
		status    string
		input     *time.Time
		want      *time.Time
		wantError bool
	}{
		{name: "published without time uses now", status: "published", want: &nowUTC},
		{name: "published future time uses now", status: "published", input: &future, want: &nowUTC},
		{name: "published past time is preserved", status: "published", input: &past, want: &past},
		{name: "scheduled future time is preserved", status: "scheduled", input: &future, want: &future},
		{name: "scheduled without time is rejected", status: "scheduled", wantError: true},
		{name: "scheduled current time is rejected", status: "scheduled", input: &nowUTC, wantError: true},
		{name: "scheduled past time is rejected", status: "scheduled", input: &past, wantError: true},
		{name: "draft time is unchanged", status: "draft", input: &future, want: &future},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := normalizePostPublishedAt(tt.status, tt.input, now)
			if tt.wantError {
				if err == nil {
					t.Fatal("normalizePostPublishedAt() accepted an invalid publication time")
				}
				return
			}
			if err != nil {
				t.Fatalf("normalizePostPublishedAt() error = %v", err)
			}
			if got == nil || tt.want == nil || !got.Equal(*tt.want) {
				t.Fatalf("normalizePostPublishedAt() = %v, want %v", got, tt.want)
			}
		})
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
