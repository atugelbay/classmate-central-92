package middleware

import (
	"net/http"
	"sync"
	"time"

	"classmate-central/internal/logger"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
	"go.uber.org/zap"
)

// RateLimiter stores rate limiters per IP
type RateLimiter struct {
	limiters map[string]*rate.Limiter
	mu       sync.RWMutex
	rate     rate.Limit
	burst    int
}

// NewRateLimiter creates a new rate limiter
func NewRateLimiter(r rate.Limit, b int) *RateLimiter {
	rl := &RateLimiter{
		limiters: make(map[string]*rate.Limiter),
		rate:     r,
		burst:    b,
	}

	// Cleanup old limiters every 5 minutes
	go rl.cleanup()

	return rl
}

// getLimiter returns a rate limiter for the given IP
func (rl *RateLimiter) getLimiter(ip string) *rate.Limiter {
	rl.mu.RLock()
	limiter, exists := rl.limiters[ip]
	rl.mu.RUnlock()

	if !exists {
		rl.mu.Lock()
		// Double check after acquiring write lock
		limiter, exists = rl.limiters[ip]
		if !exists {
			limiter = rate.NewLimiter(rl.rate, rl.burst)
			rl.limiters[ip] = limiter
		}
		rl.mu.Unlock()
	}

	return limiter
}

// cleanup removes old limiters periodically
func (rl *RateLimiter) cleanup() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		rl.mu.Lock()
		// Keep only recent limiters (simple cleanup - in production use TTL map)
		if len(rl.limiters) > 10000 {
			// Clear half of the limiters if we have too many
			for k := range rl.limiters {
				delete(rl.limiters, k)
				if len(rl.limiters) <= 5000 {
					break
				}
			}
		}
		rl.mu.Unlock()
	}
}

// getClientIP extracts client IP from request
func getClientIP(c *gin.Context) string {
	// Check X-Forwarded-For header (for proxies)
	forwarded := c.GetHeader("X-Forwarded-For")
	if forwarded != "" {
		return forwarded
	}

	// Check X-Real-IP header
	realIP := c.GetHeader("X-Real-IP")
	if realIP != "" {
		return realIP
	}

	// Fallback to remote address
	return c.ClientIP()
}

// RateLimitMiddleware creates a rate limiting middleware
func RateLimitMiddleware(requestsPerSecond rate.Limit, burst int) gin.HandlerFunc {
	limiter := NewRateLimiter(requestsPerSecond, burst)

	return func(c *gin.Context) {
		ip := getClientIP(c)
		limiter := limiter.getLimiter(ip)

		if !limiter.Allow() {
			logger.Warn("Rate limit exceeded", zap.String("ip", ip), zap.String("path", c.Request.URL.Path))
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error":   "Too many requests",
				"message": "Rate limit exceeded. Please try again later.",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// AuthRateLimitMiddleware creates a stricter rate limiter for auth endpoints
// 5 requests per minute for login, 3 per hour for registration
func AuthRateLimitMiddleware() gin.HandlerFunc {
	// Different limiters for different endpoints
	loginLimiter := NewRateLimiter(rate.Every(12*time.Second), 5)    // 5 per minute
	registerLimiter := NewRateLimiter(rate.Every(20*time.Minute), 3) // 3 per hour

	return func(c *gin.Context) {
		ip := getClientIP(c)
		path := c.Request.URL.Path

		var limiter *rate.Limiter
		if path == "/api/auth/login" || path == "/api/auth/verify-email" {
			limiter = loginLimiter.getLimiter(ip)
		} else if path == "/api/auth/register" {
			limiter = registerLimiter.getLimiter(ip)
		} else {
			// No rate limit for other auth endpoints
			c.Next()
			return
		}

		if !limiter.Allow() {
			logger.Warn("Auth rate limit exceeded", zap.String("ip", ip), zap.String("path", path))
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error":   "Too many requests",
				"message": "Too many authentication attempts. Please try again later.",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

