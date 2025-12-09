package services

import (
	"os"
	"testing"
	"time"
)

func TestEmailService_SendVerificationCode(t *testing.T) {
	// Save original env
	originalHost := os.Getenv("SMTP_HOST")
	defer os.Setenv("SMTP_HOST", originalHost)

	// Test without SMTP configured (should log, not error)
	os.Setenv("SMTP_HOST", "")
	service := NewEmailService()
	
	err := service.SendVerificationCode("test@example.com", "123456")
	if err != nil {
		t.Errorf("SendVerificationCode should not error when SMTP not configured, got: %v", err)
	}
}

func TestEmailService_SendPaymentNotification(t *testing.T) {
	// Save original env
	originalHost := os.Getenv("SMTP_HOST")
	defer os.Setenv("SMTP_HOST", originalHost)

	// Test without SMTP configured
	os.Setenv("SMTP_HOST", "")
	service := NewEmailService()
	
	// Test payment notification
	err := service.SendPaymentNotification("test@example.com", "Иван Иванов", 5000.0, "payment", "cash", "Оплата за месяц")
	if err != nil {
		t.Errorf("SendPaymentNotification should not error when SMTP not configured, got: %v", err)
	}

	// Test refund notification
	err = service.SendPaymentNotification("test@example.com", "Иван Иванов", 2000.0, "refund", "card", "Возврат")
	if err != nil {
		t.Errorf("SendPaymentNotification should not error for refund, got: %v", err)
	}

	// Test other types (should return nil without sending)
	err = service.SendPaymentNotification("test@example.com", "Иван Иванов", 1000.0, "debt", "cash", "")
	if err != nil {
		t.Errorf("SendPaymentNotification should return nil for non-payment types, got: %v", err)
	}
}

func TestEmailService_SendAbsenceNotification(t *testing.T) {
	// Save original env
	originalHost := os.Getenv("SMTP_HOST")
	defer os.Setenv("SMTP_HOST", originalHost)

	os.Setenv("SMTP_HOST", "")
	service := NewEmailService()
	
	err := service.SendAbsenceNotification("test@example.com", "Иван Иванов", "Математика", "unexcused", "Опоздал", time.Now())
	if err != nil {
		t.Errorf("SendAbsenceNotification should not error when SMTP not configured, got: %v", err)
	}
}

func TestEmailService_TranslatePaymentMethod(t *testing.T) {
	service := NewEmailService()
	
	tests := []struct {
		input    string
		expected string
	}{
		{"cash", "Наличные"},
		{"card", "Банковская карта"},
		{"transfer", "Банковский перевод"},
		{"other", "Другое"},
		{"unknown", "unknown"},
	}

	for _, tt := range tests {
		result := service.translatePaymentMethod(tt.input)
		if result != tt.expected {
			t.Errorf("translatePaymentMethod(%q) = %q, want %q", tt.input, result, tt.expected)
		}
	}
}

func TestEmailService_TranslateAbsenceReason(t *testing.T) {
	service := NewEmailService()
	
	tests := []struct {
		input    string
		expected string
	}{
		{"excused", "Уважительная причина"},
		{"unexcused", "Неуважительная причина"},
		{"sick", "Болезнь"},
		{"other", "Другое"},
		{"unknown", "unknown"},
	}

	for _, tt := range tests {
		result := service.translateAbsenceReason(tt.input)
		if result != tt.expected {
			t.Errorf("translateAbsenceReason(%q) = %q, want %q", tt.input, result, tt.expected)
		}
	}
}

func TestEmailService_FormatDescription(t *testing.T) {
	service := NewEmailService()
	
	// Test with description
	result := service.formatDescription("Тестовое описание")
	if result == "" {
		t.Error("formatDescription should return formatted string when description provided")
	}

	// Test without description
	result = service.formatDescription("")
	if result != "" {
		t.Errorf("formatDescription should return empty string when description is empty, got: %q", result)
	}
}

