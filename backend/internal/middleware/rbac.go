package middleware

import (
	"database/sql"
	"net/http"

	"classmate-central/internal/repository"

	"github.com/gin-gonic/gin"
)

// GetUserPermissions retrieves permissions from context (set by AuthMiddleware)
func GetUserPermissions(c *gin.Context) []string {
	permissions, exists := c.Get("permissions")
	if !exists {
		return []string{}
	}
	perms, ok := permissions.([]string)
	if !ok {
		return []string{}
	}
	return perms
}

// HasPermission checks if user has a specific permission
func HasPermission(c *gin.Context, permissionName string) bool {
	permissions := GetUserPermissions(c)
	for _, perm := range permissions {
		if perm == permissionName {
			return true
		}
	}
	return false
}

// RequirePermission middleware checks if user has a specific permission
func RequirePermission(resource, action string) gin.HandlerFunc {
	permissionName := resource + "." + action
	return func(c *gin.Context) {
		if !HasPermission(c, permissionName) {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "Insufficient permissions",
				"message": "You don't have permission to perform this action",
			})
			c.Abort()
			return
		}
		c.Next()
	}
}

// RequireRole middleware checks if user has a specific role
// Note: This requires db to be passed or available via context
func RequireRole(db *sql.DB, roleName string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			c.Abort()
			return
		}

		companyID, exists := c.Get("company_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Company context required"})
			c.Abort()
			return
		}

		// Check role using repository
		roleRepo := repository.NewRoleRepository(db)
		roles, err := roleRepo.GetUserRoles(userID.(int), companyID.(string))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error checking role"})
			c.Abort()
			return
		}

		hasRole := false
		for _, role := range roles {
			if role.Name == roleName {
				hasRole = true
				break
			}
		}

		if !hasRole {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "Insufficient permissions",
				"message": "This action requires role: " + roleName,
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// RequireAnyRole middleware checks if user has any of the specified roles
func RequireAnyRole(db *sql.DB, roleNames []string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			c.Abort()
			return
		}

		companyID, exists := c.Get("company_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Company context required"})
			c.Abort()
			return
		}

		roleRepo := repository.NewRoleRepository(db)
		roles, err := roleRepo.GetUserRoles(userID.(int), companyID.(string))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error checking role"})
			c.Abort()
			return
		}

		hasRole := false
		roleMap := make(map[string]bool)
		for _, name := range roleNames {
			roleMap[name] = true
		}

		for _, role := range roles {
			if roleMap[role.Name] {
				hasRole = true
				break
			}
		}

		if !hasRole {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "Insufficient permissions",
				"message": "This action requires one of the following roles",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

