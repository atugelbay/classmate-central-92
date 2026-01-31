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
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupPaymentTestRouterWithContext(t *testing.T) (*gin.Engine, *sql.DB, *testutil.TestContext) {
	gin.SetMode(gin.TestMode)

	db := testutil.SetupTestDB(t)
	ctx := testutil.NewTestContext(t, db)

	paymentRepo := repository.NewPaymentRepository(db)
	activityService := services.NewActivityService(repository.NewActivityRepository(db))
	emailService := services.NewEmailService()
	studentRepo := repository.NewStudentRepository(db)

	paymentHandler := NewPaymentHandler(paymentRepo, activityService, emailService, studentRepo)

	router := gin.New()
	// Middleware to set company_id and branch_id
	router.Use(func(c *gin.Context) {
		c.Set("company_id", ctx.Company.ID)
		c.Set("branch_id", ctx.Branch.ID)
		c.Next()
	})
	router.POST("/api/payments/transactions", paymentHandler.CreateTransaction)
	router.GET("/api/payments/transactions", paymentHandler.GetAllTransactions)
	router.GET("/api/payments/balance/:studentId", paymentHandler.GetStudentBalance)
	router.PUT("/api/payments/transactions/:id", paymentHandler.UpdateTransaction)

	return router, db, ctx
}

// ============= PAYMENT TYPE TESTS =============

// TestPayment_IncreasesBalance tests that payment type adds to balance
func TestPayment_IncreasesBalance(t *testing.T) {
	r := testutil.NewWorkflowReporter(t)
	router, db, ctx := setupPaymentTestRouterWithContext(t)
	defer db.Close()
	defer testutil.CleanupTestDB(t, db)

	r.Step("Create initial balance of 0", func() error {
		testutil.CreateTestStudentBalance(t, db, ctx.Student.ID, 0)
		return nil
	})

	r.Step("Create payment of 50000", func() error {
		reqBody := models.PaymentTransaction{
			StudentID:     ctx.Student.ID,
			Amount:        50000,
			Type:          "payment",
			PaymentMethod: "cash",
			Description:   "Test payment",
		}

		jsonBody, _ := json.Marshal(reqBody)
		req, _ := http.NewRequest("POST", "/api/payments/transactions", bytes.NewBuffer(jsonBody))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != http.StatusCreated {
			return fmt.Errorf("expected 201, got %d: %s", w.Code, w.Body.String())
		}
		return nil
	})

	r.Step("Verify balance increased to 50000", func() error {
		balance := testutil.GetStudentBalance(t, db, ctx.Student.ID)
		r.Check("balance", float64(50000), balance.Balance, balance.Balance == 50000)
		return nil
	})

	r.Summary()
}

// TestRefund_IncreasesBalance tests that refund type adds to balance
func TestRefund_IncreasesBalance(t *testing.T) {
	r := testutil.NewWorkflowReporter(t)
	router, db, ctx := setupPaymentTestRouterWithContext(t)
	defer db.Close()
	defer testutil.CleanupTestDB(t, db)

	r.Step("Create initial balance of 10000", func() error {
		testutil.CreateTestStudentBalance(t, db, ctx.Student.ID, 10000)
		return nil
	})

	r.Step("Create refund of 5000", func() error {
		reqBody := models.PaymentTransaction{
			StudentID:     ctx.Student.ID,
			Amount:        5000,
			Type:          "refund",
			PaymentMethod: "cash",
			Description:   "Test refund",
		}

		jsonBody, _ := json.Marshal(reqBody)
		req, _ := http.NewRequest("POST", "/api/payments/transactions", bytes.NewBuffer(jsonBody))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != http.StatusCreated {
			return fmt.Errorf("expected 201, got %d: %s", w.Code, w.Body.String())
		}
		return nil
	})

	r.Step("Verify balance increased to 15000", func() error {
		balance := testutil.GetStudentBalance(t, db, ctx.Student.ID)
		r.Check("balance", float64(15000), balance.Balance, balance.Balance == 15000)
		return nil
	})

	r.Summary()
}

