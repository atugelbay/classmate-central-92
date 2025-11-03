package middleware

import (
	"database/sql"
	"net/http"

	"classmate-central/internal/errors"
	"classmate-central/internal/logger"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// ErrorHandlerMiddleware is a centralized error handling middleware
func ErrorHandlerMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()

		// Check if there are any errors
		if len(c.Errors) > 0 {
			err := c.Errors.Last().Err

			// Handle AppError
			if appErr, ok := err.(*errors.AppError); ok {
				c.JSON(appErr.HTTPStatus, gin.H{
					"error":   appErr.Code,
					"message": appErr.Message,
					"details": appErr.Details,
				})
				return
			}

			// Handle database errors
			if err == sql.ErrNoRows {
				c.JSON(http.StatusNotFound, gin.H{
					"error":   string(errors.ErrCodeNotFound),
					"message": "Resource not found",
				})
				return
			}

			// Log unexpected errors
			logger.Error("Unexpected error in request", logger.ErrorField(err), zap.String("path", c.Request.URL.Path), zap.String("method", c.Request.Method))

			// Return generic error
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   string(errors.ErrCodeInternal),
				"message": "Internal server error",
			})
		}
	}
}

// ErrorResponse is a helper to return error response
func ErrorResponse(c *gin.Context, err error) {
	if appErr, ok := err.(*errors.AppError); ok {
		c.JSON(appErr.HTTPStatus, gin.H{
			"error":   appErr.Code,
			"message": appErr.Message,
			"details": appErr.Details,
		})
		c.Abort()
		return
	}

	// Fallback for non-AppError
	c.JSON(http.StatusInternalServerError, gin.H{
		"error":   string(errors.ErrCodeInternal),
		"message": "Internal server error",
	})
	c.Abort()
}

