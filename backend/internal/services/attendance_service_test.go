package services

import (
	"database/sql"
	"testing"

	"classmate-central/internal/models"
	"classmate-central/internal/repository"
	"classmate-central/internal/testutil"
)

// setupAttendanceTest creates all necessary dependencies for attendance testing
func setupAttendanceTest(t *testing.T) (*AttendanceService, *sql.DB, *testutil.TestContext) {
	db := testutil.SetupTestDB(t)
	ctx := testutil.NewTestContext(t, db)

	subscriptionRepo := repository.NewSubscriptionRepository(db)
	consumptionRepo := repository.NewSubscriptionConsumptionRepository(db)
	activityRepo := repository.NewActivityRepository(db)
	notificationRepo := repository.NewNotificationRepository(db)
	emailService := NewEmailService()
	studentRepo := repository.NewStudentRepository(db)
	lessonRepo := repository.NewLessonRepository(db)

	service := NewAttendanceService(
		subscriptionRepo,
		consumptionRepo,
		activityRepo,
		notificationRepo,
		emailService,
		studentRepo,
		lessonRepo,
		db,
	)

	return service, db, ctx
}

// TestMarkAttendance_Attended_DeductsLesson tests attendance marking deducts lesson
func TestMarkAttendance_Attended_DeductsLesson(t *testing.T) {
	r := testutil.NewWorkflowReporter(t)
	service, db, ctx := setupAttendanceTest(t)
	defer db.Close()
	defer testutil.CleanupTestDB(t, db)

	var subscription *models.StudentSubscription
	var lesson *models.Lesson
	pricePerLesson := float64(10000)
	totalLessons := 8
	initialBalance := float64(100000)

	r.Step("Create student with balance 100000", func() error {
		testutil.CreateTestStudentBalance(t, db, ctx.Student.ID, initialBalance)
		return nil
	})

	r.Step("Create subscription for 8 lessons (per_lesson, 10000/lesson)", func() error {
		subscription = testutil.CreateTestSubscription(t, db, ctx.Student.ID, ctx.SubType.ID, ctx.Company.ID, ctx.Branch.ID, totalLessons, pricePerLesson)
		return nil
	})

	r.Step("Create lesson for today", func() error {
		lesson = testutil.CreateTestLessonToday(t, db, ctx.Company.ID, ctx.Branch.ID, ctx.Teacher.ID, ctx.Group.ID, ctx.Room.ID)
		testutil.AddStudentToLesson(t, db, lesson.ID, ctx.Student.ID, ctx.Company.ID)
		return nil
	})

	r.Step("Mark attendance - student attended", func() error {
		req := &models.MarkAttendanceRequest{
			LessonID:  lesson.ID,
			StudentID: ctx.Student.ID,
			Status:    "attended",
		}
		_, err := service.MarkAttendanceWithDeduction(req, nil, ctx.Company.ID)
		return err
	})

	r.Step("Verify lesson deducted from subscription", func() error {
		sub := testutil.GetSubscription(t, db, subscription.ID)
		r.Check("used_lessons", 1, sub.UsedLessons, sub.UsedLessons == 1)
		r.Check("remaining_lessons", totalLessons-1, sub.LessonsRemaining, sub.LessonsRemaining == totalLessons-1)
		return nil
	})

	r.Step("Verify balance deducted", func() error {
		balance := testutil.GetStudentBalance(t, db, ctx.Student.ID)
		expectedBalance := initialBalance - pricePerLesson
		r.Check("balance", expectedBalance, balance.Balance, balance.Balance == expectedBalance)
		return nil
	})

	r.Summary()
}

// TestMarkAttendance_FutureLessonBlocked tests future lessons are blocked
func TestMarkAttendance_FutureLessonBlocked(t *testing.T) {
	r := testutil.NewWorkflowReporter(t)
	service, db, ctx := setupAttendanceTest(t)
	defer db.Close()
	defer testutil.CleanupTestDB(t, db)

	var lesson *models.Lesson

	r.Step("Create subscription", func() error {
		testutil.CreateTestSubscription(t, db, ctx.Student.ID, ctx.SubType.ID, ctx.Company.ID, ctx.Branch.ID, 8, 10000)
		return nil
	})

	r.Step("Create lesson for TOMORROW", func() error {
		lesson = testutil.CreateTestLessonTomorrow(t, db, ctx.Company.ID, ctx.Branch.ID, ctx.Teacher.ID, ctx.Group.ID, ctx.Room.ID)
		testutil.AddStudentToLesson(t, db, lesson.ID, ctx.Student.ID, ctx.Company.ID)
		return nil
	})

	r.Step("Try to mark attendance - should fail", func() error {
		req := &models.MarkAttendanceRequest{
			LessonID:  lesson.ID,
			StudentID: ctx.Student.ID,
			Status:    "attended",
		}
		_, err := service.MarkAttendanceWithDeduction(req, nil, ctx.Company.ID)
		if err == nil {
			t.Error("Expected error for future lesson, got nil")
			return nil
		}
		r.Info("Got expected error: %v", err)
		return nil
	})

	r.Summary()
}

