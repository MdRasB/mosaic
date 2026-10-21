package review

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/MdRasB/mosaic/backend/internal/domain/collection"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Service struct{ db *pgxpool.Pool }

func NewService(db *pgxpool.Pool) *Service { return &Service{db: db} }

// reviewSelect projects a review together with the media identity and the
// author's public profile fields. Author.username is NULL unless the profile is
// public, so private profiles never leak through a public review.
const reviewSelect = `SELECT r.id, um.id,
	mi.provider, mi.media_type, mi.provider_media_id, mi.title, mi.poster_path, mi.release_date::text,
	r.title, r.body, r.visibility, r.contains_spoilers, r.created_at, r.updated_at,
	COALESCE(p.display_name, 'Mosaic User'), p.avatar_url,
	CASE WHEN p.visibility = 'public' THEN p.username END
	FROM media_reviews r
	JOIN user_media um ON um.id = r.user_media_id
	JOIN media_items mi ON mi.id = um.media_id
	LEFT JOIN user_profiles p ON p.user_id = um.user_id`

type rowScanner interface {
	Scan(dest ...any) error
}

func scanReview(row rowScanner) (Review, error) {
	var item Review
	var author Author
	err := row.Scan(
		&item.ID, &item.UserMediaID,
		&item.Media.Provider, &item.Media.MediaType, &item.Media.ProviderMediaID,
		&item.Media.Title, &item.Media.PosterPath, &item.Media.ReleaseDate,
		&item.Title, &item.Body, &item.Visibility, &item.ContainsSpoilers,
		&item.CreatedAt, &item.UpdatedAt,
		&author.DisplayName, &author.AvatarURL, &author.Username,
	)
	if err != nil {
		return Review{}, err
	}
	item.Author = &author
	return item, nil
}

