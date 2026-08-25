package router

import (
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/yourusername/space-invaders/internal/api/http/handler"
	"github.com/yourusername/space-invaders/internal/api/http/middleware"
)

type Router struct {
	engine             *gin.Engine
	authHandler        *handler.AuthHandler
	playerHandler      *handler.PlayerHandler
	gameHandler        *handler.GameHandler
	achievementHandler *handler.AchievementHandler
	itemHandler        *handler.ItemHandler
	leaderboardHandler *handler.LeaderboardHandler
	conversionHandler  *handler.ConversionHandler
	shopHandler        *handler.ShopHandler
	treasuryHandler    *handler.TreasuryHandler
	battlePassHandler  *handler.BattlePassHandler
	jwtSecret          string
}

func NewRouter(
	authHandler *handler.AuthHandler,
	playerHandler *handler.PlayerHandler,
	gameHandler *handler.GameHandler,
	achievementHandler *handler.AchievementHandler,
	itemHandler *handler.ItemHandler,
	leaderboardHandler *handler.LeaderboardHandler,
	conversionHandler *handler.ConversionHandler,
	shopHandler *handler.ShopHandler,
	treasuryHandler *handler.TreasuryHandler,
	battlePassHandler *handler.BattlePassHandler,
	jwtSecret string,
) *Router {
	return &Router{
		engine:             gin.Default(),
		authHandler:        authHandler,
		playerHandler:      playerHandler,
		gameHandler:        gameHandler,
		achievementHandler: achievementHandler,
		itemHandler:        itemHandler,
		leaderboardHandler: leaderboardHandler,
		conversionHandler:  conversionHandler,
		shopHandler:        shopHandler,
		treasuryHandler:    treasuryHandler,
		battlePassHandler:  battlePassHandler,
		jwtSecret:          jwtSecret,
	}
}

