package testutil

import (
	"database/sql"
	"fmt"
	"testing"
	"time"

	"classmate-central/internal/models"

	"github.com/google/uuid"
)

// TestContext holds common test data references
type TestContext struct {
	Company      *models.Company
	Branch       *models.Branch
	User         *models.User
	Teacher      *models.Teacher
	Student      *models.Student
	Group        *models.Group
	Lesson       *models.Lesson
	Subscription *models.StudentSubscription
	SubType      *models.SubscriptionType
	Room         *models.Room
}

// NewTestContext creates a full test context with all basic entities
func NewTestContext(t *testing.T, db *sql.DB) *TestContext {
	ctx := &TestContext{}

	ctx.Company = CreateTestCompany(t, db)
	ctx.Branch = CreateTestBranch(t, db, ctx.Company.ID)
	ctx.User = CreateTestUser(t, db, ctx.Company.ID, ctx.Branch.ID)
	ctx.Room = CreateTestRoom(t, db, ctx.Company.ID, ctx.Branch.ID)
	ctx.Teacher = CreateTestTeacher(t, db, ctx.Company.ID, ctx.Branch.ID)
	ctx.Student = CreateTestStudent(t, db, ctx.Company.ID, ctx.Branch.ID)
	ctx.Group = CreateTestGroup(t, db, ctx.Company.ID, ctx.Branch.ID, ctx.Teacher.ID, ctx.Room.ID)
	ctx.SubType = CreateTestSubscriptionType(t, db, ctx.Company.ID, ctx.Branch.ID)

	return ctx
}

// CreateTestCompany creates a test company
func CreateTestCompany(t *testing.T, db *sql.DB) *models.Company {
	id := uuid.New().String()
	now := time.Now()

	_, err := db.Exec(`
		INSERT INTO companies (id, name, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5)
	`, id, "Test Company", "active", now, now)
	if err != nil {
		t.Fatalf("Failed to create test company: %v", err)
	}

	return &models.Company{
		ID:        id,
		Name:      "Test Company",
		Status:    "active",
		CreatedAt: now,
		UpdatedAt: now,
	}
}

// CreateTestBranch creates a test branch for a company
func CreateTestBranch(t *testing.T, db *sql.DB, companyID string) *models.Branch {
	id := uuid.New().String()
	now := time.Now()
	branchName := fmt.Sprintf("Test Branch %s", id[:8]) // Unique name per branch

	_, err := db.Exec(`
		INSERT INTO branches (id, name, company_id, address, phone, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`, id, branchName, companyID, "Test Address", "+77001234567", "active", now, now)
	if err != nil {
		t.Fatalf("Failed to create test branch: %v", err)
	}

	return &models.Branch{
		ID:        id,
		Name:      branchName,
		CompanyID: companyID,
		Address:   "Test Address",
		Phone:     "+77001234567",
		Status:    "active",
		CreatedAt: now,
		UpdatedAt: now,
	}
}

// CreateTestUser creates a test user
func CreateTestUser(t *testing.T, db *sql.DB, companyID, branchID string) *models.User {
	now := time.Now()
	email := fmt.Sprintf("test-%s@example.com", uuid.New().String()[:8])

	var id int
	err := db.QueryRow(`
		INSERT INTO users (email, password, name, company_id, is_email_verified, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id
	`, email, "hashedpassword", "Test User", companyID, true, now, now).Scan(&id)
	if err != nil {
		t.Fatalf("Failed to create test user: %v", err)
	}

	// Add user to branch
	_, err = db.Exec(`
		INSERT INTO user_branches (user_id, branch_id, company_id, assigned_at)
		VALUES ($1, $2, $3, $4)
	`, id, branchID, companyID, now)
	if err != nil {
		t.Fatalf("Failed to assign user to branch: %v", err)
	}

	return &models.User{
		ID:              id,
		Email:           email,
		Name:            "Test User",
		CompanyID:       companyID,
		IsEmailVerified: true,
		CreatedAt:       now,
		UpdatedAt:       now,
	}
}

// CreateTestRoom creates a test room
func CreateTestRoom(t *testing.T, db *sql.DB, companyID, branchID string) *models.Room {
	id := uuid.New().String()

	_, err := db.Exec(`
		INSERT INTO rooms (id, name, capacity, color, status, company_id, branch_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`, id, "Test Room", 20, "#3498db", "active", companyID, branchID)
	if err != nil {
		t.Fatalf("Failed to create test room: %v", err)
	}

	return &models.Room{
		ID:        id,
		Name:      "Test Room",
		Capacity:  20,
		Color:     "#3498db",
		Status:    "active",
		CompanyID: companyID,
		BranchID:  branchID,
	}
}

