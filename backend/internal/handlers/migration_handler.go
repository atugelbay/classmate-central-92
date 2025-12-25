package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"classmate-central/internal/repository"
	"classmate-central/internal/services"

	"github.com/gin-gonic/gin"
)

type MigrationHandler struct {
	teacherRepo      *repository.TeacherRepository
	studentRepo      *repository.StudentRepository
	groupRepo        *repository.GroupRepository
	roomRepo         *repository.RoomRepository
	lessonRepo       *repository.LessonRepository
	subscriptionRepo *repository.SubscriptionRepository
	branchRepo       *repository.BranchRepository
}

func NewMigrationHandler(
	teacherRepo *repository.TeacherRepository,
	studentRepo *repository.StudentRepository,
	groupRepo *repository.GroupRepository,
	roomRepo *repository.RoomRepository,
	lessonRepo *repository.LessonRepository,
	subscriptionRepo *repository.SubscriptionRepository,
	branchRepo *repository.BranchRepository,
) *MigrationHandler {
	return &MigrationHandler{
		teacherRepo:      teacherRepo,
		studentRepo:      studentRepo,
		groupRepo:        groupRepo,
		roomRepo:         roomRepo,
		lessonRepo:       lessonRepo,
		subscriptionRepo: subscriptionRepo,
		branchRepo:       branchRepo,
	}
}

// MigrationRequest represents the request body for starting migration
type MigrationRequest struct {
	AlfaCRMURL     string `json:"alfacrmUrl" binding:"required"`
	Email          string `json:"email" binding:"required,email"`
	APIKey         string `json:"apiKey" binding:"required"`
	CompanyID      string `json:"companyId"`
	MigrateRooms   bool   `json:"migrateRooms"`
	MigrateLessons bool   `json:"migrateLessons"`
	UseOldScript   bool   `json:"useOldScript"` // Флаг для использования старого скрипта
}

// MigrationStatus represents the current status of migration
type MigrationStatus struct {
	Status        string     `json:"status"` // running, completed, failed
	CurrentStep   string     `json:"currentStep"`
	Progress      int        `json:"progress"` // 0-100
	TeachersCount int        `json:"teachersCount"`
	StudentsCount int        `json:"studentsCount"`
	GroupsCount   int        `json:"groupsCount"`
	RoomsCount    int        `json:"roomsCount"`
	LessonsCount  int        `json:"lessonsCount"`
	Error         string     `json:"error,omitempty"`
	Logs          string     `json:"logs,omitempty"` // Migration script stdout/stderr
	StartedAt     time.Time  `json:"startedAt"`
	CompletedAt   *time.Time `json:"completedAt,omitempty"`
}

// In-memory storage for migration status (in production, use Redis or similar)
var (
	migrationStatuses = make(map[string]*MigrationStatus)
	statusMutex       sync.RWMutex
)

// StartMigration starts the migration process from AlfaCRM
func (h *MigrationHandler) StartMigration(c *gin.Context) {
	var req MigrationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	companyID := c.GetString("company_id")
	if companyID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Company ID not found"})
		return
	}

	// Check if migration is already running
	statusMutex.RLock()
	existingStatus, exists := migrationStatuses[companyID]
	statusMutex.RUnlock()

	if exists && existingStatus.Status == "running" {
		c.JSON(http.StatusConflict, gin.H{"error": "Migration is already running"})
		return
	}

	// Initialize migration status
	status := &MigrationStatus{
		Status:      "running",
		CurrentStep: "Initializing",
		Progress:    0,
		StartedAt:   time.Now(),
	}

	statusMutex.Lock()
	migrationStatuses[companyID] = status
	statusMutex.Unlock()

	// Start migration in background
	go h.runMigration(companyID, req, status)

	c.JSON(http.StatusAccepted, gin.H{
		"message": "Migration started",
		"status":  status,
	})
}

