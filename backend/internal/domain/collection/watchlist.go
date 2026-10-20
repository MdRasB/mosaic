package collection

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
)

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
	var previous *string
	if err := tx.QueryRow(ctx, `SELECT um.status FROM user_media um
		WHERE um.user_id = $1 AND um.media_id = $2 FOR UPDATE`, userID, mediaID).Scan(&previous); err != nil && err != pgx.ErrNoRows {
		return Item{}, false, fmt.Errorf("lock existing watchlist item: %w", err)
	}
	err = tx.QueryRow(ctx, `INSERT INTO user_media
		(user_id, media_id, status, status_changed_at, in_collection)
		VALUES ($1, $2, 'watchlist', now(), FALSE)
		ON CONFLICT (user_id, media_id) DO UPDATE SET
			status = COALESCE(user_media.status, 'watchlist'),
			status_changed_at = CASE WHEN user_media.status IS NULL
				THEN now() ELSE user_media.status_changed_at END,
			updated_at = CASE WHEN user_media.status IS NULL
				THEN now() ELSE user_media.updated_at END
		RETURNING id, (xmax = 0)`,
		userID, mediaID).Scan(&itemID, &created)
	if err != nil {
		return Item{}, false, fmt.Errorf("upsert watchlist item: %w", err)
	}
	if previous == nil {
		if _, err := tx.Exec(ctx, `INSERT INTO user_media_status_history
			(user_media_id, previous_status, new_status)
			VALUES ($1, NULL, 'watchlist')`, itemID); err != nil {
			return Item{}, false, fmt.Errorf("record initial status history: %w", err)
		}
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
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return Item{}, fmt.Errorf("begin status transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	var previous *string
	if err := tx.QueryRow(ctx, `SELECT status FROM user_media
		WHERE id = $1 AND user_id = $2 AND status IS NOT NULL FOR UPDATE`,
		itemID, userID).Scan(&previous); err != nil {
		if err == pgx.ErrNoRows {
			return Item{}, ErrNotFound
		}
		return Item{}, fmt.Errorf("lock watchlist status: %w", err)
	}
	if previous != nil && *previous == value {
		_ = tx.Rollback(ctx)
		return s.Get(ctx, userID, itemID)
	}
	if _, err := tx.Exec(ctx, `UPDATE user_media
		SET status = $3, status_changed_at = now(), updated_at = now()
		WHERE id = $1 AND user_id = $2`, itemID, userID, value); err != nil {
		return Item{}, fmt.Errorf("set watchlist status: %w", err)
	}
	if _, err := tx.Exec(ctx, `INSERT INTO user_media_status_history
		(user_media_id, previous_status, new_status)
		VALUES ($1, $2, $3)`, itemID, previous, value); err != nil {
		return Item{}, fmt.Errorf("record status history: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return Item{}, fmt.Errorf("commit status transaction: %w", err)
	}
	return s.Get(ctx, userID, itemID)
}

func (s *Service) RemoveWatchlist(ctx context.Context, userID string, itemID int64) error {
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin remove watchlist transaction: %w", err)
	}
	defer tx.Rollback(ctx)
	var status *string
	if err := tx.QueryRow(ctx, `SELECT status FROM user_media
		WHERE id = $1 AND user_id = $2 AND status IS NOT NULL FOR UPDATE`,
		itemID, userID).Scan(&status); err != nil {
		if err == pgx.ErrNoRows {
			return ErrNotFound
		}
		return fmt.Errorf("lock watchlist item: %w", err)
	}
	if _, err := tx.Exec(ctx, `UPDATE user_media
		SET status = NULL, status_changed_at = NULL, updated_at = now()
		WHERE id = $1 AND user_id = $2`, itemID, userID); err != nil {
		return fmt.Errorf("remove watchlist item: %w", err)
	}
	if _, err := tx.Exec(ctx, `DELETE FROM user_media
		WHERE id = $1 AND user_id = $2 AND in_collection = FALSE AND is_favorite = FALSE`,
		itemID, userID); err != nil {
		return fmt.Errorf("delete empty user media row: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit remove watchlist transaction: %w", err)
	}
	return nil
}