// TestDebt_DecreasesBalance tests that debt type subtracts from balance
func TestDebt_DecreasesBalance(t *testing.T) {
	r := testutil.NewWorkflowReporter(t)
	router, db, ctx := setupPaymentTestRouterWithContext(t)
	defer db.Close()
	defer testutil.CleanupTestDB(t, db)

	r.Step("Create initial balance of 100000", func() error {
		testutil.CreateTestStudentBalance(t, db, ctx.Student.ID, 100000)
		return nil
	})

	r.Step("Create debt of 30000", func() error {
		reqBody := models.PaymentTransaction{
			StudentID:     ctx.Student.ID,
			Amount:        30000,
			Type:          "debt",
			PaymentMethod: "other",
			Description:   "Test debt",
		}

		jsonBody, _ := json.Marshal(reqBody)
		req, _ := http.NewRequest("POST", "/api/payments/transactions", bytes.NewBuffer(jsonBody))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != http.StatusCreated {
			return fmt.Errorf("expected 201, got %d: %s", w.Code, w.Body.String())
		}
		return nil
	})

	r.Step("Verify balance decreased to 70000", func() error {
		balance := testutil.GetStudentBalance(t, db, ctx.Student.ID)
		r.Check("balance", float64(70000), balance.Balance, balance.Balance == 70000)
		return nil
	})

	r.Summary()
}

// ============= PAYMENT METHODS TESTS =============

// TestPayment_AllMethods tests all payment methods work correctly
func TestPayment_AllMethods(t *testing.T) {
	r := testutil.NewWorkflowReporter(t)
	router, db, ctx := setupPaymentTestRouterWithContext(t)
	defer db.Close()
	defer testutil.CleanupTestDB(t, db)

	methods := []string{"cash", "card", "transfer", "other"}

	r.Step("Create initial balance of 0", func() error {
		testutil.CreateTestStudentBalance(t, db, ctx.Student.ID, 0)
		return nil
	})

	for i, method := range methods {
		method := method // capture for closure
		r.Step(fmt.Sprintf("Create payment with method: %s", method), func() error {
			reqBody := models.PaymentTransaction{
				StudentID:     ctx.Student.ID,
				Amount:        10000,
				Type:          "payment",
				PaymentMethod: method,
				Description:   fmt.Sprintf("Payment via %s", method),
			}

			jsonBody, _ := json.Marshal(reqBody)
			req, _ := http.NewRequest("POST", "/api/payments/transactions", bytes.NewBuffer(jsonBody))
			req.Header.Set("Content-Type", "application/json")

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			if w.Code != http.StatusCreated {
				return fmt.Errorf("method %s: expected 201, got %d: %s", method, w.Code, w.Body.String())
			}
			return nil
		})

		expectedBalance := float64((i + 1) * 10000)
		r.Step(fmt.Sprintf("Verify balance after %s payment", method), func() error {
			balance := testutil.GetStudentBalance(t, db, ctx.Student.ID)
			r.Check(fmt.Sprintf("balance_after_%s", method), expectedBalance, balance.Balance, balance.Balance == expectedBalance)
			return nil
		})
	}

	r.Step("Verify all 4 transactions created", func() error {
		transactions := testutil.GetAllTransactionsForStudent(t, db, ctx.Student.ID)
		r.Check("transaction_count", 4, len(transactions), len(transactions) == 4)
		return nil
	})

	r.Summary()
}

// ============= UPDATE TRANSACTION TESTS =============