// CreateTestTeacher creates a test teacher
func CreateTestTeacher(t *testing.T, db *sql.DB, companyID, branchID string) *models.Teacher {
	id := uuid.New().String()
	email := fmt.Sprintf("teacher-%s@example.com", uuid.New().String()[:8])

	_, err := db.Exec(`
		INSERT INTO teachers (id, name, subject, email, phone, status, workload, company_id, branch_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`, id, "Test Teacher", "Mathematics", email, "+77009876543", "active", 20, companyID, branchID)
	if err != nil {
		t.Fatalf("Failed to create test teacher: %v", err)
	}

	return &models.Teacher{
		ID:        id,
		Name:      "Test Teacher",
		Subject:   "Mathematics",
		Email:     email,
		Phone:     "+77009876543",
		Status:    "active",
		Workload:  20,
		CompanyID: companyID,
		BranchID:  branchID,
	}
}

// CreateTestStudent creates a test student
func CreateTestStudent(t *testing.T, db *sql.DB, companyID, branchID string) *models.Student {
	id := uuid.New().String()
	email := fmt.Sprintf("student-%s@example.com", uuid.New().String()[:8])
	now := time.Now().Format(time.RFC3339)

	_, err := db.Exec(`
		INSERT INTO students (id, name, age, email, phone, status, company_id, branch_id, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`, id, "Test Student", 18, email, "+77001112233", "active", companyID, branchID, now)
	if err != nil {
		t.Fatalf("Failed to create test student: %v", err)
	}

	return &models.Student{
		ID:        id,
		Name:      "Test Student",
		Age:       18,
		Email:     &email,
		Phone:     "+77001112233",
		Status:    "active",
		CompanyID: companyID,
		BranchID:  branchID,
		CreatedAt: now,
	}
}

// CreateTestStudentBalance creates or updates student balance
func CreateTestStudentBalance(t *testing.T, db *sql.DB, studentID string, balance float64) *models.StudentBalance {
	_, err := db.Exec(`
		INSERT INTO student_balance (student_id, balance, version)
		VALUES ($1, $2, 0)
		ON CONFLICT (student_id) DO UPDATE SET balance = $2
	`, studentID, balance)
	if err != nil {
		t.Fatalf("Failed to create student balance: %v", err)
	}

	return &models.StudentBalance{
		StudentID: studentID,
		Balance:   balance,
		Version:   0,
	}
}

// CreateTestGroup creates a test group
func CreateTestGroup(t *testing.T, db *sql.DB, companyID, branchID, teacherID, roomID string) *models.Group {
	id := uuid.New().String()

	_, err := db.Exec(`
		INSERT INTO groups (id, name, subject, teacher_id, room_id, schedule, description, status, color, company_id, branch_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`, id, "Test Group", "Mathematics", teacherID, roomID, "Mon,Wed 10:00-11:30", "Test group description", "active", "#e74c3c", companyID, branchID)
	if err != nil {
		t.Fatalf("Failed to create test group: %v", err)
	}

	return &models.Group{
		ID:          id,
		Name:        "Test Group",
		Subject:     "Mathematics",
		TeacherID:   teacherID,
		RoomID:      roomID,
		Schedule:    "Mon,Wed 10:00-11:30",
		Description: "Test group description",
		Status:      "active",
		Color:       "#e74c3c",
		CompanyID:   companyID,
		BranchID:    branchID,
	}
}

// CreateTestLesson creates a test lesson
func CreateTestLesson(t *testing.T, db *sql.DB, companyID, branchID, teacherID, groupID, roomID string, start time.Time) *models.Lesson {
	id := uuid.New().String()
	end := start.Add(90 * time.Minute)

	_, err := db.Exec(`
		INSERT INTO lessons (id, title, teacher_id, group_id, subject, lesson_type, start_time, end_time, room, room_id, status, company_id, branch_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
	`, id, "Test Lesson", teacherID, groupID, "Mathematics", "group", start, end, "Test Room", roomID, "scheduled", companyID, branchID)
	if err != nil {
		t.Fatalf("Failed to create test lesson: %v", err)
	}

	return &models.Lesson{
		ID:         id,
		Title:      "Test Lesson",
		TeacherID:  teacherID,
		GroupID:    groupID,
		Subject:    "Mathematics",
		LessonType: "group",
		Start:      start,
		End:        end,
		Room:       "Test Room",
		RoomID:     roomID,
		Status:     "scheduled",
		CompanyID:  companyID,
		BranchID:   branchID,
	}
}

