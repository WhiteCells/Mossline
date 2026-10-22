package database

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"golang.org/x/crypto/bcrypt"

	"mossline/internal/config"
	"mossline/internal/security"
)

// BootstrapAdmin 在初始化配置齐全且没有未删除用户时创建首个管理员
// 已有用户时不重复创建，配置全部为空时跳过初始化
func BootstrapAdmin(ctx context.Context, db *sql.DB, cfg config.Auth) error {
	if cfg.BootstrapAdminUsername == "" && cfg.BootstrapAdminPassword == "" && cfg.BootstrapAdminEmail == "" {
		return nil
	}
	if cfg.BootstrapAdminUsername == "" || cfg.BootstrapAdminPassword == "" || cfg.BootstrapAdminEmail == "" {
		return errors.New("MOSSLINE_BOOTSTRAP_ADMIN_USERNAME, MOSSLINE_BOOTSTRAP_ADMIN_PASSWORD, and MOSSLINE_BOOTSTRAP_ADMIN_EMAIL must be provided together")
	}
	if err := security.ValidatePassword(cfg.BootstrapAdminPassword); err != nil {
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
