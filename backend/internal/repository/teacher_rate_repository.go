package repository

import (
	"classmate-central/internal/models"
	"database/sql"
	"fmt"
)

type TeacherRateRepository struct {
	db *sql.DB
}

func NewTeacherRateRepository(db *sql.DB) *TeacherRateRepository {
	return &TeacherRateRepository{db: db}
}

func (r *TeacherRateRepository) Create(rate *models.TeacherRate, companyID string, branchID string) error {
	query := `
		INSERT INTO teacher_rates (id, teacher_id, lesson_type, rate_type, rate_value, is_active, company_id, branch_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING created_at
	`

	err := r.db.QueryRow(
		query,
		rate.ID,
		rate.TeacherID,
		rate.LessonType,
		rate.RateType,
		rate.RateValue,
		rate.IsActive,
		companyID,
		nullString(branchID),
	).Scan(&rate.CreatedAt)

	if err != nil {
		return fmt.Errorf("error creating teacher rate: %w", err)
	}

	rate.CompanyID = companyID
	if branchID != "" {
		rate.BranchID = branchID
	}

	return nil
}

func (r *TeacherRateRepository) GetByTeacher(teacherID string, companyID string) ([]*models.TeacherRate, error) {
	query := `
		SELECT id, teacher_id, lesson_type, rate_type, rate_value, is_active, created_at, company_id, branch_id
		FROM teacher_rates
		WHERE teacher_id = $1 AND company_id = $2
		ORDER BY lesson_type, rate_type, created_at DESC
	`

	rows, err := r.db.Query(query, teacherID, companyID)
	if err != nil {
		return nil, fmt.Errorf("error getting teacher rates: %w", err)
	}
	defer rows.Close()

	rates := []*models.TeacherRate{}
	for rows.Next() {
		rate := &models.TeacherRate{}
		var branchID sql.NullString

		err := rows.Scan(
			&rate.ID,
			&rate.TeacherID,
			&rate.LessonType,
			&rate.RateType,
			&rate.RateValue,
			&rate.IsActive,
			&rate.CreatedAt,
			&rate.CompanyID,
			&branchID,
		)
		if err != nil {
			return nil, fmt.Errorf("error scanning teacher rate: %w", err)
		}

		if branchID.Valid {
			rate.BranchID = branchID.String
		}

		rates = append(rates, rate)
	}

	return rates, nil
}

func (r *TeacherRateRepository) GetByTeacherAndLessonType(teacherID string, lessonType string, companyID string) (*models.TeacherRate, error) {
	query := `
		SELECT id, teacher_id, lesson_type, rate_type, rate_value, is_active, created_at, company_id, branch_id
		FROM teacher_rates
		WHERE teacher_id = $1 AND lesson_type = $2 AND company_id = $3 AND is_active = true
		ORDER BY rate_type, created_at DESC
		LIMIT 1
	`

	rate := &models.TeacherRate{}
	var branchID sql.NullString

	err := r.db.QueryRow(query, teacherID, lessonType, companyID).Scan(
		&rate.ID,
		&rate.TeacherID,
		&rate.LessonType,
		&rate.RateType,
		&rate.RateValue,
		&rate.IsActive,
		&rate.CreatedAt,
		&rate.CompanyID,
		&branchID,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("error getting teacher rate: %w", err)
	}

	if branchID.Valid {
		rate.BranchID = branchID.String
	}

	return rate, nil
}

func (r *TeacherRateRepository) GetActiveRatesByTeacher(teacherID string, companyID string) ([]*models.TeacherRate, error) {
	query := `
		SELECT id, teacher_id, lesson_type, rate_type, rate_value, is_active, created_at, company_id, branch_id
		FROM teacher_rates
		WHERE teacher_id = $1 AND company_id = $2 AND is_active = true
		ORDER BY lesson_type, rate_type
	`

	rows, err := r.db.Query(query, teacherID, companyID)
	if err != nil {
		return nil, fmt.Errorf("error getting active teacher rates: %w", err)
	}
	defer rows.Close()

	rates := []*models.TeacherRate{}
	for rows.Next() {
		rate := &models.TeacherRate{}
		var branchID sql.NullString

		err := rows.Scan(
			&rate.ID,
			&rate.TeacherID,
			&rate.LessonType,
			&rate.RateType,
			&rate.RateValue,
			&rate.IsActive,
			&rate.CreatedAt,
			&rate.CompanyID,
			&branchID,
		)
		if err != nil {
			return nil, fmt.Errorf("error scanning teacher rate: %w", err)
		}

		if branchID.Valid {
			rate.BranchID = branchID.String
		}

		rates = append(rates, rate)
	}

	return rates, nil
}

func (r *TeacherRateRepository) GetByID(id string, companyID string) (*models.TeacherRate, error) {
	query := `
		SELECT id, teacher_id, lesson_type, rate_type, rate_value, is_active, created_at, company_id, branch_id
		FROM teacher_rates
		WHERE id = $1 AND company_id = $2
	`

	rate := &models.TeacherRate{}
	var branchID sql.NullString

	err := r.db.QueryRow(query, id, companyID).Scan(
		&rate.ID,
		&rate.TeacherID,
		&rate.LessonType,
		&rate.RateType,
		&rate.RateValue,
		&rate.IsActive,
		&rate.CreatedAt,
		&rate.CompanyID,
		&branchID,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("error getting teacher rate: %w", err)
	}

	if branchID.Valid {
		rate.BranchID = branchID.String
	}

	return rate, nil
}

func (r *TeacherRateRepository) Update(rate *models.TeacherRate, companyID string) error {
	query := `
		UPDATE teacher_rates
		SET lesson_type = $2, rate_type = $3, rate_value = $4, is_active = $5
		WHERE id = $1 AND company_id = $6
	`

	_, err := r.db.Exec(
		query,
		rate.ID,
		rate.LessonType,
		rate.RateType,
		rate.RateValue,
		rate.IsActive,
		companyID,
	)

	if err != nil {
		return fmt.Errorf("error updating teacher rate: %w", err)
	}

	return nil
}

func (r *TeacherRateRepository) Delete(id string, companyID string) error {
	query := `DELETE FROM teacher_rates WHERE id = $1 AND company_id = $2`

	_, err := r.db.Exec(query, id, companyID)
	if err != nil {
		return fmt.Errorf("error deleting teacher rate: %w", err)
	}

	return nil
}

