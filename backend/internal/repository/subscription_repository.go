package repository

import (
	"classmate-central/internal/models"
	"database/sql"
)

type SubscriptionRepository struct {
	db *sql.DB
}

func NewSubscriptionRepository(db *sql.DB) *SubscriptionRepository {
	return &SubscriptionRepository{db: db}
}

// ============= Subscription Types =============

func (r *SubscriptionRepository) CreateType(subType *models.SubscriptionType) error {
	query := `INSERT INTO subscription_types (id, name, lessons_count, validity_days, price, can_freeze, description) 
	          VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING created_at`
	return r.db.QueryRow(query, subType.ID, subType.Name, subType.LessonsCount, subType.ValidityDays, subType.Price, subType.CanFreeze, subType.Description).
		Scan(&subType.CreatedAt)
}

func (r *SubscriptionRepository) GetAllTypes() ([]models.SubscriptionType, error) {
	query := `SELECT id, name, lessons_count, validity_days, price, can_freeze, description, created_at 
	          FROM subscription_types ORDER BY created_at DESC`
	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	types := []models.SubscriptionType{}
	for rows.Next() {
		var subType models.SubscriptionType
		if err := rows.Scan(&subType.ID, &subType.Name, &subType.LessonsCount, &subType.ValidityDays, &subType.Price, &subType.CanFreeze, &subType.Description, &subType.CreatedAt); err != nil {
			return nil, err
		}
		types = append(types, subType)
	}
	return types, nil
}

