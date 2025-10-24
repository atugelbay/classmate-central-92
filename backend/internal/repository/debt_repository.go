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

func (r *DebtRepository) Create(debt *models.DebtRecord) error {
	query := `INSERT INTO debt_records (student_id, amount, due_date, status, notes) 
	          VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at`
	return r.db.QueryRow(query, debt.StudentID, debt.Amount, debt.DueDate, debt.Status, debt.Notes).
		Scan(&debt.ID, &debt.CreatedAt)
}

func (r *DebtRepository) GetByStudent(studentID string) ([]models.DebtRecord, error) {
	query := `SELECT id, student_id, amount, due_date, status, notes, created_at 
	          FROM debt_records WHERE student_id = $1 ORDER BY created_at DESC`
	rows, err := r.db.Query(query, studentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	debts := []models.DebtRecord{}
	for rows.Next() {
		var debt models.DebtRecord
		if err := rows.Scan(&debt.ID, &debt.StudentID, &debt.Amount, &debt.DueDate, &debt.Status, &debt.Notes, &debt.CreatedAt); err != nil {
			return nil, err
		}
		debts = append(debts, debt)
	}
	return debts, nil
}

func (r *DebtRepository) GetAll() ([]models.DebtRecord, error) {
	query := `SELECT id, student_id, amount, due_date, status, notes, created_at 
	          FROM debt_records ORDER BY created_at DESC`
	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	debts := []models.DebtRecord{}
	for rows.Next() {
		var debt models.DebtRecord
		if err := rows.Scan(&debt.ID, &debt.StudentID, &debt.Amount, &debt.DueDate, &debt.Status, &debt.Notes, &debt.CreatedAt); err != nil {
			return nil, err
		}
		debts = append(debts, debt)
	}
	return debts, nil
}

func (r *DebtRepository) GetByStatus(status string) ([]models.DebtRecord, error) {
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
		if err := rows.Scan(&debt.ID, &debt.StudentID, &debt.Amount, &debt.DueDate, &debt.Status, &debt.Notes, &debt.CreatedAt); err != nil {
			return nil, err
		}
		debts = append(debts, debt)
	}
	return debts, nil
}

func (r *DebtRepository) Update(debt *models.DebtRecord) error {
	query := `UPDATE debt_records SET amount = $1, due_date = $2, status = $3, notes = $4 WHERE id = $5`
	_, err := r.db.Exec(query, debt.Amount, debt.DueDate, debt.Status, debt.Notes, debt.ID)
	return err
}

func (r *DebtRepository) Delete(id int) error {
	query := `DELETE FROM debt_records WHERE id = $1`
	_, err := r.db.Exec(query, id)
	return err
}
