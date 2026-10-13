package profile

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"regexp"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

var usernamePattern = regexp.MustCompile(`^[a-z0-9_]{3,24}$`)

var (
	ErrNotFound      = errors.New("profile not found")
	ErrUsernameTaken = errors.New("username already in use")
	ErrInvalidInput  = errors.New("invalid profile input")
)

type Profile struct {
	UserID      string    `json:"user_id"`
	Username    string    `json:"username"`
	DisplayName string    `json:"display_name"`
	Bio         string    `json:"bio"`
	AvatarURL   *string   `json:"avatar_url"`
	Visibility  string    `json:"visibility"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type UpdateInput struct {
	Username    string  `json:"username"`
	DisplayName string  `json:"display_name"`
	Bio         string  `json:"bio"`
	AvatarURL   *string `json:"avatar_url"`
	Visibility  string  `json:"visibility"`
}

type Service struct {
	db *pgxpool.Pool
}

func NewService(db *pgxpool.Pool) *Service {
	return &Service{db: db}
}

func (s *Service) Get(ctx context.Context, userID string) (Profile, error) {
	return s.query(ctx, `SELECT user_id, username, display_name, bio, avatar_url,
		visibility, created_at, updated_at FROM user_profiles WHERE user_id = $1`, userID)
}

func (s *Service) Update(ctx context.Context, userID string, input UpdateInput) (Profile, error) {
	normalized, err := normalizeAndValidate(input)
	if err != nil {
		return Profile{}, err
	}
	profile, err := s.query(ctx, `UPDATE user_profiles
		SET username = $2, display_name = $3, bio = $4, avatar_url = $5,
		    visibility = $6, updated_at = now()
		WHERE user_id = $1
		RETURNING user_id, username, display_name, bio, avatar_url,
		          visibility, created_at, updated_at`,
		userID, normalized.Username, normalized.DisplayName, normalized.Bio,
		normalized.AvatarURL, normalized.Visibility)
	if err != nil {
		var databaseError *pgconn.PgError
		if errors.As(err, &databaseError) && databaseError.Code == "23505" {
			return Profile{}, ErrUsernameTaken
		}
		return Profile{}, err
	}
	return profile, nil
}

func (s *Service) query(ctx context.Context, query string, args ...any) (Profile, error) {
	var profile Profile
	err := s.db.QueryRow(ctx, query, args...).Scan(
		&profile.UserID, &profile.Username, &profile.DisplayName, &profile.Bio,
		&profile.AvatarURL, &profile.Visibility, &profile.CreatedAt, &profile.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return Profile{}, ErrNotFound
	}
	if err != nil {
		return Profile{}, fmt.Errorf("query profile: %w", err)
	}
	return profile, nil
}

func normalizeAndValidate(input UpdateInput) (UpdateInput, error) {
	input.Username = strings.ToLower(strings.TrimSpace(input.Username))
	input.DisplayName = strings.TrimSpace(input.DisplayName)
	input.Bio = strings.TrimSpace(input.Bio)
	if input.AvatarURL != nil {
		value := strings.TrimSpace(*input.AvatarURL)
		if value == "" {
			input.AvatarURL = nil
		} else {
			input.AvatarURL = &value
		}
	}
	if !usernamePattern.MatchString(input.Username) {
		return UpdateInput{}, fmt.Errorf("%w: username must be 3-24 characters using lowercase letters, numbers, or underscores", ErrInvalidInput)
	}
	if len([]rune(input.DisplayName)) < 1 || len([]rune(input.DisplayName)) > 60 {
		return UpdateInput{}, fmt.Errorf("%w: display name must be between 1 and 60 characters", ErrInvalidInput)
	}
	if len([]rune(input.Bio)) > 300 {
		return UpdateInput{}, fmt.Errorf("%w: bio must be 300 characters or fewer", ErrInvalidInput)
	}
	if input.AvatarURL != nil {
		parsed, err := url.Parse(*input.AvatarURL)
		if err != nil || parsed.Scheme != "https" || parsed.Host == "" {
			return UpdateInput{}, fmt.Errorf("%w: avatar URL must be a valid HTTPS URL", ErrInvalidInput)
		}
	}
	if input.Visibility != "private" && input.Visibility != "public" {
		return UpdateInput{}, fmt.Errorf("%w: visibility must be private or public", ErrInvalidInput)
	}
	return input, nil
}
