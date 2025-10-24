package repository

import (
	"database/sql"
	"fmt"

	"classmate-central/internal/models"
)

type LessonRepository struct {
	db *sql.DB
}

func NewLessonRepository(db *sql.DB) *LessonRepository {
	return &LessonRepository{db: db}
}

func (r *LessonRepository) Create(lesson *models.Lesson) error {
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
		INSERT INTO lessons (id, title, teacher_id, group_id, subject, start_time, end_time, room, room_id, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`
	_, err = tx.Exec(query, lesson.ID, lesson.Title, lesson.TeacherID, groupID,
		lesson.Subject, lesson.Start, lesson.End, lesson.Room, roomID, lesson.Status)
	if err != nil {
		return fmt.Errorf("error creating lesson: %w", err)
	}

	// Insert students
	for _, studentID := range lesson.StudentIds {
		_, err = tx.Exec(`INSERT INTO lesson_students (lesson_id, student_id) VALUES ($1, $2)`, lesson.ID, studentID)
		if err != nil {
			return fmt.Errorf("error inserting student to lesson: %w", err)
		}
	}

	return tx.Commit()
}

func (r *LessonRepository) GetAll() ([]*models.Lesson, error) {
	query := `SELECT id, title, teacher_id, group_id, subject, start_time, end_time, room, room_id, status FROM lessons ORDER BY start_time`

	rows, err := r.db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("error getting lessons: %w", err)
	}
	defer rows.Close()

	lessons := []*models.Lesson{}
	for rows.Next() {
		lesson := &models.Lesson{}
		var groupID, roomID sql.NullString

		err := rows.Scan(&lesson.ID, &lesson.Title, &lesson.TeacherID, &groupID,
			&lesson.Subject, &lesson.Start, &lesson.End, &lesson.Room, &roomID, &lesson.Status)
		if err != nil {
			return nil, fmt.Errorf("error scanning lesson: %w", err)
		}

		if groupID.Valid {
			lesson.GroupID = groupID.String
		}
		if roomID.Valid {
			lesson.RoomID = roomID.String
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

func (r *LessonRepository) GetByID(id string) (*models.Lesson, error) {
	lesson := &models.Lesson{}
	var groupID, roomID sql.NullString

	query := `SELECT id, title, teacher_id, group_id, subject, start_time, end_time, room, room_id, status FROM lessons WHERE id = $1`

	err := r.db.QueryRow(query, id).Scan(&lesson.ID, &lesson.Title, &lesson.TeacherID, &groupID,
		&lesson.Subject, &lesson.Start, &lesson.End, &lesson.Room, &roomID, &lesson.Status)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("error getting lesson: %w", err)
	}

	if groupID.Valid {
		lesson.GroupID = groupID.String
	}
	if roomID.Valid {
		lesson.RoomID = roomID.String
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

func (r *LessonRepository) Update(lesson *models.Lesson) error {
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
		WHERE id = $1
	`
	_, err = tx.Exec(query, lesson.ID, lesson.Title, lesson.TeacherID, groupID,
		lesson.Subject, lesson.Start, lesson.End, lesson.Room, roomID, lesson.Status)
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
		_, err = tx.Exec(`INSERT INTO lesson_students (lesson_id, student_id) VALUES ($1, $2)`, lesson.ID, studentID)
		if err != nil {
			return fmt.Errorf("error inserting student to lesson: %w", err)
		}
	}

	return tx.Commit()
}

func (r *LessonRepository) Delete(id string) error {
	query := `DELETE FROM lessons WHERE id = $1`

	_, err := r.db.Exec(query, id)
	if err != nil {
		return fmt.Errorf("error deleting lesson: %w", err)
	}

	return nil
}
