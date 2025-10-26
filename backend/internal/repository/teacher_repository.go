package repository

import (
	"database/sql"
	"fmt"

	"classmate-central/internal/models"
)

type TeacherRepository struct {
	db *sql.DB
}

func NewTeacherRepository(db *sql.DB) *TeacherRepository {
	return &TeacherRepository{db: db}
}

// GetDB returns the database connection
func (r *TeacherRepository) GetDB() *sql.DB {
	return r.db
}

func (r *TeacherRepository) Create(teacher *models.Teacher, companyID string) error {
	query := `
		INSERT INTO teachers (id, name, subject, email, phone, status, avatar, workload, company_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`

	_, err := r.db.Exec(query, teacher.ID, teacher.Name, teacher.Subject,
		teacher.Email, teacher.Phone, teacher.Status, teacher.Avatar, teacher.Workload, companyID)
	if err != nil {
		return fmt.Errorf("error creating teacher: %w", err)
	}

	return nil
}

func (r *TeacherRepository) GetAll(companyID string) ([]*models.Teacher, error) {
	query := `SELECT id, name, subject, email, phone, status, avatar, workload, company_id FROM teachers WHERE company_id = $1 ORDER BY name`

	rows, err := r.db.Query(query, companyID)
	if err != nil {
		return nil, fmt.Errorf("error getting teachers: %w", err)
	}
	defer rows.Close()

	teachers := []*models.Teacher{}
	for rows.Next() {
		teacher := &models.Teacher{}
		var avatar sql.NullString
		var phone sql.NullString

		err := rows.Scan(&teacher.ID, &teacher.Name, &teacher.Subject, &teacher.Email,
			&phone, &teacher.Status, &avatar, &teacher.Workload, &teacher.CompanyID)
		if err != nil {
			return nil, fmt.Errorf("error scanning teacher: %w", err)
		}

		if avatar.Valid {
			teacher.Avatar = avatar.String
		}
		if phone.Valid {
			teacher.Phone = phone.String
		}

		teachers = append(teachers, teacher)
	}

	return teachers, nil
}

func (r *TeacherRepository) GetByID(id string, companyID string) (*models.Teacher, error) {
	teacher := &models.Teacher{}
	var avatar sql.NullString
	var phone sql.NullString

	query := `SELECT id, name, subject, email, phone, status, avatar, workload, company_id FROM teachers WHERE id = $1 AND company_id = $2`

	err := r.db.QueryRow(query, id, companyID).Scan(&teacher.ID, &teacher.Name, &teacher.Subject,
		&teacher.Email, &phone, &teacher.Status, &avatar, &teacher.Workload, &teacher.CompanyID)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("error getting teacher: %w", err)
	}

	if avatar.Valid {
		teacher.Avatar = avatar.String
	}
	if phone.Valid {
		teacher.Phone = phone.String
	}

	return teacher, nil
}

func (r *TeacherRepository) Update(teacher *models.Teacher, companyID string) error {
	query := `
		UPDATE teachers 
		SET name = $2, subject = $3, email = $4, phone = $5, status = $6, avatar = $7, workload = $8
		WHERE id = $1 AND company_id = $9
	`

	_, err := r.db.Exec(query, teacher.ID, teacher.Name, teacher.Subject,
		teacher.Email, teacher.Phone, teacher.Status, teacher.Avatar, teacher.Workload, companyID)
	if err != nil {
		return fmt.Errorf("error updating teacher: %w", err)
	}

	return nil
}

func (r *TeacherRepository) Delete(id string, companyID string) error {
	query := `DELETE FROM teachers WHERE id = $1 AND company_id = $2`

	_, err := r.db.Exec(query, id, companyID)
	if err != nil {
		return fmt.Errorf("error deleting teacher: %w", err)
	}

	return nil
}
