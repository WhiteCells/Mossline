// Package config loads and validates Mossline's runtime configuration.
//
// It deliberately does not read .env files. Production processes should inject
// environment variables, while local development can use the checked-in
// .env.example with the developer's preferred environment loader.
package config

import (
	"errors"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/go-sql-driver/mysql"
)

const (
	Development = "development"
	Test        = "test"
	Production  = "production"
)

type Config struct {
	Environment string
	Server      Server
	Database    Database
	Auth        Auth
	Storage     Storage
	CORS        CORS
}

type Server struct {
	Address          string
	ReadTimeout      time.Duration
	WriteTimeout     time.Duration
	ShutdownTimeout  time.Duration
	TrustedProxyCIDR []string
}

type Database struct {
	URL             string
	Host            string
	Port            uint16
	Name            string
	User            string
	Password        string
	Charset         string
	Location        string
	MaxOpenConns    int
	MaxIdleConns    int
	ConnMaxLifetime time.Duration
	ConnMaxIdleTime time.Duration
}

// DSN returns a go-sql-driver/mysql connection string. DATABASE_URL wins when
// present so managed database providers can supply a complete DSN.
func (c Database) DSN() string {
	if c.URL != "" {
		return c.URL
	}

	cfg := mysql.NewConfig()
	cfg.User = c.User
	cfg.Passwd = c.Password
	cfg.Net = "tcp"
	cfg.Addr = fmt.Sprintf("%s:%d", c.Host, c.Port)
	cfg.DBName = c.Name
	cfg.ParseTime = true
	cfg.Loc = time.UTC
	cfg.Collation = c.Charset + "_unicode_ci"
	cfg.Params = map[string]string{
		"charset":   c.Charset,
		"time_zone": "'+00:00'",
	}
	return cfg.FormatDSN()
}

type Auth struct {
	SessionTTL             time.Duration
	TokenBytes             int
	BootstrapAdminUsername string
	BootstrapAdminPassword string
	BootstrapAdminEmail    string
}

type Storage struct {
	Driver           string
	LocalDirectory   string
	PublicURLPrefix  string
	MaxUploadBytes   int64
	AllowedMIMETypes []string
}

type CORS struct {
	AllowedOrigins   []string
	AllowCredentials bool
}

func Load() (Config, error) {
	var errs []error

	dbPort, err := uint16Value("DB_PORT", 3306)
	if err != nil {
		errs = append(errs, err)
	}
	maxOpen, err := intValue("DB_MAX_OPEN_CONNS", 25)
	if err != nil {
		errs = append(errs, err)
	}
	maxIdle, err := intValue("DB_MAX_IDLE_CONNS", 10)
	if err != nil {
		errs = append(errs, err)
	}
	tokenBytes, err := intValue("AUTH_TOKEN_BYTES", 32)
	if err != nil {
		errs = append(errs, err)
	}
	maxUpload, err := int64Value("UPLOAD_MAX_BYTES", 20<<20)
	if err != nil {
		errs = append(errs, err)
	}
	allowCredentials, err := boolValue("CORS_ALLOW_CREDENTIALS", false)
	if err != nil {
		errs = append(errs, err)
	}

	cfg := Config{
		Environment: stringValue("APP_ENV", Development),
		Server: Server{
			Address:          stringValue("SERVER_ADDR", ":8081"),
			ReadTimeout:      durationValue("SERVER_READ_TIMEOUT", 15*time.Second, &errs),
			WriteTimeout:     durationValue("SERVER_WRITE_TIMEOUT", 30*time.Second, &errs),
			ShutdownTimeout:  durationValue("SERVER_SHUTDOWN_TIMEOUT", 10*time.Second, &errs),
			TrustedProxyCIDR: listValue("TRUSTED_PROXY_CIDRS", nil),
		},
		Database: Database{
			URL:             strings.TrimSpace(os.Getenv("DATABASE_URL")),
			Host:            stringValue("DB_HOST", "127.0.0.1"),
			Port:            dbPort,
			Name:            stringValue("DB_NAME", "mossline"),
			User:            stringValue("DB_USER", "mossline"),
			Password:        os.Getenv("DB_PASSWORD"),
			Charset:         stringValue("DB_CHARSET", "utf8mb4"),
			Location:        stringValue("DB_TIMEZONE", "UTC"),
			MaxOpenConns:    maxOpen,
			MaxIdleConns:    maxIdle,
			ConnMaxLifetime: durationValue("DB_CONN_MAX_LIFETIME", 30*time.Minute, &errs),
			ConnMaxIdleTime: durationValue("DB_CONN_MAX_IDLE_TIME", 5*time.Minute, &errs),
		},
		Auth: Auth{
			SessionTTL:             durationValue("AUTH_SESSION_TTL", 24*time.Hour, &errs),
			TokenBytes:             tokenBytes,
			BootstrapAdminUsername: strings.TrimSpace(os.Getenv("BOOTSTRAP_ADMIN_USERNAME")),
			BootstrapAdminPassword: os.Getenv("BOOTSTRAP_ADMIN_PASSWORD"),
			BootstrapAdminEmail:    strings.TrimSpace(os.Getenv("BOOTSTRAP_ADMIN_EMAIL")),
		},
		Storage: Storage{
			Driver:           stringValue("STORAGE_DRIVER", "local"),
			LocalDirectory:   filepath.Clean(stringValue("UPLOAD_DIR", "./data/uploads")),
			PublicURLPrefix:  strings.TrimRight(stringValue("UPLOAD_PUBLIC_URL", "/uploads"), "/"),
			MaxUploadBytes:   maxUpload,
			AllowedMIMETypes: listValue("UPLOAD_ALLOWED_MIME_TYPES", []string{"image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf", "text/plain"}),
		},
		CORS: CORS{
			AllowedOrigins:   listValue("CORS_ALLOWED_ORIGINS", []string{"http://localhost:5173", "http://localhost:5174"}),
			AllowCredentials: allowCredentials,
		},
	}

	if err := cfg.Validate(); err != nil {
		errs = append(errs, err)
	}
	return cfg, errors.Join(errs...)
}

