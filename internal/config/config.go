// config 负责加载和校验运行配置
// 只读取 MOSSLINE_* 进程环境变量，开发环境需自行加载 .env，生产环境由部署工具注入配置
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

// DSN 生成 MySQL 连接串，优先使用 MOSSLINE_DATABASE_DSN 提供的完整配置
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

// Load 从环境变量读取配置并应用默认值，合并返回解析和校验错误
func Load() (Config, error) {
	var errs []error

	dbPort, err := uint16Value("MOSSLINE_DATABASE_PORT", 3306)
	if err != nil {
		errs = append(errs, err)
	}
	maxOpen, err := intValue("MOSSLINE_DATABASE_MAX_OPEN_CONNS", 25)
	if err != nil {
		errs = append(errs, err)
	}
	maxIdle, err := intValue("MOSSLINE_DATABASE_MAX_IDLE_CONNS", 10)
	if err != nil {
		errs = append(errs, err)
	}
	tokenBytes, err := intValue("MOSSLINE_AUTH_TOKEN_BYTES", 32)
	if err != nil {
		errs = append(errs, err)
	}
	maxUpload, err := int64Value("MOSSLINE_STORAGE_MAX_UPLOAD_BYTES", 20<<20)
	if err != nil {
		errs = append(errs, err)
	}
	allowCredentials, err := boolValue("MOSSLINE_CORS_ALLOW_CREDENTIALS", false)
	if err != nil {
		errs = append(errs, err)
	}

	cfg := Config{
		Environment: stringValue("MOSSLINE_ENV", Development),
		Server: Server{
			Address:          stringValue("MOSSLINE_HTTP_ADDR", ":8081"),
			ReadTimeout:      durationValue("MOSSLINE_HTTP_READ_TIMEOUT", 15*time.Second, &errs),
			WriteTimeout:     durationValue("MOSSLINE_HTTP_WRITE_TIMEOUT", 30*time.Second, &errs),
			ShutdownTimeout:  durationValue("MOSSLINE_HTTP_SHUTDOWN_TIMEOUT", 10*time.Second, &errs),
			TrustedProxyCIDR: listValue("MOSSLINE_HTTP_TRUSTED_PROXY_CIDRS", nil),
		},
		Database: Database{
			URL:             strings.TrimSpace(os.Getenv("MOSSLINE_DATABASE_DSN")),
			Host:            stringValue("MOSSLINE_DATABASE_HOST", "127.0.0.1"),
			Port:            dbPort,
			Name:            stringValue("MOSSLINE_DATABASE_NAME", "mossline"),
			User:            stringValue("MOSSLINE_DATABASE_USERNAME", "mossline"),
			Password:        os.Getenv("MOSSLINE_DATABASE_PASSWORD"),
			Charset:         stringValue("MOSSLINE_DATABASE_CHARSET", "utf8mb4"),
			Location:        stringValue("MOSSLINE_DATABASE_TIMEZONE", "UTC"),
			MaxOpenConns:    maxOpen,
			MaxIdleConns:    maxIdle,
			ConnMaxLifetime: durationValue("MOSSLINE_DATABASE_CONN_MAX_LIFETIME", 30*time.Minute, &errs),
			ConnMaxIdleTime: durationValue("MOSSLINE_DATABASE_CONN_MAX_IDLE_TIME", 5*time.Minute, &errs),
		},
		Auth: Auth{
			SessionTTL:             durationValue("MOSSLINE_AUTH_SESSION_TTL", 24*time.Hour, &errs),
			TokenBytes:             tokenBytes,
			BootstrapAdminUsername: strings.TrimSpace(os.Getenv("MOSSLINE_BOOTSTRAP_ADMIN_USERNAME")),
			BootstrapAdminPassword: os.Getenv("MOSSLINE_BOOTSTRAP_ADMIN_PASSWORD"),
			BootstrapAdminEmail:    strings.TrimSpace(os.Getenv("MOSSLINE_BOOTSTRAP_ADMIN_EMAIL")),
		},
		Storage: Storage{
			Driver:           stringValue("MOSSLINE_STORAGE_DRIVER", "local"),
			LocalDirectory:   filepath.Clean(stringValue("MOSSLINE_STORAGE_LOCAL_DIR", "./data/uploads")),
			PublicURLPrefix:  strings.TrimRight(stringValue("MOSSLINE_STORAGE_PUBLIC_URL", "/uploads"), "/"),
			MaxUploadBytes:   maxUpload,
			AllowedMIMETypes: listValue("MOSSLINE_STORAGE_ALLOWED_MIME_TYPES", []string{"image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf", "text/plain"}),
		},
		CORS: CORS{
			AllowedOrigins:   listValue("MOSSLINE_CORS_ALLOWED_ORIGINS", []string{"http://localhost:5173", "http://localhost:5174"}),
			AllowCredentials: allowCredentials,
		},
	}

	if err := cfg.Validate(); err != nil {
		errs = append(errs, err)
	}
	return cfg, errors.Join(errs...)
}

