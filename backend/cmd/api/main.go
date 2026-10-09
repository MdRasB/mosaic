package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/MdRasB/mosaic/backend/internal/config"
	"github.com/MdRasB/mosaic/backend/internal/httpserver"
	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	cfg := config.Load()
	var pool *pgxpool.Pool
	if cfg.DatabaseURL != "" {
		var err error
		pool, err = pgxpool.New(context.Background(), cfg.DatabaseURL)
		if err != nil {
			log.Fatalf("Mosaic API database setup failed: %v", err)
		}
		defer pool.Close()
		if err := pool.Ping(context.Background()); err != nil {
			log.Fatalf("Mosaic API database connection failed: %v", err)
		}
	} else {
		log.Print("DATABASE_URL is not configured; authentication routes are disabled")
	}
	server := &http.Server{
		Addr:              cfg.Address,
		Handler:           httpserver.New(cfg, pool),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	log.Printf("Mosaic API listening on %s", cfg.Address)
	shutdownContext, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	serverErrors := make(chan error, 1)
	go func() {
		serverErrors <- server.ListenAndServe()
	}()

	select {
	case err := <-serverErrors:
		if !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("Mosaic API failed: %v", err)
		}
	case <-shutdownContext.Done():
		timeoutContext, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		if err := server.Shutdown(timeoutContext); err != nil {
			log.Fatalf("Mosaic API shutdown failed: %v", err)
		}
	}
}
