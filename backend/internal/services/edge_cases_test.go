package services

import (
	"sync"
	"testing"
	"time"

	"classmate-central/internal/testutil"

	"github.com/stretchr/testify/assert"
)

// =============================================================================
// Subscription Edge Cases
// =============================================================================

func TestSubscription_ExactlyZeroLessonsRemaining(t *testing.T) {
	r := testutil.NewWorkflowReporter(t)
	db := testutil.SetupTestDB(t)
	defer db.Close()

	ctx := testutil.NewTestContext(t, db)
	sub := testutil.CreateTestSubscription(t, db, ctx.Student.ID, ctx.SubType.ID,
		ctx.Company.ID, ctx.Branch.ID, 1, 10000)

	r.Step("Use the only lesson", func() error {
		_, err := db.Exec(`UPDATE student_subscriptions SET used_lessons = 1 WHERE id = $1`, sub.ID)
		if err != nil {
			return err
		}

		updated := testutil.GetSubscription(t, db, sub.ID)
		r.Check("remaining = 0", 0, updated.LessonsRemaining, updated.LessonsRemaining == 0)
		r.Check("used = total", updated.TotalLessons, updated.UsedLessons, updated.UsedLessons == updated.TotalLessons)
		return nil
	})
}

func TestSubscription_ExpiredButLessonsRemaining(t *testing.T) {
	r := testutil.NewWorkflowReporter(t)
	db := testutil.SetupTestDB(t)
	defer db.Close()

	ctx := testutil.NewTestContext(t, db)
	sub := testutil.CreateTestSubscription(t, db, ctx.Student.ID, ctx.SubType.ID,
		ctx.Company.ID, ctx.Branch.ID, 8, 10000)

	r.Step("Set end date to past (expire it)", func() error {
		pastDate := time.Now().AddDate(0, 0, -1)
		_, err := db.Exec(`UPDATE student_subscriptions SET end_date = $1, status = 'expired' WHERE id = $2`, pastDate, sub.ID)
		if err != nil {
			return err
		}

		updated := testutil.GetSubscription(t, db, sub.ID)
		r.Check("status is expired", "expired", updated.Status, updated.Status == "expired")
		r.Check("still has lessons", true, updated.LessonsRemaining > 0, updated.LessonsRemaining > 0)
		r.Info("Scenario: Customer paid for 8 lessons but subscription expired")
		return nil
	})
}

func TestSubscription_FreezeWhenAlreadyFrozen(t *testing.T) {
	r := testutil.NewWorkflowReporter(t)
	db := testutil.SetupTestDB(t)
	defer db.Close()

	ctx := testutil.NewTestContext(t, db)
	sub := testutil.CreateTestSubscription(t, db, ctx.Student.ID, ctx.SubType.ID,
		ctx.Company.ID, ctx.Branch.ID, 8, 10000)

	r.Step("Set subscription to frozen", func() error {
		_, err := db.Exec(`UPDATE student_subscriptions SET status = 'frozen' WHERE id = $1`, sub.ID)
		if err != nil {
			return err
		}

		updated := testutil.GetSubscription(t, db, sub.ID)
		r.Check("status is frozen", "frozen", updated.Status, updated.Status == "frozen")
		r.Info("Note: Production code should check status before allowing freeze")
		return nil
	})
}

// =============================================================================
// Payment Edge Cases
// =============================================================================

func TestPayment_ZeroAmount(t *testing.T) {
	r := testutil.NewWorkflowReporter(t)
	db := testutil.SetupTestDB(t)
	defer db.Close()

	ctx := testutil.NewTestContext(t, db)
	testutil.CreateTestStudentBalance(t, db, ctx.Student.ID, 10000)

	r.Step("Create zero-amount transaction", func() error {
		tx := testutil.CreateTestPaymentTransaction(t, db, ctx.Student.ID, ctx.Company.ID, ctx.Branch.ID, "payment", "cash", 0)
		r.Check("transaction exists", true, tx.ID > 0, tx.ID > 0)
		r.Check("amount is 0", 0.0, tx.Amount, tx.Amount == 0)

		balance := testutil.GetStudentBalance(t, db, ctx.Student.ID)
		r.Check("balance unchanged", 10000.0, balance.Balance, balance.Balance == 10000)
		return nil
	})
}

