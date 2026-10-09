package profile

import (
	"errors"
	"strings"
	"testing"
)

func TestNormalizeAndValidate(t *testing.T) {
	avatar := "https://cdn.example.com/avatar.png"
	input, err := normalizeAndValidate(UpdateInput{
		Username:    "  Mosaic_User ",
		DisplayName: " Mosaic User ",
		Bio:         " Films and books. ",
		AvatarURL:   &avatar,
		Visibility:  "private",
	})
	if err != nil {
		t.Fatalf("normalizeAndValidate() error = %v", err)
	}
	if input.Username != "mosaic_user" || input.DisplayName != "Mosaic User" || input.Bio != "Films and books." {
		t.Fatalf("normalizeAndValidate() = %+v", input)
	}
}

func TestNormalizeAndValidateRejectsInvalidFields(t *testing.T) {
	_, err := normalizeAndValidate(UpdateInput{
		Username: "bad-name", DisplayName: "Mosaic User", Visibility: "private",
	})
	if !errors.Is(err, ErrInvalidInput) {
		t.Fatal("normalizeAndValidate() accepted invalid username")
	}
}

func TestNormalizeAndValidateBoundaries(t *testing.T) {
	tests := []struct {
		name    string
		input   UpdateInput
		wantErr bool
	}{
		{
			name:  "minimum username",
			input: UpdateInput{Username: "abc", DisplayName: "Mosaic", Visibility: "private"},
		},
		{
			name:  "maximum username",
			input: UpdateInput{Username: strings.Repeat("a", 24), DisplayName: "Mosaic", Visibility: "public"},
		},
		{
			name:  "maximum bio",
			input: UpdateInput{Username: "mosaic", DisplayName: "Mosaic", Bio: strings.Repeat("a", 300), Visibility: "private"},
		},
		{
			name:    "long bio",
			input:   UpdateInput{Username: "mosaic", DisplayName: "Mosaic", Bio: strings.Repeat("a", 301), Visibility: "private"},
			wantErr: true,
		},
		{
			name:    "non HTTPS avatar",
			input:   UpdateInput{Username: "mosaic", DisplayName: "Mosaic", AvatarURL: stringPtr("http://example.com/avatar.png"), Visibility: "private"},
			wantErr: true,
		},
		{
			name:    "invalid visibility",
			input:   UpdateInput{Username: "mosaic", DisplayName: "Mosaic", Visibility: "friends"},
			wantErr: true,
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			_, err := normalizeAndValidate(test.input)
			if errors.Is(err, ErrInvalidInput) != test.wantErr {
				t.Fatalf("normalizeAndValidate() error = %v, wantErr = %v", err, test.wantErr)
			}
		})
	}
}

func stringPtr(value string) *string {
	return &value
}
