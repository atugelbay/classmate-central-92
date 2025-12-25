package middleware

import (
	"os"
	"strings"

	"github.com/gin-gonic/gin"
)

func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		allowedOrigins := os.Getenv("ALLOWED_ORIGINS")
		
		// In production, use ALLOWED_ORIGINS env var
		// In development, allow localhost and the origin from request
		if allowedOrigins == "" {
			// Development mode: allow localhost and request origin
			if origin != "" && (strings.Contains(origin, "localhost") || strings.Contains(origin, "127.0.0.1")) {
				c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
			} else if origin != "" {
				c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
			} else {
				c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
			}
		} else {
			// Production mode: check against allowed origins
			allowedList := strings.Split(allowedOrigins, ",")
			for _, allowed := range allowedList {
				allowed = strings.TrimSpace(allowed)
				if origin == allowed {
					c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
					break
				}
			}
		}

		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With, X-Branch-ID")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")
		c.Writer.Header().Set("Access-Control-Max-Age", "86400")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}
