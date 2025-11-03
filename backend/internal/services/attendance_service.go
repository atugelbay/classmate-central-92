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
	subscriptionRepo         *repository.SubscriptionRepository
	consumptionRepo          *repository.SubscriptionConsumptionRepository
	activityRepo             *repository.ActivityRepository
	notificationRepo         *repository.NotificationRepository
	db                       *sql.DB
}

func NewAttendanceService(
	subscriptionRepo *repository.SubscriptionRepository,
	consumptionRepo *repository.SubscriptionConsumptionRepository,
	activityRepo *repository.ActivityRepository,
	notificationRepo *repository.NotificationRepository,
	db *sql.DB,
) *AttendanceService {
	return &AttendanceService{
		subscriptionRepo: subscriptionRepo,
		consumptionRepo:  consumptionRepo,
		activityRepo:     activityRepo,
		notificationRepo: notificationRepo,
		db:               db,
	}
}

// MarkAttendanceWithDeduction marks attendance and deducts from subscription if attended
func (s *AttendanceService) MarkAttendanceWithDeduction(req *models.MarkAttendanceRequest, markedBy *int, companyID string) (*models.LessonAttendance, error) {
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
		CompanyID: companyID,
	}

	// Check if attendance already exists and was marked as "attended"
	// If so, don't deduct again to prevent double charging
	var existingStatus sql.NullString
	err = tx.QueryRow(`
		SELECT status FROM lesson_attendance 
		WHERE lesson_id = $1 AND student_id = $2
	`, req.LessonID, req.StudentID).Scan(&existingStatus)

	alreadyAttended := err == nil && existingStatus.Valid && existingStatus.String == "attended"

	// If student attended, try to deduct from active subscription
	var subscriptionID *string
	if req.Status == "attended" && !alreadyAttended {
		// Get active subscription with billing type and price using transaction
		var activeSub models.StudentSubscription
		var billingType string
		var pricePerLesson float64
		query := `
			SELECT 
				ss.id, ss.student_id, ss.subscription_type_id,
				ss.total_lessons, ss.used_lessons, ss.remaining_lessons,
				ss.start_date, ss.end_date, ss.status, ss.freeze_days_remaining, ss.created_at,
				ss.price_per_lesson,
				st.billing_type
			FROM student_subscriptions ss
			JOIN subscription_types st ON ss.subscription_type_id = st.id
			WHERE ss.student_id = $1 AND ss.status = 'active' AND ss.remaining_lessons > 0
			ORDER BY ss.created_at DESC
			LIMIT 1
		`
		err := tx.QueryRow(query, req.StudentID).Scan(
			&activeSub.ID, &activeSub.StudentID, &activeSub.SubscriptionTypeID,
			&activeSub.TotalLessons, &activeSub.UsedLessons, &activeSub.LessonsRemaining,
			&activeSub.StartDate, &activeSub.EndDate,
			&activeSub.Status, &activeSub.FreezeDaysRemaining, &activeSub.CreatedAt,
			&pricePerLesson,
			&billingType,
		)

		if err != nil && err != sql.ErrNoRows {
			return nil, fmt.Errorf("error getting active subscription: %w", err)
		}

		if err == nil {
			subscriptionID = &activeSub.ID
			attendance.SubscriptionID = subscriptionID

			// Get current lessons remaining
			lessonsRemaining := activeSub.LessonsRemaining

			// Deduct lesson ONLY for per_lesson billing type with optimistic locking
			if billingType == "per_lesson" {
				// Get current version first
				var currentVersion int
				err = tx.QueryRow("SELECT version FROM student_subscriptions WHERE id = $1", activeSub.ID).Scan(&currentVersion)
				if err != nil {
					return nil, fmt.Errorf("error getting subscription version: %w", err)
				}

				deductQuery := `
					UPDATE student_subscriptions 
					SET used_lessons = used_lessons + 1, 
					    updated_at = CURRENT_TIMESTAMP,
					    version = version + 1
					WHERE id = $1 AND remaining_lessons > 0 AND version = $2
				`
				result, err := tx.Exec(deductQuery, activeSub.ID, currentVersion)
				if err != nil {
					return nil, fmt.Errorf("error deducting lesson: %w", err)
				}
				rowsAffected, _ := result.RowsAffected()
				if rowsAffected == 0 {
					return nil, fmt.Errorf("subscription update failed: version mismatch or no remaining lessons")
				}

				// Get updated lessons remaining after deduction
				err = tx.QueryRow("SELECT remaining_lessons FROM student_subscriptions WHERE id = $1", activeSub.ID).Scan(&lessonsRemaining)
				if err != nil {
					return nil, fmt.Errorf("error getting updated subscription: %w", err)
				}

				// Deduct money from student balance
				if pricePerLesson > 0 {
					// Ensure student_balance record exists
					_, err = tx.Exec(`
						INSERT INTO student_balance (student_id, balance)
						VALUES ($1, 0)
						ON CONFLICT (student_id) DO NOTHING
					`, req.StudentID)
					if err != nil {
						return nil, fmt.Errorf("error ensuring student balance exists: %w", err)
					}

					// Deduct from balance
					_, err = tx.Exec(`
						UPDATE student_balance 
						SET balance = balance - $1
						WHERE student_id = $2
					`, pricePerLesson, req.StudentID)
					if err != nil {
						return nil, fmt.Errorf("error deducting from balance: %w", err)
					}

					// Create deduction transaction for history
					_, err = tx.Exec(`
						INSERT INTO payment_transactions (
							student_id, amount, type, payment_method, description, created_at, company_id
						) VALUES ($1, $2, 'deduction', 'subscription', $3, CURRENT_TIMESTAMP, $4)
					`, req.StudentID, pricePerLesson,
						fmt.Sprintf("Списание за посещенное занятие (Урок ID: %s)", req.LessonID),
						companyID)
					if err != nil {
						return nil, fmt.Errorf("error creating deduction transaction: %w", err)
					}
				}
			}

			if lessonsRemaining == 0 {
				// Mark subscription as expired using transaction
				_, err = tx.Exec("UPDATE student_subscriptions SET status = 'expired' WHERE id = $1", activeSub.ID)
				if err != nil {
					return nil, fmt.Errorf("error updating subscription status: %w", err)
				}

				// Create notification (outside transaction is OK)
				notification := &models.Notification{
					StudentID: req.StudentID,
					Type:      "subscription_expired",
					Message:   "Ваш абонемент исчерпан. Пожалуйста, продлите подписку.",
					IsRead:    false,
				}
				_ = s.notificationRepo.CreateNotification(notification)
			} else if lessonsRemaining <= 3 {
				// Warn when running low
				exists, _ := s.notificationRepo.CheckExistingNotification(req.StudentID, "subscription_expiring")
				if !exists {
					notification := &models.Notification{
						StudentID: req.StudentID,
						Type:      "subscription_expiring",
						Message:   fmt.Sprintf("Осталось %d занятий в абонементе.", lessonsRemaining),
						IsRead:    false,
					}
					_ = s.notificationRepo.CreateNotification(notification)
				}
			}

			// Log subscription change activity
			metadata := map[string]interface{}{
				"subscription_id":   activeSub.ID,
				"lessons_remaining": lessonsRemaining,
				"lesson_id":         req.LessonID,
			}
			metadataJSON, _ := json.Marshal(metadata)
			metadataStr := string(metadataJSON)

			activityLog := &models.StudentActivityLog{
				StudentID:    req.StudentID,
				ActivityType: "subscription_change",
				Description:  fmt.Sprintf("Списано занятие с абонемента. Осталось: %d", lessonsRemaining),
				Metadata:     &metadataStr,
				CreatedBy:    markedBy,
				CreatedAt:    time.Now(),
			}
			_ = s.activityRepo.LogActivity(activityLog)
		}
	}

	// Mark attendance using transaction
	insertQuery := `INSERT INTO lesson_attendance (lesson_id, student_id, subscription_id, status, marked_by, company_id) 
	          VALUES ($1, $2, $3, $4, $5, $6) 
	          ON CONFLICT (lesson_id, student_id) DO UPDATE 
	          SET subscription_id = EXCLUDED.subscription_id, status = EXCLUDED.status, marked_at = CURRENT_TIMESTAMP, marked_by = EXCLUDED.marked_by, company_id = EXCLUDED.company_id
	          RETURNING id, marked_at`
	err = tx.QueryRow(insertQuery, attendance.LessonID, attendance.StudentID, attendance.SubscriptionID, attendance.Status, attendance.MarkedBy, attendance.CompanyID).
		Scan(&attendance.ID, &attendance.MarkedAt)
	if err != nil {
		return nil, fmt.Errorf("error marking attendance: %w", err)
	}

	// Create subscription_consumption record if subscription was used
	if subscriptionID != nil && req.Status == "attended" {
		// Check if consumption already exists (to prevent double creation)
		var existingConsumptionID sql.NullInt64
		err = tx.QueryRow(`
			SELECT id FROM subscription_consumption 
			WHERE subscription_id = $1 AND attendance_id = $2
		`, *subscriptionID, attendance.ID).Scan(&existingConsumptionID)

		if err != nil || !existingConsumptionID.Valid {
			// Create consumption record
			consumption := &models.SubscriptionConsumption{
				SubscriptionID: *subscriptionID,
				AttendanceID:   attendance.ID,
				Units:          1,
			}
			_, err = tx.Exec(`
				INSERT INTO subscription_consumption (subscription_id, attendance_id, units, company_id)
				VALUES ($1, $2, $3, $4)
				ON CONFLICT (subscription_id, attendance_id) DO NOTHING
			`, consumption.SubscriptionID, consumption.AttendanceID, consumption.Units, companyID)
			if err != nil {
				return nil, fmt.Errorf("error creating subscription consumption: %w", err)
			}
		}
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
