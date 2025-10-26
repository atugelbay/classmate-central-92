package repository

import (
	"database/sql"
	"fmt"
	"time"

	"classmate-central/internal/models"
)

type LessonRepository struct {
	db *sql.DB
}

func NewLessonRepository(db *sql.DB) *LessonRepository {
	return &LessonRepository{db: db}
}

func (r *LessonRepository) Create(lesson *models.Lesson, companyID string) error {
	tx, err := r.db.Begin()
	if err != nil {
		return fmt.Errorf("error starting transaction: %w", err)
	}
	defer tx.Rollback()

	// Convert empty groupId and roomId to NULL
	var groupID interface{}
	if lesson.GroupID == "" {
		groupID = nil
	} else {
		groupID = lesson.GroupID
	}

	var roomID interface{}
	if lesson.RoomID == "" {
		roomID = nil
	} else {
		roomID = lesson.RoomID
	}

	// Insert lesson
	query := `
		INSERT INTO lessons (id, title, teacher_id, group_id, subject, start_time, end_time, room, room_id, status, company_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`
	_, err = tx.Exec(query, lesson.ID, lesson.Title, lesson.TeacherID, groupID,
		lesson.Subject, lesson.Start, lesson.End, lesson.Room, roomID, lesson.Status, companyID)
	if err != nil {
		return fmt.Errorf("error creating lesson: %w", err)
	}

	// Insert students
	for _, studentID := range lesson.StudentIds {
		_, err = tx.Exec(`INSERT INTO lesson_students (lesson_id, student_id, company_id) VALUES ($1, $2, $3)`, lesson.ID, studentID, companyID)
		if err != nil {
			return fmt.Errorf("error inserting student to lesson: %w", err)
		}
	}

	return tx.Commit()
}

func (r *LessonRepository) GetAll(companyID string) ([]*models.Lesson, error) {
	query := `SELECT id, title, teacher_id, group_id, subject, start_time, end_time, room, room_id, status FROM lessons WHERE company_id = $1 ORDER BY start_time`

	rows, err := r.db.Query(query, companyID)
	if err != nil {
		return nil, fmt.Errorf("error getting lessons: %w", err)
	}
	defer rows.Close()

	lessons := []*models.Lesson{}
	for rows.Next() {
		lesson := &models.Lesson{}
		var teacherID, groupID, room, roomID, status sql.NullString

		err := rows.Scan(&lesson.ID, &lesson.Title, &teacherID, &groupID,
			&lesson.Subject, &lesson.Start, &lesson.End, &room, &roomID, &status)
		if err != nil {
			return nil, fmt.Errorf("error scanning lesson: %w", err)
		}

		if teacherID.Valid {
			lesson.TeacherID = teacherID.String
		}
		if groupID.Valid {
			lesson.GroupID = groupID.String
		}
		if room.Valid {
			lesson.Room = room.String
		}
		if roomID.Valid {
			lesson.RoomID = roomID.String
		}
		if status.Valid {
			lesson.Status = status.String
		} else {
			lesson.Status = "scheduled" // default
		}

		// Initialize empty array
		lesson.StudentIds = []string{}

		// Get students
		studentRows, err := r.db.Query(`SELECT student_id FROM lesson_students WHERE lesson_id = $1`, lesson.ID)
		if err == nil {
			defer studentRows.Close()
			for studentRows.Next() {
				var studentID string
				if err := studentRows.Scan(&studentID); err == nil {
					lesson.StudentIds = append(lesson.StudentIds, studentID)
				}
			}
		}

		lessons = append(lessons, lesson)
	}

	return lessons, nil
}

