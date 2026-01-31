package handlers

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"classmate-central/internal/models"
	"classmate-central/internal/repository"
	"classmate-central/internal/services"
	"classmate-central/internal/testutil"

	"github.com/gin-gonic/gin"
)

func setupSubscriptionTestRouter(t *testing.T) (*gin.Engine, *sql.DB, *testutil.TestContext) {
	gin.SetMode(gin.TestMode)

	db := testutil.SetupTestDB(t)
	ctx := testutil.NewTestContext(t, db)

	subscriptionRepo := repository.NewSubscriptionRepository(db)
	discountRepo := repository.NewDiscountRepository(db)

	// Create attendance service dependencies
	consumptionRepo := repository.NewSubscriptionConsumptionRepository(db)
	activityRepo := repository.NewActivityRepository(db)
	notificationRepo := repository.NewNotificationRepository(db)
	emailService := services.NewEmailService()
	studentRepo := repository.NewStudentRepository(db)
	lessonRepo := repository.NewLessonRepository(db)

	attendanceService := services.NewAttendanceService(
		subscriptionRepo,
		consumptionRepo,
		activityRepo,
		notificationRepo,
		emailService,
		studentRepo,
		lessonRepo,
		db,
	)
	activityService := services.NewActivityService(activityRepo)
	subscriptionService := services.NewSubscriptionService(subscriptionRepo, lessonRepo, activityRepo, db)

	subscriptionHandler := NewSubscriptionHandler(
		subscriptionRepo,
		discountRepo,
		attendanceService,
		activityService,
		subscriptionService,
	)

	router := gin.New()
	// Middleware to set company_id and branch_id
	router.Use(func(c *gin.Context) {
		c.Set("company_id", ctx.Company.ID)
		c.Set("branch_id", ctx.Branch.ID)
		c.Next()
	})
	router.POST("/api/subscriptions", subscriptionHandler.CreateStudentSubscription)
	router.GET("/api/subscriptions/:id", subscriptionHandler.GetSubscriptionByID)
	router.GET("/api/subscriptions/student/:studentId", subscriptionHandler.GetStudentSubscriptions)

	return router, db, ctx
}

// ============= DISCOUNT TESTS =============

// TestCreateSubscription_WithPercentageDiscount tests 20% discount
func TestCreateSubscription_WithPercentageDiscount(t *testing.T) {
	r := testutil.NewWorkflowReporter(t)
	router, db, ctx := setupSubscriptionTestRouter(t)
	defer db.Close()
	defer testutil.CleanupTestDB(t, db)

	var subscriptionID string

	r.Step("Create 20% percentage discount and assign to student", func() error {
		discount := testutil.CreateTestDiscount(t, db, ctx.Company.ID, ctx.Branch.ID, "percentage", 20)
		testutil.AssignDiscountToStudent(t, db, ctx.Student.ID, discount.ID, ctx.Company.ID, ctx.Branch.ID)
		r.Info("Created 20%% discount: %s", discount.ID)
		return nil
	})

	r.Step("Create subscription with 100000 base price", func() error {
		reqBody := models.StudentSubscription{
			StudentID:          ctx.Student.ID,
			SubscriptionTypeID: ctx.SubType.ID,
			TotalLessons:       8,
			TotalPrice:         100000,
			BranchID:           ctx.Branch.ID,
		}

		jsonBody, _ := json.Marshal(reqBody)
		req, _ := http.NewRequest("POST", "/api/subscriptions", bytes.NewBuffer(jsonBody))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != http.StatusCreated {
			return fmt.Errorf("expected 201, got %d: %s", w.Code, w.Body.String())
		}

		var sub models.StudentSubscription
		json.Unmarshal(w.Body.Bytes(), &sub)
		subscriptionID = sub.ID
		return nil
	})

	r.Step("Verify subscription has 80000 total price (100k - 20%)", func() error {
		sub := testutil.GetSubscription(t, db, subscriptionID)
		r.Check("total_price", float64(80000), sub.TotalPrice, sub.TotalPrice == 80000)
		return nil
	})

	r.Step("Verify original price and discount amount stored", func() error {
		var originalPrice, discountAmount sql.NullFloat64
		err := db.QueryRow(`
			SELECT original_price, discount_amount FROM student_subscriptions WHERE id = $1
		`, subscriptionID).Scan(&originalPrice, &discountAmount)
		if err != nil {
			return err
		}
		r.Check("original_price", float64(100000), originalPrice.Float64, originalPrice.Float64 == 100000)
		r.Check("discount_amount", float64(20000), discountAmount.Float64, discountAmount.Float64 == 20000)
		return nil
	})

	r.Summary()
}

