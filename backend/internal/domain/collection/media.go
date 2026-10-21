package collection

import (
	"context"

	"github.com/jackc/pgx/v5"
)

// UpsertMediaTx resolves the shared media_items row for a provider title inside
// the caller's transaction. Other domains that attach records to the same media
// identity (reviews) use this instead of duplicating normalization and upsert
// rules.
func UpsertMediaTx(ctx context.Context, tx pgx.Tx, input MediaInput) (int64, error) {
	normalized, err := normalizeMedia(input)
	if err != nil {
		return 0, err
	}
	return upsertMedia(ctx, tx, normalized)
}
