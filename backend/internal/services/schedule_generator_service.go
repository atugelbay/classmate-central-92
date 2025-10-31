package services

import (
	"fmt"
	"strconv"
	"strings"
	"time"

	"classmate-central/internal/models"
	"classmate-central/internal/repository"
)

type ScheduleGeneratorService struct {
	ruleRepo       *repository.ScheduleRuleRepository
	occurrenceRepo *repository.LessonOccurrenceRepository
}

func NewScheduleGeneratorService(
	ruleRepo *repository.ScheduleRuleRepository,
	occurrenceRepo *repository.LessonOccurrenceRepository,
) *ScheduleGeneratorService {
	return &ScheduleGeneratorService{
		ruleRepo:       ruleRepo,
		occurrenceRepo: occurrenceRepo,
	}
}

// GenerateOccurrences generates lesson occurrences from a schedule rule
// Generates occurrences for the next 90 days by default
func (s *ScheduleGeneratorService) GenerateOccurrences(rule *models.ScheduleRule, companyID string, daysAhead int) error {
	if daysAhead <= 0 {
		daysAhead = 90 // Default to 90 days
	}

	// Parse RRULE to extract schedule information
	schedule, err := s.parseRRule(rule.RRule, rule.DTStart)
	if err != nil {
		return fmt.Errorf("error parsing RRULE: %w", err)
	}

	// Calculate end time
	endTime := rule.DTStart.AddDate(0, 0, daysAhead)
	if rule.DTEnd != nil && rule.DTEnd.Before(endTime) {
		endTime = *rule.DTEnd
	}

	// Generate occurrences
	occurrences := []*models.LessonOccurrence{}
	current := rule.DTStart

	// Find the next occurrence date based on schedule
	// Start from DTStart and iterate through days
	current = time.Date(
		rule.DTStart.Year(),
		rule.DTStart.Month(),
		rule.DTStart.Day(),
		schedule.ByHour,
		schedule.ByMinute,
		0,
		0,
		rule.DTStart.Location(),
	)

	for current.Before(endTime) || current.Equal(endTime) {
		// Check if current date matches the schedule
		if s.matchesSchedule(current, schedule) {
			occurrence := &models.LessonOccurrence{
				RuleID:   rule.ID,
				StartsAt: current,
				EndsAt:   current.Add(time.Duration(rule.DurationMinutes) * time.Minute),
				Status:   "scheduled",
			}
			occurrences = append(occurrences, occurrence)
		}

		// Move to next day
		current = current.AddDate(0, 0, 1)
	}

	// Bulk insert occurrences
	if len(occurrences) > 0 {
		return s.occurrenceRepo.BulkCreate(occurrences, companyID)
	}

	return nil
}

// RegenerateFutureOccurrences deletes future occurrences and regenerates them
func (s *ScheduleGeneratorService) RegenerateFutureOccurrences(ruleID int64, companyID string, fromTime time.Time) error {
	// Delete future occurrences
	err := s.occurrenceRepo.DeleteFutureByRuleID(ruleID, companyID, fromTime)
	if err != nil {
		return fmt.Errorf("error deleting future occurrences: %w", err)
	}

	// Get the rule
	rule, err := s.ruleRepo.GetByID(ruleID, companyID)
	if err != nil {
		return fmt.Errorf("error getting schedule rule: %w", err)
	}
	if rule == nil {
		return fmt.Errorf("schedule rule not found")
	}

	// Generate new occurrences
	daysAhead := 90
	if rule.DTEnd != nil {
		daysUntilEnd := int(time.Until(*rule.DTEnd).Hours() / 24)
		if daysUntilEnd > 0 && daysUntilEnd < daysAhead {
			daysAhead = daysUntilEnd
		}
	}

	// Use fromTime as the new start time for generation
	if fromTime.After(rule.DTStart) {
		rule.DTStart = fromTime
	}

	return s.GenerateOccurrences(rule, companyID, daysAhead)
}

// ScheduleInfo represents parsed schedule information
type ScheduleInfo struct {
	Frequency string   // WEEKLY, DAILY, etc.
	ByDay     []string // MO, TU, WE, etc.
	ByHour    int
	ByMinute  int
}

