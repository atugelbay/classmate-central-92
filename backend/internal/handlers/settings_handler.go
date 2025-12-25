package handlers

import (
	"net/http"

	"classmate-central/internal/models"
	"classmate-central/internal/repository"

	"github.com/gin-gonic/gin"
)

type SettingsHandler struct {
	repo *repository.SettingsRepository
}

func NewSettingsHandler(repo *repository.SettingsRepository) *SettingsHandler {
	return &SettingsHandler{repo: repo}
}

func (h *SettingsHandler) Get(c *gin.Context) {
	companyID := c.GetString("company_id")
	if companyID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Company context required"})
		return
	}

	branchID := c.GetString("branch_id")
	if branchID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "branch_id not found"})
		return
	}

	settings, err := h.repo.Get(companyID, branchID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	// Get() now always returns settings (creates default if doesn't exist)
	if settings == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve settings"})
		return
	}

	c.JSON(http.StatusOK, settings)
}

func (h *SettingsHandler) Update(c *gin.Context) {
	companyID := c.GetString("company_id")
	if companyID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Company context required"})
		return
	}

	branchID := c.GetString("branch_id")
	if branchID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "branch_id not found"})
		return
	}

	var settings models.Settings
	if err := c.ShouldBindJSON(&settings); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// ID will be set by the repository during update
	settings.BranchID = branchID

	if err := h.repo.Update(&settings, companyID, branchID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Get the updated settings from database to return actual saved values
	updatedSettings, err := h.repo.Get(companyID, branchID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if updatedSettings == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve updated settings"})
		return
	}

	c.JSON(http.StatusOK, updatedSettings)
}
