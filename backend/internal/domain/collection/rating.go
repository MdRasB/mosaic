package collection

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"strconv"
	"strings"
)

// Rating stores half-point units so validation and equality stay exact:
// 2 == 1.0, 17 == 8.5, 20 == 10.0. The API and the database use the decimal
// value, which is converted at this boundary.
type Rating int

const (
	MinRating Rating = 2
	MaxRating Rating = 20
)

// ParseRating validates the personal-rating scale: 1.0–10.0 in half-point
// steps. Zero, negatives, values above 10, thirds, strings and NaN are all
// rejected. Using json.Number keeps the raw text so float64 rounding cannot
// turn an invalid score into a valid one.
func ParseRating(value json.Number) (Rating, error) {
	text := strings.TrimSpace(value.String())
	if text == "" {
		return 0, fmt.Errorf("%w: rating is required", ErrInvalidInput)
	}
	parsed, err := strconv.ParseFloat(text, 64)
	if err != nil || math.IsNaN(parsed) || math.IsInf(parsed, 0) {
		return 0, fmt.Errorf("%w: rating must be a number", ErrInvalidInput)
	}
	units := parsed * 2
	rounded := math.Round(units)
	if math.Abs(units-rounded) > 1e-9 {
		return 0, fmt.Errorf("%w: rating must use whole or half points", ErrInvalidInput)
	}
	rating := Rating(rounded)
	if !rating.Valid() {
		return 0, fmt.Errorf("%w: rating must be between 1.0 and 10.0", ErrInvalidInput)
	}
	return rating, nil
}

func (r Rating) Valid() bool { return r >= MinRating && r <= MaxRating }

// Float returns the decimal score stored in Postgres.
func (r Rating) Float() float64 { return float64(r) / 2 }

// SetRating writes a rating to an existing user-media relationship. It never
// creates a relationship: use RateMedia when the title may be new.
//
// Repeating the same score is a no-op: rated_at and updated_at only move when
// the value actually changes.
func (s *Service) SetRating(ctx context.Context, userID string, itemID int64, rating Rating) (Item, error) {
	if !rating.Valid() {
		return Item{}, fmt.Errorf("%w: rating must be between 1.0 and 10.0 in half-point steps", ErrInvalidInput)
	}
	value := rating.Float()
	result, err := s.db.Exec(ctx, `UPDATE user_media
		SET rating = $3::numeric,
			rated_at = CASE WHEN rating IS DISTINCT FROM $3::numeric THEN now() ELSE rated_at END,
			updated_at = CASE WHEN rating IS DISTINCT FROM $3::numeric THEN now() ELSE updated_at END
		WHERE id = $1 AND user_id = $2`, itemID, userID, value)
	if err != nil {
		return Item{}, fmt.Errorf("set rating: %w", err)
	}
	if result.RowsAffected() == 0 {
		return Item{}, ErrNotFound
	}
	return s.Get(ctx, userID, itemID)
}

// RemoveRating clears the personal score. A relationship that only existed for
// the rating is cleaned up; collection, favorites, watchlist and reviews are
// preserved.
func (s *Service) RemoveRating(ctx context.Context, userID string, itemID int64) error {
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin rating removal: %w", err)
	}
	defer tx.Rollback(ctx)

	result, err := tx.Exec(ctx, `UPDATE user_media
		SET rating = NULL, rated_at = NULL, updated_at = now()
		WHERE id = $1 AND user_id = $2 AND rating IS NOT NULL`, itemID, userID)
	if err != nil {
		return fmt.Errorf("remove rating: %w", err)
	}
	if result.RowsAffected() == 0 {
		return ErrNotFound
	}
	if err := deleteIfEmpty(ctx, tx, userID, itemID); err != nil {
		return err
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit rating removal: %w", err)
	}
	return nil
}

// RateMedia creates the shared media record and the user-media relationship if
// needed, then stores the rating. Existing collection, favorite and watchlist
// state on the relationship is left untouched, so rating a title never forces
// it into another list.
func (s *Service) RateMedia(ctx context.Context, userID string, input MediaInput, rating Rating) (Item, bool, error) {
	if !rating.Valid() {
		return Item{}, false, fmt.Errorf("%w: rating must be between 1.0 and 10.0 in half-point steps", ErrInvalidInput)
	}
	input, err := normalizeMedia(input)
	if err != nil {
		return Item{}, false, err
	}

	tx, err := s.db.Begin(ctx)
	if err != nil {
		return Item{}, false, fmt.Errorf("begin rating transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	mediaID, err := upsertMedia(ctx, tx, input)
	if err != nil {
		return Item{}, false, fmt.Errorf("upsert media: %w", err)
	}

	var itemID int64
	var created bool
	err = tx.QueryRow(ctx, `INSERT INTO user_media
		(user_id, media_id, in_collection, rating, rated_at)
		VALUES ($1, $2, FALSE, $3::numeric, now())
		ON CONFLICT (user_id, media_id) DO UPDATE SET
			rating = EXCLUDED.rating,
			rated_at = CASE WHEN user_media.rating IS DISTINCT FROM EXCLUDED.rating
				THEN now() ELSE user_media.rated_at END,
			updated_at = CASE WHEN user_media.rating IS DISTINCT FROM EXCLUDED.rating
				THEN now() ELSE user_media.updated_at END
		RETURNING id, (xmax = 0)`,
		userID, mediaID, rating.Float()).Scan(&itemID, &created)
	if err != nil {
		return Item{}, false, fmt.Errorf("upsert rated item: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return Item{}, false, fmt.Errorf("commit rating transaction: %w", err)
	}
	item, err := s.Get(ctx, userID, itemID)
	return item, created, err
}
