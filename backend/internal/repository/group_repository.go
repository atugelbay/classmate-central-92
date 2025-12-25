package repository

import (
	"database/sql"
	"fmt"
	"strings"
	"time"

	"classmate-central/internal/models"
)

type GroupRepository struct {
	db *sql.DB
}

func NewGroupRepository(db *sql.DB) *GroupRepository {
	return &GroupRepository{db: db}
}

func (r *GroupRepository) Create(group *models.Group, companyID string, branchID string) error {
	tx, err := r.db.Begin()
	if err != nil {
		return fmt.Errorf("error starting transaction: %w", err)
	}
	defer tx.Rollback()

	// Insert group
	query := `
		INSERT INTO groups (id, name, subject, teacher_id, room_id, schedule, description, status, color, company_id, branch_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`

	// Set defaults if not provided
	if group.Status == "" {
		group.Status = "active"
	}
	if group.Color == "" {
		group.Color = "#3b82f6"
	}

	_, err = tx.Exec(query, group.ID, group.Name, group.Subject, group.TeacherID, group.RoomID, group.Schedule, group.Description, group.Status, group.Color, companyID, branchID)
	if err != nil {
		return fmt.Errorf("error creating group: %w", err)
	}

	// Insert students using enrollment table
	for _, studentID := range group.StudentIds {
		_, err = tx.Exec(`
			INSERT INTO enrollment (student_id, group_id, joined_at, company_id)
			VALUES ($1, $2, CURRENT_TIMESTAMP, $3)
			ON CONFLICT (student_id, group_id) WHERE left_at IS NULL DO NOTHING
		`, studentID, group.ID, companyID)
		if err != nil {
			return fmt.Errorf("error inserting enrollment: %w", err)
		}
	}

	return tx.Commit()
}

func (r *GroupRepository) GetAll(companyID string, branchID string) ([]*models.Group, error) {
	return r.GetAllByBranches(companyID, []string{branchID})
}

// GetAllByBranches gets groups from specified accessible branches (for branch isolation)
func (r *GroupRepository) GetAllByBranches(companyID string, branchIDs []string) ([]*models.Group, error) {
	var query string
	var args []interface{}
	
	// Check if branchIDs contains companyID (fallback mode)
	hasFallback := false
	for _, bid := range branchIDs {
		if bid == companyID {
			hasFallback = true
			break
		}
	}
	
	baseQuery := `
		SELECT 
			g.id, g.name, g.subject, g.teacher_id, g.room_id, g.schedule, 
			g.description, g.status, g.color, g.company_id,
			t.name as teacher_name,
			rm.name as room_name
		FROM groups g
		LEFT JOIN teachers t ON g.teacher_id = t.id
		LEFT JOIN rooms rm ON g.room_id = rm.id
	`
	
	if hasFallback && len(branchIDs) == 1 {
		// Fallback mode: don't filter by branch_id
		query = baseQuery + ` WHERE g.company_id = $1 ORDER BY g.name`
		args = []interface{}{companyID}
	} else {
		// Filter by accessible branches only
		placeholders := make([]string, len(branchIDs))
		for i := range branchIDs {
			placeholders[i] = fmt.Sprintf("$%d", i+2)
		}
		query = baseQuery + fmt.Sprintf(` WHERE g.company_id = $1 AND g.branch_id IN (%s) ORDER BY g.name`, strings.Join(placeholders, ","))
		args = make([]interface{}, len(branchIDs)+1)
		args[0] = companyID
		for i, bid := range branchIDs {
			args[i+1] = bid
		}
	}

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("error getting groups: %w", err)
	}
	defer rows.Close()

	groups := []*models.Group{}
	for rows.Next() {
		group := &models.Group{}
		var teacherID sql.NullString
		var teacherName sql.NullString
		var roomID sql.NullString
		var roomName sql.NullString
		var schedule sql.NullString
		var description sql.NullString
		var status sql.NullString
		var color sql.NullString

		err := rows.Scan(&group.ID, &group.Name, &group.Subject, &teacherID, &roomID, &schedule, &description, &status, &color, &group.CompanyID, &teacherName, &roomName)
		if err != nil {
			return nil, fmt.Errorf("error scanning group: %w", err)
		}

		if teacherID.Valid {
			group.TeacherID = teacherID.String
		}
		if teacherName.Valid {
			group.TeacherName = teacherName.String
		}
		if roomID.Valid {
			group.RoomID = roomID.String
		}
		if roomName.Valid {
			group.RoomName = roomName.String
		}
		if schedule.Valid {
			group.Schedule = schedule.String
		}
		if description.Valid {
			group.Description = description.String
		}
		if status.Valid {
			group.Status = status.String
		} else {
			group.Status = "active"
		}
		if color.Valid {
			group.Color = color.String
		} else {
			group.Color = "#3b82f6"
		}

		// Initialize empty array for students
		group.StudentIds = []string{}

		// Get students from enrollment table (active enrollments only)
		studentRows, err := r.db.Query(`SELECT student_id FROM enrollment WHERE group_id = $1 AND left_at IS NULL`, group.ID)
		if err == nil {
			for studentRows.Next() {
				var studentID string
				if err := studentRows.Scan(&studentID); err == nil {
					group.StudentIds = append(group.StudentIds, studentID)
				}
			}
			studentRows.Close()
		}

		groups = append(groups, group)
	}

	return groups, nil
}

