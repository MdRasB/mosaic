package collection

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"

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

func (h *Handler) Collection(w http.ResponseWriter, r *http.Request) {
	user, ok := h.user(w, r)
	if !ok {
		return
	}
	if r.URL.Path == "/api/v1/collection" {
		switch r.Method {
		case http.MethodGet:
			h.list(w, r, user.ID, false)
		case http.MethodPost:
			h.add(w, r, user.ID, false)
		default:
			methodError(w, "GET, POST, OPTIONS")
		}
		return
	}
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(parts) != 4 && len(parts) != 5 || parts[0] != "api" || parts[1] != "v1" || parts[2] != "collection" {
		http.NotFound(w, r)
		return
	}

	itemID, err := strconv.ParseInt(parts[3], 10, 64)
	if err != nil || itemID < 1 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"code": "invalid_id", "message": "Collection item ID is invalid."})
		return
	}
	action := ""
	if len(parts) == 5 {
		action = parts[4]
	}
	switch action {
	case "favorite":
		if r.Method == http.MethodPut {
			h.setFavorite(w, r, user.ID, itemID, true)
		} else if r.Method == http.MethodDelete {
			h.setFavorite(w, r, user.ID, itemID, false)
		} else {
			methodError(w, "PUT, DELETE, OPTIONS")
		}
	case "":
		if r.Method != http.MethodDelete {
			methodError(w, "DELETE, OPTIONS")
			return
		}
		if err := h.service.Remove(r.Context(), user.ID, itemID); err != nil {
			h.serviceError(w, err)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	default:
		http.NotFound(w, r)
	}
}

func (h *Handler) Check(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodError(w, "GET, OPTIONS")
		return
	}
	user, ok := h.user(w, r)
	if !ok {
		return
	}
	input := MediaInput{
		Provider:        r.URL.Query().Get("provider"),
		MediaType:       r.URL.Query().Get("type"),
		ProviderMediaID: r.URL.Query().Get("id"),
		Title:           "placeholder",
	}
	item, err := h.service.Find(r.Context(), user.ID, input)
	if errors.Is(err, ErrNotFound) {
		writeJSON(w, http.StatusOK, map[string]any{"item": nil})
		return
	}
	if err != nil {
		h.serviceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"item": item})
}

func (h *Handler) Favorites(w http.ResponseWriter, r *http.Request) {
	user, ok := h.user(w, r)
	if !ok {
		return
	}
	if r.Method == http.MethodGet {
		h.list(w, r, user.ID, true)
		return
	}
	if r.Method == http.MethodPut && r.URL.Path == "/api/v1/favorites/media" {
		h.add(w, r, user.ID, true)
		return
	}
	methodError(w, "GET, PUT, OPTIONS")
}

func (h *Handler) Watchlist(w http.ResponseWriter, r *http.Request) {
	user, ok := h.user(w, r)
	if !ok {
		return
	}
	if r.URL.Path == "/api/v1/watchlist" {
		switch r.Method {
		case http.MethodGet:
			h.listWatchlist(w, r, user.ID)
		case http.MethodPost:
			h.addWatchlist(w, r, user.ID)
		default:
			methodError(w, "GET, POST, OPTIONS")
		}
		return
	}
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(parts) != 4 && len(parts) != 5 || parts[0] != "api" || parts[1] != "v1" || parts[2] != "watchlist" {
		http.NotFound(w, r)
		return
	}
	itemID, err := strconv.ParseInt(parts[3], 10, 64)
	if err != nil || itemID < 1 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"code": "invalid_id", "message": "Watchlist item ID is invalid."})
		return
	}
	action := ""
	if len(parts) == 5 {
		action = parts[4]
	}
	switch action {
	case "status":
		if r.Method != http.MethodPut {
			methodError(w, "PUT, OPTIONS")
			return
		}
		h.setStatus(w, r, user.ID, itemID)
	case "history":
		if r.Method != http.MethodGet {
			methodError(w, "GET, OPTIONS")
			return
		}
		h.statusHistory(w, r, user.ID, itemID)
	case "":
		if r.Method != http.MethodDelete {
			methodError(w, "DELETE, OPTIONS")
			return
		}
		if err := h.service.RemoveWatchlist(r.Context(), user.ID, itemID); err != nil {
			h.serviceError(w, err)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	default:
		http.NotFound(w, r)
	}
}

