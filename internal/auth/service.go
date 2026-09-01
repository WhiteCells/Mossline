package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"os"
	"strconv"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
)

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrAccountDisabled    = errors.New("account disabled")
	ErrInvalidSession     = errors.New("invalid session")
)

type Service struct {
	db         *sql.DB
	sessionTTL time.Duration
}

func NewService(db *sql.DB) *Service {
	ttl := 24 * time.Hour
	if value, err := time.ParseDuration(os.Getenv("AUTH_SESSION_TTL")); err == nil && value > 0 && value <= 90*24*time.Hour {
		ttl = value
	} else if hours, err := strconv.Atoi(os.Getenv("AUTH_SESSION_HOURS")); err == nil && hours > 0 && hours <= 24*90 {
		ttl = time.Duration(hours) * time.Hour
	}
	return &Service{db: db, sessionTTL: ttl}
}

func tokenHash(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func randomToken(bytes int) (string, error) {
	buffer := make([]byte, bytes)
	if _, err := rand.Read(buffer); err != nil {
		return "", err
	}
	return hex.EncodeToString(buffer), nil
}

func scanUser(scanner interface{ Scan(...any) error }) (User, string, error) {
	var user User
	var email, avatar sql.NullString
	var passwordHash string
	err := scanner.Scan(&user.ID, &user.Username, &email, &passwordHash, &user.Nickname, &avatar, &user.Role, &user.Status, &user.CreatedAt, &user.UpdatedAt)
	if email.Valid {
		user.Email = email.String
	}
	if avatar.Valid {
		user.Avatar = avatar.String
	}
	decorateUser(&user)
	return user, passwordHash, err
}

func (s *Service) Login(ctx context.Context, identifier, password string) (LoginResponse, error) {
	identifier = strings.TrimSpace(identifier)
	row := s.db.QueryRowContext(ctx, `
		SELECT id, username, email, password_hash, nickname, avatar_url, role, status, created_at, updated_at
		FROM users
		WHERE deleted_at IS NULL AND (username = ? OR email = ?)
		LIMIT 1`, identifier, identifier)
	user, passwordHash, err := scanUser(row)
	if errors.Is(err, sql.ErrNoRows) {
		// Perform a bcrypt comparison even for unknown users to reduce account enumeration timing differences.
		_ = bcrypt.CompareHashAndPassword([]byte("$2a$10$7EqJtq98hPqEX7fNZaFWoO5QwQFQ5QwQFQ5QwQFQ5QwQFQ5QwQFQO"), []byte(password))
		return LoginResponse{}, ErrInvalidCredentials
	}
	if err != nil {
		return LoginResponse{}, err
	}
	if user.Status != "active" {
		return LoginResponse{}, ErrAccountDisabled
	}
	if bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(password)) != nil {
		return LoginResponse{}, ErrInvalidCredentials
	}

	tokenBytes := 32
	if value, parseErr := strconv.Atoi(os.Getenv("AUTH_TOKEN_BYTES")); parseErr == nil && value >= 32 && value <= 128 {
		tokenBytes = value
	}
	token, err := randomToken(tokenBytes)
	if err != nil {
		return LoginResponse{}, err
	}
	sessionID, err := randomToken(18)
	if err != nil {
		return LoginResponse{}, err
	}
	_, err = s.db.ExecContext(ctx, `INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)`, sessionID, user.ID, tokenHash(token), time.Now().UTC().Add(s.sessionTTL), time.Now().UTC())
	if err != nil {
		return LoginResponse{}, err
	}
	return LoginResponse{Token: token, User: user}, nil
}

func (s *Service) Authenticate(ctx context.Context, token string) (User, error) {
	if token == "" {
		return User{}, ErrInvalidSession
	}
	row := s.db.QueryRowContext(ctx, `
		SELECT u.id, u.username, u.email, u.password_hash, u.nickname, u.avatar_url, u.role, u.status, u.created_at, u.updated_at
		FROM sessions s
		JOIN users u ON u.id = s.user_id
		WHERE s.token_hash = ? AND s.expires_at > ? AND u.deleted_at IS NULL
		LIMIT 1`, tokenHash(token), time.Now().UTC())
	user, _, err := scanUser(row)
	if errors.Is(err, sql.ErrNoRows) || (err == nil && user.Status != "active") {
		return User{}, ErrInvalidSession
	}
	if err != nil {
		return User{}, err
	}
	_, _ = s.db.ExecContext(ctx, `UPDATE sessions SET last_seen_at = ? WHERE token_hash = ?`, time.Now().UTC(), tokenHash(token))
	return user, nil
}

func (s *Service) Logout(ctx context.Context, token string) error {
	if token == "" {
		return nil
	}
	_, err := s.db.ExecContext(ctx, `DELETE FROM sessions WHERE token_hash = ?`, tokenHash(token))
	return err
}
