package services

import (
	"testing"
	"time"

	"classmate-central/internal/models"
)

func TestExportService_ExportStudentsPDF(t *testing.T) {
	service := NewExportService()
	
	students := []*models.Student{
		{
			ID:    "1",
			Name:  "Иван Иванов",
			Age:   15,
			Email: "ivan@example.com",
			Phone: "+77001234567",
		},
		{
			ID:    "2",
			Name:  "Петр Петров",
			Age:   16,
			Email: "petr@example.com",
			Phone: "+77001234568",
		},
	}

	pdf, err := service.ExportStudentsPDF(students)
	if err != nil {
		t.Errorf("ExportStudentsPDF failed: %v", err)
		return
	}

	if len(pdf) == 0 {
		t.Error("ExportStudentsPDF returned empty PDF")
	}
}

func TestExportService_ExportStudentsExcel(t *testing.T) {
	service := NewExportService()
	
	students := []*models.Student{
		{
			ID:    "1",
			Name:  "Иван Иванов",
			Age:   15,
			Email: "ivan@example.com",
			Phone: "+77001234567",
		},
	}

	excel, err := service.ExportStudentsExcel(students)
	if err != nil {
		t.Errorf("ExportStudentsExcel failed: %v", err)
		return
	}

	if len(excel) == 0 {
		t.Error("ExportStudentsExcel returned empty Excel file")
	}
}

func TestExportService_ExportTransactionsPDF(t *testing.T) {
	service := NewExportService()
	
	transactions := []models.PaymentTransaction{
		{
			ID:            1,
			StudentID:     "1",
			Amount:        5000.0,
			Type:          "payment",
			PaymentMethod: "cash",
			Description:   "Оплата за месяц",
			CreatedAt:     time.Now(),
		},
	}

	students := map[string]string{
		"1": "Иван Иванов",
	}

	pdf, err := service.ExportTransactionsPDF(transactions, students)
	if err != nil {
		t.Errorf("ExportTransactionsPDF failed: %v", err)
		return
	}

	if len(pdf) == 0 {
		t.Error("ExportTransactionsPDF returned empty PDF")
	}
}

func TestExportService_ExportTransactionsExcel(t *testing.T) {
	service := NewExportService()
	
	transactions := []models.PaymentTransaction{
		{
			ID:            1,
			StudentID:     "1",
			Amount:        5000.0,
			Type:          "payment",
			PaymentMethod: "cash",
		},
	}

	students := map[string]string{
		"1": "Иван Иванов",
	}

	excel, err := service.ExportTransactionsExcel(transactions, students)
	if err != nil {
		t.Errorf("ExportTransactionsExcel failed: %v", err)
		return
	}

	if len(excel) == 0 {
		t.Error("ExportTransactionsExcel returned empty Excel file")
	}
}

