package handlers

import (
	"log"
	"net/http"

	"classmate-central/internal/models"
	"classmate-central/internal/repository"

	"github.com/gin-gonic/gin"
)

type GroupHandler struct {
	repo       *repository.GroupRepository
	lessonRepo *repository.LessonRepository
}

func NewGroupHandler(repo *repository.GroupRepository, lessonRepo *repository.LessonRepository) *GroupHandler {
	return &GroupHandler{
		repo:       repo,
		lessonRepo: lessonRepo,
	}
}

func (h *GroupHandler) GetAll(c *gin.Context) {
	companyID := c.GetString("company_id")
	groups, err := h.repo.GetAll(companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, groups)
}

func (h *GroupHandler) GetByID(c *gin.Context) {
	id := c.Param("id")
	companyID := c.GetString("company_id")

	group, err := h.repo.GetByID(id, companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if group == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Group not found"})
		return
	}

	c.JSON(http.StatusOK, group)
}

func (h *GroupHandler) Create(c *gin.Context) {
	var group models.Group
	if err := c.ShouldBindJSON(&group); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	companyID := c.GetString("company_id")
	if err := h.repo.Create(&group, companyID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, group)
}

func (h *GroupHandler) Update(c *gin.Context) {
	id := c.Param("id")
	companyID := c.GetString("company_id")

	var group models.Group
	if err := c.ShouldBindJSON(&group); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	group.ID = id

	if err := h.repo.Update(&group, companyID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, group)
}

func (h *GroupHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	companyID := c.GetString("company_id")

	// Delete all lessons associated with this group first
	if err := h.lessonRepo.DeleteByGroupID(id, companyID); err != nil {
		log.Printf("Warning: Failed to delete lessons for group %s: %v", id, err)
		// Continue with group deletion even if lesson deletion fails
	}

	if err := h.repo.Delete(id, companyID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Group and associated lessons deleted successfully"})
}

// GenerateLessons creates lessons for a group based on a simple schedule pattern
func (h *GroupHandler) GenerateLessons(c *gin.Context) {
	groupID := c.Param("id")
	companyID := c.GetString("company_id")

	log.Printf("🚀 Starting lesson generation for group %s (company: %s)", groupID, companyID)

	// Get the group
	group, err := h.repo.GetByID(groupID, companyID)
	if err != nil {
		log.Printf("❌ Error getting group: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if group == nil {
		log.Printf("❌ Group not found: %s", groupID)
		c.JSON(http.StatusNotFound, gin.H{"error": "Group not found"})
		return
	}

	log.Printf("📋 Group found: %s, Schedule: %s, Students: %d", group.Name, group.Schedule, len(group.StudentIds))

	// Parse the schedule to generate lessons
	lessonsCreated, err := h.repo.GenerateLessonsForGroup(group, companyID)
	if err != nil {
		log.Printf("❌ Error generating lessons: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	log.Printf("✅ Successfully created %d lessons", lessonsCreated)
	c.JSON(http.StatusOK, gin.H{
		"message": "Lessons generated successfully",
		"count":   lessonsCreated,
	})
}