// GetMigrationStatus returns the current migration status
func (h *MigrationHandler) GetMigrationStatus(c *gin.Context) {
	companyID := c.GetString("company_id")
	if companyID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Company ID not found"})
		return
	}

	statusMutex.RLock()
	status, exists := migrationStatuses[companyID]
	// Create a copy to avoid race conditions
	var statusCopy *MigrationStatus
	if exists {
		statusCopy = &MigrationStatus{
			Status:        status.Status,
			CurrentStep:   status.CurrentStep,
			Progress:      status.Progress,
			TeachersCount: status.TeachersCount,
			StudentsCount: status.StudentsCount,
			GroupsCount:   status.GroupsCount,
			RoomsCount:    status.RoomsCount,
			LessonsCount:  status.LessonsCount,
			Error:         status.Error,
			Logs:          status.Logs,
			StartedAt:     status.StartedAt,
			CompletedAt:   status.CompletedAt,
		}
	} else {
		// Return empty status instead of 404 - this allows frontend to poll even when migration hasn't started
		statusCopy = &MigrationStatus{
			Status:        "idle",
			CurrentStep:   "Миграция не запущена",
			Progress:      0,
			TeachersCount: 0,
			StudentsCount: 0,
			GroupsCount:   0,
			RoomsCount:    0,
			LessonsCount:  0,
		}
	}
	statusMutex.RUnlock()

	c.JSON(http.StatusOK, statusCopy)
}

