package collection

import "time"

type MediaInput struct {
	Provider        string  `json:"provider"`
	MediaType       string  `json:"media_type"`
	ProviderMediaID string  `json:"provider_media_id"`
	Title           string  `json:"title"`
	PosterPath      *string `json:"poster_path"`
	ReleaseDate     *string `json:"release_date"`
}

type Media struct {
	Provider        string  `json:"provider"`
	MediaType       string  `json:"media_type"`
	ProviderMediaID string  `json:"provider_media_id"`
	Title           string  `json:"title"`
	PosterPath      *string `json:"poster_path"`
	ReleaseDate     *string `json:"release_date"`
}

type Item struct {
	ID           int64      `json:"id"`
	Media        Media      `json:"media"`
	InCollection bool       `json:"in_collection"`
	IsFavorite   bool       `json:"is_favorite"`
	Status       *string    `json:"status"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
	FavoritedAt  *time.Time `json:"favorited_at,omitempty"`
}

type Filters struct {
	Type   string
	Sort   string
	Limit  int
	Offset int
}

type ListResult struct {
	Items      []Item `json:"items"`
	Pagination struct {
		Limit   int  `json:"limit"`
		Offset  int  `json:"offset"`
		Total   int  `json:"total"`
		HasMore bool `json:"has_more"`
	} `json:"pagination"`
}
