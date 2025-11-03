package handlers

import (
	"net/http"
	"strconv"

	"classmate-central/internal/models"
	"classmate-central/internal/repository"
	"classmate-central/internal/services"
	"classmate-central/internal/validation"

	"github.com/gin-gonic/gin"
)

type StudentHandler struct {
	repo             *repository.StudentRepository
	activityRepo     *repository.ActivityRepository
	notificationRepo *repository.NotificationRepository
	activityService  *services.ActivityService
}

func NewStudentHandler(
	repo *repository.StudentRepository,
	activityRepo *repository.ActivityRepository,
	notificationRepo *repository.NotificationRepository,
	activityService *services.ActivityService,
) *StudentHandler {
	return &StudentHandler{
		repo:             repo,
		activityRepo:     activityRepo,
		notificationRepo: notificationRepo,
		activityService:  activityService,
	}
}

func (h *StudentHandler) GetAll(c *gin.Context) {
	companyID := c.GetString("company_id")
    // Optional server-side search and pagination
    query := c.Query("query")
    page := 1
    pageSize := 50
    if v := c.Query("page"); v != "" {
        if n, err := strconv.Atoi(v); err == nil && n > 0 {
            page = n
        }
    }
    if v := c.Query("pageSize"); v != "" {
        if n, err := strconv.Atoi(v); err == nil && n > 0 && n <= 200 {
            pageSize = n
        }
    }

    // Always compute global counts (not filtered by search)
    activeCnt, inactiveCnt, totalCnt, cntErr := h.repo.GetCounts(companyID)
    if cntErr != nil {
        // Not fatal for listing; log-like response inline
        activeCnt, inactiveCnt, totalCnt = 0, 0, 0
    }

    if query != "" || c.Query("page") != "" || c.Query("pageSize") != "" {
        items, total, err := h.repo.GetPaged(companyID, query, page, pageSize)
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
            return
        }
        c.JSON(http.StatusOK, gin.H{
            "items":    items,
            "total":    total,
            "page":     page,
            "pageSize": pageSize,
            "counts": gin.H{
                "active":    activeCnt,
                "inactive":  inactiveCnt,
                "all":       totalCnt,
            },
        })
        return
    }

    students, err := h.repo.GetAll(companyID)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    c.JSON(http.StatusOK, gin.H{
        "items": students,
        "total": len(students),
        "page":  1,
        "pageSize": len(students),
        "counts": gin.H{
            "active":   activeCnt,
            "inactive": inactiveCnt,
            "all":      totalCnt,
        },
    })
}

func (h *StudentHandler) GetByID(c *gin.Context) {
	id := c.Param("id")
	companyID := c.GetString("company_id")

	student, err := h.repo.GetByID(id, companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if student == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Student not found"})
		return
	}

	c.JSON(http.StatusOK, student)
}

func (h *StudentHandler) Create(c *gin.Context) {
	var student models.Student
	if err := c.ShouldBindJSON(&student); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": validation.FormatValidationErrors(err)})
		return
	}

	// Validation
	if err := validation.ValidateName(student.Name); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := validation.ValidateAge(student.Age); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if student.Email != "" {
		if err := validation.ValidateEmail(student.Email); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
	}
	if student.Phone != "" {
		if err := validation.ValidatePhone(student.Phone); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
	}

	companyID := c.GetString("company_id")
	if err := h.repo.Create(&student, companyID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, student)
}

func (h *StudentHandler) Update(c *gin.Context) {
	id := c.Param("id")
	companyID := c.GetString("company_id")

	var student models.Student
	if err := c.ShouldBindJSON(&student); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": validation.FormatValidationErrors(err)})
		return
	}

	// Validation
	if student.Name != "" {
		if err := validation.ValidateName(student.Name); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
	}
	if student.Age > 0 {
		if err := validation.ValidateAge(student.Age); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
	}
	if student.Email != "" {
		if err := validation.ValidateEmail(student.Email); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
	}
	if student.Phone != "" {
		if err := validation.ValidatePhone(student.Phone); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
	}

	student.ID = id

	if err := h.repo.Update(&student, companyID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, student)
}

func (h *StudentHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	companyID := c.GetString("company_id")

	if err := h.repo.Delete(id, companyID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Student deleted successfully"})
}

// GetActivities retrieves activity history for a student
func (h *StudentHandler) GetActivities(c *gin.Context) {
	id := c.Param("id")

	limit := 50
	offset := 0

	if limitParam := c.Query("limit"); limitParam != "" {
		if val, err := strconv.Atoi(limitParam); err == nil && val > 0 {
			limit = val
		}
	}

	if offsetParam := c.Query("offset"); offsetParam != "" {
		if val, err := strconv.Atoi(offsetParam); err == nil && val >= 0 {
			offset = val
		}
	}

	activities, err := h.activityRepo.GetStudentActivities(id, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, activities)
}

// AddNote adds a note for a student
func (h *StudentHandler) AddNote(c *gin.Context) {
	id := c.Param("id")

	var request struct {
		Note string `json:"note" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get user ID from context (set by auth middleware)
	var createdBy *int
	if userID, exists := c.Get("userID"); exists {
		if uid, ok := userID.(int); ok {
			createdBy = &uid
		}
	}

	note := &models.StudentNote{
		StudentID: id,
		Note:      request.Note,
		CreatedBy: createdBy,
	}

	if err := h.repo.AddNote(note); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Log activity
	_ = h.activityService.LogNote(note)

	c.JSON(http.StatusCreated, note)
}

// GetNotes retrieves all notes for a student
func (h *StudentHandler) GetNotes(c *gin.Context) {
	id := c.Param("id")

	notes, err := h.repo.GetNotes(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, notes)
}

// UpdateStatus updates a student's status
func (h *StudentHandler) UpdateStatus(c *gin.Context) {
	id := c.Param("id")

	var request struct {
		Status string `json:"status" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate status
	validStatuses := map[string]bool{
		"active":    true,
		"inactive":  true,
		"frozen":    true,
		"graduated": true,
	}

	if !validStatuses[request.Status] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid status"})
		return
	}

	// Get current student to check old status
	companyID := c.GetString("company_id")
	student, err := h.repo.GetByID(id, companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if student == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Student not found"})
		return
	}

	oldStatus := student.Status

	// Update status
	if err := h.repo.UpdateStatus(id, request.Status, companyID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Get user ID from context
	var createdBy *int
	if userID, exists := c.Get("userID"); exists {
		if uid, ok := userID.(int); ok {
			createdBy = &uid
		}
	}

	// Log status change
	_ = h.activityService.LogStatusChange(id, oldStatus, request.Status, createdBy)

	c.JSON(http.StatusOK, gin.H{"message": "Status updated successfully", "status": request.Status})
}

// GetAttendanceJournal retrieves detailed attendance journal for a student
func (h *StudentHandler) GetAttendanceJournal(c *gin.Context) {
	id := c.Param("id")

	journal, err := h.repo.GetAttendanceJournal(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, journal)
}

// GetNotifications retrieves notifications for a student
func (h *StudentHandler) GetNotifications(c *gin.Context) {
	id := c.Param("id")

	notifications, err := h.notificationRepo.GetStudentNotifications(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, notifications)
}

// MarkNotificationRead marks a notification as read
func (h *StudentHandler) MarkNotificationRead(c *gin.Context) {
	notificationIDStr := c.Param("notificationId")
	notificationID, err := strconv.Atoi(notificationIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid notification ID"})
		return
	}

	if err := h.notificationRepo.MarkAsRead(notificationID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Notification marked as read"})
}
