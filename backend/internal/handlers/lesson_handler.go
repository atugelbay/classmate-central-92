package handlers

import (
	"fmt"
	"net/http"
	"time"

	"classmate-central/internal/models"
	"classmate-central/internal/repository"
	"classmate-central/internal/validation"

	"github.com/gin-gonic/gin"
)

type LessonHandler struct {
	repo     *repository.LessonRepository
	roomRepo *repository.RoomRepository
}

func NewLessonHandler(repo *repository.LessonRepository, roomRepo *repository.RoomRepository) *LessonHandler {
	return &LessonHandler{
		repo:     repo,
		roomRepo: roomRepo,
	}
}

func (h *LessonHandler) GetAll(c *gin.Context) {
	companyID := c.GetString("company_id")
	branchID := c.GetString("branch_id")
	
	// Используем выбранный филиал для изоляции данных
	// Если branchID не установлен, используем company_id как fallback
	if branchID == "" {
		branchID = companyID
	}
	
	lessons, err := h.repo.GetAll(companyID, branchID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, lessons)
}

func (h *LessonHandler) GetIndividual(c *gin.Context) {
	companyID := c.GetString("company_id")
	lessons, err := h.repo.GetIndividualLessons(companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, lessons)
}

func (h *LessonHandler) GetByID(c *gin.Context) {
	id := c.Param("id")
	companyID := c.GetString("company_id")

	lesson, err := h.repo.GetByID(id, companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if lesson == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Lesson not found"})
		return
	}

	c.JSON(http.StatusOK, lesson)
}

func (h *LessonHandler) Create(c *gin.Context) {
	var lesson models.Lesson
	if err := c.ShouldBindJSON(&lesson); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": validation.FormatValidationErrors(err)})
		return
	}

	// Validation
	if err := validation.ValidateNotEmpty(lesson.Title, "title"); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := validation.ValidateDateRange(lesson.Start, lesson.End); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := validation.ValidateNotEmpty(lesson.Subject, "subject"); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate duration (min 15 mins, max 6 hours)
	duration := lesson.End.Sub(lesson.Start)
	if duration < 15*time.Minute {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Lesson duration must be at least 15 minutes"})
		return
	}
	if duration > 6*time.Hour {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Lesson duration cannot exceed 6 hours"})
		return
	}

	companyID := c.GetString("company_id")

	// Check for conflicts
	conflicts, err := h.repo.CheckConflicts(lesson.TeacherID, lesson.RoomID, lesson.Start, lesson.End, "", companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check conflicts: " + err.Error()})
		return
	}
	if len(conflicts) > 0 {
		c.JSON(http.StatusConflict, gin.H{
			"error":     "Scheduling conflict detected",
			"conflicts": conflicts,
		})
		return
	}

	branchID := c.GetString("branch_id")
	lesson.BranchID = branchID
	if err := h.repo.Create(&lesson, companyID, branchID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, lesson)
}

func (h *LessonHandler) Update(c *gin.Context) {
	id := c.Param("id")
	companyID := c.GetString("company_id")

	var lesson models.Lesson
	if err := c.ShouldBindJSON(&lesson); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	lesson.ID = id

	// Validate duration (min 15 mins, max 6 hours)
	duration := lesson.End.Sub(lesson.Start)
	if duration < 15*time.Minute {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Lesson duration must be at least 15 minutes"})
		return
	}
	if duration > 6*time.Hour {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Lesson duration cannot exceed 6 hours"})
		return
	}

	// Check for conflicts (exclude current lesson)
	conflicts, err := h.repo.CheckConflicts(lesson.TeacherID, lesson.RoomID, lesson.Start, lesson.End, id, companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check conflicts: " + err.Error()})
		return
	}
	if len(conflicts) > 0 {
		c.JSON(http.StatusConflict, gin.H{
			"error":     "Scheduling conflict detected",
			"conflicts": conflicts,
		})
		return
	}

	if err := h.repo.Update(&lesson, companyID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, lesson)
}

