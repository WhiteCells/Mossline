package config

import (
	"strings"
	"testing"
)

func TestLoadDefaults(t *testing.T) {
	for _, key := range []string{"APP_ENV", "DATABASE_URL", "DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD", "DB_MAX_OPEN_CONNS", "DB_MAX_IDLE_CONNS", "AUTH_TOKEN_BYTES", "STORAGE_DRIVER", "UPLOAD_DIR", "UPLOAD_MAX_BYTES", "UPLOAD_PUBLIC_URL", "CORS_ALLOWED_ORIGINS", "CORS_ALLOW_CREDENTIALS"} {
		t.Setenv(key, "")
	}

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}
	if cfg.Database.Port != 3306 || cfg.Database.Name != "mossline" {
		t.Fatalf("unexpected database defaults: %+v", cfg.Database)
	}
	if !strings.Contains(cfg.Database.DSN(), "parseTime=true") {
		t.Fatalf("DSN() must enable time parsing: %s", cfg.Database.DSN())
	}
	if cfg.Storage.MaxUploadBytes != 20<<20 {
		t.Fatalf("MaxUploadBytes = %d", cfg.Storage.MaxUploadBytes)
	}
}

func TestLoadRejectsInvalidValues(t *testing.T) {
	t.Setenv("DB_PORT", "not-a-port")
	t.Setenv("AUTH_TOKEN_BYTES", "12")

	_, err := Load()
	if err == nil || !strings.Contains(err.Error(), "DB_PORT") || !strings.Contains(err.Error(), "AUTH_TOKEN_BYTES") {
		t.Fatalf("Load() error = %v", err)
	}
}

func TestValidateRejectsWildcardCredentialedCORS(t *testing.T) {
	cfg := Config{
		Environment: Development,
		Database: Database{Host: "localhost", Name: "mossline", User: "mossline", MaxOpenConns: 1},
		Auth: Auth{SessionTTL: 1, TokenBytes: 32},
		Storage: Storage{Driver: "local", LocalDirectory: "uploads", PublicURLPrefix: "/uploads", MaxUploadBytes: 1, AllowedMIMETypes: []string{"image/png"}},
		CORS: CORS{AllowedOrigins: []string{"*"}, AllowCredentials: true},
	}

	if err := cfg.Validate(); err == nil || !strings.Contains(err.Error(), "cannot contain *") {
		t.Fatalf("Validate() error = %v", err)
	}
}
