package handlers

import (
	"database/sql"
	"fmt"
	"net/http"

	"classmate-central/internal/logger"
	"classmate-central/internal/middleware"
	"classmate-central/internal/models"
	"classmate-central/internal/repository"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

type BranchHandler struct {
	branchRepo *repository.BranchRepository
	roleRepo   *repository.RoleRepository
	db         *sql.DB
}

func NewBranchHandler(db *sql.DB) *BranchHandler {
	return &BranchHandler{
		branchRepo: repository.NewBranchRepository(db),
		roleRepo:   repository.NewRoleRepository(db),
		db:         db,
	}
}

// GetBranches returns branches accessible to the user
// GET /api/branches
func (h *BranchHandler) GetBranches(c *gin.Context) {
	logger.Info("GetBranches handler called")
	userID, _ := c.Get("user_id")
	companyID, _ := c.Get("company_id")

	logger.Info("Getting branches for user", zap.Any("userId", userID), zap.String("companyId", companyID.(string)))

	branches, err := h.branchRepo.GetUserBranches(userID.(int), companyID.(string))
	if err != nil {
		logger.Error("Failed to get user branches", logger.ErrorField(err), zap.Any("userId", userID), zap.String("companyId", companyID.(string)))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get branches"})
		return
	}

	// Log for debugging
	logger.Info("Returning branches for user", zap.Any("userId", userID), zap.String("companyId", companyID.(string)), zap.Int("branchCount", len(branches)))

	c.JSON(http.StatusOK, branches)
}

// GetBranch returns a specific branch by ID
// GET /api/branches/:id
func (h *BranchHandler) GetBranch(c *gin.Context) {
	branchID := c.Param("id")
	companyID, _ := c.Get("company_id")
	userID, _ := c.Get("user_id")

	// Check access
	hasAccess, err := h.branchRepo.CheckUserBranchAccess(userID.(int), branchID, companyID.(string))
	if err != nil || !hasAccess {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	branch, err := h.branchRepo.GetBranchByID(branchID, companyID.(string))
	if err != nil {
		logger.Error("Failed to get branch", logger.ErrorField(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "Branch not found"})
		return
	}

	c.JSON(http.StatusOK, branch)
}

// CreateBranch creates a new branch
// POST /api/branches
func (h *BranchHandler) CreateBranch(c *gin.Context) {
	companyID, _ := c.Get("company_id")

	var req struct {
		Name    string `json:"name" binding:"required"`
		Address string `json:"address"`
		Phone   string `json:"phone"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	branch := &models.Branch{
		ID:        uuid.New().String(),
		Name:      req.Name,
		CompanyID: companyID.(string),
		Address:   req.Address,
		Phone:     req.Phone,
		Status:    "active",
	}

	err := h.branchRepo.CreateBranch(branch)
	if err != nil {
		logger.Error("Failed to create branch", logger.ErrorField(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create branch"})
		return
	}

	// Automatically assign the creator to the new branch
	userID, _ := c.Get("user_id")
	roleID, _ := c.Get("role_id")
	var roleIDPtr *string
	if roleIDStr, ok := roleID.(string); ok {
		roleIDPtr = &roleIDStr
	}
	
	// Check if user is already assigned to this branch
	hasAccess, err := h.branchRepo.CheckUserBranchAccess(userID.(int), branch.ID, companyID.(string))
	if err == nil && !hasAccess {
		// User is not assigned, assign them to the new branch
		if assignErr := h.branchRepo.AssignUserToBranch(userID.(int), branch.ID, roleIDPtr, companyID.(string), nil); assignErr != nil {
			logger.Warn("Failed to auto-assign user to new branch", logger.ErrorField(assignErr), zap.Int("userId", userID.(int)), zap.String("branchId", branch.ID))
			// Don't fail branch creation if assignment fails
		} else {
			logger.Info("Auto-assigned user to new branch", zap.Int("userId", userID.(int)), zap.String("branchId", branch.ID))
		}
	} else if hasAccess {
		logger.Info("User already has access to branch", zap.Int("userId", userID.(int)), zap.String("branchId", branch.ID))
	}

	c.JSON(http.StatusCreated, branch)
}

// UpdateBranch updates an existing branch
// PUT /api/branches/:id
func (h *BranchHandler) UpdateBranch(c *gin.Context) {
	branchID := c.Param("id")
	companyID, _ := c.Get("company_id")
	userID, _ := c.Get("user_id")

	// Verify user has access to this branch
	hasAccess, err := h.branchRepo.CheckUserBranchAccess(userID.(int), branchID, companyID.(string))
	if err != nil || !hasAccess {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied to this branch"})
		return
	}

	var req struct {
		Name    string `json:"name"`
		Address string `json:"address"`
		Phone   string `json:"phone"`
		Status  string `json:"status"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get existing branch first
	branch, err := h.branchRepo.GetBranchByID(branchID, companyID.(string))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Branch not found"})
		return
	}

	// Update fields
	if req.Name != "" {
		branch.Name = req.Name
	}
	branch.Address = req.Address
	branch.Phone = req.Phone
	if req.Status != "" {
		branch.Status = req.Status
	}

	err = h.branchRepo.UpdateBranch(branch)
	if err != nil {
		logger.Error("Failed to update branch", logger.ErrorField(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update branch"})
		return
	}

	c.JSON(http.StatusOK, branch)
}

// DeleteBranch deletes a branch
// DELETE /api/branches/:id
func (h *BranchHandler) DeleteBranch(c *gin.Context) {
	branchID := c.Param("id")
	companyID, _ := c.Get("company_id")
	userID, _ := c.Get("user_id")

	// Verify user has access to this branch
	hasAccess, err := h.branchRepo.CheckUserBranchAccess(userID.(int), branchID, companyID.(string))
	if err != nil || !hasAccess {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied to this branch"})
		return
	}

	err = h.branchRepo.DeleteBranch(branchID, companyID.(string))
	if err != nil {
		logger.Error("Failed to delete branch", logger.ErrorField(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete branch"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Branch deleted successfully"})
}

// SwitchBranch switches the user's current active branch
// POST /api/branches/switch
func (h *BranchHandler) SwitchBranch(c *gin.Context) {
	userID, _ := c.Get("user_id")
	companyID, _ := c.Get("company_id")
	userEmail, _ := c.Get("user_email")
	roleID, _ := c.Get("role_id")

	var req struct {
		BranchID string `json:"branchId" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify user has access to this branch
	hasAccess, err := h.branchRepo.CheckUserBranchAccess(userID.(int), req.BranchID, companyID.(string))
	if err != nil || !hasAccess {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied to this branch"})
		return
	}

	// Get user's branches for the token
	branches, err := h.branchRepo.GetUserBranches(userID.(int), companyID.(string))
	if err != nil {
		logger.Error("Failed to get user branches", logger.ErrorField(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get branches"})
		return
	}

	branchIDs := make([]string, len(branches))
	for i, branch := range branches {
		branchIDs[i] = branch.ID
	}

	// Get user permissions
	perms, err := h.roleRepo.GetUserPermissions(userID.(int), companyID.(string))
	if err != nil {
		logger.Error("Failed to get user permissions", logger.ErrorField(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get permissions"})
		return
	}

	// Convert roleID to *string
	var roleIDPtr *string
	if roleIDVal, ok := roleID.(string); ok {
		roleIDPtr = &roleIDVal
	}

	// Generate new tokens with the new branch
	token, err := middleware.GenerateToken(
		userID.(int),
		userEmail.(string),
		roleIDPtr,
		perms,
		&req.BranchID,
		branchIDs,
	)
	if err != nil {
		logger.Error("Failed to generate token", logger.ErrorField(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	refreshToken, err := middleware.GenerateRefreshToken(
		userID.(int),
		userEmail.(string),
		roleIDPtr,
		perms,
		&req.BranchID,
		branchIDs,
	)
	if err != nil {
		logger.Error("Failed to generate refresh token", logger.ErrorField(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate refresh token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token":        token,
		"refreshToken": refreshToken,
		"branchId":     req.BranchID,
	})
}

// GetBranchUsers returns users assigned to a branch
// GET /api/branches/:id/users
func (h *BranchHandler) GetBranchUsers(c *gin.Context) {
	branchID := c.Param("id")
	companyID, _ := c.Get("company_id")

	userIDs, err := h.branchRepo.GetBranchUsers(branchID, companyID.(string))
	if err != nil {
		logger.Error("Failed to get branch users", logger.ErrorField(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get branch users"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"userIds": userIDs})
}

// AssignUserToBranch assigns a user to a branch
// POST /api/branches/:id/users
func (h *BranchHandler) AssignUserToBranch(c *gin.Context) {
	branchID := c.Param("id")
	companyID, _ := c.Get("company_id")
	currentUserID, _ := c.Get("user_id")

	var req struct {
		UserID int     `json:"userId" binding:"required"`
		RoleID *string `json:"roleId"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	assignedBy := currentUserID.(int)
	err := h.branchRepo.AssignUserToBranch(req.UserID, branchID, req.RoleID, companyID.(string), &assignedBy)
	if err != nil {
		logger.Error("Failed to assign user to branch", logger.ErrorField(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to assign user to branch"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "User assigned to branch successfully"})
}

// RemoveUserFromBranch removes a user from a branch
// DELETE /api/branches/:id/users/:userId
func (h *BranchHandler) RemoveUserFromBranch(c *gin.Context) {
	branchID := c.Param("id")
	userID := c.Param("userId")
	companyID, _ := c.Get("company_id")

	// Parse userID to int
	var userIDInt int
	if _, err := fmt.Sscanf(userID, "%d", &userIDInt); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	err := h.branchRepo.RemoveUserFromBranch(userIDInt, branchID, companyID.(string))
	if err != nil {
		logger.Error("Failed to remove user from branch", logger.ErrorField(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove user from branch"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "User removed from branch successfully"})
}

