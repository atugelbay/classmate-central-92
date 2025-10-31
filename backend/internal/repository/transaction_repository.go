package repository

import (
	"database/sql"
	"fmt"
	"time"

	"classmate-central/internal/models"
)

type TransactionRepository struct {
	db *sql.DB
}

func NewTransactionRepository(db *sql.DB) *TransactionRepository {
	return &TransactionRepository{db: db}
}

func (r *TransactionRepository) Create(transaction *models.Transaction, companyID string) error {
	query := `
		INSERT INTO transaction (payment_id, invoice_id, subscription_id, amount, kind, company_id)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at
	`
	err := r.db.QueryRow(
		query,
		transaction.PaymentID,
		transaction.InvoiceID,
		transaction.SubscriptionID,
		transaction.Amount,
		transaction.Kind,
		companyID,
	).Scan(&transaction.ID, &transaction.CreatedAt)
	if err != nil {
		return fmt.Errorf("error creating transaction: %w", err)
	}
	return nil
}

func (r *TransactionRepository) GetByID(id int64, companyID string) (*models.Transaction, error) {
	transaction := &models.Transaction{}
	var paymentID sql.NullInt64
	var invoiceID sql.NullInt64
	var subscriptionID sql.NullString

	query := `SELECT id, payment_id, invoice_id, subscription_id, amount, kind, company_id, created_at 
	          FROM transaction WHERE id = $1 AND company_id = $2`
	err := r.db.QueryRow(query, id, companyID).Scan(
		&transaction.ID,
		&paymentID,
		&invoiceID,
		&subscriptionID,
		&transaction.Amount,
		&transaction.Kind,
		&transaction.CompanyID,
		&transaction.CreatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("error getting transaction: %w", err)
	}

	if paymentID.Valid {
		paymentIDInt := int(paymentID.Int64)
		transaction.PaymentID = &paymentIDInt
	}
	if invoiceID.Valid {
		invoiceIDInt := int64(invoiceID.Int64)
		transaction.InvoiceID = &invoiceIDInt
	}
	if subscriptionID.Valid {
		transaction.SubscriptionID = &subscriptionID.String
	}

	return transaction, nil
}

func (r *TransactionRepository) GetByPaymentID(paymentID int, companyID string) ([]*models.Transaction, error) {
	query := `
		SELECT id, payment_id, invoice_id, subscription_id, amount, kind, company_id, created_at 
		FROM transaction 
		WHERE payment_id = $1 AND company_id = $2
		ORDER BY created_at DESC
	`
	rows, err := r.db.Query(query, paymentID, companyID)
	if err != nil {
		return nil, fmt.Errorf("error getting transactions: %w", err)
	}
	defer rows.Close()

	return r.scanTransactions(rows)
}

func (r *TransactionRepository) GetByInvoiceID(invoiceID int64, companyID string) ([]*models.Transaction, error) {
	query := `
		SELECT id, payment_id, invoice_id, subscription_id, amount, kind, company_id, created_at 
		FROM transaction 
		WHERE invoice_id = $1 AND company_id = $2
		ORDER BY created_at DESC
	`
	rows, err := r.db.Query(query, invoiceID, companyID)
	if err != nil {
		return nil, fmt.Errorf("error getting transactions: %w", err)
	}
	defer rows.Close()

	return r.scanTransactions(rows)
}

func (r *TransactionRepository) GetBySubscriptionID(subscriptionID string, companyID string) ([]*models.Transaction, error) {
	query := `
		SELECT id, payment_id, invoice_id, subscription_id, amount, kind, company_id, created_at 
		FROM transaction 
		WHERE subscription_id = $1 AND company_id = $2
		ORDER BY created_at DESC
	`
	rows, err := r.db.Query(query, subscriptionID, companyID)
	if err != nil {
		return nil, fmt.Errorf("error getting transactions: %w", err)
	}
	defer rows.Close()

	return r.scanTransactions(rows)
}

func (r *TransactionRepository) GetInRange(start, end time.Time, companyID string) ([]*models.Transaction, error) {
	query := `
		SELECT id, payment_id, invoice_id, subscription_id, amount, kind, company_id, created_at 
		FROM transaction 
		WHERE company_id = $1 AND created_at >= $2 AND created_at < $3
		ORDER BY created_at DESC
	`
	rows, err := r.db.Query(query, companyID, start, end)
	if err != nil {
		return nil, fmt.Errorf("error getting transactions in range: %w", err)
	}
	defer rows.Close()

	return r.scanTransactions(rows)
}

func (r *TransactionRepository) scanTransactions(rows *sql.Rows) ([]*models.Transaction, error) {
	transactions := []*models.Transaction{}
	for rows.Next() {
		transaction := &models.Transaction{}
		var paymentID sql.NullInt64
		var invoiceID sql.NullInt64
		var subscriptionID sql.NullString

		err := rows.Scan(
			&transaction.ID,
			&paymentID,
			&invoiceID,
			&subscriptionID,
			&transaction.Amount,
			&transaction.Kind,
			&transaction.CompanyID,
			&transaction.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("error scanning transaction: %w", err)
		}

		if paymentID.Valid {
			paymentIDInt := int(paymentID.Int64)
			transaction.PaymentID = &paymentIDInt
		}
		if invoiceID.Valid {
			invoiceIDInt := int64(invoiceID.Int64)
			transaction.InvoiceID = &invoiceIDInt
		}
		if subscriptionID.Valid {
			transaction.SubscriptionID = &subscriptionID.String
		}

		transactions = append(transactions, transaction)
	}

	return transactions, nil
}

func (r *TransactionRepository) Delete(id int64, companyID string) error {
	query := `DELETE FROM transaction WHERE id = $1 AND company_id = $2`
	_, err := r.db.Exec(query, id, companyID)
	if err != nil {
		return fmt.Errorf("error deleting transaction: %w", err)
	}
	return nil
}