// CreateTestLessonToday creates a lesson for today
func CreateTestLessonToday(t *testing.T, db *sql.DB, companyID, branchID, teacherID, groupID, roomID string) *models.Lesson {
	now := time.Now()
	start := time.Date(now.Year(), now.Month(), now.Day(), 10, 0, 0, 0, now.Location())
	return CreateTestLesson(t, db, companyID, branchID, teacherID, groupID, roomID, start)
}

// CreateTestLessonYesterday creates a lesson for yesterday
func CreateTestLessonYesterday(t *testing.T, db *sql.DB, companyID, branchID, teacherID, groupID, roomID string) *models.Lesson {
	now := time.Now()
	yesterday := now.AddDate(0, 0, -1)
	start := time.Date(yesterday.Year(), yesterday.Month(), yesterday.Day(), 10, 0, 0, 0, yesterday.Location())
	return CreateTestLesson(t, db, companyID, branchID, teacherID, groupID, roomID, start)
}

// CreateTestLessonTomorrow creates a lesson for tomorrow
func CreateTestLessonTomorrow(t *testing.T, db *sql.DB, companyID, branchID, teacherID, groupID, roomID string) *models.Lesson {
	now := time.Now()
	tomorrow := now.AddDate(0, 0, 1)
	start := time.Date(tomorrow.Year(), tomorrow.Month(), tomorrow.Day(), 10, 0, 0, 0, tomorrow.Location())
	return CreateTestLesson(t, db, companyID, branchID, teacherID, groupID, roomID, start)
}

// AddStudentToLesson adds a student to a lesson
func AddStudentToLesson(t *testing.T, db *sql.DB, lessonID, studentID, companyID string) {
	_, err := db.Exec(`
		INSERT INTO lesson_students (lesson_id, student_id, company_id)
		VALUES ($1, $2, $3)
		ON CONFLICT DO NOTHING
	`, lessonID, studentID, companyID)
	if err != nil {
		t.Fatalf("Failed to add student to lesson: %v", err)
	}
}

// AddStudentToGroup adds a student to a group
func AddStudentToGroup(t *testing.T, db *sql.DB, studentID, groupID, companyID, branchID string) {
	now := time.Now()
	_, err := db.Exec(`
		INSERT INTO enrollment (student_id, group_id, joined_at, company_id, branch_id, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT DO NOTHING
	`, studentID, groupID, now, companyID, branchID, now)
	if err != nil {
		t.Fatalf("Failed to add student to group: %v", err)
	}
}

// CreateTestSubscriptionType creates a subscription type
func CreateTestSubscriptionType(t *testing.T, db *sql.DB, companyID, branchID string) *models.SubscriptionType {
	return CreateTestSubscriptionTypeWithParams(t, db, companyID, branchID, 8, 30, 80000, "per_lesson")
}

// CreateTestSubscriptionTypeWithParams creates a subscription type with custom parameters
func CreateTestSubscriptionTypeWithParams(t *testing.T, db *sql.DB, companyID, branchID string, lessonsCount, validityDays int, price float64, billingType string) *models.SubscriptionType {
	id := uuid.New().String()
	now := time.Now()

	_, err := db.Exec(`
		INSERT INTO subscription_types (id, name, lessons_count, validity_days, price, can_freeze, billing_type, description, created_at, company_id, branch_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`, id, "Test Subscription", lessonsCount, validityDays, price, true, billingType, "Test subscription type", now, companyID, branchID)
	if err != nil {
		t.Fatalf("Failed to create subscription type: %v", err)
	}

	return &models.SubscriptionType{
		ID:           id,
		Name:         "Test Subscription",
		LessonsCount: lessonsCount,
		ValidityDays: &validityDays,
		Price:        price,
		CanFreeze:    true,
		BillingType:  billingType,
		Description:  "Test subscription type",
		CreatedAt:    now,
		CompanyID:    companyID,
		BranchID:     branchID,
	}
}