// TestCreateSubscription_WithFixedDiscount tests fixed 15000 discount
func TestCreateSubscription_WithFixedDiscount(t *testing.T) {
	r := testutil.NewWorkflowReporter(t)
	router, db, ctx := setupSubscriptionTestRouter(t)
	defer db.Close()
	defer testutil.CleanupTestDB(t, db)

	var subscriptionID string

	r.Step("Create fixed 15000 discount and assign to student", func() error {
		discount := testutil.CreateTestDiscount(t, db, ctx.Company.ID, ctx.Branch.ID, "fixed", 15000)
		testutil.AssignDiscountToStudent(t, db, ctx.Student.ID, discount.ID, ctx.Company.ID, ctx.Branch.ID)
		r.Info("Created fixed 15000 discount: %s", discount.ID)
		return nil
	})

	r.Step("Create subscription with 100000 base price", func() error {
		reqBody := models.StudentSubscription{
			StudentID:          ctx.Student.ID,
			SubscriptionTypeID: ctx.SubType.ID,
			TotalLessons:       8,
			TotalPrice:         100000,
			BranchID:           ctx.Branch.ID,
		}

		jsonBody, _ := json.Marshal(reqBody)
		req, _ := http.NewRequest("POST", "/api/subscriptions", bytes.NewBuffer(jsonBody))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != http.StatusCreated {
			return fmt.Errorf("expected 201, got %d: %s", w.Code, w.Body.String())
		}

		var sub models.StudentSubscription
		json.Unmarshal(w.Body.Bytes(), &sub)
		subscriptionID = sub.ID
		return nil
	})

	r.Step("Verify subscription has 85000 total price (100k - 15k)", func() error {
		sub := testutil.GetSubscription(t, db, subscriptionID)
		r.Check("total_price", float64(85000), sub.TotalPrice, sub.TotalPrice == 85000)
		return nil
	})

	r.Summary()
}

// TestCreateSubscription_WithComboDiscount tests 20% percentage + 10000 fixed
func TestCreateSubscription_WithComboDiscount(t *testing.T) {
	r := testutil.NewWorkflowReporter(t)
	router, db, ctx := setupSubscriptionTestRouter(t)
	defer db.Close()
	defer testutil.CleanupTestDB(t, db)

	var subscriptionID string

	r.Step("Create percentage and fixed discounts, assign to student", func() error {
		// 20% percentage discount
		percentDiscount := testutil.CreateTestDiscount(t, db, ctx.Company.ID, ctx.Branch.ID, "percentage", 20)
		testutil.AssignDiscountToStudent(t, db, ctx.Student.ID, percentDiscount.ID, ctx.Company.ID, ctx.Branch.ID)
		r.Info("Created 20%% discount: %s", percentDiscount.ID)

		// 10000 fixed discount
		fixedDiscount := testutil.CreateTestDiscount(t, db, ctx.Company.ID, ctx.Branch.ID, "fixed", 10000)
		testutil.AssignDiscountToStudent(t, db, ctx.Student.ID, fixedDiscount.ID, ctx.Company.ID, ctx.Branch.ID)
		r.Info("Created fixed 10000 discount: %s", fixedDiscount.ID)

		return nil
	})

	r.Step("Create subscription with 100000 base price", func() error {
		reqBody := models.StudentSubscription{
			StudentID:          ctx.Student.ID,
			SubscriptionTypeID: ctx.SubType.ID,
			TotalLessons:       8,
			TotalPrice:         100000,
			BranchID:           ctx.Branch.ID,
		}

		jsonBody, _ := json.Marshal(reqBody)
		req, _ := http.NewRequest("POST", "/api/subscriptions", bytes.NewBuffer(jsonBody))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != http.StatusCreated {
			return fmt.Errorf("expected 201, got %d: %s", w.Code, w.Body.String())
		}

		var sub models.StudentSubscription
		json.Unmarshal(w.Body.Bytes(), &sub)
		subscriptionID = sub.ID
		return nil
	})

	r.Step("Verify subscription has 70000 total price (100k - 20% = 80k - 10k = 70k)", func() error {
		sub := testutil.GetSubscription(t, db, subscriptionID)
		// Order: percentage first (100k * 0.8 = 80k), then fixed (80k - 10k = 70k)
		r.Check("total_price", float64(70000), sub.TotalPrice, sub.TotalPrice == 70000)
		return nil
	})

	r.Step("Verify total discount amount is 30000", func() error {
		var discountAmount sql.NullFloat64
		err := db.QueryRow(`
			SELECT discount_amount FROM student_subscriptions WHERE id = $1
		`, subscriptionID).Scan(&discountAmount)
		if err != nil {
			return err
		}
		r.Check("discount_amount", float64(30000), discountAmount.Float64, discountAmount.Float64 == 30000)
		return nil
	})

	r.Summary()
}

