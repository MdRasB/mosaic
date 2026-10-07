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
)

func main() {
	cfg := config.Load()
	server := &http.Server{
		Addr:              cfg.Address,
		Handler:           httpserver.New(cfg),
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
