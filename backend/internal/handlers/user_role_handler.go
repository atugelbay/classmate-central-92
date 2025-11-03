package handlers

import (
	"fmt"
	"net/http"

	"classmate-central/internal/models"
	"classmate-central/internal/repository"

	"github.com/gin-gonic/gin"
)

type UserRoleHandler struct {
	userRepo *repository.UserRepository
	roleRepo *repository.RoleRepository
}

func NewUserRoleHandler(userRepo *repository.UserRepository, roleRepo *repository.RoleRepository) *UserRoleHandler {
	return &UserRoleHandler{
		userRepo: userRepo,
		roleRepo: roleRepo,
	}
}

// GetUserRoles gets all roles for a user
func (h *UserRoleHandler) GetUserRoles(c *gin.Context) {
	userIDParam := c.Param("userId")
	companyID, exists := c.Get("company_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Company context required"})
		return
	}

	// Convert userID to int
	var userID int
	if _, err := fmt.Sscanf(userIDParam, "%d", &userID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	roles, err := h.roleRepo.GetUserRoles(userID, companyID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error getting user roles"})
		return
	}

	c.JSON(http.StatusOK, roles)
}

// AssignRole assigns a role to a user
func (h *UserRoleHandler) AssignRole(c *gin.Context) {
	companyID, exists := c.Get("company_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Company context required"})
		return
	}

	assignedBy, _ := c.Get("user_id")

	var req models.AssignRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var assignedByPtr *int
	if assignedBy != nil {
		id := assignedBy.(int)
		assignedByPtr = &id
	}

	if err := h.userRepo.AssignRoleToUser(req.UserID, req.RoleID, companyID.(string), assignedByPtr); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error assigning role: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Role assigned successfully"})
}

// RemoveRole removes a role from a user
func (h *UserRoleHandler) RemoveRole(c *gin.Context) {
	companyID, exists := c.Get("company_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Company context required"})
		return
	}

	var req models.AssignRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.userRepo.RemoveRoleFromUser(req.UserID, req.RoleID, companyID.(string)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error removing role: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Role removed successfully"})
}

