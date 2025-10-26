package services

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"classmate-central/internal/models"
	"classmate-central/internal/repository"
)

type AttendanceService struct {
	subscriptionRepo *repository.SubscriptionRepository
	activityRepo     *repository.ActivityRepository
	notificationRepo *repository.NotificationRepository
	db               *sql.DB
}

func NewAttendanceService(
	subscriptionRepo *repository.SubscriptionRepository,
	activityRepo *repository.ActivityRepository,
	notificationRepo *repository.NotificationRepository,
	db *sql.DB,
) *AttendanceService {
	return &AttendanceService{
		subscriptionRepo: subscriptionRepo,
		activityRepo:     activityRepo,
		notificationRepo: notificationRepo,
		db:               db,
	}
}

// MarkAttendanceWithDeduction marks attendance and deducts from subscription if attended
func (s *AttendanceService) MarkAttendanceWithDeduction(req *models.MarkAttendanceRequest, markedBy *int) (*models.LessonAttendance, error) {
	// Start transaction
	tx, err := s.db.Begin()
	if err != nil {
		return nil, fmt.Errorf("error starting transaction: %w", err)
	}
	defer tx.Rollback()

	// Create attendance record
	attendance := &models.LessonAttendance{
		LessonID:  req.LessonID,
		StudentID: req.StudentID,
		Status:    req.Status,
		Reason:    req.Reason,
		Notes:     req.Notes,
		MarkedBy:  markedBy,
		MarkedAt:  time.Now(),
	}

	// If student attended, try to deduct from active subscription
	var subscriptionID *string
	if req.Status == "attended" {
		activeSub, err := s.subscriptionRepo.GetActiveSubscription(req.StudentID)
		if err != nil && err != sql.ErrNoRows {
			return nil, fmt.Errorf("error getting active subscription: %w", err)
		}

		if activeSub != nil {
			// Deduct lesson
			err = s.subscriptionRepo.DeductLesson(activeSub.ID)
			if err != nil {
				return nil, fmt.Errorf("error deducting lesson: %w", err)
			}

			subscriptionID = &activeSub.ID
			attendance.SubscriptionID = subscriptionID

			// Check if subscription is now depleted
			updatedSub, err := s.subscriptionRepo.GetSubscriptionByID(activeSub.ID)
			if err != nil {
				return nil, fmt.Errorf("error getting updated subscription: %w", err)
			}

			if updatedSub.LessonsRemaining == 0 {
				// Mark subscription as expired
				updatedSub.Status = "expired"
				err = s.subscriptionRepo.UpdateSubscription(updatedSub)
				if err != nil {
					return nil, fmt.Errorf("error updating subscription status: %w", err)
				}

				// Create notification
				notification := &models.Notification{
					StudentID: req.StudentID,
					Type:      "subscription_expired",
					Message:   "Ваш абонемент исчерпан. Пожалуйста, продлите подписку.",
					IsRead:    false,
				}
				_ = s.notificationRepo.CreateNotification(notification)
			} else if updatedSub.LessonsRemaining <= 3 {
				// Warn when running low
				exists, _ := s.notificationRepo.CheckExistingNotification(req.StudentID, "subscription_expiring")
				if !exists {
					notification := &models.Notification{
						StudentID: req.StudentID,
						Type:      "subscription_expiring",
						Message:   fmt.Sprintf("Осталось %d занятий в абонементе.", updatedSub.LessonsRemaining),
						IsRead:    false,
					}
					_ = s.notificationRepo.CreateNotification(notification)
				}
			}

			// Log subscription change activity
			metadata := map[string]interface{}{
				"subscription_id":   activeSub.ID,
				"lessons_remaining": updatedSub.LessonsRemaining,
				"lesson_id":         req.LessonID,
			}
			metadataJSON, _ := json.Marshal(metadata)
			metadataStr := string(metadataJSON)

			activityLog := &models.StudentActivityLog{
				StudentID:    req.StudentID,
				ActivityType: "subscription_change",
				Description:  fmt.Sprintf("Списано занятие с абонемента. Осталось: %d", updatedSub.LessonsRemaining),
				Metadata:     &metadataStr,
				CreatedBy:    markedBy,
				CreatedAt:    time.Now(),
			}
			_ = s.activityRepo.LogActivity(activityLog)
		}
	}

	// Mark attendance in repository
	err = s.subscriptionRepo.MarkAttendance(attendance)
	if err != nil {
		return nil, fmt.Errorf("error marking attendance: %w", err)
	}

	// Log attendance activity
	statusText := map[string]string{
		"attended":  "Посетил занятие",
		"missed":    "Пропустил занятие",
		"cancelled": "Занятие отменено",
	}

	metadata := map[string]interface{}{
		"lesson_id":       req.LessonID,
		"status":          req.Status,
		"reason":          req.Reason,
		"subscription_id": subscriptionID,
	}
	metadataJSON, _ := json.Marshal(metadata)
	metadataStr := string(metadataJSON)

	activityLog := &models.StudentActivityLog{
		StudentID:    req.StudentID,
		ActivityType: "attendance",
		Description:  statusText[req.Status],
		Metadata:     &metadataStr,
		CreatedBy:    markedBy,
		CreatedAt:    time.Now(),
	}
	_ = s.activityRepo.LogActivity(activityLog)

	// Commit transaction
	if err = tx.Commit(); err != nil {
		return nil, fmt.Errorf("error committing transaction: %w", err)
	}

	return attendance, nil
}
