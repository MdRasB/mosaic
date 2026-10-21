package review

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/MdRasB/mosaic/backend/internal/auth"
	"github.com/MdRasB/mosaic/backend/internal/config"
	"github.com/MdRasB/mosaic/backend/internal/domain/collection"
)

const (
	writeLimit  = 30
	writeWindow = time.Minute
	maxBodySize = 32 << 10
)

type Handler struct {
	service *Service
	auth    *auth.Service
	config  config.Config
	limiter *limiter
}

func NewHandler(service *Service, authService *auth.Service, cfg config.Config) *Handler {
	return &Handler{
		service: service,
		auth:    authService,
		config:  cfg,
		limiter: newLimiter(writeLimit, writeWindow),
	}
}

// Reviews serves the authenticated review endpoints. Private responses are
// never cached: a visibility change must be visible immediately.
func (h *Handler) Reviews(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "private, no-store")
	user, ok := h.user(w, r)
	if !ok {
		return
	}

	if r.URL.Path == "/api/v1/reviews/media" {
		if r.Method != http.MethodPut {
			methodError(w, "PUT, OPTIONS")
			return
		}
		h.upsertForMedia(w, r, user.ID)
		return
	}
	if r.URL.Path == "/api/v1/reviews/me" {
		if r.Method != http.MethodGet {
			methodError(w, "GET, OPTIONS")
			return
		}
		h.listOwned(w, r, user.ID)
		return
	}

	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(parts) != 4 || parts[0] != "api" || parts[1] != "v1" || parts[2] != "reviews" {
		http.NotFound(w, r)
		return
	}
	reviewID, err := strconv.ParseInt(parts[3], 10, 64)
	if err != nil || reviewID < 1 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"code": "invalid_id", "message": "Review ID is invalid."})
		return
	}

	switch r.Method {
	case http.MethodGet:
		item, err := h.service.GetOwned(r.Context(), user.ID, reviewID)
		if err != nil {
			h.serviceError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, item)
	case http.MethodPatch:
		if !h.allowWrite(w, user.ID) {
			return
		}
		h.updateOwned(w, r, user.ID, reviewID)
	case http.MethodDelete:
		if !h.allowWrite(w, user.ID) {
			return
		}
		if err := h.service.DeleteOwned(r.Context(), user.ID, reviewID); err != nil {
			h.serviceError(w, err)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	default:
		methodError(w, "GET, PATCH, DELETE, OPTIONS")
	}
}

// PublicForMedia lists the public reviews for one title. It is deliberately
// unauthenticated and only ever returns visibility = 'public' rows.
func (h *Handler) PublicForMedia(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodError(w, "GET, OPTIONS")
		return
	}
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(parts) != 6 || parts[0] != "api" || parts[1] != "v1" || parts[2] != "media" || parts[5] != "reviews" {
		http.NotFound(w, r)
		return
	}
	mediaType, providerID, err := ParseMediaRef(parts[3], parts[4])
	if err != nil {
		h.serviceError(w, err)
		return
	}
	limit, offset, err := ParsePagination(r.URL.Query())
	if err != nil {
		h.serviceError(w, err)
		return
	}

	result, err := h.service.ListPublic(r.Context(), mediaType, providerID, limit, offset)
	if err != nil {
		http.Error(w, "service unavailable", http.StatusServiceUnavailable)
		return
	}
	w.Header().Set("Cache-Control", "public, max-age=0, must-revalidate")
	writeJSON(w, http.StatusOK, result)
}

type upsertRequest struct {
	Media  collection.MediaInput `json:"media"`
	Review Input                 `json:"review"`
}

func (h *Handler) upsertForMedia(w http.ResponseWriter, r *http.Request, userID string) {
	if !h.allowWrite(w, userID) {
		return
	}
	var input upsertRequest
	if !decodeJSON(w, r, &input) {
		return
	}
	item, created, err := h.service.UpsertForMedia(r.Context(), userID, input.Media, input.Review)
	if err != nil {
		h.serviceError(w, err)
		return
	}
	status := http.StatusOK
	if created {
		status = http.StatusCreated
	}
	writeJSON(w, status, item)
}

