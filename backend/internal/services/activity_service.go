package services

import (
	"encoding/json"
	"fmt"
	"time"

	"classmate-central/internal/models"
	"classmate-central/internal/repository"
)

type ActivityService struct {
	activityRepo *repository.ActivityRepository
}

func NewActivityService(activityRepo *repository.ActivityRepository) *ActivityService {
	return &ActivityService{
		activityRepo: activityRepo,
	}
}

// LogPayment logs a payment transaction activity
func (s *ActivityService) LogPayment(transaction *models.PaymentTransaction) error {
	metadata := map[string]interface{}{
		"transaction_id": transaction.ID,
		"amount":         transaction.Amount,
		"type":           transaction.Type,
		"payment_method": transaction.PaymentMethod,
	}
	metadataJSON, _ := json.Marshal(metadata)
	metadataStr := string(metadataJSON)

	var description string
	switch transaction.Type {
	case "payment":
		description = fmt.Sprintf("Оплата: %.2f ₸", transaction.Amount)
	case "refund":
		description = fmt.Sprintf("Возврат: %.2f ₸", transaction.Amount)
	case "debt":
		description = fmt.Sprintf("Долг: %.2f ₸", transaction.Amount)
	default:
		description = fmt.Sprintf("Транзакция: %.2f ₸", transaction.Amount)
	}

	activity := &models.StudentActivityLog{
		StudentID:    transaction.StudentID,
		ActivityType: "payment",
		Description:  description,
		Metadata:     &metadataStr,
		CreatedBy:    transaction.CreatedBy,
		CreatedAt:    transaction.CreatedAt,
	}

	return s.activityRepo.LogActivity(activity)
}

// LogSubscriptionChange logs a subscription change activity
func (s *ActivityService) LogSubscriptionChange(studentID, description string, metadata map[string]interface{}, createdBy *int) error {
	var metadataStr *string
	if metadata != nil {
		metadataJSON, _ := json.Marshal(metadata)
		str := string(metadataJSON)
		metadataStr = &str
	}

	activity := &models.StudentActivityLog{
		StudentID:    studentID,
		ActivityType: "subscription_change",
		Description:  description,
		Metadata:     metadataStr,
		CreatedBy:    createdBy,
		CreatedAt:    time.Now(),
	}

	return s.activityRepo.LogActivity(activity)
}

// LogStatusChange logs a student status change activity
func (s *ActivityService) LogStatusChange(studentID, oldStatus, newStatus string, createdBy *int) error {
	metadata := map[string]interface{}{
		"old_status": oldStatus,
		"new_status": newStatus,
	}
	metadataJSON, _ := json.Marshal(metadata)
	metadataStr := string(metadataJSON)

	statusNames := map[string]string{
		"active":    "Активный",
		"inactive":  "Неактивный",
		"frozen":    "Заморожен",
		"graduated": "Закончил обучение",
	}

	description := fmt.Sprintf("Статус изменен: %s → %s", statusNames[oldStatus], statusNames[newStatus])

	activity := &models.StudentActivityLog{
		StudentID:    studentID,
		ActivityType: "status_change",
		Description:  description,
		Metadata:     &metadataStr,
		CreatedBy:    createdBy,
		CreatedAt:    time.Now(),
	}

	return s.activityRepo.LogActivity(activity)
}

// LogNote logs a note addition activity
func (s *ActivityService) LogNote(note *models.StudentNote) error {
	metadata := map[string]interface{}{
		"note_id": note.ID,
		"note":    note.Note,
	}
	metadataJSON, _ := json.Marshal(metadata)
	metadataStr := string(metadataJSON)

	activity := &models.StudentActivityLog{
		StudentID:    note.StudentID,
		ActivityType: "note",
		Description:  "Добавлена заметка",
		Metadata:     &metadataStr,
		CreatedBy:    note.CreatedBy,
		CreatedAt:    note.CreatedAt,
	}

	return s.activityRepo.LogActivity(activity)
}

// LogDebtCreated logs when a debt is created
func (s *ActivityService) LogDebtCreated(debt *models.DebtRecord, createdBy *int) error {
	metadata := map[string]interface{}{
		"debt_id": debt.ID,
		"amount":  debt.Amount,
		"status":  debt.Status,
	}
	metadataJSON, _ := json.Marshal(metadata)
	metadataStr := string(metadataJSON)

	description := fmt.Sprintf("Создан долг: %.2f ₸", debt.Amount)

	activity := &models.StudentActivityLog{
		StudentID:    debt.StudentID,
		ActivityType: "debt_created",
		Description:  description,
		Metadata:     &metadataStr,
		CreatedBy:    createdBy,
		CreatedAt:    debt.CreatedAt,
	}

	return s.activityRepo.LogActivity(activity)
}

// LogFreeze logs a subscription freeze activity
func (s *ActivityService) LogFreeze(studentID, subscriptionID, reason string, createdBy *int) error {
	metadata := map[string]interface{}{
		"subscription_id": subscriptionID,
		"reason":          reason,
	}
	metadataJSON, _ := json.Marshal(metadata)
	metadataStr := string(metadataJSON)

	activity := &models.StudentActivityLog{
		StudentID:    studentID,
		ActivityType: "freeze",
		Description:  fmt.Sprintf("Заморожен абонемент. Причина: %s", reason),
		Metadata:     &metadataStr,
		CreatedBy:    createdBy,
		CreatedAt:    time.Now(),
	}

	return s.activityRepo.LogActivity(activity)
}