func (r *LessonRepository) GetByID(id string, companyID string) (*models.Lesson, error) {
	lesson := &models.Lesson{}
	var teacherID, groupID, room, roomID, status sql.NullString

	query := `SELECT id, title, teacher_id, group_id, subject, start_time, end_time, room, room_id, status FROM lessons WHERE id = $1 AND company_id = $2`

	err := r.db.QueryRow(query, id, companyID).Scan(&lesson.ID, &lesson.Title, &teacherID, &groupID,
		&lesson.Subject, &lesson.Start, &lesson.End, &room, &roomID, &status)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("error getting lesson: %w", err)
	}

	if teacherID.Valid {
		lesson.TeacherID = teacherID.String
	}
	if groupID.Valid {
		lesson.GroupID = groupID.String
	}
	if room.Valid {
		lesson.Room = room.String
	}
	if roomID.Valid {
		lesson.RoomID = roomID.String
	}
	if status.Valid {
		lesson.Status = status.String
	} else {
		lesson.Status = "scheduled" // default
	}

	// Initialize empty array
	lesson.StudentIds = []string{}

	// Get students
	studentRows, err := r.db.Query(`SELECT student_id FROM lesson_students WHERE lesson_id = $1`, lesson.ID)
	if err == nil {
		defer studentRows.Close()
		for studentRows.Next() {
			var studentID string
			if err := studentRows.Scan(&studentID); err == nil {
				lesson.StudentIds = append(lesson.StudentIds, studentID)
			}
		}
	}

	return lesson, nil
}

func (r *LessonRepository) Update(lesson *models.Lesson, companyID string) error {
	tx, err := r.db.Begin()
	if err != nil {
		return fmt.Errorf("error starting transaction: %w", err)
	}
	defer tx.Rollback()

	// Convert empty groupId and roomId to NULL
	var groupID interface{}
	if lesson.GroupID == "" {
		groupID = nil
	} else {
		groupID = lesson.GroupID
	}

	var roomID interface{}
	if lesson.RoomID == "" {
		roomID = nil
	} else {
		roomID = lesson.RoomID
	}

	// Update lesson
	query := `
		UPDATE lessons 
		SET title = $2, teacher_id = $3, group_id = $4, subject = $5, 
		    start_time = $6, end_time = $7, room = $8, room_id = $9, status = $10
		WHERE id = $1 AND company_id = $11
	`
	_, err = tx.Exec(query, lesson.ID, lesson.Title, lesson.TeacherID, groupID,
		lesson.Subject, lesson.Start, lesson.End, lesson.Room, roomID, lesson.Status, companyID)
	if err != nil {
		return fmt.Errorf("error updating lesson: %w", err)
	}

	// Delete old students
	_, err = tx.Exec(`DELETE FROM lesson_students WHERE lesson_id = $1`, lesson.ID)
	if err != nil {
		return fmt.Errorf("error deleting old students: %w", err)
	}

	// Insert new students
	for _, studentID := range lesson.StudentIds {
		_, err = tx.Exec(`INSERT INTO lesson_students (lesson_id, student_id, company_id) VALUES ($1, $2, $3)`, lesson.ID, studentID, companyID)
		if err != nil {
			return fmt.Errorf("error inserting student to lesson: %w", err)
		}
	}

	return tx.Commit()
}

func (r *LessonRepository) Delete(id string, companyID string) error {
	query := `DELETE FROM lessons WHERE id = $1 AND company_id = $2`

	_, err := r.db.Exec(query, id, companyID)
	if err != nil {
		return fmt.Errorf("error deleting lesson: %w", err)
	}

	return nil
}

// DeleteByGroupID deletes all lessons associated with a group
func (r *LessonRepository) DeleteByGroupID(groupID string, companyID string) error {
	query := `DELETE FROM lessons WHERE group_id = $1 AND company_id = $2`

	_, err := r.db.Exec(query, groupID, companyID)
	if err != nil {
		return fmt.Errorf("error deleting lessons for group: %w", err)
	}

	return nil
}