func (r *GroupRepository) GetByID(id string, companyID string) (*models.Group, error) {
	group := &models.Group{}
	var teacherID sql.NullString
	var teacherName sql.NullString
	var roomID sql.NullString
	var schedule sql.NullString
	var description sql.NullString
	var status sql.NullString
	var color sql.NullString

	query := `
		SELECT 
			g.id, g.name, g.subject, g.teacher_id, g.room_id, g.schedule, 
			g.description, g.status, g.color, g.company_id,
			t.name as teacher_name,
			rm.name as room_name
		FROM groups g
		LEFT JOIN teachers t ON g.teacher_id = t.id
		LEFT JOIN rooms rm ON g.room_id = rm.id
		WHERE g.id = $1 AND g.company_id = $2
	`

	var roomName sql.NullString
	err := r.db.QueryRow(query, id, companyID).Scan(&group.ID, &group.Name, &group.Subject, &teacherID, &roomID, &schedule, &description, &status, &color, &group.CompanyID, &teacherName, &roomName)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("error getting group: %w", err)
	}

	if teacherID.Valid {
		group.TeacherID = teacherID.String
	}
	if teacherName.Valid {
		group.TeacherName = teacherName.String
	}
	if roomID.Valid {
		group.RoomID = roomID.String
	}
	if roomName.Valid {
		group.RoomName = roomName.String
	}
	if schedule.Valid {
		group.Schedule = schedule.String
	}
	if description.Valid {
		group.Description = description.String
	}
	if status.Valid {
		group.Status = status.String
	} else {
		group.Status = "active"
	}
	if color.Valid {
		group.Color = color.String
	} else {
		group.Color = "#3b82f6"
	}

	// Initialize empty array for students
	group.StudentIds = []string{}

	// Get students from enrollment table (active enrollments only)
	studentRows, err := r.db.Query(`SELECT student_id FROM enrollment WHERE group_id = $1 AND left_at IS NULL`, group.ID)
	if err == nil {
		for studentRows.Next() {
			var studentID string
			if err := studentRows.Scan(&studentID); err == nil {
				group.StudentIds = append(group.StudentIds, studentID)
			}
		}
		studentRows.Close()
	}

	return group, nil
}

