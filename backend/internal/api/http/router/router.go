package router

import (
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/yourusername/space-invaders/internal/api/http/handler"
	"github.com/yourusername/space-invaders/internal/api/http/middleware"
)

type Router struct {
	engine        *gin.Engine
	authHandler   *handler.AuthHandler
	playerHandler *handler.PlayerHandler
	jwtSecret     string
}

func NewRouter(
	authHandler *handler.AuthHandler,
	playerHandler *handler.PlayerHandler,
	jwtSecret string,
) *Router {
	return &Router{
		engine:        gin.Default(),
		authHandler:   authHandler,
		playerHandler: playerHandler,
		jwtSecret:     jwtSecret,
	}
}

func (r *Router) Setup() *gin.Engine {
	// CORS middleware
	r.engine.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173", "http://localhost:3000"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// Health check
	r.engine.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "ok",
			"service": "space-invaders-api",
		})
	})

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
		}
	}

	return r.engine
}

func (r *Router) Run(addr string) error {
	return r.engine.Run(addr)
}
