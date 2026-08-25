package main

import (
	"fmt"
	"log"
	"time"

	"github.com/yourusername/space-invaders/configs"
	"github.com/yourusername/space-invaders/internal/api/http/handler"
	"github.com/yourusername/space-invaders/internal/api/http/router"
	"github.com/yourusername/space-invaders/internal/domain/service"
	"github.com/yourusername/space-invaders/internal/infra/cache"
	"github.com/yourusername/space-invaders/internal/infra/database"
	"github.com/yourusername/space-invaders/internal/infra/external"
	"github.com/yourusername/space-invaders/internal/infra/metrics"

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

	// Initialize metrics
	log.Println("📊 Initializing Prometheus metrics...")
	metrics.InitMetrics()
	log.Println("✅ Metrics initialized")

	// Initialize repositories
	playerRepo := database.NewPlayerRepository(db)
	achievementRepo := database.NewAchievementRepository(db)
	playerAchievementRepo := database.NewPlayerAchievementRepository(db)
	itemRepo := database.NewItemRepository(db)
	playerItemRepo := database.NewPlayerItemRepository(db)
	treasuryRepo := database.NewTreasuryRepository(db)
	conversionRepo := database.NewConversionRepository(db)
	orderRepo := database.NewOrderRepository(db)
	battlePassRepo := database.NewBattlePassRepository(db)
	log.Println("✅ Repositories initialized")

	// Initialize external clients
	abacatePayAPIKey := configs.GetAbacatePayAPIKey()
	abacatePayClient := external.NewAbacatePayClient(abacatePayAPIKey, true) // true = sandbox mode

	// Initialize Redis client for price caching
	redisClient, err := cache.NewRedisClient()
	if err != nil {
		log.Fatal("Failed to connect to Redis:", err)
	}
	log.Println("✅ Redis client connected")

	// Initialize price fetcher (with Redis cache)
	priceFetcher := external.NewCachedPriceFetcher(redisClient)
	log.Println("✅ Price fetcher initialized")

	// Initialize services
	authService := service.NewAuthService(playerRepo, jwtSecret)
	playerService := service.NewPlayerService(playerRepo)
	gameService := service.NewGameService(playerRepo)
	achievementService := service.NewAchievementService(achievementRepo, playerRepo, playerAchievementRepo)
	itemService := service.NewItemService(itemRepo, playerItemRepo, playerRepo)
	leaderboardService := service.NewLeaderboardService(playerRepo)
	conversionService := service.NewConversionService(playerRepo, treasuryRepo, conversionRepo, db)
	shopService := service.NewShopService(orderRepo, playerRepo, abacatePayClient, db)
	emissionService := service.NewEmissionCalculatorService(treasuryRepo, priceFetcher)
	battlePassService := service.NewBattlePassService(battlePassRepo, playerRepo, itemRepo, db)
	log.Println("✅ Services initialized")

	// Initialize handlers
	authHandler := handler.NewAuthHandler(authService)
	playerHandler := handler.NewPlayerHandler(playerService)
	gameHandler := handler.NewGameHandler(gameService)
	achievementHandler := handler.NewAchievementHandler(achievementService)
	itemHandler := handler.NewItemHandler(itemService)
	leaderboardHandler := handler.NewLeaderboardHandler(leaderboardService)
	conversionHandler := handler.NewConversionHandler(conversionService)
	shopHandler := handler.NewShopHandler(shopService)
	treasuryHandler := handler.NewTreasuryHandler(emissionService)
	battlePassHandler := handler.NewBattlePassHandler(battlePassService)
	log.Println("✅ Handlers initialized")

	// Setup router
	r := router.NewRouter(
		authHandler,
		playerHandler,
		gameHandler,
		achievementHandler,
		itemHandler,
		leaderboardHandler,
		conversionHandler,
		shopHandler,
		treasuryHandler,
		battlePassHandler,
		jwtSecret,
	)
	r.Setup()
	log.Println("✅ Router configured")

	// Start metrics collector (updates gauge metrics every 30 seconds)
	collector := metrics.NewCollector(db, metrics.Metrics, 30*time.Second)
	go collector.Start()
	log.Println("✅ Metrics collector started")

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
	log.Println("   GET  /api/v1/items")
	log.Println("   GET  /api/v1/players/me/items (protected)")
	log.Println("   POST /api/v1/items/:id/purchase (protected)")
	log.Println("   POST /api/v1/items/:id/equip (protected)")
	log.Println("   POST /api/v1/items/:id/unequip (protected)")
	log.Println("   GET  /api/v1/leaderboard/global")
	log.Println("   GET  /api/v1/leaderboard/league/:id")
	log.Println("   GET  /api/v1/leaderboard/friends (protected)")
	log.Println("   POST /api/v1/conversions (protected)")
	log.Println("   GET  /api/v1/conversions/history (protected)")
	log.Println("   GET  /api/v1/conversions/:id (protected)")
	log.Println("   GET  /api/v1/shop/packages")
	log.Println("   POST /api/v1/shop/orders (protected)")
	log.Println("   GET  /api/v1/shop/orders (protected)")
	log.Println("   GET  /api/v1/shop/orders/:id (protected)")
	log.Println("   GET  /api/v1/battle-pass/season")
	log.Println("   GET  /api/v1/battle-pass/rewards")
	log.Println("   GET  /api/v1/battle-pass/leaderboard")
	log.Println("   GET  /api/v1/battle-pass/progress (protected)")
	log.Println("   GET  /api/v1/battle-pass/summary (protected)")
	log.Println("   GET  /api/v1/battle-pass/unclaimed (protected)")
	log.Println("   POST /api/v1/battle-pass/claim (protected)")
	log.Println("   POST /api/v1/battle-pass/premium/purchase (protected)")
	log.Println("   GET  /api/v1/admin/treasury/config (protected)")
	log.Println("   GET  /api/v1/admin/treasury/emissions (protected)")
	log.Println("   POST /api/v1/admin/treasury/manual-emission (protected)")
	log.Println("   POST /webhooks/abacatepay")

	if err := r.Run(addr); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
