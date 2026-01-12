package handlers

import (
	"net/http"
	"time"

	"classmate-central/internal/models"
	"classmate-central/internal/repository"
	"classmate-central/internal/validation"

	"github.com/gin-gonic/gin"
)

type TeacherHandler struct {
	repo        *repository.TeacherRepository
	rateRepo    *repository.TeacherRateRepository
	lessonRepo  *repository.LessonRepository
}

func NewTeacherHandler(repo *repository.TeacherRepository) *TeacherHandler {
	return &TeacherHandler{repo: repo}
}

func NewTeacherHandlerWithRates(repo *repository.TeacherRepository, rateRepo *repository.TeacherRateRepository, lessonRepo *repository.LessonRepository) *TeacherHandler {
	return &TeacherHandler{
		repo:       repo,
		rateRepo:   rateRepo,
		lessonRepo: lessonRepo,
	}
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
	// Email is optional - validate only if provided
	if teacher.Email != "" {
		if err := validation.ValidateEmail(teacher.Email); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
	}
	// Phone is optional - validate only if provided
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
	// Rate type and rate are now optional - teachers can add rates later via teacher_rates table

	companyID := c.GetString("company_id")
	branchID := c.GetString("branch_id")
	if err := h.repo.Create(&teacher, companyID, branchID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Get created teacher from database to return complete data
	createdTeacher, err := h.repo.GetByID(teacher.ID, companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get created teacher"})
		return
	}

	c.JSON(http.StatusCreated, createdTeacher)
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

	// Get updated teacher from database to return complete data
	updatedTeacher, err := h.repo.GetByID(id, companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get updated teacher"})
		return
	}

	c.JSON(http.StatusOK, updatedTeacher)
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

// CalculateSalary calculates teacher's salary for a given period
func (h *TeacherHandler) CalculateSalary(c *gin.Context) {
	teacherID := c.Param("id")
	companyID := c.GetString("company_id")

	var req struct {
		StartDate string `json:"startDate" binding:"required"`
		EndDate   string `json:"endDate" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": validation.FormatValidationErrors(err)})
		return
	}

	// Parse dates
	startDate, err := time.Parse("2006-01-02", req.StartDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid startDate format. Use YYYY-MM-DD"})
		return
	}

	endDate, err := time.Parse("2006-01-02", req.EndDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid endDate format. Use YYYY-MM-DD"})
		return
	}

	// Set end date to end of day
	endDate = time.Date(endDate.Year(), endDate.Month(), endDate.Day(), 23, 59, 59, 0, endDate.Location())

	// Get active rates for teacher
	rates, err := h.rateRepo.GetActiveRatesByTeacher(teacherID, companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if len(rates) == 0 {
		c.JSON(http.StatusOK, gin.H{
			"period": gin.H{"start": req.StartDate, "end": req.EndDate},
			"breakdown": []gin.H{},
			"total": 0,
			"message": "No active rates found for this teacher",
		})
		return
	}

	// Get completed lessons for the period
	lessons, err := h.lessonRepo.GetByTeacherID(teacherID, startDate, endDate, companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Filter only completed lessons
	completedLessons := []*models.Lesson{}
	for _, lesson := range lessons {
		if lesson.Status == "completed" {
			completedLessons = append(completedLessons, lesson)
		}
	}

	// Group lessons by type and calculate salary
	type Breakdown struct {
		LessonType string  `json:"lessonType"`
		Hours      float64 `json:"hours"`
		Lessons    int     `json:"lessons"`
		Rate       gin.H   `json:"rate"`
		Salary     float64 `json:"salary"`
	}

	breakdown := []Breakdown{}
	totalSalary := 0.0

	// Create a map of rates by lesson type and rate type
	rateMap := make(map[string]map[string]*models.TeacherRate)
	for _, rate := range rates {
		if rateMap[rate.LessonType] == nil {
			rateMap[rate.LessonType] = make(map[string]*models.TeacherRate)
		}
		rateMap[rate.LessonType][rate.RateType] = rate
	}

	// Process each lesson type
	lessonTypes := []string{"group", "individual", "special"}
	for _, lessonType := range lessonTypes {
		// Get lessons of this type
		typeLessons := []*models.Lesson{}
		for _, lesson := range completedLessons {
			if lesson.LessonType == lessonType {
				typeLessons = append(typeLessons, lesson)
			}
		}

		if len(typeLessons) == 0 {
			continue
		}

		// Find rate for this lesson type
		ratesForType, hasRates := rateMap[lessonType]
		if !hasRates || len(ratesForType) == 0 {
			continue // Skip if no rate for this type
		}

		// Use only one rate per lesson type (prefer hourly over per_lesson if both exist)
		var rate *models.TeacherRate
		if ratesForType["hourly"] != nil {
			rate = ratesForType["hourly"]
		} else if ratesForType["per_lesson"] != nil {
			rate = ratesForType["per_lesson"]
		} else {
			continue // No rate found
		}

		var hours float64
		var lessonCount int
		var salary float64

		if rate.RateType == "hourly" {
			// Calculate total hours
			for _, lesson := range typeLessons {
				duration := lesson.End.Sub(lesson.Start)
				hours += duration.Hours()
			}
			lessonCount = len(typeLessons)
			salary = hours * rate.RateValue
		} else if rate.RateType == "per_lesson" {
			// Count lessons
			lessonCount = len(typeLessons)
			for _, lesson := range typeLessons {
				duration := lesson.End.Sub(lesson.Start)
				hours += duration.Hours() // Also calculate hours for display
			}
			salary = float64(lessonCount) * rate.RateValue
		}

		if lessonCount > 0 {
			breakdown = append(breakdown, Breakdown{
				LessonType: lessonType,
				Hours:      hours,
				Lessons:    lessonCount,
				Rate: gin.H{
					"type":  rate.RateType,
					"value": rate.RateValue,
				},
				Salary: salary,
			})
			totalSalary += salary
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"period": gin.H{
			"start": req.StartDate,
			"end":   req.EndDate,
		},
		"breakdown": breakdown,
		"total":     totalSalary,
	})
}
