package handlers

import (
	"classmate-central/internal/models"
	"classmate-central/internal/repository"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type DebtHandler struct {
	repo *repository.DebtRepository
}

func NewDebtHandler(repo *repository.DebtRepository) *DebtHandler {
	return &DebtHandler{repo: repo}
}

func (h *DebtHandler) Create(c *gin.Context) {
	var debt models.DebtRecord
	if err := c.ShouldBindJSON(&debt); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.repo.Create(&debt); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, debt)
}

func (h *DebtHandler) GetByStudent(c *gin.Context) {
	studentID := c.Param("studentId")

	debts, err := h.repo.GetByStudent(studentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, debts)
}

func (h *DebtHandler) GetAll(c *gin.Context) {
	// Check if status filter is provided
	status := c.Query("status")

	var debts []models.DebtRecord
	var err error

	if status != "" {
		debts, err = h.repo.GetByStatus(status)
	} else {
		debts, err = h.repo.GetAll()
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, debts)
}

func (h *DebtHandler) Update(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid debt ID"})
		return
	}

	var debt models.DebtRecord
	if err := c.ShouldBindJSON(&debt); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	debt.ID = id
	if err := h.repo.Update(&debt); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, debt)
}

func (h *DebtHandler) Delete(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid debt ID"})
		return
	}

	if err := h.repo.Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Debt deleted successfully"})
}