// runMigration executes the migration process
func (h *MigrationHandler) runMigration(companyID string, req MigrationRequest, status *MigrationStatus) {
	defer func() {
		if r := recover(); r != nil {
			status.Status = "failed"
			status.Error = fmt.Sprintf("Migration panicked: %v", r)
			now := time.Now()
			status.CompletedAt = &now
		}
	}()

	// Call Node.js migration script
	statusMutex.Lock()
	status.CurrentStep = "Подготовка миграции"
	status.Progress = 0
	statusMutex.Unlock()

	migrationService := services.NewMigrationService()

	statusMutex.Lock()
	status.CurrentStep = "Запуск скрипта миграции"
	status.Progress = 5
	statusMutex.Unlock()

	// Get database credentials
	// Priority: DB_* env vars > Parse from DATABASE_URL
	dbHost := os.Getenv("DB_HOST")
	dbPort := os.Getenv("DB_PORT")
	dbName := os.Getenv("DB_NAME")
	dbUser := os.Getenv("DB_USER")
	dbPassword := os.Getenv("DB_PASSWORD")

	// If not set, try to parse from DATABASE_URL (Railway format)
	if dbHost == "" || dbPort == "" || dbName == "" || dbUser == "" || dbPassword == "" {
		databaseURL := os.Getenv("DATABASE_URL")
		if databaseURL != "" {
			// Parse postgresql://user:password@host:port/database
			// Example: postgresql://postgres:password@postgres.railway.internal:5432/railway
			var user, pass, host, port, database string

			// Remove postgresql:// prefix
			if len(databaseURL) > 13 && databaseURL[:13] == "postgresql://" {
				databaseURL = databaseURL[13:]
			} else if len(databaseURL) > 11 && databaseURL[:11] == "postgres://" {
				databaseURL = databaseURL[11:]
			}

			// Split by @
			parts := strings.Split(databaseURL, "@")
			if len(parts) == 2 {
				// Parse user:password
				authParts := strings.Split(parts[0], ":")
				if len(authParts) == 2 {
					user = authParts[0]
					pass = authParts[1]
				}

				// Parse host:port/database
				hostParts := strings.Split(parts[1], "/")
				if len(hostParts) == 2 {
					database = hostParts[1]

					// Parse host:port
					hostPortParts := strings.Split(hostParts[0], ":")
					if len(hostPortParts) == 2 {
						host = hostPortParts[0]
						port = hostPortParts[1]
					}
				}
			}

			// Use parsed values if original vars were empty
			if dbHost == "" {
				dbHost = host
			}
			if dbPort == "" {
				dbPort = port
			}
			if dbName == "" {
				dbName = database
			}
			if dbUser == "" {
				dbUser = user
			}
			if dbPassword == "" {
				dbPassword = pass
			}
		}
	}

	// Create a channel to collect all stdout lines for logging
	var stdoutLines []string
	var stdoutMu sync.Mutex

	// Progress callback for streaming updates
	progressCallback := func(line string) {
		// Store line for logging
		stdoutMu.Lock()
		stdoutLines = append(stdoutLines, line)
		stdoutMu.Unlock()

		// Update progress in real-time based on this line
		// This is called for every line of output, so status updates happen frequently
		h.updateProgressFromLine(status, line)

		// Also update logs in real-time for better visibility
		statusMutex.Lock()
		if len(status.Logs) < 10000 { // Limit log size to prevent memory issues
			status.Logs += line + "\n"
		}
		statusMutex.Unlock()
	}

	// Determine which script to use
	scriptPath := "migration/migrate-from-alfacrm.js"
	if req.UseOldScript {
		scriptPath = "migration/migration_old.js"
	}

	// Run migration with streaming progress updates
	result, err := migrationService.RunMigration(services.MigrationConfig{
		AlfaCRMURL: req.AlfaCRMURL,
		Email:      req.Email,
		APIKey:     req.APIKey,
		CompanyID:  companyID,
		DBHost:     dbHost,
		DBPort:     dbPort,
		DBName:     dbName,
		DBUser:     dbUser,
		DBPassword: dbPassword,
		ScriptPath: scriptPath,
	}, progressCallback)

	// Always save logs, even on success or failure
	if result != nil {
		// Use collected stdout lines if available, otherwise fallback to result.Stdout
		stdoutMu.Lock()
		stdoutText := result.Stdout
		if len(stdoutLines) > 0 {
			stdoutText = strings.Join(stdoutLines, "\n")
		}
		stdoutMu.Unlock()

		statusMutex.Lock()
		status.Logs = fmt.Sprintf("=== STDOUT ===\n%s\n\n=== STDERR ===\n%s", stdoutText, result.Stderr)
		statusMutex.Unlock()
	}

	if err != nil {
		statusMutex.Lock()
		status.Status = "failed"
		status.Error = fmt.Sprintf("Migration failed: %v", err)
		now := time.Now()
		status.CompletedAt = &now
		statusMutex.Unlock()
		return
	}

	// Count migrated data
	statusMutex.Lock()
	status.CurrentStep = "Подсчет результатов"
	// Don't override progress if it was already updated from parsing (should be 90+)
	if status.Progress < 90 {
		status.Progress = 90
	}
	statusMutex.Unlock()

	// Get all branches for the company to count data across all branches
	branches, err := h.branchRepo.GetBranchesByCompany(companyID)
	if err != nil || len(branches) == 0 {
		// Fallback: if no branches found, try to count by company_id directly
		// This handles the case where branch table doesn't exist yet (backward compatibility)
		var totalTeachers, totalStudents, totalGroups, totalRooms, totalLessons int

		// Try to get data using company_id as branch_id (fallback mode)
		teachers, _ := h.teacherRepo.GetAll(companyID, companyID)
		totalTeachers = len(teachers)

		students, _ := h.studentRepo.GetAll(companyID, companyID)
		totalStudents = len(students)

		groups, _ := h.groupRepo.GetAll(companyID, companyID)
		totalGroups = len(groups)

		rooms, _ := h.roomRepo.GetAll(companyID, companyID)
		totalRooms = len(rooms)

		lessons, _ := h.lessonRepo.GetAll(companyID, companyID)
		totalLessons = len(lessons)

		statusMutex.Lock()
		status.TeachersCount = totalTeachers
		status.StudentsCount = totalStudents
		status.GroupsCount = totalGroups
		status.RoomsCount = totalRooms
		status.LessonsCount = totalLessons
		statusMutex.Unlock()
	} else {
		// Count data across all branches
		// Use a map to track unique IDs to avoid counting duplicates
		// when the same entity exists in multiple branches
		teacherIds := make(map[string]bool)
		studentIds := make(map[string]bool)
		groupIds := make(map[string]bool)
		roomIds := make(map[string]bool)
		lessonIds := make(map[string]bool)

		for _, branch := range branches {
			teachers, _ := h.teacherRepo.GetAll(companyID, branch.ID)
			for _, teacher := range teachers {
				teacherIds[teacher.ID] = true
			}

			students, _ := h.studentRepo.GetAll(companyID, branch.ID)
			for _, student := range students {
				studentIds[student.ID] = true
			}

			groups, _ := h.groupRepo.GetAll(companyID, branch.ID)
			for _, group := range groups {
				groupIds[group.ID] = true
			}

			rooms, _ := h.roomRepo.GetAll(companyID, branch.ID)
			for _, room := range rooms {
				roomIds[room.ID] = true
			}

			lessons, _ := h.lessonRepo.GetAll(companyID, branch.ID)
			for _, lesson := range lessons {
				lessonIds[lesson.ID] = true
			}
		}

		statusMutex.Lock()
		status.TeachersCount = len(teacherIds)
		status.StudentsCount = len(studentIds)
		status.GroupsCount = len(groupIds)
		status.RoomsCount = len(roomIds)
		status.LessonsCount = len(lessonIds)
		statusMutex.Unlock()
	}

	statusMutex.Lock()
	status.Progress = 100
	status.Status = "completed"
	status.CurrentStep = "Миграция завершена"
	now := time.Now()
	status.CompletedAt = &now
	statusMutex.Unlock()
}