func (r *SubscriptionRepository) GetTypeByID(id string) (*models.SubscriptionType, error) {
	query := `SELECT id, name, lessons_count, validity_days, price, can_freeze, description, created_at 
	          FROM subscription_types WHERE id = $1`
	var subType models.SubscriptionType
	err := r.db.QueryRow(query, id).Scan(&subType.ID, &subType.Name, &subType.LessonsCount, &subType.ValidityDays, &subType.Price, &subType.CanFreeze, &subType.Description, &subType.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &subType, nil
}

func (r *SubscriptionRepository) UpdateType(subType *models.SubscriptionType) error {
	query := `UPDATE subscription_types SET name = $1, lessons_count = $2, validity_days = $3, price = $4, can_freeze = $5, description = $6 
	          WHERE id = $7`
	_, err := r.db.Exec(query, subType.Name, subType.LessonsCount, subType.ValidityDays, subType.Price, subType.CanFreeze, subType.Description, subType.ID)
	return err
}

func (r *SubscriptionRepository) DeleteType(id string) error {
	query := `DELETE FROM subscription_types WHERE id = $1`
	_, err := r.db.Exec(query, id)
	return err
}

// ============= Student Subscriptions =============

func (r *SubscriptionRepository) CreateStudentSubscription(sub *models.StudentSubscription) error {
	query := `INSERT INTO student_subscriptions (id, student_id, subscription_type_id, lessons_remaining, start_date, end_date, status, freeze_days_remaining) 
	          VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING created_at`
	return r.db.QueryRow(query, sub.ID, sub.StudentID, sub.SubscriptionTypeID, sub.LessonsRemaining, sub.StartDate, sub.EndDate, sub.Status, sub.FreezeDaysRemaining).
		Scan(&sub.CreatedAt)
}

func (r *SubscriptionRepository) GetStudentSubscriptions(studentID string) ([]models.StudentSubscription, error) {
	query := `SELECT id, student_id, subscription_type_id, lessons_remaining, start_date, end_date, status, freeze_days_remaining, created_at 
	          FROM student_subscriptions WHERE student_id = $1 ORDER BY created_at DESC`
	rows, err := r.db.Query(query, studentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	subs := []models.StudentSubscription{}
	for rows.Next() {
		var sub models.StudentSubscription
		if err := rows.Scan(&sub.ID, &sub.StudentID, &sub.SubscriptionTypeID, &sub.LessonsRemaining, &sub.StartDate, &sub.EndDate, &sub.Status, &sub.FreezeDaysRemaining, &sub.CreatedAt); err != nil {
			return nil, err
		}
		subs = append(subs, sub)
	}
	return subs, nil
}

func (r *SubscriptionRepository) GetSubscriptionByID(id string) (*models.StudentSubscription, error) {
	query := `SELECT id, student_id, subscription_type_id, lessons_remaining, start_date, end_date, status, freeze_days_remaining, created_at 
	          FROM student_subscriptions WHERE id = $1`
	var sub models.StudentSubscription
	err := r.db.QueryRow(query, id).Scan(&sub.ID, &sub.StudentID, &sub.SubscriptionTypeID, &sub.LessonsRemaining, &sub.StartDate, &sub.EndDate, &sub.Status, &sub.FreezeDaysRemaining, &sub.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &sub, nil
}

func (r *SubscriptionRepository) UpdateSubscription(sub *models.StudentSubscription) error {
	query := `UPDATE student_subscriptions SET lessons_remaining = $1, end_date = $2, status = $3, freeze_days_remaining = $4 
	          WHERE id = $5`
	_, err := r.db.Exec(query, sub.LessonsRemaining, sub.EndDate, sub.Status, sub.FreezeDaysRemaining, sub.ID)
	return err
}

func (r *SubscriptionRepository) DeleteSubscription(id string) error {
	query := `DELETE FROM student_subscriptions WHERE id = $1`
	_, err := r.db.Exec(query, id)
	return err
}

func (r *SubscriptionRepository) GetAllSubscriptions() ([]models.StudentSubscription, error) {
	query := `SELECT id, student_id, subscription_type_id, lessons_remaining, start_date, end_date, status, freeze_days_remaining, created_at 
	          FROM student_subscriptions ORDER BY created_at DESC`
	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	subs := []models.StudentSubscription{}
	for rows.Next() {
		var sub models.StudentSubscription
		if err := rows.Scan(&sub.ID, &sub.StudentID, &sub.SubscriptionTypeID, &sub.LessonsRemaining, &sub.StartDate, &sub.EndDate, &sub.Status, &sub.FreezeDaysRemaining, &sub.CreatedAt); err != nil {
			return nil, err
		}
		subs = append(subs, sub)
	}
	return subs, nil
}

// ============= Subscription Freezes =============

func (r *SubscriptionRepository) CreateFreeze(freeze *models.SubscriptionFreeze) error {
	query := `INSERT INTO subscription_freezes (subscription_id, freeze_start, freeze_end, reason) 
	          VALUES ($1, $2, $3, $4) RETURNING id, created_at`
	return r.db.QueryRow(query, freeze.SubscriptionID, freeze.FreezeStart, freeze.FreezeEnd, freeze.Reason).
		Scan(&freeze.ID, &freeze.CreatedAt)
}

func (r *SubscriptionRepository) GetFreezesBySubscription(subscriptionID string) ([]models.SubscriptionFreeze, error) {
	query := `SELECT id, subscription_id, freeze_start, freeze_end, reason, created_at 
	          FROM subscription_freezes WHERE subscription_id = $1 ORDER BY created_at DESC`
	rows, err := r.db.Query(query, subscriptionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	freezes := []models.SubscriptionFreeze{}
	for rows.Next() {
		var freeze models.SubscriptionFreeze
		if err := rows.Scan(&freeze.ID, &freeze.SubscriptionID, &freeze.FreezeStart, &freeze.FreezeEnd, &freeze.Reason, &freeze.CreatedAt); err != nil {
			return nil, err
		}
		freezes = append(freezes, freeze)
	}
	return freezes, nil
}

func (r *SubscriptionRepository) UpdateFreeze(freeze *models.SubscriptionFreeze) error {
	query := `UPDATE subscription_freezes SET freeze_end = $1, reason = $2 WHERE id = $3`
	_, err := r.db.Exec(query, freeze.FreezeEnd, freeze.Reason, freeze.ID)
	return err
}

// ============= Lesson Attendance =============

func (r *SubscriptionRepository) MarkAttendance(attendance *models.LessonAttendance) error {
	query := `INSERT INTO lesson_attendance (lesson_id, student_id, subscription_id, status, marked_by) 
	          VALUES ($1, $2, $3, $4, $5) 
	          ON CONFLICT (lesson_id, student_id) DO UPDATE 
	          SET subscription_id = EXCLUDED.subscription_id, status = EXCLUDED.status, marked_at = CURRENT_TIMESTAMP, marked_by = EXCLUDED.marked_by
	          RETURNING id, marked_at`
	return r.db.QueryRow(query, attendance.LessonID, attendance.StudentID, attendance.SubscriptionID, attendance.Status, attendance.MarkedBy).
		Scan(&attendance.ID, &attendance.MarkedAt)
}

func (r *SubscriptionRepository) GetAttendanceByLesson(lessonID string) ([]models.LessonAttendance, error) {
	query := `SELECT id, lesson_id, student_id, subscription_id, status, marked_at, marked_by 
	          FROM lesson_attendance WHERE lesson_id = $1`
	rows, err := r.db.Query(query, lessonID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	attendances := []models.LessonAttendance{}
	for rows.Next() {
		var attendance models.LessonAttendance
		if err := rows.Scan(&attendance.ID, &attendance.LessonID, &attendance.StudentID, &attendance.SubscriptionID, &attendance.Status, &attendance.MarkedAt, &attendance.MarkedBy); err != nil {
			return nil, err
		}
		attendances = append(attendances, attendance)
	}
	return attendances, nil
}

func (r *SubscriptionRepository) GetAttendanceByStudent(studentID string) ([]models.LessonAttendance, error) {
	query := `SELECT id, lesson_id, student_id, subscription_id, status, marked_at, marked_by 
	          FROM lesson_attendance WHERE student_id = $1 ORDER BY marked_at DESC`
	rows, err := r.db.Query(query, studentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	attendances := []models.LessonAttendance{}
	for rows.Next() {
		var attendance models.LessonAttendance
		if err := rows.Scan(&attendance.ID, &attendance.LessonID, &attendance.StudentID, &attendance.SubscriptionID, &attendance.Status, &attendance.MarkedAt, &attendance.MarkedBy); err != nil {
			return nil, err
		}
		attendances = append(attendances, attendance)
	}
	return attendances, nil
}
