package main

import (
	"log"
	"os"

	"classmate-central/internal/database"
	"classmate-central/internal/handlers"
	"classmate-central/internal/middleware"
	"classmate-central/internal/repository"
	"classmate-central/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Initialize database
	db, err := database.NewDatabase()
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Run migrations
	if err := db.RunMigrations(); err != nil {
		log.Printf("Warning: Failed to run migrations: %v", err)
		log.Println("Continuing with existing database schema...")
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
	debtRepo := repository.NewDebtRepository(db.DB)
	subscriptionRepo := repository.NewSubscriptionRepository(db.DB)
	activityRepo := repository.NewActivityRepository(db.DB)
	notificationRepo := repository.NewNotificationRepository(db.DB)

	// Initialize services
	activityService := services.NewActivityService(activityRepo)
	_ = services.NewNotificationService(notificationRepo, debtRepo, subscriptionRepo) // Can be used for scheduled tasks
	attendanceService := services.NewAttendanceService(subscriptionRepo, activityRepo, notificationRepo, db.DB)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(userRepo, companyRepo)
	teacherHandler := handlers.NewTeacherHandler(teacherRepo)
	studentHandler := handlers.NewStudentHandler(studentRepo, activityRepo, notificationRepo, activityService)
	groupHandler := handlers.NewGroupHandler(groupRepo)
	lessonHandler := handlers.NewLessonHandler(lessonRepo)
	settingsHandler := handlers.NewSettingsHandler(settingsRepo)
	roomHandler := handlers.NewRoomHandler(roomRepo)
	leadHandler := handlers.NewLeadHandler(leadRepo)
	paymentHandler := handlers.NewPaymentHandler(paymentRepo, activityService)
	tariffHandler := handlers.NewTariffHandler(tariffRepo)
	debtHandler := handlers.NewDebtHandler(debtRepo)
	subscriptionHandler := handlers.NewSubscriptionHandler(subscriptionRepo, attendanceService, activityService)
	migrationHandler := handlers.NewMigrationHandler(teacherRepo, studentRepo, groupRepo, roomRepo, lessonRepo, subscriptionRepo)

	// Initialize Gin
	router := gin.Default()

	// Middleware
	router.Use(middleware.CORSMiddleware())

	// Public routes
	auth := router.Group("/api/auth")
	{
		auth.POST("/register", authHandler.Register)
		auth.POST("/login", authHandler.Login)
		auth.POST("/refresh", authHandler.RefreshToken)
	}

	// Protected routes
	api := router.Group("/api")
	api.Use(middleware.AuthMiddleware())
	api.Use(middleware.CompanyMiddleware(db.DB))
	{
		// Auth
		api.GET("/auth/me", authHandler.Me)

		// Teachers
		api.GET("/teachers", teacherHandler.GetAll)
		api.GET("/teachers/:id", teacherHandler.GetByID)
		api.POST("/teachers", teacherHandler.Create)
		api.PUT("/teachers/:id", teacherHandler.Update)
		api.DELETE("/teachers/:id", teacherHandler.Delete)

		// Students
		api.GET("/students", studentHandler.GetAll)
		api.GET("/students/:id", studentHandler.GetByID)
		api.POST("/students", studentHandler.Create)
		api.PUT("/students/:id", studentHandler.Update)
		api.DELETE("/students/:id", studentHandler.Delete)

		// Student Activities, Notes, and Status
		api.GET("/students/:id/activities", studentHandler.GetActivities)
		api.POST("/students/:id/notes", studentHandler.AddNote)
		api.GET("/students/:id/notes", studentHandler.GetNotes)
		api.PUT("/students/:id/status", studentHandler.UpdateStatus)
		api.GET("/students/:id/attendance", studentHandler.GetAttendanceJournal)
		api.GET("/students/:id/notifications", studentHandler.GetNotifications)
		api.PUT("/notifications/:notificationId/read", studentHandler.MarkNotificationRead)

		// Groups
		api.GET("/groups", groupHandler.GetAll)
		api.GET("/groups/:id", groupHandler.GetByID)
		api.POST("/groups", groupHandler.Create)
		api.PUT("/groups/:id", groupHandler.Update)
		api.DELETE("/groups/:id", groupHandler.Delete)

		// Lessons
		api.GET("/lessons", lessonHandler.GetAll)
		api.GET("/lessons/:id", lessonHandler.GetByID)
		api.POST("/lessons", lessonHandler.Create)
		api.PUT("/lessons/:id", lessonHandler.Update)
		api.DELETE("/lessons/:id", lessonHandler.Delete)

		// Settings
		api.GET("/settings", settingsHandler.Get)
		api.PUT("/settings", settingsHandler.Update)

		// Rooms
		api.GET("/rooms", roomHandler.GetAll)
		api.GET("/rooms/:id", roomHandler.GetByID)
		api.POST("/rooms", roomHandler.Create)
		api.PUT("/rooms/:id", roomHandler.Update)
		api.DELETE("/rooms/:id", roomHandler.Delete)

		// Leads
		api.GET("/leads", leadHandler.GetAll)
		api.GET("/leads/stats", leadHandler.GetConversionStats)
		api.GET("/leads/:id", leadHandler.GetByID)
		api.POST("/leads", leadHandler.Create)
		api.PUT("/leads/:id", leadHandler.Update)
		api.DELETE("/leads/:id", leadHandler.Delete)

		// Lead Activities
		api.GET("/leads/:id/activities", leadHandler.GetActivities)
		api.POST("/leads/:id/activities", leadHandler.AddActivity)

		// Lead Tasks
		api.GET("/leads/:id/tasks", leadHandler.GetTasks)
		api.POST("/leads/:id/tasks", leadHandler.CreateTask)
		api.PUT("/leads/:id/tasks/:taskId", leadHandler.UpdateTask)

		// ============= FINANCE MODULE =============

		// Payments & Transactions
		api.POST("/payments/transactions", paymentHandler.CreateTransaction)
		api.GET("/payments/transactions", paymentHandler.GetAllTransactions)
		api.GET("/payments/transactions/student/:studentId", paymentHandler.GetTransactionsByStudent)

		// Student Balances
		api.GET("/payments/balance/:studentId", paymentHandler.GetStudentBalance)
		api.GET("/payments/balances", paymentHandler.GetAllBalances)

		// Tariffs
		api.GET("/tariffs", tariffHandler.GetAll)
		api.GET("/tariffs/:id", tariffHandler.GetByID)
		api.POST("/tariffs", tariffHandler.Create)
		api.PUT("/tariffs/:id", tariffHandler.Update)
		api.DELETE("/tariffs/:id", tariffHandler.Delete)

		// Debts
		api.GET("/debts", debtHandler.GetAll) // supports ?status= query param
		api.GET("/debts/student/:studentId", debtHandler.GetByStudent)
		api.POST("/debts", debtHandler.Create)
		api.PUT("/debts/:id", debtHandler.Update)
		api.DELETE("/debts/:id", debtHandler.Delete)

		// ============= SUBSCRIPTION MODULE =============

		// Subscription Types
		api.GET("/subscriptions/types", subscriptionHandler.GetAllTypes)
		api.GET("/subscriptions/types/:id", subscriptionHandler.GetTypeByID)
		api.POST("/subscriptions/types", subscriptionHandler.CreateType)
		api.PUT("/subscriptions/types/:id", subscriptionHandler.UpdateType)
		api.DELETE("/subscriptions/types/:id", subscriptionHandler.DeleteType)

		// Student Subscriptions
		api.GET("/subscriptions", subscriptionHandler.GetAllSubscriptions)
		api.GET("/subscriptions/student/:studentId", subscriptionHandler.GetStudentSubscriptions)
		api.GET("/subscriptions/:id", subscriptionHandler.GetSubscriptionByID)
		api.POST("/subscriptions", subscriptionHandler.CreateStudentSubscription)
		api.PUT("/subscriptions/:id", subscriptionHandler.UpdateSubscription)
		api.DELETE("/subscriptions/:id", subscriptionHandler.DeleteSubscription)

		// Subscription Freezes
		api.GET("/subscriptions/:id/freezes", subscriptionHandler.GetFreezes)
		api.POST("/subscriptions/:id/freezes", subscriptionHandler.CreateFreeze)
		api.PUT("/subscriptions/freezes", subscriptionHandler.UpdateFreeze)

		// Lesson Attendance
		api.POST("/attendance", subscriptionHandler.MarkAttendance)
		api.GET("/attendance/lesson/:lessonId", subscriptionHandler.GetAttendanceByLesson)
		api.GET("/attendance/student/:studentId", subscriptionHandler.GetAttendanceByStudent)

		// ============= MIGRATION MODULE =============

		// Migration from AlfaCRM
		api.POST("/migration/start", migrationHandler.StartMigration)
		api.GET("/migration/status", migrationHandler.GetMigrationStatus)
		api.POST("/migration/test-connection", migrationHandler.TestAlfaCRMConnection)
		api.POST("/migration/clear-data", migrationHandler.ClearCompanyData)
	}

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// Start server
	port := os.Getenv("SERVER_PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
