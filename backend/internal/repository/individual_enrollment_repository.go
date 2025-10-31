package repository

import (
	"database/sql"
	"fmt"
	"time"

	"classmate-central/internal/models"
)

type IndividualEnrollmentRepository struct {
	db *sql.DB
}

func NewIndividualEnrollmentRepository(db *sql.DB) *IndividualEnrollmentRepository {
	return &IndividualEnrollmentRepository{db: db}
}

func (r *IndividualEnrollmentRepository) Create(enrollment *models.IndividualEnrollment, companyID string) error {
	query := `
		INSERT INTO individual_enrollment (student_id, teacher_id, started_at, ended_at, company_id)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at
	`
	err := r.db.QueryRow(
		query,
		enrollment.StudentID,
		enrollment.TeacherID,
		enrollment.StartedAt,
		enrollment.EndedAt,
		companyID,
	).Scan(&enrollment.ID, &enrollment.CreatedAt)
	if err != nil {
		return fmt.Errorf("error creating individual enrollment: %w", err)
	}
	return nil
}

func (r *IndividualEnrollmentRepository) GetByID(id int64, companyID string) (*models.IndividualEnrollment, error) {
	enrollment := &models.IndividualEnrollment{}
	var endedAt sql.NullTime

	query := `SELECT id, student_id, teacher_id, started_at, ended_at, company_id, created_at 
	          FROM individual_enrollment WHERE id = $1 AND company_id = $2`
	err := r.db.QueryRow(query, id, companyID).Scan(
		&enrollment.ID,
		&enrollment.StudentID,
		&enrollment.TeacherID,
		&enrollment.StartedAt,
		&endedAt,
		&enrollment.CompanyID,
		&enrollment.CreatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("error getting individual enrollment: %w", err)
	}

	if endedAt.Valid {
		enrollment.EndedAt = &endedAt.Time
	}

	return enrollment, nil
}

func (r *IndividualEnrollmentRepository) GetActiveByStudent(studentID string, companyID string) ([]*models.IndividualEnrollment, error) {
	query := `
		SELECT id, student_id, teacher_id, started_at, ended_at, company_id, created_at 
		FROM individual_enrollment 
		WHERE student_id = $1 AND company_id = $2 AND ended_at IS NULL
		ORDER BY started_at DESC
	`
	rows, err := r.db.Query(query, studentID, companyID)
	if err != nil {
		return nil, fmt.Errorf("error getting active individual enrollments: %w", err)
	}
	defer rows.Close()

	enrollments := []*models.IndividualEnrollment{}
	for rows.Next() {
		enrollment := &models.IndividualEnrollment{}
		var endedAt sql.NullTime

		err := rows.Scan(
			&enrollment.ID,
			&enrollment.StudentID,
			&enrollment.TeacherID,
			&enrollment.StartedAt,
			&endedAt,
			&enrollment.CompanyID,
			&enrollment.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("error scanning individual enrollment: %w", err)
		}

		if endedAt.Valid {
			enrollment.EndedAt = &endedAt.Time
		}

		enrollments = append(enrollments, enrollment)
	}

	return enrollments, nil
}

func (r *IndividualEnrollmentRepository) GetActiveByTeacher(teacherID string, companyID string) ([]*models.IndividualEnrollment, error) {
	query := `
		SELECT id, student_id, teacher_id, started_at, ended_at, company_id, created_at 
		FROM individual_enrollment 
		WHERE teacher_id = $1 AND company_id = $2 AND ended_at IS NULL
		ORDER BY started_at DESC
	`
	rows, err := r.db.Query(query, teacherID, companyID)
	if err != nil {
		return nil, fmt.Errorf("error getting teacher's individual enrollments: %w", err)
	}
	defer rows.Close()

	enrollments := []*models.IndividualEnrollment{}
	for rows.Next() {
		enrollment := &models.IndividualEnrollment{}
		var endedAt sql.NullTime

		err := rows.Scan(
			&enrollment.ID,
			&enrollment.StudentID,
			&enrollment.TeacherID,
			&enrollment.StartedAt,
			&endedAt,
			&enrollment.CompanyID,
			&enrollment.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("error scanning individual enrollment: %w", err)
		}

		if endedAt.Valid {
			enrollment.EndedAt = &endedAt.Time
		}

		enrollments = append(enrollments, enrollment)
	}

	return enrollments, nil
}

func (r *IndividualEnrollmentRepository) Update(enrollment *models.IndividualEnrollment, companyID string) error {
	query := `
		UPDATE individual_enrollment 
		SET student_id = $2, teacher_id = $3, started_at = $4, ended_at = $5
		WHERE id = $1 AND company_id = $6
	`
	_, err := r.db.Exec(
		query,
		enrollment.ID,
		enrollment.StudentID,
		enrollment.TeacherID,
		enrollment.StartedAt,
		enrollment.EndedAt,
		companyID,
	)
	if err != nil {
		return fmt.Errorf("error updating individual enrollment: %w", err)
	}
	return nil
}

func (r *IndividualEnrollmentRepository) End(studentID, teacherID string, companyID string) error {
	query := `
		UPDATE individual_enrollment 
		SET ended_at = $3
		WHERE student_id = $1 AND teacher_id = $2 AND company_id = $4 AND ended_at IS NULL
	`
	_, err := r.db.Exec(query, studentID, teacherID, time.Now(), companyID)
	if err != nil {
		return fmt.Errorf("error ending individual enrollment: %w", err)
	}
	return nil
}

func (r *IndividualEnrollmentRepository) Delete(id int64, companyID string) error {
	query := `DELETE FROM individual_enrollment WHERE id = $1 AND company_id = $2`
	_, err := r.db.Exec(query, id, companyID)
	if err != nil {
		return fmt.Errorf("error deleting individual enrollment: %w", err)
	}
	return nil
}