// ClearCompanyData clears all data for the current company
func (h *MigrationHandler) ClearCompanyData(c *gin.Context) {
	companyID := c.GetString("company_id")
	if companyID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Company ID not found"})
		return
	}

	// Get database connection (assuming we can access it through one of the repositories)
	// We'll use a direct SQL approach for this operation
	db := h.teacherRepo.GetDB() // We need to add this method to repository

	// Start transaction
	tx, err := db.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to start transaction: %v", err)})
		return
	}
	defer tx.Rollback()

	// Delete in correct order (respecting foreign keys)
	queries := []string{
		// Delete lessons and related data
		"DELETE FROM lesson_students WHERE company_id = $1",
		"DELETE FROM lesson_attendance WHERE lesson_id IN (SELECT id FROM lessons WHERE company_id = $1)",
		"DELETE FROM lessons WHERE company_id = $1",

		// Delete subscriptions
		"DELETE FROM subscription_freezes WHERE subscription_id IN (SELECT id FROM student_subscriptions WHERE company_id = $1)",
		"DELETE FROM student_subscriptions WHERE company_id = $1",
		"DELETE FROM subscription_types WHERE company_id = $1",

		// Delete finance data
		"DELETE FROM payment_transactions WHERE company_id = $1",
		"DELETE FROM debt_records WHERE company_id = $1",

		// Delete group data
		// Note: group_schedule table doesn't exist in current schema
		"DELETE FROM student_groups WHERE group_id IN (SELECT id FROM groups WHERE company_id = $1)",
		"DELETE FROM groups WHERE company_id = $1",

		// Delete students and related data
		"DELETE FROM student_balance WHERE student_id IN (SELECT id FROM students WHERE company_id = $1)",
		"DELETE FROM student_activity_log WHERE student_id IN (SELECT id FROM students WHERE company_id = $1)",
		"DELETE FROM student_notes WHERE student_id IN (SELECT id FROM students WHERE company_id = $1)",
		"DELETE FROM notifications WHERE student_id IN (SELECT id FROM students WHERE company_id = $1)",
		"DELETE FROM students WHERE company_id = $1",

		// Delete teachers and rooms
		"DELETE FROM teachers WHERE company_id = $1",
		"DELETE FROM rooms WHERE company_id = $1",
	}

	for _, query := range queries {
		_, err := tx.Exec(query, companyID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to clear data: %v", err)})
			return
		}
	}

	// Commit transaction
	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to commit: %v", err)})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "All company data cleared successfully",
	})
}

