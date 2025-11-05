package handlers

import (
	"classmate-central/internal/models"
	"classmate-central/internal/repository"
	"classmate-central/internal/validation"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type DiscountHandler struct {
	repo *repository.DiscountRepository
}

func NewDiscountHandler(repo *repository.DiscountRepository) *DiscountHandler {
	return &DiscountHandler{repo: repo}
}

func (h *DiscountHandler) GetAll(c *gin.Context) {
	companyID := c.GetString("company_id")
	discounts, err := h.repo.GetAll(companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, discounts)
}

func (h *DiscountHandler) GetByID(c *gin.Context) {
	id := c.Param("id")
	companyID := c.GetString("company_id")

	discount, err := h.repo.GetByID(id, companyID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Discount not found"})
		return
	}

	c.JSON(http.StatusOK, discount)
}

func (h *DiscountHandler) Create(c *gin.Context) {
	var discount models.Discount
	if err := c.ShouldBindJSON(&discount); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": validation.FormatValidationErrors(err)})
		return
	}

	// Validation
	if err := validation.ValidateNotEmpty(discount.Name, "name"); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if discount.Type != "percentage" && discount.Type != "fixed" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "type must be 'percentage' or 'fixed'"})
		return
	}
	if discount.Value <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "value must be greater than 0"})
		return
	}
	if discount.Type == "percentage" && discount.Value > 100 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "percentage value cannot exceed 100"})
		return
	}

	companyID := c.GetString("company_id")
	discount.ID = uuid.New().String()
	if err := h.repo.Create(&discount, companyID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, discount)
}

func (h *DiscountHandler) Update(c *gin.Context) {
	id := c.Param("id")
	companyID := c.GetString("company_id")

	var discount models.Discount
	if err := c.ShouldBindJSON(&discount); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	discount.ID = id
	if discount.Type != "" && discount.Type != "percentage" && discount.Type != "fixed" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "type must be 'percentage' or 'fixed'"})
		return
	}
	if discount.Value > 0 && discount.Type == "percentage" && discount.Value > 100 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "percentage value cannot exceed 100"})
		return
	}

	if err := h.repo.Update(&discount, companyID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, discount)
}

func (h *DiscountHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	companyID := c.GetString("company_id")

	if err := h.repo.Delete(id, companyID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Discount deleted successfully"})
}

// ApplyToStudent applies a discount to a student
func (h *DiscountHandler) ApplyToStudent(c *gin.Context) {
	studentID := c.Param("id")
	companyID := c.GetString("company_id")

	var req struct {
		DiscountID string     `json:"discountId" binding:"required"`
		ExpiresAt  *time.Time `json:"expiresAt,omitempty"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	studentDiscount := &models.StudentDiscount{
		StudentID:  studentID,
		DiscountID: req.DiscountID,
		AppliedAt:  time.Now(),
		ExpiresAt:  req.ExpiresAt,
		IsActive:   true,
	}

	if err := h.repo.ApplyToStudent(studentDiscount, companyID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, studentDiscount)
}

// GetStudentDiscounts gets all active discounts for a student
func (h *DiscountHandler) GetStudentDiscounts(c *gin.Context) {
	studentID := c.Param("id")
	companyID := c.GetString("company_id")

	discounts, err := h.repo.GetStudentDiscounts(studentID, companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, discounts)
}

// RemoveStudentDiscount removes a discount from a student
func (h *DiscountHandler) RemoveStudentDiscount(c *gin.Context) {
	studentID := c.Param("id")
	discountID := c.Param("discountId")
	companyID := c.GetString("company_id")

	if err := h.repo.RemoveStudentDiscount(studentID, discountID, companyID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Discount removed successfully"})
}