// TestCreateSubscription_CalculatesPricePerLesson tests price per lesson calculation
func TestCreateSubscription_CalculatesPricePerLesson(t *testing.T) {
	r := testutil.NewWorkflowReporter(t)
	router, db, ctx := setupSubscriptionTestRouter(t)
	defer db.Close()
	defer testutil.CleanupTestDB(t, db)

	var subscriptionID string

	r.Step("Create subscription with 80000 price and 8 lessons", func() error {
		reqBody := models.StudentSubscription{
			StudentID:          ctx.Student.ID,
			SubscriptionTypeID: ctx.SubType.ID,
			TotalLessons:       8,
			TotalPrice:         80000,
			BranchID:           ctx.Branch.ID,
		}

		jsonBody, _ := json.Marshal(reqBody)
		req, _ := http.NewRequest("POST", "/api/subscriptions", bytes.NewBuffer(jsonBody))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != http.StatusCreated {
			return fmt.Errorf("expected 201, got %d: %s", w.Code, w.Body.String())
		}

		var sub models.StudentSubscription
		json.Unmarshal(w.Body.Bytes(), &sub)
		subscriptionID = sub.ID
		return nil
	})

	r.Step("Verify price per lesson is 10000 (80000 / 8)", func() error {
		sub := testutil.GetSubscription(t, db, subscriptionID)
		r.Check("price_per_lesson", float64(10000), sub.PricePerLesson, sub.PricePerLesson == 10000)
		return nil
	})

	r.Summary()
}

// TestCreateSubscription_NoDiscount tests full price when no discounts
func TestCreateSubscription_NoDiscount(t *testing.T) {
	r := testutil.NewWorkflowReporter(t)
	router, db, ctx := setupSubscriptionTestRouter(t)
	defer db.Close()
	defer testutil.CleanupTestDB(t, db)

	var subscriptionID string

	// Note: We do NOT create any discounts

	r.Step("Create subscription with 100000 price (no discounts)", func() error {
		reqBody := models.StudentSubscription{
			StudentID:          ctx.Student.ID,
			SubscriptionTypeID: ctx.SubType.ID,
			TotalLessons:       8,
			TotalPrice:         100000,
			BranchID:           ctx.Branch.ID,
		}

		jsonBody, _ := json.Marshal(reqBody)
		req, _ := http.NewRequest("POST", "/api/subscriptions", bytes.NewBuffer(jsonBody))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != http.StatusCreated {
			return fmt.Errorf("expected 201, got %d: %s", w.Code, w.Body.String())
		}

		var sub models.StudentSubscription
		json.Unmarshal(w.Body.Bytes(), &sub)
		subscriptionID = sub.ID
		return nil
	})

	r.Step("Verify full price is charged (100000)", func() error {
		sub := testutil.GetSubscription(t, db, subscriptionID)
		r.Check("total_price", float64(100000), sub.TotalPrice, sub.TotalPrice == 100000)
		return nil
	})

	r.Step("Verify discount amount is 0", func() error {
		var discountAmount sql.NullFloat64
		err := db.QueryRow(`
			SELECT discount_amount FROM student_subscriptions WHERE id = $1
		`, subscriptionID).Scan(&discountAmount)
		if err != nil {
			return err
		}
		r.Check("discount_amount", float64(0), discountAmount.Float64, discountAmount.Float64 == 0)
		return nil
	})

	r.Summary()
}

