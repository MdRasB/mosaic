package collection

import (
	"encoding/json"
	"errors"
	"testing"
)

func TestParseRatingAcceptsHalfPoints(t *testing.T) {
	valid := map[string]float64{
		"1":    1.0,
		"1.0":  1.0,
		"1.5":  1.5,
		"8.5":  8.5,
		"8.50": 8.5,
		"10":   10.0,
		"10.0": 10.0,
	}
	for input, want := range valid {
		rating, err := ParseRating(json.Number(input))
		if err != nil {
			t.Fatalf("ParseRating(%q) error = %v", input, err)
		}
		if got := rating.Float(); got != want {
			t.Fatalf("ParseRating(%q).Float() = %v, want %v", input, got, want)
		}
	}
}

func TestParseRatingRejectsInvalidScores(t *testing.T) {
	invalid := []string{"", "0", "0.0", "0.5", "-1", "10.5", "11", "8.3", "8.25", "abc", "NaN", "Inf"}
	for _, input := range invalid {
		if _, err := ParseRating(json.Number(input)); !errors.Is(err, ErrInvalidInput) {
			t.Fatalf("ParseRating(%q) did not reject invalid input", input)
		}
	}
}

func TestParseRatingFiltersAllowsRatingOrderings(t *testing.T) {
	for _, sort := range []string{"recent", "oldest", "title", "highest", "lowest"} {
		values := mapValues(map[string]string{"sort": sort})
		if _, err := ParseRatingFilters(values); err != nil {
			t.Fatalf("ParseRatingFilters(sort=%q) error = %v", sort, err)
		}
	}

	if _, err := ParseRatingFilters(mapValues(map[string]string{"sort": "random"})); !errors.Is(err, ErrInvalidInput) {
		t.Fatal("ParseRatingFilters accepted an unknown sort")
	}
}

func TestParseFiltersRejectsRatingOrderings(t *testing.T) {
	for _, sort := range []string{"highest", "lowest"} {
		if _, err := ParseFilters(mapValues(map[string]string{"sort": sort}), false); !errors.Is(err, ErrInvalidInput) {
			t.Fatalf("ParseFilters(sort=%q) accepted a rating-only ordering", sort)
		}
	}
}

func TestParseRatingPayloadRejectsStrings(t *testing.T) {
	if _, err := parseRatingPayload(json.RawMessage(`"8.5"`)); !errors.Is(err, ErrInvalidInput) {
		t.Fatal("stringified rating was not rejected")
	}
	if _, err := parseRatingPayload(json.RawMessage(`null`)); !errors.Is(err, ErrInvalidInput) {
		t.Fatal("null rating was not rejected")
	}
	if _, err := parseRatingPayload(json.RawMessage(``)); !errors.Is(err, ErrInvalidInput) {
		t.Fatal("missing rating was not rejected")
	}
	rating, err := parseRatingPayload(json.RawMessage(`9.5`))
	if err != nil || rating.Float() != 9.5 {
		t.Fatalf("parseRatingPayload(9.5) = %v, %v", rating, err)
	}
}
