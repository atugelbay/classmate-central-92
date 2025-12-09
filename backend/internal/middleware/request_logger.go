package middleware

import (
	"crypto/rand"
	"encoding/hex"
	"time"

	"classmate-central/internal/logger"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// RequestLoggerMiddleware logs HTTP requests with request ID for tracing
func RequestLoggerMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Generate or get request ID
		requestID := c.GetHeader("X-Request-ID")
		if requestID == "" {
			requestID = generateRequestID()
		}
		c.Set("request_id", requestID)
		c.Header("X-Request-ID", requestID)

		// Start timer
		start := time.Now()
		path := c.Request.URL.Path
		raw := c.Request.URL.RawQuery

		// Process request
		c.Next()

		// Calculate latency
		latency := time.Since(start)

		// Build log fields
		fields := []zap.Field{
			zap.String("request_id", requestID),
			zap.String("method", c.Request.Method),
			zap.String("path", path),
			zap.Int("status", c.Writer.Status()),
			zap.Duration("latency", latency),
			zap.String("ip", c.ClientIP()),
			zap.String("user_agent", c.Request.UserAgent()),
		}

		if raw != "" {
			fields = append(fields, zap.String("query", raw))
		}

		// Get user info if available
		if userID, exists := c.Get("user_id"); exists {
			fields = append(fields, zap.Int("user_id", userID.(int)))
		}
		if companyID, exists := c.Get("company_id"); exists {
			fields = append(fields, zap.String("company_id", companyID.(string)))
		}

		// Log based on status code
		if c.Writer.Status() >= 500 {
			logger.Error("HTTP Request", fields...)
		} else if c.Writer.Status() >= 400 {
			logger.Warn("HTTP Request", fields...)
		} else {
			logger.Info("HTTP Request", fields...)
		}
	}
}

// generateRequestID generates a unique request ID
func generateRequestID() string {
	b := make([]byte, 8)
	rand.Read(b)
	return hex.EncodeToString(b)
}

