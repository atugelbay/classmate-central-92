package handlers

import (
	"net/http"

	"classmate-central/internal/models"
	"classmate-central/internal/repository"
	"classmate-central/internal/validation"

	"github.com/gin-gonic/gin"
)

type TeacherHandler struct {
	repo *repository.TeacherRepository
}

func NewTeacherHandler(repo *repository.TeacherRepository) *TeacherHandler {
	return &TeacherHandler{repo: repo}
}

func (h *TeacherHandler) GetAll(c *gin.Context) {
	companyID := c.GetString("company_id")
	branchID := c.GetString("branch_id")

	// Используем выбранный филиал для изоляции данных
	// Если branchID не установлен, используем company_id как fallback
	if branchID == "" {
		branchID = companyID
	}
	
	var teachers []*models.Teacher
	var err error
	teachers, err = h.repo.GetAll(companyID, branchID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, teachers)
}

func (h *TeacherHandler) GetByID(c *gin.Context) {
	id := c.Param("id")
	companyID := c.GetString("company_id")

	teacher, err := h.repo.GetByID(id, companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if teacher == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Teacher not found"})
		return
	}

	c.JSON(http.StatusOK, teacher)
}

func (h *TeacherHandler) Create(c *gin.Context) {
	var teacher models.Teacher
	if err := c.ShouldBindJSON(&teacher); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": validation.FormatValidationErrors(err)})
		return
	}

	// Validation
	if err := validation.ValidateName(teacher.Name); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := validation.ValidateEmail(teacher.Email); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if teacher.Phone != "" {
		if err := validation.ValidatePhone(teacher.Phone); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
	}
	if err := validation.ValidateNotEmpty(teacher.Subject, "subject"); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	companyID := c.GetString("company_id")
	branchID := c.GetString("branch_id")
	if err := h.repo.Create(&teacher, companyID, branchID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, teacher)
}

func (h *TeacherHandler) Update(c *gin.Context) {
	id := c.Param("id")
	companyID := c.GetString("company_id")

	var teacher models.Teacher
	if err := c.ShouldBindJSON(&teacher); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": validation.FormatValidationErrors(err)})
		return
	}

	// Validation
	if teacher.Name != "" {
		if err := validation.ValidateName(teacher.Name); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
	}
	if teacher.Email != "" {
		if err := validation.ValidateEmail(teacher.Email); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
	}
	if teacher.Phone != "" {
		if err := validation.ValidatePhone(teacher.Phone); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
	}

	teacher.ID = id

	if err := h.repo.Update(&teacher, companyID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, teacher)
}

func (h *TeacherHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	companyID := c.GetString("company_id")

	if err := h.repo.Delete(id, companyID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Teacher deleted successfully"})
}
