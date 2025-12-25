package repository

import (
	"database/sql"
	"fmt"
	"strings"

	"classmate-central/internal/models"
)

type StudentRepository struct {
	db *sql.DB
}

func NewStudentRepository(db *sql.DB) *StudentRepository {
	return &StudentRepository{db: db}
}

func (r *StudentRepository) Create(student *models.Student, companyID string, branchID string) error {
	tx, err := r.db.Begin()
	if err != nil {
		return fmt.Errorf("error starting transaction: %w", err)
	}
	defer tx.Rollback()

	// Insert student - use branch_id only if it's different from company_id (not in fallback mode)
	status := student.Status
	if status == "" {
		status = "active"
	}
	var query string
	var args []interface{}
	if branchID == companyID {
		// Fallback mode: don't use branch_id column
		query = `
			INSERT INTO students (id, name, age, email, phone, status, avatar, company_id)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		`
		args = []interface{}{student.ID, student.Name, student.Age, student.Email, student.Phone, status, student.Avatar, companyID}
	} else {
		query = `
			INSERT INTO students (id, name, age, email, phone, status, avatar, company_id, branch_id)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		`
		args = []interface{}{student.ID, student.Name, student.Age, student.Email, student.Phone, status, student.Avatar, companyID, branchID}
	}
	_, err = tx.Exec(query, args...)
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

	// Insert groups using enrollment table
	for _, groupID := range student.GroupIds {
		var enrollQuery string
		var enrollArgs []interface{}
		if branchID == companyID {
			// Fallback mode: don't use branch_id column
			enrollQuery = `
				INSERT INTO enrollment (student_id, group_id, joined_at, company_id)
				VALUES ($1, $2, CURRENT_TIMESTAMP, $3)
				ON CONFLICT (student_id, group_id) WHERE left_at IS NULL DO NOTHING
			`
			enrollArgs = []interface{}{student.ID, groupID, companyID}
		} else {
			enrollQuery = `
				INSERT INTO enrollment (student_id, group_id, joined_at, company_id, branch_id)
				VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4)
				ON CONFLICT (student_id, group_id) WHERE left_at IS NULL DO NOTHING
			`
			enrollArgs = []interface{}{student.ID, groupID, companyID, branchID}
		}
		_, err = tx.Exec(enrollQuery, enrollArgs...)
		if err != nil {
			return fmt.Errorf("error inserting enrollment: %w", err)
		}
	}

	return tx.Commit()
}

func (r *StudentRepository) GetAll(companyID string, branchID string) ([]*models.Student, error) {
	// If branchID is empty string, get data from all branches (for multi-branch view)
	// If branchID equals companyID (fallback mode), filter only by company_id
	var query string
	var args []interface{}
	if branchID == "" {
		// Get data from all branches for the company
		query = `SELECT id, name, age, email, phone, status, avatar, created_at FROM students WHERE company_id = $1 ORDER BY name`
		args = []interface{}{companyID}
	} else if branchID == companyID {
		query = `SELECT id, name, age, email, phone, status, avatar, created_at FROM students WHERE company_id = $1 ORDER BY name`
		args = []interface{}{companyID}
	} else {
		query = `SELECT id, name, age, email, phone, status, avatar, created_at FROM students WHERE company_id = $1 AND branch_id = $2 ORDER BY name`
		args = []interface{}{companyID, branchID}
	}

	return r.getAllWithQuery(query, args)
}

// GetAllByBranches gets students from specified accessible branches (for branch isolation)
func (r *StudentRepository) GetAllByBranches(companyID string, branchIDs []string) ([]*models.Student, error) {
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
		query = `SELECT id, name, age, email, phone, status, avatar, created_at FROM students WHERE company_id = $1 ORDER BY name`
		args = []interface{}{companyID}
	} else {
		// Filter by accessible branches only
		placeholders := make([]string, len(branchIDs))
		for i := range branchIDs {
			placeholders[i] = fmt.Sprintf("$%d", i+2)
		}
		query = fmt.Sprintf(`SELECT id, name, age, email, phone, status, avatar, created_at FROM students WHERE company_id = $1 AND branch_id IN (%s) ORDER BY name`, strings.Join(placeholders, ","))
		args = make([]interface{}, len(branchIDs)+1)
		args[0] = companyID
		for i, bid := range branchIDs {
			args[i+1] = bid
		}
	}

	return r.getAllWithQuery(query, args)
}

