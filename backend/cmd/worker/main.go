package main

import (
	"context"
	"flag"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/yourusername/space-invaders/configs"
	"github.com/yourusername/space-invaders/internal/infra/database"
	"github.com/yourusername/space-invaders/internal/worker"

	_ "github.com/joho/godotenv/autoload"
)

func main() {
	// Parse command line flags
	runOnce := flag.Bool("once", false, "Run once and exit (default is to run daily)")
	autoCreate := flag.Bool("auto-create", true, "Automatically create new seasons when old ones expire")
	flag.Parse()

	log.Println("🚀 Starting Battle Pass Season Transition Worker...")

	// Get database configuration
	databaseURL := configs.GetDatabaseURL()
	if databaseURL == "" {
		log.Fatal("DATABASE_URL environment variable not set")
	}

	// Connect to database
	log.Println("📦 Connecting to database...")
	db, err := database.NewPostgresConnection(databaseURL)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	log.Println("✅ Database connected")

	// Initialize repository
	battlePassRepo := database.NewBattlePassRepository(db)

	// Create worker
	seasonWorker := worker.NewSeasonTransitionWorker(battlePassRepo, *autoCreate)

	// Create context that listens for interrupt signals
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Setup signal handling for graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)

	go func() {
		<-sigChan
		log.Println("\n🛑 Received shutdown signal, stopping worker...")
		cancel()
	}()

	// Run worker
	if *runOnce {
		log.Println("🔄 Running worker once...")
		if err := seasonWorker.Run(ctx); err != nil {
			log.Fatalf("Worker error: %v", err)
		}
		log.Println("✅ Worker completed successfully")
	} else {
		log.Println("🔄 Running worker in daily mode...")
		seasonWorker.RunDaily(ctx)
	}
}
