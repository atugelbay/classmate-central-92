package handlers

import (
	"net/http"

	"classmate-central/internal/models"
	"classmate-central/internal/repository"

	"github.com/gin-gonic/gin"
)

type TeacherHandler struct {
	repo *repository.TeacherRepository
}

func NewTeacherHandler(repo *repository.TeacherRepository) *TeacherHandler {
	return &TeacherHandler{repo: repo}
}

func (h *TeacherHandler) GetAll(c *gin.Context) {
	teachers, err := h.repo.GetAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, teachers)
}

func (h *TeacherHandler) GetByID(c *gin.Context) {
	id := c.Param("id")

	teacher, err := h.repo.GetByID(id)
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
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.repo.Create(&teacher); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, teacher)
}

func (h *TeacherHandler) Update(c *gin.Context) {
	id := c.Param("id")

	var teacher models.Teacher
	if err := c.ShouldBindJSON(&teacher); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	teacher.ID = id

	if err := h.repo.Update(&teacher); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, teacher)
}

func (h *TeacherHandler) Delete(c *gin.Context) {
	id := c.Param("id")

	if err := h.repo.Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Teacher deleted successfully"})
}