func TestPayment_VeryLargeAmount(t *testing.T) {
	r := testutil.NewWorkflowReporter(t)
	db := testutil.SetupTestDB(t)
	defer db.Close()

	ctx := testutil.NewTestContext(t, db)
	testutil.CreateTestStudentBalance(t, db, ctx.Student.ID, 0)

	r.Step("Create very large payment", func() error {
		// Use a large but valid amount for PostgreSQL numeric(12,2)
		largeAmount := 9999999.99
		tx := testutil.CreateTestPaymentTransaction(t, db, ctx.Student.ID, ctx.Company.ID, ctx.Branch.ID, "payment", "transfer", largeAmount)

		r.Check("transaction created", true, tx.ID > 0, tx.ID > 0)
		r.Check("correct large amount", largeAmount, tx.Amount, tx.Amount == largeAmount)
		return nil
	})
}

func TestPayment_NegativeAmountTransaction(t *testing.T) {
	r := testutil.NewWorkflowReporter(t)
	db := testutil.SetupTestDB(t)
	defer db.Close()

	ctx := testutil.NewTestContext(t, db)
	testutil.CreateTestStudentBalance(t, db, ctx.Student.ID, 10000)

	r.Step("Create transaction with negative amount", func() error {
		tx := testutil.CreateTestPaymentTransaction(t, db, ctx.Student.ID, ctx.Company.ID, ctx.Branch.ID, "payment", "cash", -5000)
		r.Check("transaction created", true, tx.ID > 0, tx.ID > 0)
		r.Info("Note: Application-level validation should prevent negative amounts")
		return nil
	})
}

// =============================================================================
// Balance Edge Cases
// =============================================================================

func TestBalance_ExtremeNegative(t *testing.T) {
	r := testutil.NewWorkflowReporter(t)
	db := testutil.SetupTestDB(t)
	defer db.Close()

	ctx := testutil.NewTestContext(t, db)
	testutil.CreateTestStudentBalance(t, db, ctx.Student.ID, 0)

	r.Step("Apply extreme debt", func() error {
		_, err := db.Exec(`UPDATE student_balance SET balance = -9999999 WHERE student_id = $1`, ctx.Student.ID)
		if err != nil {
			return err
		}

		balance := testutil.GetStudentBalance(t, db, ctx.Student.ID)
		r.Check("balance is very negative", -9999999.0, balance.Balance, balance.Balance == -9999999)
		return nil
	})
}

func TestBalance_FloatingPointPrecision(t *testing.T) {
	r := testutil.NewWorkflowReporter(t)
	db := testutil.SetupTestDB(t)
	defer db.Close()

	ctx := testutil.NewTestContext(t, db)

	r.Step("Set balance with decimal places", func() error {
		preciseAmount := 12345.67
		testutil.CreateTestStudentBalance(t, db, ctx.Student.ID, preciseAmount)

		balance := testutil.GetStudentBalance(t, db, ctx.Student.ID)
		r.Check("precision maintained", preciseAmount, balance.Balance, balance.Balance == preciseAmount)
		return nil
	})
}

// =============================================================================
// Concurrent Access Edge Cases
// =============================================================================

