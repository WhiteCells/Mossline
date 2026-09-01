// Package database owns MySQL connection setup, schema migrations, and the
// optional first-administrator bootstrap used by a fresh installation.
package database

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"io/fs"
	"sort"
	"strings"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"golang.org/x/crypto/bcrypt"

	"mossline/internal/config"
	"mossline/migrations"
)

func Open(cfg config.Database) (*sql.DB, error) {
	db, err := sql.Open("mysql", cfg.DSN())
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(cfg.MaxOpenConns)
	db.SetMaxIdleConns(cfg.MaxIdleConns)
	db.SetConnMaxLifetime(cfg.ConnMaxLifetime)
	db.SetConnMaxIdleTime(cfg.ConnMaxIdleTime)
	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()
	if err := db.PingContext(ctx); err != nil {
		db.Close()
		return nil, fmt.Errorf("connect to MySQL: %w", err)
	}
	return db, nil
}

// Migrate applies embedded up migrations exactly once. Migration SQL remains
// usable with the mysql CLI while the same files ship inside the server.
func Migrate(ctx context.Context, db *sql.DB) error {
	if _, err := db.ExecContext(ctx, `CREATE TABLE IF NOT EXISTS schema_migrations (
		version VARCHAR(255) NOT NULL PRIMARY KEY,
		applied_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
	) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`); err != nil {
		return fmt.Errorf("create migration table: %w", err)
	}
	entries, err := fs.ReadDir(migrations.FS, ".")
	if err != nil {
		return err
	}
	var names []string
	for _, entry := range entries {
		if !entry.IsDir() && strings.HasSuffix(entry.Name(), ".up.sql") {
			names = append(names, entry.Name())
		}
	}
	sort.Strings(names)
	for _, name := range names {
		var exists int
		if err := db.QueryRowContext(ctx, "SELECT COUNT(*) FROM schema_migrations WHERE version = ?", name).Scan(&exists); err != nil {
			return err
		}
		if exists > 0 {
			continue
		}
		body, err := fs.ReadFile(migrations.FS, name)
		if err != nil {
			return err
		}
		// MySQL DDL may commit implicitly, so recording the version only after
		// the complete file succeeds is more honest than wrapping it in a tx.
		for _, statement := range strings.Split(string(body), ";") {
			statement = strings.TrimSpace(statement)
			if statement == "" {
				continue
			}
			if _, err := db.ExecContext(ctx, statement); err != nil {
				return fmt.Errorf("apply migration %s: %w", name, err)
			}
		}
		if _, err := db.ExecContext(ctx, "INSERT INTO schema_migrations(version) VALUES (?)", name); err != nil {
			return fmt.Errorf("record migration %s: %w", name, err)
		}
	}
	return nil
}

// BootstrapAdmin creates the first account only when all bootstrap values are
// supplied and the database has no active users. Subsequent starts are no-ops.
func BootstrapAdmin(ctx context.Context, db *sql.DB, cfg config.Auth) error {
	if cfg.BootstrapAdminUsername == "" && cfg.BootstrapAdminPassword == "" && cfg.BootstrapAdminEmail == "" {
		return nil
	}
	if cfg.BootstrapAdminUsername == "" || cfg.BootstrapAdminPassword == "" || cfg.BootstrapAdminEmail == "" {
		return errors.New("BOOTSTRAP_ADMIN_USERNAME, BOOTSTRAP_ADMIN_PASSWORD, and BOOTSTRAP_ADMIN_EMAIL must be provided together")
	}
	if err := ValidatePassword(cfg.BootstrapAdminPassword); err != nil {
		return fmt.Errorf("bootstrap administrator password: %w", err)
	}
	var count int
	if err := db.QueryRowContext(ctx, "SELECT COUNT(*) FROM users WHERE deleted_at IS NULL").Scan(&count); err != nil {
		return err
	}
	if count > 0 {
		return nil
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(cfg.BootstrapAdminPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	nickname := cfg.BootstrapAdminUsername
	_, err = db.ExecContext(ctx, `INSERT INTO users
		(username,email,password_hash,nickname,role,status,created_at,updated_at)
		VALUES (?,?,?,?, 'admin','active',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))`,
		cfg.BootstrapAdminUsername, cfg.BootstrapAdminEmail, string(hash), nickname)
	return err
}

func ValidatePassword(password string) error {
	if len(password) < 8 || len(password) > 72 {
		return errors.New("password must be 8 to 72 characters")
	}
	var letter, number bool
	for _, r := range password {
		switch {
		case r >= '0' && r <= '9':
			number = true
		case r >= 'a' && r <= 'z', r >= 'A' && r <= 'Z':
			letter = true
		}
	}
	if !letter || !number {
		return errors.New("password must contain a letter and a number")
	}
	return nil
}
