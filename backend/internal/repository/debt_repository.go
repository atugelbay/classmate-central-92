package repository

import (
	"classmate-central/internal/models"
	"database/sql"
)

type DebtRepository struct {
	db *sql.DB
}

func NewDebtRepository(db *sql.DB) *DebtRepository {
	return &DebtRepository{db: db}
}

func (r *DebtRepository) Create(debt *models.DebtRecord, companyID string) error {
	query := `INSERT INTO debt_records (student_id, amount, due_date, status, notes, company_id) 
	          VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, created_at`
	return r.db.QueryRow(query, debt.StudentID, debt.Amount, debt.DueDate, debt.Status, debt.Notes, companyID).
		Scan(&debt.ID, &debt.CreatedAt)
}

func (r *DebtRepository) GetByStudent(studentID string, companyID string) ([]models.DebtRecord, error) {
	query := `SELECT id, student_id, amount, due_date, status, notes, created_at 
	          FROM debt_records WHERE student_id = $1 AND company_id = $2 ORDER BY created_at DESC`
	rows, err := r.db.Query(query, studentID, companyID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	debts := []models.DebtRecord{}
	for rows.Next() {
		var debt models.DebtRecord
		var notes sql.NullString
		if err := rows.Scan(&debt.ID, &debt.StudentID, &debt.Amount, &debt.DueDate, &debt.Status, &notes, &debt.CreatedAt); err != nil {
			return nil, err
		}
		if notes.Valid {
			debt.Notes = notes.String
		}
		debts = append(debts, debt)
	}
	return debts, nil
}

func (r *DebtRepository) GetAll(companyID string) ([]models.DebtRecord, error) {
	query := `SELECT id, student_id, amount, due_date, status, notes, created_at 
	          FROM debt_records WHERE company_id = $1 ORDER BY created_at DESC`
	rows, err := r.db.Query(query, companyID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	debts := []models.DebtRecord{}
	for rows.Next() {
		var debt models.DebtRecord
		var notes sql.NullString
		if err := rows.Scan(&debt.ID, &debt.StudentID, &debt.Amount, &debt.DueDate, &debt.Status, &notes, &debt.CreatedAt); err != nil {
			return nil, err
		}
		if notes.Valid {
			debt.Notes = notes.String
		}
		debts = append(debts, debt)
	}
	return debts, nil
}

func (r *DebtRepository) GetByStatus(status string, companyID string) ([]models.DebtRecord, error) {
	query := `SELECT id, student_id, amount, due_date, status, notes, created_at 
	          FROM debt_records WHERE status = $1 AND company_id = $2 ORDER BY created_at DESC`
	rows, err := r.db.Query(query, status, companyID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	debts := []models.DebtRecord{}
	for rows.Next() {
		var debt models.DebtRecord
		var notes sql.NullString
		if err := rows.Scan(&debt.ID, &debt.StudentID, &debt.Amount, &debt.DueDate, &debt.Status, &notes, &debt.CreatedAt); err != nil {
			return nil, err
		}
		if notes.Valid {
			debt.Notes = notes.String
		}
		debts = append(debts, debt)
	}
	return debts, nil
}

func (r *DebtRepository) Update(debt *models.DebtRecord, companyID string) error {
	query := `UPDATE debt_records SET amount = $1, due_date = $2, status = $3, notes = $4 WHERE id = $5 AND company_id = $6`
	_, err := r.db.Exec(query, debt.Amount, debt.DueDate, debt.Status, debt.Notes, debt.ID, companyID)
	return err
}

func (r *DebtRepository) Delete(id int, companyID string) error {
	query := `DELETE FROM debt_records WHERE id = $1 AND company_id = $2`
	_, err := r.db.Exec(query, id, companyID)
	return err
}

// GetByStatusAllCompanies - for background tasks (notifications, etc.)
func (r *DebtRepository) GetByStatusAllCompanies(status string) ([]models.DebtRecord, error) {
	query := `SELECT id, student_id, amount, due_date, status, notes, created_at 
	          FROM debt_records WHERE status = $1 ORDER BY created_at DESC`
	rows, err := r.db.Query(query, status)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	debts := []models.DebtRecord{}
	for rows.Next() {
		var debt models.DebtRecord
		var notes sql.NullString
		if err := rows.Scan(&debt.ID, &debt.StudentID, &debt.Amount, &debt.DueDate, &debt.Status, &notes, &debt.CreatedAt); err != nil {
			return nil, err
		}
		if notes.Valid {
			debt.Notes = notes.String
		}
		debts = append(debts, debt)
	}
	return debts, nil
}
