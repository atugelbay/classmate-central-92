package services

import (
	"testing"
	"time"

	"classmate-central/internal/testutil"

	"github.com/stretchr/testify/assert"
)

// =============================================================================
// Schedule RRULE Parsing Tests
// =============================================================================

func TestParseRRule_WeeklyWithDays(t *testing.T) {
	r := testutil.NewWorkflowReporter(t)

	svc := &ScheduleGeneratorService{}

	r.Step("Parse RRULE with FREQ=WEEKLY and BYDAY=MO,WE,FR", func() error {
		rrule := "FREQ=WEEKLY;BYDAY=MO,WE,FR;BYHOUR=18;BYMINUTE=30"
		dtstart := time.Date(2026, 1, 5, 10, 0, 0, 0, time.Local)

		info, err := svc.parseRRule(rrule, dtstart)
		if err != nil {
			return err
		}

		r.Check("frequency is WEEKLY", "WEEKLY", info.Frequency, info.Frequency == "WEEKLY")
		r.Check("has 3 days", 3, len(info.ByDay), len(info.ByDay) == 3)
		r.Check("hour is 18", 18, info.ByHour, info.ByHour == 18)
		r.Check("minute is 30", 30, info.ByMinute, info.ByMinute == 30)
		return nil
	})
}

func TestParseRRule_DailyFrequency(t *testing.T) {
	r := testutil.NewWorkflowReporter(t)

	svc := &ScheduleGeneratorService{}

	r.Step("Parse RRULE with FREQ=DAILY", func() error {
		rrule := "FREQ=DAILY;BYHOUR=9;BYMINUTE=0"
		dtstart := time.Date(2026, 1, 1, 10, 0, 0, 0, time.Local)

		info, err := svc.parseRRule(rrule, dtstart)
		if err != nil {
			return err
		}

		r.Check("frequency is DAILY", "DAILY", info.Frequency, info.Frequency == "DAILY")
		r.Check("hour is 9", 9, info.ByHour, info.ByHour == 9)
		return nil
	})
}

func TestParseRRule_DefaultsToWeekly(t *testing.T) {
	r := testutil.NewWorkflowReporter(t)

	svc := &ScheduleGeneratorService{}

	r.Step("Parse RRULE without FREQ", func() error {
		rrule := "BYDAY=TU,TH;BYHOUR=15;BYMINUTE=45"
		dtstart := time.Date(2026, 1, 1, 10, 0, 0, 0, time.Local)

		info, err := svc.parseRRule(rrule, dtstart)
		if err != nil {
			return err
		}

		r.Check("frequency defaults to WEEKLY", "WEEKLY", info.Frequency, info.Frequency == "WEEKLY")
		return nil
	})
}

func TestParseRRule_UsesStartTimeIfNoHour(t *testing.T) {
	r := testutil.NewWorkflowReporter(t)

	svc := &ScheduleGeneratorService{}

	r.Step("Parse RRULE without BYHOUR/BYMINUTE", func() error {
		rrule := "FREQ=WEEKLY;BYDAY=MO"
		dtstart := time.Date(2026, 1, 5, 14, 30, 0, 0, time.Local)

		info, err := svc.parseRRule(rrule, dtstart)
		if err != nil {
			return err
		}

		r.Check("hour from dtstart", 14, info.ByHour, info.ByHour == 14)
		r.Check("minute from dtstart", 30, info.ByMinute, info.ByMinute == 30)
		return nil
	})
}

// =============================================================================
// Schedule Matching Tests
// =============================================================================

func TestMatchesSchedule_Weekly_CorrectDay(t *testing.T) {
	r := testutil.NewWorkflowReporter(t)

	svc := &ScheduleGeneratorService{}
	schedule := &ScheduleInfo{
		Frequency: "WEEKLY",
		ByDay:     []string{"MO", "WE"},
		ByHour:    10,
		ByMinute:  0,
	}

	r.Step("Test day matching", func() error {
		monday := time.Date(2026, 1, 5, 10, 0, 0, 0, time.Local)
		r.Check("Monday matches", true, svc.matchesSchedule(monday, schedule), svc.matchesSchedule(monday, schedule))

		wednesday := time.Date(2026, 1, 7, 10, 0, 0, 0, time.Local)
		r.Check("Wednesday matches", true, svc.matchesSchedule(wednesday, schedule), svc.matchesSchedule(wednesday, schedule))

		tuesday := time.Date(2026, 1, 6, 10, 0, 0, 0, time.Local)
		r.Check("Tuesday does not match", false, svc.matchesSchedule(tuesday, schedule), !svc.matchesSchedule(tuesday, schedule))
		return nil
	})
}

func TestMatchesSchedule_Daily_AllDays(t *testing.T) {
	r := testutil.NewWorkflowReporter(t)

	svc := &ScheduleGeneratorService{}
	schedule := &ScheduleInfo{
		Frequency: "DAILY",
		ByHour:    10,
		ByMinute:  0,
	}

	r.Step("Test all days match daily schedule", func() error {
		for i := 0; i < 7; i++ {
			day := time.Date(2026, 1, 5+i, 10, 0, 0, 0, time.Local)
			assert.True(t, svc.matchesSchedule(day, schedule), "Day %d should match", i)
		}
		r.Info("All 7 days matched daily schedule")
		return nil
	})
}

func TestMatchesSchedule_Weekly_NoDaysSpecified(t *testing.T) {
	r := testutil.NewWorkflowReporter(t)

	svc := &ScheduleGeneratorService{}
	schedule := &ScheduleInfo{
		Frequency: "WEEKLY",
		ByDay:     []string{},
		ByHour:    10,
		ByMinute:  0,
	}

	r.Step("Test any day matches when ByDay empty", func() error {
		anyDay := time.Date(2026, 1, 5, 10, 0, 0, 0, time.Local)
		matches := svc.matchesSchedule(anyDay, schedule)
		r.Check("any day matches", true, matches, matches)
		return nil
	})
}

