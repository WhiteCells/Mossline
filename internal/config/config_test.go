package config

import (
	"os"
	"strings"
	"testing"
	"time"
)

// clearConfigEnv 隔离终端中已经导出的应用配置，避免影响配置测试
func clearConfigEnv(t *testing.T) {
	t.Helper()
	for _, entry := range os.Environ() {
		key, _, _ := strings.Cut(entry, "=")
		if strings.HasPrefix(key, "MOSSLINE_") {
			t.Setenv(key, "")
		}
	}
}

func TestLoadDefaults(t *testing.T) {
	clearConfigEnv(t)
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
	clearConfigEnv(t)
	t.Setenv("MOSSLINE_DATABASE_PORT", "not-a-port")
	t.Setenv("MOSSLINE_AUTH_TOKEN_BYTES", "12")

	_, err := Load()
	if err == nil || !strings.Contains(err.Error(), "MOSSLINE_DATABASE_PORT") || !strings.Contains(err.Error(), "MOSSLINE_AUTH_TOKEN_BYTES") {
		t.Fatalf("Load() error = %v", err)
	}
}

func TestLoadNamespacedConfig(t *testing.T) {
	clearConfigEnv(t)
	directory := t.TempDir()
	for key, value := range map[string]string{
		"MOSSLINE_ENV":                      Production,
		"MOSSLINE_HTTP_ADDR":                ":9081",
		"MOSSLINE_HTTP_SHUTDOWN_TIMEOUT":    "20s",
		"MOSSLINE_HTTP_TRUSTED_PROXY_CIDRS": "127.0.0.1/32,10.0.0.0/8",
		"MOSSLINE_DATABASE_HOST":            "mysql",
		"MOSSLINE_DATABASE_PORT":            "3308",
		"MOSSLINE_DATABASE_USERNAME":        "app-user",
		"MOSSLINE_DATABASE_PASSWORD":        "test-password-$-with-spaces ",
		"MOSSLINE_BOOTSTRAP_ADMIN_USERNAME": "initial-admin",
		"MOSSLINE_BOOTSTRAP_ADMIN_PASSWORD": "initial-password-$-123",
		"MOSSLINE_BOOTSTRAP_ADMIN_EMAIL":    "admin@example.com",
		"MOSSLINE_AUTH_SESSION_TTL":         "12h",
		"MOSSLINE_STORAGE_LOCAL_DIR":        directory,
		"MOSSLINE_STORAGE_PUBLIC_URL":       "/files/",
		"MOSSLINE_STORAGE_MAX_UPLOAD_BYTES": "1024",
		"MOSSLINE_CORS_ALLOWED_ORIGINS":     "https://example.com",
		"MOSSLINE_CORS_ALLOW_CREDENTIALS":   "true",
	} {
		t.Setenv(key, value)
	}
	cfg, err := Load()
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Environment != Production || cfg.Server.Address != ":9081" || cfg.Server.ShutdownTimeout != 20*time.Second || len(cfg.Server.TrustedProxyCIDR) != 2 {
		t.Fatal("application and HTTP configuration was not loaded")
	}
	if cfg.Database.Host != "mysql" || cfg.Database.Port != 3308 || cfg.Database.User != "app-user" || cfg.Database.Password != "test-password-$-with-spaces " {
		t.Fatal("database configuration was not loaded intact")
	}
	if cfg.Auth.BootstrapAdminUsername != "initial-admin" || cfg.Auth.BootstrapAdminPassword != "initial-password-$-123" || cfg.Auth.BootstrapAdminEmail != "admin@example.com" || cfg.Auth.SessionTTL != 12*time.Hour {
		t.Fatal("authentication configuration was not loaded")
	}
	if cfg.Storage.LocalDirectory != directory || cfg.Storage.PublicURLPrefix != "/files" || cfg.Storage.MaxUploadBytes != 1024 || !cfg.CORS.AllowCredentials || len(cfg.CORS.AllowedOrigins) != 1 {
		t.Fatal("storage and CORS configuration was not loaded")
	}
}

func TestLoadIgnoresLegacyEnv(t *testing.T) {
	clearConfigEnv(t)
	t.Setenv("DB_USER", "root")
	t.Setenv("DB_PORT", "invalid")
	t.Setenv("DATABASE_URL", "invalid")
	t.Setenv("APP_ENV", "invalid")
	t.Setenv("SERVER_ADDR", ":9999")
	cfg, err := Load()
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Database.User != "mossline" || cfg.Database.Port != 3306 || cfg.Database.URL != "" || cfg.Environment != Development || cfg.Server.Address != ":8081" {
		t.Fatal("legacy environment variables must not affect application configuration")
	}
}

func TestLoadNamespacedDSN(t *testing.T) {
	clearConfigEnv(t)
	dsn := "app:password@tcp(db.example.com:3306)/content?parseTime=true"
	t.Setenv("MOSSLINE_DATABASE_DSN", dsn)
	t.Setenv("MOSSLINE_DATABASE_HOST", "ignored-host")
	cfg, err := Load()
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Database.DSN() != dsn {
		t.Fatal("explicit DSN must override individual connection settings")
	}
}

func TestValidateRejectsWildcardCredentialedCORS(t *testing.T) {
	cfg := Config{
		Environment: Development,
		Database:    Database{Host: "localhost", Name: "mossline", User: "mossline", MaxOpenConns: 1},
		Auth:        Auth{SessionTTL: 1, TokenBytes: 32},
		Storage:     Storage{Driver: "local", LocalDirectory: "uploads", PublicURLPrefix: "/uploads", MaxUploadBytes: 1, AllowedMIMETypes: []string{"image/png"}},
		CORS:        CORS{AllowedOrigins: []string{"*"}, AllowCredentials: true},
	}

	if err := cfg.Validate(); err == nil || !strings.Contains(err.Error(), "cannot contain *") {
		t.Fatalf("Validate() error = %v", err)
	}
}