// TestMarkAttendance_TodayLessonAllowed tests today's lessons are allowed
func TestMarkAttendance_TodayLessonAllowed(t *testing.T) {
	r := testutil.NewWorkflowReporter(t)
	service, db, ctx := setupAttendanceTest(t)
	defer db.Close()
	defer testutil.CleanupTestDB(t, db)

	var lesson *models.Lesson

	r.Step("Create subscription", func() error {
		testutil.CreateTestSubscription(t, db, ctx.Student.ID, ctx.SubType.ID, ctx.Company.ID, ctx.Branch.ID, 8, 10000)
		testutil.CreateTestStudentBalance(t, db, ctx.Student.ID, 100000)
		return nil
	})

	r.Step("Create lesson for TODAY", func() error {
		lesson = testutil.CreateTestLessonToday(t, db, ctx.Company.ID, ctx.Branch.ID, ctx.Teacher.ID, ctx.Group.ID, ctx.Room.ID)
		testutil.AddStudentToLesson(t, db, lesson.ID, ctx.Student.ID, ctx.Company.ID)
		return nil
	})

	r.Step("Mark attendance - should succeed", func() error {
		req := &models.MarkAttendanceRequest{
			LessonID:  lesson.ID,
			StudentID: ctx.Student.ID,
			Status:    "attended",
		}
		attendance, err := service.MarkAttendanceWithDeduction(req, nil, ctx.Company.ID)
		if err != nil {
			return err
		}
		r.Info("Attendance ID: %d", attendance.ID)
		return nil
	})

	r.Summary()
}

// TestMarkAttendance_DoubleDeductionPrevented tests double deduction prevention
func TestMarkAttendance_DoubleDeductionPrevented(t *testing.T) {
	r := testutil.NewWorkflowReporter(t)
	service, db, ctx := setupAttendanceTest(t)
	defer db.Close()
	defer testutil.CleanupTestDB(t, db)

	var subscriptionID string
	var lesson *models.Lesson

	r.Step("Create subscription and balance", func() error {
		sub := testutil.CreateTestSubscription(t, db, ctx.Student.ID, ctx.SubType.ID, ctx.Company.ID, ctx.Branch.ID, 8, 10000)
		subscriptionID = sub.ID
		testutil.CreateTestStudentBalance(t, db, ctx.Student.ID, 100000)
		r.Info("Created subscription: %s", subscriptionID)
		return nil
	})

	r.Step("Create lesson for today", func() error {
		lesson = testutil.CreateTestLessonToday(t, db, ctx.Company.ID, ctx.Branch.ID, ctx.Teacher.ID, ctx.Group.ID, ctx.Room.ID)
		testutil.AddStudentToLesson(t, db, lesson.ID, ctx.Student.ID, ctx.Company.ID)
		r.Info("Created lesson: %s", lesson.ID)
		return nil
	})

	r.Step("Mark attendance first time", func() error {
		req := &models.MarkAttendanceRequest{
			LessonID:  lesson.ID,
			StudentID: ctx.Student.ID,
			Status:    "attended",
		}
		att, err := service.MarkAttendanceWithDeduction(req, nil, ctx.Company.ID)
		if err != nil {
			return err
		}
		r.Info("Attendance marked, ID: %d", att.ID)
		return nil
	})

	r.Step("Check used_lessons after first marking", func() error {
		// Query directly to avoid fixture issues
		var usedLessons int
		err := db.QueryRow(`SELECT used_lessons FROM student_subscriptions WHERE id = $1`, subscriptionID).Scan(&usedLessons)
		if err != nil {
			t.Logf("Error querying subscription: %v", err)
			return err
		}
		r.Check("used_lessons_after_first", 1, usedLessons, usedLessons == 1)
		return nil
	})

	r.Step("Mark attendance SECOND time (change to missed)", func() error {
		req := &models.MarkAttendanceRequest{
			LessonID:  lesson.ID,
			StudentID: ctx.Student.ID,
			Status:    "missed",
			Reason:    "unexcused",
		}
		_, err := service.MarkAttendanceWithDeduction(req, nil, ctx.Company.ID)
		return err
	})

	r.Step("Verify NOT deducted twice", func() error {
		var usedLessons int
		err := db.QueryRow(`SELECT used_lessons FROM student_subscriptions WHERE id = $1`, subscriptionID).Scan(&usedLessons)
		if err != nil {
			t.Logf("Error querying subscription: %v", err)
			return err
		}
		r.Check("used_lessons_not_doubled", 1, usedLessons, usedLessons == 1)
		return nil
	})

	r.Summary()
}

