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

	// Handle branch context
	// Priority: 1. X-Branch-ID header (skip for /api/branches endpoint), 2. current_branch_id from token, 3. First available branch from DB
	branchID := ""
	// Don't use X-Branch-ID header for /api/branches endpoint to avoid blocking access
	if c.Request.URL.Path != "/api/branches" {
		branchID = c.GetHeader("X-Branch-ID")
	}
	if branchID == "" {
		// Try to get from token
		if tokenBranchID, exists := c.Get("current_branch_id"); exists && tokenBranchID != nil {
			branchID = tokenBranchID.(string)
		}
	}

		// If still no branch_id, try to get first available branch from database
		// If branches table doesn't exist or no branches available, fallback to company_id
		var branchRepo *repository.BranchRepository
		if branchID == "" {
			branchRepo = repository.NewBranchRepository(db)
			userBranches, err := branchRepo.GetUserBranches(userID.(int), companyID.String)
			if err == nil && len(userBranches) > 0 {
				// Use first available branch
				branchID = userBranches[0].ID
				logger.Info("Auto-selected first available branch", zap.Any("userId", userID), zap.String("branchId", branchID))
			} else {
				// If branches table doesn't exist or user has no branches, use company_id as fallback
				// This provides backward compatibility before migrations are applied
				branchID = companyID.String
				logger.Info("Using company_id as branch_id (fallback mode)", zap.Any("userId", userID), zap.String("branchId", branchID))
			}
		}

		// Verify user has access to this branch (skip if using company_id as fallback)
		if branchID != companyID.String {
			// Use branchRepo created earlier, or create if not exists
			if branchRepo == nil {
				branchRepo = repository.NewBranchRepository(db)
			}
			
			// Check if user has any branches - if not, allow access (user might be registering)
			userBranches, err := branchRepo.GetUserBranches(userID.(int), companyID.String)
			if err == nil && len(userBranches) == 0 {
				// User has no branches yet - this might be during registration
				// Allow access but use company_id as fallback
				logger.Info("User has no branches yet, using company_id fallback", zap.Any("userId", userID), zap.String("branchId", branchID))
				branchID = companyID.String
			} else {
				// User has branches, check access to requested branch
				hasAccess, err := branchRepo.CheckUserBranchAccess(userID.(int), branchID, companyID.String)
				if err != nil {
					// If check fails (e.g., branches table doesn't exist), fallback to company_id
					logger.Warn("Failed to check branch access, using company_id fallback", logger.ErrorField(err), zap.Any("userId", userID), zap.String("branchId", branchID))
					branchID = companyID.String
				} else if !hasAccess {
					logger.Error("User does not have access to branch", zap.Any("userId", userID), zap.String("branchId", branchID))
					c.JSON(http.StatusForbidden, gin.H{"error": "Access denied to this branch"})
					c.Abort()
					return
				}
			}
		}

		// Add branch_id to context
		c.Set("branch_id", branchID)
		
		// Add list of accessible branch IDs to context for handlers that need to show data from all branches
		if branchRepo != nil {
			userBranches, err := branchRepo.GetUserBranches(userID.(int), companyID.String)
			if err == nil && len(userBranches) > 0 {
				branchIDs := make([]string, len(userBranches))
				for i, b := range userBranches {
					branchIDs[i] = b.ID
				}
				c.Set("accessible_branch_ids", branchIDs)
			} else {
				// Fallback: use company_id as single "branch"
				c.Set("accessible_branch_ids", []string{companyID.String})
			}
		} else {
			// Fallback: use company_id as single "branch"
			c.Set("accessible_branch_ids", []string{companyID.String})
		}

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
