package repository

import (
	"database/sql"
	"fmt"

	"classmate-central/internal/models"
)

type GroupRepository struct {
	db *sql.DB
}

func NewGroupRepository(db *sql.DB) *GroupRepository {
	return &GroupRepository{db: db}
}

func (r *GroupRepository) Create(group *models.Group) error {
	tx, err := r.db.Begin()
	if err != nil {
		return fmt.Errorf("error starting transaction: %w", err)
	}
	defer tx.Rollback()

	// Insert group
	query := `
		INSERT INTO groups (id, name, subject, teacher_id, schedule)
		VALUES ($1, $2, $3, $4, $5)
	`
	_, err = tx.Exec(query, group.ID, group.Name, group.Subject, group.TeacherID, group.Schedule)
	if err != nil {
		return fmt.Errorf("error creating group: %w", err)
	}

	// Insert students
	for _, studentID := range group.StudentIds {
		_, err = tx.Exec(`INSERT INTO student_groups (student_id, group_id) VALUES ($1, $2)`, studentID, group.ID)
		if err != nil {
			return fmt.Errorf("error inserting student to group: %w", err)
		}
	}

	return tx.Commit()
}

func (r *GroupRepository) GetAll() ([]*models.Group, error) {
	query := `SELECT id, name, subject, teacher_id, schedule FROM groups ORDER BY name`

	rows, err := r.db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("error getting groups: %w", err)
	}
	defer rows.Close()

	groups := []*models.Group{}
	for rows.Next() {
		group := &models.Group{}
		var teacherID sql.NullString

		err := rows.Scan(&group.ID, &group.Name, &group.Subject, &teacherID, &group.Schedule)
		if err != nil {
			return nil, fmt.Errorf("error scanning group: %w", err)
		}

		if teacherID.Valid {
			group.TeacherID = teacherID.String
		}

		// Initialize empty array for students
		group.StudentIds = []string{}

		// Get students
		studentRows, err := r.db.Query(`SELECT student_id FROM student_groups WHERE group_id = $1`, group.ID)
		if err == nil {
			defer studentRows.Close()
			for studentRows.Next() {
				var studentID string
				if err := studentRows.Scan(&studentID); err == nil {
					group.StudentIds = append(group.StudentIds, studentID)
				}
			}
		}

		groups = append(groups, group)
	}

	return groups, nil
}

func (r *GroupRepository) GetByID(id string) (*models.Group, error) {
	group := &models.Group{}
	var teacherID sql.NullString

	query := `SELECT id, name, subject, teacher_id, schedule FROM groups WHERE id = $1`

	err := r.db.QueryRow(query, id).Scan(&group.ID, &group.Name, &group.Subject, &teacherID, &group.Schedule)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("error getting group: %w", err)
	}

	if teacherID.Valid {
		group.TeacherID = teacherID.String
	}

	// Initialize empty array for students
	group.StudentIds = []string{}

	// Get students
	studentRows, err := r.db.Query(`SELECT student_id FROM student_groups WHERE group_id = $1`, group.ID)
	if err == nil {
		defer studentRows.Close()
		for studentRows.Next() {
			var studentID string
			if err := studentRows.Scan(&studentID); err == nil {
				group.StudentIds = append(group.StudentIds, studentID)
			}
		}
	}

	return group, nil
}

func (r *GroupRepository) Update(group *models.Group) error {
	tx, err := r.db.Begin()
	if err != nil {
		return fmt.Errorf("error starting transaction: %w", err)
	}
	defer tx.Rollback()

	// Update group
	query := `
		UPDATE groups 
		SET name = $2, subject = $3, teacher_id = $4, schedule = $5
		WHERE id = $1
	`
	_, err = tx.Exec(query, group.ID, group.Name, group.Subject, group.TeacherID, group.Schedule)
	if err != nil {
		return fmt.Errorf("error updating group: %w", err)
	}

	// Delete old students
	_, err = tx.Exec(`DELETE FROM student_groups WHERE group_id = $1`, group.ID)
	if err != nil {
		return fmt.Errorf("error deleting old students: %w", err)
	}

	// Insert new students
	for _, studentID := range group.StudentIds {
		_, err = tx.Exec(`INSERT INTO student_groups (student_id, group_id) VALUES ($1, $2)`, studentID, group.ID)
		if err != nil {
			return fmt.Errorf("error inserting student to group: %w", err)
		}
	}

	return tx.Commit()
}

func (r *GroupRepository) Delete(id string) error {
	query := `DELETE FROM groups WHERE id = $1`

	_, err := r.db.Exec(query, id)
	if err != nil {
		return fmt.Errorf("error deleting group: %w", err)
	}

	return nil
}
