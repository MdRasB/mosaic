package review

import (
	"encoding/json"
	"errors"
	"net/url"
	"strings"
	"testing"
)

func TestNormalizeInputBodyBounds(t *testing.T) {
	title := "A title"
	valid, err := normalizeInput(Input{Title: &title, Body: strings.Repeat("a", MinBodyLength)})
	if err != nil {
		t.Fatalf("normalizeInput() error = %v", err)
	}
	if valid.Visibility != "private" {
		t.Fatalf("visibility default = %q, want private", valid.Visibility)
	}
	if valid.Title == nil || *valid.Title != "A title" {
		t.Fatalf("title = %v", valid.Title)
	}

	for _, body := range []string{
		strings.Repeat("a", MinBodyLength-1),
		strings.Repeat("a", MaxBodyLength+1),
		"   ",
	} {
		if _, err := normalizeInput(Input{Body: body}); !errors.Is(err, ErrInvalidInput) {
			t.Fatalf("body of length %d was accepted", len(body))
		}
	}
}

func TestNormalizeInputTitleAndVisibility(t *testing.T) {
	empty := "   "
	normalized, err := normalizeInput(Input{Title: &empty, Body: strings.Repeat("a", 20)})
	if err != nil {
		t.Fatalf("normalizeInput() error = %v", err)
	}
	if normalized.Title != nil {
		t.Fatal("blank title should be stored as NULL")
	}

	long := strings.Repeat("t", MaxTitleLength+1)
	if _, err := normalizeInput(Input{Title: &long, Body: strings.Repeat("a", 20)}); !errors.Is(err, ErrInvalidInput) {
		t.Fatal("over-long title was accepted")
	}

	public, err := normalizeInput(Input{Body: strings.Repeat("a", 20), Visibility: "PUBLIC"})
	if err != nil || public.Visibility != "public" {
		t.Fatalf("visibility normalization = %q, %v", public.Visibility, err)
	}

	if _, err := normalizeInput(Input{Body: strings.Repeat("a", 20), Visibility: "friends"}); !errors.Is(err, ErrInvalidInput) {
		t.Fatal("invalid visibility was accepted")
	}
}

func TestParseFilters(t *testing.T) {
	filters, err := ParseFilters(url.Values{
		"type":       {"tv"},
		"visibility": {"public"},
		"spoilers":   {"spoiler"},
		"sort":       {"title"},
		"limit":      {"10"},
		"offset":     {"20"},
	})
	if err != nil {
		t.Fatalf("ParseFilters() error = %v", err)
	}
	if filters.Type != "tv" || filters.Visibility != "public" || filters.Spoilers != "spoiler" ||
		filters.Sort != "title" || filters.Limit != 10 || filters.Offset != 20 {
		t.Fatalf("ParseFilters() = %+v", filters)
	}

	invalid := []url.Values{
		{"type": {"book"}},
		{"visibility": {"friends"}},
		{"spoilers": {"maybe"}},
		{"sort": {"random"}},
		{"limit": {"51"}},
		{"limit": {"0"}},
		{"offset": {"-1"}},
	}
	for _, values := range invalid {
		if _, err := ParseFilters(values); !errors.Is(err, ErrInvalidInput) {
			t.Fatalf("ParseFilters(%v) was accepted", values)
		}
	}
}

func TestParseFiltersMediaLookup(t *testing.T) {
	filters, err := ParseFilters(url.Values{"media_type": {"Movie"}, "provider_media_id": {" 157336 "}})
	if err != nil {
		t.Fatalf("ParseFilters() error = %v", err)
	}
	if filters.MediaType != "movie" || filters.ProviderMediaID != "157336" {
		t.Fatalf("ParseFilters() = %+v", filters)
	}

	// A partial pair is a mistake, not an unfiltered list.
	if _, err := ParseFilters(url.Values{"media_type": {"movie"}}); !errors.Is(err, ErrInvalidInput) {
		t.Fatal("media_type without provider_media_id was accepted")
	}
	if _, err := ParseFilters(url.Values{"provider_media_id": {"157336"}}); !errors.Is(err, ErrInvalidInput) {
		t.Fatal("provider_media_id without media_type was accepted")
	}
}

func TestParseMediaRef(t *testing.T) {
	mediaType, id, err := ParseMediaRef("Movie", " 157336 ")
	if err != nil || mediaType != "movie" || id != "157336" {
		t.Fatalf("ParseMediaRef() = %q, %q, %v", mediaType, id, err)
	}
	for _, pair := range [][2]string{{"book", "1"}, {"movie", "0"}, {"movie", "abc"}, {"movie", ""}} {
		if _, _, err := ParseMediaRef(pair[0], pair[1]); !errors.Is(err, ErrInvalidInput) {
			t.Fatalf("ParseMediaRef(%q, %q) was accepted", pair[0], pair[1])
		}
	}
}

func TestPatchRequestDistinguishesOmittedFromNull(t *testing.T) {
	if _, err := (patchRequest{}).patch(); !errors.Is(err, ErrInvalidInput) {
		t.Fatal("empty patch should be rejected")
	}

	clear, err := (patchRequest{Title: json.RawMessage(`null`)}).patch()
	if err != nil {
		t.Fatalf("null title patch error = %v", err)
	}
	if clear.Title == nil || *clear.Title != "" {
		t.Fatalf("null title should clear, got %v", clear.Title)
	}

	if _, err := (patchRequest{Body: json.RawMessage(`null`)}).patch(); !errors.Is(err, ErrInvalidInput) {
		t.Fatal("null body should be rejected")
	}

	patch, err := (patchRequest{
		Body:             json.RawMessage(`"updated review text"`),
		Visibility:       json.RawMessage(`"public"`),
		ContainsSpoilers: json.RawMessage(`true`),
	}).patch()
	if err != nil {
		t.Fatalf("patch() error = %v", err)
	}
	if patch.Body == nil || *patch.Body != "updated review text" ||
		patch.Visibility == nil || *patch.Visibility != "public" ||
		patch.ContainsSpoilers == nil || !*patch.ContainsSpoilers {
		t.Fatalf("patch() = %+v", patch)
	}
	if patch.Title != nil {
		t.Fatal("omitted title should stay unchanged")
	}
}

func TestSameReview(t *testing.T) {
	title := "Same"
	current := Review{Title: &title, Body: "body text", Visibility: "public", ContainsSpoilers: false}
	if !sameReview(current, Input{Title: &title, Body: "body text", Visibility: "public"}) {
		t.Fatal("identical reviews reported as changed")
	}
	if sameReview(current, Input{Title: &title, Body: "body text", Visibility: "private"}) {
		t.Fatal("visibility change reported as identical")
	}
	if sameReview(current, Input{Body: "body text", Visibility: "public"}) {
		t.Fatal("title removal reported as identical")
	}
}