// TestMarkAttendance_SubscriptionExpires tests subscription expires when lessons reach 0
func TestMarkAttendance_SubscriptionExpires(t *testing.T) {
	r := testutil.NewWorkflowReporter(t)
	service, db, ctx := setupAttendanceTest(t)
	defer db.Close()
	defer testutil.CleanupTestDB(t, db)

	var subscriptionID string
	var lessonID string

	r.Step("Create subscription with 1 lesson", func() error {
		sub := testutil.CreateTestSubscription(t, db, ctx.Student.ID, ctx.SubType.ID, ctx.Company.ID, ctx.Branch.ID, 1, 10000)
		subscriptionID = sub.ID
		testutil.CreateTestStudentBalance(t, db, ctx.Student.ID, 100000)
		r.Info("Created subscription: %s with 1 lesson", subscriptionID)
		return nil
	})

	r.Step("Create lesson for today", func() error {
		lesson := testutil.CreateTestLessonToday(t, db, ctx.Company.ID, ctx.Branch.ID, ctx.Teacher.ID, ctx.Group.ID, ctx.Room.ID)
		lessonID = lesson.ID
		testutil.AddStudentToLesson(t, db, lessonID, ctx.Student.ID, ctx.Company.ID)
		r.Info("Created lesson: %s", lessonID)
		return nil
	})

	r.Step("Mark attendance", func() error {
		req := &models.MarkAttendanceRequest{
			LessonID:  lessonID,
			StudentID: ctx.Student.ID,
			Status:    "attended",
		}
		att, err := service.MarkAttendanceWithDeduction(req, nil, ctx.Company.ID)
		if err != nil {
			return err
		}
		r.Info("Attendance marked, ID: %d", att.ID)
		return nil
	})

	r.Step("Verify subscription expired", func() error {
		var status string
		var usedLessons, totalLessons int
		err := db.QueryRow(`
			SELECT status, used_lessons, total_lessons 
			FROM student_subscriptions WHERE id = $1
		`, subscriptionID).Scan(&status, &usedLessons, &totalLessons)
		if err != nil {
			t.Logf("Error querying subscription: %v", err)
			return err
		}
		remaining := totalLessons - usedLessons
		r.Check("status", "expired", status, status == "expired")
		r.Check("remaining_lessons", 0, remaining, remaining == 0)
		return nil
	})

	r.Summary()
}

// TestMarkAttendance_NoSubscription tests attendance works without subscription
func TestMarkAttendance_NoSubscription(t *testing.T) {
	r := testutil.NewWorkflowReporter(t)
	service, db, ctx := setupAttendanceTest(t)
	defer db.Close()
	defer testutil.CleanupTestDB(t, db)

	var lesson *models.Lesson
	var attendance *models.LessonAttendance

	r.Step("Create lesson WITHOUT subscription", func() error {
		lesson = testutil.CreateTestLessonToday(t, db, ctx.Company.ID, ctx.Branch.ID, ctx.Teacher.ID, ctx.Group.ID, ctx.Room.ID)
		testutil.AddStudentToLesson(t, db, lesson.ID, ctx.Student.ID, ctx.Company.ID)
		return nil
	})

	r.Step("Mark attendance - should succeed without deduction", func() error {
		req := &models.MarkAttendanceRequest{
			LessonID:  lesson.ID,
			StudentID: ctx.Student.ID,
			Status:    "attended",
		}
		var err error
		attendance, err = service.MarkAttendanceWithDeduction(req, nil, ctx.Company.ID)
		return err
	})

	r.Step("Verify attendance record returned", func() error {
		if attendance == nil {
			t.Error("Attendance record is nil")
			return nil
		}
		r.Check("attendance_status", "attended", attendance.Status, attendance.Status == "attended")
		r.Check("attendance_id_positive", true, attendance.ID > 0, attendance.ID > 0)
		return nil
	})

	r.Summary()
}
