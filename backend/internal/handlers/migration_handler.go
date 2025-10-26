package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
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
}

func NewMigrationHandler(
	teacherRepo *repository.TeacherRepository,
	studentRepo *repository.StudentRepository,
	groupRepo *repository.GroupRepository,
	roomRepo *repository.RoomRepository,
	lessonRepo *repository.LessonRepository,
	subscriptionRepo *repository.SubscriptionRepository,
) *MigrationHandler {
	return &MigrationHandler{
		teacherRepo:      teacherRepo,
		studentRepo:      studentRepo,
		groupRepo:        groupRepo,
		roomRepo:         roomRepo,
		lessonRepo:       lessonRepo,
		subscriptionRepo: subscriptionRepo,
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
var migrationStatuses = make(map[string]*MigrationStatus)

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
	if status, exists := migrationStatuses[companyID]; exists && status.Status == "running" {
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
	migrationStatuses[companyID] = status

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

	status, exists := migrationStatuses[companyID]
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "No migration found"})
		return
	}

	c.JSON(http.StatusOK, status)
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
	status.CurrentStep = "Подготовка миграции"
	status.Progress = 5

	migrationService := services.NewMigrationService()

	status.CurrentStep = "Запуск скрипта миграции"
	status.Progress = 10

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
	})

	// Always save logs, even on success
	if result != nil {
		status.Logs = fmt.Sprintf("=== STDOUT ===\n%s\n\n=== STDERR ===\n%s", result.Stdout, result.Stderr)
	}

	if err != nil {
		status.Status = "failed"
		status.Error = fmt.Sprintf("Migration failed: %v", err)
		now := time.Now()
		status.CompletedAt = &now
		return
	}

	// Count migrated data
	status.CurrentStep = "Подсчет результатов"
	status.Progress = 95

	// Get counts from database
	teachers, _ := h.teacherRepo.GetAll(companyID)
	status.TeachersCount = len(teachers)

	students, _ := h.studentRepo.GetAll(companyID)
	status.StudentsCount = len(students)

	groups, _ := h.groupRepo.GetAll(companyID)
	status.GroupsCount = len(groups)

	rooms, _ := h.roomRepo.GetAll(companyID)
	status.RoomsCount = len(rooms)

	lessons, _ := h.lessonRepo.GetAll(companyID)
	status.LessonsCount = len(lessons)

	status.Progress = 100
	status.Status = "completed"
	status.CurrentStep = "Миграция завершена"
	now := time.Now()
	status.CompletedAt = &now
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
