package middleware

import (
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/yourusername/space-invaders/internal/api/http/response"
	pkgjwt "github.com/yourusername/space-invaders/pkg/jwt"
)

const (
	AuthorizationHeader = "Authorization"
	BearerPrefix        = "Bearer "
	PlayerIDKey         = "player_id"
	UsernameKey         = "username"
)

// AuthMiddleware creates a JWT authentication middleware
func AuthMiddleware(jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get Authorization header
		authHeader := c.GetHeader(AuthorizationHeader)
		if authHeader == "" {
			response.Unauthorized(c, "Authorization header required")
			c.Abort()
			return
		}

		// Check Bearer prefix
		if !strings.HasPrefix(authHeader, BearerPrefix) {
			response.Unauthorized(c, "Invalid authorization header format")
			c.Abort()
			return
		}

		// Extract token
		tokenString := strings.TrimPrefix(authHeader, BearerPrefix)
		if tokenString == "" {
			response.Unauthorized(c, "Token required")
			c.Abort()
			return
		}

		// Validate token
		claims, err := pkgjwt.ValidateToken(tokenString, jwtSecret)
		if err != nil {
			response.Unauthorized(c, "Invalid or expired token")
			c.Abort()
			return
		}

		// Set player info in context
		c.Set(PlayerIDKey, claims.PlayerID)
		c.Set(UsernameKey, claims.Username)

		c.Next()
	}
}

// GetPlayerID retrieves the player ID from the context
func GetPlayerID(c *gin.Context) (uint, bool) {
	playerID, exists := c.Get(PlayerIDKey)
	if !exists {
		return 0, false
	}
	id, ok := playerID.(uint)
	return id, ok
}

// GetUsername retrieves the username from the context
func GetUsername(c *gin.Context) (string, bool) {
	username, exists := c.Get(UsernameKey)
	if !exists {
		return "", false
	}
	name, ok := username.(string)
	return name, ok
}
