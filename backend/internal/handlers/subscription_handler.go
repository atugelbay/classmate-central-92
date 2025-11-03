package handlers

import (
	"classmate-central/internal/models"
	"classmate-central/internal/repository"
	"classmate-central/internal/services"
	"classmate-central/internal/validation"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type SubscriptionHandler struct {
	repo              *repository.SubscriptionRepository
	attendanceService *services.AttendanceService
	activityService   *services.ActivityService
}

func NewSubscriptionHandler(
	repo *repository.SubscriptionRepository,
	attendanceService *services.AttendanceService,
	activityService *services.ActivityService,
) *SubscriptionHandler {
	return &SubscriptionHandler{
		repo:              repo,
		attendanceService: attendanceService,
		activityService:   activityService,
	}
}

// ============= Subscription Types =============

func (h *SubscriptionHandler) CreateType(c *gin.Context) {
	var subType models.SubscriptionType
	if err := c.ShouldBindJSON(&subType); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": validation.FormatValidationErrors(err)})
		return
	}

	// Validation
	if err := validation.ValidateNotEmpty(subType.Name, "name"); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := validation.ValidatePositiveInt(subType.LessonsCount, "lessonsCount"); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := validation.ValidatePositiveAmount(subType.Price); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	companyID := c.GetString("company_id")
	subType.ID = uuid.New().String()
	if err := h.repo.CreateType(&subType, companyID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, subType)
}

func (h *SubscriptionHandler) GetAllTypes(c *gin.Context) {
	companyID := c.GetString("company_id")
	types, err := h.repo.GetAllTypes(companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, types)
}

func (h *SubscriptionHandler) GetTypeByID(c *gin.Context) {
	id := c.Param("id")
	companyID := c.GetString("company_id")

	subType, err := h.repo.GetTypeByID(id, companyID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Subscription type not found"})
		return
	}

	c.JSON(http.StatusOK, subType)
}

func (h *SubscriptionHandler) UpdateType(c *gin.Context) {
	id := c.Param("id")
	companyID := c.GetString("company_id")

	var subType models.SubscriptionType
	if err := c.ShouldBindJSON(&subType); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	subType.ID = id
	if err := h.repo.UpdateType(&subType, companyID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, subType)
}

func (h *SubscriptionHandler) DeleteType(c *gin.Context) {
	id := c.Param("id")
	companyID := c.GetString("company_id")

	if err := h.repo.DeleteType(id, companyID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Subscription type deleted successfully"})
}

// ============= Student Subscriptions =============

func (h *SubscriptionHandler) CreateStudentSubscription(c *gin.Context) {
	var sub models.StudentSubscription
	if err := c.ShouldBindJSON(&sub); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": validation.FormatValidationErrors(err)})
		return
	}

	// Validation
	if err := validation.ValidateNotEmpty(sub.StudentID, "studentId"); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := validation.ValidatePositiveInt(sub.TotalLessons, "totalLessons"); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := validation.ValidatePositiveAmount(sub.TotalPrice); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	companyID := c.GetString("company_id")
	sub.ID = uuid.New().String()
	if err := h.repo.CreateStudentSubscription(&sub, companyID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, sub)
}

func (h *SubscriptionHandler) GetStudentSubscriptions(c *gin.Context) {
	studentID := c.Param("studentId")
	companyID := c.GetString("company_id")

	subs, err := h.repo.GetStudentSubscriptions(studentID, companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, subs)
}

func (h *SubscriptionHandler) GetSubscriptionByID(c *gin.Context) {
	id := c.Param("id")
	companyID := c.GetString("company_id")

	sub, err := h.repo.GetSubscriptionByID(id, companyID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Subscription not found"})
		return
	}

	c.JSON(http.StatusOK, sub)
}

func (h *SubscriptionHandler) UpdateSubscription(c *gin.Context) {
	id := c.Param("id")
	companyID := c.GetString("company_id")

	var sub models.StudentSubscription
	if err := c.ShouldBindJSON(&sub); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	sub.ID = id
	if err := h.repo.UpdateSubscription(&sub, companyID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, sub)
}

func (h *SubscriptionHandler) DeleteSubscription(c *gin.Context) {
	id := c.Param("id")
	companyID := c.GetString("company_id")

	if err := h.repo.DeleteSubscription(id, companyID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Subscription deleted successfully"})
}

func (h *SubscriptionHandler) GetAllSubscriptions(c *gin.Context) {
	companyID := c.GetString("company_id")
	subs, err := h.repo.GetAllSubscriptions(companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, subs)
}

// ============= Subscription Freezes =============

func (h *SubscriptionHandler) CreateFreeze(c *gin.Context) {
	subscriptionID := c.Param("id")

	var freeze models.SubscriptionFreeze
	if err := c.ShouldBindJSON(&freeze); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	freeze.SubscriptionID = subscriptionID
	if err := h.repo.CreateFreeze(&freeze); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, freeze)
}

func (h *SubscriptionHandler) GetFreezes(c *gin.Context) {
	subscriptionID := c.Param("id")

	freezes, err := h.repo.GetFreezesBySubscription(subscriptionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, freezes)
}

func (h *SubscriptionHandler) UpdateFreeze(c *gin.Context) {
	var freeze models.SubscriptionFreeze
	if err := c.ShouldBindJSON(&freeze); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.repo.UpdateFreeze(&freeze); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, freeze)
}

// ============= Lesson Attendance =============

func (h *SubscriptionHandler) MarkAttendance(c *gin.Context) {
	var req models.MarkAttendanceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get company ID from context
	companyID := c.GetString("company_id")

	// Get user ID from context (set by auth middleware)
	var markedBy *int
	if userID, exists := c.Get("userID"); exists {
		if uid, ok := userID.(int); ok {
			markedBy = &uid
		}
	}

	// Use attendance service to mark attendance with automatic deduction
	attendance, err := h.attendanceService.MarkAttendanceWithDeduction(&req, markedBy, companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, attendance)
}

func (h *SubscriptionHandler) GetAttendanceByLesson(c *gin.Context) {
	lessonID := c.Param("lessonId")

	attendances, err := h.repo.GetAttendanceByLesson(lessonID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, attendances)
}

func (h *SubscriptionHandler) GetAttendanceByStudent(c *gin.Context) {
	studentID := c.Param("studentId")

	attendances, err := h.repo.GetAttendanceByStudent(studentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, attendances)
}