func (h *Handler) statusHistory(w http.ResponseWriter, r *http.Request, userID string, itemID int64) {
	history, err := h.service.StatusHistory(r.Context(), userID, itemID)
	if err != nil {
		h.serviceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": history})
}

// Ratings serves the personal-rating endpoints. The {itemId} path segment is a
// user_media id, never a TMDB id.
func (h *Handler) Ratings(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "private, no-store")
	user, ok := h.user(w, r)
	if !ok {
		return
	}
	if r.URL.Path == "/api/v1/ratings" {
		if r.Method != http.MethodGet {
			methodError(w, "GET, OPTIONS")
			return
		}
		h.listRatings(w, r, user.ID)
		return
	}
	if r.URL.Path == "/api/v1/ratings/media" {
		if r.Method != http.MethodPut {
			methodError(w, "PUT, OPTIONS")
			return
		}
		h.rateMedia(w, r, user.ID)
		return
	}
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(parts) != 4 || parts[0] != "api" || parts[1] != "v1" || parts[2] != "ratings" {
		http.NotFound(w, r)
		return
	}
	itemID, err := strconv.ParseInt(parts[3], 10, 64)
	if err != nil || itemID < 1 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"code": "invalid_id", "message": "Rating item ID is invalid."})
		return
	}
	switch r.Method {
	case http.MethodPut:
		h.setRating(w, r, user.ID, itemID)
	case http.MethodDelete:
		if err := h.service.RemoveRating(r.Context(), user.ID, itemID); err != nil {
			h.serviceError(w, err)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	default:
		methodError(w, "PUT, DELETE, OPTIONS")
	}
}

type ratingRequest struct {
	Rating json.RawMessage `json:"rating"`
}

type rateMediaRequest struct {
	Media  MediaInput      `json:"media"`
	Rating json.RawMessage `json:"rating"`
}

// parseRatingPayload rejects stringified scores so only JSON numbers reach the
// scale validator.
func parseRatingPayload(raw json.RawMessage) (Rating, error) {
	text := strings.TrimSpace(string(raw))
	if text == "" || text == "null" {
		return 0, fmt.Errorf("%w: rating is required", ErrInvalidInput)
	}
	if strings.HasPrefix(text, `"`) {
		return 0, fmt.Errorf("%w: rating must be a number", ErrInvalidInput)
	}
	return ParseRating(json.Number(text))
}

func (h *Handler) setRating(w http.ResponseWriter, r *http.Request, userID string, itemID int64) {
	var input ratingRequest
	if !decodeJSON(w, r, &input) {
		return
	}
	rating, err := parseRatingPayload(input.Rating)
	if err != nil {
		h.serviceError(w, err)
		return
	}
	item, err := h.service.SetRating(r.Context(), userID, itemID, rating)
	if err != nil {
		h.serviceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, item)
}

func (h *Handler) rateMedia(w http.ResponseWriter, r *http.Request, userID string) {
	var input rateMediaRequest
	if !decodeJSON(w, r, &input) {
		return
	}
	rating, err := parseRatingPayload(input.Rating)
	if err != nil {
		h.serviceError(w, err)
		return
	}
	item, created, err := h.service.RateMedia(r.Context(), userID, input.Media, rating)
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

func (h *Handler) listRatings(w http.ResponseWriter, r *http.Request, userID string) {
	filters, err := ParseRatingFilters(r.URL.Query())
	if err != nil {
		h.serviceError(w, err)
		return
	}
	result, err := h.service.ListRated(r.Context(), userID, filters)
	if err != nil {
		h.serviceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (h *Handler) addWatchlist(w http.ResponseWriter, r *http.Request, userID string) {
	var input MediaInput
	if !decodeJSON(w, r, &input) {
		return
	}
	item, created, err := h.service.AddWatchlist(r.Context(), userID, input)
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

func (h *Handler) listWatchlist(w http.ResponseWriter, r *http.Request, userID string) {
	filters, err := ParseFilters(r.URL.Query(), false)
	if err != nil {
		h.serviceError(w, err)
		return
	}
	result, err := h.service.ListWatchlist(r.Context(), userID, filters)
	if err != nil {
		h.serviceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

type statusRequest struct {
	Status string `json:"status"`
}

func (h *Handler) setStatus(w http.ResponseWriter, r *http.Request, userID string, itemID int64) {
	var input statusRequest
	if !decodeJSON(w, r, &input) {
		return
	}
	item, err := h.service.SetStatus(r.Context(), userID, itemID, input.Status)
	if err != nil {
		h.serviceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, item)
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

func (h *Handler) add(w http.ResponseWriter, r *http.Request, userID string, favorite bool) {
	var input MediaInput
	if !decodeJSON(w, r, &input) {
		return
	}
	item, created, err := h.service.Add(r.Context(), userID, input, favorite)
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

func (h *Handler) list(w http.ResponseWriter, r *http.Request, userID string, favorites bool) {
	filters, err := ParseFilters(r.URL.Query(), favorites)
	if err != nil {
		h.serviceError(w, err)
		return
	}
	result, err := h.service.List(r.Context(), userID, filters, favorites)
	if err != nil {
		h.serviceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (h *Handler) setFavorite(w http.ResponseWriter, r *http.Request, userID string, itemID int64, favorite bool) {
	item, err := h.service.SetFavorite(r.Context(), userID, itemID, favorite)
	if err != nil {
		h.serviceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, item)
}

func (h *Handler) serviceError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, ErrInvalidInput):
		writeJSON(w, http.StatusBadRequest, map[string]string{"code": "invalid_input", "message": err.Error()})
	case errors.Is(err, ErrNotFound):
		writeJSON(w, http.StatusNotFound, map[string]string{"code": "not_found", "message": "Saved title not found."})
	default:
		http.Error(w, "service unavailable", http.StatusServiceUnavailable)
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
	r.Body = http.MaxBytesReader(w, r.Body, 16<<10)
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
