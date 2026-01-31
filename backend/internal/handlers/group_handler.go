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
	branchID := c.GetString("branch_id")

	// Используем выбранный филиал для изоляции данных
	// Если branchID не установлен, используем company_id как fallback
	if branchID == "" {
		branchID = companyID
	}
	
	var groups []*models.Group
	var err error
	groups, err = h.repo.GetAll(companyID, branchID)
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

	// Validate required fields
	if group.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name is required"})
		return
	}
	if group.Subject == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "subject is required"})
		return
	}
	if group.TeacherID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "teacherId is required"})
		return
	}

	companyID := c.GetString("company_id")
	branchID := c.GetString("branch_id")
	if err := h.repo.Create(&group, companyID, branchID); err != nil {
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
	
	log.Printf("📝 Updating group %s: studentIds=%v, schedule=%s, teacherId=%s, roomId=%s", 
		id, group.StudentIds, group.Schedule, group.TeacherID, group.RoomID)

	// Get old group to check if schedule changed
	oldGroup, err := h.repo.GetByID(id, companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get old group: " + err.Error()})
		return
	}
	if oldGroup == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Group not found"})
		return
	}

	// Update the group
	if err := h.repo.Update(&group, companyID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// If schedule changed, regenerate lessons
	// Compare schedules (case-insensitive comparison)
	scheduleChanged := false
	if oldGroup.Schedule != group.Schedule {
		scheduleChanged = true
		log.Printf("📅 Schedule changed for group %s: '%s' -> '%s'", id, oldGroup.Schedule, group.Schedule)
	}

	// Also check if room_id or teacher_id changed, as these affect lessons
	if scheduleChanged || oldGroup.RoomID != group.RoomID || oldGroup.TeacherID != group.TeacherID {
		log.Printf("🔄 Regenerating lessons for group %s due to schedule/room/teacher change", id)
		
		// Delete future lessons for this group
		if err := h.lessonRepo.DeleteFutureLessonsByGroupID(id, companyID); err != nil {
			log.Printf("⚠️  Warning: Failed to delete future lessons for group %s: %v", id, err)
			// Continue anyway - we'll try to generate new lessons
		}

		// Generate new lessons if schedule is defined
		if group.Schedule != "" {
			// Get updated group with all fields (including students from enrollment)
			updatedGroup, err := h.repo.GetByID(id, companyID)
			if err == nil && updatedGroup != nil {
				// Always use student IDs from the update request if provided and not empty
				// Otherwise use from DB (which should have been updated in the transaction)
				if len(group.StudentIds) > 0 {
					updatedGroup.StudentIds = group.StudentIds
					log.Printf("📋 Using student IDs from update request: %d students", len(updatedGroup.StudentIds))
				} else {
					log.Printf("📋 Using student IDs from database: %d students", len(updatedGroup.StudentIds))
					// If DB has no students but old group had students, use old group's students as fallback
					if len(updatedGroup.StudentIds) == 0 && len(oldGroup.StudentIds) > 0 {
						updatedGroup.StudentIds = oldGroup.StudentIds
						log.Printf("📋 Fallback: Using student IDs from old group: %d students", len(updatedGroup.StudentIds))
					}
				}
				
				if len(updatedGroup.StudentIds) == 0 {
					log.Printf("⚠️  Warning: Group %s has no students, lessons will be created without students", id)
				}
				
				lessonsCreated, genErr := h.repo.GenerateLessonsForGroup(updatedGroup, companyID)
				if genErr != nil {
					log.Printf("⚠️  Warning: Failed to generate lessons for group %s: %v", id, genErr)
					// Don't fail the update - group was updated successfully
				} else {
					log.Printf("✅ Generated %d new lessons for group %s", lessonsCreated, id)
				}
			} else if err != nil {
				log.Printf("⚠️  Warning: Failed to get updated group %s: %v", id, err)
			}
		}
	}

	// Return updated group with all fields (including students)
	updatedGroup, err := h.repo.GetByID(id, companyID)
	if err != nil {
		log.Printf("⚠️  Warning: Failed to get updated group for response: %v", err)
		c.JSON(http.StatusOK, group) // Return the group from request as fallback
		return
	}
	if updatedGroup != nil {
		c.JSON(http.StatusOK, updatedGroup)
	} else {
		c.JSON(http.StatusOK, group)
	}
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

// ExtendGroup generates additional lessons for a group
func (h *GroupHandler) ExtendGroup(c *gin.Context) {
	groupID := c.Param("id")
	companyID := c.GetString("company_id")

	log.Printf("🚀 Extending group %s (company: %s)", groupID, companyID)

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

	// Generate additional lessons (12 more)
	lessonsCreated, err := h.repo.GenerateLessonsForGroup(group, companyID)
	if err != nil {
		log.Printf("❌ Error generating lessons: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	log.Printf("✅ Successfully extended group with %d additional lessons", lessonsCreated)
	c.JSON(http.StatusOK, gin.H{
		"message": "Group extended successfully",
		"count":   lessonsCreated,
	})
}
