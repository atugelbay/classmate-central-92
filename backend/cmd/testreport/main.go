package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"regexp"
	"strings"
	"time"

	"github.com/jung-kurt/gofpdf/v2"
)

// TestEvent represents a single test event from gotestsum JSON output
type TestEvent struct {
	Time    string  `json:"Time"`
	Action  string  `json:"Action"`
	Package string  `json:"Package"`
	Test    string  `json:"Test"`
	Output  string  `json:"Output"`
	Elapsed float64 `json:"Elapsed"`
}

// TestResult holds parsed test information
type TestResult struct {
	Name     string
	Package  string
	Passed   bool
	Duration float64
	Steps    []StepResult
}

// StepResult holds a single step's information
type StepResult struct {
	Name    string
	Passed  bool
	Time    string
	Details []string
}

// Friendly test names mapping
var testNames = map[string]string{
	// Attendance tests
	"TestMarkAttendance_Attended_DeductsLesson":     "Attendance: Lesson Deduction on Attend",
	"TestMarkAttendance_FutureLessonBlocked":        "Attendance: Future Lesson Blocked",
	"TestMarkAttendance_TodayLessonAllowed":         "Attendance: Today's Lesson Allowed",
	"TestMarkAttendance_DoubleDeductionPrevented":   "Attendance: Double Deduction Prevention",
	"TestMarkAttendance_SubscriptionExpires":        "Attendance: Subscription Expiration",
	"TestMarkAttendance_NoSubscription":             "Attendance: Works Without Subscription",

	// Payment tests
	"TestPayment_IncreasesBalance":                  "Payment: Increases Balance",
	"TestRefund_IncreasesBalance":                   "Refund: Increases Balance",
	"TestDebt_DecreasesBalance":                     "Debt: Decreases Balance",
	"TestPayment_AllMethods":                        "Payment: All Methods Work",
	"TestUpdateTransaction_RecalculatesBalance":     "Payment: Update Recalculates Balance",
	"TestCreateTransaction_CreatesBalanceIfMissing": "Payment: Auto-Creates Balance",
	"TestMultipleTransactionTypes":                  "Payment: Multiple Transaction Types",
	"TestPaymentHandler_CreateTransaction":          "Payment: Create Transaction API",
	"TestPaymentHandler_GetAllTransactions":         "Payment: Get Transactions API",
	"TestPayment_ZeroAmount":                        "Payment: Zero Amount Transaction",
	"TestPayment_VeryLargeAmount":                   "Payment: Very Large Amount",
	"TestPayment_NegativeAmountTransaction":         "Payment: Negative Amount (Edge Case)",

	// Balance tests
	"TestBalance_AllowsNegative":              "Balance: Allows Negative",
	"TestBalance_TransactionHistory":          "Balance: Transaction History",
	"TestBalance_OptimisticLocking":           "Balance: Optimistic Locking",
	"TestBalance_InitialZero":                 "Balance: Initial Zero",
	"TestBalance_MultipleDebtsGoDeepNegative": "Balance: Multiple Debts Accumulate",
	"TestBalance_ExtremeNegative":             "Balance: Extreme Negative Value",
	"TestBalance_FloatingPointPrecision":      "Balance: Floating Point Precision",
	"TestBalance_ConcurrentUpdates":           "Balance: Concurrent Updates",

	// Subscription tests
	"TestCreateSubscription_WithPercentageDiscount":   "Subscription: Percentage Discount",
	"TestCreateSubscription_WithFixedDiscount":        "Subscription: Fixed Discount",
	"TestCreateSubscription_WithComboDiscount":        "Subscription: Combo Discount",
	"TestCreateSubscription_CalculatesPricePerLesson": "Subscription: Price Per Lesson",
	"TestCreateSubscription_NoDiscount":               "Subscription: No Discount",
	"TestCalculatePriceWithDiscounts_Unit":            "Subscription: Discount Calculation Unit Test",
	"TestSubscription_ExactlyZeroLessonsRemaining":    "Subscription: Zero Lessons Remaining",
	"TestSubscription_ExpiredButLessonsRemaining":     "Subscription: Expired With Lessons",
	"TestSubscription_FreezeWhenAlreadyFrozen":        "Subscription: Double Freeze Prevention",
	"TestSubscription_ConcurrentLessonDeduction":      "Subscription: Concurrent Deductions",
	"TestSubscription_StartsAtMidnight":               "Subscription: Starts At Midnight",
	"TestSubscription_ZeroValidityDays":               "Subscription: Zero Validity Days",

	// Freeze tests
	"TestFreezeSubscription_Basic":                 "Freeze: Basic Freeze",
	"TestFreezeSubscription_ExtendsEndDate":        "Freeze: Extends End Date",
	"TestFreezeSubscription_ShiftsLessons":         "Freeze: Creates Record & Extends Date",
	"TestFreezeSubscription_FreezeDaysIncrement":   "Freeze: Days Increment",
	"TestUnfreezeSubscription":                     "Freeze: Unfreeze Works",
	"TestUnfreezeSubscription_DecreasesFreezeDays": "Freeze: Days Decrease on Unfreeze",
	"TestFreezeSubscription_MultipleFreeze":        "Freeze: Multiple Freezes",

	// Auth tests
	"TestAuthHandler_Register":                 "Auth: User Registration",
	"TestAuthHandler_Register_DuplicateEmail":  "Auth: Duplicate Email Rejected",
	"TestAuthHandler_Login":                    "Auth: User Login",
	"TestAuthHandler_Login_InvalidCredentials": "Auth: Invalid Credentials Rejected",

	// Email/Export tests
	"TestEmailService_SendVerificationCode":    "Email: Verification Code",
	"TestEmailService_SendPaymentNotification": "Email: Payment Notification",
	"TestEmailService_SendAbsenceNotification": "Email: Absence Notification",
	"TestEmailService_TranslatePaymentMethod":  "Email: Payment Method Translation",
	"TestEmailService_TranslateAbsenceReason":  "Email: Absence Reason Translation",
	"TestEmailService_FormatDescription":       "Email: Description Formatting",
	"TestExportService_ExportStudentsPDF":      "Export: Students PDF",
	"TestExportService_ExportStudentsExcel":    "Export: Students Excel",
	"TestExportService_ExportTransactionsPDF":  "Export: Transactions PDF",
	"TestExportService_ExportTransactionsExcel": "Export: Transactions Excel",

	// Schedule tests
	"TestParseRRule_WeeklyWithDays":           "Schedule: Parse Weekly RRULE",
	"TestParseRRule_DailyFrequency":           "Schedule: Parse Daily RRULE",
	"TestParseRRule_DefaultsToWeekly":         "Schedule: Defaults to Weekly",
	"TestParseRRule_UsesStartTimeIfNoHour":    "Schedule: Uses Start Time",
	"TestMatchesSchedule_Weekly_CorrectDay":   "Schedule: Weekly Day Matching",
	"TestMatchesSchedule_Daily_AllDays":       "Schedule: Daily All Days Match",
	"TestMatchesSchedule_Weekly_NoDaysSpecified": "Schedule: Weekly No Days",
	"TestGetWeekdayAbbreviation":              "Schedule: Weekday Abbreviations",
	"TestGenerateOccurrences_CountsCorrectly": "Schedule: Occurrence Count",
	"TestGenerateOccurrences_30Days_MWF":      "Schedule: 30 Days MWF",
	"TestParseRRule_EmptyString":              "Schedule: Empty RRULE String",
	"TestParseRRule_InvalidFormat":            "Schedule: Invalid RRULE Format",
	"TestParseRRule_CaseInsensitive":          "Schedule: Case Insensitive",
	"TestMatchesSchedule_AllWeekdays":         "Schedule: All Weekdays Match",

	// Group tests
	"TestGroupHandler_CreateGroup":              "Group: Create Group",
	"TestGroupHandler_GetAllGroups":             "Group: Get All Groups",
	"TestGroupHandler_GetGroupByID":             "Group: Get Group By ID",
	"TestGroupHandler_UpdateGroup":              "Group: Update Group",
	"TestGroupHandler_DeleteGroup":              "Group: Delete Group",
	"TestGroupHandler_CreateGroup_WithStudents": "Group: Create With Students",
	"TestGroupHandler_UpdateGroup_AddStudent":   "Group: Add Student",
	"TestGroupHandler_UpdateGroup_RemoveStudent": "Group: Remove Student",
	"TestGroupHandler_GetByID_NotFound":         "Group: Not Found Error",
	"TestGroupHandler_Create_InvalidJSON":       "Group: Invalid JSON Error",
	"TestGroupHandler_Create_MissingRequiredFields": "Group: Missing Fields",
	"TestGroupHandler_UpdateGroup_ChangeTeacher": "Group: Change Teacher",
	"TestGroupHandler_UpdateGroup_Deactivate":   "Group: Deactivate Group",

	// Security/Multi-tenancy tests
	"TestMultiTenancy_CompanyA_CannotSeeCompanyB_Students":    "Security: Company Isolation (Students)",
	"TestMultiTenancy_CompanyA_CannotAccessCompanyB_StudentByID": "Security: Direct Access Blocked",
	"TestMultiTenancy_CompanyA_CannotSeeCompanyB_Groups":      "Security: Company Isolation (Groups)",
	"TestMultiTenancy_CompanyA_CannotAccessCompanyB_GroupByID": "Security: Group Access Blocked",
	"TestBranchIsolation_BranchA_CannotSeeBranchB_Students":   "Security: Branch Isolation",
	"TestMultiTenancy_CannotModifyOtherCompanyStudent":        "Security: Cross-Company Modify Blocked",
	"TestMultiTenancy_CannotDeleteOtherCompanyStudent":        "Security: Cross-Company Delete Blocked",
	"TestMultiTenancy_CannotSeeOtherCompanyBalances":          "Security: Balance Isolation",
	"TestMultiTenancy_CannotSeeOtherCompanySubscriptions":     "Security: Subscription Isolation",
	"TestSecurity_EmptyCompanyID_ReturnsNoData":               "Security: Empty Company ID",

	// Edge case tests
	"TestLesson_ExactlyOnEndDate":               "Edge: Lesson On End Date",
	"TestStudent_LongName":                      "Edge: Very Long Name",
	"TestStudent_SpecialCharactersInName":       "Edge: Special Characters",
	"TestStudent_EmptyEmail":                    "Edge: NULL Email",
	"TestDiscount_100Percent":                   "Edge: 100% Discount",
	"TestDiscount_FixedExceedsPrice":            "Edge: Discount Exceeds Price",
	"TestLesson_ZeroDuration":                   "Edge: Zero Duration Lesson",
	"TestDelete_StudentWithActiveSubscription": "Edge: Delete With Subscription",
}