// CreateTestSubscription creates a student subscription
func CreateTestSubscription(t *testing.T, db *sql.DB, studentID, subscriptionTypeID, companyID, branchID string, totalLessons int, pricePerLesson float64) *models.StudentSubscription {
	id := uuid.New().String()
	now := time.Now()
	endDate := now.AddDate(0, 0, 30)
	totalPrice := float64(totalLessons) * pricePerLesson

	_, err := db.Exec(`
		INSERT INTO student_subscriptions (
			id, student_id, subscription_type_id, 
			total_lessons, used_lessons, total_price, price_per_lesson,
			start_date, end_date, status, freeze_days_remaining,
			created_at, updated_at, company_id, branch_id, version
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
	`, id, studentID, subscriptionTypeID,
		totalLessons, 0, totalPrice, pricePerLesson,
		now, endDate, "active", 7,
		now, now, companyID, branchID, 0)
	if err != nil {
		t.Fatalf("Failed to create subscription: %v", err)
	}

	return &models.StudentSubscription{
		ID:                  id,
		StudentID:           studentID,
		SubscriptionTypeID:  subscriptionTypeID,
		TotalLessons:        totalLessons,
		UsedLessons:         0,
		LessonsRemaining:    totalLessons,
		TotalPrice:          totalPrice,
		PricePerLesson:      pricePerLesson,
		StartDate:           now,
		EndDate:             &endDate,
		Status:              "active",
		FreezeDaysRemaining: 7,
		CreatedAt:           now,
		UpdatedAt:           now,
		CompanyID:           companyID,
		BranchID:            branchID,
		Version:             0,
	}
}

// CreateTestDiscount creates a discount
func CreateTestDiscount(t *testing.T, db *sql.DB, companyID, branchID string, discountType string, value float64) *models.Discount {
	id := uuid.New().String()
	now := time.Now()

	_, err := db.Exec(`
		INSERT INTO discounts (id, name, description, type, value, is_active, created_at, company_id, branch_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`, id, "Test Discount", "Test discount description", discountType, value, true, now, companyID, branchID)
	if err != nil {
		t.Fatalf("Failed to create discount: %v", err)
	}

	return &models.Discount{
		ID:          id,
		Name:        "Test Discount",
		Description: "Test discount description",
		Type:        discountType,
		Value:       value,
		IsActive:    true,
		CreatedAt:   now,
		CompanyID:   companyID,
		BranchID:    branchID,
	}
}

// Helper functions to retrieve data for assertions

// GetSubscription retrieves a subscription by ID
func GetSubscription(t *testing.T, db *sql.DB, subscriptionID string) *models.StudentSubscription {
	var sub models.StudentSubscription
	var endDate sql.NullTime

	err := db.QueryRow(`
		SELECT id, student_id, subscription_type_id, total_lessons, used_lessons, 
		       (total_lessons - used_lessons) as remaining_lessons,
		       total_price, price_per_lesson, start_date, end_date, status, 
		       freeze_days_remaining, version
		FROM student_subscriptions WHERE id = $1
	`, subscriptionID).Scan(
		&sub.ID, &sub.StudentID, &sub.SubscriptionTypeID,
		&sub.TotalLessons, &sub.UsedLessons, &sub.LessonsRemaining,
		&sub.TotalPrice, &sub.PricePerLesson, &sub.StartDate, &endDate,
		&sub.Status, &sub.FreezeDaysRemaining, &sub.Version,
	)
	if err != nil {
		t.Fatalf("Failed to get subscription: %v", err)
	}
	if endDate.Valid {
		sub.EndDate = &endDate.Time
	}

	return &sub
}

// GetStudentBalance retrieves student balance
func GetStudentBalance(t *testing.T, db *sql.DB, studentID string) *models.StudentBalance {
	var balance models.StudentBalance

	err := db.QueryRow(`
		SELECT student_id, balance, version FROM student_balance WHERE student_id = $1
	`, studentID).Scan(&balance.StudentID, &balance.Balance, &balance.Version)
	if err != nil {
		if err == sql.ErrNoRows {
			return &models.StudentBalance{StudentID: studentID, Balance: 0, Version: 0}
		}
		t.Fatalf("Failed to get student balance: %v", err)
	}

	return &balance
}

