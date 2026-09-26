package config

import "os"

type Config struct {
	Address       string
	AllowedOrigin string
}

func Load() Config {
	return Config{
		Address:       valueOrDefault("PORT", ":8080"),
		AllowedOrigin: valueOrDefault("CORS_ALLOWED_ORIGINS", "http://localhost:5173"),
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