// getAllWithQuery is a helper to execute query and scan results
func (r *StudentRepository) getAllWithQuery(query string, args []interface{}) ([]*models.Student, error) {

	rows, err := r.db.Query(query, args...)
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
		var createdAt sql.NullString

		err := rows.Scan(&student.ID, &student.Name, &age, &student.Email, &student.Phone, &status, &avatar, &createdAt)
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

		if createdAt.Valid {
			student.CreatedAt = createdAt.String
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

		// Get groups from enrollment (active enrollments only)
		groupRows, err := r.db.Query(`SELECT group_id FROM enrollment WHERE student_id = $1 AND left_at IS NULL`, student.ID)
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

// GetPaged returns students with optional search and pagination
func (r *StudentRepository) GetPaged(companyID, branchID, search string, page, pageSize int) ([]*models.Student, int, error) {
	return r.GetPagedByBranches(companyID, []string{branchID}, search, page, pageSize)
}

// GetPagedByBranches returns students from accessible branches with pagination
func (r *StudentRepository) GetPagedByBranches(companyID string, branchIDs []string, search string, page, pageSize int) ([]*models.Student, int, error) {
	offset := (page - 1) * pageSize
	// Base where - filter by accessible branches
	var where string
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
		where = "WHERE company_id = $1"
		args = []interface{}{companyID}
	} else {
		// Filter by accessible branches only
		placeholders := make([]string, len(branchIDs))
		for i := range branchIDs {
			placeholders[i] = fmt.Sprintf("$%d", i+2)
		}
		where = fmt.Sprintf("WHERE company_id = $1 AND branch_id IN (%s)", strings.Join(placeholders, ","))
		args = make([]interface{}, len(branchIDs)+1)
		args[0] = companyID
		for i, bid := range branchIDs {
			args[i+1] = bid
		}
	}
	if search != "" {
		// Prepare LIKE for name/email and normalized digits-only for phone
		like := "%" + strings.ToLower(search) + "%"
		normalized := strings.NewReplacer(" ", "", "-", "", "(", "", ")", "").Replace(search)
		where += " AND (LOWER(name) LIKE $3 OR LOWER(email) LIKE $3 OR REPLACE(REPLACE(REPLACE(REPLACE(phone,' ',''),'-',''),'(', ''),')','') LIKE $4)"
		args = append(args, like, "%"+normalized+"%")
	}

	// Total count
	totalQuery := "SELECT COUNT(*) FROM students " + where
	var total int
	if err := r.db.QueryRow(totalQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("error counting students: %w", err)
	}

	// Paged select
	selectQuery := "SELECT id, name, age, email, phone, status, avatar, created_at FROM students " + where + " ORDER BY name LIMIT $" + fmt.Sprint(len(args)+1) + " OFFSET $" + fmt.Sprint(len(args)+2)
	args = append(args, pageSize, offset)

	rows, err := r.db.Query(selectQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("error getting students: %w", err)
	}
	defer rows.Close()

	students := []*models.Student{}
	for rows.Next() {
		student := &models.Student{}
		var avatar sql.NullString
		var age sql.NullInt32
		var status sql.NullString
		var createdAt sql.NullString

		if err := rows.Scan(&student.ID, &student.Name, &age, &student.Email, &student.Phone, &status, &avatar, &createdAt); err != nil {
			return nil, 0, fmt.Errorf("error scanning student: %w", err)
		}
		if age.Valid {
			student.Age = int(age.Int32)
		}
		if status.Valid {
			student.Status = status.String
		} else {
			student.Status = "active"
		}
		if createdAt.Valid {
			student.CreatedAt = createdAt.String
		}
		if avatar.Valid {
			student.Avatar = avatar.String
		}
		student.Subjects = []string{}
		student.GroupIds = []string{}
		students = append(students, student)
	}

	return students, total, nil
}

// GetCounts returns global counts of students by status (not affected by search)
func (r *StudentRepository) GetCounts(companyID, branchID string) (active int, inactive int, total int, err error) {
	return r.GetCountsByBranches(companyID, []string{branchID})
}

// GetCountsByBranches gets counts from accessible branches
func (r *StudentRepository) GetCountsByBranches(companyID string, branchIDs []string) (active int, inactive int, total int, err error) {
	// Filter by accessible branches
	var whereClause string
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
		whereClause = "WHERE company_id = $1"
		args = []interface{}{companyID}
	} else {
		// Filter by accessible branches only
		placeholders := make([]string, len(branchIDs))
		for i := range branchIDs {
			placeholders[i] = fmt.Sprintf("$%d", i+2)
		}
		whereClause = fmt.Sprintf("WHERE company_id = $1 AND branch_id IN (%s)", strings.Join(placeholders, ","))
		args = make([]interface{}, len(branchIDs)+1)
		args[0] = companyID
		for i, bid := range branchIDs {
			args[i+1] = bid
		}
	}

	// Total
	if err = r.db.QueryRow(`SELECT COUNT(*) FROM students `+whereClause, args...).Scan(&total); err != nil {
		return
	}
	// Active (has upcoming lessons OR status active?) — per request, use status column
	if err = r.db.QueryRow(`SELECT COUNT(*) FROM students `+whereClause+` AND status = 'active'`, args...).Scan(&active); err != nil {
		return
	}
	if err = r.db.QueryRow(`SELECT COUNT(*) FROM students `+whereClause+` AND status != 'active'`, args...).Scan(&inactive); err != nil {
		return
	}
	return
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

	// Get groups from enrollment (active enrollments only)
	groupRows, err := r.db.Query(`SELECT group_id FROM enrollment WHERE student_id = $1 AND left_at IS NULL`, student.ID)
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

	// Delete old subjects
	_, err = tx.Exec(`DELETE FROM student_subjects WHERE student_id = $1`, student.ID)
	if err != nil {
		return fmt.Errorf("error deleting old subjects: %w", err)
	}

	// Mark old enrollments as left (don't delete them, preserve history)
	_, err = tx.Exec(`
		UPDATE enrollment 
		SET left_at = CURRENT_TIMESTAMP 
		WHERE student_id = $1 AND company_id = $2 AND left_at IS NULL
	`, student.ID, companyID)
	if err != nil {
		return fmt.Errorf("error updating old enrollments: %w", err)
	}

	// Insert new subjects
	for _, subject := range student.Subjects {
		_, err = tx.Exec(`INSERT INTO student_subjects (student_id, subject) VALUES ($1, $2)`, student.ID, subject)
		if err != nil {
			return fmt.Errorf("error inserting subject: %w", err)
		}
	}

	// Insert new enrollments
	for _, groupID := range student.GroupIds {
		_, err = tx.Exec(`
			INSERT INTO enrollment (student_id, group_id, joined_at, company_id)
			VALUES ($1, $2, CURRENT_TIMESTAMP, $3)
			ON CONFLICT (student_id, group_id) WHERE left_at IS NULL DO NOTHING
		`, student.ID, groupID, companyID)
		if err != nil {
			return fmt.Errorf("error inserting enrollment: %w", err)
		}
		// If enrollment exists but was left, reactivate it
		_, err = tx.Exec(`
			UPDATE enrollment 
			SET left_at = NULL, joined_at = CURRENT_TIMESTAMP 
			WHERE student_id = $1 AND group_id = $2 AND company_id = $3 AND left_at IS NOT NULL
		`, student.ID, groupID, companyID)
		if err != nil {
			return fmt.Errorf("error reactivating enrollment: %w", err)
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