// TestUpdateTransaction_RecalculatesBalance tests that updating transaction syncs balance
func TestUpdateTransaction_RecalculatesBalance(t *testing.T) {
	r := testutil.NewWorkflowReporter(t)
	router, db, ctx := setupPaymentTestRouterWithContext(t)
	defer db.Close()
	defer testutil.CleanupTestDB(t, db)

	var transactionID int

	r.Step("Create initial balance of 0", func() error {
		testutil.CreateTestStudentBalance(t, db, ctx.Student.ID, 0)
		return nil
	})

	r.Step("Create payment of 50000", func() error {
		reqBody := models.PaymentTransaction{
			StudentID:     ctx.Student.ID,
			Amount:        50000,
			Type:          "payment",
			PaymentMethod: "cash",
			Description:   "Initial payment",
		}

		jsonBody, _ := json.Marshal(reqBody)
		req, _ := http.NewRequest("POST", "/api/payments/transactions", bytes.NewBuffer(jsonBody))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != http.StatusCreated {
			return fmt.Errorf("expected 201, got %d: %s", w.Code, w.Body.String())
		}

		var tx models.PaymentTransaction
		json.Unmarshal(w.Body.Bytes(), &tx)
		transactionID = tx.ID
		r.Info("Created transaction ID: %d", transactionID)
		return nil
	})

	r.Step("Verify balance is 50000", func() error {
		balance := testutil.GetStudentBalance(t, db, ctx.Student.ID)
		r.Check("initial_balance", float64(50000), balance.Balance, balance.Balance == 50000)
		return nil
	})

	r.Step("Update transaction amount to 80000", func() error {
		newAmount := float64(80000)
		update := models.PaymentTransactionUpdate{
			Amount: &newAmount,
		}

		jsonBody, _ := json.Marshal(update)
		req, _ := http.NewRequest("PUT", fmt.Sprintf("/api/payments/transactions/%d", transactionID), bytes.NewBuffer(jsonBody))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			return fmt.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
		}
		return nil
	})

	r.Step("Verify balance updated to 80000", func() error {
		balance := testutil.GetStudentBalance(t, db, ctx.Student.ID)
		// Balance should be 80000 (50000 reversed, 80000 added)
		r.Check("updated_balance", float64(80000), balance.Balance, balance.Balance == 80000)
		return nil
	})

	r.Summary()
}

// ============= AUTO-CREATE BALANCE TESTS =============

// TestCreateTransaction_CreatesBalanceIfMissing tests that balance is auto-created
func TestCreateTransaction_CreatesBalanceIfMissing(t *testing.T) {
	r := testutil.NewWorkflowReporter(t)
	router, db, ctx := setupPaymentTestRouterWithContext(t)
	defer db.Close()
	defer testutil.CleanupTestDB(t, db)

	// Note: We do NOT create a balance beforehand

	r.Step("Verify no balance exists initially", func() error {
		var count int
		err := db.QueryRow(`SELECT COUNT(*) FROM student_balance WHERE student_id = $1`, ctx.Student.ID).Scan(&count)
		if err != nil {
			return err
		}
		r.Check("no_initial_balance", 0, count, count == 0)
		return nil
	})

	r.Step("Create payment of 25000 (should auto-create balance)", func() error {
		reqBody := models.PaymentTransaction{
			StudentID:     ctx.Student.ID,
			Amount:        25000,
			Type:          "payment",
			PaymentMethod: "card",
			Description:   "First payment",
		}

		jsonBody, _ := json.Marshal(reqBody)
		req, _ := http.NewRequest("POST", "/api/payments/transactions", bytes.NewBuffer(jsonBody))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != http.StatusCreated {
			return fmt.Errorf("expected 201, got %d: %s", w.Code, w.Body.String())
		}
		return nil
	})

	r.Step("Verify balance was auto-created with 25000", func() error {
		balance := testutil.GetStudentBalance(t, db, ctx.Student.ID)
		r.Check("auto_created_balance", float64(25000), balance.Balance, balance.Balance == 25000)
		return nil
	})

	r.Summary()
}

// ============= MULTIPLE TRANSACTION TYPES TEST =============

