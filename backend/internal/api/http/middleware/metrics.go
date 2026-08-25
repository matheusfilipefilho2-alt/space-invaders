package middleware

import (
	"time"

	"github.com/gin-gonic/gin"
	"github.com/yourusername/space-invaders/internal/infra/metrics"
)

// MetricsMiddleware records HTTP request metrics
func MetricsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip metrics endpoint to avoid recursion
		if c.Request.URL.Path == "/metrics" {
			c.Next()
			return
		}

		start := time.Now()

		// Process request
		c.Next()

		// Record metrics after request completes
		duration := time.Since(start).Seconds()
		status := c.Writer.Status()
		method := c.Request.Method
		path := c.FullPath() // Use route pattern, not actual path (e.g., /api/v1/conversions/:id)

		// If no route matched, use actual path
		if path == "" {
			path = c.Request.URL.Path
		}

		// Record HTTP request metrics
		if metrics.Metrics != nil {
			metrics.Metrics.RecordHTTPRequest(method, path, status, duration)
		}
	}
}
