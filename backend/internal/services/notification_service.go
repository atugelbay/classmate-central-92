package services

import (
	"fmt"
	"time"

	"classmate-central/internal/models"
	"classmate-central/internal/repository"
)

type NotificationService struct {
	notificationRepo *repository.NotificationRepository
	debtRepo         *repository.DebtRepository
	subscriptionRepo *repository.SubscriptionRepository
}

func NewNotificationService(
	notificationRepo *repository.NotificationRepository,
	debtRepo *repository.DebtRepository,
	subscriptionRepo *repository.SubscriptionRepository,
) *NotificationService {
	return &NotificationService{
		notificationRepo: notificationRepo,
		debtRepo:         debtRepo,
		subscriptionRepo: subscriptionRepo,
	}
}

// CheckAndCreateDebtNotifications checks for pending debts and creates notifications
func (s *NotificationService) CheckAndCreateDebtNotifications() error {
	// Get all pending debts (across all companies for background task)
	debts, err := s.debtRepo.GetByStatusAllCompanies("pending")
	if err != nil {
		return fmt.Errorf("error getting pending debts: %w", err)
	}

	now := time.Now()
	for _, debt := range debts {
		// Check if debt is overdue or due soon
		if debt.DueDate != nil && debt.DueDate.Before(now.Add(3*24*time.Hour)) {
			// Check if notification already exists
			exists, err := s.notificationRepo.CheckExistingNotification(debt.StudentID, "debt_reminder")
			if err != nil || exists {
				continue
			}

			var message string
			if debt.DueDate.Before(now) {
				daysOverdue := int(now.Sub(*debt.DueDate).Hours() / 24)
				message = fmt.Sprintf("Просроченный долг: %.2f ₸ (просрочен на %d дней)", debt.Amount, daysOverdue)
			} else {
				daysUntilDue := int(debt.DueDate.Sub(now).Hours() / 24)
				message = fmt.Sprintf("Напоминание о долге: %.2f ₸ (срок: %d дней)", debt.Amount, daysUntilDue)
			}

			notification := &models.Notification{
				StudentID: debt.StudentID,
				Type:      "debt_reminder",
				Message:   message,
				IsRead:    false,
			}

			err = s.notificationRepo.CreateNotification(notification)
			if err != nil {
				// Log error but continue
				continue
			}
		}
	}

	return nil
}

// CheckAndCreateSubscriptionNotifications checks for expiring subscriptions and creates notifications
func (s *NotificationService) CheckAndCreateSubscriptionNotifications() error {
	// Get subscriptions expiring within 7 days
	subscriptions, err := s.subscriptionRepo.CheckExpiringSubscriptions()
	if err != nil {
		return fmt.Errorf("error getting expiring subscriptions: %w", err)
	}

	now := time.Now()
	for _, sub := range subscriptions {
		// Check if notification already exists
		exists, err := s.notificationRepo.CheckExistingNotification(sub.StudentID, "subscription_expiring")
		if err != nil || exists {
			continue
		}

		daysUntilExpiry := int(sub.EndDate.Sub(now).Hours() / 24)
		message := fmt.Sprintf("Ваш абонемент истекает через %d дней. Осталось %d занятий.", daysUntilExpiry, sub.LessonsRemaining)

		notification := &models.Notification{
			StudentID: sub.StudentID,
			Type:      "subscription_expiring",
			Message:   message,
			IsRead:    false,
		}

		err = s.notificationRepo.CreateNotification(notification)
		if err != nil {
			// Log error but continue
			continue
		}
	}

	return nil
}

// SendDailyNotificationCheck performs daily check for both debts and subscriptions
func (s *NotificationService) SendDailyNotificationCheck() error {
	if err := s.CheckAndCreateDebtNotifications(); err != nil {
		return fmt.Errorf("error checking debts: %w", err)
	}

	if err := s.CheckAndCreateSubscriptionNotifications(); err != nil {
		return fmt.Errorf("error checking subscriptions: %w", err)
	}

	return nil
}
