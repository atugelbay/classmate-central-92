package repository

import (
	"database/sql"
	"fmt"
	"strings"

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

func (r *TeacherRepository) Create(teacher *models.Teacher, companyID string, branchID string) error {
	query := `
		INSERT INTO teachers (id, name, subject, email, phone, status, avatar, workload, company_id, branch_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`

	_, err := r.db.Exec(query, teacher.ID, teacher.Name, teacher.Subject,
		teacher.Email, teacher.Phone, teacher.Status, teacher.Avatar, teacher.Workload, companyID, branchID)
	if err != nil {
		return fmt.Errorf("error creating teacher: %w", err)
	}

	return nil
}

func (r *TeacherRepository) GetAll(companyID string, branchID string) ([]*models.Teacher, error) {
	return r.GetAllByBranches(companyID, []string{branchID})
}

// GetAllByBranches gets teachers from specified accessible branches (for branch isolation)
func (r *TeacherRepository) GetAllByBranches(companyID string, branchIDs []string) ([]*models.Teacher, error) {
	var query string
	var args []interface{}
	
	// Check if branchIDs contains companyID (fallback mode)
	hasFallback := false
	for _, bid := range branchIDs {
		if bid == companyID {
			hasFallback = true
			break
		}
	}
	
	if hasFallback && len(branchIDs) == 1 {
		// Fallback mode: don't filter by branch_id
		query = `SELECT id, name, subject, email, phone, status, avatar, workload, company_id FROM teachers WHERE company_id = $1 ORDER BY name`
		args = []interface{}{companyID}
	} else {
		// Filter by accessible branches only
		placeholders := make([]string, len(branchIDs))
		for i := range branchIDs {
			placeholders[i] = fmt.Sprintf("$%d", i+2)
		}
		query = fmt.Sprintf(`SELECT id, name, subject, email, phone, status, avatar, workload, company_id FROM teachers WHERE company_id = $1 AND branch_id IN (%s) ORDER BY name`, strings.Join(placeholders, ","))
		args = make([]interface{}, len(branchIDs)+1)
		args[0] = companyID
		for i, bid := range branchIDs {
			args[i+1] = bid
		}
	}

	rows, err := r.db.Query(query, args...)
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

// GetGroupsByTeacher returns all groups led by a teacher
func (r *TeacherRepository) GetGroupsByTeacher(teacherID string, companyID string) ([]*models.Group, error) {
	query := `
		SELECT 
			g.id, g.name, g.subject, g.teacher_id, g.room_id, g.schedule, 
			g.description, g.status, g.color, g.company_id,
			t.name as teacher_name,
			rm.name as room_name
		FROM groups g
		LEFT JOIN teachers t ON g.teacher_id = t.id
		LEFT JOIN rooms rm ON g.room_id = rm.id
		WHERE g.teacher_id = $1 AND g.company_id = $2
		ORDER BY g.name
	`

	rows, err := r.db.Query(query, teacherID, companyID)
	if err != nil {
		return nil, fmt.Errorf("error getting teacher groups: %w", err)
	}
	defer rows.Close()

	groups := []*models.Group{}
	for rows.Next() {
		group := &models.Group{}
		var teacherID sql.NullString
		var teacherName sql.NullString
		var roomID sql.NullString
		var roomName sql.NullString
		var schedule sql.NullString
		var description sql.NullString
		var status sql.NullString
		var color sql.NullString

		err := rows.Scan(&group.ID, &group.Name, &group.Subject, &teacherID, &roomID, &schedule, &description, &status, &color, &group.CompanyID, &teacherName, &roomName)
		if err != nil {
			return nil, fmt.Errorf("error scanning group: %w", err)
		}

		if teacherID.Valid {
			group.TeacherID = teacherID.String
		}
		if teacherName.Valid {
			group.TeacherName = teacherName.String
		}
		if roomID.Valid {
			group.RoomID = roomID.String
		}
		if roomName.Valid {
			group.RoomName = roomName.String
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

		// Get students from enrollment table (active enrollments only)
		studentRows, err := r.db.Query(`SELECT student_id FROM enrollment WHERE group_id = $1 AND left_at IS NULL`, group.ID)
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
