package repository

import (
	"database/sql"
	"fmt"

	"classmate-central/internal/models"

	"github.com/google/uuid"
)

type CompanyRepository struct {
	db *sql.DB
}

func NewCompanyRepository(db *sql.DB) *CompanyRepository {
	return &CompanyRepository{db: db}
}

// DB returns the underlying database connection
func (r *CompanyRepository) DB() *sql.DB {
	return r.db
}

// Create creates a new company
func (r *CompanyRepository) Create(company *models.Company) error {
	// Generate UUID if not provided
	if company.ID == "" {
		company.ID = uuid.New().String()
	}

	query := `
		INSERT INTO companies (id, name, status, created_at, updated_at)
		VALUES ($1, $2, $3, NOW(), NOW())
		RETURNING created_at, updated_at
	`

	err := r.db.QueryRow(query, company.ID, company.Name, company.Status).
		Scan(&company.CreatedAt, &company.UpdatedAt)
	if err != nil {
		return fmt.Errorf("error creating company: %w", err)
	}

	return nil
}

// GetByID retrieves a company by ID
func (r *CompanyRepository) GetByID(id string) (*models.Company, error) {
	company := &models.Company{}
	query := `SELECT id, name, status, created_at, updated_at FROM companies WHERE id = $1`

	err := r.db.QueryRow(query, id).Scan(
		&company.ID, &company.Name, &company.Status, &company.CreatedAt, &company.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("error getting company by id: %w", err)
	}

	return company, nil
}

// GetAll retrieves all companies
func (r *CompanyRepository) GetAll() ([]*models.Company, error) {
	query := `SELECT id, name, status, created_at, updated_at FROM companies ORDER BY created_at DESC`

	rows, err := r.db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("error getting companies: %w", err)
	}
	defer rows.Close()

	companies := []*models.Company{}
	for rows.Next() {
		company := &models.Company{}
		err := rows.Scan(
			&company.ID, &company.Name, &company.Status, &company.CreatedAt, &company.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("error scanning company: %w", err)
		}
		companies = append(companies, company)
	}

	return companies, nil
}

// Update updates a company
func (r *CompanyRepository) Update(company *models.Company) error {
	query := `
		UPDATE companies
		SET name = $1, status = $2, updated_at = NOW()
		WHERE id = $3
		RETURNING updated_at
	`

	err := r.db.QueryRow(query, company.Name, company.Status, company.ID).
		Scan(&company.UpdatedAt)
	if err != nil {
		return fmt.Errorf("error updating company: %w", err)
	}

	return nil
}

// Delete deletes a company (soft delete by setting status to 'inactive')
func (r *CompanyRepository) Delete(id string) error {
	query := `UPDATE companies SET status = 'inactive', updated_at = NOW() WHERE id = $1`

	_, err := r.db.Exec(query, id)
	if err != nil {
		return fmt.Errorf("error deleting company: %w", err)
	}

	return nil
}