func (h *LessonHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	companyID := c.GetString("company_id")

	if err := h.repo.Delete(id, companyID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Lesson deleted successfully"})
}

// CheckConflictsRequest represents a request to check for scheduling conflicts
type CheckConflictsRequest struct {
	TeacherID       string `json:"teacherId"`
	RoomID          string `json:"roomId"`
	Start           string `json:"start"`
	End             string `json:"end"`
	ExcludeLessonID string `json:"excludeLessonId"`
}

// CheckConflictsResponse represents the response for conflict checking
type CheckConflictsResponse struct {
	HasConflicts   bool                      `json:"hasConflicts"`
	Conflicts      []repository.ConflictInfo `json:"conflicts"`
	SuggestedTimes []SuggestedTime           `json:"suggestedTimes,omitempty"`
}

// SuggestedTime represents an alternative time slot with room
type SuggestedTime struct {
	Start    string `json:"start"`
	End      string `json:"end"`
	RoomID   string `json:"roomId,omitempty"`
	RoomName string `json:"roomName,omitempty"`
}

// CheckConflicts checks for scheduling conflicts
func (h *LessonHandler) CheckConflicts(c *gin.Context) {
	var req CheckConflictsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	companyID := c.GetString("company_id")

	// Parse times
	start, err := time.Parse(time.RFC3339, req.Start)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid start time format"})
		return
	}

	end, err := time.Parse(time.RFC3339, req.End)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid end time format"})
		return
	}

	// Check for conflicts
	conflicts, err := h.repo.CheckConflicts(req.TeacherID, req.RoomID, start, end, req.ExcludeLessonID, companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	response := CheckConflictsResponse{
		HasConflicts: len(conflicts) > 0,
		Conflicts:    conflicts,
	}

	// If there are conflicts, suggest alternative times
	// For now, suggest nearest free time slots for the same teacher/room combo
	if len(conflicts) > 0 {
		// Get all available rooms for suggestions
		branchID := c.GetString("branch_id")
		roomsSlice, err := h.roomRepo.GetAll(companyID, branchID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch rooms"})
			return
		}

		// Convert []Room to []*Room
		rooms := make([]*models.Room, len(roomsSlice))
		for i := range roomsSlice {
			rooms[i] = &roomsSlice[i]
		}

		suggestedTimes := findAlternativeTimesWithRooms(req.TeacherID, start, end, h.repo, rooms, companyID)
		response.SuggestedTimes = suggestedTimes
	}

	c.JSON(http.StatusOK, response)
}

// findAlternativeTimes finds available time slots on the same day with free rooms
func findAlternativeTimes(start, end time.Time, conflicts []repository.ConflictInfo) []SuggestedTime {
	duration := end.Sub(start)
	suggestions := []SuggestedTime{}

	// Get day start and end (8:00 AM to 10:00 PM)
	dayStart := time.Date(start.Year(), start.Month(), start.Day(), 8, 0, 0, 0, start.Location())
	dayEnd := time.Date(start.Year(), start.Month(), start.Day(), 22, 0, 0, 0, start.Location())

	// Try slots every 30 minutes starting from the requested time
	searchStart := start
	if searchStart.Before(dayStart) {
		searchStart = dayStart
	}

	// Try forward from requested time first
	for candidate := searchStart; candidate.Add(duration).Before(dayEnd) || candidate.Add(duration).Equal(dayEnd); candidate = candidate.Add(30 * time.Minute) {
		candidateEnd := candidate.Add(duration)
		hasConflict := false

		// Check if this slot conflicts with any existing lesson
		for _, conflict := range conflicts {
			if candidate.Before(conflict.End) && candidateEnd.After(conflict.Start) {
				hasConflict = true
				break
			}
		}

		if !hasConflict {
			suggestions = append(suggestions, SuggestedTime{
				Start: candidate.Format(time.RFC3339),
				End:   candidateEnd.Format(time.RFC3339),
			})

			// Limit to 3 suggestions
			if len(suggestions) >= 3 {
				break
			}
		}
	}

	// If not enough suggestions, try backwards from requested time
	if len(suggestions) < 3 {
		for candidate := start.Add(-30 * time.Minute); candidate.After(dayStart) || candidate.Equal(dayStart); candidate = candidate.Add(-30 * time.Minute) {
			candidateEnd := candidate.Add(duration)
			if candidateEnd.After(dayEnd) {
				continue
			}

			hasConflict := false
			for _, conflict := range conflicts {
				if candidate.Before(conflict.End) && candidateEnd.After(conflict.Start) {
					hasConflict = true
					break
				}
			}

			if !hasConflict {
				// Insert at beginning to maintain chronological order
				suggestions = append([]SuggestedTime{{
					Start: candidate.Format(time.RFC3339),
					End:   candidateEnd.Format(time.RFC3339),
				}}, suggestions...)

				if len(suggestions) >= 3 {
					break
				}
			}
		}
	}

	return suggestions
}

