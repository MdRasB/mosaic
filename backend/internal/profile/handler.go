package profile

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/MdRasB/mosaic/backend/internal/auth"
	"github.com/MdRasB/mosaic/backend/internal/config"
)

type Handler struct {
	service *Service
	auth    *auth.Service
	config  config.Config
}

func NewHandler(service *Service, authService *auth.Service, cfg config.Config) *Handler {
	return &Handler{service: service, auth: authService, config: cfg}
}

func (h *Handler) Me(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodPatch {
		w.Header().Set("Allow", "GET, PATCH, OPTIONS")
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	user, err := h.auth.CurrentUser(r.Context(), h.sessionToken(r))
	if errors.Is(err, auth.ErrSessionNotFound) {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"code": "unauthorized", "message": "Authentication required."})
		return
	}
	if err != nil {
		http.Error(w, "service unavailable", http.StatusServiceUnavailable)
		return
	}
	if r.Method == http.MethodGet {
		h.get(w, r, user.ID)
		return
	}
	h.update(w, r, user.ID)
}

func (h *Handler) get(w http.ResponseWriter, r *http.Request, userID string) {
	profile, err := h.service.Get(r.Context(), userID)
	if errors.Is(err, ErrNotFound) {
		writeJSON(w, http.StatusNotFound, map[string]string{"code": "profile_not_found", "message": "Profile is not available."})
		return
	}
	if err != nil {
		http.Error(w, "service unavailable", http.StatusServiceUnavailable)
		return
	}
	writeJSON(w, http.StatusOK, profile)
}

func (h *Handler) update(w http.ResponseWriter, r *http.Request, userID string) {
	var input UpdateInput
	if !decodeJSON(w, r, &input) {
		return
	}
	profile, err := h.service.Update(r.Context(), userID, input)
	switch {
	case errors.Is(err, ErrUsernameTaken):
		writeJSON(w, http.StatusConflict, map[string]string{"code": "username_taken", "message": "That username is already in use."})
	case errors.Is(err, ErrInvalidInput):
		writeJSON(w, http.StatusBadRequest, map[string]string{"code": "invalid_input", "message": err.Error()})
	case err != nil:
		http.Error(w, "service unavailable", http.StatusServiceUnavailable)
	default:
		writeJSON(w, http.StatusOK, profile)
	}
}

func (h *Handler) sessionToken(r *http.Request) string {
	cookie, err := r.Cookie(h.config.SessionCookie)
	if err != nil {
		return ""
	}
	return cookie.Value
}

func decodeJSON(w http.ResponseWriter, r *http.Request, target any) bool {
	r.Body = http.MaxBytesReader(w, r.Body, 8<<10)
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"code": "invalid_json", "message": "Request body is invalid."})
		return false
	}
	return true
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}