func (r *Router) Setup() *gin.Engine {
	// CORS middleware
	r.engine.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:3000"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// Metrics middleware (records HTTP request metrics)
	r.engine.Use(middleware.MetricsMiddleware())

	// Health check
	r.engine.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "ok",
			"service": "space-invaders-api",
		})
	})

	// Prometheus metrics endpoint
	r.engine.GET("/metrics", gin.WrapH(promhttp.Handler()))

	// API v1 routes
	v1 := r.engine.Group("/api/v1")
	{
		// Auth routes (public)
		auth := v1.Group("/auth")
		{
			auth.POST("/register", r.authHandler.Register)
			auth.POST("/login", r.authHandler.Login)
		}

		// Player routes (protected)
		players := v1.Group("/players")
		players.Use(middleware.AuthMiddleware(r.jwtSecret))
		{
			players.GET("/me", r.playerHandler.GetMe)
			players.PUT("/me", r.playerHandler.UpdateMe)

			// Player achievements
			players.GET("/me/achievements", r.achievementHandler.GetPlayerAchievements)

			// Player items (TODO: Enable when ItemHandler is implemented)
			if r.itemHandler != nil {
				players.GET("/me/items", r.itemHandler.GetPlayerItems)
			}
		}

		// Game routes (protected)
		game := v1.Group("/game")
		game.Use(middleware.AuthMiddleware(r.jwtSecret))
		{
			game.POST("/start", r.gameHandler.StartGame)
			game.POST("/end", r.gameHandler.EndGame)
		}

		// Achievements (mixed public/protected)
		achievements := v1.Group("/achievements")
		{
			// Public
			achievements.GET("", r.achievementHandler.ListAchievements)
		}

		// Achievement check (protected)
		achievementsProtected := v1.Group("/achievements")
		achievementsProtected.Use(middleware.AuthMiddleware(r.jwtSecret))
		{
			achievementsProtected.POST("/check", r.achievementHandler.CheckAchievements)
		}

		// Items (mixed public/protected)
		// TODO: Enable when ItemHandler is implemented
		if r.itemHandler != nil {
			items := v1.Group("/items")
			{
				// Public
				items.GET("", r.itemHandler.ListShopItems)
			}

			// Item actions (protected)
			itemsProtected := v1.Group("/items")
			itemsProtected.Use(middleware.AuthMiddleware(r.jwtSecret))
			{
				itemsProtected.POST("/:id/purchase", r.itemHandler.PurchaseItem)
				itemsProtected.POST("/:id/equip", r.itemHandler.EquipItem)
				itemsProtected.POST("/:id/unequip", r.itemHandler.UnequipItem)
			}
		}

		// Leaderboard (mixed public/protected)
		leaderboard := v1.Group("/leaderboard")
		{
			// Public
			leaderboard.GET("/global", r.leaderboardHandler.GetGlobalLeaderboard)
			leaderboard.GET("/league/:id", r.leaderboardHandler.GetLeagueLeaderboard)
		}

		// Friend leaderboard (protected)
		leaderboardProtected := v1.Group("/leaderboard")
		leaderboardProtected.Use(middleware.AuthMiddleware(r.jwtSecret))
		{
			leaderboardProtected.GET("/friends", r.leaderboardHandler.GetFriendLeaderboard)
		}

		// Conversions (Gold → SPACE) - all protected
		conversions := v1.Group("/conversions")
		conversions.Use(middleware.AuthMiddleware(r.jwtSecret))
		{
			conversions.POST("", r.conversionHandler.ConvertGoldToSpace)
			conversions.GET("/history", r.conversionHandler.GetConversionHistory)
			conversions.GET("/:id", r.conversionHandler.GetConversion)
		}

		// Shop (Gold packages) - mixed public/protected
		shop := v1.Group("/shop")
		{
			// Public - list packages
			shop.GET("/packages", r.shopHandler.ListPackages)
		}

		// Shop orders (protected)
		shopProtected := v1.Group("/shop")
		shopProtected.Use(middleware.AuthMiddleware(r.jwtSecret))
		{
			shopProtected.POST("/orders", r.shopHandler.CreateOrder)
			shopProtected.GET("/orders", r.shopHandler.GetPlayerOrders)
			shopProtected.GET("/orders/:id", r.shopHandler.GetOrder)
		}

		// Battle Pass (mixed public/protected)
		battlePass := v1.Group("/battle-pass")
		{
			// Public routes
			battlePass.GET("/season", r.battlePassHandler.GetCurrentSeason)
			battlePass.GET("/rewards", r.battlePassHandler.GetSeasonRewards)
			battlePass.GET("/leaderboard", r.battlePassHandler.GetLeaderboard)
		}

		// Battle Pass protected routes
		battlePassProtected := v1.Group("/battle-pass")
		battlePassProtected.Use(middleware.AuthMiddleware(r.jwtSecret))
		{
			battlePassProtected.GET("/progress", r.battlePassHandler.GetMyProgress)
			battlePassProtected.GET("/summary", r.battlePassHandler.GetProgressSummary)
			battlePassProtected.GET("/unclaimed", r.battlePassHandler.GetUnclaimedRewards)
			battlePassProtected.POST("/claim", r.battlePassHandler.ClaimReward)
			battlePassProtected.POST("/premium/purchase", r.battlePassHandler.PurchasePremium)
		}

		// Admin routes (protected)
		// TODO: Add admin role middleware when role-based auth is implemented
		admin := v1.Group("/admin")
		admin.Use(middleware.AuthMiddleware(r.jwtSecret))
		{
			// Treasury admin endpoints
			treasury := admin.Group("/treasury")
			{
				treasury.GET("/config", r.treasuryHandler.GetConfig)
				treasury.GET("/emissions", r.treasuryHandler.GetEmissionHistory)
				treasury.POST("/manual-emission", r.treasuryHandler.TriggerManualEmission)
			}
		}
	}

	// Webhooks (outside v1 group, no auth)
	webhooks := r.engine.Group("/webhooks")
	{
		webhooks.POST("/abacatepay", r.shopHandler.AbacatePayWebhook)
	}

	return r.engine
}

func (r *Router) Run(addr string) error {
	return r.engine.Run(addr)
}
