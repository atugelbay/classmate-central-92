package handlers

import (
	"net/http"

	"classmate-central/internal/models"
	"classmate-central/internal/repository"
	"classmate-central/internal/validation"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type TeacherRateHandler struct {
	repo *repository.TeacherRateRepository
}

func NewTeacherRateHandler(repo *repository.TeacherRateRepository) *TeacherRateHandler {
	return &TeacherRateHandler{repo: repo}
}

// GetByTeacher gets all rates for a teacher
func (h *TeacherRateHandler) GetByTeacher(c *gin.Context) {
	teacherID := c.Param("id")
	companyID := c.GetString("company_id")

	rates, err := h.repo.GetByTeacher(teacherID, companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, rates)
}

// Create creates a new rate for a teacher
func (h *TeacherRateHandler) Create(c *gin.Context) {
	teacherID := c.Param("id")
	companyID := c.GetString("company_id")
	branchID := c.GetString("branch_id")

	var rate models.TeacherRate
	if err := c.ShouldBindJSON(&rate); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": validation.FormatValidationErrors(err)})
		return
	}

	// Validation
	if rate.LessonType != "group" && rate.LessonType != "individual" && rate.LessonType != "special" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "lessonType must be 'group', 'individual', or 'special'"})
		return
	}
	if rate.RateType != "hourly" && rate.RateType != "per_lesson" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "rateType must be 'hourly' or 'per_lesson'"})
		return
	}
	if rate.RateValue <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "rateValue must be greater than 0"})
		return
	}

	rate.ID = uuid.New().String()
	rate.TeacherID = teacherID
	rate.IsActive = true

	// Check if rate with same lesson_type and rate_type already exists and is active
	allRates, err := h.repo.GetByTeacher(teacherID, companyID)
	if err == nil {
		for _, r := range allRates {
			if r.LessonType == rate.LessonType && r.RateType == rate.RateType && r.IsActive {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Active rate with this lesson_type and rate_type already exists for this teacher"})
				return
			}
		}
	}

	if err := h.repo.Create(&rate, companyID, branchID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, rate)
}

// Update updates an existing rate
func (h *TeacherRateHandler) Update(c *gin.Context) {
	rateID := c.Param("rateId")
	teacherID := c.Param("id")
	companyID := c.GetString("company_id")

	var rate models.TeacherRate
	if err := c.ShouldBindJSON(&rate); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": validation.FormatValidationErrors(err)})
		return
	}

	// Validation
	if rate.LessonType != "" && rate.LessonType != "group" && rate.LessonType != "individual" && rate.LessonType != "special" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "lessonType must be 'group', 'individual', or 'special'"})
		return
	}
	if rate.RateType != "" && rate.RateType != "hourly" && rate.RateType != "per_lesson" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "rateType must be 'hourly' or 'per_lesson'"})
		return
	}
	if rate.RateValue > 0 && rate.RateValue <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "rateValue must be greater than 0"})
		return
	}

	// Get existing rate to preserve values that aren't being updated
	existingRate, err := h.repo.GetByID(rateID, companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if existingRate == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Rate not found"})
		return
	}
	if existingRate.TeacherID != teacherID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Rate does not belong to this teacher"})
		return
	}

	// Update fields
	if rate.LessonType != "" {
		existingRate.LessonType = rate.LessonType
	}
	if rate.RateType != "" {
		existingRate.RateType = rate.RateType
	}
	if rate.RateValue > 0 {
		existingRate.RateValue = rate.RateValue
	}
	if rate.IsActive != existingRate.IsActive {
		existingRate.IsActive = rate.IsActive
	}

	existingRate.ID = rateID

	if err := h.repo.Update(existingRate, companyID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, existingRate)
}

// Delete deletes a rate
func (h *TeacherRateHandler) Delete(c *gin.Context) {
	rateID := c.Param("rateId")
	teacherID := c.Param("id")
	companyID := c.GetString("company_id")

	// Verify rate belongs to teacher
	rate, err := h.repo.GetByID(rateID, companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if rate == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Rate not found"})
		return
	}
	if rate.TeacherID != teacherID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Rate does not belong to this teacher"})
		return
	}

	if err := h.repo.Delete(rateID, companyID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Rate deleted successfully"})
}
