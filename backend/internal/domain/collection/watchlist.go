package collection

import (
	"context"
	"fmt"
	"strings"
)

// Watchlist statuses follow the project's personal collection state model:
// a title is on the watchlist when its status is set, and the value records
// progress. A NULL status means the title is not tracked on the watchlist.
var watchlistStatuses = map[string]bool{
	"watchlist": true,
	"watching":  true,
	"completed": true,
	"dropped":   true,
	"paused":    true,
}

func normalizeStatus(status string) (string, error) {
	value := strings.ToLower(strings.TrimSpace(status))
	if !watchlistStatuses[value] {
		return "", fmt.Errorf("%w: status must be watchlist, watching, completed, dropped, or paused", ErrInvalidInput)
	}
	return value, nil
}

// AddWatchlist puts a title on the watchlist. Adding is idempotent: an already
// tracked title keeps its current status, and a title that is not tracked yet
// starts at "watchlist". Collection and favorite membership are untouched, so
// a title can live on the watchlist without being saved to the collection.
func (s *Service) AddWatchlist(ctx context.Context, userID string, input MediaInput) (Item, bool, error) {
	input, err := normalizeMedia(input)
	if err != nil {
		return Item{}, false, err
	}
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return Item{}, false, fmt.Errorf("begin watchlist transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	mediaID, err := upsertMedia(ctx, tx, input)
	if err != nil {
		return Item{}, false, fmt.Errorf("upsert media: %w", err)
	}

	var itemID int64
	var created bool
	err = tx.QueryRow(ctx, `INSERT INTO user_media
		(user_id, media_id, status, in_collection)
		VALUES ($1, $2, 'watchlist', FALSE)
		ON CONFLICT (user_id, media_id) DO UPDATE SET
			status = COALESCE(user_media.status, 'watchlist'),
			updated_at = now()
		RETURNING id, (xmax = 0)`,
		userID, mediaID).Scan(&itemID, &created)
	if err != nil {
		return Item{}, false, fmt.Errorf("upsert watchlist item: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return Item{}, false, fmt.Errorf("commit watchlist transaction: %w", err)
	}
	item, err := s.Get(ctx, userID, itemID)
	return item, created, err
}

// SetStatus advances a watchlist title to another state.
func (s *Service) SetStatus(ctx context.Context, userID string, itemID int64, status string) (Item, error) {
	value, err := normalizeStatus(status)
	if err != nil {
		return Item{}, err
	}
	result, err := s.db.Exec(ctx, `UPDATE user_media SET status = $3, updated_at = now()
		WHERE id = $1 AND user_id = $2`, itemID, userID, value)
	if err != nil {
		return Item{}, fmt.Errorf("set watchlist status: %w", err)
	}
	if result.RowsAffected() == 0 {
		return Item{}, ErrNotFound
	}
	return s.Get(ctx, userID, itemID)
}

// RemoveWatchlist takes a title off the watchlist. The row itself is kept
// while the title is still saved to the collection or marked as a favorite, so
// the other lists are not affected.
func (s *Service) RemoveWatchlist(ctx context.Context, userID string, itemID int64) error {
	result, err := s.db.Exec(ctx, `UPDATE user_media SET status = NULL, updated_at = now()
		WHERE id = $1 AND user_id = $2 AND status IS NOT NULL`, itemID, userID)
	if err != nil {
		return fmt.Errorf("remove watchlist item: %w", err)
	}
	if result.RowsAffected() == 0 {
		return ErrNotFound
	}
	if _, err := s.db.Exec(ctx, `DELETE FROM user_media
		WHERE id = $1 AND user_id = $2 AND in_collection = FALSE AND is_favorite = FALSE`,
		itemID, userID); err != nil {
		return fmt.Errorf("delete empty user media row: %w", err)
	}
	return nil
}
