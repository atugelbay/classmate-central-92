package repository

import (
	"classmate-central/internal/models"
	"database/sql"
	"fmt"
)

type PaymentRepository struct {
	db *sql.DB
}

func NewPaymentRepository(db *sql.DB) *PaymentRepository {
	return &PaymentRepository{db: db}
}

// Payment Transactions

func (r *PaymentRepository) CreateTransaction(tx *models.PaymentTransaction, companyID string) error {
	query := `INSERT INTO payment_transactions (student_id, amount, type, payment_method, description, created_by, company_id) 
	          VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, created_at`
	return r.db.QueryRow(query, tx.StudentID, tx.Amount, tx.Type, tx.PaymentMethod, tx.Description, tx.CreatedBy, companyID).
		Scan(&tx.ID, &tx.CreatedAt)
}

func (r *PaymentRepository) GetTransactionsByStudent(studentID string, companyID string) ([]models.PaymentTransaction, error) {
	query := `SELECT id, student_id, amount, type, payment_method, description, created_at, created_by 
	          FROM payment_transactions WHERE student_id = $1 AND company_id = $2 ORDER BY created_at DESC`
	rows, err := r.db.Query(query, studentID, companyID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	transactions := []models.PaymentTransaction{}
	for rows.Next() {
		var tx models.PaymentTransaction
		if err := rows.Scan(&tx.ID, &tx.StudentID, &tx.Amount, &tx.Type, &tx.PaymentMethod, &tx.Description, &tx.CreatedAt, &tx.CreatedBy); err != nil {
			return nil, err
		}
		transactions = append(transactions, tx)
	}
	return transactions, nil
}

func (r *PaymentRepository) GetAllTransactions(companyID string) ([]models.PaymentTransaction, error) {
	query := `SELECT id, student_id, amount, type, payment_method, description, created_at, created_by 
	          FROM payment_transactions WHERE company_id = $1 ORDER BY created_at DESC`
	rows, err := r.db.Query(query, companyID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	transactions := []models.PaymentTransaction{}
	for rows.Next() {
		var tx models.PaymentTransaction
		if err := rows.Scan(&tx.ID, &tx.StudentID, &tx.Amount, &tx.Type, &tx.PaymentMethod, &tx.Description, &tx.CreatedAt, &tx.CreatedBy); err != nil {
			return nil, err
		}
		transactions = append(transactions, tx)
	}
	return transactions, nil
}

// Student Balance

func (r *PaymentRepository) GetStudentBalance(studentID string) (*models.StudentBalance, error) {
	query := `SELECT student_id, balance, last_payment_date, version FROM student_balance WHERE student_id = $1`
	var balance models.StudentBalance
	err := r.db.QueryRow(query, studentID).Scan(&balance.StudentID, &balance.Balance, &balance.LastPaymentDate, &balance.Version)
	if err == sql.ErrNoRows {
		// If no balance record exists, create one with zero balance
		return r.CreateStudentBalance(studentID)
	}
	if err != nil {
		return nil, err
	}
	return &balance, nil
}

func (r *PaymentRepository) CreateStudentBalance(studentID string) (*models.StudentBalance, error) {
	query := `INSERT INTO student_balance (student_id, balance, version) VALUES ($1, 0.00, 0) 
	          ON CONFLICT (student_id) DO NOTHING RETURNING student_id, balance, last_payment_date, version`
	var balance models.StudentBalance
	err := r.db.QueryRow(query, studentID).Scan(&balance.StudentID, &balance.Balance, &balance.LastPaymentDate, &balance.Version)
	if err != nil {
		// If conflict occurred, get the existing balance
		return r.GetStudentBalance(studentID)
	}
	return &balance, nil
}

func (r *PaymentRepository) UpdateStudentBalance(studentID string, amount float64) error {
	query := `UPDATE student_balance SET balance = balance + $1, last_payment_date = CURRENT_TIMESTAMP 
	          WHERE student_id = $2`
	_, err := r.db.Exec(query, amount, studentID)
	if err != nil {
		return err
	}
	return nil
}

// Transaction-based methods for atomic operations

// CreateTransactionWithBalance creates a transaction and updates balance atomically
func (r *PaymentRepository) CreateTransactionWithBalance(tx *models.PaymentTransaction, companyID string) error {
	dbTx, err := r.db.Begin()
	if err != nil {
		return fmt.Errorf("error starting transaction: %w", err)
	}
	defer dbTx.Rollback()

	// Create transaction record
	query := `INSERT INTO payment_transactions (student_id, amount, type, payment_method, description, created_by, company_id) 
	          VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, created_at`
	err = dbTx.QueryRow(query, tx.StudentID, tx.Amount, tx.Type, tx.PaymentMethod, tx.Description, tx.CreatedBy, companyID).
		Scan(&tx.ID, &tx.CreatedAt)
	if err != nil {
		return fmt.Errorf("error creating transaction: %w", err)
	}

	// Ensure student balance exists
	_, err = dbTx.Exec(`
		INSERT INTO student_balance (student_id, balance, version)
		VALUES ($1, 0, 0)
		ON CONFLICT (student_id) DO NOTHING
	`, tx.StudentID)
	if err != nil {
		return fmt.Errorf("error ensuring student balance exists: %w", err)
	}

	// Update balance based on transaction type with optimistic locking
	var balanceAdjustment float64
	switch tx.Type {
	case "payment":
		balanceAdjustment = tx.Amount
	case "refund":
		balanceAdjustment = tx.Amount
	case "debt":
		balanceAdjustment = -tx.Amount // Debt reduces balance
	default:
		balanceAdjustment = tx.Amount
	}

	updateQuery := `UPDATE student_balance 
	                SET balance = balance + $1, 
	                    last_payment_date = CASE WHEN $2 > 0 THEN CURRENT_TIMESTAMP ELSE last_payment_date END,
	                    version = version + 1
	                WHERE student_id = $3`
	result, err := dbTx.Exec(updateQuery, balanceAdjustment, balanceAdjustment, tx.StudentID)
	if err != nil {
		return fmt.Errorf("error updating balance: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("error checking update result: %w", err)
	}
	if rowsAffected == 0 {
		return fmt.Errorf("balance record not found for student %s", tx.StudentID)
	}

	// Commit transaction
	if err = dbTx.Commit(); err != nil {
		return fmt.Errorf("error committing transaction: %w", err)
	}

	return nil
}

func (r *PaymentRepository) GetAllBalances(companyID string) ([]models.StudentBalance, error) {
	query := `SELECT sb.student_id, sb.balance, sb.last_payment_date 
	          FROM student_balance sb
	          JOIN students s ON sb.student_id = s.id
	          WHERE s.company_id = $1
	          ORDER BY sb.balance DESC`
	rows, err := r.db.Query(query, companyID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	balances := []models.StudentBalance{}
	for rows.Next() {
		var balance models.StudentBalance
		if err := rows.Scan(&balance.StudentID, &balance.Balance, &balance.LastPaymentDate); err != nil {
			return nil, err
		}
		balances = append(balances, balance)
	}
	return balances, nil
}