// TestAlfaCRMConnection tests the connection to AlfaCRM API
func (h *MigrationHandler) TestAlfaCRMConnection(c *gin.Context) {
	var req struct {
		AlfaCRMURL string `json:"alfacrmUrl" binding:"required"`
		Email      string `json:"email" binding:"required"`
		APIKey     string `json:"apiKey" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Test connection to AlfaCRM
	client := &http.Client{Timeout: 10 * time.Second}

	loginData := map[string]string{
		"email":   req.Email,
		"api_key": req.APIKey,
	}

	jsonData, _ := json.Marshal(loginData)
	jsonReader := bytes.NewReader(jsonData)

	resp, err := client.Post(
		fmt.Sprintf("%s/v2api/auth/login", req.AlfaCRMURL),
		"application/json",
		jsonReader,
	)

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   fmt.Sprintf("Failed to connect to AlfaCRM: %v", err),
		})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid credentials or API URL",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Successfully connected to AlfaCRM",
	})
}

// updateProgressFromLine updates progress based on a single line of output (for streaming)
func (h *MigrationHandler) updateProgressFromLine(status *MigrationStatus, line string) {
	// Map of migration step keywords to progress percentages and step names
	stepProgress := []struct {
		keyword  string
		progress int
		name     string
	}{
		{"СОЗДАНИЕ КОМПАНИИ И ФИЛИАЛОВ", 5, "Создание компании и филиалов"},
		{"МИГРАЦИЯ ТАРИФОВ", 10, "Миграция тарифов"},
		{"МИГРАЦИЯ КОМНАТ", 15, "Миграция комнат"},
		{"МИГРАЦИЯ ПРЕПОДАВАТЕЛЕЙ", 20, "Миграция преподавателей"},
		{"МИГРАЦИЯ ГРУПП", 30, "Миграция групп"},
		{"МИГРАЦИЯ РАСПИСАНИЙ ГРУПП", 35, "Миграция расписаний групп"},
		{"МИГРАЦИЯ СТУДЕНТОВ", 45, "Миграция студентов"},
		{"МИГРАЦИЯ ИНДИВИДУАЛЬНЫХ ЗАНЯТИЙ", 50, "Миграция индивидуальных занятий"},
		{"МИГРАЦИЯ СВЯЗЕЙ СТУДЕНТ-ГРУППА", 55, "Миграция связей студент-группа"},
		{"ПРЕДЗАГРУЗКА ЦЕН УРОКОВ", 60, "Предзагрузка цен уроков"},
		{"МИГРАЦИЯ АБОНЕМЕНТОВ СТУДЕНТОВ", 65, "Миграция абонементов студентов"},
		{"МИГРАЦИЯ ИСТОРИИ ПОСЕЩЕНИЙ", 75, "Миграция истории посещений"},
		{"СОЗДАНИЕ ТРАНЗАКЦИЙ", 80, "Создание транзакций"},
		{"МИГРАЦИЯ ДОЛГОВ", 85, "Миграция долгов"},
		{"ГЕНЕРАЦИЯ УРОКОВ", 90, "Генерация уроков"},
		{"МИГРАЦИЯ ЗАВЕРШЕНА", 95, "Миграция завершена"},
	}

	// Check if this line contains a step keyword
	for _, step := range stepProgress {
		if strings.Contains(line, step.keyword) {
			// Use mutex to protect status updates
			statusMutex.Lock()
			// Always update progress and step (not just if higher) to ensure real-time updates
			status.Progress = step.progress
			status.CurrentStep = step.name
			statusMutex.Unlock()
			return
		}
	}

	// Also check for completion indicators
	if strings.Contains(line, "✅ МИГРАЦИЯ ЗАВЕРШЕНА") || strings.Contains(line, "МИГРАЦИЯ ЗАВЕРШЕНА!") {
		statusMutex.Lock()
		status.Progress = 100
		status.CurrentStep = "Миграция завершена"
		statusMutex.Unlock()
	}
}

// updateProgressFromOutput parses full stdout from migration script and updates progress
// (kept for backward compatibility, but updateProgressFromLine is preferred for streaming)
func (h *MigrationHandler) updateProgressFromOutput(status *MigrationStatus, stdout string) {
	// Split stdout into lines and process each one
	lines := strings.Split(stdout, "\n")
	for _, line := range lines {
		h.updateProgressFromLine(status, line)
	}
}
