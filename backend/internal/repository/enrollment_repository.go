package repository

import (
	"database/sql"
	"fmt"
	"time"

	"classmate-central/internal/models"
)

type EnrollmentRepository struct {
	db *sql.DB
}

func NewEnrollmentRepository(db *sql.DB) *EnrollmentRepository {
	return &EnrollmentRepository{db: db}
}

func (r *EnrollmentRepository) Create(enrollment *models.Enrollment, companyID string) error {
	query := `
		INSERT INTO enrollment (student_id, group_id, joined_at, left_at, company_id)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at
	`
	err := r.db.QueryRow(
		query,
		enrollment.StudentID,
		enrollment.GroupID,
		enrollment.JoinedAt,
		enrollment.LeftAt,
		companyID,
	).Scan(&enrollment.ID, &enrollment.CreatedAt)
	if err != nil {
		return fmt.Errorf("error creating enrollment: %w", err)
	}
	return nil
}

func (r *EnrollmentRepository) GetByID(id int64, companyID string) (*models.Enrollment, error) {
	enrollment := &models.Enrollment{}
	var leftAt sql.NullTime

	query := `SELECT id, student_id, group_id, joined_at, left_at, company_id, created_at 
	          FROM enrollment WHERE id = $1 AND company_id = $2`
	err := r.db.QueryRow(query, id, companyID).Scan(
		&enrollment.ID,
		&enrollment.StudentID,
		&enrollment.GroupID,
		&enrollment.JoinedAt,
		&leftAt,
		&enrollment.CompanyID,
		&enrollment.CreatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("error getting enrollment: %w", err)
	}

	if leftAt.Valid {
		enrollment.LeftAt = &leftAt.Time
	}

	return enrollment, nil
}

func (r *EnrollmentRepository) GetByStudentAndGroup(studentID, groupID string, companyID string) (*models.Enrollment, error) {
	enrollment := &models.Enrollment{}
	var leftAt sql.NullTime

	query := `
		SELECT id, student_id, group_id, joined_at, left_at, company_id, created_at 
		FROM enrollment 
		WHERE student_id = $1 AND group_id = $2 AND company_id = $3
		ORDER BY joined_at DESC
		LIMIT 1
	`
	err := r.db.QueryRow(query, studentID, groupID, companyID).Scan(
		&enrollment.ID,
		&enrollment.StudentID,
		&enrollment.GroupID,
		&enrollment.JoinedAt,
		&leftAt,
		&enrollment.CompanyID,
		&enrollment.CreatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("error getting enrollment: %w", err)
	}

	if leftAt.Valid {
		enrollment.LeftAt = &leftAt.Time
	}

	return enrollment, nil
}

func (r *EnrollmentRepository) GetActiveByStudent(studentID string, companyID string) ([]*models.Enrollment, error) {
	query := `
		SELECT id, student_id, group_id, joined_at, left_at, company_id, created_at 
		FROM enrollment 
		WHERE student_id = $1 AND company_id = $2 AND left_at IS NULL
		ORDER BY joined_at DESC
	`
	rows, err := r.db.Query(query, studentID, companyID)
	if err != nil {
		return nil, fmt.Errorf("error getting active enrollments: %w", err)
	}
	defer rows.Close()

	enrollments := []*models.Enrollment{}
	for rows.Next() {
		enrollment := &models.Enrollment{}
		var leftAt sql.NullTime

		err := rows.Scan(
			&enrollment.ID,
			&enrollment.StudentID,
			&enrollment.GroupID,
			&enrollment.JoinedAt,
			&leftAt,
			&enrollment.CompanyID,
			&enrollment.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("error scanning enrollment: %w", err)
		}

		if leftAt.Valid {
			enrollment.LeftAt = &leftAt.Time
		}

		enrollments = append(enrollments, enrollment)
	}

	return enrollments, nil
}

func (r *EnrollmentRepository) GetActiveByGroup(groupID string, companyID string) ([]*models.Enrollment, error) {
	query := `
		SELECT id, student_id, group_id, joined_at, left_at, company_id, created_at 
		FROM enrollment 
		WHERE group_id = $1 AND company_id = $2 AND left_at IS NULL
		ORDER BY joined_at DESC
	`
	rows, err := r.db.Query(query, groupID, companyID)
	if err != nil {
		return nil, fmt.Errorf("error getting group enrollments: %w", err)
	}
	defer rows.Close()

	enrollments := []*models.Enrollment{}
	for rows.Next() {
		enrollment := &models.Enrollment{}
		var leftAt sql.NullTime

		err := rows.Scan(
			&enrollment.ID,
			&enrollment.StudentID,
			&enrollment.GroupID,
			&enrollment.JoinedAt,
			&leftAt,
			&enrollment.CompanyID,
			&enrollment.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("error scanning enrollment: %w", err)
		}

		if leftAt.Valid {
			enrollment.LeftAt = &leftAt.Time
		}

		enrollments = append(enrollments, enrollment)
	}

	return enrollments, nil
}

func (r *EnrollmentRepository) Update(enrollment *models.Enrollment, companyID string) error {
	query := `
		UPDATE enrollment 
		SET student_id = $2, group_id = $3, joined_at = $4, left_at = $5
		WHERE id = $1 AND company_id = $6
	`
	_, err := r.db.Exec(
		query,
		enrollment.ID,
		enrollment.StudentID,
		enrollment.GroupID,
		enrollment.JoinedAt,
		enrollment.LeftAt,
		companyID,
	)
	if err != nil {
		return fmt.Errorf("error updating enrollment: %w", err)
	}
	return nil
}

func (r *EnrollmentRepository) Leave(studentID, groupID string, companyID string) error {
	query := `
		UPDATE enrollment 
		SET left_at = $3
		WHERE student_id = $1 AND group_id = $2 AND company_id = $4 AND left_at IS NULL
	`
	_, err := r.db.Exec(query, studentID, groupID, time.Now(), companyID)
	if err != nil {
		return fmt.Errorf("error leaving enrollment: %w", err)
	}
	return nil
}

func (r *EnrollmentRepository) Delete(id int64, companyID string) error {
	query := `DELETE FROM enrollment WHERE id = $1 AND company_id = $2`
	_, err := r.db.Exec(query, id, companyID)
	if err != nil {
		return fmt.Errorf("error deleting enrollment: %w", err)
	}
	return nil
}

