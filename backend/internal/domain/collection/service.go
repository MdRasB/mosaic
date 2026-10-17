package collection

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrInvalidInput = errors.New("invalid collection input")
	ErrNotFound     = errors.New("collection item not found")
)

var mediaIDPattern = regexp.MustCompile(`^[1-9][0-9]{0,15}$`)

type Service struct{ db *pgxpool.Pool }

func NewService(db *pgxpool.Pool) *Service { return &Service{db: db} }

func (s *Service) Add(ctx context.Context, userID string, input MediaInput, favorite bool) (Item, bool, error) {
	input, err := normalizeMedia(input)
	if err != nil {
		return Item{}, false, err
	}
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return Item{}, false, fmt.Errorf("begin collection transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	mediaID, err := upsertMedia(ctx, tx, input)
	if err != nil {
		return Item{}, false, fmt.Errorf("upsert media: %w", err)
	}

	var itemID int64
	var created bool
	err = tx.QueryRow(ctx, `INSERT INTO user_media
		(user_id, media_id, in_collection, is_favorite, favorited_at)
		VALUES ($1, $2, NOT $3, $3, CASE WHEN $3 THEN now() ELSE NULL END)
		ON CONFLICT (user_id, media_id) DO UPDATE SET
			in_collection = user_media.in_collection OR NOT $3,
			is_favorite = user_media.is_favorite OR $3,
			favorited_at = CASE WHEN user_media.is_favorite OR $3
				THEN COALESCE(user_media.favorited_at, now()) ELSE NULL END,
			updated_at = now()
		RETURNING id, (xmax = 0)`,
		userID, mediaID, favorite).Scan(&itemID, &created)
	if err != nil {
		return Item{}, false, fmt.Errorf("upsert collection item: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return Item{}, false, fmt.Errorf("commit collection transaction: %w", err)
	}
	item, err := s.Get(ctx, userID, itemID)
	return item, created, err
}

// upsertMedia stores or refreshes the shared media row for a provider title.
// It returns the media_items primary key used by the caller's user_media row.
func upsertMedia(ctx context.Context, tx pgx.Tx, input MediaInput) (int64, error) {
	var mediaID int64
	err := tx.QueryRow(ctx, `INSERT INTO media_items
		(provider, media_type, provider_media_id, title, poster_path, release_date, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, now())
		ON CONFLICT (provider, media_type, provider_media_id)
		DO UPDATE SET title = EXCLUDED.title, poster_path = EXCLUDED.poster_path,
		              release_date = EXCLUDED.release_date, updated_at = now()
		RETURNING id`,
		input.Provider, input.MediaType, input.ProviderMediaID, input.Title,
		input.PosterPath, input.ReleaseDate).Scan(&mediaID)
	return mediaID, err
}

func (s *Service) Get(ctx context.Context, userID string, itemID int64) (Item, error) {
	var item Item
	err := s.db.QueryRow(ctx, itemQuery+` WHERE um.user_id = $1 AND um.id = $2`, userID, itemID).Scan(scanArgs(&item)...)
	if errors.Is(err, pgx.ErrNoRows) {
		return Item{}, ErrNotFound
	}
	if err != nil {
		return Item{}, fmt.Errorf("get collection item: %w", err)
	}
	return item, nil
}

func (s *Service) Find(ctx context.Context, userID string, input MediaInput) (Item, error) {
	input, err := normalizeMedia(input)
	if err != nil {
		return Item{}, err
	}
	var item Item
	err = s.db.QueryRow(ctx, itemQuery+` WHERE um.user_id = $1
		AND mi.provider = $2 AND mi.media_type = $3 AND mi.provider_media_id = $4`,
		userID, input.Provider, input.MediaType, input.ProviderMediaID).Scan(scanArgs(&item)...)
	if errors.Is(err, pgx.ErrNoRows) {
		return Item{}, ErrNotFound
	}
	if err != nil {
		return Item{}, fmt.Errorf("find collection item: %w", err)
	}
	return item, nil
}

// Remove takes a title out of the collection. The row is only deleted once the
// title is in no list at all, so removing a collection entry does not drop a
// favorite or a watchlist status recorded for the same title.
func (s *Service) Remove(ctx context.Context, userID string, itemID int64) error {
	result, err := s.db.Exec(ctx, `UPDATE user_media SET in_collection = FALSE, updated_at = now()
		WHERE id = $1 AND user_id = $2 AND in_collection = TRUE`, itemID, userID)
	if err != nil {
		return fmt.Errorf("remove collection membership: %w", err)
	}
	if result.RowsAffected() == 0 {
		return ErrNotFound
	}
	if _, err := s.db.Exec(ctx, `DELETE FROM user_media
		WHERE id = $1 AND user_id = $2 AND in_collection = FALSE
			AND is_favorite = FALSE AND status IS NULL`, itemID, userID); err != nil {
		return fmt.Errorf("delete empty user media row: %w", err)
	}
	return nil
}

func (s *Service) SetFavorite(ctx context.Context, userID string, itemID int64, favorite bool) (Item, error) {
	query := `UPDATE user_media SET is_favorite = $3,
		favorited_at = CASE WHEN $3 THEN COALESCE(favorited_at, now()) ELSE NULL END,
		updated_at = now() WHERE id = $1 AND user_id = $2`
	result, err := s.db.Exec(ctx, query, itemID, userID, favorite)
	if err != nil {
		return Item{}, fmt.Errorf("set favorite: %w", err)
	}
	if result.RowsAffected() == 0 {
		return Item{}, ErrNotFound
	}
	return s.Get(ctx, userID, itemID)
}

func (s *Service) List(ctx context.Context, userID string, filters Filters, favorites bool) (ListResult, error) {
	if favorites {
		return s.list(ctx, userID, filters, scopeFavorites)
	}
	return s.list(ctx, userID, filters, scopeCollection)
}

// ListWatchlist returns the user's watchlisted titles. A row is on the
// watchlist when its status is set; filters.Status narrows to one state.
func (s *Service) ListWatchlist(ctx context.Context, userID string, filters Filters) (ListResult, error) {
	return s.list(ctx, userID, filters, scopeWatchlist)
}

type listScope int

const (
	scopeCollection listScope = iota
	scopeFavorites
	scopeWatchlist
)

func (s *Service) list(ctx context.Context, userID string, filters Filters, scope listScope) (ListResult, error) {
	where := "um.user_id = $1"
	args := []any{userID}
	next := 2
	if filters.Type != "all" {
		where += fmt.Sprintf(" AND mi.media_type = $%d", next)
		args = append(args, filters.Type)
		next++
	}
	switch scope {
	case scopeFavorites:
		where += " AND um.is_favorite = TRUE"
	case scopeWatchlist:
		where += " AND um.status IS NOT NULL"
		if filters.Status != "all" {
			where += fmt.Sprintf(" AND um.status = $%d", next)
			args = append(args, filters.Status)
			next++
		}
	default:
		where += " AND um.in_collection = TRUE"
	}
	result := ListResult{Items: make([]Item, 0)}
	countQuery := "SELECT count(*) FROM user_media um JOIN media_items mi ON mi.id = um.media_id WHERE " + where
	if err := s.db.QueryRow(ctx, countQuery, args...).Scan(&result.Pagination.Total); err != nil {
		return result, fmt.Errorf("count collection: %w", err)
	}
	order := "um.created_at DESC, um.id DESC"
	if filters.Sort == "oldest" {
		order = "um.created_at ASC, um.id ASC"
	} else if filters.Sort == "title" {
		order = "mi.title ASC, um.id ASC"
	} else if scope == scopeFavorites {
		order = "um.favorited_at DESC, um.id DESC"
	}
	query := itemQuery + " WHERE " + where + " ORDER BY " + order +
		fmt.Sprintf(" LIMIT $%d OFFSET $%d", next, next+1)
	args = append(args, filters.Limit, filters.Offset)
	rows, err := s.db.Query(ctx, query, args...)
	if err != nil {
		return result, fmt.Errorf("list collection: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var item Item
		if err := rows.Scan(scanArgs(&item)...); err != nil {
			return result, fmt.Errorf("scan collection: %w", err)
		}
		result.Items = append(result.Items, item)
	}
	if err := rows.Err(); err != nil {
		return result, fmt.Errorf("iterate collection: %w", err)
	}
	result.Pagination.Limit = filters.Limit
	result.Pagination.Offset = filters.Offset
	result.Pagination.HasMore = filters.Offset+len(result.Items) < result.Pagination.Total
	return result, nil
}

const itemQuery = `SELECT um.id, mi.provider, mi.media_type, mi.provider_media_id,
	mi.title, mi.poster_path, mi.release_date::text, um.in_collection, um.is_favorite, um.status,
	um.created_at, um.updated_at, um.favorited_at FROM user_media um
	JOIN media_items mi ON mi.id = um.media_id`

func scanArgs(item *Item) []any {
	return []any{&item.ID, &item.Media.Provider, &item.Media.MediaType, &item.Media.ProviderMediaID,
		&item.Media.Title, &item.Media.PosterPath, &item.Media.ReleaseDate, &item.InCollection,
		&item.IsFavorite, &item.Status, &item.CreatedAt, &item.UpdatedAt, &item.FavoritedAt}
}

func normalizeMedia(input MediaInput) (MediaInput, error) {
	input.Provider = strings.ToLower(strings.TrimSpace(input.Provider))
	input.MediaType = strings.ToLower(strings.TrimSpace(input.MediaType))
	input.ProviderMediaID = strings.TrimSpace(input.ProviderMediaID)
	input.Title = strings.TrimSpace(input.Title)
	if input.Provider != "tmdb" || (input.MediaType != "movie" && input.MediaType != "tv") ||
		!mediaIDPattern.MatchString(input.ProviderMediaID) ||
		len([]rune(input.Title)) < 1 || len([]rune(input.Title)) > 300 {
		return MediaInput{}, fmt.Errorf("%w: unsupported or invalid media identity", ErrInvalidInput)
	}
	if input.PosterPath != nil {
		path := strings.TrimSpace(*input.PosterPath)
		if path != "" && (!strings.HasPrefix(path, "/") || strings.ContainsAny(path, "?#")) {
			return MediaInput{}, fmt.Errorf("%w: poster path is invalid", ErrInvalidInput)
		}
		input.PosterPath = &path
	}
	if input.ReleaseDate != nil && *input.ReleaseDate != "" {
		date := strings.TrimSpace(*input.ReleaseDate)
		if _, err := time.Parse("2006-01-02", date); err != nil {
			return MediaInput{}, fmt.Errorf("%w: release date is invalid", ErrInvalidInput)
		}
		input.ReleaseDate = &date
	}
	return input, nil
}

func validateMedia(input MediaInput) error {
	_, err := normalizeMedia(input)
	return err
}

func ParseFilters(values url.Values, favorites bool) (Filters, error) {
	filters := Filters{Type: values.Get("type"), Sort: values.Get("sort"), Status: "all", Limit: 20}
	if filters.Type == "" {
		filters.Type = "all"
	}
	if filters.Sort == "" {
		filters.Sort = "recent"
	}
	if filters.Type != "all" && filters.Type != "movie" && filters.Type != "tv" {
		return Filters{}, fmt.Errorf("%w: type must be all, movie, or tv", ErrInvalidInput)
	}
	if filters.Sort != "recent" && filters.Sort != "oldest" && filters.Sort != "title" {
		return Filters{}, fmt.Errorf("%w: sort is invalid", ErrInvalidInput)
	}
	if raw := values.Get("status"); raw != "" {
		if raw != "all" {
			if _, err := normalizeStatus(raw); err != nil {
				return Filters{}, err
			}
		}
		filters.Status = raw
	}
	if raw := values.Get("limit"); raw != "" {
		value, err := strconv.Atoi(raw)
		if err != nil || value < 1 || value > 50 {
			return Filters{}, fmt.Errorf("%w: limit is invalid", ErrInvalidInput)
		}
		filters.Limit = value
	}
	if raw := values.Get("offset"); raw != "" {
		value, err := strconv.Atoi(raw)
		if err != nil || value < 0 {
			return Filters{}, fmt.Errorf("%w: offset is invalid", ErrInvalidInput)
		}
		filters.Offset = value
	}
	return filters, nil
}
