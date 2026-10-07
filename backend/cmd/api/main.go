package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/eon/backend/internal/api"
	"github.com/eon/backend/internal/storage"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

// @title Eon Cloud Storage API
// @version 1.0
// @description Eon backend API for cloud storage
// @host localhost:8080
// @BasePath /api/v1
func main() {
	_ = godotenv.Load() // Load .env file if it exists

	ctx := context.Background()

	// Initialize Database
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://eon:eonpassword@localhost:5432/eondb"
	}
	dbpool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v\n", err)
	}
	defer dbpool.Close()

	// Initialize Storage
	endpoint := os.Getenv("MINIO_ENDPOINT")
	if endpoint == "" {
		endpoint = "localhost:9000"
	}
	
	// Determine if we are using HTTPS (like Cloudflare R2)
	useSSL := false
	if strings.HasPrefix(endpoint, "https://") {
		useSSL = true
		endpoint = strings.TrimPrefix(endpoint, "https://")
	} else if strings.HasPrefix(endpoint, "http://") {
		endpoint = strings.TrimPrefix(endpoint, "http://")
	}

	accessKeyID := os.Getenv("MINIO_ACCESS_KEY")
	if accessKeyID == "" {
		accessKeyID = "eonadmin"
	}
	secretAccessKey := os.Getenv("MINIO_SECRET_KEY")
	if secretAccessKey == "" {
		secretAccessKey = "eonpassword"
	}
	
	store, err := storage.NewMinioStorage(endpoint, accessKeyID, secretAccessKey, useSSL)
	if err != nil {
		log.Fatalf("Unable to initialize storage: %v\n", err)
	}

	// Ensure bucket exists
	err = store.EnsureBucket(ctx, "eon-chunks")
	if err != nil {
		log.Fatalf("Unable to ensure bucket: %v\n", err)
	}

	// Setup Router
	router := api.SetupRouter(dbpool, store)

	log.Println("Starting server on :8080")
	if err := http.ListenAndServe(":8080", router); err != nil {
		log.Fatalf("Server failed: %v\n", err)
	}
}
