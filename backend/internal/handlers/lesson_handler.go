package handlers

import (
	"net/http"

	"classmate-central/internal/models"
	"classmate-central/internal/repository"

	"github.com/gin-gonic/gin"
)

type LessonHandler struct {
	repo *repository.LessonRepository
}

func NewLessonHandler(repo *repository.LessonRepository) *LessonHandler {
	return &LessonHandler{repo: repo}
}

func (h *LessonHandler) GetAll(c *gin.Context) {
	lessons, err := h.repo.GetAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, lessons)
}

func (h *LessonHandler) GetByID(c *gin.Context) {
	id := c.Param("id")

	lesson, err := h.repo.GetByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if lesson == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Lesson not found"})
		return
	}

	c.JSON(http.StatusOK, lesson)
}

func (h *LessonHandler) Create(c *gin.Context) {
	var lesson models.Lesson
	if err := c.ShouldBindJSON(&lesson); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.repo.Create(&lesson); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, lesson)
}

func (h *LessonHandler) Update(c *gin.Context) {
	id := c.Param("id")

	var lesson models.Lesson
	if err := c.ShouldBindJSON(&lesson); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	lesson.ID = id

	if err := h.repo.Update(&lesson); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, lesson)
}

func (h *LessonHandler) Delete(c *gin.Context) {
	id := c.Param("id")

	if err := h.repo.Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Lesson deleted successfully"})
}
