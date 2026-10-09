package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"net/mail"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrEmailTaken         = errors.New("email already registered")
	ErrSessionNotFound    = errors.New("session not found")
)

type User struct {
	ID    string `json:"id"`
	Email string `json:"email"`
}

type Service struct {
	db *pgxpool.Pool
}

func NewService(db *pgxpool.Pool) *Service {
	return &Service{db: db}
}

func (s *Service) Register(ctx context.Context, email, password string) (User, string, error) {
	email = normalizeEmail(email)
	if err := validateCredentials(email, password); err != nil {
		return User{}, "", err
	}
	hash, err := hashPassword(password)
	if err != nil {
		return User{}, "", err
	}
	userID, err := newID()
	if err != nil {
		return User{}, "", err
	}
	sessionToken, err := newToken()
	if err != nil {
		return User{}, "", err
	}
	sessionID, err := newID()
	if err != nil {
		return User{}, "", err
	}
	sessionHash := hashToken(sessionToken)
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return User{}, "", fmt.Errorf("begin registration: %w", err)
	}
	defer tx.Rollback(ctx)

	_, err = tx.Exec(ctx, `INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3)`, userID, email, hash)
	if err != nil {
		if strings.Contains(err.Error(), "unique") {
			return User{}, "", ErrEmailTaken
		}
		return User{}, "", fmt.Errorf("insert user: %w", err)
	}
	if _, err = tx.Exec(ctx, `INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)`,
		sessionID, userID, sessionHash, time.Now().UTC().Add(7*24*time.Hour)); err != nil {
		return User{}, "", fmt.Errorf("insert session: %w", err)
	}
	if err = tx.Commit(ctx); err != nil {
		return User{}, "", fmt.Errorf("commit registration: %w", err)
	}
	return User{ID: userID, Email: email}, sessionToken, nil
}

func (s *Service) Login(ctx context.Context, email, password string) (User, string, error) {
	var user User
	var passwordHash string
	err := s.db.QueryRow(ctx, `SELECT id, email, password_hash FROM users WHERE email = $1 AND disabled_at IS NULL`, normalizeEmail(email)).
		Scan(&user.ID, &user.Email, &passwordHash)
	if errors.Is(err, pgx.ErrNoRows) {
		return User{}, "", ErrInvalidCredentials
	}
	if err != nil {
		return User{}, "", fmt.Errorf("find user: %w", err)
	}
	valid, err := verifyPassword(password, passwordHash)
	if err != nil || !valid {
		return User{}, "", ErrInvalidCredentials
	}
	token, err := newToken()
	if err != nil {
		return User{}, "", err
	}
	sessionID, err := newID()
	if err != nil {
		return User{}, "", err
	}
	if _, err := s.db.Exec(ctx, `INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)`,
		sessionID, user.ID, hashToken(token), time.Now().UTC().Add(7*24*time.Hour)); err != nil {
		return User{}, "", fmt.Errorf("create session: %w", err)
	}
	return user, token, nil
}

func (s *Service) CurrentUser(ctx context.Context, token string) (User, error) {
	var user User
	err := s.db.QueryRow(ctx, `SELECT u.id, u.email FROM users u JOIN sessions s ON s.user_id = u.id
		WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > now() AND u.disabled_at IS NULL`, hashToken(token)).
		Scan(&user.ID, &user.Email)
	if errors.Is(err, pgx.ErrNoRows) {
		return User{}, ErrSessionNotFound
	}
	if err != nil {
		return User{}, fmt.Errorf("find session user: %w", err)
	}
	return user, nil
}

func (s *Service) Logout(ctx context.Context, token string) error {
	if token == "" {
		return nil
	}
	_, err := s.db.Exec(ctx, `UPDATE sessions SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL`, hashToken(token))
	return err
}

func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

func validateCredentials(email, password string) error {
	if _, err := mail.ParseAddress(email); err != nil || !strings.Contains(email, "@") {
		return errors.New("enter a valid email address")
	}
	if len([]rune(password)) < 8 || len([]rune(password)) > 128 {
		return errors.New("password must be between 8 and 128 characters")
	}
	return nil
}

func newToken() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", fmt.Errorf("generate session token: %w", err)
	}
	return hex.EncodeToString(bytes), nil
}

func hashToken(token string) string {
	hash := sha256.Sum256([]byte(token))
	return hex.EncodeToString(hash[:])
}

func newID() (string, error) {
	return newToken()
}
