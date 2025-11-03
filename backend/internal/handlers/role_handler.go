package handlers

import (
	"net/http"
	"strings"

	"classmate-central/internal/models"
	"classmate-central/internal/repository"

	"github.com/gin-gonic/gin"
)

type RoleHandler struct {
	roleRepo *repository.RoleRepository
	permRepo *repository.PermissionRepository
}

func NewRoleHandler(roleRepo *repository.RoleRepository, permRepo *repository.PermissionRepository) *RoleHandler {
	return &RoleHandler{
		roleRepo: roleRepo,
		permRepo: permRepo,
	}
}

// GetAll gets all roles for the company
func (h *RoleHandler) GetAll(c *gin.Context) {
	companyID, exists := c.Get("company_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Company context required"})
		return
	}

	roles, err := h.roleRepo.GetAll(companyID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error getting roles"})
		return
	}

	c.JSON(http.StatusOK, roles)
}

// GetByID gets a role by ID with its permissions
func (h *RoleHandler) GetByID(c *gin.Context) {
	roleID := c.Param("id")
	companyID, exists := c.Get("company_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Company context required"})
		return
	}

	role, err := h.roleRepo.GetByID(roleID, companyID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error getting role"})
		return
	}
	if role == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Role not found"})
		return
	}

	c.JSON(http.StatusOK, role)
}

// Create creates a new role
func (h *RoleHandler) Create(c *gin.Context) {
	companyID, exists := c.Get("company_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Company context required"})
		return
	}

	var req models.CreateRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Create role
	role := &models.Role{
		Name:        req.Name,
		Description: req.Description,
		CompanyID:   companyID.(string),
	}

	if err := h.roleRepo.Create(role); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error creating role: " + err.Error()})
		return
	}

	// Assign permissions if provided
	if len(req.PermissionIDs) > 0 {
		if err := h.roleRepo.SetRolePermissions(role.ID, req.PermissionIDs); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error assigning permissions: " + err.Error()})
			return
		}
	}

	// Reload role with permissions
	role, err := h.roleRepo.GetByID(role.ID, companyID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error reloading role"})
		return
	}

	c.JSON(http.StatusCreated, role)
}

// Update updates an existing role
func (h *RoleHandler) Update(c *gin.Context) {
	roleID := c.Param("id")
	companyID, exists := c.Get("company_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Company context required"})
		return
	}

	var req models.UpdateRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get existing role
	role, err := h.roleRepo.GetByID(roleID, companyID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error getting role"})
		return
	}
	if role == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Role not found"})
		return
	}

	// Update role fields
	if req.Name != "" {
		role.Name = req.Name
	}
	if req.Description != "" {
		role.Description = req.Description
	}

	if err := h.roleRepo.Update(role); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error updating role: " + err.Error()})
		return
	}

	// Update permissions if provided
	if req.PermissionIDs != nil {
		if err := h.roleRepo.SetRolePermissions(roleID, req.PermissionIDs); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error updating permissions: " + err.Error()})
			return
		}
	}

	// Reload role with permissions
	role, err = h.roleRepo.GetByID(roleID, companyID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error reloading role"})
		return
	}

	c.JSON(http.StatusOK, role)
}

// Delete deletes a role
func (h *RoleHandler) Delete(c *gin.Context) {
	roleID := c.Param("id")
	companyID, exists := c.Get("company_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Company context required"})
		return
	}

	// Don't allow deletion of system default roles
	if strings.HasSuffix(roleID, "_admin") || strings.HasSuffix(roleID, "_manager") ||
		strings.HasSuffix(roleID, "_teacher") || strings.HasSuffix(roleID, "_accountant") ||
		strings.HasSuffix(roleID, "_view_only") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot delete system default roles"})
		return
	}

	if err := h.roleRepo.Delete(roleID, companyID.(string)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error deleting role: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Role deleted successfully"})
}

// GetRolePermissions gets all permissions for a role
func (h *RoleHandler) GetRolePermissions(c *gin.Context) {
	roleID := c.Param("id")

	permissions, err := h.roleRepo.GetRolePermissions(roleID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error getting role permissions"})
		return
	}

	c.JSON(http.StatusOK, permissions)
}

// GetAllPermissions gets all available permissions
func (h *RoleHandler) GetAllPermissions(c *gin.Context) {
	permissions, err := h.permRepo.GetAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error getting permissions"})
		return
	}

	c.JSON(http.StatusOK, permissions)
}