// =============================================================================
// Weekday Abbreviation Tests
// =============================================================================

func TestGetWeekdayAbbreviation(t *testing.T) {
	r := testutil.NewWorkflowReporter(t)

	svc := &ScheduleGeneratorService{}

	r.Step("Verify all weekday abbreviations", func() error {
		expected := map[time.Weekday]string{
			time.Monday:    "MO",
			time.Tuesday:   "TU",
			time.Wednesday: "WE",
			time.Thursday:  "TH",
			time.Friday:    "FR",
			time.Saturday:  "SA",
			time.Sunday:    "SU",
		}

		for weekday, abbrev := range expected {
			result := svc.getWeekdayAbbreviation(weekday)
			r.Check(weekday.String(), abbrev, result, result == abbrev)
		}
		return nil
	})
}

// =============================================================================
// Occurrence Generation Logic Tests
// =============================================================================

func TestGenerateOccurrences_CountsCorrectly(t *testing.T) {
	r := testutil.NewWorkflowReporter(t)

	svc := &ScheduleGeneratorService{}
	schedule := &ScheduleInfo{
		Frequency: "WEEKLY",
		ByDay:     []string{"MO", "WE", "FR"},
		ByHour:    10,
		ByMinute:  0,
	}

	r.Step("Count matching days in 7-day period", func() error {
		start := time.Date(2026, 1, 5, 10, 0, 0, 0, time.Local)
		end := start.AddDate(0, 0, 7)

		count := 0
		current := start
		for current.Before(end) {
			if svc.matchesSchedule(current, schedule) {
				count++
			}
			current = current.AddDate(0, 0, 1)
		}

		r.Check("3 occurrences in one week", 3, count, count == 3)
		return nil
	})
}

func TestGenerateOccurrences_30Days_MWF(t *testing.T) {
	r := testutil.NewWorkflowReporter(t)

	svc := &ScheduleGeneratorService{}
	schedule := &ScheduleInfo{
		Frequency: "WEEKLY",
		ByDay:     []string{"MO", "WE", "FR"},
		ByHour:    10,
		ByMinute:  0,
	}

	r.Step("Count matching days in 30-day period", func() error {
		start := time.Date(2026, 1, 1, 10, 0, 0, 0, time.Local)
		end := start.AddDate(0, 0, 30)

		count := 0
		current := start
		for current.Before(end) {
			if svc.matchesSchedule(current, schedule) {
				count++
			}
			current = current.AddDate(0, 0, 1)
		}

		r.Check("around 12-13 occurrences", true, count, count >= 12 && count <= 14)
		r.Info("Actual count: %d", count)
		return nil
	})
}

// =============================================================================
// Edge Cases
// =============================================================================

func TestParseRRule_EmptyString(t *testing.T) {
	r := testutil.NewWorkflowReporter(t)

	svc := &ScheduleGeneratorService{}

	r.Step("Parse empty RRULE string", func() error {
		dtstart := time.Date(2026, 1, 1, 10, 30, 0, 0, time.Local)
		info, err := svc.parseRRule("", dtstart)

		r.Check("no error", nil, err, err == nil)
		r.Check("defaults to WEEKLY", "WEEKLY", info.Frequency, info.Frequency == "WEEKLY")
		r.Check("uses dtstart hour", 10, info.ByHour, info.ByHour == 10)
		return nil
	})
}

func TestParseRRule_InvalidFormat(t *testing.T) {
	r := testutil.NewWorkflowReporter(t)

	svc := &ScheduleGeneratorService{}

	r.Step("Parse malformed RRULE", func() error {
		dtstart := time.Date(2026, 1, 1, 10, 0, 0, 0, time.Local)
		info, err := svc.parseRRule("invalid;garbage;data", dtstart)

		r.Check("no error on invalid format", nil, err, err == nil)
		r.Check("still defaults to WEEKLY", "WEEKLY", info.Frequency, info.Frequency == "WEEKLY")
		return nil
	})
}

func TestParseRRule_CaseInsensitive(t *testing.T) {
	r := testutil.NewWorkflowReporter(t)

	svc := &ScheduleGeneratorService{}

	r.Step("Parse lowercase RRULE", func() error {
		rrule := "freq=weekly;byday=mo,we;byhour=10;byminute=0"
		dtstart := time.Date(2026, 1, 1, 10, 0, 0, 0, time.Local)

		info, err := svc.parseRRule(rrule, dtstart)
		r.Check("parse successful", nil, err, err == nil)
		r.Check("frequency normalized", "WEEKLY", info.Frequency, info.Frequency == "WEEKLY")
		return nil
	})
}

func TestMatchesSchedule_AllWeekdays(t *testing.T) {
	r := testutil.NewWorkflowReporter(t)

	svc := &ScheduleGeneratorService{}
	schedule := &ScheduleInfo{
		Frequency: "WEEKLY",
		ByDay:     []string{"MO", "TU", "WE", "TH", "FR", "SA", "SU"},
		ByHour:    10,
		ByMinute:  0,
	}

	r.Step("All days should match", func() error {
		for i := 0; i < 7; i++ {
			day := time.Date(2026, 1, 5+i, 10, 0, 0, 0, time.Local)
			assert.True(t, svc.matchesSchedule(day, schedule), "Day %d should match", i)
		}
		r.Info("All 7 weekdays matched")
		return nil
	})
}
