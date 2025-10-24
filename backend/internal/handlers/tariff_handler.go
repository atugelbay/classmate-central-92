package handlers

import (
	"classmate-central/internal/models"
	"classmate-central/internal/repository"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type TariffHandler struct {
	repo *repository.TariffRepository
}

func NewTariffHandler(repo *repository.TariffRepository) *TariffHandler {
	return &TariffHandler{repo: repo}
}

func (h *TariffHandler) Create(c *gin.Context) {
	var tariff models.Tariff
	if err := c.ShouldBindJSON(&tariff); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tariff.ID = uuid.New().String()
	if err := h.repo.Create(&tariff); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, tariff)
}

func (h *TariffHandler) GetAll(c *gin.Context) {
	tariffs, err := h.repo.GetAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, tariffs)
}

func (h *TariffHandler) GetByID(c *gin.Context) {
	id := c.Param("id")

	tariff, err := h.repo.GetByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Tariff not found"})
		return
	}

	c.JSON(http.StatusOK, tariff)
}

func (h *TariffHandler) Update(c *gin.Context) {
	id := c.Param("id")

	var tariff models.Tariff
	if err := c.ShouldBindJSON(&tariff); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tariff.ID = id
	if err := h.repo.Update(&tariff); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, tariff)
}

func (h *TariffHandler) Delete(c *gin.Context) {
	id := c.Param("id")

	if err := h.repo.Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Tariff deleted successfully"})
}
