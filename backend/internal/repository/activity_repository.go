package repository

import (
	"database/sql"
	"fmt"

	"classmate-central/internal/models"
)

type ActivityRepository struct {
	db *sql.DB
}

func NewActivityRepository(db *sql.DB) *ActivityRepository {
	return &ActivityRepository{db: db}
}

// LogActivity records a student activity
func (r *ActivityRepository) LogActivity(activity *models.StudentActivityLog) error {
	query := `
		INSERT INTO student_activity_log (student_id, activity_type, description, metadata, created_by, created_at)
		VALUES ($1, $2, $3, $4, $5, COALESCE($6, CURRENT_TIMESTAMP))
		RETURNING id
	`
	err := r.db.QueryRow(
		query,
		activity.StudentID,
		activity.ActivityType,
		activity.Description,
		activity.Metadata,
		activity.CreatedBy,
		activity.CreatedAt,
	).Scan(&activity.ID)

	if err != nil {
		return fmt.Errorf("error logging activity: %w", err)
	}

	return nil
}

// GetStudentActivities retrieves activities for a student with pagination
func (r *ActivityRepository) GetStudentActivities(studentID string, limit, offset int) ([]*models.StudentActivityLog, error) {
	if limit <= 0 {
		limit = 50
	}

	query := `
		SELECT id, student_id, activity_type, description, metadata, created_by, created_at
		FROM student_activity_log
		WHERE student_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := r.db.Query(query, studentID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("error getting student activities: %w", err)
	}
	defer rows.Close()

	activities := []*models.StudentActivityLog{}
	for rows.Next() {
		activity := &models.StudentActivityLog{}
		var metadata sql.NullString
		var createdBy sql.NullInt32

		err := rows.Scan(
			&activity.ID,
			&activity.StudentID,
			&activity.ActivityType,
			&activity.Description,
			&metadata,
			&createdBy,
			&activity.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("error scanning activity: %w", err)
		}

		if metadata.Valid {
			activity.Metadata = &metadata.String
		}
		if createdBy.Valid {
			val := int(createdBy.Int32)
			activity.CreatedBy = &val
		}

		activities = append(activities, activity)
	}

	return activities, nil
}

// GetActivityStats returns statistics about student activities
func (r *ActivityRepository) GetActivityStats(studentID string) (map[string]int, error) {
	query := `
		SELECT activity_type, COUNT(*) as count
		FROM student_activity_log
		WHERE student_id = $1
		GROUP BY activity_type
	`

	rows, err := r.db.Query(query, studentID)
	if err != nil {
		return nil, fmt.Errorf("error getting activity stats: %w", err)
	}
	defer rows.Close()

	stats := make(map[string]int)
	for rows.Next() {
		var activityType string
		var count int
		if err := rows.Scan(&activityType, &count); err != nil {
			return nil, fmt.Errorf("error scanning activity stats: %w", err)
		}
		stats[activityType] = count
	}

	return stats, nil
}