func TestBalance_ConcurrentUpdates(t *testing.T) {
	r := testutil.NewWorkflowReporter(t)
	db := testutil.SetupTestDB(t)
	defer db.Close()

	ctx := testutil.NewTestContext(t, db)
	testutil.CreateTestStudentBalance(t, db, ctx.Student.ID, 0)

	r.Step("Simulate concurrent balance updates", func() error {
		var wg sync.WaitGroup
		updates := 10
		amount := 1000.0

		for i := 0; i < updates; i++ {
			wg.Add(1)
			go func() {
				defer wg.Done()
				db.Exec(`
					UPDATE student_balance 
					SET balance = balance + $1, version = version + 1 
					WHERE student_id = $2
				`, amount, ctx.Student.ID)
			}()
		}
		wg.Wait()

		balance := testutil.GetStudentBalance(t, db, ctx.Student.ID)
		expectedBalance := float64(updates) * amount
		r.Check("all updates applied", expectedBalance, balance.Balance, balance.Balance == expectedBalance)
		return nil
	})
}

func TestSubscription_ConcurrentLessonDeduction(t *testing.T) {
	r := testutil.NewWorkflowReporter(t)
	db := testutil.SetupTestDB(t)
	defer db.Close()

	ctx := testutil.NewTestContext(t, db)
	sub := testutil.CreateTestSubscription(t, db, ctx.Student.ID, ctx.SubType.ID,
		ctx.Company.ID, ctx.Branch.ID, 10, 10000)

	r.Step("Simulate 5 concurrent lesson deductions", func() error {
		var wg sync.WaitGroup
		deductions := 5

		for i := 0; i < deductions; i++ {
			wg.Add(1)
			go func() {
				defer wg.Done()
				db.Exec(`
					UPDATE student_subscriptions 
					SET used_lessons = used_lessons + 1, version = version + 1
					WHERE id = $1 AND used_lessons < total_lessons
				`, sub.ID)
			}()
		}
		wg.Wait()

		updated := testutil.GetSubscription(t, db, sub.ID)
		r.Check("exactly 5 lessons used", 5, updated.UsedLessons, updated.UsedLessons == 5)
		r.Check("5 remaining", 5, updated.LessonsRemaining, updated.LessonsRemaining == 5)
		return nil
	})
}

// =============================================================================
// Date/Time Edge Cases
// =============================================================================

func TestSubscription_StartsAtMidnight(t *testing.T) {
	r := testutil.NewWorkflowReporter(t)
	db := testutil.SetupTestDB(t)
	defer db.Close()

	ctx := testutil.NewTestContext(t, db)

	r.Step("Create subscription starting at midnight", func() error {
		midnight := time.Date(2026, 2, 1, 0, 0, 0, 0, time.Local)
		endDate := midnight.AddDate(0, 0, 30)

		_, err := db.Exec(`
			INSERT INTO student_subscriptions (
				id, student_id, subscription_type_id, 
				total_lessons, used_lessons, total_price, price_per_lesson,
				start_date, end_date, status, freeze_days_remaining,
				created_at, updated_at, company_id, branch_id, version
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
		`, "midnight-sub", ctx.Student.ID, ctx.SubType.ID,
			8, 0, 80000.0, 10000.0,
			midnight, endDate, "active", 7,
			time.Now(), time.Now(), ctx.Company.ID, ctx.Branch.ID, 0)
		if err != nil {
			return err
		}

		var startTime time.Time
		err = db.QueryRow(`SELECT start_date FROM student_subscriptions WHERE id = $1`, "midnight-sub").Scan(&startTime)
		r.Check("query successful", nil, err, err == nil)
		r.Check("hour is 0", 0, startTime.Hour(), startTime.Hour() == 0)
		return nil
	})
}

func TestLesson_ExactlyOnEndDate(t *testing.T) {
	r := testutil.NewWorkflowReporter(t)
	db := testutil.SetupTestDB(t)
	defer db.Close()

	ctx := testutil.NewTestContext(t, db)
	sub := testutil.CreateTestSubscription(t, db, ctx.Student.ID, ctx.SubType.ID,
		ctx.Company.ID, ctx.Branch.ID, 8, 10000)

	r.Step("Set end date to today", func() error {
		today := time.Now()
		_, err := db.Exec(`UPDATE student_subscriptions SET end_date = $1 WHERE id = $2`, today, sub.ID)
		assert.NoError(t, err)

		updated := testutil.GetSubscription(t, db, sub.ID)
		r.Check("status still active", "active", updated.Status, updated.Status == "active")
		return nil
	})
}

