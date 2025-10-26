package repository

import (
	"database/sql"
	"fmt"

	"classmate-central/internal/models"
)

type NotificationRepository struct {
	db *sql.DB
}

func NewNotificationRepository(db *sql.DB) *NotificationRepository {
	return &NotificationRepository{db: db}
}

// CreateNotification creates a new notification
func (r *NotificationRepository) CreateNotification(notification *models.Notification) error {
	query := `
		INSERT INTO notifications (student_id, type, message, is_read, created_at)
		VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
		RETURNING id, created_at
	`
	err := r.db.QueryRow(
		query,
		notification.StudentID,
		notification.Type,
		notification.Message,
		notification.IsRead,
	).Scan(&notification.ID, &notification.CreatedAt)

	if err != nil {
		return fmt.Errorf("error creating notification: %w", err)
	}

	return nil
}

// GetStudentNotifications retrieves all notifications for a student
func (r *NotificationRepository) GetStudentNotifications(studentID string) ([]*models.Notification, error) {
	query := `
		SELECT id, student_id, type, message, is_read, created_at
		FROM notifications
		WHERE student_id = $1
		ORDER BY created_at DESC
	`

	rows, err := r.db.Query(query, studentID)
	if err != nil {
		return nil, fmt.Errorf("error getting notifications: %w", err)
	}
	defer rows.Close()

	notifications := []*models.Notification{}
	for rows.Next() {
		notification := &models.Notification{}
		err := rows.Scan(
			&notification.ID,
			&notification.StudentID,
			&notification.Type,
			&notification.Message,
			&notification.IsRead,
			&notification.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("error scanning notification: %w", err)
		}
		notifications = append(notifications, notification)
	}

	return notifications, nil
}

// MarkAsRead marks a notification as read
func (r *NotificationRepository) MarkAsRead(notificationID int) error {
	query := `UPDATE notifications SET is_read = true WHERE id = $1`
	_, err := r.db.Exec(query, notificationID)
	if err != nil {
		return fmt.Errorf("error marking notification as read: %w", err)
	}
	return nil
}

// GetUnreadCount returns the count of unread notifications for a student
func (r *NotificationRepository) GetUnreadCount(studentID string) (int, error) {
	query := `SELECT COUNT(*) FROM notifications WHERE student_id = $1 AND is_read = false`
	var count int
	err := r.db.QueryRow(query, studentID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("error getting unread count: %w", err)
	}
	return count, nil
}

// CheckExistingNotification checks if a notification of a specific type already exists for a student
func (r *NotificationRepository) CheckExistingNotification(studentID, notificationType string) (bool, error) {
	query := `
		SELECT EXISTS(
			SELECT 1 FROM notifications 
			WHERE student_id = $1 AND type = $2 AND is_read = false
		)
	`
	var exists bool
	err := r.db.QueryRow(query, studentID, notificationType).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("error checking existing notification: %w", err)
	}
	return exists, nil
}
