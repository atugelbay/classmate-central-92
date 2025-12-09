package services

import (
	"bytes"
	"fmt"
	"time"

	"classmate-central/internal/models"

	"github.com/jung-kurt/gofpdf/v2"
	"github.com/xuri/excelize/v2"
)

type ExportService struct{}

func NewExportService() *ExportService {
	return &ExportService{}
}

// Helper function to setup Cyrillic font support
// For proper Cyrillic support, you need to add UTF-8 font files using AddUTF8Font
// Example: pdf.AddUTF8Font("DejaVu", "", "path/to/DejaVuSans.ttf")
// For now, we use Unicode-aware methods
func setupCyrillicFont(pdf *gofpdf.Fpdf) {
	// In gofpdf v2, we can use Unicode directly with proper font setup
	// Standard fonts don't support Cyrillic, so we need UTF-8 fonts
	// For production, embed DejaVu or Arial Unicode font files
}

// ExportTransactionsPDF exports transactions to PDF
func (s *ExportService) ExportTransactionsPDF(transactions []models.PaymentTransaction, students map[string]string) ([]byte, error) {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetTitle("Отчет по транзакциям", false)
	pdf.SetAuthor("Classmate Central", false)

	// Setup Cyrillic font support
	SetupCyrillicFonts(pdf)
	fontName := GetCyrillicFontName(pdf)

	pdf.AddPage()

	// Use Cyrillic-supporting font
	SetFontSafe(pdf, fontName, "B", 16)
	pdf.Cell(40, 10, "Отчет по транзакциям")
	pdf.Ln(12)

	// Date
	SetFontSafe(pdf, fontName, "", 10)
	pdf.Cell(40, 6, fmt.Sprintf("Дата создания: %s", time.Now().Format("02.01.2006 15:04")))
	pdf.Ln(10)

	// Table header
	SetFontSafe(pdf, fontName, "B", 10)
	pdf.SetFillColor(240, 240, 240)
	pdf.CellFormat(40, 7, "Дата", "1", 0, "L", true, 0, "")
	pdf.CellFormat(50, 7, "Студент", "1", 0, "L", true, 0, "")
	pdf.CellFormat(30, 7, "Тип", "1", 0, "L", true, 0, "")
	pdf.CellFormat(30, 7, "Способ", "1", 0, "L", true, 0, "")
	pdf.CellFormat(40, 7, "Сумма", "1", 0, "R", true, 0, "")
	pdf.Ln(-1)

	// Table rows
	SetFontSafe(pdf, fontName, "", 9)
	var totalIncome, totalExpense float64
	for _, tx := range transactions {
		studentName := students[tx.StudentID]
		if studentName == "" {
			studentName = tx.StudentID
		}

		dateStr := tx.CreatedAt.Format("02.01.2006 15:04")

		typeStr := "Платеж"
		if tx.Type == "refund" {
			typeStr = "Возврат"
		} else if tx.Type == "deduction" {
			typeStr = "Списание"
		} else if tx.Type == "debt" {
			typeStr = "Долг"
		}

		amountStr := fmt.Sprintf("%.2f ₸", tx.Amount)
		if tx.Type == "payment" {
			totalIncome += tx.Amount
		} else {
			totalExpense += tx.Amount
		}

		pdf.CellFormat(40, 6, dateStr, "1", 0, "L", false, 0, "")
		pdf.CellFormat(50, 6, studentName, "1", 0, "L", false, 0, "")
		pdf.CellFormat(30, 6, typeStr, "1", 0, "L", false, 0, "")
		pdf.CellFormat(30, 6, tx.PaymentMethod, "1", 0, "L", false, 0, "")
		pdf.CellFormat(40, 6, amountStr, "1", 0, "R", false, 0, "")
		pdf.Ln(6)
	}

	// Totals
	pdf.Ln(5)
	SetFontSafe(pdf, fontName, "B", 10)
	pdf.Cell(100, 6, "Итого доходов:")
	pdf.Cell(40, 6, fmt.Sprintf("%.2f ₸", totalIncome))
	pdf.Ln(6)
	pdf.Cell(100, 6, "Итого расходов:")
	pdf.Cell(40, 6, fmt.Sprintf("%.2f ₸", totalExpense))
	pdf.Ln(6)
	pdf.Cell(100, 6, "Баланс:")
	pdf.Cell(40, 6, fmt.Sprintf("%.2f ₸", totalIncome-totalExpense))

	var buf bytes.Buffer
	err := OutputPDFSafe(pdf, &buf)
	if err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// ExportTransactionsExcel exports transactions to Excel
func (s *ExportService) ExportTransactionsExcel(transactions []models.PaymentTransaction, students map[string]string) ([]byte, error) {
	f := excelize.NewFile()
	defer f.Close()

	sheetName := "Транзакции"
	f.NewSheet(sheetName)
	f.DeleteSheet("Sheet1")

	// Headers
	headers := []string{"Дата", "Студент", "Тип", "Способ оплаты", "Описание", "Сумма"}
	for i, header := range headers {
		cell := fmt.Sprintf("%c1", 'A'+i)
		f.SetCellValue(sheetName, cell, header)
	}

	// Style for headers
	headerStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true},
		Fill: excelize.Fill{Type: "pattern", Color: []string{"#F0F0F0"}, Pattern: 1},
	})
	f.SetCellStyle(sheetName, "A1", fmt.Sprintf("%c1", 'A'+len(headers)-1), headerStyle)

	// Data
	var totalIncome, totalExpense float64
	for i, tx := range transactions {
		row := i + 2
		studentName := students[tx.StudentID]
		if studentName == "" {
			studentName = tx.StudentID
		}

		dateStr := tx.CreatedAt.Format("02.01.2006 15:04")

		typeStr := "Платеж"
		if tx.Type == "refund" {
			typeStr = "Возврат"
		} else if tx.Type == "deduction" {
			typeStr = "Списание"
		} else if tx.Type == "debt" {
			typeStr = "Долг"
		}

		if tx.Type == "payment" {
			totalIncome += tx.Amount
		} else {
			totalExpense += tx.Amount
		}

		f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), dateStr)
		f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), studentName)
		f.SetCellValue(sheetName, fmt.Sprintf("C%d", row), typeStr)
		f.SetCellValue(sheetName, fmt.Sprintf("D%d", row), tx.PaymentMethod)
		f.SetCellValue(sheetName, fmt.Sprintf("E%d", row), tx.Description)
		f.SetCellValue(sheetName, fmt.Sprintf("F%d", row), tx.Amount)
	}

	// Totals row
	totalRow := len(transactions) + 3
	f.SetCellValue(sheetName, fmt.Sprintf("A%d", totalRow), "Итого доходов:")
	f.SetCellValue(sheetName, fmt.Sprintf("F%d", totalRow), totalIncome)
	totalRow++
	f.SetCellValue(sheetName, fmt.Sprintf("A%d", totalRow), "Итого расходов:")
	f.SetCellValue(sheetName, fmt.Sprintf("F%d", totalRow), totalExpense)
	totalRow++
	f.SetCellValue(sheetName, fmt.Sprintf("A%d", totalRow), "Баланс:")
	f.SetCellValue(sheetName, fmt.Sprintf("F%d", totalRow), totalIncome-totalExpense)

	// Auto-size columns
	for i := 0; i < len(headers); i++ {
		col := string(rune('A' + i))
		f.SetColWidth(sheetName, col, col, 15)
	}

	buf, err := f.WriteToBuffer()
	if err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// ExportStudentsPDF exports students to PDF
