package services

import (
	"database/sql"
	"testing"

	"classmate-central/internal/models"
	"classmate-central/internal/repository"
	"classmate-central/internal/testutil"
)

// setupBalanceTest creates test context for balance tests
func setupBalanceTest(t *testing.T) (*repository.PaymentRepository, *sql.DB, *testutil.TestContext) {
	db := testutil.SetupTestDB(t)
	ctx := testutil.NewTestContext(t, db)
	paymentRepo := repository.NewPaymentRepository(db)

	return paymentRepo, db, ctx
}

// TestBalance_AllowsNegative tests that balance can go negative
func TestBalance_AllowsNegative(t *testing.T) {
	r := testutil.NewWorkflowReporter(t)
	paymentRepo, db, ctx := setupBalanceTest(t)
	defer db.Close()
	defer testutil.CleanupTestDB(t, db)

	r.Step("Create initial balance of 10000", func() error {
		testutil.CreateTestStudentBalance(t, db, ctx.Student.ID, 10000)
		return nil
	})

	r.Step("Create debt of 25000 (should make balance negative)", func() error {
		tx := &models.PaymentTransaction{
			StudentID:     ctx.Student.ID,
			Amount:        25000,
			Type:          "debt",
			PaymentMethod: "other",
			Description:   "Large debt",
		}
		err := paymentRepo.CreateTransactionWithBalance(tx, ctx.Company.ID)
		return err
	})

	r.Step("Verify balance is negative (-15000)", func() error {
		balance := testutil.GetStudentBalance(t, db, ctx.Student.ID)
		r.Check("negative_balance", float64(-15000), balance.Balance, balance.Balance == -15000)
		return nil
	})

	r.Summary()
}

// TestBalance_TransactionHistory tests that all operations create transaction records
func TestBalance_TransactionHistory(t *testing.T) {
	r := testutil.NewWorkflowReporter(t)
	paymentRepo, db, ctx := setupBalanceTest(t)
	defer db.Close()
	defer testutil.CleanupTestDB(t, db)

	r.Step("Create initial balance of 0", func() error {
		testutil.CreateTestStudentBalance(t, db, ctx.Student.ID, 0)
		return nil
	})

	r.Step("Create multiple transactions", func() error {
		transactions := []struct {
			txType string
			amount float64
		}{
			{"payment", 50000},
			{"payment", 30000},
			{"refund", 10000},
			{"debt", 5000},
		}

		for _, tx := range transactions {
			ptx := &models.PaymentTransaction{
				StudentID:     ctx.Student.ID,
				Amount:        tx.amount,
				Type:          tx.txType,
				PaymentMethod: "cash",
				Description:   "Test " + tx.txType,
			}
			if err := paymentRepo.CreateTransactionWithBalance(ptx, ctx.Company.ID); err != nil {
				return err
			}
		}
		return nil
	})

	r.Step("Verify all 4 transactions recorded", func() error {
		transactions := testutil.GetAllTransactionsForStudent(t, db, ctx.Student.ID)
		r.Check("transaction_count", 4, len(transactions), len(transactions) == 4)
		return nil
	})

	r.Step("Verify transaction types in history", func() error {
		paymentCount := testutil.GetTransactionCount(t, db, ctx.Student.ID, "payment")
		refundCount := testutil.GetTransactionCount(t, db, ctx.Student.ID, "refund")
		debtCount := testutil.GetTransactionCount(t, db, ctx.Student.ID, "debt")

		r.Check("payment_count", 2, paymentCount, paymentCount == 2)
		r.Check("refund_count", 1, refundCount, refundCount == 1)
		r.Check("debt_count", 1, debtCount, debtCount == 1)
		return nil
	})

	r.Step("Verify final balance (50k + 30k + 10k - 5k = 85k)", func() error {
		balance := testutil.GetStudentBalance(t, db, ctx.Student.ID)
		r.Check("final_balance", float64(85000), balance.Balance, balance.Balance == 85000)
		return nil
	})

	r.Summary()
}

