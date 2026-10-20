package collection

import (
	"errors"
	"testing"
)

func TestNormalizeStatus(t *testing.T) {
	for _, valid := range []string{"watchlist", "watching", "completed", "dropped", "paused", "Watching", " completed "} {
		status, err := normalizeStatus(valid)
		if err != nil {
			t.Fatalf("normalizeStatus(%q) error = %v", valid, err)
		}
		if status == "" {
			t.Fatalf("normalizeStatus(%q) returned an empty status", valid)
		}
	}

	for _, invalid := range []string{"", "all", "planned", "null", "watch lists"} {
		if _, err := normalizeStatus(invalid); !errors.Is(err, ErrInvalidInput) {
			t.Fatalf("normalizeStatus(%q) did not reject invalid status", invalid)
		}
	}
}

func TestParseFiltersStatus(t *testing.T) {
	filters, err := ParseFilters(mapValues(map[string]string{"status": "watching"}), false)
	if err != nil {
		t.Fatalf("ParseFilters() error = %v", err)
	}
	if filters.Status != "watching" {
		t.Fatalf("ParseFilters() status = %q", filters.Status)
	}

	if _, err := ParseFilters(mapValues(map[string]string{"status": "all"}), false); err != nil {
		t.Fatalf("ParseFilters() rejected the all status: %v", err)
	}

	defaults, err := ParseFilters(mapValues(map[string]string{}), false)
	if err != nil {
		t.Fatalf("ParseFilters() error = %v", err)
	}
	if defaults.Status != "all" {
		t.Fatalf("ParseFilters() default status = %q", defaults.Status)
	}

	if _, err := ParseFilters(mapValues(map[string]string{"status": "planned"}), false); !errors.Is(err, ErrInvalidInput) {
		t.Fatal("ParseFilters() accepted an invalid status")
	}
}
