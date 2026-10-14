package collection

import (
	"errors"
	"net/url"
	"strings"
	"testing"
)

func TestValidateMedia(t *testing.T) {
	poster := "/abc123.jpg"
	valid := MediaInput{
		Provider: "tmdb", MediaType: "movie", ProviderMediaID: "157336",
		Title: "Interstellar", PosterPath: &poster, ReleaseDate: stringPtr("2014-11-05"),
	}
	if err := validateMedia(valid); err != nil {
		t.Fatalf("validateMedia() error = %v", err)
	}

	tests := []MediaInput{
		{Provider: "other", MediaType: "movie", ProviderMediaID: "1", Title: "Title"},
		{Provider: "tmdb", MediaType: "book", ProviderMediaID: "1", Title: "Title"},
		{Provider: "tmdb", MediaType: "movie", ProviderMediaID: "0", Title: "Title"},
		{Provider: "tmdb", MediaType: "movie", ProviderMediaID: "1", Title: ""},
		{Provider: "tmdb", MediaType: "movie", ProviderMediaID: "1", Title: strings.Repeat("x", 301)},
	}
	for _, input := range tests {
		if !errors.Is(validateMedia(input), ErrInvalidInput) {
			t.Fatalf("validateMedia(%+v) did not reject invalid input", input)
		}
	}
}

func TestParseFilters(t *testing.T) {
	filters, err := ParseFilters(mapValues(map[string]string{"type": "tv", "sort": "title", "limit": "10", "offset": "20"}), false)
	if err != nil {
		t.Fatalf("ParseFilters() error = %v", err)
	}
	if filters.Type != "tv" || filters.Sort != "title" || filters.Limit != 10 || filters.Offset != 20 {
		t.Fatalf("ParseFilters() = %+v", filters)
	}
	if !errors.Is(parseFilterError(), ErrInvalidInput) {
		t.Fatal("invalid filters were not rejected")
	}
}

func mapValues(values map[string]string) url.Values {
	result := url.Values{}
	for key, value := range values {
		result.Set(key, value)
	}
	return result
}

func parseFilterError() error {
	_, err := ParseFilters(mapValues(map[string]string{"type": "invalid"}), false)
	return err
}

func stringPtr(value string) *string { return &value }