// ============= UNIT TEST FOR calculatePriceWithDiscounts =============

// TestCalculatePriceWithDiscounts_Unit tests the discount calculation function directly
func TestCalculatePriceWithDiscounts_Unit(t *testing.T) {
	r := testutil.NewWorkflowReporter(t)

	r.Step("Test empty discounts returns base price", func() error {
		finalPrice, discountAmount := calculatePriceWithDiscounts(100000, []models.Discount{})
		r.Check("final_price", float64(100000), finalPrice, finalPrice == 100000)
		r.Check("discount_amount", float64(0), discountAmount, discountAmount == 0)
		return nil
	})

	r.Step("Test single percentage discount (20%)", func() error {
		discounts := []models.Discount{
			{ID: "1", Type: "percentage", Value: 20, IsActive: true},
		}
		finalPrice, discountAmount := calculatePriceWithDiscounts(100000, discounts)
		r.Check("final_price", float64(80000), finalPrice, finalPrice == 80000)
		r.Check("discount_amount", float64(20000), discountAmount, discountAmount == 20000)
		return nil
	})

	r.Step("Test single fixed discount (15000)", func() error {
		discounts := []models.Discount{
			{ID: "1", Type: "fixed", Value: 15000, IsActive: true},
		}
		finalPrice, discountAmount := calculatePriceWithDiscounts(100000, discounts)
		r.Check("final_price", float64(85000), finalPrice, finalPrice == 85000)
		r.Check("discount_amount", float64(15000), discountAmount, discountAmount == 15000)
		return nil
	})

	r.Step("Test combo: percentage first, then fixed", func() error {
		discounts := []models.Discount{
			{ID: "1", Type: "percentage", Value: 20, IsActive: true},
			{ID: "2", Type: "fixed", Value: 10000, IsActive: true},
		}
		// 100000 * 0.8 = 80000, then 80000 - 10000 = 70000
		finalPrice, discountAmount := calculatePriceWithDiscounts(100000, discounts)
		r.Check("final_price", float64(70000), finalPrice, finalPrice == 70000)
		r.Check("discount_amount", float64(30000), discountAmount, discountAmount == 30000)
		return nil
	})

	r.Step("Test inactive discount is ignored", func() error {
		discounts := []models.Discount{
			{ID: "1", Type: "percentage", Value: 50, IsActive: false}, // Inactive
			{ID: "2", Type: "fixed", Value: 10000, IsActive: true},
		}
		finalPrice, discountAmount := calculatePriceWithDiscounts(100000, discounts)
		r.Check("final_price", float64(90000), finalPrice, finalPrice == 90000)
		r.Check("discount_amount", float64(10000), discountAmount, discountAmount == 10000)
		return nil
	})

	r.Step("Test discount cannot go below 0", func() error {
		discounts := []models.Discount{
			{ID: "1", Type: "fixed", Value: 150000, IsActive: true}, // More than base price
		}
		finalPrice, discountAmount := calculatePriceWithDiscounts(100000, discounts)
		r.Check("final_price", float64(0), finalPrice, finalPrice == 0)
		r.Check("discount_amount", float64(100000), discountAmount, discountAmount == 100000)
		return nil
	})

	r.Step("Test multiple percentage discounts stack", func() error {
		discounts := []models.Discount{
			{ID: "1", Type: "percentage", Value: 10, IsActive: true}, // First: 100k * 0.9 = 90k
			{ID: "2", Type: "percentage", Value: 10, IsActive: true}, // Second: 90k * 0.9 = 81k
		}
		// 100000 -> 90000 -> 81000
		finalPrice, discountAmount := calculatePriceWithDiscounts(100000, discounts)
		r.Check("final_price", float64(81000), finalPrice, finalPrice == 81000)
		r.Check("discount_amount", float64(19000), discountAmount, discountAmount == 19000)
		return nil
	})

	r.Summary()
}
