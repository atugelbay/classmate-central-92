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
	settings, err := h.repo.Get()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if settings == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Settings not found"})
		return
	}

	c.JSON(http.StatusOK, settings)
}

func (h *SettingsHandler) Update(c *gin.Context) {
	var settings models.Settings
	if err := c.ShouldBindJSON(&settings); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	settings.ID = 1 // Always update the first (and only) settings record

	if err := h.repo.Update(&settings); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, settings)
}