func (s *ExportService) ExportStudentsPDF(students []*models.Student) ([]byte, error) {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetTitle("Список студентов", false)
	pdf.SetAuthor("Classmate Central", false)

	// Setup Cyrillic font support
	SetupCyrillicFonts(pdf)
	fontName := GetCyrillicFontName(pdf)

	pdf.AddPage()

	// Header - use safe font setting
	SetFontSafe(pdf, fontName, "B", 16)
	pdf.Cell(40, 10, "Список студентов")
	pdf.Ln(12)

	// Date
	SetFontSafe(pdf, fontName, "", 10)
	pdf.Cell(40, 6, fmt.Sprintf("Дата создания: %s", time.Now().Format("02.01.2006 15:04")))
	pdf.Ln(10)

	// Table header
	SetFontSafe(pdf, fontName, "B", 10)
	pdf.SetFillColor(240, 240, 240)
	pdf.CellFormat(60, 7, "Имя", "1", 0, "L", true, 0, "")
	pdf.CellFormat(30, 7, "Возраст", "1", 0, "C", true, 0, "")
	pdf.CellFormat(60, 7, "Email", "1", 0, "L", true, 0, "")
	pdf.CellFormat(40, 7, "Телефон", "1", 0, "L", true, 0, "")
	pdf.Ln(-1)

	// Table rows
	SetFontSafe(pdf, fontName, "", 9)
	for _, student := range students {
		age := ""
		if student.Age > 0 {
			age = fmt.Sprintf("%d", student.Age)
		}
		pdf.CellFormat(60, 6, student.Name, "1", 0, "L", false, 0, "")
		pdf.CellFormat(30, 6, age, "1", 0, "C", false, 0, "")
		pdf.CellFormat(60, 6, student.Email, "1", 0, "L", false, 0, "")
		pdf.CellFormat(40, 6, student.Phone, "1", 0, "L", false, 0, "")
		pdf.Ln(-1)
	}

	// Total count
	pdf.Ln(5)
	SetFontSafe(pdf, fontName, "B", 10)
	pdf.Cell(40, 6, fmt.Sprintf("Всего студентов: %d", len(students)))

	var buf bytes.Buffer
	err := func() (err error) {
		defer func() {
			if r := recover(); r != nil {
				err = fmt.Errorf("PDF generation panic: %v", r)
			}
		}()
		return pdf.Output(&buf)
	}()
	if err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// ExportStudentsExcel exports students to Excel
func (s *ExportService) ExportStudentsExcel(students []*models.Student) ([]byte, error) {
	f := excelize.NewFile()
	defer f.Close()

	sheetName := "Студенты"
	f.NewSheet(sheetName)
	f.DeleteSheet("Sheet1")

	// Headers
	headers := []string{"Имя", "Возраст", "Email", "Телефон", "Статус"}
	for i, header := range headers {
		cell := fmt.Sprintf("%c1", 'A'+i)
		f.SetCellValue(sheetName, cell, header)
	}

	// Style for headers
	headerStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true},
		Fill: excelize.Fill{Type: "pattern", Color: []string{"#F0F0F0"}, Pattern: 1},
	})
	f.SetCellStyle(sheetName, "A1", fmt.Sprintf("%c1", 'A'+len(headers)-1), headerStyle)

	// Data
	for i, student := range students {
		row := i + 2
		age := 0
		if student.Age > 0 {
			age = student.Age
		}
		f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), student.Name)
		f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), age)
		f.SetCellValue(sheetName, fmt.Sprintf("C%d", row), student.Email)
		f.SetCellValue(sheetName, fmt.Sprintf("D%d", row), student.Phone)
		f.SetCellValue(sheetName, fmt.Sprintf("E%d", row), student.Status)
	}

	// Auto-size columns
	for i := 0; i < len(headers); i++ {
		col := string(rune('A' + i))
		f.SetColWidth(sheetName, col, col, 15)
	}

	buf, err := f.WriteToBuffer()
	if err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// ExportSchedulePDF exports schedule to PDF