// GetIndividualLessons returns all lessons without a group (individual lessons)
func (r *LessonRepository) GetIndividualLessons(companyID string) ([]*models.Lesson, error) {
	query := `
		SELECT id, title, teacher_id, group_id, subject, start_time, end_time, room, room_id, status 
		FROM lessons 
		WHERE company_id = $1 AND (group_id IS NULL OR group_id = '')
		ORDER BY start_time DESC
	`

	rows, err := r.db.Query(query, companyID)
	if err != nil {
		return nil, fmt.Errorf("error getting individual lessons: %w", err)
	}
	defer rows.Close()

	lessons := []*models.Lesson{}
	for rows.Next() {
		lesson := &models.Lesson{}
		var teacherID, groupID, room, roomID, status sql.NullString

		err := rows.Scan(&lesson.ID, &lesson.Title, &teacherID, &groupID,
			&lesson.Subject, &lesson.Start, &lesson.End, &room, &roomID, &status)
		if err != nil {
			return nil, fmt.Errorf("error scanning lesson: %w", err)
		}

		if teacherID.Valid {
			lesson.TeacherID = teacherID.String
		}
		if groupID.Valid {
			lesson.GroupID = groupID.String
		}
		if room.Valid {
			lesson.Room = room.String
		}
		if roomID.Valid {
			lesson.RoomID = roomID.String
		}
		if status.Valid {
			lesson.Status = status.String
		} else {
			lesson.Status = "scheduled"
		}

		// Get students for this lesson
		studentQuery := `SELECT student_id FROM lesson_students WHERE lesson_id = $1 AND company_id = $2`
		studentRows, err := r.db.Query(studentQuery, lesson.ID, companyID)
		if err != nil {
			return nil, fmt.Errorf("error getting students for lesson: %w", err)
		}

		studentIds := []string{}
		for studentRows.Next() {
			var studentID string
			if err := studentRows.Scan(&studentID); err != nil {
				studentRows.Close()
				return nil, fmt.Errorf("error scanning student ID: %w", err)
			}
			studentIds = append(studentIds, studentID)
		}
		studentRows.Close()
		lesson.StudentIds = studentIds

		lessons = append(lessons, lesson)
	}

	return lessons, nil
}

// ConflictInfo represents a scheduling conflict
type ConflictInfo struct {
	LessonID     string    `json:"lessonId"`
	Title        string    `json:"title"`
	Start        time.Time `json:"start"`
	End          time.Time `json:"end"`
	TeacherName  string    `json:"teacherName,omitempty"`
	RoomName     string    `json:"roomName,omitempty"`
	ConflictType string    `json:"conflictType"` // "teacher" or "room"
}

// CheckConflicts checks for scheduling conflicts with teacher or room
func (r *LessonRepository) CheckConflicts(teacherID, roomID string, start, end time.Time, excludeLessonID, companyID string) ([]ConflictInfo, error) {
	conflicts := []ConflictInfo{}

	// Check teacher conflicts
	if teacherID != "" {
		query := `
			SELECT l.id, l.title, l.start_time, l.end_time, t.name as teacher_name
			FROM lessons l
			LEFT JOIN teachers t ON l.teacher_id = t.id
			WHERE l.teacher_id = $1 
			AND l.company_id = $2
			AND l.id != $3
			AND l.status != 'cancelled'
			AND (
				(l.start_time < $5 AND l.end_time > $4) OR
				(l.start_time >= $4 AND l.start_time < $5)
			)
		`
		rows, err := r.db.Query(query, teacherID, companyID, excludeLessonID, start, end)
		if err != nil {
			return nil, fmt.Errorf("error checking teacher conflicts: %w", err)
		}
		defer rows.Close()

		for rows.Next() {
			var conflict ConflictInfo
			var teacherName sql.NullString
			err := rows.Scan(&conflict.LessonID, &conflict.Title, &conflict.Start, &conflict.End, &teacherName)
			if err != nil {
				return nil, fmt.Errorf("error scanning conflict: %w", err)
			}
			if teacherName.Valid {
				conflict.TeacherName = teacherName.String
			}
			conflict.ConflictType = "teacher"
			conflicts = append(conflicts, conflict)
		}
	}

	// Check room conflicts
	if roomID != "" {
		query := `
			SELECT l.id, l.title, l.start_time, l.end_time, r.name as room_name
			FROM lessons l
			LEFT JOIN rooms r ON l.room_id = r.id
			WHERE l.room_id = $1 
			AND l.company_id = $2
			AND l.id != $3
			AND l.status != 'cancelled'
			AND (
				(l.start_time < $5 AND l.end_time > $4) OR
				(l.start_time >= $4 AND l.start_time < $5)
			)
		`
		rows, err := r.db.Query(query, roomID, companyID, excludeLessonID, start, end)
		if err != nil {
			return nil, fmt.Errorf("error checking room conflicts: %w", err)
		}
		defer rows.Close()

		for rows.Next() {
			var conflict ConflictInfo
			var roomName sql.NullString
			err := rows.Scan(&conflict.LessonID, &conflict.Title, &conflict.Start, &conflict.End, &roomName)
			if err != nil {
				return nil, fmt.Errorf("error scanning conflict: %w", err)
			}
			if roomName.Valid {
				conflict.RoomName = roomName.String
			}
			conflict.ConflictType = "room"
			conflicts = append(conflicts, conflict)
		}
	}

	return conflicts, nil
}

