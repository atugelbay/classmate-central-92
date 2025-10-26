package handlers

import (
	"classmate-central/internal/repository"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

type DashboardHandler struct {
	lessonRepo       *repository.LessonRepository
	paymentRepo      *repository.PaymentRepository
	subscriptionRepo *repository.SubscriptionRepository
	studentRepo      *repository.StudentRepository
	leadRepo         *repository.LeadRepository
	debtRepo         *repository.DebtRepository
}

func NewDashboardHandler(
	lessonRepo *repository.LessonRepository,
	paymentRepo *repository.PaymentRepository,
	subscriptionRepo *repository.SubscriptionRepository,
	studentRepo *repository.StudentRepository,
	leadRepo *repository.LeadRepository,
	debtRepo *repository.DebtRepository,
) *DashboardHandler {
	return &DashboardHandler{
		lessonRepo:       lessonRepo,
		paymentRepo:      paymentRepo,
		subscriptionRepo: subscriptionRepo,
		studentRepo:      studentRepo,
		leadRepo:         leadRepo,
		debtRepo:         debtRepo,
	}
}

type RevenuePoint struct {
	Date   string  `json:"date"`
	Amount float64 `json:"amount"`
}

type AttendancePoint struct {
	Date     string `json:"date"`
	Attended int    `json:"attended"`
	Missed   int    `json:"missed"`
}

type DashboardStats struct {
	Revenue struct {
		Today     float64        `json:"today"`
		ThisWeek  float64        `json:"thisWeek"`
		ThisMonth float64        `json:"thisMonth"`
		Data      []RevenuePoint `json:"data"`
	} `json:"revenue"`
	Attendance struct {
		Rate         float64           `json:"rate"`
		TodayPresent int               `json:"todayPresent"`
		TodayAbsent  int               `json:"todayAbsent"`
		WeeklyData   []AttendancePoint `json:"weeklyData"`
	} `json:"attendance"`
	Students struct {
		Active int `json:"active"`
		New    int `json:"new"`
		Frozen int `json:"frozen"`
	} `json:"students"`
	Lessons struct {
		Today     int `json:"today"`
		ThisWeek  int `json:"thisWeek"`
		Completed int `json:"completed"`
		Scheduled int `json:"scheduled"`
		Cancelled int `json:"cancelled"`
	} `json:"lessons"`
	Financial struct {
		TotalBalance    float64 `json:"totalBalance"`
		PendingDebts    int     `json:"pendingDebts"`
		TotalDebtAmount float64 `json:"totalDebtAmount"`
	} `json:"financial"`
	Leads struct {
		New        int     `json:"new"`
		InProgress int     `json:"inProgress"`
		Conversion float64 `json:"conversion"`
	} `json:"leads"`
}

// GetStats returns comprehensive dashboard statistics
func (h *DashboardHandler) GetStats(c *gin.Context) {
	companyID := c.GetString("company_id")

	stats := DashboardStats{}

	// Calculate date ranges
	now := time.Now()
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	todayEnd := todayStart.Add(24 * time.Hour)
	weekStart := todayStart.AddDate(0, 0, -int(now.Weekday())+1) // Monday
	monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())

	// Revenue statistics
	allTransactions, _ := h.paymentRepo.GetAllTransactions(companyID)
	for _, tx := range allTransactions {
		if tx.Type == "payment" {
			if tx.CreatedAt.After(todayStart) && tx.CreatedAt.Before(todayEnd) {
				stats.Revenue.Today += tx.Amount
			}
			if tx.CreatedAt.After(weekStart) {
				stats.Revenue.ThisWeek += tx.Amount
			}
			if tx.CreatedAt.After(monthStart) {
				stats.Revenue.ThisMonth += tx.Amount
			}
		}
	}

	// Revenue chart data (last 7 days)
	for i := 6; i >= 0; i-- {
		date := todayStart.AddDate(0, 0, -i)
		dateEnd := date.Add(24 * time.Hour)
		dateStr := date.Format("02 Jan")

		var dayAmount float64
		for _, tx := range allTransactions {
			if tx.Type == "payment" {
				if tx.CreatedAt.After(date) && tx.CreatedAt.Before(dateEnd) {
					dayAmount += tx.Amount
				}
			}
		}

		stats.Revenue.Data = append(stats.Revenue.Data, RevenuePoint{
			Date:   dateStr,
			Amount: dayAmount,
		})
	}

	// Attendance statistics
	allAttendance, _ := h.subscriptionRepo.GetAllAttendance(companyID)
	totalAttendance := len(allAttendance)
	attendedCount := 0
	todayPresent := 0
	todayAbsent := 0

	for _, att := range allAttendance {
		if att.Status == "attended" {
			attendedCount++
		}

		if att.MarkedAt.After(todayStart) && att.MarkedAt.Before(todayEnd) {
			if att.Status == "attended" {
				todayPresent++
			} else if att.Status == "missed" {
				todayAbsent++
			}
		}
	}

	if totalAttendance > 0 {
		stats.Attendance.Rate = float64(attendedCount) / float64(totalAttendance) * 100
	}
	stats.Attendance.TodayPresent = todayPresent
	stats.Attendance.TodayAbsent = todayAbsent

	// Weekly attendance data
	for i := 6; i >= 0; i-- {
		date := todayStart.AddDate(0, 0, -i)
		dateEnd := date.Add(24 * time.Hour)
		dateStr := date.Format("02 Jan")

		var dayAttended, dayMissed int
		for _, att := range allAttendance {
			if att.MarkedAt.After(date) && att.MarkedAt.Before(dateEnd) {
				if att.Status == "attended" {
					dayAttended++
				} else if att.Status == "missed" {
					dayMissed++
				}
			}
		}

		stats.Attendance.WeeklyData = append(stats.Attendance.WeeklyData, AttendancePoint{
			Date:     dateStr,
			Attended: dayAttended,
			Missed:   dayMissed,
		})
	}

	// Student statistics
	allStudents, _ := h.studentRepo.GetAll(companyID)
	for _, student := range allStudents {
		switch student.Status {
		case "active":
			stats.Students.Active++
		case "frozen":
			stats.Students.Frozen++
		}

		// Count students created in last 30 days as new
		if student.CreatedAt != "" {
			createdAt, err := time.Parse(time.RFC3339, student.CreatedAt)
			if err == nil && time.Since(createdAt).Hours() < 30*24 {
				stats.Students.New++
			}
		}
	}

	// Lesson statistics
	allLessons, _ := h.lessonRepo.GetAll(companyID)
	for _, lesson := range allLessons {
		if lesson.Start.After(todayStart) && lesson.Start.Before(todayEnd) {
			stats.Lessons.Today++
		}
		if lesson.Start.After(weekStart) {
			stats.Lessons.ThisWeek++
		}

		switch lesson.Status {
		case "completed":
			stats.Lessons.Completed++
		case "scheduled":
			if lesson.Start.After(now) {
				stats.Lessons.Scheduled++
			}
		case "cancelled":
			stats.Lessons.Cancelled++
		}
	}

	// Financial statistics
	allBalances, _ := h.paymentRepo.GetAllBalances(companyID)
	for _, balance := range allBalances {
		stats.Financial.TotalBalance += balance.Balance
	}

	allDebts, _ := h.debtRepo.GetAll(companyID)
	for _, debt := range allDebts {
		if debt.Status == "pending" {
			stats.Financial.PendingDebts++
			stats.Financial.TotalDebtAmount += debt.Amount
		}
	}

	// Lead statistics
	allLeads, _ := h.leadRepo.GetAll(companyID)
	for _, lead := range allLeads {
		switch lead.Status {
		case "new":
			stats.Leads.New++
		case "in_progress":
			stats.Leads.InProgress++
		}

		// Count leads created in last 30 days for conversion
		if time.Since(lead.CreatedAt).Hours() < 30*24 {
			if lead.Status == "enrolled" {
				// Conversion calculation can be refined
			}
		}
	}

	totalLeads := len(allLeads)
	if totalLeads > 0 {
		enrolledLeads := 0
		for _, lead := range allLeads {
			if lead.Status == "enrolled" {
				enrolledLeads++
			}
		}
		stats.Leads.Conversion = float64(enrolledLeads) / float64(totalLeads) * 100
	}

	c.JSON(http.StatusOK, stats)
}

