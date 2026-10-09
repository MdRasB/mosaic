package auth

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/MdRasB/mosaic/backend/internal/config"
)

type Handler struct {
	service *Service
	config  config.Config
}

type credentialsRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func NewHandler(service *Service, cfg config.Config) *Handler {
	return &Handler{service: service, config: cfg}
}

func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		methodNotAllowed(w)
		return
	}
	var input credentialsRequest
	if !decodeJSON(w, r, &input) {
		return
	}
	user, token, err := h.service.Register(r.Context(), input.Email, input.Password)
	if err != nil {
		h.writeAuthError(w, err)
		return
	}
	h.setSessionCookie(w, token)
	writeJSON(w, http.StatusCreated, user)
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		methodNotAllowed(w)
		return
	}
	var input credentialsRequest
	if !decodeJSON(w, r, &input) {
		return
	}
	user, token, err := h.service.Login(r.Context(), input.Email, input.Password)
	if err != nil {
		h.writeAuthError(w, err)
		return
	}
	h.setSessionCookie(w, token)
	writeJSON(w, http.StatusOK, user)
}

func (h *Handler) Me(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}
	user, err := h.service.CurrentUser(r.Context(), h.sessionToken(r))
	if errors.Is(err, ErrSessionNotFound) {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"code": "unauthorized", "message": "Authentication required."})
		return
	}
	if err != nil {
		http.Error(w, "service unavailable", http.StatusServiceUnavailable)
		return
	}
	writeJSON(w, http.StatusOK, user)
}

func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		methodNotAllowed(w)
		return
	}
	if err := h.service.Logout(r.Context(), h.sessionToken(r)); err != nil {
		http.Error(w, "service unavailable", http.StatusServiceUnavailable)
		return
	}
	h.clearSessionCookie(w)
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) sessionToken(r *http.Request) string {
	cookie, err := r.Cookie(h.config.SessionCookie)
	if err != nil {
		return ""
	}
	return cookie.Value
}

func (h *Handler) setSessionCookie(w http.ResponseWriter, token string) {
	http.SetCookie(w, &http.Cookie{
		Name: h.config.SessionCookie, Value: token, Path: "/",
		HttpOnly: true, Secure: h.config.SecureCookies, SameSite: http.SameSiteLaxMode,
		Expires: time.Now().UTC().Add(7 * 24 * time.Hour), MaxAge: 7 * 24 * 60 * 60,
	})
}

func (h *Handler) clearSessionCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name: h.config.SessionCookie, Value: "", Path: "/",
		HttpOnly: true, Secure: h.config.SecureCookies, SameSite: http.SameSiteLaxMode,
		Expires: time.Unix(0, 0), MaxAge: -1,
	})
}

func (h *Handler) writeAuthError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, ErrEmailTaken):
		writeJSON(w, http.StatusConflict, map[string]string{"code": "email_taken", "message": "An account with this email already exists."})
	case errors.Is(err, ErrInvalidCredentials):
		writeJSON(w, http.StatusUnauthorized, map[string]string{"code": "invalid_credentials", "message": "Email or password is incorrect."})
	default:
		if strings.Contains(err.Error(), "valid email") || strings.Contains(err.Error(), "password must") {
			writeJSON(w, http.StatusBadRequest, map[string]string{"code": "invalid_input", "message": err.Error()})
			return
		}
		http.Error(w, "service unavailable", http.StatusServiceUnavailable)
	}
}

func decodeJSON(w http.ResponseWriter, r *http.Request, target any) bool {
	r.Body = http.MaxBytesReader(w, r.Body, 4<<10)
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

func methodNotAllowed(w http.ResponseWriter) {
	w.Header().Set("Allow", "GET, POST, OPTIONS")
	http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
}
