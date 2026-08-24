package main

import (
	"fmt"
	"log"

	"github.com/yourusername/space-invaders/configs"
	"github.com/yourusername/space-invaders/internal/api/http/handler"
	"github.com/yourusername/space-invaders/internal/api/http/router"
	"github.com/yourusername/space-invaders/internal/domain/service"
	"github.com/yourusername/space-invaders/internal/infra/database"

	_ "github.com/joho/godotenv/autoload"
)

func main() {
	log.Println("🚀 Starting Space Invaders API...")

	// Get configuration
	databaseURL := configs.GetDatabaseURL()
	jwtSecret := configs.GetJWTSecret()
	port := configs.GetAPIPortFromEnv()

	// Connect to database
	log.Println("📦 Connecting to database...")
	db, err := database.NewPostgresConnection(databaseURL)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	log.Println("✅ Database connected")

	// Initialize repositories
	playerRepo := database.NewPlayerRepository(db)
	log.Println("✅ Repositories initialized")

	// Initialize services
	authService := service.NewAuthService(playerRepo, jwtSecret)
	playerService := service.NewPlayerService(playerRepo)
	log.Println("✅ Services initialized")

	// Initialize handlers
	authHandler := handler.NewAuthHandler(authService)
	playerHandler := handler.NewPlayerHandler(playerService)
	log.Println("✅ Handlers initialized")

	// Setup router
	r := router.NewRouter(authHandler, playerHandler, jwtSecret)
	r.Setup()
	log.Println("✅ Router configured")

	// Start server
	addr := fmt.Sprintf(":%s", port)
	log.Printf("🎮 Server running on http://localhost:%s\n", port)
	log.Println("📍 API Endpoints:")
	log.Println("   GET  /health")
	log.Println("   POST /api/v1/auth/register")
	log.Println("   POST /api/v1/auth/login")
	log.Println("   GET  /api/v1/players/me (protected)")
	log.Println("   PUT  /api/v1/players/me (protected)")

	if err := r.Run(addr); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
