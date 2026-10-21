package review

import (
	"time"

	"github.com/MdRasB/mosaic/backend/internal/domain/collection"
)

// Input is the mutable part of a review. Title is optional; visibility defaults
// to private when omitted.
type Input struct {
	Title            *string `json:"title"`
	Body             string  `json:"body"`
	Visibility       string  `json:"visibility"`
	ContainsSpoilers bool    `json:"contains_spoilers"`
}

// Patch carries a partial update. A nil field is left unchanged; a non-nil
// empty Title clears the optional title.
type Patch struct {
	Title            *string
	Body             *string
	Visibility       *string
	ContainsSpoilers *bool
}

// Author is the public identity attached to a review. Username is only exposed
// when the author's profile is public, so a public review can never widen the
// visibility of a private profile.
type Author struct {
	DisplayName string  `json:"display_name"`
	AvatarURL   *string `json:"avatar_url"`
	Username    *string `json:"username,omitempty"`
}

type Review struct {
	ID               int64            `json:"id"`
	UserMediaID      int64            `json:"user_media_id"`
	Media            collection.Media `json:"media"`
	Title            *string          `json:"title"`
	Body             string           `json:"body"`
	Visibility       string           `json:"visibility"`
	ContainsSpoilers bool             `json:"contains_spoilers"`
	CreatedAt        time.Time        `json:"created_at"`
	UpdatedAt        time.Time        `json:"updated_at"`
	Author           *Author          `json:"author,omitempty"`
}

type Filters struct {
	Type       string
	Visibility string
	Spoilers   string
	Sort       string
	Limit      int
	Offset     int
	// MediaType + ProviderMediaID narrow the list to one title, which is how
	// Media Details finds the signed-in user's own review for that title.
	MediaType       string
	ProviderMediaID string
}

type ListResult struct {
	Items      []Review `json:"items"`
	Pagination struct {
		Limit   int  `json:"limit"`
		Offset  int  `json:"offset"`
		Total   int  `json:"total"`
		HasMore bool `json:"has_more"`
	} `json:"pagination"`
}
