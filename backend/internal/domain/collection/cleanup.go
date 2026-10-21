package collection

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

// execer is the subset of pgx used by cleanup. It is satisfied by *pgxpool.Pool
// and pgx.Tx, so the predicate can run inside the caller's transaction and keep
// the row lock taken by the removal UPDATE.
type execer interface {
	Exec(ctx context.Context, sql string, arguments ...any) (pgconn.CommandTag, error)
}

// deleteIfEmpty removes a user_media row once it no longer represents any
// personal state.
//
// Every removal path (collection, favorites, watchlist, ratings, reviews) must
// go through this function. Deleting on "not in collection and not favorite and
// no status" is no longer sufficient once ratings and reviews exist: those
// records are independent of list membership, and dropping the parent row would
// silently erase them.
//
// Callers run this inside the same transaction as the UPDATE that cleared the
// membership, so the UPDATE's row lock prevents a concurrent rating or review
// write from racing the DELETE.
func deleteIfEmpty(ctx context.Context, q execer, userID string, itemID int64) error {
	_, err := q.Exec(ctx, `DELETE FROM user_media
		WHERE id = $1 AND user_id = $2
			AND in_collection = FALSE
			AND is_favorite = FALSE
			AND status IS NULL
			AND rating IS NULL
			AND NOT EXISTS (
				SELECT 1 FROM media_reviews mr WHERE mr.user_media_id = user_media.id
			)`, itemID, userID)
	if err != nil {
		return fmt.Errorf("delete empty user media row: %w", err)
	}
	return nil
}

// DeleteEmptyRelationshipTx lets another domain (reviews) clean up a
// relationship it just emptied inside its own transaction. The predicate stays
// in one place so every removal path agrees on what "empty" means.
func DeleteEmptyRelationshipTx(ctx context.Context, tx pgx.Tx, userID string, itemID int64) error {
	return deleteIfEmpty(ctx, tx, userID, itemID)
}
