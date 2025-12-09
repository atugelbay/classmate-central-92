package handlers

import (
	"classmate-central/internal/logger"
	"classmate-central/internal/models"
	"classmate-central/internal/repository"
	"classmate-central/internal/services"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type ExportHandler struct {
	exportService *services.ExportService
	paymentRepo   *repository.PaymentRepository
	studentRepo   *repository.StudentRepository
	lessonRepo    *repository.LessonRepository
}

func NewExportHandler(
	exportService *services.ExportService,
	paymentRepo *repository.PaymentRepository,
	studentRepo *repository.StudentRepository,
	lessonRepo *repository.LessonRepository,
) *ExportHandler {
	return &ExportHandler{
		exportService: exportService,
		paymentRepo:   paymentRepo,
		studentRepo:   studentRepo,
		lessonRepo:    lessonRepo,
	}
}

// ExportTransactionsPDF exports transactions as PDF
func (h *ExportHandler) ExportTransactionsPDF(c *gin.Context) {
	companyID := c.GetString("company_id")
	if companyID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "company_id not found"})
		return
	}

	transactions, err := h.paymentRepo.GetAllTransactions(companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch transactions"})
		return
	}

	// Apply filters
	filteredTransactions := h.filterTransactions(transactions, c)

	// Get all students for mapping
	students, err := h.studentRepo.GetAll(companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch students"})
		return
	}

	studentMap := make(map[string]string)
	for _, s := range students {
		studentMap[s.ID] = s.Name
	}

	pdfData, err := h.exportService.ExportTransactionsPDF(filteredTransactions, studentMap)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate PDF"})
		return
	}

	c.Header("Content-Type", "application/pdf")
	c.Header("Content-Disposition", `attachment; filename="transactions_`+time.Now().Format("20060102_150405")+`.pdf"`)
	c.Data(http.StatusOK, "application/pdf", pdfData)
}

// ExportTransactionsExcel exports transactions as Excel
func (h *ExportHandler) ExportTransactionsExcel(c *gin.Context) {
	companyID := c.GetString("company_id")
	if companyID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "company_id not found"})
		return
	}

	transactions, err := h.paymentRepo.GetAllTransactions(companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch transactions"})
		return
	}

	// Apply filters
	filteredTransactions := h.filterTransactions(transactions, c)

	// Get all students for mapping
	students, err := h.studentRepo.GetAll(companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch students"})
		return
	}

	studentMap := make(map[string]string)
	for _, s := range students {
		studentMap[s.ID] = s.Name
	}

	excelData, err := h.exportService.ExportTransactionsExcel(filteredTransactions, studentMap)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate Excel"})
		return
	}

	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", `attachment; filename="transactions_`+time.Now().Format("20060102_150405")+`.xlsx"`)
	c.Data(http.StatusOK, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", excelData)
}

// ExportStudentsPDF exports students as PDF
func (h *ExportHandler) ExportStudentsPDF(c *gin.Context) {
	companyID := c.GetString("company_id")
	if companyID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "company_id not found"})
		return
	}

	students, err := h.studentRepo.GetAll(companyID)
	if err != nil {
		logger.Error("Failed to fetch students for PDF export", zap.Error(err), zap.String("company_id", companyID))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch students"})
		return
	}

	// Apply filters
	filteredStudents := h.filterStudents(students, c)

	pdfData, err := h.exportService.ExportStudentsPDF(filteredStudents)
	if err != nil {
		logger.Error("Failed to generate students PDF", zap.Error(err), zap.Int("students_count", len(filteredStudents)))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate PDF", "details": err.Error()})
		return
	}

	c.Header("Content-Type", "application/pdf")
	c.Header("Content-Disposition", `attachment; filename="students_`+time.Now().Format("20060102_150405")+`.pdf"`)
	c.Data(http.StatusOK, "application/pdf", pdfData)
}

// ExportStudentsExcel exports students as Excel
func (h *ExportHandler) ExportStudentsExcel(c *gin.Context) {
	companyID := c.GetString("company_id")
	if companyID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "company_id not found"})
		return
	}

	students, err := h.studentRepo.GetAll(companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch students"})
		return
	}

	// Apply filters
	filteredStudents := h.filterStudents(students, c)

	excelData, err := h.exportService.ExportStudentsExcel(filteredStudents)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate Excel"})
		return
	}

	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", `attachment; filename="students_`+time.Now().Format("20060102_150405")+`.xlsx"`)
	c.Data(http.StatusOK, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", excelData)
}