func main() {
	if len(os.Args) < 2 {
		fmt.Println("Usage: testreport <test-results.json> [output.pdf]")
		os.Exit(1)
	}

	inputFile := os.Args[1]
	outputFile := "reports/test-report.pdf"
	if len(os.Args) >= 3 {
		outputFile = os.Args[2]
	}

	// Parse test results
	results, err := parseTestResults(inputFile)
	if err != nil {
		fmt.Printf("Error parsing test results: %v\n", err)
		os.Exit(1)
	}

	// Generate PDF
	err = generatePDF(results, outputFile)
	if err != nil {
		fmt.Printf("Error generating PDF: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("Report generated: %s\n", outputFile)
}

func parseTestResults(filename string) ([]TestResult, error) {
	file, err := os.Open(filename)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	// Map to collect test outputs
	testOutputs := make(map[string][]string)
	testPassed := make(map[string]bool)
	testDuration := make(map[string]float64)
	testPackage := make(map[string]string)

	scanner := bufio.NewScanner(file)
	// Increase buffer size for long lines
	buf := make([]byte, 0, 64*1024)
	scanner.Buffer(buf, 1024*1024)

	for scanner.Scan() {
		line := scanner.Text()
		if line == "" {
			continue
		}

		var event TestEvent
		if err := json.Unmarshal([]byte(line), &event); err != nil {
			continue
		}

		if event.Test == "" {
			continue
		}

		key := event.Package + "/" + event.Test

		switch event.Action {
		case "output":
			testOutputs[key] = append(testOutputs[key], event.Output)
			testPackage[key] = event.Package
		case "pass":
			testPassed[key] = true
			testDuration[key] = event.Elapsed
			testPackage[key] = event.Package
		case "fail":
			testPassed[key] = false
			testDuration[key] = event.Elapsed
			testPackage[key] = event.Package
		}
	}

	// Parse outputs into structured results
	var results []TestResult
	for key, outputs := range testOutputs {
		parts := strings.SplitN(key, "/", 2)
		if len(parts) != 2 {
			continue
		}
		pkg := parts[0]
		testName := parts[1]

		result := TestResult{
			Name:     testName,
			Package:  pkg,
			Passed:   testPassed[key],
			Duration: testDuration[key],
			Steps:    parseSteps(outputs),
		}
		results = append(results, result)
	}

	return results, nil
}

func parseSteps(outputs []string) []StepResult {
	var steps []StepResult
	var currentStep *StepResult

	stepRegex := regexp.MustCompile(`\[STEP\]\s*(.+)`)
	okRegex := regexp.MustCompile(`\[OK\]\s*\((.+)\)`)
	failRegex := regexp.MustCompile(`\[FAIL\]\s*(.+)`)
	checkOkRegex := regexp.MustCompile(`\[CHECK OK\]\s*(.+)`)
	checkFailRegex := regexp.MustCompile(`\[CHECK FAIL\]\s*(.+)`)
	infoRegex := regexp.MustCompile(`\[INFO\]\s*(.+)`)

	for _, output := range outputs {
		output = strings.TrimSpace(output)

		if matches := stepRegex.FindStringSubmatch(output); len(matches) > 1 {
			// Save previous step
			if currentStep != nil {
				steps = append(steps, *currentStep)
			}
			currentStep = &StepResult{
				Name:   matches[1],
				Passed: true, // Assume passed until we see failure
			}
			continue
		}

		if currentStep == nil {
			continue
		}

		if matches := okRegex.FindStringSubmatch(output); len(matches) > 1 {
			currentStep.Time = matches[1]
		} else if matches := failRegex.FindStringSubmatch(output); len(matches) > 1 {
			currentStep.Passed = false
			currentStep.Details = append(currentStep.Details, "FAILED: "+matches[1])
		} else if matches := checkOkRegex.FindStringSubmatch(output); len(matches) > 1 {
			currentStep.Details = append(currentStep.Details, "OK: "+matches[1])
		} else if matches := checkFailRegex.FindStringSubmatch(output); len(matches) > 1 {
			currentStep.Passed = false
			currentStep.Details = append(currentStep.Details, "FAILED: "+matches[1])
		} else if matches := infoRegex.FindStringSubmatch(output); len(matches) > 1 {
			currentStep.Details = append(currentStep.Details, "INFO: "+matches[1])
		}
	}

	// Don't forget the last step
	if currentStep != nil {
		steps = append(steps, *currentStep)
	}

	return steps
}

func generatePDF(results []TestResult, filename string) error {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(15, 15, 15)

	// Title page
	pdf.AddPage()
	pdf.SetFont("Arial", "B", 24)
	pdf.CellFormat(0, 20, "Test Execution Report", "", 1, "C", false, 0, "")

	pdf.SetFont("Arial", "", 12)
	pdf.CellFormat(0, 10, fmt.Sprintf("Generated: %s", time.Now().Format("2006-01-02 15:04:05")), "", 1, "C", false, 0, "")
	pdf.Ln(10)

	// Summary
	passed := 0
	failed := 0
	for _, r := range results {
		if r.Passed {
			passed++
		} else {
			failed++
		}
	}

	pdf.SetFont("Arial", "B", 16)
	pdf.CellFormat(0, 10, "Summary", "", 1, "L", false, 0, "")
	pdf.SetFont("Arial", "", 12)
	pdf.CellFormat(0, 8, fmt.Sprintf("Total Tests: %d", len(results)), "", 1, "L", false, 0, "")

	pdf.SetTextColor(0, 128, 0)
	pdf.CellFormat(0, 8, fmt.Sprintf("Passed: %d", passed), "", 1, "L", false, 0, "")

	if failed > 0 {
		pdf.SetTextColor(255, 0, 0)
	}
	pdf.CellFormat(0, 8, fmt.Sprintf("Failed: %d", failed), "", 1, "L", false, 0, "")
	pdf.SetTextColor(0, 0, 0)

	if len(results) > 0 {
		successRate := float64(passed) / float64(len(results)) * 100
		pdf.CellFormat(0, 8, fmt.Sprintf("Success Rate: %.1f%%", successRate), "", 1, "L", false, 0, "")
	}

	pdf.Ln(10)

	// Group tests by category
	categories := map[string][]TestResult{
		"Attendance":   {},
		"Payment":      {},
		"Balance":      {},
		"Subscription": {},
		"Freeze":       {},
		"Auth":         {},
		"Email/Export": {},
		"Schedule":     {},
		"Group":        {},
		"Security":     {},
		"Edge Cases":   {},
		"Other":        {},
	}

	for _, r := range results {
		friendlyName := getFriendlyName(r.Name)
		if strings.HasPrefix(friendlyName, "Attendance:") {
			categories["Attendance"] = append(categories["Attendance"], r)
		} else if strings.HasPrefix(friendlyName, "Payment:") || strings.HasPrefix(friendlyName, "Refund:") || strings.HasPrefix(friendlyName, "Debt:") {
			categories["Payment"] = append(categories["Payment"], r)
		} else if strings.HasPrefix(friendlyName, "Balance:") {
			categories["Balance"] = append(categories["Balance"], r)
		} else if strings.HasPrefix(friendlyName, "Subscription:") {
			categories["Subscription"] = append(categories["Subscription"], r)
		} else if strings.HasPrefix(friendlyName, "Freeze:") {
			categories["Freeze"] = append(categories["Freeze"], r)
		} else if strings.HasPrefix(friendlyName, "Auth:") {
			categories["Auth"] = append(categories["Auth"], r)
		} else if strings.HasPrefix(friendlyName, "Email:") || strings.HasPrefix(friendlyName, "Export:") {
			categories["Email/Export"] = append(categories["Email/Export"], r)
		} else if strings.HasPrefix(friendlyName, "Schedule:") {
			categories["Schedule"] = append(categories["Schedule"], r)
		} else if strings.HasPrefix(friendlyName, "Group:") {
			categories["Group"] = append(categories["Group"], r)
		} else if strings.HasPrefix(friendlyName, "Security:") {
			categories["Security"] = append(categories["Security"], r)
		} else if strings.HasPrefix(friendlyName, "Edge:") {
			categories["Edge Cases"] = append(categories["Edge Cases"], r)
		} else {
			categories["Other"] = append(categories["Other"], r)
		}
	}

	// Table of Contents
	pdf.SetFont("Arial", "B", 16)
	pdf.CellFormat(0, 10, "Test Categories", "", 1, "L", false, 0, "")
	pdf.SetFont("Arial", "", 11)

	categoryOrder := []string{"Auth", "Attendance", "Payment", "Balance", "Subscription", "Freeze", "Schedule", "Group", "Security", "Edge Cases", "Email/Export", "Other"}
	for _, cat := range categoryOrder {
		tests := categories[cat]
		if len(tests) == 0 {
			continue
		}
		catPassed := 0
		for _, t := range tests {
			if t.Passed {
				catPassed++
			}
		}
		status := "PASS"
		if catPassed < len(tests) {
			status = "PARTIAL"
		}
		if catPassed == 0 {
			status = "FAIL"
		}

		pdf.CellFormat(100, 7, fmt.Sprintf("  %s (%d tests)", cat, len(tests)), "", 0, "L", false, 0, "")
		if status == "PASS" {
			pdf.SetTextColor(0, 128, 0)
		} else if status == "FAIL" {
			pdf.SetTextColor(255, 0, 0)
		} else {
			pdf.SetTextColor(255, 165, 0)
		}
		pdf.CellFormat(0, 7, status, "", 1, "L", false, 0, "")
		pdf.SetTextColor(0, 0, 0)
	}

	// Detailed results by category
	for _, cat := range categoryOrder {
		tests := categories[cat]
		if len(tests) == 0 {
			continue
		}

		pdf.AddPage()
		pdf.SetFont("Arial", "B", 18)
		pdf.CellFormat(0, 12, cat+" Tests", "", 1, "L", false, 0, "")
		pdf.Ln(5)

		for _, r := range tests {
			// Check if we need a new page
			if pdf.GetY() > 250 {
				pdf.AddPage()
			}

			friendlyName := getFriendlyName(r.Name)

			// Test header
			pdf.SetFont("Arial", "B", 12)
			if r.Passed {
				pdf.SetTextColor(0, 128, 0)
				pdf.CellFormat(8, 7, "[OK]", "", 0, "L", false, 0, "")
			} else {
				pdf.SetTextColor(255, 0, 0)
				pdf.CellFormat(8, 7, "[X]", "", 0, "L", false, 0, "")
			}
			pdf.SetTextColor(0, 0, 0)
			pdf.CellFormat(0, 7, friendlyName, "", 1, "L", false, 0, "")

			// Duration
			if r.Duration > 0 {
				pdf.SetFont("Arial", "I", 9)
				pdf.SetTextColor(128, 128, 128)
				pdf.CellFormat(0, 5, fmt.Sprintf("   Duration: %.2fs", r.Duration), "", 1, "L", false, 0, "")
				pdf.SetTextColor(0, 0, 0)
			}

			// Steps
			if len(r.Steps) > 0 {
				pdf.SetFont("Arial", "", 10)
				for _, step := range r.Steps {
					if pdf.GetY() > 270 {
						pdf.AddPage()
					}

					if step.Passed {
						pdf.SetTextColor(0, 128, 0)
						pdf.CellFormat(8, 5, "  +", "", 0, "L", false, 0, "")
					} else {
						pdf.SetTextColor(255, 0, 0)
						pdf.CellFormat(8, 5, "  -", "", 0, "L", false, 0, "")
					}
					pdf.SetTextColor(0, 0, 0)

					stepText := step.Name
					if step.Time != "" {
						stepText += " (" + step.Time + ")"
					}
					pdf.CellFormat(0, 5, stepText, "", 1, "L", false, 0, "")

					// Step details (checks, info, failures)
					pdf.SetFont("Arial", "", 9)
					pdf.SetTextColor(80, 80, 80)
					for _, detail := range step.Details {
						if pdf.GetY() > 275 {
							pdf.AddPage()
						}
						if strings.HasPrefix(detail, "FAILED:") {
							pdf.SetTextColor(255, 0, 0)
						} else if strings.HasPrefix(detail, "OK:") {
							pdf.SetTextColor(0, 128, 0)
						} else {
							pdf.SetTextColor(80, 80, 80)
						}
						pdf.CellFormat(0, 4, "      "+detail, "", 1, "L", false, 0, "")
					}
					pdf.SetTextColor(0, 0, 0)
					pdf.SetFont("Arial", "", 10)
				}
			}

			pdf.Ln(3)
		}
	}

	return pdf.OutputFileAndClose(filename)
}

func getFriendlyName(testName string) string {
	if friendly, ok := testNames[testName]; ok {
		return friendly
	}
	// Convert CamelCase to readable format
	return testName
}
