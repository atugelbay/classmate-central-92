package repository

import (
	"database/sql"
	"fmt"

	"classmate-central/internal/models"
)

type StudentRepository struct {
	db *sql.DB
}

func NewStudentRepository(db *sql.DB) *StudentRepository {
	return &StudentRepository{db: db}
}

func (r *StudentRepository) Create(student *models.Student) error {
	tx, err := r.db.Begin()
	if err != nil {
		return fmt.Errorf("error starting transaction: %w", err)
	}
	defer tx.Rollback()

	// Insert student
	query := `
		INSERT INTO students (id, name, age, email, phone, avatar)
		VALUES ($1, $2, $3, $4, $5, $6)
	`
	_, err = tx.Exec(query, student.ID, student.Name, student.Age, student.Email, student.Phone, student.Avatar)
	if err != nil {
		return fmt.Errorf("error creating student: %w", err)
	}

	// Insert subjects
	for _, subject := range student.Subjects {
		_, err = tx.Exec(`INSERT INTO student_subjects (student_id, subject) VALUES ($1, $2)`, student.ID, subject)
		if err != nil {
			return fmt.Errorf("error inserting subject: %w", err)
		}
	}

	// Insert groups
	for _, groupID := range student.GroupIds {
		_, err = tx.Exec(`INSERT INTO student_groups (student_id, group_id) VALUES ($1, $2)`, student.ID, groupID)
		if err != nil {
			return fmt.Errorf("error inserting group: %w", err)
		}
	}

	return tx.Commit()
}

func (r *StudentRepository) GetAll() ([]*models.Student, error) {
	query := `SELECT id, name, age, email, phone, avatar FROM students ORDER BY name`

	rows, err := r.db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("error getting students: %w", err)
	}
	defer rows.Close()

	students := []*models.Student{}
	for rows.Next() {
		student := &models.Student{}
		var avatar sql.NullString

		err := rows.Scan(&student.ID, &student.Name, &student.Age, &student.Email, &student.Phone, &avatar)
		if err != nil {
			return nil, fmt.Errorf("error scanning student: %w", err)
		}

		if avatar.Valid {
			student.Avatar = avatar.String
		}

		// Initialize empty arrays
		student.Subjects = []string{}
		student.GroupIds = []string{}

		// Get subjects
		subjectRows, err := r.db.Query(`SELECT subject FROM student_subjects WHERE student_id = $1`, student.ID)
		if err == nil {
			defer subjectRows.Close()
			for subjectRows.Next() {
				var subject string
				if err := subjectRows.Scan(&subject); err == nil {
					student.Subjects = append(student.Subjects, subject)
				}
			}
		}

		// Get groups
		groupRows, err := r.db.Query(`SELECT group_id FROM student_groups WHERE student_id = $1`, student.ID)
		if err == nil {
			defer groupRows.Close()
			for groupRows.Next() {
				var groupID string
				if err := groupRows.Scan(&groupID); err == nil {
					student.GroupIds = append(student.GroupIds, groupID)
				}
			}
		}

		students = append(students, student)
	}

	return students, nil
}

func (r *StudentRepository) GetByID(id string) (*models.Student, error) {
	student := &models.Student{}
	var avatar sql.NullString

	query := `SELECT id, name, age, email, phone, avatar FROM students WHERE id = $1`

	err := r.db.QueryRow(query, id).Scan(&student.ID, &student.Name, &student.Age, &student.Email, &student.Phone, &avatar)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("error getting student: %w", err)
	}

	if avatar.Valid {
		student.Avatar = avatar.String
	}

	// Initialize empty arrays
	student.Subjects = []string{}
	student.GroupIds = []string{}

	// Get subjects
	subjectRows, err := r.db.Query(`SELECT subject FROM student_subjects WHERE student_id = $1`, student.ID)
	if err == nil {
		defer subjectRows.Close()
		for subjectRows.Next() {
			var subject string
			if err := subjectRows.Scan(&subject); err == nil {
				student.Subjects = append(student.Subjects, subject)
			}
		}
	}

	// Get groups
	groupRows, err := r.db.Query(`SELECT group_id FROM student_groups WHERE student_id = $1`, student.ID)
	if err == nil {
		defer groupRows.Close()
		for groupRows.Next() {
			var groupID string
			if err := groupRows.Scan(&groupID); err == nil {
				student.GroupIds = append(student.GroupIds, groupID)
			}
		}
	}

	return student, nil
}

func (r *StudentRepository) Update(student *models.Student) error {
	tx, err := r.db.Begin()
	if err != nil {
		return fmt.Errorf("error starting transaction: %w", err)
	}
	defer tx.Rollback()

	// Update student
	query := `
		UPDATE students 
		SET name = $2, age = $3, email = $4, phone = $5, avatar = $6
		WHERE id = $1
	`
	_, err = tx.Exec(query, student.ID, student.Name, student.Age, student.Email, student.Phone, student.Avatar)
	if err != nil {
		return fmt.Errorf("error updating student: %w", err)
	}

	// Delete old subjects and groups
	_, err = tx.Exec(`DELETE FROM student_subjects WHERE student_id = $1`, student.ID)
	if err != nil {
		return fmt.Errorf("error deleting old subjects: %w", err)
	}

	_, err = tx.Exec(`DELETE FROM student_groups WHERE student_id = $1`, student.ID)
	if err != nil {
		return fmt.Errorf("error deleting old groups: %w", err)
	}

	// Insert new subjects
	for _, subject := range student.Subjects {
		_, err = tx.Exec(`INSERT INTO student_subjects (student_id, subject) VALUES ($1, $2)`, student.ID, subject)
		if err != nil {
			return fmt.Errorf("error inserting subject: %w", err)
		}
	}

	// Insert new groups
	for _, groupID := range student.GroupIds {
		_, err = tx.Exec(`INSERT INTO student_groups (student_id, group_id) VALUES ($1, $2)`, student.ID, groupID)
		if err != nil {
			return fmt.Errorf("error inserting group: %w", err)
		}
	}

	return tx.Commit()
}

func (r *StudentRepository) Delete(id string) error {
	query := `DELETE FROM students WHERE id = $1`

	_, err := r.db.Exec(query, id)
	if err != nil {
		return fmt.Errorf("error deleting student: %w", err)
	}

	return nil
}
