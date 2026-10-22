package auth

import (
	"testing"
	"time"
)

func TestNewServiceUsesNamespacedSessionTTL(t *testing.T) {
	t.Setenv("AUTH_SESSION_TTL", "1h")
	t.Setenv("AUTH_SESSION_HOURS", "2")
	t.Setenv("MOSSLINE_AUTH_SESSION_TTL", "12h")
	if service := NewService(nil); service.sessionTTL != 12*time.Hour {
		t.Fatalf("sessionTTL = %s, want 12h", service.sessionTTL)
	}
	t.Setenv("MOSSLINE_AUTH_SESSION_TTL", "")
	if service := NewService(nil); service.sessionTTL != 24*time.Hour {
		t.Fatalf("legacy variables changed default sessionTTL: %s", service.sessionTTL)
	}
}

func TestTokenHashIsStableAndDoesNotContainToken(t *testing.T) {
	token := "secret-session-token"
	first := tokenHash(token)
	if first != tokenHash(token) {
		t.Fatal("token hash must be stable")
	}
	if len(first) != 64 {
		t.Fatalf("expected SHA-256 hex, got length %d", len(first))
	}
	if first == token {
		t.Fatal("raw session token must never be persisted")
	}
}

func TestPermissionsForRole(t *testing.T) {
	if got := permissionsForRole("admin"); len(got) != 1 || got[0] != "*" {
		t.Fatalf("unexpected admin permissions: %v", got)
	}
	if got := permissionsForRole("editor"); len(got) == 0 {
		t.Fatal("editor should receive content permissions")
	}
}