// GetTodayLessons returns lessons for today only
func (h *DashboardHandler) GetTodayLessons(c *gin.Context) {
	companyID := c.GetString("company_id")

	allLessons, err := h.lessonRepo.GetAll(companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Filter for today's lessons
	now := time.Now()
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	todayEnd := todayStart.Add(24 * time.Hour)

	var todayLessons []interface{}
	for _, lesson := range allLessons {
		if lesson.Start.After(todayStart) && lesson.Start.Before(todayEnd) {
			todayLessons = append(todayLessons, lesson)
		}
	}

	c.JSON(http.StatusOK, todayLessons)
}

// GetRevenueChart returns revenue data for charting
func (h *DashboardHandler) GetRevenueChart(c *gin.Context) {
	companyID := c.GetString("company_id")
	period := c.DefaultQuery("period", "week") // week, month, year

	allTransactions, err := h.paymentRepo.GetAllTransactions(companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	now := time.Now()
	var data []RevenuePoint

	switch period {
	case "week":
		// Last 7 days
		todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
		for i := 6; i >= 0; i-- {
			date := todayStart.AddDate(0, 0, -i)
			dateEnd := date.Add(24 * time.Hour)
			dateStr := date.Format("02 Jan")

			var dayAmount float64
			for _, tx := range allTransactions {
				if tx.Type == "payment" {
					if tx.CreatedAt.After(date) && tx.CreatedAt.Before(dateEnd) {
						dayAmount += tx.Amount
					}
				}
			}

			data = append(data, RevenuePoint{
				Date:   dateStr,
				Amount: dayAmount,
			})
		}

	case "month":
		// Last 30 days
		todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
		for i := 29; i >= 0; i-- {
			date := todayStart.AddDate(0, 0, -i)
			dateEnd := date.Add(24 * time.Hour)
			dateStr := date.Format("02 Jan")

			var dayAmount float64
			for _, tx := range allTransactions {
				if tx.Type == "payment" {
					if tx.CreatedAt.After(date) && tx.CreatedAt.Before(dateEnd) {
						dayAmount += tx.Amount
					}
				}
			}

			data = append(data, RevenuePoint{
				Date:   dateStr,
				Amount: dayAmount,
			})
		}

	case "year":
		// Last 12 months
		for i := 11; i >= 0; i-- {
			monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location()).AddDate(0, -i, 0)
			monthEnd := monthStart.AddDate(0, 1, 0)
			dateStr := monthStart.Format("Jan 2006")

			var monthAmount float64
			for _, tx := range allTransactions {
				if tx.Type == "payment" {
					if tx.CreatedAt.After(monthStart) && tx.CreatedAt.Before(monthEnd) {
						monthAmount += tx.Amount
					}
				}
			}

			data = append(data, RevenuePoint{
				Date:   dateStr,
				Amount: monthAmount,
			})
		}
	}

	c.JSON(http.StatusOK, data)
}

// GetAttendanceStats returns attendance statistics
func (h *DashboardHandler) GetAttendanceStats(c *gin.Context) {
	companyID := c.GetString("company_id")
	period := c.DefaultQuery("period", "week") // week, month

	allAttendance, err := h.subscriptionRepo.GetAllAttendance(companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	now := time.Now()
	var data []AttendancePoint

	switch period {
	case "week":
		// Last 7 days
		todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
		for i := 6; i >= 0; i-- {
			date := todayStart.AddDate(0, 0, -i)
			dateEnd := date.Add(24 * time.Hour)
			dateStr := date.Format("02 Jan")

			var dayAttended, dayMissed int
			for _, att := range allAttendance {
				if att.MarkedAt.After(date) && att.MarkedAt.Before(dateEnd) {
					if att.Status == "attended" {
						dayAttended++
					} else if att.Status == "missed" {
						dayMissed++
					}
				}
			}

			data = append(data, AttendancePoint{
				Date:     dateStr,
				Attended: dayAttended,
				Missed:   dayMissed,
			})
		}

	case "month":
		// Last 30 days
		todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
		for i := 29; i >= 0; i-- {
			date := todayStart.AddDate(0, 0, -i)
			dateEnd := date.Add(24 * time.Hour)
			dateStr := date.Format("02 Jan")

			var dayAttended, dayMissed int
			for _, att := range allAttendance {
				if att.MarkedAt.After(date) && att.MarkedAt.Before(dateEnd) {
					if att.Status == "attended" {
						dayAttended++
					} else if att.Status == "missed" {
						dayMissed++
					}
				}
			}

			data = append(data, AttendancePoint{
				Date:     dateStr,
				Attended: dayAttended,
				Missed:   dayMissed,
			})
		}
	}

	c.JSON(http.StatusOK, data)
}
