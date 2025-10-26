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

func (r *GroupRepository) Create(group *models.Group, companyID string) error {
	tx, err := r.db.Begin()
	if err != nil {
		return fmt.Errorf("error starting transaction: %w", err)
	}
	defer tx.Rollback()

	// Insert group
	query := `
		INSERT INTO groups (id, name, subject, teacher_id, schedule, description, status, color, company_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`

	// Set defaults if not provided
	if group.Status == "" {
		group.Status = "active"
	}
	if group.Color == "" {
		group.Color = "#3b82f6"
	}

	_, err = tx.Exec(query, group.ID, group.Name, group.Subject, group.TeacherID, group.Schedule, group.Description, group.Status, group.Color, companyID)
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

func (r *GroupRepository) GetAll(companyID string) ([]*models.Group, error) {
	query := `SELECT id, name, subject, teacher_id, schedule, description, status, color, company_id FROM groups WHERE company_id = $1 ORDER BY name`

	rows, err := r.db.Query(query, companyID)
	if err != nil {
		return nil, fmt.Errorf("error getting groups: %w", err)
	}
	defer rows.Close()

	groups := []*models.Group{}
	for rows.Next() {
		group := &models.Group{}
		var teacherID sql.NullString
		var schedule sql.NullString
		var description sql.NullString
		var status sql.NullString
		var color sql.NullString

		err := rows.Scan(&group.ID, &group.Name, &group.Subject, &teacherID, &schedule, &description, &status, &color, &group.CompanyID)
		if err != nil {
			return nil, fmt.Errorf("error scanning group: %w", err)
		}

		if teacherID.Valid {
			group.TeacherID = teacherID.String
		}
		if schedule.Valid {
			group.Schedule = schedule.String
		}
		if description.Valid {
			group.Description = description.String
		}
		if status.Valid {
			group.Status = status.String
		} else {
			group.Status = "active"
		}
		if color.Valid {
			group.Color = color.String
		} else {
			group.Color = "#3b82f6"
		}

		// Initialize empty array for students
		group.StudentIds = []string{}

		// Get students
		studentRows, err := r.db.Query(`SELECT student_id FROM student_groups WHERE group_id = $1`, group.ID)
		if err == nil {
			for studentRows.Next() {
				var studentID string
				if err := studentRows.Scan(&studentID); err == nil {
					group.StudentIds = append(group.StudentIds, studentID)
				}
			}
			studentRows.Close()
		}

		groups = append(groups, group)
	}

	return groups, nil
}

func (r *GroupRepository) GetByID(id string, companyID string) (*models.Group, error) {
	group := &models.Group{}
	var teacherID sql.NullString
	var schedule sql.NullString
	var description sql.NullString
	var status sql.NullString
	var color sql.NullString

	query := `SELECT id, name, subject, teacher_id, schedule, description, status, color, company_id FROM groups WHERE id = $1 AND company_id = $2`

	err := r.db.QueryRow(query, id, companyID).Scan(&group.ID, &group.Name, &group.Subject, &teacherID, &schedule, &description, &status, &color, &group.CompanyID)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("error getting group: %w", err)
	}

	if teacherID.Valid {
		group.TeacherID = teacherID.String
	}
	if schedule.Valid {
		group.Schedule = schedule.String
	}
	if description.Valid {
		group.Description = description.String
	}
	if status.Valid {
		group.Status = status.String
	} else {
		group.Status = "active"
	}
	if color.Valid {
		group.Color = color.String
	} else {
		group.Color = "#3b82f6"
	}

	// Initialize empty array for students
	group.StudentIds = []string{}

	// Get students
	studentRows, err := r.db.Query(`SELECT student_id FROM student_groups WHERE group_id = $1`, group.ID)
	if err == nil {
		for studentRows.Next() {
			var studentID string
			if err := studentRows.Scan(&studentID); err == nil {
				group.StudentIds = append(group.StudentIds, studentID)
			}
		}
		studentRows.Close()
	}

	return group, nil
}

func (r *GroupRepository) Update(group *models.Group, companyID string) error {
	tx, err := r.db.Begin()
	if err != nil {
		return fmt.Errorf("error starting transaction: %w", err)
	}
	defer tx.Rollback()

	// Update group
	query := `
		UPDATE groups 
		SET name = $2, subject = $3, teacher_id = $4, schedule = $5, description = $6, status = $7, color = $8
		WHERE id = $1 AND company_id = $9
	`
	_, err = tx.Exec(query, group.ID, group.Name, group.Subject, group.TeacherID, group.Schedule, group.Description, group.Status, group.Color, companyID)
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

func (r *GroupRepository) Delete(id string, companyID string) error {
	query := `DELETE FROM groups WHERE id = $1 AND company_id = $2`

	_, err := r.db.Exec(query, id, companyID)
	if err != nil {
		return fmt.Errorf("error deleting group: %w", err)
	}

	return nil
}