// =============================================================================
// String/Input Edge Cases
// =============================================================================

func TestStudent_LongName(t *testing.T) {
	r := testutil.NewWorkflowReporter(t)
	db := testutil.SetupTestDB(t)
	defer db.Close()

	ctx := testutil.NewTestContext(t, db)

	r.Step("Create student with very long name", func() error {
		longName := "A" + string(make([]byte, 200))

		_, err := db.Exec(`
			INSERT INTO students (id, name, age, phone, status, company_id, branch_id, created_at)
			VALUES ($1, $2, 18, '+77001112233', 'active', $3, $4, NOW())
		`, "long-name-student", longName, ctx.Company.ID, ctx.Branch.ID)

		if err != nil {
			r.Info("Database correctly rejected very long name: %v", err)
		} else {
			r.Info("Database accepted long name (no VARCHAR limit)")
		}
		return nil
	})
}

func TestStudent_SpecialCharactersInName(t *testing.T) {
	r := testutil.NewWorkflowReporter(t)
	db := testutil.SetupTestDB(t)
	defer db.Close()

	ctx := testutil.NewTestContext(t, db)

	r.Step("Create student with special characters", func() error {
		specialName := "O'Connor-Smith (Jr.) & Co."

		_, err := db.Exec(`
			INSERT INTO students (id, name, age, phone, status, company_id, branch_id, created_at)
			VALUES ($1, $2, 18, '+77001112233', 'active', $3, $4, NOW())
		`, "special-char-student", specialName, ctx.Company.ID, ctx.Branch.ID)
		if err != nil {
			return err
		}

		var retrievedName string
		err = db.QueryRow(`SELECT name FROM students WHERE id = $1`, "special-char-student").Scan(&retrievedName)
		r.Check("name preserved", specialName, retrievedName, err == nil && retrievedName == specialName)
		return nil
	})
}

func TestStudent_EmptyEmail(t *testing.T) {
	r := testutil.NewWorkflowReporter(t)
	db := testutil.SetupTestDB(t)
	defer db.Close()

	ctx := testutil.NewTestContext(t, db)

	r.Step("Create student with NULL email", func() error {
		_, err := db.Exec(`
			INSERT INTO students (id, name, age, phone, status, company_id, branch_id, created_at, email)
			VALUES ($1, $2, 18, '+77001112233', 'active', $3, $4, NOW(), NULL)
		`, "no-email-student", "Test Student", ctx.Company.ID, ctx.Branch.ID)
		if err != nil {
			return err
		}

		var email *string
		err = db.QueryRow(`SELECT email FROM students WHERE id = $1`, "no-email-student").Scan(&email)
		r.Check("email is NULL", true, email == nil, email == nil)
		return nil
	})
}

// =============================================================================
// Boundary Condition Tests
// =============================================================================

func TestDiscount_100Percent(t *testing.T) {
	r := testutil.NewWorkflowReporter(t)
	db := testutil.SetupTestDB(t)
	defer db.Close()

	ctx := testutil.NewTestContext(t, db)

	r.Step("Calculate 100% discount", func() error {
		discount := testutil.CreateTestDiscount(t, db, ctx.Company.ID, ctx.Branch.ID, "percentage", 100)
		originalPrice := 80000.0
		discountedPrice := originalPrice - (originalPrice * discount.Value / 100)

		r.Check("100% discount = free", 0.0, discountedPrice, discountedPrice == 0)
		return nil
	})
}

