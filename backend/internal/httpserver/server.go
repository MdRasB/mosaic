package httpserver

import (
	"encoding/json"
	"net/http"

	"github.com/MdRasB/mosaic/backend/internal/auth"
	"github.com/MdRasB/mosaic/backend/internal/config"
	"github.com/jackc/pgx/v5/pgxpool"
)

func New(cfg config.Config, pool *pgxpool.Pool) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/health", healthHandler)
	if pool != nil {
		authHandler := auth.NewHandler(auth.NewService(pool), cfg)
		mux.HandleFunc("/api/v1/auth/register", authHandler.Register)
		mux.HandleFunc("/api/v1/auth/login", authHandler.Login)
		mux.HandleFunc("/api/v1/auth/me", authHandler.Me)
		mux.HandleFunc("/api/v1/auth/logout", authHandler.Logout)
	}

	return withCORS(cfg.AllowedOrigin, mux)
}

func healthHandler(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		http.Error(writer, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	writer.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(writer).Encode(map[string]string{"status": "ok"})
}

func withCORS(allowedOrigin string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		writer.Header().Set("Access-Control-Allow-Origin", allowedOrigin)
		writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		writer.Header().Set("Access-Control-Allow-Credentials", "true")
		writer.Header().Set("Vary", "Origin")

		if request.Method == http.MethodOptions {
			writer.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(writer, request)
	})
}