func (s *ExportService) ExportSchedulePDF(lessons []*models.Lesson, startDate, endDate time.Time) ([]byte, error) {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetTitle("Расписание", false)
	pdf.SetAuthor("Classmate Central", false)

	// Setup Cyrillic font support
	SetupCyrillicFonts(pdf)
	fontName := GetCyrillicFontName(pdf)

	pdf.AddPage()

	// Header
	SetFontSafe(pdf, fontName, "B", 16)
	pdf.Cell(40, 10, "Расписание занятий")
	pdf.Ln(12)

	// Date range
	SetFontSafe(pdf, fontName, "", 10)
	pdf.Cell(40, 6, fmt.Sprintf("Период: %s - %s", startDate.Format("02.01.2006"), endDate.Format("02.01.2006")))
	pdf.Ln(6)
	pdf.Cell(40, 6, fmt.Sprintf("Дата создания: %s", time.Now().Format("02.01.2006 15:04")))
	pdf.Ln(10)

	// Table header
	SetFontSafe(pdf, fontName, "B", 9)
	pdf.SetFillColor(240, 240, 240)
	pdf.CellFormat(30, 7, "Дата", "1", 0, "L", true, 0, "")
	pdf.CellFormat(30, 7, "Время", "1", 0, "L", true, 0, "")
	pdf.CellFormat(50, 7, "Предмет", "1", 0, "L", true, 0, "")
	pdf.CellFormat(40, 7, "Группа", "1", 0, "L", true, 0, "")
	pdf.CellFormat(40, 7, "Статус", "1", 0, "L", true, 0, "")
	pdf.Ln(-1)

	// Table rows
	SetFontSafe(pdf, fontName, "", 8)
	for _, lesson := range lessons {
		dateStr := lesson.Start.Format("02.01.2006")
		timeStr := fmt.Sprintf("%s-%s", lesson.Start.Format("15:04"), lesson.End.Format("15:04"))

		groupName := lesson.GroupName
		if groupName == "" {
			groupName = "Индивидуальное"
		}

		statusStr := "Запланировано"
		if lesson.Status == "completed" {
			statusStr = "Завершено"
		} else if lesson.Status == "cancelled" {
			statusStr = "Отменено"
		}

		pdf.CellFormat(30, 6, dateStr, "1", 0, "L", false, 0, "")
		pdf.CellFormat(30, 6, timeStr, "1", 0, "L", false, 0, "")
		pdf.CellFormat(50, 6, lesson.Subject, "1", 0, "L", false, 0, "")
		pdf.CellFormat(40, 6, groupName, "1", 0, "L", false, 0, "")
		pdf.CellFormat(40, 6, statusStr, "1", 0, "L", false, 0, "")
		pdf.Ln(-1)
	}

	// Total count
	pdf.Ln(5)
	SetFontSafe(pdf, fontName, "B", 10)
	pdf.Cell(40, 6, fmt.Sprintf("Всего занятий: %d", len(lessons)))

	var buf bytes.Buffer
	err := OutputPDFSafe(pdf, &buf)
	if err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// ExportScheduleExcel exports schedule to Excel
func (s *ExportService) ExportScheduleExcel(lessons []*models.Lesson, startDate, endDate time.Time) ([]byte, error) {
	f := excelize.NewFile()
	defer f.Close()

	sheetName := "Расписание"
	f.NewSheet(sheetName)
	f.DeleteSheet("Sheet1")

	// Headers
	headers := []string{"Дата", "Время начала", "Время окончания", "Предмет", "Группа", "Статус"}
	for i, header := range headers {
		cell := fmt.Sprintf("%c1", 'A'+i)
		f.SetCellValue(sheetName, cell, header)
	}

	// Style for headers
	headerStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true},
		Fill: excelize.Fill{Type: "pattern", Color: []string{"#F0F0F0"}, Pattern: 1},
	})
	f.SetCellStyle(sheetName, "A1", fmt.Sprintf("%c1", 'A'+len(headers)-1), headerStyle)

	// Data
	for i, lesson := range lessons {
		row := i + 2

		groupName := lesson.GroupName
		if groupName == "" {
			groupName = "Индивидуальное"
		}

		statusStr := "Запланировано"
		if lesson.Status == "completed" {
			statusStr = "Завершено"
		} else if lesson.Status == "cancelled" {
			statusStr = "Отменено"
		}

		f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), lesson.Start.Format("02.01.2006"))
		f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), lesson.Start.Format("15:04"))
		f.SetCellValue(sheetName, fmt.Sprintf("C%d", row), lesson.End.Format("15:04"))
		f.SetCellValue(sheetName, fmt.Sprintf("D%d", row), lesson.Subject)
		f.SetCellValue(sheetName, fmt.Sprintf("E%d", row), groupName)
		f.SetCellValue(sheetName, fmt.Sprintf("F%d", row), statusStr)
	}

	// Auto-size columns
	for i := 0; i < len(headers); i++ {
		col := string(rune('A' + i))
		f.SetColWidth(sheetName, col, col, 15)
	}

	buf, err := f.WriteToBuffer()
	if err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}
