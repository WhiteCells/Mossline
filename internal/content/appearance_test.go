package content

import (
	"strings"
	"testing"
)

func TestValidBackgroundURL(t *testing.T) {
	for _, raw := range []string{"", "/uploads/2026/cover.webp", "/media/cover.webp", "https://example.com/cover.jpg?width=1920", "http://localhost:8080/uploads/a.png"} {
		if !validBackgroundURL(raw) {
			t.Errorf("rejected valid URL %q", raw)
		}
	}
	for _, raw := range []string{"javascript:alert(1)", "data:image/png;base64,aaa", "//example.com/a.jpg", "/uploads/../private", "/uploads/%2e%2e/private", "/%2fexample.com/a.png", "/uploads/%5ca.png", "https:///a.jpg", "https://user:pass@example.com/a", "https://example.com/a\nb", `https://example.com\a.jpg`, "https://example.com/a b", strings.Repeat("a", 1001)} {
		if validBackgroundURL(raw) {
			t.Errorf("accepted invalid URL %q", raw)
		}
	}
}