// GetByTeacherID retrieves lessons for a specific teacher within a date range
func (r *LessonRepository) GetByTeacherID(teacherID string, startDate, endDate time.Time, companyID string) ([]*models.Lesson, error) {
	query := `
		SELECT id, title, teacher_id, group_id, subject, start_time, end_time, room, room_id, status 
		FROM lessons 
		WHERE teacher_id = $1 AND company_id = $2 AND start_time >= $3 AND start_time <= $4
		ORDER BY start_time
	`

	rows, err := r.db.Query(query, teacherID, companyID, startDate, endDate)
	if err != nil {
		return nil, fmt.Errorf("error getting lessons by teacher: %w", err)
	}
	defer rows.Close()

	lessons := []*models.Lesson{}
	for rows.Next() {
		lesson := &models.Lesson{}
		var teacherID, groupID, room, roomID, status sql.NullString

		err := rows.Scan(&lesson.ID, &lesson.Title, &teacherID, &groupID,
			&lesson.Subject, &lesson.Start, &lesson.End, &room, &roomID, &status)
		if err != nil {
			return nil, fmt.Errorf("error scanning lesson: %w", err)
		}

		if teacherID.Valid {
			lesson.TeacherID = teacherID.String
		}
		if groupID.Valid {
			lesson.GroupID = groupID.String
		}
		if room.Valid {
			lesson.Room = room.String
		}
		if roomID.Valid {
			lesson.RoomID = roomID.String
		}
		if status.Valid {
			lesson.Status = status.String
		} else {
			lesson.Status = "scheduled"
		}

		lesson.StudentIds = []string{}

		// Get students
		studentRows, err := r.db.Query(`SELECT student_id FROM lesson_students WHERE lesson_id = $1`, lesson.ID)
		if err == nil {
			defer studentRows.Close()
			for studentRows.Next() {
				var studentID string
				if err := studentRows.Scan(&studentID); err == nil {
					lesson.StudentIds = append(lesson.StudentIds, studentID)
				}
			}
		}

		lessons = append(lessons, lesson)
	}

	return lessons, nil
}

// CreateBulk creates multiple lessons in a single transaction
func (r *LessonRepository) CreateBulk(lessons []*models.Lesson, companyID string) error {
	tx, err := r.db.Begin()
	if err != nil {
		return fmt.Errorf("error starting transaction: %w", err)
	}
	defer tx.Rollback()

	for _, lesson := range lessons {
		// Convert empty groupId and roomId to NULL
		var groupID interface{}
		if lesson.GroupID == "" {
			groupID = nil
		} else {
			groupID = lesson.GroupID
		}

		var roomID interface{}
		if lesson.RoomID == "" {
			roomID = nil
		} else {
			roomID = lesson.RoomID
		}

		// Insert lesson
		query := `
			INSERT INTO lessons (id, title, teacher_id, group_id, subject, start_time, end_time, room, room_id, status, company_id)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		`
		_, err = tx.Exec(query, lesson.ID, lesson.Title, lesson.TeacherID, groupID,
			lesson.Subject, lesson.Start, lesson.End, lesson.Room, roomID, lesson.Status, companyID)
		if err != nil {
			return fmt.Errorf("error creating lesson: %w", err)
		}

		// Insert students
		for _, studentID := range lesson.StudentIds {
			_, err = tx.Exec(`INSERT INTO lesson_students (lesson_id, student_id, company_id) VALUES ($1, $2, $3)`, lesson.ID, studentID, companyID)
			if err != nil {
				return fmt.Errorf("error inserting student to lesson: %w", err)
			}
		}
	}

	return tx.Commit()
}