func (r *GroupRepository) Update(group *models.Group, companyID string) error {
	tx, err := r.db.Begin()
	if err != nil {
		return fmt.Errorf("error starting transaction: %w", err)
	}
	defer tx.Rollback()

	// Convert empty room_id to NULL to avoid foreign key constraint violations
	var roomID interface{}
	if group.RoomID == "" {
		roomID = nil
	} else {
		// Verify room exists before updating
		var roomExists bool
		err = tx.QueryRow(`SELECT EXISTS(SELECT 1 FROM rooms WHERE id = $1 AND company_id = $2)`, group.RoomID, companyID).Scan(&roomExists)
		if err != nil {
			return fmt.Errorf("error checking room existence: %w", err)
		}
		if !roomExists {
			roomID = nil // Set to NULL if room doesn't exist
		} else {
			roomID = group.RoomID
		}
	}

	// Update group
	query := `
		UPDATE groups 
		SET name = $2, subject = $3, teacher_id = $4, room_id = $5, schedule = $6, description = $7, status = $8, color = $9
		WHERE id = $1 AND company_id = $10
	`
	_, err = tx.Exec(query, group.ID, group.Name, group.Subject, group.TeacherID, roomID, group.Schedule, group.Description, group.Status, group.Color, companyID)
	if err != nil {
		return fmt.Errorf("error updating group: %w", err)
	}

	// Mark old enrollments as left (preserve history)
	_, err = tx.Exec(`
		UPDATE enrollment 
		SET left_at = CURRENT_TIMESTAMP 
		WHERE group_id = $1 AND company_id = $2 AND left_at IS NULL
	`, group.ID, companyID)
	if err != nil {
		return fmt.Errorf("error updating old enrollments: %w", err)
	}

	// Insert new enrollments
	for _, studentID := range group.StudentIds {
		_, err = tx.Exec(`
			INSERT INTO enrollment (student_id, group_id, joined_at, company_id)
			VALUES ($1, $2, CURRENT_TIMESTAMP, $3)
			ON CONFLICT (student_id, group_id) WHERE left_at IS NULL DO NOTHING
		`, studentID, group.ID, companyID)
		if err != nil {
			return fmt.Errorf("error inserting enrollment: %w", err)
		}
		// If enrollment exists but was left, reactivate it
		_, err = tx.Exec(`
			UPDATE enrollment 
			SET left_at = NULL, joined_at = CURRENT_TIMESTAMP 
			WHERE student_id = $1 AND group_id = $2 AND company_id = $3 AND left_at IS NOT NULL
		`, studentID, group.ID, companyID)
		if err != nil {
			return fmt.Errorf("error reactivating enrollment: %w", err)
		}
	}

	return tx.Commit()
}

func (r *GroupRepository) Delete(id string, companyID string) error {
	query := `DELETE FROM groups WHERE id = $1 AND company_id = $2`

	_, err := r.db.Exec(query, id, companyID)
	if err != nil {
		return fmt.Errorf("error deleting group: %w", err)
	}

	return nil
}

