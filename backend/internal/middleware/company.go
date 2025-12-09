package middleware

import (
	"database/sql"
	"net/http"

	"classmate-central/internal/logger"
	"classmate-central/internal/repository"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// CompanyMiddleware enriches request context with company, roles and permissions.
// Must run after AuthMiddleware so user_id is already present.
func CompanyMiddleware(db *sql.DB) gin.HandlerFunc {
	roleRepo := repository.NewRoleRepository(db)

	return func(c *gin.Context) {
		userID, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
			c.Abort()
			return
		}

		// Get user's company_id from database
		var companyID sql.NullString
		query := `SELECT company_id FROM users WHERE id = $1`
		err := db.QueryRow(query, userID).Scan(&companyID)
		if err == sql.ErrNoRows {
			logger.Error("User not found in database", zap.Any("userId", userID))
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
			c.Abort()
			return
		}
		if err != nil {
			logger.Error("Failed to load company for user", logger.ErrorField(err), zap.Any("userId", userID))
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user company"})
			c.Abort()
			return
		}
		if !companyID.Valid || companyID.String == "" {
			logger.Error("User has no company_id assigned", zap.Any("userId", userID))
			c.JSON(http.StatusInternalServerError, gin.H{"error": "User company not assigned"})
			c.Abort()
			return
		}

		// Add company_id to context for use in handlers
		c.Set("company_id", companyID.String)

		// Hydrate fresh roles/permissions for every request to avoid stale tokens
		if roleRepo != nil {
			roles, err := roleRepo.GetUserRoles(userID.(int), companyID.String)
			if err != nil {
				logger.Error("Failed to load roles", logger.ErrorField(err), zap.Any("userId", userID), zap.String("companyId", companyID.String))
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to resolve roles"})
				c.Abort()
				return
			}
			c.Set("roles", roles)

			perms, err := roleRepo.GetUserPermissions(userID.(int), companyID.String)
			if err != nil {
				logger.Error("Failed to load permissions", logger.ErrorField(err), zap.Any("userId", userID), zap.String("companyId", companyID.String))
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to resolve permissions"})
				c.Abort()
				return
			}
			c.Set("permissions", perms)
		}

		c.Next()
	}
}