// GetLesson retrieves a lesson by ID
func GetLesson(t *testing.T, db *sql.DB, lessonID, companyID string) *models.Lesson {
	var lesson models.Lesson
	var groupID sql.NullString

	err := db.QueryRow(`
		SELECT id, title, teacher_id, group_id, subject, lesson_type, start_time, end_time, room, room_id, status
		FROM lessons WHERE id = $1 AND company_id = $2
	`, lessonID, companyID).Scan(
		&lesson.ID, &lesson.Title, &lesson.TeacherID, &groupID, &lesson.Subject,
		&lesson.LessonType, &lesson.Start, &lesson.End, &lesson.Room, &lesson.RoomID, &lesson.Status,
	)
	if err != nil {
		t.Fatalf("Failed to get lesson: %v", err)
	}
	if groupID.Valid {
		lesson.GroupID = groupID.String
	}

	return &lesson
}

// GetNotificationCount returns count of notifications for a student by type
func GetNotificationCount(t *testing.T, db *sql.DB, studentID, notificationType string) int {
	var count int
	err := db.QueryRow(`
		SELECT COUNT(*) FROM notifications WHERE student_id = $1 AND type = $2
	`, studentID, notificationType).Scan(&count)
	if err != nil {
		t.Fatalf("Failed to count notifications: %v", err)
	}
	return count
}

// GetAttendanceRecord retrieves attendance record
func GetAttendanceRecord(t *testing.T, db *sql.DB, lessonID, studentID string) *models.LessonAttendance {
	var att models.LessonAttendance
	var subscriptionID sql.NullString
	var reason, notes sql.NullString

	err := db.QueryRow(`
		SELECT id, lesson_id, student_id, subscription_id, status, reason, notes, marked_at
		FROM lesson_attendance WHERE lesson_id = $1 AND student_id = $2
		ORDER BY id DESC LIMIT 1
	`, lessonID, studentID).Scan(
		&att.ID, &att.LessonID, &att.StudentID, &subscriptionID,
		&att.Status, &reason, &notes, &att.MarkedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			// Try to debug - check if any records exist
			var count int
			db.QueryRow(`SELECT COUNT(*) FROM lesson_attendance WHERE lesson_id = $1`, lessonID).Scan(&count)
			t.Logf("DEBUG: lesson_attendance records for lesson %s: %d", lessonID, count)
			return nil
		}
		t.Logf("Failed to get attendance: %v", err)
		return nil
	}
	if subscriptionID.Valid {
		att.SubscriptionID = &subscriptionID.String
	}
	if reason.Valid {
		att.Reason = reason.String
	}
	if notes.Valid {
		att.Notes = notes.String
	}

	return &att
}

// GetTransactionCount returns count of transactions for a student
func GetTransactionCount(t *testing.T, db *sql.DB, studentID, transactionType string) int {
	var count int
	err := db.QueryRow(`
		SELECT COUNT(*) FROM payment_transactions WHERE student_id = $1 AND type = $2
	`, studentID, transactionType).Scan(&count)
	if err != nil {
		t.Fatalf("Failed to count transactions: %v", err)
	}
	return count
}

// CreateTestPaymentTransaction creates a payment transaction
func CreateTestPaymentTransaction(t *testing.T, db *sql.DB, studentID, companyID, branchID, txType, paymentMethod string, amount float64) *models.PaymentTransaction {
	now := time.Now()
	var id int

	err := db.QueryRow(`
		INSERT INTO payment_transactions (student_id, amount, type, payment_method, description, created_at, company_id, branch_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id
	`, studentID, amount, txType, paymentMethod, "Test transaction", now, companyID, branchID).Scan(&id)
	if err != nil {
		t.Fatalf("Failed to create payment transaction: %v", err)
	}

	return &models.PaymentTransaction{
		ID:            id,
		StudentID:     studentID,
		Amount:        amount,
		Type:          txType,
		PaymentMethod: paymentMethod,
		Description:   "Test transaction",
		CreatedAt:     now,
		CompanyID:     companyID,
		BranchID:      branchID,
	}
}

