package main

import (
	"log"
	"os"

	"classmate-central/internal/database"
	"classmate-central/internal/handlers"
	"classmate-central/internal/logger"
	"classmate-central/internal/middleware"
	"classmate-central/internal/repository"
	"classmate-central/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"go.uber.org/zap"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Initialize logger
	env := os.Getenv("ENV")
	if env == "" {
		env = "development"
	}
	if err := logger.Init(env); err != nil {
		log.Fatalf("Failed to initialize logger: %v", err)
	}
	defer logger.Logger.Sync()

	logger.Info("Starting application", zap.String("environment", env))

	// Initialize database
	db, err := database.NewDatabase()
	if err != nil {
		logger.Fatal("Failed to connect to database", logger.ErrorField(err))
	}
	defer db.Close()

	logger.Info("Database connected successfully")

	// Run migrations
	if err := db.RunMigrations(); err != nil {
		logger.Warn("Failed to run migrations", logger.ErrorField(err))
		logger.Info("Continuing with existing database schema...")
	} else {
		logger.Info("Database migrations completed")
	}

	// Initialize repositories
	userRepo := repository.NewUserRepository(db.DB)
	companyRepo := repository.NewCompanyRepository(db.DB)
	teacherRepo := repository.NewTeacherRepository(db.DB)
	studentRepo := repository.NewStudentRepository(db.DB)
	groupRepo := repository.NewGroupRepository(db.DB)
	lessonRepo := repository.NewLessonRepository(db.DB)
	settingsRepo := repository.NewSettingsRepository(db.DB)
	roomRepo := repository.NewRoomRepository(db.DB)
	leadRepo := repository.NewLeadRepository(db.DB)
	paymentRepo := repository.NewPaymentRepository(db.DB)
	tariffRepo := repository.NewTariffRepository(db.DB)
	discountRepo := repository.NewDiscountRepository(db.DB)
	debtRepo := repository.NewDebtRepository(db.DB)
	subscriptionRepo := repository.NewSubscriptionRepository(db.DB)
	consumptionRepo := repository.NewSubscriptionConsumptionRepository(db.DB)
	activityRepo := repository.NewActivityRepository(db.DB)
	notificationRepo := repository.NewNotificationRepository(db.DB)
	roleRepo := repository.NewRoleRepository(db.DB)
	permRepo := repository.NewPermissionRepository(db.DB)

	// Initialize services
	activityService := services.NewActivityService(activityRepo)
	emailService := services.NewEmailService()
	_ = services.NewNotificationService(notificationRepo, debtRepo, subscriptionRepo) // Can be used for scheduled tasks
	attendanceService := services.NewAttendanceService(subscriptionRepo, consumptionRepo, activityRepo, notificationRepo, emailService, studentRepo, lessonRepo, db.DB)
	subscriptionService := services.NewSubscriptionService(subscriptionRepo, lessonRepo, activityRepo, db.DB)
	exportService := services.NewExportService()

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(userRepo, companyRepo, roleRepo, settingsRepo, emailService)
	teacherHandler := handlers.NewTeacherHandler(teacherRepo)
	studentHandler := handlers.NewStudentHandler(studentRepo, activityRepo, notificationRepo, activityService)
	groupHandler := handlers.NewGroupHandler(groupRepo, lessonRepo)
	lessonHandler := handlers.NewLessonHandler(lessonRepo, roomRepo)
	settingsHandler := handlers.NewSettingsHandler(settingsRepo)
	roomHandler := handlers.NewRoomHandler(roomRepo)
	leadHandler := handlers.NewLeadHandler(leadRepo)
	paymentHandler := handlers.NewPaymentHandler(paymentRepo, activityService, emailService, studentRepo)
	tariffHandler := handlers.NewTariffHandler(tariffRepo)
	discountHandler := handlers.NewDiscountHandler(discountRepo)
	debtHandler := handlers.NewDebtHandler(debtRepo)
	subscriptionHandler := handlers.NewSubscriptionHandler(subscriptionRepo, attendanceService, activityService, subscriptionService)
	migrationHandler := handlers.NewMigrationHandler(teacherRepo, studentRepo, groupRepo, roomRepo, lessonRepo, subscriptionRepo)
	dashboardHandler := handlers.NewDashboardHandler(lessonRepo, paymentRepo, subscriptionRepo, studentRepo, leadRepo, debtRepo)
	roleHandler := handlers.NewRoleHandler(roleRepo, permRepo)
	userRoleHandler := handlers.NewUserRoleHandler(userRepo, roleRepo)
	exportHandler := handlers.NewExportHandler(exportService, paymentRepo, studentRepo, lessonRepo)

	// Initialize Gin
	router := gin.Default()

	// Middleware
	router.Use(middleware.CORSMiddleware())
	router.Use(middleware.RequestLoggerMiddleware()) // Request logging with request ID
	router.Use(middleware.ErrorHandlerMiddleware())  // Centralized error handling
	router.Use(middleware.MetricsMiddleware())        // Prometheus metrics

	// Public routes with rate limiting for auth endpoints (brute-force protection)
	auth := router.Group("/api/auth")
	auth.Use(middleware.AuthRateLimitMiddleware())
	{
		auth.POST("/register", authHandler.Register)
		auth.POST("/login", authHandler.Login)
		auth.POST("/refresh", authHandler.RefreshToken)
		auth.POST("/verify-email", authHandler.VerifyEmail)
		auth.POST("/resend-verification", authHandler.ResendVerificationEmail)
		auth.POST("/accept-invite", authHandler.AcceptInvite)
	}

	// Protected routes
	api := router.Group("/api")
	api.Use(middleware.AuthMiddleware())
	api.Use(middleware.CompanyMiddleware(db.DB))
	{
		// Auth
		api.GET("/auth/me", authHandler.Me)
		api.GET("/auth/users", middleware.RequirePermission("users", "manage"), authHandler.GetUsers)
		api.POST("/auth/invite", middleware.RequirePermission("users", "manage"), authHandler.InviteUser)
		api.POST("/auth/logout", authHandler.Logout)

		// ============= RBAC MODULE =============

		// Permissions
		api.GET("/permissions", roleHandler.GetAllPermissions)

		// Roles
		api.GET("/roles", roleHandler.GetAll)
		api.GET("/roles/:id", roleHandler.GetByID)
		api.POST("/roles", middleware.RequirePermission("roles", "manage"), roleHandler.Create)
		api.PUT("/roles/:id", middleware.RequirePermission("roles", "manage"), roleHandler.Update)
		api.DELETE("/roles/:id", middleware.RequirePermission("roles", "manage"), roleHandler.Delete)
		api.GET("/roles/:id/permissions", roleHandler.GetRolePermissions)

		// User Roles
		api.GET("/users/:userId/roles", userRoleHandler.GetUserRoles)
		api.POST("/users/roles/assign", middleware.RequirePermission("users", "manage"), userRoleHandler.AssignRole)
		api.POST("/users/roles/remove", middleware.RequirePermission("users", "manage"), userRoleHandler.RemoveRole)

		// Teachers
		api.GET("/teachers", middleware.RequirePermission("teachers", "view"), teacherHandler.GetAll)
		api.GET("/teachers/:id", middleware.RequirePermission("teachers", "view"), teacherHandler.GetByID)
		api.POST("/teachers", middleware.RequirePermission("teachers", "create"), teacherHandler.Create)
		api.PUT("/teachers/:id", middleware.RequirePermission("teachers", "update"), teacherHandler.Update)
		api.DELETE("/teachers/:id", middleware.RequirePermission("teachers", "delete"), teacherHandler.Delete)

		// Students
		api.GET("/students", middleware.RequirePermission("students", "view"), studentHandler.GetAll)
		api.POST("/students", middleware.RequirePermission("students", "create"), studentHandler.Create)

		// Student-specific routes (must be before /students/:id)
		api.GET("/students/:id/activities", middleware.RequirePermission("students", "view"), studentHandler.GetActivities)
		api.POST("/students/:id/notes", middleware.RequirePermission("students", "update"), studentHandler.AddNote)
		api.GET("/students/:id/notes", middleware.RequirePermission("students", "view"), studentHandler.GetNotes)
		api.PUT("/students/:id/status", middleware.RequirePermission("students", "update"), studentHandler.UpdateStatus)
		api.GET("/students/:id/attendance", middleware.RequirePermission("students", "view"), studentHandler.GetAttendanceJournal)
		api.GET("/students/:id/notifications", middleware.RequirePermission("students", "view"), studentHandler.GetNotifications)
		api.GET("/students/:id/discounts", middleware.RequirePermission("students", "view"), discountHandler.GetStudentDiscounts)
		api.POST("/students/:id/discounts", middleware.RequirePermission("students", "update"), discountHandler.ApplyToStudent)
		api.DELETE("/students/:id/discounts/:discountId", middleware.RequirePermission("students", "update"), discountHandler.RemoveStudentDiscount)

		// General student routes
		api.GET("/students/:id", middleware.RequirePermission("students", "view"), studentHandler.GetByID)
		api.PUT("/students/:id", middleware.RequirePermission("students", "update"), studentHandler.Update)
		api.DELETE("/students/:id", middleware.RequirePermission("students", "delete"), studentHandler.Delete)

		api.PUT("/notifications/:notificationId/read", middleware.RequirePermission("students", "view"), studentHandler.MarkNotificationRead)

		// Groups
		api.GET("/groups", middleware.RequirePermission("groups", "view"), groupHandler.GetAll)
		api.GET("/groups/:id", middleware.RequirePermission("groups", "view"), groupHandler.GetByID)
		api.POST("/groups", middleware.RequirePermission("groups", "create"), groupHandler.Create)
		api.PUT("/groups/:id", middleware.RequirePermission("groups", "update"), groupHandler.Update)
		api.DELETE("/groups/:id", middleware.RequirePermission("groups", "delete"), groupHandler.Delete)
		api.POST("/groups/:id/generate-lessons", middleware.RequirePermission("lessons", "create"), groupHandler.GenerateLessons)
		api.POST("/groups/:id/extend", middleware.RequirePermission("groups", "update"), groupHandler.ExtendGroup)

		// Lessons
		api.GET("/lessons", middleware.RequirePermission("lessons", "view"), lessonHandler.GetAll)
		api.GET("/lessons/individual", middleware.RequirePermission("lessons", "view"), lessonHandler.GetIndividual)
		api.GET("/lessons/:id", middleware.RequirePermission("lessons", "view"), lessonHandler.GetByID)
		api.POST("/lessons", middleware.RequirePermission("lessons", "create"), lessonHandler.Create)
		api.PUT("/lessons/:id", middleware.RequirePermission("lessons", "update"), lessonHandler.Update)
		api.DELETE("/lessons/:id", middleware.RequirePermission("lessons", "delete"), lessonHandler.Delete)
		api.POST("/lessons/check-conflicts", middleware.RequirePermission("lessons", "create"), lessonHandler.CheckConflicts)
		api.GET("/lessons/teacher/:teacherId", middleware.RequirePermission("lessons", "view"), lessonHandler.GetByTeacher)
		api.POST("/lessons/bulk", middleware.RequirePermission("lessons", "create"), lessonHandler.CreateBulk)

		// Settings
		api.GET("/settings", middleware.RequirePermission("settings", "view"), settingsHandler.Get)
		api.PUT("/settings", middleware.RequirePermission("settings", "update"), settingsHandler.Update)

		// Rooms
		api.GET("/rooms", middleware.RequirePermission("rooms", "view"), roomHandler.GetAll)
		api.GET("/rooms/:id", middleware.RequirePermission("rooms", "view"), roomHandler.GetByID)
		api.POST("/rooms", middleware.RequirePermission("rooms", "create"), roomHandler.Create)
		api.PUT("/rooms/:id", middleware.RequirePermission("rooms", "update"), roomHandler.Update)
		api.DELETE("/rooms/:id", middleware.RequirePermission("rooms", "delete"), roomHandler.Delete)

		// Leads
		api.GET("/leads", middleware.RequirePermission("leads", "view"), leadHandler.GetAll)
		api.GET("/leads/stats", middleware.RequirePermission("leads", "view"), leadHandler.GetConversionStats)
		api.GET("/leads/:id", middleware.RequirePermission("leads", "view"), leadHandler.GetByID)
		api.POST("/leads", middleware.RequirePermission("leads", "create"), leadHandler.Create)
		api.PUT("/leads/:id", middleware.RequirePermission("leads", "update"), leadHandler.Update)
		api.DELETE("/leads/:id", middleware.RequirePermission("leads", "delete"), leadHandler.Delete)

		// Lead Activities
		api.GET("/leads/:id/activities", middleware.RequirePermission("leads", "view"), leadHandler.GetActivities)
		api.POST("/leads/:id/activities", middleware.RequirePermission("leads", "update"), leadHandler.AddActivity)

		// Lead Tasks
		api.GET("/leads/:id/tasks", middleware.RequirePermission("leads", "view"), leadHandler.GetTasks)
		api.POST("/leads/:id/tasks", middleware.RequirePermission("leads", "update"), leadHandler.CreateTask)
		api.PUT("/leads/:id/tasks/:taskId", middleware.RequirePermission("leads", "update"), leadHandler.UpdateTask)

		// ============= FINANCE MODULE =============

		// Payments & Transactions
		api.POST("/payments/transactions", middleware.RequirePermission("finance", "transactions"), paymentHandler.CreateTransaction)
		api.GET("/payments/transactions", middleware.RequirePermission("finance", "view"), paymentHandler.GetAllTransactions)
		api.GET("/payments/transactions/student/:studentId", middleware.RequirePermission("finance", "view"), paymentHandler.GetTransactionsByStudent)
		api.PUT("/payments/transactions/:id", middleware.RequirePermission("finance", "transactions"), paymentHandler.UpdateTransaction)

		// Student Balances
		api.GET("/payments/balance/:studentId", middleware.RequirePermission("finance", "view"), paymentHandler.GetStudentBalance)
		api.GET("/payments/balances", middleware.RequirePermission("finance", "view"), paymentHandler.GetAllBalances)

		// Tariffs
		api.GET("/tariffs", middleware.RequirePermission("finance", "tariffs"), tariffHandler.GetAll)
		api.GET("/tariffs/:id", middleware.RequirePermission("finance", "tariffs"), tariffHandler.GetByID)
		api.POST("/tariffs", middleware.RequirePermission("finance", "tariffs"), tariffHandler.Create)
		api.PUT("/tariffs/:id", middleware.RequirePermission("finance", "tariffs"), tariffHandler.Update)
		api.DELETE("/tariffs/:id", middleware.RequirePermission("finance", "tariffs"), tariffHandler.Delete)

		// Discounts
		api.GET("/discounts", middleware.RequirePermission("finance", "tariffs"), discountHandler.GetAll)
		api.GET("/discounts/:id", middleware.RequirePermission("finance", "tariffs"), discountHandler.GetByID)
		api.POST("/discounts", middleware.RequirePermission("finance", "tariffs"), discountHandler.Create)
		api.PUT("/discounts/:id", middleware.RequirePermission("finance", "tariffs"), discountHandler.Update)
		api.DELETE("/discounts/:id", middleware.RequirePermission("finance", "tariffs"), discountHandler.Delete)

		// Debts
		api.GET("/debts", middleware.RequirePermission("finance", "debts"), debtHandler.GetAll) // supports ?status= query param
		api.GET("/debts/student/:studentId", middleware.RequirePermission("finance", "debts"), debtHandler.GetByStudent)
		api.POST("/debts", middleware.RequirePermission("finance", "debts"), debtHandler.Create)
		api.PUT("/debts/:id", middleware.RequirePermission("finance", "debts"), debtHandler.Update)
		api.DELETE("/debts/:id", middleware.RequirePermission("finance", "debts"), debtHandler.Delete)

		// ============= EXPORT MODULE =============

		// Export Transactions
		api.GET("/export/transactions/pdf", middleware.RequirePermission("finance", "view"), exportHandler.ExportTransactionsPDF)
		api.GET("/export/transactions/excel", middleware.RequirePermission("finance", "view"), exportHandler.ExportTransactionsExcel)

		// Export Students
		api.GET("/export/students/pdf", middleware.RequirePermission("students", "view"), exportHandler.ExportStudentsPDF)
		api.GET("/export/students/excel", middleware.RequirePermission("students", "view"), exportHandler.ExportStudentsExcel)

		// Export Schedule
		api.GET("/export/schedule/pdf", middleware.RequirePermission("lessons", "view"), exportHandler.ExportSchedulePDF)
		api.GET("/export/schedule/excel", middleware.RequirePermission("lessons", "view"), exportHandler.ExportScheduleExcel)

		// ============= SUBSCRIPTION MODULE =============

		// Subscription Types
		api.GET("/subscriptions/types", middleware.RequirePermission("subscriptions", "view"), subscriptionHandler.GetAllTypes)
		api.GET("/subscriptions/types/:id", middleware.RequirePermission("subscriptions", "view"), subscriptionHandler.GetTypeByID)
		api.POST("/subscriptions/types", middleware.RequirePermission("subscriptions", "create"), subscriptionHandler.CreateType)
		api.PUT("/subscriptions/types/:id", middleware.RequirePermission("subscriptions", "update"), subscriptionHandler.UpdateType)
		api.DELETE("/subscriptions/types/:id", middleware.RequirePermission("subscriptions", "delete"), subscriptionHandler.DeleteType)

		// Student Subscriptions
		api.GET("/subscriptions", middleware.RequirePermission("subscriptions", "view"), subscriptionHandler.GetAllSubscriptions)
		api.GET("/subscriptions/student/:studentId", middleware.RequirePermission("subscriptions", "view"), subscriptionHandler.GetStudentSubscriptions)
		api.GET("/subscriptions/:id", middleware.RequirePermission("subscriptions", "view"), subscriptionHandler.GetSubscriptionByID)
		api.POST("/subscriptions", middleware.RequirePermission("subscriptions", "create"), subscriptionHandler.CreateStudentSubscription)
		api.PUT("/subscriptions/:id", middleware.RequirePermission("subscriptions", "update"), subscriptionHandler.UpdateSubscription)
		api.DELETE("/subscriptions/:id", middleware.RequirePermission("subscriptions", "delete"), subscriptionHandler.DeleteSubscription)

		// Subscription Freezes
		api.GET("/subscriptions/:id/freezes", middleware.RequirePermission("subscriptions", "view"), subscriptionHandler.GetFreezes)
		api.POST("/subscriptions/:id/freezes", middleware.RequirePermission("subscriptions", "freeze"), subscriptionHandler.CreateFreeze)
		api.POST("/subscriptions/:id/freeze", middleware.RequirePermission("subscriptions", "freeze"), subscriptionHandler.FreezeSubscription)
		api.PUT("/subscriptions/freezes", middleware.RequirePermission("subscriptions", "freeze"), subscriptionHandler.UpdateFreeze)

		// Lesson Attendance
		api.POST("/attendance", middleware.RequirePermission("attendance", "mark"), subscriptionHandler.MarkAttendance)
		api.GET("/attendance/lesson/:lessonId", middleware.RequirePermission("attendance", "view"), subscriptionHandler.GetAttendanceByLesson)
		api.GET("/attendance/student/:studentId", middleware.RequirePermission("attendance", "view"), subscriptionHandler.GetAttendanceByStudent)

		// ============= MIGRATION MODULE =============

		// Migration from AlfaCRM
		api.POST("/migration/start", middleware.RequirePermission("migration", "manage"), migrationHandler.StartMigration)
		api.GET("/migration/status", middleware.RequirePermission("migration", "manage"), migrationHandler.GetMigrationStatus)
		api.POST("/migration/test-connection", middleware.RequirePermission("migration", "manage"), migrationHandler.TestAlfaCRMConnection)
		api.POST("/migration/clear-data", middleware.RequirePermission("migration", "manage"), migrationHandler.ClearCompanyData)

		// ============= DASHBOARD MODULE =============

		// Dashboard analytics
		api.GET("/dashboard/stats", middleware.RequirePermission("dashboard", "view"), dashboardHandler.GetStats)
		api.GET("/dashboard/today-lessons", middleware.RequirePermission("dashboard", "view"), dashboardHandler.GetTodayLessons)
		api.GET("/dashboard/revenue-chart", middleware.RequirePermission("dashboard", "view"), dashboardHandler.GetRevenueChart)
		api.GET("/dashboard/attendance-stats", middleware.RequirePermission("dashboard", "view"), dashboardHandler.GetAttendanceStats)
	}

	// Health check endpoint
	router.GET("/health", func(c *gin.Context) {
		// Check database connection
		if err := db.DB.Ping(); err != nil {
			c.JSON(503, gin.H{
				"status":   "unhealthy",
				"database": "disconnected",
				"error":    err.Error(),
			})
			return
		}

		c.JSON(200, gin.H{
			"status":   "ok",
			"database": "connected",
		})
	})

	// Readiness check (more detailed)
	router.GET("/ready", func(c *gin.Context) {
		health := gin.H{
			"status": "ready",
			"checks": gin.H{},
		}

		// Database check
		if err := db.DB.Ping(); err != nil {
			health["status"] = "not ready"
			health["checks"].(gin.H)["database"] = gin.H{
				"status": "failed",
				"error":  err.Error(),
			}
			c.JSON(503, health)
			return
		}
		health["checks"].(gin.H)["database"] = gin.H{"status": "ok"}

		c.JSON(200, health)
	})

	// Prometheus metrics endpoint
	router.GET("/metrics", gin.WrapH(promhttp.Handler()))

	// Start server
	port := os.Getenv("SERVER_PORT")
	if port == "" {
		port = "8080"
	}

	logger.Info("Server starting", zap.String("port", port))
	if err := router.Run(":" + port); err != nil {
		logger.Fatal("Failed to start server", logger.ErrorField(err))
	}
}
