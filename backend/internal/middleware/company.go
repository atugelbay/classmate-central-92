package middleware

import (
	"database/sql"
	"net/http"

	"github.com/gin-gonic/gin"
)

// CompanyMiddleware adds the user's company_id to the request context
// Must be used after AuthMiddleware
func CompanyMiddleware(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
			c.Abort()
			return
		}

		// Get user's company_id from database
		var companyID string
		query := `SELECT company_id FROM users WHERE id = $1`
		err := db.QueryRow(query, userID).Scan(&companyID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user company"})
			c.Abort()
			return
		}

		// Add company_id to context for use in handlers
		c.Set("company_id", companyID)
		c.Next()
	}
}
