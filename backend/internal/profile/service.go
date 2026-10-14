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
	ErrNoAvatar      = errors.New("avatar not found")
	ErrUnsupported   = errors.New("unsupported avatar image")
)

// MaxAvatarBytes caps uploaded avatar payloads at 2 MiB.
const MaxAvatarBytes = 2 << 20

// SupportedImageTypes is the set of image types an upload may use.
var SupportedImageTypes = map[string]bool{
	"image/png":  true,
	"image/jpeg": true,
	"image/webp": true,
	"image/gif":  true,
}

type Profile struct {
	UserID      string    `json:"user_id"`
	Username    string    `json:"username"`
	DisplayName string    `json:"display_name"`
	Bio         string    `json:"bio"`
	AvatarURL   *string   `json:"avatar_url"`
	Visibility  string    `json:"visibility"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	// HasUploadedAvatar reports whether a stored upload should be preferred
	// over AvatarURL. The image bytes are served separately.
	HasUploadedAvatar bool `json:"has_uploaded_avatar"`
}

// Avatar is a stored uploaded avatar image.
type Avatar struct {
	ContentType string
	Data        []byte
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
		visibility, created_at, updated_at, avatar_image IS NOT NULL
		FROM user_profiles WHERE user_id = $1`, userID)
}

// SetAvatar stores an uploaded avatar image for the user.
func (s *Service) SetAvatar(ctx context.Context, userID, contentType string, data []byte) error {
	if !SupportedImageTypes[contentType] {
		return fmt.Errorf("%w: use a PNG, JPEG, WebP, or GIF image", ErrUnsupported)
	}
	if len(data) == 0 {
		return fmt.Errorf("%w: the uploaded file was empty", ErrUnsupported)
	}
	if len(data) > MaxAvatarBytes {
		return fmt.Errorf("%w: images must be %d MB or smaller", ErrInvalidInput, MaxAvatarBytes>>20)
	}
	result, err := s.db.Exec(ctx, `UPDATE user_profiles
		SET avatar_image = $2, avatar_content_type = $3, avatar_url = NULL, updated_at = now()
		WHERE user_id = $1`, userID, data, contentType)
	if err != nil {
		return fmt.Errorf("store avatar: %w", err)
	}
	if result.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// ClearAvatar removes any stored uploaded avatar image.
func (s *Service) ClearAvatar(ctx context.Context, userID string) error {
	result, err := s.db.Exec(ctx, `UPDATE user_profiles
		SET avatar_image = NULL, avatar_content_type = NULL, updated_at = now()
		WHERE user_id = $1`, userID)
	if err != nil {
		return fmt.Errorf("clear avatar: %w", err)
	}
	if result.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// GetAvatar returns the stored uploaded avatar image for the user.
func (s *Service) GetAvatar(ctx context.Context, userID string) (Avatar, error) {
	var contentType *string
	var data []byte
	err := s.db.QueryRow(ctx,
		`SELECT avatar_content_type, avatar_image FROM user_profiles WHERE user_id = $1`, userID,
	).Scan(&contentType, &data)
	if errors.Is(err, pgx.ErrNoRows) {
		return Avatar{}, ErrNotFound
	}
	if err != nil {
		return Avatar{}, fmt.Errorf("read avatar: %w", err)
	}
	if data == nil || contentType == nil {
		return Avatar{}, ErrNoAvatar
	}
	return Avatar{ContentType: *contentType, Data: data}, nil
}

func (s *Service) Update(ctx context.Context, userID string, input UpdateInput) (Profile, error) {
	normalized, err := normalizeAndValidate(input)
	if err != nil {
		return Profile{}, err
	}
	// A freshly pasted avatar URL supersedes any stored upload, so the two
	// sources can never disagree about which image to render.
	profile, err := s.query(ctx, `UPDATE user_profiles
		SET username = $2, display_name = $3, bio = $4, avatar_url = $5,
		    visibility = $6,
		    avatar_image = CASE WHEN $5 IS NULL THEN avatar_image ELSE NULL END,
		    avatar_content_type = CASE WHEN $5 IS NULL THEN avatar_content_type ELSE NULL END,
		    updated_at = now()
		WHERE user_id = $1
		RETURNING user_id, username, display_name, bio, avatar_url,
		          visibility, created_at, updated_at, avatar_image IS NOT NULL`,
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
		&profile.HasUploadedAvatar,
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
			return UpdateInput{}, fmt.Errorf("%w: avatar URL must be a direct HTTPS image link (copy the image address, not a search page)", ErrInvalidInput)
		}
	}
	if input.Visibility != "private" && input.Visibility != "public" {
		return UpdateInput{}, fmt.Errorf("%w: visibility must be private or public", ErrInvalidInput)
	}
	return input, nil
}
