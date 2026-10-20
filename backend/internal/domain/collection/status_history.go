package collection

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
)

type StatusHistoryEntry struct {
	PreviousStatus *string   `json:"previous_status"`
	NewStatus      string    `json:"new_status"`
	ChangedAt      time.Time `json:"changed_at"`
}

func (s *Service) StatusHistory(ctx context.Context, userID string, itemID int64) ([]StatusHistoryEntry, error) {
	rows, err := s.db.Query(ctx, `SELECT h.previous_status, h.new_status, h.changed_at
		FROM user_media_status_history h
		JOIN user_media um ON um.id = h.user_media_id
		WHERE h.user_media_id = $1 AND um.user_id = $2
		ORDER BY h.changed_at DESC, h.id DESC`, itemID, userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("list status history: %w", err)
	}
	defer rows.Close()

	history := make([]StatusHistoryEntry, 0)
	for rows.Next() {
		var entry StatusHistoryEntry
		if err := rows.Scan(&entry.PreviousStatus, &entry.NewStatus, &entry.ChangedAt); err != nil {
			return nil, fmt.Errorf("scan status history: %w", err)
		}
		history = append(history, entry)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate status history: %w", err)
	}
	if len(history) == 0 {
		var exists bool
		if err := s.db.QueryRow(ctx, `SELECT EXISTS(
			SELECT 1 FROM user_media WHERE id = $1 AND user_id = $2
		)`, itemID, userID).Scan(&exists); err != nil {
			return nil, fmt.Errorf("check status history owner: %w", err)
		}
		if !exists {
			return nil, ErrNotFound
		}
	}
	return history, nil
}