// findAlternativeTimesWithRooms finds available time slots with free rooms
func findAlternativeTimesWithRooms(teacherID string, start, end time.Time, repo *repository.LessonRepository, rooms []*models.Room, companyID string) []SuggestedTime {
	duration := end.Sub(start)
	suggestions := []SuggestedTime{}

	// Define day boundaries (8:00 - 22:00)
	dayStart := time.Date(start.Year(), start.Month(), start.Day(), 8, 0, 0, 0, start.Location())
	dayEnd := time.Date(start.Year(), start.Month(), start.Day(), 22, 0, 0, 0, start.Location())

	// Filter out "Online" rooms
	availableRooms := []*models.Room{}
	for _, room := range rooms {
		if room.Name != "Online" {
			availableRooms = append(availableRooms, room)
		}
	}

	// Start searching from the requested start time (or day start if earlier)
	searchStart := start
	if searchStart.Before(dayStart) {
		searchStart = dayStart
	}

	// Try forward from requested time first
	for candidate := searchStart; candidate.Add(duration).Before(dayEnd) || candidate.Add(duration).Equal(dayEnd); candidate = candidate.Add(30 * time.Minute) {
		candidateEnd := candidate.Add(duration)

		// Try each available room for this time slot
		for _, room := range availableRooms {
			// Check conflicts for this teacher and room at this time
			conflicts, err := repo.CheckConflicts(teacherID, room.ID, candidate, candidateEnd, "", companyID)
			if err != nil {
				continue
			}

			// If no conflicts, add this suggestion
			if len(conflicts) == 0 {
				suggestions = append(suggestions, SuggestedTime{
					Start:    candidate.Format(time.RFC3339),
					End:      candidateEnd.Format(time.RFC3339),
					RoomID:   room.ID,
					RoomName: room.Name,
				})

				// Once we have 3 suggestions, stop
				if len(suggestions) >= 3 {
					return suggestions
				}

				// Break room loop to avoid suggesting multiple rooms for same time
				break
			}
		}
	}

	// If not enough suggestions, try backwards from requested time
	if len(suggestions) < 3 {
		for candidate := start.Add(-30 * time.Minute); candidate.After(dayStart) || candidate.Equal(dayStart); candidate = candidate.Add(-30 * time.Minute) {
			candidateEnd := candidate.Add(duration)

			// Try each available room for this time slot
			for _, room := range availableRooms {
				// Check conflicts for this teacher and room at this time
				conflicts, err := repo.CheckConflicts(teacherID, room.ID, candidate, candidateEnd, "", companyID)
				if err != nil {
					continue
				}

				// If no conflicts, add this suggestion
				if len(conflicts) == 0 {
					// Prepend to maintain chronological order
					suggestions = append([]SuggestedTime{{
						Start:    candidate.Format(time.RFC3339),
						End:      candidateEnd.Format(time.RFC3339),
						RoomID:   room.ID,
						RoomName: room.Name,
					}}, suggestions...)

					if len(suggestions) >= 3 {
						return suggestions
					}

					// Break room loop to avoid suggesting multiple rooms for same time
					break
				}
			}
		}
	}

	return suggestions
}

// GetByTeacher retrieves lessons for a specific teacher
func (h *LessonHandler) GetByTeacher(c *gin.Context) {
	teacherID := c.Param("teacherId")
	companyID := c.GetString("company_id")

	// Get query parameters for date range
	startDateStr := c.Query("startDate")
	endDateStr := c.Query("endDate")

	var startDate, endDate time.Time
	var err error

	if startDateStr != "" {
		startDate, err = time.Parse("2006-01-02", startDateStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid startDate format. Use YYYY-MM-DD"})
			return
		}
	} else {
		// Default to start of current month
		now := time.Now()
		startDate = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	}

	if endDateStr != "" {
		endDate, err = time.Parse("2006-01-02", endDateStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid endDate format. Use YYYY-MM-DD"})
			return
		}
	} else {
		// Default to end of next month
		endDate = startDate.AddDate(0, 2, 0)
	}

	lessons, err := h.repo.GetByTeacherID(teacherID, startDate, endDate, companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, lessons)
}

// BulkCreateRequest represents a request to create multiple lessons
type BulkCreateRequest struct {
	Lessons []models.Lesson `json:"lessons"`
}

// BulkCreateResponse represents the response for bulk lesson creation
type BulkCreateResponse struct {
	Created  int      `json:"created"`
	Skipped  int      `json:"skipped"`
	Messages []string `json:"messages,omitempty"`
}

// CreateBulk creates multiple lessons at once
func (h *LessonHandler) CreateBulk(c *gin.Context) {
	var req BulkCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	companyID := c.GetString("company_id")
	branchID := c.GetString("branch_id")

	// Check conflicts for each lesson
	validLessons := []*models.Lesson{}
	skippedCount := 0
	messages := []string{}

	for i, lesson := range req.Lessons {
		lesson.BranchID = branchID
		conflicts, err := h.repo.CheckConflicts(lesson.TeacherID, lesson.RoomID, lesson.Start, lesson.End, "", companyID)
		if err != nil {
			messages = append(messages, fmt.Sprintf("Lesson %d: Error checking conflicts - %s", i+1, err.Error()))
			skippedCount++
			continue
		}

		if len(conflicts) > 0 {
			messages = append(messages, fmt.Sprintf("Lesson %d (%s): Skipped due to conflicts", i+1, lesson.Start.Format("2006-01-02 15:04")))
			skippedCount++
			continue
		}

		validLessons = append(validLessons, &lesson)
	}

	// Create valid lessons
	if len(validLessons) > 0 {
		if err := h.repo.CreateBulk(validLessons, companyID, branchID); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}

	response := BulkCreateResponse{
		Created:  len(validLessons),
		Skipped:  skippedCount,
		Messages: messages,
	}

	c.JSON(http.StatusCreated, response)
}