// Validate 检查配置范围及跨字段约束，一次返回所有发现的问题
func (c Config) Validate() error {
	var errs []error
	switch c.Environment {
	case Development, Test, Production:
	default:
		errs = append(errs, fmt.Errorf("MOSSLINE_ENV must be development, test, or production"))
	}
	if c.Database.URL == "" {
		if c.Database.Host == "" || c.Database.Name == "" || c.Database.User == "" {
			errs = append(errs, fmt.Errorf("MOSSLINE_DATABASE_HOST, MOSSLINE_DATABASE_NAME, and MOSSLINE_DATABASE_USERNAME are required when MOSSLINE_DATABASE_DSN is empty"))
		}
	} else if _, err := mysql.ParseDSN(c.Database.URL); err != nil {
		errs = append(errs, fmt.Errorf("MOSSLINE_DATABASE_DSN: %w", err))
	}
	if c.Database.MaxOpenConns < 1 {
		errs = append(errs, fmt.Errorf("MOSSLINE_DATABASE_MAX_OPEN_CONNS must be positive"))
	}
	if c.Database.MaxIdleConns < 0 || c.Database.MaxIdleConns > c.Database.MaxOpenConns {
		errs = append(errs, fmt.Errorf("MOSSLINE_DATABASE_MAX_IDLE_CONNS must be between zero and MOSSLINE_DATABASE_MAX_OPEN_CONNS"))
	}
	if c.Auth.SessionTTL <= 0 || c.Auth.TokenBytes < 32 {
		errs = append(errs, fmt.Errorf("MOSSLINE_AUTH_SESSION_TTL must be positive and MOSSLINE_AUTH_TOKEN_BYTES must be at least 32"))
	}
	if c.Storage.Driver != "local" {
		errs = append(errs, fmt.Errorf("MOSSLINE_STORAGE_DRIVER %q is unsupported; currently only local is available", c.Storage.Driver))
	}
	if c.Storage.LocalDirectory == "." || c.Storage.MaxUploadBytes <= 0 {
		errs = append(errs, fmt.Errorf("MOSSLINE_STORAGE_LOCAL_DIR must name a directory and MOSSLINE_STORAGE_MAX_UPLOAD_BYTES must be positive"))
	}
	if c.Storage.PublicURLPrefix == "" {
		errs = append(errs, fmt.Errorf("MOSSLINE_STORAGE_PUBLIC_URL cannot be empty"))
	} else if parsed, err := url.Parse(c.Storage.PublicURLPrefix); err != nil || (parsed.IsAbs() && parsed.Scheme != "http" && parsed.Scheme != "https") {
		errs = append(errs, fmt.Errorf("MOSSLINE_STORAGE_PUBLIC_URL must be a URL path or an http(s) URL"))
	}
	if len(c.Storage.AllowedMIMETypes) == 0 {
		errs = append(errs, fmt.Errorf("MOSSLINE_STORAGE_ALLOWED_MIME_TYPES cannot be empty"))
	}
	if c.CORS.AllowCredentials {
		for _, origin := range c.CORS.AllowedOrigins {
			if origin == "*" {
				errs = append(errs, fmt.Errorf("MOSSLINE_CORS_ALLOWED_ORIGINS cannot contain * when credentials are enabled"))
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

// durationValue 解析带单位的时长，解析失败时记录错误并返回默认值
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
