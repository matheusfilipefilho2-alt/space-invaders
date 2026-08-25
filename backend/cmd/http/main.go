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
	achievementRepo := database.NewAchievementRepository(db)
	playerAchievementRepo := database.NewPlayerAchievementRepository(db)
	// TODO: Implement ItemRepository and PlayerItemRepository in Task 11/12
	// itemRepo := database.NewItemRepository(db)
	// playerItemRepo := database.NewPlayerItemRepository(db)
	log.Println("✅ Repositories initialized")

	// Initialize services
	authService := service.NewAuthService(playerRepo, jwtSecret)
	playerService := service.NewPlayerService(playerRepo)
	gameService := service.NewGameService(playerRepo)
	achievementService := service.NewAchievementService(achievementRepo, playerRepo, playerAchievementRepo)
	// TODO: Enable when ItemRepository and PlayerItemRepository are implemented
	// itemService := service.NewItemService(itemRepo, playerItemRepo, playerRepo)
	leaderboardService := service.NewLeaderboardService(playerRepo)
	log.Println("✅ Services initialized")

	// Initialize handlers
	authHandler := handler.NewAuthHandler(authService)
	playerHandler := handler.NewPlayerHandler(playerService)
	gameHandler := handler.NewGameHandler(gameService)
	achievementHandler := handler.NewAchievementHandler(achievementService)
	// TODO: Enable when ItemService is ready
	// itemHandler := handler.NewItemHandler(itemService)
	leaderboardHandler := handler.NewLeaderboardHandler(leaderboardService)
	log.Println("✅ Handlers initialized")

	// Setup router
	r := router.NewRouter(
		authHandler,
		playerHandler,
		gameHandler,
		achievementHandler,
		nil, // itemHandler - TODO: Enable when ItemService is ready
		leaderboardHandler,
		jwtSecret,
	)
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
	log.Println("   POST /api/v1/game/start (protected)")
	log.Println("   POST /api/v1/game/end (protected)")
	log.Println("   GET  /api/v1/achievements")
	log.Println("   GET  /api/v1/players/me/achievements (protected)")
	log.Println("   POST /api/v1/achievements/check (protected)")
	// TODO: Enable when ItemHandler is implemented
	// log.Println("   GET  /api/v1/items")
	// log.Println("   GET  /api/v1/players/me/items (protected)")
	// log.Println("   POST /api/v1/items/:id/purchase (protected)")
	// log.Println("   POST /api/v1/items/:id/equip (protected)")
	// log.Println("   POST /api/v1/items/:id/unequip (protected)")
	log.Println("   GET  /api/v1/leaderboard/global")
	log.Println("   GET  /api/v1/leaderboard/league/:id")
	log.Println("   GET  /api/v1/leaderboard/friends (protected)")

	if err := r.Run(addr); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