// UpsertForMedia creates or replaces the user's review for a title. Media
// resolution, relationship creation and the review write share one transaction;
// the relationship upsert locks the parent row so concurrent submissions cannot
// create duplicates or race the empty-relationship cleanup.
func (s *Service) UpsertForMedia(ctx context.Context, userID string, media collection.MediaInput, input Input) (Review, bool, error) {
	normalized, err := normalizeInput(input)
	if err != nil {
		return Review{}, false, err
	}

	tx, err := s.db.Begin(ctx)
	if err != nil {
		return Review{}, false, fmt.Errorf("begin review transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	mediaID, err := collection.UpsertMediaTx(ctx, tx, media)
	if err != nil {
		return Review{}, false, fmt.Errorf("upsert media: %w", err)
	}

	var userMediaID int64
	err = tx.QueryRow(ctx, `INSERT INTO user_media (user_id, media_id, in_collection)
		VALUES ($1, $2, FALSE)
		ON CONFLICT (user_id, media_id) DO UPDATE SET user_id = EXCLUDED.user_id
		RETURNING id`, userID, mediaID).Scan(&userMediaID)
	if err != nil {
		return Review{}, false, fmt.Errorf("resolve user media: %w", err)
	}

	var reviewID int64
	var created bool
	err = tx.QueryRow(ctx, `INSERT INTO media_reviews
		(user_media_id, title, body, visibility, contains_spoilers)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (user_media_id) DO UPDATE SET
			title = EXCLUDED.title,
			body = EXCLUDED.body,
			visibility = EXCLUDED.visibility,
			contains_spoilers = EXCLUDED.contains_spoilers,
			updated_at = CASE WHEN (
				media_reviews.title IS DISTINCT FROM EXCLUDED.title
				OR media_reviews.body IS DISTINCT FROM EXCLUDED.body
				OR media_reviews.visibility IS DISTINCT FROM EXCLUDED.visibility
				OR media_reviews.contains_spoilers IS DISTINCT FROM EXCLUDED.contains_spoilers
			) THEN now() ELSE media_reviews.updated_at END
		RETURNING id, (xmax = 0)`,
		userMediaID, normalized.Title, normalized.Body, normalized.Visibility,
		normalized.ContainsSpoilers).Scan(&reviewID, &created)
	if err != nil {
		return Review{}, false, fmt.Errorf("upsert review: %w", err)
	}

	review, err := scanReview(tx.QueryRow(ctx, reviewSelect+` WHERE r.id = $1`, reviewID))
	if err != nil {
		return Review{}, false, fmt.Errorf("load review: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return Review{}, false, fmt.Errorf("commit review transaction: %w", err)
	}
	return review, created, nil
}

// GetOwned returns a review only when it belongs to the authenticated user.
func (s *Service) GetOwned(ctx context.Context, userID string, reviewID int64) (Review, error) {
	item, err := scanReview(s.db.QueryRow(ctx,
		reviewSelect+` WHERE r.id = $1 AND um.user_id = $2`, reviewID, userID))
	if errors.Is(err, pgx.ErrNoRows) {
		return Review{}, ErrNotFound
	}
	if err != nil {
		return Review{}, fmt.Errorf("get review: %w", err)
	}
	return item, nil
}

func (s *Service) ListOwned(ctx context.Context, userID string, filters Filters) (ListResult, error) {
	where := "um.user_id = $1"
	args := []any{userID}
	next := 2
	if filters.Type != "all" {
		where += fmt.Sprintf(" AND mi.media_type = $%d", next)
		args = append(args, filters.Type)
		next++
	}
	if filters.ProviderMediaID != "" {
		where += fmt.Sprintf(" AND mi.media_type = $%d AND mi.provider_media_id = $%d", next, next+1)
		args = append(args, filters.MediaType, filters.ProviderMediaID)
		next += 2
	}
	if filters.Visibility != "all" {
		where += fmt.Sprintf(" AND r.visibility = $%d", next)
		args = append(args, filters.Visibility)
		next++
	}
	if filters.Spoilers == "spoiler" {
		where += " AND r.contains_spoilers = TRUE"
	} else if filters.Spoilers == "no_spoiler" {
		where += " AND r.contains_spoilers = FALSE"
	}

	result := ListResult{Items: make([]Review, 0)}
	countQuery := `SELECT count(*) FROM media_reviews r
		JOIN user_media um ON um.id = r.user_media_id
		JOIN media_items mi ON mi.id = um.media_id WHERE ` + where
	if err := s.db.QueryRow(ctx, countQuery, args...).Scan(&result.Pagination.Total); err != nil {
		return result, fmt.Errorf("count reviews: %w", err)
	}

	order := "r.updated_at DESC, r.id DESC"
	switch filters.Sort {
	case "oldest":
		order = "r.created_at ASC, r.id ASC"
	case "title":
		order = "mi.title ASC, r.id ASC"
	}
	query := reviewSelect + " WHERE " + where + " ORDER BY " + order +
		fmt.Sprintf(" LIMIT $%d OFFSET $%d", next, next+1)
	args = append(args, filters.Limit, filters.Offset)
	if err := s.queryInto(ctx, query, args, &result); err != nil {
		return result, err
	}
	result.Pagination.Limit = filters.Limit
	result.Pagination.Offset = filters.Offset
	result.Pagination.HasMore = filters.Offset+len(result.Items) < result.Pagination.Total
	return result, nil
}

// ListPublic returns only reviews explicitly marked public for one title. The
// visibility predicate lives here, in SQL, so private reviews never reach the
// browser.
func (s *Service) ListPublic(ctx context.Context, mediaType, providerMediaID string, limit, offset int) (ListResult, error) {
	where := `r.visibility = 'public' AND mi.provider = 'tmdb'
		AND mi.media_type = $1 AND mi.provider_media_id = $2`
	args := []any{mediaType, providerMediaID}

	result := ListResult{Items: make([]Review, 0)}
	countQuery := `SELECT count(*) FROM media_reviews r
		JOIN user_media um ON um.id = r.user_media_id
		JOIN media_items mi ON mi.id = um.media_id WHERE ` + where
	if err := s.db.QueryRow(ctx, countQuery, args...).Scan(&result.Pagination.Total); err != nil {
		return result, fmt.Errorf("count public reviews: %w", err)
	}

	query := reviewSelect + " WHERE " + where +
		" ORDER BY r.updated_at DESC, r.id DESC LIMIT $3 OFFSET $4"
	if err := s.queryInto(ctx, query, append(args, limit, offset), &result); err != nil {
		return result, err
	}
	result.Pagination.Limit = limit
	result.Pagination.Offset = offset
	result.Pagination.HasMore = offset+len(result.Items) < result.Pagination.Total
	return result, nil
}

// UpdateOwned applies a partial update. Notes:
//   - omitted fields keep their value;
//   - a non-nil empty Title clears the optional title;
//   - updated_at only moves when the representation actually changes.
func (s *Service) UpdateOwned(ctx context.Context, userID string, reviewID int64, patch Patch) (Review, error) {
	current, err := s.GetOwned(ctx, userID, reviewID)
	if err != nil {
		return Review{}, err
	}

	next := Input{
		Title:            current.Title,
		Body:             current.Body,
		Visibility:       current.Visibility,
		ContainsSpoilers: current.ContainsSpoilers,
	}
	if patch.Title != nil {
		if strings.TrimSpace(*patch.Title) == "" {
			next.Title = nil
		} else {
			next.Title = patch.Title
		}
	}
	if patch.Body != nil {
		next.Body = *patch.Body
	}
	if patch.Visibility != nil {
		next.Visibility = *patch.Visibility
	}
	if patch.ContainsSpoilers != nil {
		next.ContainsSpoilers = *patch.ContainsSpoilers
	}

	normalized, err := normalizeInput(next)
	if err != nil {
		return Review{}, err
	}
	if sameReview(current, normalized) {
		return current, nil
	}

	result, err := s.db.Exec(ctx, `UPDATE media_reviews
		SET title = $3, body = $4, visibility = $5, contains_spoilers = $6, updated_at = now()
		WHERE id = $1 AND user_media_id = $2`,
		reviewID, current.UserMediaID, normalized.Title, normalized.Body,
		normalized.Visibility, normalized.ContainsSpoilers)
	if err != nil {
		return Review{}, fmt.Errorf("update review: %w", err)
	}
	if result.RowsAffected() == 0 {
		return Review{}, ErrNotFound
	}
	return s.GetOwned(ctx, userID, reviewID)
}

// DeleteOwned removes the review and then cleans up the parent relationship only
// if nothing else (collection, favorite, watchlist, rating) still needs it.
func (s *Service) DeleteOwned(ctx context.Context, userID string, reviewID int64) error {
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin review deletion: %w", err)
	}
	defer tx.Rollback(ctx)

	var userMediaID int64
	err = tx.QueryRow(ctx, `DELETE FROM media_reviews
		USING user_media um
		WHERE media_reviews.id = $1
			AND media_reviews.user_media_id = um.id
			AND um.user_id = $2
		RETURNING media_reviews.user_media_id`, reviewID, userID).Scan(&userMediaID)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	}
	if err != nil {
		return fmt.Errorf("delete review: %w", err)
	}

	if err := collection.DeleteEmptyRelationshipTx(ctx, tx, userID, userMediaID); err != nil {
		return err
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit review deletion: %w", err)
	}
	return nil
}

func (s *Service) queryInto(ctx context.Context, query string, args []any, result *ListResult) error {
	rows, err := s.db.Query(ctx, query, args...)
	if err != nil {
		return fmt.Errorf("list reviews: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		item, err := scanReview(rows)
		if err != nil {
			return fmt.Errorf("scan review: %w", err)
		}
		result.Items = append(result.Items, item)
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("iterate reviews: %w", err)
	}
	return nil
}

func sameReview(current Review, next Input) bool {
	if (current.Title == nil) != (next.Title == nil) {
		return false
	}
	if current.Title != nil && *current.Title != *next.Title {
		return false
	}
	return current.Body == next.Body &&
		current.Visibility == next.Visibility &&
		current.ContainsSpoilers == next.ContainsSpoilers
}
