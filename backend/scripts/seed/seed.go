package main

import (
	"context"
	"log"
	"os"

	"github.com/joho/godotenv"
	"github.com/yourusername/space-invaders/configs"
	"github.com/yourusername/space-invaders/internal/infra/database"
)

func main() {
	// Load .env from backend root
	if err := godotenv.Load("../../.env"); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Load configuration
	if err := configs.LoadConfig(); err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Get database URL (prefer DATABASE_URL from env, fallback to config)
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		dbConfig := configs.GetDataBaseConfig()
		databaseURL = dbConfig.WriteDSN
	}

	if databaseURL == "" {
		log.Fatal("DATABASE_URL not set")
	}

	// Connect to database
	dbClient, err := database.NewDBClient(databaseURL, databaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	db := dbClient.WriteDB
	ctx := context.Background()

	log.Println("🌱 Starting database seeding...")
	log.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

	// Seed in order
	if err := SeedLeagues(ctx, db); err != nil {
		log.Fatalf("❌ Failed to seed leagues: %v", err)
	}

	if err := SeedAchievements(ctx, db); err != nil {
		log.Fatalf("❌ Failed to seed achievements: %v", err)
	}

	log.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
	log.Println("✅ Database seeding complete!")
}