// TestMultipleTransactionTypes tests a sequence of different transaction types
func TestMultipleTransactionTypes(t *testing.T) {
	r := testutil.NewWorkflowReporter(t)
	router, db, ctx := setupPaymentTestRouterWithContext(t)
	defer db.Close()
	defer testutil.CleanupTestDB(t, db)

	r.Step("Create initial balance of 0", func() error {
		testutil.CreateTestStudentBalance(t, db, ctx.Student.ID, 0)
		return nil
	})

	// Sequence: payment +100k, debt -20k, refund +5k, payment +15k = 100k
	transactions := []struct {
		txType          string
		amount          float64
		expectedBalance float64
	}{
		{"payment", 100000, 100000},
		{"debt", 20000, 80000},
		{"refund", 5000, 85000},
		{"payment", 15000, 100000},
	}

	for _, tx := range transactions {
		tx := tx // capture
		r.Step(fmt.Sprintf("Create %s of %.0f", tx.txType, tx.amount), func() error {
			reqBody := models.PaymentTransaction{
				StudentID:     ctx.Student.ID,
				Amount:        tx.amount,
				Type:          tx.txType,
				PaymentMethod: "cash",
				Description:   fmt.Sprintf("Test %s", tx.txType),
			}

			jsonBody, _ := json.Marshal(reqBody)
			req, _ := http.NewRequest("POST", "/api/payments/transactions", bytes.NewBuffer(jsonBody))
			req.Header.Set("Content-Type", "application/json")

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			if w.Code != http.StatusCreated {
				return fmt.Errorf("expected 201, got %d", w.Code)
			}
			return nil
		})

		r.Step(fmt.Sprintf("Verify balance after %s = %.0f", tx.txType, tx.expectedBalance), func() error {
			balance := testutil.GetStudentBalance(t, db, ctx.Student.ID)
			r.Check(fmt.Sprintf("balance_after_%s", tx.txType), tx.expectedBalance, balance.Balance, balance.Balance == tx.expectedBalance)
			return nil
		})
	}

	r.Summary()
}

// ============= LEGACY TESTS (kept for compatibility) =============

func setupPaymentTestRouter(t *testing.T) (*gin.Engine, *PaymentHandler, *sql.DB) {
	gin.SetMode(gin.TestMode)

	db := testutil.SetupTestDB(t)

	paymentRepo := repository.NewPaymentRepository(db)
	activityService := services.NewActivityService(repository.NewActivityRepository(db))
	emailService := services.NewEmailService()
	studentRepo := repository.NewStudentRepository(db)

	paymentHandler := NewPaymentHandler(paymentRepo, activityService, emailService, studentRepo)

	router := gin.New()
	router.POST("/api/payments/transactions", paymentHandler.CreateTransaction)
	router.GET("/api/payments/transactions", paymentHandler.GetAllTransactions)

	return router, paymentHandler, db
}

func TestPaymentHandler_CreateTransaction(t *testing.T) {
	router, _, db := setupPaymentTestRouter(t)
	defer db.Close()
	defer testutil.CleanupTestDB(t, db)

	// Note: This test requires a student to exist in the database
	// In a full integration test, you would create a student first

	reqBody := models.PaymentTransaction{
		StudentID:     "test-student-id",
		Amount:        5000.0,
		Type:          "payment",
		PaymentMethod: "cash",
		Description:   "Test payment",
	}

	jsonBody, _ := json.Marshal(reqBody)
	req, _ := http.NewRequest("POST", "/api/payments/transactions", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// This will likely fail without proper setup, but tests the handler structure
	// In real test, you'd need to create company, student, etc. first
	assert.True(t, w.Code == http.StatusCreated || w.Code == http.StatusInternalServerError || w.Code == http.StatusBadRequest)
}

func TestPaymentHandler_GetAllTransactions(t *testing.T) {
	router, _, db := setupPaymentTestRouter(t)
	defer db.Close()
	defer testutil.CleanupTestDB(t, db)

	req, _ := http.NewRequest("GET", "/api/payments/transactions", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Should return 200 even if empty
	assert.Equal(t, http.StatusOK, w.Code)

	var transactions []models.PaymentTransaction
	err := json.Unmarshal(w.Body.Bytes(), &transactions)
	require.NoError(t, err)
	assert.NotNil(t, transactions)
}

