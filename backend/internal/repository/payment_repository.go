package repository

import (
	"classmate-central/internal/models"
	"database/sql"
)

type PaymentRepository struct {
	db *sql.DB
}

func NewPaymentRepository(db *sql.DB) *PaymentRepository {
	return &PaymentRepository{db: db}
}

// Payment Transactions

func (r *PaymentRepository) CreateTransaction(tx *models.PaymentTransaction) error {
	query := `INSERT INTO payment_transactions (student_id, amount, type, payment_method, description, created_by) 
	          VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, created_at`
	return r.db.QueryRow(query, tx.StudentID, tx.Amount, tx.Type, tx.PaymentMethod, tx.Description, tx.CreatedBy).
		Scan(&tx.ID, &tx.CreatedAt)
}

func (r *PaymentRepository) GetTransactionsByStudent(studentID string) ([]models.PaymentTransaction, error) {
	query := `SELECT id, student_id, amount, type, payment_method, description, created_at, created_by 
	          FROM payment_transactions WHERE student_id = $1 ORDER BY created_at DESC`
	rows, err := r.db.Query(query, studentID)
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

func (r *PaymentRepository) GetAllTransactions() ([]models.PaymentTransaction, error) {
	query := `SELECT id, student_id, amount, type, payment_method, description, created_at, created_by 
	          FROM payment_transactions ORDER BY created_at DESC`
	rows, err := r.db.Query(query)
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
	query := `SELECT student_id, balance, last_payment_date FROM student_balance WHERE student_id = $1`
	var balance models.StudentBalance
	err := r.db.QueryRow(query, studentID).Scan(&balance.StudentID, &balance.Balance, &balance.LastPaymentDate)
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
	query := `INSERT INTO student_balance (student_id, balance) VALUES ($1, 0.00) 
	          ON CONFLICT (student_id) DO NOTHING RETURNING student_id, balance, last_payment_date`
	var balance models.StudentBalance
	err := r.db.QueryRow(query, studentID).Scan(&balance.StudentID, &balance.Balance, &balance.LastPaymentDate)
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

func (r *PaymentRepository) GetAllBalances() ([]models.StudentBalance, error) {
	query := `SELECT student_id, balance, last_payment_date FROM student_balance ORDER BY balance DESC`
	rows, err := r.db.Query(query)
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
