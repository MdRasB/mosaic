package config

import (
	"net/http"
	"os"
	"testing"
)

func TestLoadUsesCrossSiteCookiesInProduction(t *testing.T) {
	t.Setenv("APP_ENV", "production")

	cfg := Load()

	if !cfg.SecureCookies {
		t.Fatal("Load().SecureCookies = false, want true")
	}
	if cfg.SessionSameSite != http.SameSiteNoneMode {
		t.Fatalf("Load().SessionSameSite = %v, want SameSite=None", cfg.SessionSameSite)
	}
}

func TestLoadUsesLaxCookiesOutsideProduction(t *testing.T) {
	t.Setenv("APP_ENV", "development")

	cfg := Load()

	if cfg.SecureCookies {
		t.Fatal("Load().SecureCookies = true, want false")
	}
	if cfg.SessionSameSite != http.SameSiteLaxMode {
		t.Fatalf("Load().SessionSameSite = %v, want SameSite=Lax", cfg.SessionSameSite)
	}
}

func TestLoadDoesNotRequireProductionEnvironment(t *testing.T) {
	previous, wasSet := os.LookupEnv("APP_ENV")
	t.Cleanup(func() {
		if wasSet {
			_ = os.Setenv("APP_ENV", previous)
		} else {
			_ = os.Unsetenv("APP_ENV")
		}
	})
	_ = os.Unsetenv("APP_ENV")

	cfg := Load()
	if cfg.SecureCookies {
		t.Fatal("Load().SecureCookies = true without APP_ENV=production")
	}
}
