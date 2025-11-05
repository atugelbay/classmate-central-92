package services

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"classmate-central/internal/models"
	"classmate-central/internal/repository"
)

type SubscriptionService struct {
	subscriptionRepo *repository.SubscriptionRepository
	lessonRepo       *repository.LessonRepository
	activityRepo     *repository.ActivityRepository
	db               *sql.DB
}

func NewSubscriptionService(
	subscriptionRepo *repository.SubscriptionRepository,
	lessonRepo *repository.LessonRepository,
	activityRepo *repository.ActivityRepository,
	db *sql.DB,
) *SubscriptionService {
	return &SubscriptionService{
		subscriptionRepo: subscriptionRepo,
		lessonRepo:       lessonRepo,
		activityRepo:     activityRepo,
		db:               db,
	}
}

// FreezeSubscription handles the freeze logic:
// 1. Finds all lessons in the freeze period
// 2. Moves lessons to period after freeze (extends subscription end date by freeze days)
// 3. Updates subscription endDate and paidTill
func (s *SubscriptionService) FreezeSubscription(
	subscriptionID string,
	freezeStart time.Time,
	freezeEnd time.Time,
	reason string,
	companyID string,
) (*models.StudentSubscription, error) {
	// Start transaction
	tx, err := s.db.Begin()
	if err != nil {
		return nil, fmt.Errorf("error starting transaction: %w", err)
	}
	defer tx.Rollback()

	// Get subscription
	subscription, err := s.subscriptionRepo.GetSubscriptionByID(subscriptionID, companyID)
	if err != nil {
		return nil, fmt.Errorf("subscription not found: %w", err)
	}

	// Validate freeze period
	// freezeStart should be on or after subscription start
	if subscription.StartDate.After(freezeStart) {
		return nil, fmt.Errorf("freeze start date must be on or after subscription start date")
	}
	// If subscription has end date, freezeEnd should be before or equal to subscription end
	if subscription.EndDate != nil && subscription.EndDate.Before(freezeEnd) {
		return nil, fmt.Errorf("freeze end date must be before or equal to subscription end date")
	}

	// Calculate freeze duration in days (inclusive)
	// Add 1 day because freezeEnd is inclusive (e.g., freeze from 01.11 to 07.11 = 7 days)
	freezeDuration := int(freezeEnd.Sub(freezeStart).Hours()/24) + 1
	if freezeDuration <= 0 {
		freezeDuration = 1 // At least 1 day
	}

	// Set freezeEnd to end of day (23:59:59)
	freezeEndTime := time.Date(freezeEnd.Year(), freezeEnd.Month(), freezeEnd.Day(), 23, 59, 59, 0, freezeEnd.Location())

	// Get all lessons for this student in the freeze period
	// We need to find lessons that:
	// 1. Have this student (via lesson_students or group enrollment)
	// 2. Are scheduled during freeze period
	// 3. Are not cancelled
	query := `
		SELECT DISTINCT l.id, l.title, l.teacher_id, l.group_id, l.subject,
		       l.start_time, l.end_time, l.room, l.room_id, l.status, l.company_id
		FROM lessons l
		LEFT JOIN lesson_students ls ON l.id = ls.lesson_id
		LEFT JOIN groups g ON l.group_id = g.id
		LEFT JOIN enrollment e ON g.id = e.group_id
		WHERE l.company_id = $1
		  AND l.status != 'cancelled'
		  AND l.start_time >= $2
		  AND l.start_time <= $3
		  AND (
		    ls.student_id = $4
		    OR (e.student_id = $4 AND e.left_at IS NULL)
		  )
	`
	rows, err := tx.Query(query, companyID, freezeStart, freezeEndTime, subscription.StudentID)
	if err != nil {
		return nil, fmt.Errorf("error finding lessons: %w", err)
	}
	defer rows.Close()

	lessonsToMove := []*models.Lesson{}
	for rows.Next() {
		lesson := &models.Lesson{}
		var teacherID, groupID, room, roomID, status sql.NullString

		err := rows.Scan(&lesson.ID, &lesson.Title, &teacherID, &groupID,
			&lesson.Subject, &lesson.Start, &lesson.End, &room, &roomID, &status, &lesson.CompanyID)
		if err != nil {
			continue
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
		}

		lessonsToMove = append(lessonsToMove, lesson)
	}

	// Calculate new end date (extend by freeze duration)
	var newEndDate *time.Time
	if subscription.EndDate != nil {
		extended := subscription.EndDate.AddDate(0, 0, freezeDuration)
		newEndDate = &extended
	}

	var newPaidTill *time.Time
	if subscription.PaidTill != nil {
		extended := subscription.PaidTill.AddDate(0, 0, freezeDuration)
		newPaidTill = &extended
	}

	// Update subscription end date and paid till
	// Keep status as 'active' since we're just extending the subscription
	updateQuery := `
		UPDATE student_subscriptions
		SET end_date = $1, paid_till = $2, freeze_days_remaining = freeze_days_remaining + $3, updated_at = NOW()
		WHERE id = $4 AND company_id = $5
	`
	_, err = tx.Exec(updateQuery, newEndDate, newPaidTill, freezeDuration, subscriptionID, companyID)
	if err != nil {
		return nil, fmt.Errorf("error updating subscription: %w", err)
	}

	// Move lessons: shift them by freeze duration
	for _, lesson := range lessonsToMove {
		newStart := lesson.Start.AddDate(0, 0, freezeDuration)
		newEnd := lesson.End.AddDate(0, 0, freezeDuration)

		updateLessonQuery := `
			UPDATE lessons
			SET start_time = $1, end_time = $2
			WHERE id = $3 AND company_id = $4
		`
		_, err = tx.Exec(updateLessonQuery, newStart, newEnd, lesson.ID, companyID)
		if err != nil {
			return nil, fmt.Errorf("error moving lesson %s: %w", lesson.ID, err)
		}
	}

	// Create freeze record
	freeze := &models.SubscriptionFreeze{
		SubscriptionID: subscriptionID,
		FreezeStart:    freezeStart,
		FreezeEnd:      &freezeEnd,
		Reason:         reason,
	}
	
	// Handle NULL values for reason
	var reasonValue interface{}
	if reason == "" {
		reasonValue = nil
	} else {
		reasonValue = reason
	}
	
	freezeQuery := `
		INSERT INTO subscription_freezes (subscription_id, freeze_start, freeze_end, reason, created_at)
		VALUES ($1, $2, $3, $4, NOW())
		RETURNING id
	`
	err = tx.QueryRow(freezeQuery, subscriptionID, freezeStart, freezeEnd, reasonValue).Scan(&freeze.ID)
	if err != nil {
		return nil, fmt.Errorf("error creating freeze record: %w", err)
	}

	// Commit transaction first
	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("error committing transaction: %w", err)
	}

	// Log activity after transaction commit (non-critical)
	activityDesc := fmt.Sprintf("Абонемент заморожен на %d дней", freezeDuration)
	if reason != "" {
		activityDesc += fmt.Sprintf(". Причина: %s", reason)
	}
	activityMetadata := map[string]interface{}{
		"freezeStart":    freezeStart,
		"freezeEnd":      freezeEnd,
		"freezeDuration": freezeDuration,
		"lessonsMoved":   len(lessonsToMove),
	}
	metadataJSON, _ := json.Marshal(activityMetadata)
	metadataStr := string(metadataJSON)
	
	activity := &models.StudentActivityLog{
		StudentID:    subscription.StudentID,
		ActivityType: "freeze",
		Description:  activityDesc,
		Metadata:     &metadataStr,
		CreatedAt:    time.Now(),
	}
	
	// Log activity separately (non-critical, won't affect transaction)
	_ = s.activityRepo.LogActivity(activity)

	// Get updated subscription
	updatedSubscription, err := s.subscriptionRepo.GetSubscriptionByID(subscriptionID, companyID)
	if err != nil {
		return nil, fmt.Errorf("error getting updated subscription: %w", err)
	}

	return updatedSubscription, nil
}