// parseRRule parses a basic RRULE string (RFC 5545 format)
// Supports: FREQ=WEEKLY;BYDAY=MO,WE;BYHOUR=18;BYMINUTE=30
func (s *ScheduleGeneratorService) parseRRule(rrule string, dtstart time.Time) (*ScheduleInfo, error) {
	info := &ScheduleInfo{
		ByDay:    []string{},
		ByHour:   dtstart.Hour(),
		ByMinute: dtstart.Minute(),
	}

	// Parse components
	parts := strings.Split(rrule, ";")
	for _, part := range parts {
		kv := strings.SplitN(part, "=", 2)
		if len(kv) != 2 {
			continue
		}

		key := strings.ToUpper(strings.TrimSpace(kv[0]))
		value := strings.TrimSpace(kv[1])

		switch key {
		case "FREQ":
			info.Frequency = strings.ToUpper(value)
		case "BYDAY":
			info.ByDay = strings.Split(value, ",")
			// Normalize day names
			for i, day := range info.ByDay {
				info.ByDay[i] = strings.ToUpper(strings.TrimSpace(day))
			}
		case "BYHOUR":
			hour, err := strconv.Atoi(value)
			if err == nil {
				info.ByHour = hour
			}
		case "BYMINUTE":
			minute, err := strconv.Atoi(value)
			if err == nil {
				info.ByMinute = minute
			}
		}
	}

	// Default to WEEKLY if not specified
	if info.Frequency == "" {
		info.Frequency = "WEEKLY"
	}

	return info, nil
}

// matchesSchedule checks if a given time matches the schedule
func (s *ScheduleGeneratorService) matchesSchedule(t time.Time, schedule *ScheduleInfo) bool {
	// Set the time part
	t = time.Date(t.Year(), t.Month(), t.Day(), schedule.ByHour, schedule.ByMinute, 0, 0, t.Location())

	switch schedule.Frequency {
	case "WEEKLY":
		if len(schedule.ByDay) == 0 {
			// No BYDAY specified, match any day
			return true
		}

		// Get weekday abbreviation (MO, TU, WE, etc.)
		weekday := s.getWeekdayAbbreviation(t.Weekday())
		for _, day := range schedule.ByDay {
			if day == weekday {
				return true
			}
		}
		return false

	case "DAILY":
		return true

	default:
		// For other frequencies, default to matching
		return true
	}
}

// getWeekdayAbbreviation converts time.Weekday to RRULE BYDAY format
func (s *ScheduleGeneratorService) getWeekdayAbbreviation(weekday time.Weekday) string {
	days := map[time.Weekday]string{
		time.Monday:    "MO",
		time.Tuesday:   "TU",
		time.Wednesday: "WE",
		time.Thursday:  "TH",
		time.Friday:    "FR",
		time.Saturday:  "SA",
		time.Sunday:    "SU",
	}
	return days[weekday]
}

// GenerateForAllActiveRules generates occurrences for all active schedule rules
func (s *ScheduleGeneratorService) GenerateForAllActiveRules(companyID string, daysAhead int) error {
	rules, err := s.ruleRepo.GetActiveRules(companyID)
	if err != nil {
		return fmt.Errorf("error getting active rules: %w", err)
	}

	for _, rule := range rules {
		// Check if rule already has future occurrences
		futureOccurrences, err := s.occurrenceRepo.GetFutureByRuleID(rule.ID, companyID, time.Now())
		if err != nil {
			continue // Skip on error
		}

		// Only generate if no future occurrences exist or need regeneration
		if len(futureOccurrences) == 0 {
			err = s.GenerateOccurrences(rule, companyID, daysAhead)
			if err != nil {
				// Log error but continue with other rules
				fmt.Printf("Error generating occurrences for rule %d: %v\n", rule.ID, err)
			}
		}
	}

	return nil
}

// CleanupPastOccurrences removes old occurrences that are past their end time
func (s *ScheduleGeneratorService) CleanupPastOccurrences(companyID string, olderThanDays int) error {
	cutoff := time.Now().AddDate(0, 0, -olderThanDays)
	occurrences, err := s.occurrenceRepo.GetInRange(time.Time{}, cutoff, companyID)
	if err != nil {
		return fmt.Errorf("error getting past occurrences: %w", err)
	}

	for _, occurrence := range occurrences {
		if occurrence.Status == "done" || occurrence.Status == "cancelled" {
			// Only delete completed/cancelled old occurrences
			err = s.occurrenceRepo.Delete(occurrence.ID, companyID)
			if err != nil {
				fmt.Printf("Error deleting occurrence %d: %v\n", occurrence.ID, err)
			}
		}
	}

	return nil
}

