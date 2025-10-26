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

func (r *StudentRepository) Create(student *models.Student, companyID string) error {
	tx, err := r.db.Begin()
	if err != nil {
		return fmt.Errorf("error starting transaction: %w", err)
	}
	defer tx.Rollback()

	// Insert student
	query := `
		INSERT INTO students (id, name, age, email, phone, status, avatar, company_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`
	status := student.Status
	if status == "" {
		status = "active"
	}
	_, err = tx.Exec(query, student.ID, student.Name, student.Age, student.Email, student.Phone, status, student.Avatar, companyID)
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

func (r *StudentRepository) GetAll(companyID string) ([]*models.Student, error) {
	query := `SELECT id, name, age, email, phone, status, avatar FROM students WHERE company_id = $1 ORDER BY name`

	rows, err := r.db.Query(query, companyID)
	if err != nil {
		return nil, fmt.Errorf("error getting students: %w", err)
	}
	defer rows.Close()

	students := []*models.Student{}
	for rows.Next() {
		student := &models.Student{}
		var avatar sql.NullString
		var age sql.NullInt32
		var status sql.NullString

		err := rows.Scan(&student.ID, &student.Name, &age, &student.Email, &student.Phone, &status, &avatar)
		if err != nil {
			return nil, fmt.Errorf("error scanning student: %w", err)
		}

		if age.Valid {
			student.Age = int(age.Int32)
		}

		if status.Valid {
			student.Status = status.String
		} else {
			student.Status = "active" // default
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

func (r *StudentRepository) GetByID(id string, companyID string) (*models.Student, error) {
	student := &models.Student{}
	var avatar sql.NullString
	var age sql.NullInt32
	var status sql.NullString

	query := `SELECT id, name, age, email, phone, status, avatar FROM students WHERE id = $1 AND company_id = $2`

	err := r.db.QueryRow(query, id, companyID).Scan(&student.ID, &student.Name, &age, &student.Email, &student.Phone, &status, &avatar)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("error getting student: %w", err)
	}

	if age.Valid {
		student.Age = int(age.Int32)
	}

	if status.Valid {
		student.Status = status.String
	} else {
		student.Status = "active"
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

func (r *StudentRepository) Update(student *models.Student, companyID string) error {
	tx, err := r.db.Begin()
	if err != nil {
		return fmt.Errorf("error starting transaction: %w", err)
	}
	defer tx.Rollback()

	// Update student
	query := `
		UPDATE students 
		SET name = $2, age = $3, email = $4, phone = $5, status = $6, avatar = $7
		WHERE id = $1 AND company_id = $8
	`
	status := student.Status
	if status == "" {
		status = "active"
	}
	_, err = tx.Exec(query, student.ID, student.Name, student.Age, student.Email, student.Phone, status, student.Avatar, companyID)
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

func (r *StudentRepository) Delete(id string, companyID string) error {
	query := `DELETE FROM students WHERE id = $1 AND company_id = $2`

	_, err := r.db.Exec(query, id, companyID)
	if err != nil {
		return fmt.Errorf("error deleting student: %w", err)
	}

	return nil
}

// UpdateStatus updates the status of a student
func (r *StudentRepository) UpdateStatus(studentID, status, companyID string) error {
	query := `UPDATE students SET status = $1 WHERE id = $2 AND company_id = $3`
	_, err := r.db.Exec(query, status, studentID, companyID)
	if err != nil {
		return fmt.Errorf("error updating student status: %w", err)
	}
	return nil
}

// AddNote adds a note about a student
func (r *StudentRepository) AddNote(note *models.StudentNote) error {
	query := `
		INSERT INTO student_notes (student_id, note, created_by, created_at)
		VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
		RETURNING id, created_at
	`
	err := r.db.QueryRow(query, note.StudentID, note.Note, note.CreatedBy).Scan(&note.ID, &note.CreatedAt)
	if err != nil {
		return fmt.Errorf("error adding student note: %w", err)
	}
	return nil
}

// GetNotes retrieves all notes for a student
func (r *StudentRepository) GetNotes(studentID string) ([]*models.StudentNote, error) {
	query := `
		SELECT id, student_id, note, created_by, created_at
		FROM student_notes
		WHERE student_id = $1
		ORDER BY created_at DESC
	`

	rows, err := r.db.Query(query, studentID)
	if err != nil {
		return nil, fmt.Errorf("error getting student notes: %w", err)
	}
	defer rows.Close()

	notes := []*models.StudentNote{}
	for rows.Next() {
		note := &models.StudentNote{}
		var createdBy sql.NullInt32

		err := rows.Scan(&note.ID, &note.StudentID, &note.Note, &createdBy, &note.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("error scanning note: %w", err)
		}

		if createdBy.Valid {
			val := int(createdBy.Int32)
			note.CreatedBy = &val
		}

		notes = append(notes, note)
	}

	return notes, nil
}

// GetAttendanceStats returns attendance statistics for a student
func (r *StudentRepository) GetAttendanceStats(studentID string) (*models.AttendanceStats, error) {
	query := `
		SELECT 
			COUNT(*) as total_lessons,
			COUNT(CASE WHEN status = 'attended' THEN 1 END) as attended,
			COUNT(CASE WHEN status = 'missed' THEN 1 END) as missed,
			COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled
		FROM lesson_attendance
		WHERE student_id = $1
	`

	stats := &models.AttendanceStats{}
	var total, attended, missed, cancelled int

	err := r.db.QueryRow(query, studentID).Scan(&total, &attended, &missed, &cancelled)
	if err != nil {
		return nil, fmt.Errorf("error getting attendance stats: %w", err)
	}

	stats.TotalLessons = total
	stats.Attended = attended
	stats.Missed = missed
	stats.Cancelled = cancelled

	if total > 0 {
		stats.AttendanceRate = float64(attended) / float64(total) * 100
	} else {
		stats.AttendanceRate = 0
	}

	return stats, nil
}

// GetAttendanceJournal retrieves detailed attendance journal for a student
func (r *StudentRepository) GetAttendanceJournal(studentID string) ([]*models.AttendanceJournalEntry, error) {
	query := `
		SELECT 
			la.id,
			la.lesson_id,
			l.title as lesson_title,
			l.subject,
			t.name as teacher_name,
			g.name as group_name,
			l.start_time,
			l.end_time,
			la.status,
			la.reason,
			la.notes,
			la.subscription_id,
			la.marked_at
		FROM lesson_attendance la
		JOIN lessons l ON la.lesson_id = l.id
		JOIN teachers t ON l.teacher_id = t.id
		LEFT JOIN groups g ON l.group_id = g.id
		WHERE la.student_id = $1
		ORDER BY l.start_time DESC
	`

	rows, err := r.db.Query(query, studentID)
	if err != nil {
		return nil, fmt.Errorf("error getting attendance journal: %w", err)
	}
	defer rows.Close()

	journal := []*models.AttendanceJournalEntry{}
	for rows.Next() {
		entry := &models.AttendanceJournalEntry{}
		var groupName, reason, notes, subscriptionID sql.NullString

		err := rows.Scan(
			&entry.AttendanceID,
			&entry.LessonID,
			&entry.LessonTitle,
			&entry.Subject,
			&entry.TeacherName,
			&groupName,
			&entry.StartTime,
			&entry.EndTime,
			&entry.Status,
			&reason,
			&notes,
			&subscriptionID,
			&entry.MarkedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("error scanning journal entry: %w", err)
		}

		if groupName.Valid {
			entry.GroupName = &groupName.String
		}
		if reason.Valid {
			entry.Reason = &reason.String
		}
		if notes.Valid {
			entry.Notes = &notes.String
		}
		if subscriptionID.Valid {
			entry.SubscriptionID = &subscriptionID.String
		}

		journal = append(journal, entry)
	}

	return journal, nil
}
