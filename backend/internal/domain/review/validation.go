package review

import (
	"errors"
	"fmt"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"unicode/utf8"
)

var (
	ErrInvalidInput = errors.New("invalid review input")
	ErrNotFound     = errors.New("review not found")
)

const (
	MinBodyLength  = 20
	MaxBodyLength  = 5000
	MaxTitleLength = 120
	DefaultLimit   = 20
	MaxLimit       = 50
)

var mediaIDPattern = regexp.MustCompile(`^[1-9][0-9]{0,15}$`)

// normalizeInput trims and validates a review. Length limits are counted in
// runes so they match Postgres char_length rather than byte length.
func normalizeInput(input Input) (Input, error) {
	body := strings.TrimSpace(input.Body)
	length := utf8.RuneCountInString(body)
	if length < MinBodyLength {
		return Input{}, fmt.Errorf("%w: review must be at least %d characters", ErrInvalidInput, MinBodyLength)
	}
	if length > MaxBodyLength {
		return Input{}, fmt.Errorf("%w: review must be at most %d characters", ErrInvalidInput, MaxBodyLength)
	}

	visibility := strings.ToLower(strings.TrimSpace(input.Visibility))
	if visibility == "" {
		visibility = "private"
	}
	if visibility != "private" && visibility != "public" {
		return Input{}, fmt.Errorf("%w: visibility must be private or public", ErrInvalidInput)
	}

	var title *string
	if input.Title != nil {
		value := strings.TrimSpace(*input.Title)
		if value != "" {
			if utf8.RuneCountInString(value) > MaxTitleLength {
				return Input{}, fmt.Errorf("%w: review title must be at most %d characters", ErrInvalidInput, MaxTitleLength)
			}
			title = &value
		}
	}

	return Input{
		Title:            title,
		Body:             body,
		Visibility:       visibility,
		ContainsSpoilers: input.ContainsSpoilers,
	}, nil
}

func ParseFilters(values url.Values) (Filters, error) {
	filters := Filters{
		Type:       valueOr(values.Get("type"), "all"),
		Visibility: valueOr(values.Get("visibility"), "all"),
		Spoilers:   valueOr(values.Get("spoilers"), "all"),
		Sort:       valueOr(values.Get("sort"), "recent"),
		Limit:      DefaultLimit,
	}
	if filters.Type != "all" && filters.Type != "movie" && filters.Type != "tv" {
		return Filters{}, fmt.Errorf("%w: type must be all, movie, or tv", ErrInvalidInput)
	}
	if filters.Visibility != "all" && filters.Visibility != "public" && filters.Visibility != "private" {
		return Filters{}, fmt.Errorf("%w: visibility must be all, public, or private", ErrInvalidInput)
	}
	if filters.Spoilers != "all" && filters.Spoilers != "spoiler" && filters.Spoilers != "no_spoiler" {
		return Filters{}, fmt.Errorf("%w: spoilers must be all, spoiler, or no_spoiler", ErrInvalidInput)
	}
	switch filters.Sort {
	case "recent", "oldest", "title":
	default:
		return Filters{}, fmt.Errorf("%w: sort is invalid", ErrInvalidInput)
	}
	if raw := values.Get("limit"); raw != "" {
		value, err := strconv.Atoi(raw)
		if err != nil || value < 1 || value > MaxLimit {
			return Filters{}, fmt.Errorf("%w: limit is invalid", ErrInvalidInput)
		}
		filters.Limit = value
	}
	if raw := values.Get("offset"); raw != "" {
		value, err := strconv.Atoi(raw)
		if err != nil || value < 0 {
			return Filters{}, fmt.Errorf("%w: offset is invalid", ErrInvalidInput)
		}
		filters.Offset = value
	}

	mediaType := strings.TrimSpace(values.Get("media_type"))
	providerID := strings.TrimSpace(values.Get("provider_media_id"))
	if (mediaType == "") != (providerID == "") {
		return Filters{}, fmt.Errorf("%w: media_type and provider_media_id must be provided together", ErrInvalidInput)
	}
	if mediaType != "" {
		normalizedType, normalizedID, err := ParseMediaRef(mediaType, providerID)
		if err != nil {
			return Filters{}, err
		}
		filters.MediaType = normalizedType
		filters.ProviderMediaID = normalizedID
	}
	return filters, nil
}

// ParseMediaRef validates the {type}/{id} pair used by the public
// media-scoped review listing.
func ParseMediaRef(mediaType, providerMediaID string) (string, string, error) {
	value := strings.ToLower(strings.TrimSpace(mediaType))
	if value != "movie" && value != "tv" {
		return "", "", fmt.Errorf("%w: media type must be movie or tv", ErrInvalidInput)
	}
	id := strings.TrimSpace(providerMediaID)
	if !mediaIDPattern.MatchString(id) {
		return "", "", fmt.Errorf("%w: media id is invalid", ErrInvalidInput)
	}
	return value, id, nil
}

func ParsePagination(values url.Values) (int, int, error) {
	limit := DefaultLimit
	offset := 0
	if raw := values.Get("limit"); raw != "" {
		value, err := strconv.Atoi(raw)
		if err != nil || value < 1 || value > MaxLimit {
			return 0, 0, fmt.Errorf("%w: limit is invalid", ErrInvalidInput)
		}
		limit = value
	}
	if raw := values.Get("offset"); raw != "" {
		value, err := strconv.Atoi(raw)
		if err != nil || value < 0 {
			return 0, 0, fmt.Errorf("%w: offset is invalid", ErrInvalidInput)
		}
		offset = value
	}
	return limit, offset, nil
}

func valueOr(value, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return strings.TrimSpace(value)
}
