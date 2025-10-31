package repository

import (
	"database/sql"
	"fmt"

	"classmate-central/internal/models"
)

type InvoiceRepository struct {
	db *sql.DB
}

func NewInvoiceRepository(db *sql.DB) *InvoiceRepository {
	return &InvoiceRepository{db: db}
}

func (r *InvoiceRepository) Create(invoice *models.Invoice, companyID string) error {
	query := `
		INSERT INTO invoice (student_id, issued_at, due_at, status, company_id)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at, updated_at
	`
	err := r.db.QueryRow(
		query,
		invoice.StudentID,
		invoice.IssuedAt,
		invoice.DueAt,
		invoice.Status,
		companyID,
	).Scan(&invoice.ID, &invoice.CreatedAt, &invoice.UpdatedAt)
	if err != nil {
		return fmt.Errorf("error creating invoice: %w", err)
	}
	return nil
}

func (r *InvoiceRepository) GetByID(id int64, companyID string) (*models.Invoice, error) {
	invoice := &models.Invoice{}
	var dueAt sql.NullTime

	query := `SELECT id, student_id, issued_at, due_at, status, company_id, created_at, updated_at 
	          FROM invoice WHERE id = $1 AND company_id = $2`
	err := r.db.QueryRow(query, id, companyID).Scan(
		&invoice.ID,
		&invoice.StudentID,
		&invoice.IssuedAt,
		&dueAt,
		&invoice.Status,
		&invoice.CompanyID,
		&invoice.CreatedAt,
		&invoice.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("error getting invoice: %w", err)
	}

	if dueAt.Valid {
		invoice.DueAt = &dueAt.Time
	}

	return invoice, nil
}

func (r *InvoiceRepository) GetByStudentID(studentID string, companyID string) ([]*models.Invoice, error) {
	query := `
		SELECT id, student_id, issued_at, due_at, status, company_id, created_at, updated_at 
		FROM invoice 
		WHERE student_id = $1 AND company_id = $2
		ORDER BY issued_at DESC
	`
	rows, err := r.db.Query(query, studentID, companyID)
	if err != nil {
		return nil, fmt.Errorf("error getting invoices: %w", err)
	}
	defer rows.Close()

	invoices := []*models.Invoice{}
	for rows.Next() {
		invoice := &models.Invoice{}
		var dueAt sql.NullTime

		err := rows.Scan(
			&invoice.ID,
			&invoice.StudentID,
			&invoice.IssuedAt,
			&dueAt,
			&invoice.Status,
			&invoice.CompanyID,
			&invoice.CreatedAt,
			&invoice.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("error scanning invoice: %w", err)
		}

		if dueAt.Valid {
			invoice.DueAt = &dueAt.Time
		}

		invoices = append(invoices, invoice)
	}

	return invoices, nil
}

func (r *InvoiceRepository) Update(invoice *models.Invoice, companyID string) error {
	query := `
		UPDATE invoice 
		SET student_id = $2, issued_at = $3, due_at = $4, status = $5, updated_at = CURRENT_TIMESTAMP
		WHERE id = $1 AND company_id = $6
	`
	_, err := r.db.Exec(
		query,
		invoice.ID,
		invoice.StudentID,
		invoice.IssuedAt,
		invoice.DueAt,
		invoice.Status,
		companyID,
	)
	if err != nil {
		return fmt.Errorf("error updating invoice: %w", err)
	}
	return nil
}

func (r *InvoiceRepository) Delete(id int64, companyID string) error {
	query := `DELETE FROM invoice WHERE id = $1 AND company_id = $2`
	_, err := r.db.Exec(query, id, companyID)
	if err != nil {
		return fmt.Errorf("error deleting invoice: %w", err)
	}
	return nil
}

// InvoiceItem methods

func (r *InvoiceRepository) CreateItem(item *models.InvoiceItem, companyID string) error {
	query := `
		INSERT INTO invoice_item (invoice_id, description, quantity, unit_price, meta, company_id)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at
	`
	err := r.db.QueryRow(
		query,
		item.InvoiceID,
		item.Description,
		item.Quantity,
		item.UnitPrice,
		item.Meta,
		companyID,
	).Scan(&item.ID, &item.CreatedAt)
	if err != nil {
		return fmt.Errorf("error creating invoice item: %w", err)
	}
	return nil
}

func (r *InvoiceRepository) GetItemsByInvoiceID(invoiceID int64, companyID string) ([]*models.InvoiceItem, error) {
	query := `
		SELECT id, invoice_id, description, quantity, unit_price, meta, company_id, created_at 
		FROM invoice_item 
		WHERE invoice_id = $1 AND company_id = $2
		ORDER BY id ASC
	`
	rows, err := r.db.Query(query, invoiceID, companyID)
	if err != nil {
		return nil, fmt.Errorf("error getting invoice items: %w", err)
	}
	defer rows.Close()

	items := []*models.InvoiceItem{}
	for rows.Next() {
		item := &models.InvoiceItem{}
		var meta sql.NullString

		err := rows.Scan(
			&item.ID,
			&item.InvoiceID,
			&item.Description,
			&item.Quantity,
			&item.UnitPrice,
			&meta,
			&item.CompanyID,
			&item.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("error scanning invoice item: %w", err)
		}

		if meta.Valid {
			item.Meta = &meta.String
		}

		items = append(items, item)
	}

	return items, nil
}

func (r *InvoiceRepository) DeleteItem(id int64, companyID string) error {
	query := `DELETE FROM invoice_item WHERE id = $1 AND company_id = $2`
	_, err := r.db.Exec(query, id, companyID)
	if err != nil {
		return fmt.Errorf("error deleting invoice item: %w", err)
	}
	return nil
}

