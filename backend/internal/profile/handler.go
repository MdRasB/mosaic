package profile

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"

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

// UploadAvatar accepts a multipart image upload and stores it as the avatar.
func (h *Handler) UploadAvatar(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.Header().Set("Allow", "POST, OPTIONS")
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

	// Allow a little slack over the image cap for multipart framing overhead.
	r.Body = http.MaxBytesReader(w, r.Body, MaxAvatarBytes+(1<<20))
	file, _, err := r.FormFile("avatar")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"code": "invalid_upload", "message": "Choose an image file to upload."})
		return
	}
	defer file.Close()

	data, err := io.ReadAll(io.LimitReader(file, MaxAvatarBytes+1))
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"code": "invalid_upload", "message": "That image could not be read."})
		return
	}
	// Sniff the real type rather than trusting the browser-supplied header.
	contentType := detectImageType(data)

	if err := h.service.SetAvatar(r.Context(), user.ID, contentType, data); err != nil {
		switch {
		case errors.Is(err, ErrUnsupported):
			writeJSON(w, http.StatusBadRequest, map[string]string{"code": "unsupported_image", "message": err.Error()})
		case errors.Is(err, ErrInvalidInput):
			writeJSON(w, http.StatusRequestEntityTooLarge, map[string]string{"code": "image_too_large", "message": err.Error()})
		default:
			http.Error(w, "service unavailable", http.StatusServiceUnavailable)
		}
		return
	}

	profile, err := h.service.Get(r.Context(), user.ID)
	if err != nil {
		http.Error(w, "service unavailable", http.StatusServiceUnavailable)
		return
	}
	writeJSON(w, http.StatusOK, profile)
}

// AvatarImage serves the stored uploaded avatar for the signed-in user, and
// clears it on DELETE.
func (h *Handler) AvatarImage(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead && r.Method != http.MethodDelete {
		w.Header().Set("Allow", "GET, HEAD, DELETE, OPTIONS")
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

	if r.Method == http.MethodDelete {
		if err := h.service.ClearAvatar(r.Context(), user.ID); err != nil {
			if errors.Is(err, ErrNotFound) {
				writeJSON(w, http.StatusNotFound, map[string]string{"code": "profile_not_found", "message": "Profile is not available."})
				return
			}
			http.Error(w, "service unavailable", http.StatusServiceUnavailable)
			return
		}
		profile, err := h.service.Get(r.Context(), user.ID)
		if err != nil {
			http.Error(w, "service unavailable", http.StatusServiceUnavailable)
			return
		}
		writeJSON(w, http.StatusOK, profile)
		return
	}

	avatar, err := h.service.GetAvatar(r.Context(), user.ID)
	if err != nil {
		if errors.Is(err, ErrNoAvatar) || errors.Is(err, ErrNotFound) {
			http.Error(w, "avatar not found", http.StatusNotFound)
			return
		}
		http.Error(w, "service unavailable", http.StatusServiceUnavailable)
		return
	}
	w.Header().Set("Content-Type", avatar.ContentType)
	w.Header().Set("Cache-Control", "private, max-age=0, must-revalidate")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("Content-Length", strconv.Itoa(len(avatar.Data)))
	if r.Method == http.MethodHead {
		w.WriteHeader(http.StatusOK)
		return
	}
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(avatar.Data)
}

// detectImageType identifies an upload by its bytes. Go's sniffer does not
// always recognise WebP, so the RIFF/WEBP signature is checked directly.
func detectImageType(data []byte) string {
	if kind := http.DetectContentType(data); kind != "application/octet-stream" {
		return kind
	}
	if len(data) >= 12 && string(data[0:4]) == "RIFF" && string(data[8:12]) == "WEBP" {
		return "image/webp"
	}
	return http.DetectContentType(data)
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