// TestBalance_OptimisticLocking tests that version increments on update
func TestBalance_OptimisticLocking(t *testing.T) {
	r := testutil.NewWorkflowReporter(t)
	paymentRepo, db, ctx := setupBalanceTest(t)
	defer db.Close()
	defer testutil.CleanupTestDB(t, db)

	r.Step("Create initial balance with version 0", func() error {
		testutil.CreateTestStudentBalance(t, db, ctx.Student.ID, 0)
		return nil
	})

	r.Step("Verify initial version is 0", func() error {
		balance := testutil.GetStudentBalance(t, db, ctx.Student.ID)
		r.Check("initial_version", 0, balance.Version, balance.Version == 0)
		return nil
	})

	r.Step("Create first payment", func() error {
		tx := &models.PaymentTransaction{
			StudentID:     ctx.Student.ID,
			Amount:        10000,
			Type:          "payment",
			PaymentMethod: "cash",
			Description:   "First payment",
		}
		return paymentRepo.CreateTransactionWithBalance(tx, ctx.Company.ID)
	})

	r.Step("Verify version incremented to 1", func() error {
		balance := testutil.GetStudentBalance(t, db, ctx.Student.ID)
		r.Check("version_after_first", 1, balance.Version, balance.Version == 1)
		return nil
	})

	r.Step("Create second payment", func() error {
		tx := &models.PaymentTransaction{
			StudentID:     ctx.Student.ID,
			Amount:        20000,
			Type:          "payment",
			PaymentMethod: "card",
			Description:   "Second payment",
		}
		return paymentRepo.CreateTransactionWithBalance(tx, ctx.Company.ID)
	})

	r.Step("Verify version incremented to 2", func() error {
		balance := testutil.GetStudentBalance(t, db, ctx.Student.ID)
		r.Check("version_after_second", 2, balance.Version, balance.Version == 2)
		return nil
	})

	r.Step("Create third transaction (debt)", func() error {
		tx := &models.PaymentTransaction{
			StudentID:     ctx.Student.ID,
			Amount:        5000,
			Type:          "debt",
			PaymentMethod: "other",
			Description:   "Debt",
		}
		return paymentRepo.CreateTransactionWithBalance(tx, ctx.Company.ID)
	})

	r.Step("Verify version incremented to 3", func() error {
		balance := testutil.GetStudentBalance(t, db, ctx.Student.ID)
		r.Check("version_after_third", 3, balance.Version, balance.Version == 3)
		r.Check("final_balance", float64(25000), balance.Balance, balance.Balance == 25000)
		return nil
	})

	r.Summary()
}

// TestBalance_InitialZero tests that new student gets 0.00 balance
func TestBalance_InitialZero(t *testing.T) {
	r := testutil.NewWorkflowReporter(t)
	paymentRepo, db, ctx := setupBalanceTest(t)
	defer db.Close()
	defer testutil.CleanupTestDB(t, db)

	// Do NOT create initial balance

	r.Step("Verify no balance record exists", func() error {
		var count int
		err := db.QueryRow(`SELECT COUNT(*) FROM student_balance WHERE student_id = $1`, ctx.Student.ID).Scan(&count)
		if err != nil {
			return err
		}
		r.Check("no_balance_record", 0, count, count == 0)
		return nil
	})

	r.Step("Get balance via repository (should auto-create)", func() error {
		balance, err := paymentRepo.GetStudentBalance(ctx.Student.ID)
		if err != nil {
			return err
		}
		r.Check("auto_created_balance", float64(0), balance.Balance, balance.Balance == 0)
		r.Check("auto_created_version", 0, balance.Version, balance.Version == 0)
		return nil
	})

	r.Step("Verify balance record now exists", func() error {
		var count int
		err := db.QueryRow(`SELECT COUNT(*) FROM student_balance WHERE student_id = $1`, ctx.Student.ID).Scan(&count)
		if err != nil {
			return err
		}
		r.Check("balance_record_exists", 1, count, count == 1)
		return nil
	})

	r.Summary()
}

// TestBalance_MultipleDebtsGoDeepNegative tests accumulating debts
func TestBalance_MultipleDebtsGoDeepNegative(t *testing.T) {
	r := testutil.NewWorkflowReporter(t)
	paymentRepo, db, ctx := setupBalanceTest(t)
	defer db.Close()
	defer testutil.CleanupTestDB(t, db)

	r.Step("Create initial balance of 0", func() error {
		testutil.CreateTestStudentBalance(t, db, ctx.Student.ID, 0)
		return nil
	})

	r.Step("Create 3 debts of 10000 each", func() error {
		for i := 1; i <= 3; i++ {
			tx := &models.PaymentTransaction{
				StudentID:     ctx.Student.ID,
				Amount:        10000,
				Type:          "debt",
				PaymentMethod: "other",
				Description:   "Debt payment",
			}
			if err := paymentRepo.CreateTransactionWithBalance(tx, ctx.Company.ID); err != nil {
				return err
			}
		}
		return nil
	})

	r.Step("Verify balance is -30000", func() error {
		balance := testutil.GetStudentBalance(t, db, ctx.Student.ID)
		r.Check("deep_negative_balance", float64(-30000), balance.Balance, balance.Balance == -30000)
		return nil
	})

	r.Step("Pay off debt with 50000 payment", func() error {
		tx := &models.PaymentTransaction{
			StudentID:     ctx.Student.ID,
			Amount:        50000,
			Type:          "payment",
			PaymentMethod: "transfer",
			Description:   "Debt payoff",
		}
		return paymentRepo.CreateTransactionWithBalance(tx, ctx.Company.ID)
	})

	r.Step("Verify balance is now positive (20000)", func() error {
		balance := testutil.GetStudentBalance(t, db, ctx.Student.ID)
		r.Check("recovered_balance", float64(20000), balance.Balance, balance.Balance == 20000)
		return nil
	})

	r.Summary()
}
