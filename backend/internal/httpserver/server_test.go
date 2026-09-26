package httpserver

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/MdRasB/mosaic/backend/internal/config"
)

func TestHealthEndpoint(t *testing.T) {
	server := New(config.Config{AllowedOrigin: "http://localhost:5173"})
	request := httptest.NewRequest(http.MethodGet, "/health", nil)
	response := httptest.NewRecorder()

	server.ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, response.Code)
	}

	if response.Body.String() != "{\"status\":\"ok\"}\n" {
		t.Fatalf("unexpected response body: %s", response.Body.String())
	}
}

func TestHealthEndpointRejectsNonGetRequests(t *testing.T) {
	server := New(config.Config{AllowedOrigin: "http://localhost:5173"})
	request := httptest.NewRequest(http.MethodPost, "/health", nil)
	response := httptest.NewRecorder()

	server.ServeHTTP(response, request)

	if response.Code != http.StatusMethodNotAllowed {
		t.Fatalf("expected status %d, got %d", http.StatusMethodNotAllowed, response.Code)
	}
}