// GenerateLessonsForGroup creates 12 lessons for a group based on schedule
func (r *GroupRepository) GenerateLessonsForGroup(group *models.Group, companyID string) (int, error) {
	schedule := group.Schedule
	if schedule == "" {
		return 0, fmt.Errorf("group has no schedule defined")
	}

	fmt.Printf("🔍 Parsing schedule: '%s' for group %s\n", schedule, group.Name)

	// Parse schedule: "Пн, Ср, Пт 20:00-21:30"
	weekdaysMap := map[string]time.Weekday{
		"пн": time.Monday, "понедельник": time.Monday,
		"вт": time.Tuesday, "вторник": time.Tuesday,
		"ср": time.Wednesday, "среда": time.Wednesday,
		"чт": time.Thursday, "четверг": time.Thursday,
		"пт": time.Friday, "пятница": time.Friday,
		"сб": time.Saturday, "суббота": time.Saturday,
		"вс": time.Sunday, "воскресенье": time.Sunday,
	}

	// Extract weekdays and time from schedule
	var targetWeekdays []time.Weekday
	var startHour, startMin, endHour, endMin int

	// Simple parsing
	schedLower := strings.ToLower(schedule)
	for key, day := range weekdaysMap {
		if strings.Contains(schedLower, key) {
			targetWeekdays = append(targetWeekdays, day)
		}
	}

	fmt.Printf("📅 Parsed weekdays: %v\n", targetWeekdays)

	// Extract time using regex or simple string split
	// Format: "20:00-21:30" or "20:00 - 21:30"
	timePattern := strings.Split(schedLower, " ")
	for _, part := range timePattern {
		if strings.Contains(part, ":") && strings.Contains(part, "-") {
			// Found time range
			times := strings.Split(part, "-")
			if len(times) == 2 {
				// Parse start time
				startParts := strings.Split(times[0], ":")
				if len(startParts) == 2 {
					fmt.Sscanf(startParts[0], "%d", &startHour)
					fmt.Sscanf(startParts[1], "%d", &startMin)
				}
				// Parse end time
				endParts := strings.Split(times[1], ":")
				if len(endParts) == 2 {
					fmt.Sscanf(endParts[0], "%d", &endHour)
					fmt.Sscanf(endParts[1], "%d", &endMin)
				}
			}
		}
	}

	fmt.Printf("⏰ Parsed time: %02d:%02d - %02d:%02d\n", startHour, startMin, endHour, endMin)

	// Default time if parsing failed
	if startHour == 0 && endHour == 0 {
		fmt.Println("⚠️  Time parsing failed, using defaults: 10:00-11:30")
		startHour, startMin = 10, 0
		endHour, endMin = 11, 30
	}

	// Default weekdays if parsing failed
	if len(targetWeekdays) == 0 {
		fmt.Println("⚠️  Weekdays parsing failed, using defaults: Mon, Wed, Fri")
		targetWeekdays = []time.Weekday{time.Monday, time.Wednesday, time.Friday}
	}

	// Use group's room_id, or get a default room if not set
	var roomID sql.NullString
	if group.RoomID != "" {
		roomID = sql.NullString{String: group.RoomID, Valid: true}
	} else {
		err := r.db.QueryRow(`SELECT id FROM rooms WHERE company_id = $1 LIMIT 1`, companyID).Scan(&roomID)
		if err != nil && err != sql.ErrNoRows {
			return 0, fmt.Errorf("error getting room: %w", err)
		}
	}

	// Kazakhstan timezone - UTC+5 (since 2024, no DST)
	// Force UTC+5 instead of using LoadLocation which may return outdated UTC+6
	kazakhstanOffset := 5 * 60 * 60 // 5 hours in seconds
	loc := time.FixedZone("Asia/Almaty", kazakhstanOffset)

	fmt.Printf("🌍 Using timezone: %s (offset: %+d hours)\n", loc.String(), kazakhstanOffset/3600)

	// Generate exactly 12 lessons
	lessonsCreated := 0

	// Get current time in Kazakhstan timezone
	now := time.Now()
	fmt.Printf("⏰ System time (UTC): %s\n", now.UTC().Format("2006-01-02 15:04:05 MST"))
	fmt.Printf("⏰ System time (Local): %s\n", now.Format("2006-01-02 15:04:05 MST"))

	currentDate := now.In(loc)
	fmt.Printf("⏰ Current time (Kazakhstan): %s\n", currentDate.Format("2006-01-02 15:04:05 MST"))

	// Start from tomorrow
	currentDate = time.Date(currentDate.Year(), currentDate.Month(), currentDate.Day()+1, 0, 0, 0, 0, loc)

	fmt.Printf("📍 Starting generation from: %s (timezone: %s)\n", currentDate.Format("2006-01-02"), loc.String())
	fmt.Printf("🎯 Target: 12 lessons, Room: %v\n", roomID)

	maxIterations := 100 // Safety limit
	iterations := 0

	for lessonsCreated < 12 && iterations < maxIterations {
		iterations++

		// Check if current date is one of our target weekdays
		isTargetDay := false
		for _, targetDay := range targetWeekdays {
			if currentDate.Weekday() == targetDay {
				isTargetDay = true
				break
			}
		}

		if isTargetDay {
			fmt.Printf("✓ %s is target day (%s), creating lesson...\n",
				currentDate.Format("2006-01-02"), currentDate.Weekday())
			// Create a lesson with proper timezone
			lessonStart := time.Date(currentDate.Year(), currentDate.Month(), currentDate.Day(),
				startHour, startMin, 0, 0, loc)
			lessonEnd := time.Date(currentDate.Year(), currentDate.Month(), currentDate.Day(),
				endHour, endMin, 0, 0, loc)

			lessonID := fmt.Sprintf("lesson-%s-%d", group.ID, lessonStart.Unix())

			fmt.Printf("   📅 Lesson times (Kazakhstan): %s - %s\n",
				lessonStart.Format("2006-01-02 15:04:05 MST"),
				lessonEnd.Format("15:04:05 MST"))
			fmt.Printf("   📅 Lesson times (UTC): %s - %s\n",
				lessonStart.UTC().Format("2006-01-02 15:04:05 MST"),
				lessonEnd.UTC().Format("15:04:05 MST"))

			// Check for room conflicts if room_id is set
			// Conflict exists if intervals overlap, but NOT if they just touch at boundaries
			// We round times to minutes for boundary comparison to allow lessons that touch at minute boundaries
			// (e.g., one ends at 16:00:00 and another starts at 16:00:00 - no conflict)
			if roomID.Valid {
				var conflictCount int
				err := r.db.QueryRow(`
					SELECT COUNT(*) FROM lessons
					WHERE room_id = $1 
					AND company_id = $2
					AND id != $3
					AND start_time < $5 
					AND end_time > $4
					AND DATE_TRUNC('minute', end_time) <> DATE_TRUNC('minute', $4)
					AND DATE_TRUNC('minute', start_time) <> DATE_TRUNC('minute', $5)
				`, roomID.String, companyID, lessonID, lessonStart, lessonEnd).Scan(&conflictCount)

				if err != nil {
					fmt.Printf("Warning: error checking room conflicts: %v\n", err)
				} else if conflictCount > 0 {
					fmt.Printf("⚠️  Room conflict detected for %s at %s. Skipping...\n",
						roomID.String, lessonStart.Format("2006-01-02 15:04"))
					currentDate = currentDate.AddDate(0, 0, 1)
					continue
				}
			}

			// Insert lesson (times will be stored in UTC in PostgreSQL)
			fmt.Printf("   💾 Inserting to DB:\n")
			fmt.Printf("      - lesson_id: %s\n", lessonID)
			fmt.Printf("      - start_time: %v (Go time.Time)\n", lessonStart)
			fmt.Printf("      - end_time: %v (Go time.Time)\n", lessonEnd)

			result, err := r.db.Exec(`
				INSERT INTO lessons (id, title, teacher_id, group_id, subject, start_time, end_time, room_id, status, company_id)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
				ON CONFLICT (id) DO NOTHING
			`, lessonID, group.Name, group.TeacherID, group.ID, group.Subject, lessonStart, lessonEnd, roomID, "scheduled", companyID)

			if err != nil {
				fmt.Printf("❌ Error creating lesson: %v\n", err)
				return lessonsCreated, fmt.Errorf("error creating lesson: %w", err)
			}

			rowsAffected, _ := result.RowsAffected()
			if rowsAffected == 0 {
				fmt.Printf("⏭️  Lesson already exists (conflict), skipping...\n")
			} else {
				fmt.Printf("✅ Lesson created: %s at %s-%s\n",
					lessonID, lessonStart.Format("15:04"), lessonEnd.Format("15:04"))

				// Add students to the lesson
				studentsAdded := 0
				for _, studentID := range group.StudentIds {
					_, err = r.db.Exec(`
						INSERT INTO lesson_students (lesson_id, student_id, company_id)
						VALUES ($1, $2, $3)
						ON CONFLICT DO NOTHING
					`, lessonID, studentID, companyID)
					if err != nil {
						fmt.Printf("⚠️  Error adding student %s: %v\n", studentID, err)
					} else {
						studentsAdded++
					}
				}
				fmt.Printf("👥 Added %d students to lesson\n", studentsAdded)
				lessonsCreated++
			}
		}

		currentDate = currentDate.AddDate(0, 0, 1) // Next day
	}

	fmt.Printf("🎉 Generation complete: %d lessons created in %d iterations\n", lessonsCreated, iterations)
	return lessonsCreated, nil
}
