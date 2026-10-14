package profile

import (
	"errors"
	"testing"
)

// A tiny valid PNG header is enough for the sniffer under test.
var pngSignature = []byte{0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A}

func TestDetectImageType(t *testing.T) {
	webp := append([]byte("RIFF\x00\x00\x00\x00WEBP"), make([]byte, 8)...)
	tests := []struct {
		name string
		data []byte
		want string
	}{
		{name: "png", data: pngSignature, want: "image/png"},
		{name: "gif", data: []byte("GIF89a...."), want: "image/gif"},
		{name: "webp", data: webp, want: "image/webp"},
		{name: "html page is not an image", data: []byte("<!DOCTYPE html><html><body>Not an image</body></html>"), want: "text/html; charset=utf-8"},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if got := detectImageType(test.data); got != test.want {
				t.Fatalf("detectImageType() = %q, want %q", got, test.want)
			}
		})
	}
}

// SetAvatar validates before touching the database, so a nil pool is safe here.
func TestSetAvatarRejectsUnsupportedContent(t *testing.T) {
	service := &Service{}
	err := service.SetAvatar(t.Context(), "user-1", "text/html; charset=utf-8", []byte("<html></html>"))
	if !errors.Is(err, ErrUnsupported) {
		t.Fatalf("SetAvatar() error = %v, want ErrUnsupported", err)
	}
}

func TestSetAvatarRejectsEmptyUpload(t *testing.T) {
	service := &Service{}
	err := service.SetAvatar(t.Context(), "user-1", "image/png", nil)
	if !errors.Is(err, ErrUnsupported) {
		t.Fatalf("SetAvatar() error = %v, want ErrUnsupported", err)
	}
}

func TestSetAvatarRejectsOversizedUpload(t *testing.T) {
	service := &Service{}
	oversized := make([]byte, MaxAvatarBytes+1)
	copy(oversized, pngSignature)
	err := service.SetAvatar(t.Context(), "user-1", "image/png", oversized)
	if !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("SetAvatar() error = %v, want ErrInvalidInput", err)
	}
}