// ExportSchedulePDF exports schedule as PDF
func (h *ExportHandler) ExportSchedulePDF(c *gin.Context) {
	companyID := c.GetString("company_id")
	if companyID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "company_id not found"})
		return
	}

	// Get date range from query params
	startDateStr := c.Query("startDate")
	endDateStr := c.Query("endDate")

	var startDate, endDate time.Time
	var err error

	if startDateStr != "" {
		startDate, err = time.Parse("2006-01-02", startDateStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid startDate format. Use YYYY-MM-DD"})
			return
		}
	} else {
		startDate = time.Now().AddDate(0, 0, -30) // Default: last 30 days
	}

	if endDateStr != "" {
		endDate, err = time.Parse("2006-01-02", endDateStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid endDate format. Use YYYY-MM-DD"})
			return
		}
	} else {
		endDate = time.Now().AddDate(0, 0, 30) // Default: next 30 days
	}

	lessons, err := h.lessonRepo.GetAll(companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch lessons"})
		return
	}

	// Filter lessons by date range first
	filteredLessons := []*models.Lesson{}
	for _, lesson := range lessons {
		if (lesson.Start.After(startDate) || lesson.Start.Equal(startDate)) && lesson.Start.Before(endDate.AddDate(0, 0, 1)) {
			filteredLessons = append(filteredLessons, lesson)
		}
	}

	// Apply additional filters (teacher, group, room, status)
	filteredLessons = h.filterLessons(filteredLessons, c)

	pdfData, err := h.exportService.ExportSchedulePDF(filteredLessons, startDate, endDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate PDF"})
		return
	}

	c.Header("Content-Type", "application/pdf")
	c.Header("Content-Disposition", `attachment; filename="schedule_`+time.Now().Format("20060102_150405")+`.pdf"`)
	c.Data(http.StatusOK, "application/pdf", pdfData)
}

// ExportScheduleExcel exports schedule as Excel
func (h *ExportHandler) ExportScheduleExcel(c *gin.Context) {
	companyID := c.GetString("company_id")
	if companyID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "company_id not found"})
		return
	}

	// Get date range from query params
	startDateStr := c.Query("startDate")
	endDateStr := c.Query("endDate")

	var startDate, endDate time.Time
	var err error

	if startDateStr != "" {
		startDate, err = time.Parse("2006-01-02", startDateStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid startDate format. Use YYYY-MM-DD"})
			return
		}
	} else {
		startDate = time.Now().AddDate(0, 0, -30) // Default: last 30 days
	}

	if endDateStr != "" {
		endDate, err = time.Parse("2006-01-02", endDateStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid endDate format. Use YYYY-MM-DD"})
			return
		}
	} else {
		endDate = time.Now().AddDate(0, 0, 30) // Default: next 30 days
	}

	lessons, err := h.lessonRepo.GetAll(companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch lessons"})
		return
	}

	// Filter lessons by date range first
	filteredLessons := []*models.Lesson{}
	for _, lesson := range lessons {
		if (lesson.Start.After(startDate) || lesson.Start.Equal(startDate)) && lesson.Start.Before(endDate.AddDate(0, 0, 1)) {
			filteredLessons = append(filteredLessons, lesson)
		}
	}

	// Apply additional filters (teacher, group, room, status)
	filteredLessons = h.filterLessons(filteredLessons, c)

	excelData, err := h.exportService.ExportScheduleExcel(filteredLessons, startDate, endDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate Excel"})
		return
	}

	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", `attachment; filename="schedule_`+time.Now().Format("20060102_150405")+`.xlsx"`)
	c.Data(http.StatusOK, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", excelData)
}

// Helper functions for filtering

func (h *ExportHandler) filterTransactions(transactions []models.PaymentTransaction, c *gin.Context) []models.PaymentTransaction {
	filtered := []models.PaymentTransaction{}

	startDateStr := c.Query("startDate")
	endDateStr := c.Query("endDate")
	typeFilter := c.Query("type")
	studentID := c.Query("studentId")
	// Note: teacherID and groupID filters would require additional queries to lesson associations
	// For now, we only filter by date, type, and studentID

	var startDate, endDate time.Time
	var err error

	if startDateStr != "" {
		startDate, err = time.Parse("2006-01-02", startDateStr)
		if err == nil {
			startDate = startDate.Truncate(24 * time.Hour)
		}
	}

	if endDateStr != "" {
		endDate, err = time.Parse("2006-01-02", endDateStr)
		if err == nil {
			endDate = endDate.Add(24 * time.Hour).Truncate(24 * time.Hour)
		}
	}

	for _, tx := range transactions {
		// Date filter
		if !startDate.IsZero() && tx.CreatedAt.Before(startDate) {
			continue
		}
		if !endDate.IsZero() && tx.CreatedAt.After(endDate) {
			continue
		}

		// Type filter
		if typeFilter != "" && tx.Type != typeFilter {
			continue
		}

		// Student filter
		if studentID != "" && tx.StudentID != studentID {
			continue
		}

		// Note: Teacher and Group filters would need to be checked via lesson associations
		// This would require additional queries or denormalized data in transactions

		filtered = append(filtered, tx)
	}

	return filtered
}

