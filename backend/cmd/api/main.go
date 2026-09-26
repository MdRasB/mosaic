package main

import (
	"log"
	"net/http"

	"github.com/MdRasB/mosaic/backend/internal/config"
	"github.com/MdRasB/mosaic/backend/internal/httpserver"
)

func main() {
	cfg := config.Load()
	server := httpserver.New(cfg)

	log.Printf("Mosaic API listening on %s", cfg.Address)
	if err := http.ListenAndServe(cfg.Address, server); err != nil {
		log.Fatal(err)
	}
}