func (c Config) Validate() error {
	var errs []error
	switch c.Environment {
	case Development, Test, Production:
	default:
		errs = append(errs, fmt.Errorf("APP_ENV must be development, test, or production"))
	}
	if c.Database.URL == "" {
		if c.Database.Host == "" || c.Database.Name == "" || c.Database.User == "" {
			errs = append(errs, fmt.Errorf("DB_HOST, DB_NAME, and DB_USER are required when DATABASE_URL is empty"))
		}
	} else if _, err := mysql.ParseDSN(c.Database.URL); err != nil {
		errs = append(errs, fmt.Errorf("DATABASE_URL: %w", err))
	}
	if c.Database.MaxOpenConns < 1 {
		errs = append(errs, fmt.Errorf("DB_MAX_OPEN_CONNS must be positive"))
	}
	if c.Database.MaxIdleConns < 0 || c.Database.MaxIdleConns > c.Database.MaxOpenConns {
		errs = append(errs, fmt.Errorf("DB_MAX_IDLE_CONNS must be between zero and DB_MAX_OPEN_CONNS"))
	}
	if c.Auth.SessionTTL <= 0 || c.Auth.TokenBytes < 32 {
		errs = append(errs, fmt.Errorf("AUTH_SESSION_TTL must be positive and AUTH_TOKEN_BYTES must be at least 32"))
	}
	if c.Storage.Driver != "local" {
		errs = append(errs, fmt.Errorf("STORAGE_DRIVER %q is unsupported; currently only local is available", c.Storage.Driver))
	}
	if c.Storage.LocalDirectory == "." || c.Storage.MaxUploadBytes <= 0 {
		errs = append(errs, fmt.Errorf("UPLOAD_DIR must name a directory and UPLOAD_MAX_BYTES must be positive"))
	}
	if c.Storage.PublicURLPrefix == "" {
		errs = append(errs, fmt.Errorf("UPLOAD_PUBLIC_URL cannot be empty"))
	} else if parsed, err := url.Parse(c.Storage.PublicURLPrefix); err != nil || (parsed.IsAbs() && parsed.Scheme != "http" && parsed.Scheme != "https") {
		errs = append(errs, fmt.Errorf("UPLOAD_PUBLIC_URL must be a URL path or an http(s) URL"))
	}
	if len(c.Storage.AllowedMIMETypes) == 0 {
		errs = append(errs, fmt.Errorf("UPLOAD_ALLOWED_MIME_TYPES cannot be empty"))
	}
	if c.CORS.AllowCredentials {
		for _, origin := range c.CORS.AllowedOrigins {
			if origin == "*" {
				errs = append(errs, fmt.Errorf("CORS_ALLOWED_ORIGINS cannot contain * when credentials are enabled"))
			}
		}
	}
	return errors.Join(errs...)
}

func stringValue(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}

func listValue(key string, fallback []string) []string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return append([]string(nil), fallback...)
	}
	parts := strings.Split(value, ",")
	result := make([]string, 0, len(parts))
	for _, part := range parts {
		if item := strings.TrimSpace(part); item != "" {
			result = append(result, item)
		}
	}
	return result
}

func intValue(key string, fallback int) (int, error) {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback, nil
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return 0, fmt.Errorf("%s must be an integer: %w", key, err)
	}
	return parsed, nil
}

func int64Value(key string, fallback int64) (int64, error) {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback, nil
	}
	parsed, err := strconv.ParseInt(value, 10, 64)
	if err != nil {
		return 0, fmt.Errorf("%s must be an integer: %w", key, err)
	}
	return parsed, nil
}

func uint16Value(key string, fallback uint16) (uint16, error) {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback, nil
	}
	parsed, err := strconv.ParseUint(value, 10, 16)
	if err != nil {
		return 0, fmt.Errorf("%s must be a valid port: %w", key, err)
	}
	return uint16(parsed), nil
}

func boolValue(key string, fallback bool) (bool, error) {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback, nil
	}
	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return false, fmt.Errorf("%s must be a boolean: %w", key, err)
	}
	return parsed, nil
}

func durationValue(key string, fallback time.Duration, errs *[]error) time.Duration {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	parsed, err := time.ParseDuration(value)
	if err != nil {
		*errs = append(*errs, fmt.Errorf("%s must be a duration: %w", key, err))
		return fallback
	}
	return parsed
}