func (h *ExportHandler) filterStudents(students []*models.Student, c *gin.Context) []*models.Student {
	filtered := []*models.Student{}

	statusFilter := c.Query("status")
	groupID := c.Query("groupId")
	teacherID := c.Query("teacherId")
	hasBalanceStr := c.Query("hasBalance")
	query := c.Query("query")

	// Log filters for debugging
	logger.Info("Filtering students for export",
		zap.String("status", statusFilter),
		zap.String("groupId", groupID),
		zap.String("teacherId", teacherID),
		zap.String("hasBalance", hasBalanceStr),
		zap.String("query", query),
		zap.Int("total_students", len(students)),
	)

	// Get balances if hasBalance filter is set
	var balanceMap map[string]float64
	if hasBalanceStr == "true" {
		companyID := c.GetString("company_id")
		if companyID != "" {
			balances, err := h.paymentRepo.GetAllBalances(companyID)
			if err == nil {
				balanceMap = make(map[string]float64)
				for _, balance := range balances {
					balanceMap[balance.StudentID] = balance.Balance
				}
			}
		}
	}

	// Get lessons for teacher filter - optimize by using already loaded students
	var teacherLessons map[string]bool
	if teacherID != "" {
		companyID := c.GetString("company_id")
		if companyID != "" {
			// Create student-to-groups map for fast lookup
			studentGroupsMap := make(map[string]map[string]bool)
			for _, s := range students {
				studentGroupsMap[s.ID] = make(map[string]bool)
				for _, gid := range s.GroupIds {
					studentGroupsMap[s.ID][gid] = true
				}
			}

			lessons, err := h.lessonRepo.GetAll(companyID)
			if err == nil {
				teacherLessons = make(map[string]bool)
				for _, lesson := range lessons {
					if lesson.TeacherID == teacherID {
						// Add individual students
						for _, studentID := range lesson.StudentIds {
							teacherLessons[studentID] = true
						}
						// Add students from group (using pre-built map)
						if lesson.GroupID != "" {
							for studentID, groups := range studentGroupsMap {
								if groups[lesson.GroupID] {
									teacherLessons[studentID] = true
								}
							}
						}
					}
				}
			}
		}
	}

	for _, student := range students {
		// Status filter
		if statusFilter != "" && student.Status != statusFilter {
			continue
		}

		// Group filter
		if groupID != "" {
			found := false
			for _, gid := range student.GroupIds {
				if gid == groupID {
					found = true
					break
				}
			}
			if !found {
				continue
			}
		}

		// Teacher filter
		if teacherID != "" && teacherLessons != nil {
			if !teacherLessons[student.ID] {
				continue
			}
		}

		// HasBalance filter
		if hasBalanceStr == "true" && balanceMap != nil {
			if balanceMap[student.ID] <= 0 {
				continue
			}
		}

		// Query filter (name, email, phone)
		if query != "" {
			queryLower := strings.ToLower(query)
			nameMatch := strings.Contains(strings.ToLower(student.Name), queryLower)
			emailMatch := strings.Contains(strings.ToLower(student.Email), queryLower)
			phoneMatch := strings.Contains(strings.ToLower(student.Phone), queryLower)
			if !nameMatch && !emailMatch && !phoneMatch {
				continue
			}
		}

		filtered = append(filtered, student)
	}

	logger.Info("Filtered students for export", zap.Int("filtered_count", len(filtered)))

	return filtered
}

func (h *ExportHandler) filterLessons(lessons []*models.Lesson, c *gin.Context) []*models.Lesson {
	filtered := []*models.Lesson{}

	teacherID := c.Query("teacherId")
	groupID := c.Query("groupId")
	roomID := c.Query("roomId")
	statusFilter := c.Query("status")

	for _, lesson := range lessons {
		// Teacher filter
		if teacherID != "" && lesson.TeacherID != teacherID {
			continue
		}

		// Group filter
		if groupID != "" && lesson.GroupID != groupID {
			continue
		}

		// Room filter
		if roomID != "" && lesson.RoomID != roomID {
			continue
		}

		// Status filter
		if statusFilter != "" && lesson.Status != statusFilter {
			continue
		}

		filtered = append(filtered, lesson)
	}

	return filtered
}