// AssignDiscountToStudent assigns a discount to a student
func AssignDiscountToStudent(t *testing.T, db *sql.DB, studentID, discountID, companyID, branchID string) *models.StudentDiscount {
	now := time.Now()
	expiresAt := now.AddDate(0, 1, 0) // Expires in 1 month
	var id int

	err := db.QueryRow(`
		INSERT INTO student_discounts (student_id, discount_id, applied_at, expires_at, is_active, created_at, company_id, branch_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id
	`, studentID, discountID, now, expiresAt, true, now, companyID, branchID).Scan(&id)
	if err != nil {
		t.Fatalf("Failed to assign discount to student: %v", err)
	}

	return &models.StudentDiscount{
		ID:         id,
		StudentID:  studentID,
		DiscountID: discountID,
		AppliedAt:  now,
		ExpiresAt:  &expiresAt,
		IsActive:   true,
		CreatedAt:  now,
		CompanyID:  companyID,
		BranchID:   branchID,
	}
}

// FreezeTestSubscription creates a freeze record for a subscription
func FreezeTestSubscription(t *testing.T, db *sql.DB, subscriptionID string, freezeDays int) *models.SubscriptionFreeze {
	now := time.Now()
	freezeEnd := now.AddDate(0, 0, freezeDays)
	var id int

	err := db.QueryRow(`
		INSERT INTO subscription_freezes (subscription_id, freeze_start, freeze_end, reason, created_at)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id
	`, subscriptionID, now, freezeEnd, "Test freeze", now).Scan(&id)
	if err != nil {
		t.Fatalf("Failed to create subscription freeze: %v", err)
	}

	// Update subscription status to frozen
	_, err = db.Exec(`UPDATE student_subscriptions SET status = 'frozen' WHERE id = $1`, subscriptionID)
	if err != nil {
		t.Fatalf("Failed to update subscription status: %v", err)
	}

	return &models.SubscriptionFreeze{
		ID:             id,
		SubscriptionID: subscriptionID,
		FreezeStart:    now,
		FreezeEnd:      &freezeEnd,
		Reason:         "Test freeze",
		CreatedAt:      now,
	}
}

// GetPaymentTransaction retrieves a payment transaction by ID
func GetPaymentTransaction(t *testing.T, db *sql.DB, transactionID int) *models.PaymentTransaction {
	var tx models.PaymentTransaction

	err := db.QueryRow(`
		SELECT id, student_id, amount, type, payment_method, description, created_at, company_id, branch_id
		FROM payment_transactions WHERE id = $1
	`, transactionID).Scan(
		&tx.ID, &tx.StudentID, &tx.Amount, &tx.Type, &tx.PaymentMethod,
		&tx.Description, &tx.CreatedAt, &tx.CompanyID, &tx.BranchID,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil
		}
		t.Fatalf("Failed to get payment transaction: %v", err)
	}

	return &tx
}

// GetAllTransactionsForStudent retrieves all transactions for a student
func GetAllTransactionsForStudent(t *testing.T, db *sql.DB, studentID string) []models.PaymentTransaction {
	rows, err := db.Query(`
		SELECT id, student_id, amount, type, payment_method, description, created_at, company_id, COALESCE(branch_id, '')
		FROM payment_transactions WHERE student_id = $1 ORDER BY id
	`, studentID)
	if err != nil {
		t.Fatalf("Failed to get transactions: %v", err)
	}
	defer rows.Close()

	var transactions []models.PaymentTransaction
	for rows.Next() {
		var tx models.PaymentTransaction
		err := rows.Scan(
			&tx.ID, &tx.StudentID, &tx.Amount, &tx.Type, &tx.PaymentMethod,
			&tx.Description, &tx.CreatedAt, &tx.CompanyID, &tx.BranchID,
		)
		if err != nil {
			t.Fatalf("Failed to scan transaction: %v", err)
		}
		transactions = append(transactions, tx)
	}

	return transactions
}

// GetSubscriptionFreeze retrieves a freeze record
func GetSubscriptionFreeze(t *testing.T, db *sql.DB, freezeID int) *models.SubscriptionFreeze {
	var freeze models.SubscriptionFreeze
	var freezeEnd sql.NullTime

	err := db.QueryRow(`
		SELECT id, subscription_id, freeze_start, freeze_end, reason, created_at
		FROM subscription_freezes WHERE id = $1
	`, freezeID).Scan(
		&freeze.ID, &freeze.SubscriptionID, &freeze.FreezeStart, &freezeEnd, &freeze.Reason, &freeze.CreatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil
		}
		t.Fatalf("Failed to get subscription freeze: %v", err)
	}
	if freezeEnd.Valid {
		freeze.FreezeEnd = &freezeEnd.Time
	}

	return &freeze
}