func TestDiscount_FixedExceedsPrice(t *testing.T) {
	r := testutil.NewWorkflowReporter(t)
	db := testutil.SetupTestDB(t)
	defer db.Close()

	ctx := testutil.NewTestContext(t, db)

	r.Step("Calculate fixed discount larger than price", func() error {
		discount := testutil.CreateTestDiscount(t, db, ctx.Company.ID, ctx.Branch.ID, "fixed", 100000)
		originalPrice := 80000.0
		discountedPrice := originalPrice - discount.Value
		if discountedPrice < 0 {
			discountedPrice = 0
		}

		r.Check("price floors at 0", 0.0, discountedPrice, discountedPrice == 0)
		r.Info("Business rule: Discounted price should never be negative")
		return nil
	})
}

func TestSubscription_ZeroValidityDays(t *testing.T) {
	r := testutil.NewWorkflowReporter(t)
	db := testutil.SetupTestDB(t)
	defer db.Close()

	ctx := testutil.NewTestContext(t, db)

	r.Step("Create subscription type with 0 validity days", func() error {
		subType := testutil.CreateTestSubscriptionTypeWithParams(t, db, ctx.Company.ID, ctx.Branch.ID,
			100, 0, 1000000, "per_lesson")

		var validityDays int
		err := db.QueryRow(`SELECT validity_days FROM subscription_types WHERE id = $1`, subType.ID).Scan(&validityDays)
		r.Check("validity_days = 0", 0, validityDays, err == nil && validityDays == 0)
		r.Info("Note: 0 validity days could mean unlimited/never expires")
		return nil
	})
}

func TestLesson_ZeroDuration(t *testing.T) {
	r := testutil.NewWorkflowReporter(t)
	db := testutil.SetupTestDB(t)
	defer db.Close()

	ctx := testutil.NewTestContext(t, db)

	r.Step("Create lesson with same start and end time", func() error {
		now := time.Now()
		sameTime := time.Date(now.Year(), now.Month(), now.Day(), 10, 0, 0, 0, now.Location())

		_, err := db.Exec(`
			INSERT INTO lessons (id, title, teacher_id, subject, lesson_type, start_time, end_time, room, room_id, status, company_id, branch_id)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		`, "zero-duration-lesson", "Test", ctx.Teacher.ID, "Math", "group", sameTime, sameTime, "Room", ctx.Room.ID, "scheduled", ctx.Company.ID, ctx.Branch.ID)
		if err != nil {
			return err
		}

		var startTime, endTime time.Time
		err = db.QueryRow(`SELECT start_time, end_time FROM lessons WHERE id = $1`, "zero-duration-lesson").Scan(&startTime, &endTime)
		r.Check("duration is 0", true, startTime.Equal(endTime), startTime.Equal(endTime))
		return nil
	})
}

// =============================================================================
// Deletion Cascade Edge Cases
// =============================================================================

func TestDelete_StudentWithActiveSubscription(t *testing.T) {
	r := testutil.NewWorkflowReporter(t)
	db := testutil.SetupTestDB(t)
	defer db.Close()

	ctx := testutil.NewTestContext(t, db)
	sub := testutil.CreateTestSubscription(t, db, ctx.Student.ID, ctx.SubType.ID,
		ctx.Company.ID, ctx.Branch.ID, 8, 10000)
	r.Info("Subscription: %s", sub.ID)

	r.Step("Try to delete student with subscription", func() error {
		var countBefore int
		db.QueryRow(`SELECT COUNT(*) FROM student_subscriptions WHERE student_id = $1`, ctx.Student.ID).Scan(&countBefore)
		r.Info("Subscriptions before: %d", countBefore)

		_, err := db.Exec(`DELETE FROM students WHERE id = $1`, ctx.Student.ID)
		if err != nil {
			r.Info("Delete blocked by FK constraint (expected): %v", err)
		} else {
			var countAfter int
			db.QueryRow(`SELECT COUNT(*) FROM student_subscriptions WHERE student_id = $1`, ctx.Student.ID).Scan(&countAfter)
			r.Info("Subscriptions after delete: %d", countAfter)
		}
		return nil
	})
}
