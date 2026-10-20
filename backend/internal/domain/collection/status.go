package collection

import (
	"fmt"
	"strings"
)

type MediaStatus string

const (
	StatusPlanned   MediaStatus = "watchlist"
	StatusWatching  MediaStatus = "watching"
	StatusPaused    MediaStatus = "paused"
	StatusCompleted MediaStatus = "completed"
	StatusDropped   MediaStatus = "dropped"
)

var validStatuses = map[MediaStatus]bool{
	StatusPlanned: true, StatusWatching: true, StatusPaused: true,
	StatusCompleted: true, StatusDropped: true,
}

func normalizeStatus(status string) (string, error) {
	value := MediaStatus(strings.ToLower(strings.TrimSpace(status)))
	if !validStatuses[value] {
		return "", fmt.Errorf("%w: status must be watchlist, watching, completed, dropped, or paused", ErrInvalidInput)
	}
	return string(value), nil
}
