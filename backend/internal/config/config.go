package config

import (
	"net/http"
	"os"
)

type Config struct {
	Address         string
	AllowedOrigin   string
	DatabaseURL     string
	SessionCookie   string
	SecureCookies   bool
	SessionSameSite http.SameSite
}

func Load() Config {
	secureCookies := os.Getenv("APP_ENV") == "production"
	sessionSameSite := http.SameSiteLaxMode
	if secureCookies {
		sessionSameSite = http.SameSiteNoneMode
	}
	return Config{
		Address:         valueOrDefault("PORT", ":8080"),
		AllowedOrigin:   valueOrDefault("CORS_ALLOWED_ORIGINS", "http://localhost:5173"),
		DatabaseURL:     os.Getenv("DATABASE_URL"),
		SessionCookie:   valueOrDefault("SESSION_COOKIE_NAME", "mosaic_session"),
		SecureCookies:   secureCookies,
		SessionSameSite: sessionSameSite,
	}
}

func valueOrDefault(name, fallback string) string {
	if value := os.Getenv(name); value != "" {
		if name == "PORT" && value[0] != ':' {
			return ":" + value
		}
		return value
	}
	return fallback
}