func (h *Handler) listOwned(w http.ResponseWriter, r *http.Request, userID string) {
	filters, err := ParseFilters(r.URL.Query())
	if err != nil {
		h.serviceError(w, err)
		return
	}
	result, err := h.service.ListOwned(r.Context(), userID, filters)
	if err != nil {
		http.Error(w, "service unavailable", http.StatusServiceUnavailable)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

type patchRequest struct {
	Title            json.RawMessage `json:"title"`
	Body             json.RawMessage `json:"body"`
	Visibility       json.RawMessage `json:"visibility"`
	ContainsSpoilers json.RawMessage `json:"contains_spoilers"`
}

// patch converts the raw request into a Patch, distinguishing "omitted" (nil
// RawMessage) from "explicitly null" (null RawMessage).
func (p patchRequest) patch() (Patch, error) {
	var patch Patch
	present := false

	if len(p.Title) > 0 {
		present = true
		if isNull(p.Title) {
			empty := ""
			patch.Title = &empty
		} else {
			var value string
			if err := json.Unmarshal(p.Title, &value); err != nil {
				return Patch{}, fmt.Errorf("%w: title must be a string or null", ErrInvalidInput)
			}
			patch.Title = &value
		}
	}
	if len(p.Body) > 0 {
		present = true
		if isNull(p.Body) {
			return Patch{}, fmt.Errorf("%w: review text is required", ErrInvalidInput)
		}
		var value string
		if err := json.Unmarshal(p.Body, &value); err != nil {
			return Patch{}, fmt.Errorf("%w: review text must be a string", ErrInvalidInput)
		}
		patch.Body = &value
	}
	if len(p.Visibility) > 0 {
		present = true
		if isNull(p.Visibility) {
			return Patch{}, fmt.Errorf("%w: visibility must be private or public", ErrInvalidInput)
		}
		var value string
		if err := json.Unmarshal(p.Visibility, &value); err != nil {
			return Patch{}, fmt.Errorf("%w: visibility must be private or public", ErrInvalidInput)
		}
		patch.Visibility = &value
	}
	if len(p.ContainsSpoilers) > 0 {
		present = true
		if isNull(p.ContainsSpoilers) {
			return Patch{}, fmt.Errorf("%w: contains_spoilers must be true or false", ErrInvalidInput)
		}
		var value bool
		if err := json.Unmarshal(p.ContainsSpoilers, &value); err != nil {
			return Patch{}, fmt.Errorf("%w: contains_spoilers must be true or false", ErrInvalidInput)
		}
		patch.ContainsSpoilers = &value
	}

	if !present {
		return Patch{}, fmt.Errorf("%w: no review fields to update", ErrInvalidInput)
	}
	return patch, nil
}

func (h *Handler) updateOwned(w http.ResponseWriter, r *http.Request, userID string, reviewID int64) {
	var input patchRequest
	if !decodeJSON(w, r, &input) {
		return
	}
	patch, err := input.patch()
	if err != nil {
		h.serviceError(w, err)
		return
	}
	item, err := h.service.UpdateOwned(r.Context(), userID, reviewID, patch)
	if err != nil {
		h.serviceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, item)
}

func (h *Handler) allowWrite(w http.ResponseWriter, userID string) bool {
	if h.limiter.allow(userID) {
		return true
	}
	w.Header().Set("Retry-After", "60")
	writeJSON(w, http.StatusTooManyRequests, map[string]string{
		"code":    "rate_limited",
		"message": "Too many review changes. Please wait a moment and try again.",
	})
	return false
}

func (h *Handler) user(w http.ResponseWriter, r *http.Request) (auth.User, bool) {
	user, err := h.auth.CurrentUser(r.Context(), h.sessionToken(r))
	if errors.Is(err, auth.ErrSessionNotFound) {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"code": "unauthorized", "message": "Authentication required."})
		return auth.User{}, false
	}
	if err != nil {
		http.Error(w, "service unavailable", http.StatusServiceUnavailable)
		return auth.User{}, false
	}
	return user, true
}

func (h *Handler) sessionToken(r *http.Request) string {
	cookie, err := r.Cookie(h.config.SessionCookie)
	if err != nil {
		return ""
	}
	return cookie.Value
}

func (h *Handler) serviceError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, ErrInvalidInput):
		writeJSON(w, http.StatusBadRequest, map[string]string{"code": "invalid_input", "message": err.Error()})
	case errors.Is(err, ErrNotFound):
		writeJSON(w, http.StatusNotFound, map[string]string{"code": "not_found", "message": "Review not found."})
	default:
		http.Error(w, "service unavailable", http.StatusServiceUnavailable)
	}
}

func isNull(raw json.RawMessage) bool {
	return strings.TrimSpace(string(raw)) == "null"
}

func decodeJSON(w http.ResponseWriter, r *http.Request, target any) bool {
	r.Body = http.MaxBytesReader(w, r.Body, maxBodySize)
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

func methodError(w http.ResponseWriter, methods string) {
	w.Header().Set("Allow", methods)
	http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
}
