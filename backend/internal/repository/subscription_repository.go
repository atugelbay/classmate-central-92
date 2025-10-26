package repository

import (
	"classmate-central/internal/models"
	"database/sql"
	"time"
)

type SubscriptionRepository struct {
	db *sql.DB
}

func NewSubscriptionRepository(db *sql.DB) *SubscriptionRepository {
	return &SubscriptionRepository{db: db}
}

// ============= Subscription Types =============

func (r *SubscriptionRepository) CreateType(subType *models.SubscriptionType, companyID string) error {
	query := `INSERT INTO subscription_types (id, name, lessons_count, validity_days, price, can_freeze, billing_type, description, company_id) 
	          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING created_at`
	return r.db.QueryRow(query, subType.ID, subType.Name, subType.LessonsCount, subType.ValidityDays, subType.Price, subType.CanFreeze, subType.BillingType, subType.Description, companyID).
		Scan(&subType.CreatedAt)
}

func (r *SubscriptionRepository) GetAllTypes(companyID string) ([]models.SubscriptionType, error) {
	query := `SELECT id, name, lessons_count, validity_days, price, can_freeze, billing_type, description, created_at, company_id 
	          FROM subscription_types WHERE company_id = $1 ORDER BY created_at DESC`
	rows, err := r.db.Query(query, companyID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	types := []models.SubscriptionType{}
	for rows.Next() {
		var subType models.SubscriptionType
		if err := rows.Scan(&subType.ID, &subType.Name, &subType.LessonsCount, &subType.ValidityDays, &subType.Price, &subType.CanFreeze, &subType.BillingType, &subType.Description, &subType.CreatedAt, &subType.CompanyID); err != nil {
			return nil, err
		}
		types = append(types, subType)
	}
	return types, nil
}

func (r *SubscriptionRepository) GetTypeByID(id string, companyID string) (*models.SubscriptionType, error) {
	query := `SELECT id, name, lessons_count, validity_days, price, can_freeze, billing_type, description, created_at, company_id 
	          FROM subscription_types WHERE id = $1 AND company_id = $2`
	var subType models.SubscriptionType
	err := r.db.QueryRow(query, id, companyID).Scan(&subType.ID, &subType.Name, &subType.LessonsCount, &subType.ValidityDays, &subType.Price, &subType.CanFreeze, &subType.BillingType, &subType.Description, &subType.CreatedAt, &subType.CompanyID)
	if err != nil {
		return nil, err
	}
	return &subType, nil
}

func (r *SubscriptionRepository) UpdateType(subType *models.SubscriptionType, companyID string) error {
	query := `UPDATE subscription_types SET name = $1, lessons_count = $2, validity_days = $3, price = $4, can_freeze = $5, billing_type = $6, description = $7 
	          WHERE id = $8 AND company_id = $9`
	_, err := r.db.Exec(query, subType.Name, subType.LessonsCount, subType.ValidityDays, subType.Price, subType.CanFreeze, subType.BillingType, subType.Description, subType.ID, companyID)
	return err
}

func (r *SubscriptionRepository) DeleteType(id string, companyID string) error {
	query := `DELETE FROM subscription_types WHERE id = $1 AND company_id = $2`
	_, err := r.db.Exec(query, id, companyID)
	return err
}

// ============= Student Subscriptions =============

func (r *SubscriptionRepository) CreateStudentSubscription(sub *models.StudentSubscription, companyID string) error {
	query := `INSERT INTO student_subscriptions (
		id, student_id, subscription_type_id, group_id, teacher_id,
		total_lessons, used_lessons, total_price, price_per_lesson,
		start_date, end_date, paid_till, status, freeze_days_remaining, company_id
	) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) 
	RETURNING created_at, updated_at`
	return r.db.QueryRow(query,
		sub.ID, sub.StudentID, sub.SubscriptionTypeID, sub.GroupID, sub.TeacherID,
		sub.TotalLessons, sub.UsedLessons, sub.TotalPrice, sub.PricePerLesson,
		sub.StartDate, sub.EndDate, sub.PaidTill, sub.Status, sub.FreezeDaysRemaining, companyID,
	).Scan(&sub.CreatedAt, &sub.UpdatedAt)
}

func (r *SubscriptionRepository) GetStudentSubscriptions(studentID string, companyID string) ([]models.StudentSubscription, error) {
	query := `SELECT 
		ss.id, ss.student_id, ss.subscription_type_id, st.name as subscription_type_name, st.billing_type,
		ss.group_id, ss.teacher_id,
		ss.total_lessons, ss.used_lessons, ss.remaining_lessons, ss.total_price, ss.price_per_lesson,
		ss.start_date, ss.end_date, ss.paid_till, ss.status, ss.freeze_days_remaining, 
		ss.created_at, ss.updated_at, ss.company_id
	FROM student_subscriptions ss
	LEFT JOIN subscription_types st ON ss.subscription_type_id = st.id
	WHERE ss.student_id = $1 AND ss.company_id = $2
	ORDER BY ss.created_at DESC`
	rows, err := r.db.Query(query, studentID, companyID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	subs := []models.StudentSubscription{}
	for rows.Next() {
		var sub models.StudentSubscription
		var typeName, billingType sql.NullString
		if err := rows.Scan(
			&sub.ID, &sub.StudentID, &sub.SubscriptionTypeID, &typeName, &billingType,
			&sub.GroupID, &sub.TeacherID,
			&sub.TotalLessons, &sub.UsedLessons, &sub.LessonsRemaining, &sub.TotalPrice, &sub.PricePerLesson,
			&sub.StartDate, &sub.EndDate, &sub.PaidTill, &sub.Status, &sub.FreezeDaysRemaining,
			&sub.CreatedAt, &sub.UpdatedAt, &sub.CompanyID,
		); err != nil {
			return nil, err
		}
		if typeName.Valid {
			sub.SubscriptionTypeName = typeName.String
		}
		if billingType.Valid {
			sub.BillingType = billingType.String
		}
		subs = append(subs, sub)
	}
	return subs, nil
}

func (r *SubscriptionRepository) GetSubscriptionByID(id string, companyID string) (*models.StudentSubscription, error) {
	query := `SELECT 
		ss.id, ss.student_id, ss.subscription_type_id, st.name as subscription_type_name, st.billing_type,
		ss.group_id, ss.teacher_id,
		ss.total_lessons, ss.used_lessons, ss.remaining_lessons, ss.total_price, ss.price_per_lesson,
		ss.start_date, ss.end_date, ss.paid_till, ss.status, ss.freeze_days_remaining,
		ss.created_at, ss.updated_at, ss.company_id
	FROM student_subscriptions ss
	LEFT JOIN subscription_types st ON ss.subscription_type_id = st.id
	WHERE ss.id = $1 AND ss.company_id = $2`
	var sub models.StudentSubscription
	var typeName, billingType sql.NullString
	err := r.db.QueryRow(query, id, companyID).Scan(
		&sub.ID, &sub.StudentID, &sub.SubscriptionTypeID, &typeName, &billingType,
		&sub.GroupID, &sub.TeacherID,
		&sub.TotalLessons, &sub.UsedLessons, &sub.LessonsRemaining, &sub.TotalPrice, &sub.PricePerLesson,
		&sub.StartDate, &sub.EndDate, &sub.PaidTill, &sub.Status, &sub.FreezeDaysRemaining,
		&sub.CreatedAt, &sub.UpdatedAt, &sub.CompanyID,
	)
	if err != nil {
		return nil, err
	}
	if typeName.Valid {
		sub.SubscriptionTypeName = typeName.String
	}
	if billingType.Valid {
		sub.BillingType = billingType.String
	}
	return &sub, nil
}

func (r *SubscriptionRepository) UpdateSubscription(sub *models.StudentSubscription, companyID string) error {
	query := `UPDATE student_subscriptions SET 
		total_lessons = $1, used_lessons = $2, total_price = $3, price_per_lesson = $4,
		end_date = $5, paid_till = $6, status = $7, freeze_days_remaining = $8, updated_at = CURRENT_TIMESTAMP
		WHERE id = $9 AND company_id = $10`
	_, err := r.db.Exec(query,
		sub.TotalLessons, sub.UsedLessons, sub.TotalPrice, sub.PricePerLesson,
		sub.EndDate, sub.PaidTill, sub.Status, sub.FreezeDaysRemaining, sub.ID, companyID,
	)
	return err
}

func (r *SubscriptionRepository) DeleteSubscription(id string, companyID string) error {
	query := `DELETE FROM student_subscriptions WHERE id = $1 AND company_id = $2`
	_, err := r.db.Exec(query, id, companyID)
	return err
}

func (r *SubscriptionRepository) GetAllSubscriptions(companyID string) ([]models.StudentSubscription, error) {
	query := `SELECT 
		ss.id, ss.student_id, ss.subscription_type_id, st.name as subscription_type_name, st.billing_type,
		ss.group_id, ss.teacher_id,
		ss.total_lessons, ss.used_lessons, ss.remaining_lessons, ss.total_price, ss.price_per_lesson,
		ss.start_date, ss.end_date, ss.paid_till, ss.status, ss.freeze_days_remaining,
		ss.created_at, ss.updated_at, ss.company_id
	FROM student_subscriptions ss
	LEFT JOIN subscription_types st ON ss.subscription_type_id = st.id
	WHERE ss.company_id = $1
	ORDER BY ss.created_at DESC`
	rows, err := r.db.Query(query, companyID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	subs := []models.StudentSubscription{}
	for rows.Next() {
		var sub models.StudentSubscription
		var typeName, billingType sql.NullString
		if err := rows.Scan(
			&sub.ID, &sub.StudentID, &sub.SubscriptionTypeID, &typeName, &billingType,
			&sub.GroupID, &sub.TeacherID,
			&sub.TotalLessons, &sub.UsedLessons, &sub.LessonsRemaining, &sub.TotalPrice, &sub.PricePerLesson,
			&sub.StartDate, &sub.EndDate, &sub.PaidTill, &sub.Status, &sub.FreezeDaysRemaining,
			&sub.CreatedAt, &sub.UpdatedAt, &sub.CompanyID,
		); err != nil {
			return nil, err
		}
		if typeName.Valid {
			sub.SubscriptionTypeName = typeName.String
		} else {
			sub.SubscriptionTypeName = "Тип не указан"
		}
		if billingType.Valid {
			sub.BillingType = billingType.String
		}
		subs = append(subs, sub)
	}
	return subs, nil
}

// GetSubscriptionByIDInternal - for internal services (without company_id filter)
func (r *SubscriptionRepository) GetSubscriptionByIDInternal(id string) (*models.StudentSubscription, error) {
	query := `SELECT 
		ss.id, ss.student_id, ss.subscription_type_id, st.name as subscription_type_name, st.billing_type,
		ss.group_id, ss.teacher_id,
		ss.total_lessons, ss.used_lessons, ss.remaining_lessons, ss.total_price, ss.price_per_lesson,
		ss.start_date, ss.end_date, ss.paid_till, ss.status, ss.freeze_days_remaining,
		ss.created_at, ss.updated_at, ss.company_id
	FROM student_subscriptions ss
	LEFT JOIN subscription_types st ON ss.subscription_type_id = st.id
	WHERE ss.id = $1`
	var sub models.StudentSubscription
	var typeName, billingType sql.NullString
	err := r.db.QueryRow(query, id).Scan(
		&sub.ID, &sub.StudentID, &sub.SubscriptionTypeID, &typeName, &billingType,
		&sub.GroupID, &sub.TeacherID,
		&sub.TotalLessons, &sub.UsedLessons, &sub.LessonsRemaining, &sub.TotalPrice, &sub.PricePerLesson,
		&sub.StartDate, &sub.EndDate, &sub.PaidTill, &sub.Status, &sub.FreezeDaysRemaining,
		&sub.CreatedAt, &sub.UpdatedAt, &sub.CompanyID,
	)
	if err != nil {
		return nil, err
	}
	if typeName.Valid {
		sub.SubscriptionTypeName = typeName.String
	}
	if billingType.Valid {
		sub.BillingType = billingType.String
	}
	return &sub, nil
}

// UpdateSubscriptionInternal - for internal services (without company_id filter)
func (r *SubscriptionRepository) UpdateSubscriptionInternal(sub *models.StudentSubscription) error {
	query := `UPDATE student_subscriptions SET 
		total_lessons = $1, used_lessons = $2, total_price = $3, price_per_lesson = $4,
		end_date = $5, paid_till = $6, status = $7, freeze_days_remaining = $8, updated_at = CURRENT_TIMESTAMP
		WHERE id = $9`
	_, err := r.db.Exec(query,
		sub.TotalLessons, sub.UsedLessons, sub.TotalPrice, sub.PricePerLesson,
		sub.EndDate, sub.PaidTill, sub.Status, sub.FreezeDaysRemaining, sub.ID,
	)
	return err
}

// ============= Subscription Freezes =============

func (r *SubscriptionRepository) CreateFreeze(freeze *models.SubscriptionFreeze) error {
	// Start transaction
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Insert freeze record
	query := `INSERT INTO subscription_freezes (subscription_id, freeze_start, freeze_end, reason) 
	          VALUES ($1, $2, $3, $4) RETURNING id, created_at`
	err = tx.QueryRow(query, freeze.SubscriptionID, freeze.FreezeStart, freeze.FreezeEnd, freeze.Reason).
		Scan(&freeze.ID, &freeze.CreatedAt)
	if err != nil {
		return err
	}

	// Update subscription status to 'frozen'
	updateQuery := `UPDATE student_subscriptions SET status = 'frozen' WHERE id = $1`
	_, err = tx.Exec(updateQuery, freeze.SubscriptionID)
	if err != nil {
		return err
	}

	return tx.Commit()
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
	// Start transaction
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Get freeze details to calculate days frozen
	var freezeStart time.Time
	var subscriptionID string
	err = tx.QueryRow(`SELECT freeze_start, subscription_id FROM subscription_freezes WHERE id = $1`, freeze.ID).
		Scan(&freezeStart, &subscriptionID)
	if err != nil {
		return err
	}

	// Update freeze record
	query := `UPDATE subscription_freezes SET freeze_end = $1, reason = $2 WHERE id = $3`
	_, err = tx.Exec(query, freeze.FreezeEnd, freeze.Reason, freeze.ID)
	if err != nil {
		return err
	}

	// If freeze_end is set (unfreezing), extend subscription end_date by freeze duration
	if freeze.FreezeEnd != nil {
		// Calculate freeze duration in days
		freezeDuration := freeze.FreezeEnd.Sub(freezeStart)
		freezeDays := int(freezeDuration.Hours() / 24)

		// Get current subscription end_date
		var currentEndDate *time.Time
		err = tx.QueryRow(`SELECT end_date FROM student_subscriptions WHERE id = $1`, subscriptionID).
			Scan(&currentEndDate)
		if err != nil {
			return err
		}

		// Extend end_date by freeze duration
		if currentEndDate != nil {
			newEndDate := currentEndDate.Add(freezeDuration)
			_, err = tx.Exec(`UPDATE student_subscriptions SET end_date = $1, status = 'active' WHERE id = $2`,
				newEndDate, subscriptionID)
		} else {
			// If no end_date, just change status back to active
			_, err = tx.Exec(`UPDATE student_subscriptions SET status = 'active' WHERE id = $1`, subscriptionID)
		}
		if err != nil {
			return err
		}

		// Decrease freeze_days_remaining
		_, err = tx.Exec(`UPDATE student_subscriptions 
			SET freeze_days_remaining = GREATEST(0, freeze_days_remaining - $1) 
			WHERE id = $2`, freezeDays, subscriptionID)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

// ============= Lesson Attendance =============

func (r *SubscriptionRepository) MarkAttendance(attendance *models.LessonAttendance) error {
	query := `INSERT INTO lesson_attendance (lesson_id, student_id, subscription_id, status, marked_by, company_id) 
	          VALUES ($1, $2, $3, $4, $5, $6) 
	          ON CONFLICT (lesson_id, student_id) DO UPDATE 
	          SET subscription_id = EXCLUDED.subscription_id, status = EXCLUDED.status, marked_at = CURRENT_TIMESTAMP, marked_by = EXCLUDED.marked_by, company_id = EXCLUDED.company_id
	          RETURNING id, marked_at`
	return r.db.QueryRow(query, attendance.LessonID, attendance.StudentID, attendance.SubscriptionID, attendance.Status, attendance.MarkedBy, attendance.CompanyID).
		Scan(&attendance.ID, &attendance.MarkedAt)
}

func (r *SubscriptionRepository) GetAttendanceByLesson(lessonID string) ([]models.LessonAttendance, error) {
	query := `SELECT id, lesson_id, student_id, subscription_id, status, marked_at, marked_by, company_id 
	          FROM lesson_attendance WHERE lesson_id = $1`
	rows, err := r.db.Query(query, lessonID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	attendances := []models.LessonAttendance{}
	for rows.Next() {
		var attendance models.LessonAttendance
		if err := rows.Scan(&attendance.ID, &attendance.LessonID, &attendance.StudentID, &attendance.SubscriptionID, &attendance.Status, &attendance.MarkedAt, &attendance.MarkedBy, &attendance.CompanyID); err != nil {
			return nil, err
		}
		attendances = append(attendances, attendance)
	}
	return attendances, nil
}

func (r *SubscriptionRepository) GetAttendanceByStudent(studentID string) ([]models.LessonAttendance, error) {
	query := `SELECT id, lesson_id, student_id, subscription_id, status, marked_at, marked_by, company_id 
	          FROM lesson_attendance WHERE student_id = $1 ORDER BY marked_at DESC`
	rows, err := r.db.Query(query, studentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	attendances := []models.LessonAttendance{}
	for rows.Next() {
		var attendance models.LessonAttendance
		if err := rows.Scan(&attendance.ID, &attendance.LessonID, &attendance.StudentID, &attendance.SubscriptionID, &attendance.Status, &attendance.MarkedAt, &attendance.MarkedBy, &attendance.CompanyID); err != nil {
			return nil, err
		}
		attendances = append(attendances, attendance)
	}
	return attendances, nil
}

// DeductLesson deducts a lesson from a subscription
func (r *SubscriptionRepository) DeductLesson(subscriptionID string) error {
	query := `
		UPDATE student_subscriptions 
		SET used_lessons = used_lessons + 1, updated_at = CURRENT_TIMESTAMP
		WHERE id = $1 AND remaining_lessons > 0
	`
	result, err := r.db.Exec(query, subscriptionID)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return sql.ErrNoRows
	}

	return nil
}

// GetActiveSubscription retrieves the active subscription for a student
func (r *SubscriptionRepository) GetActiveSubscription(studentID string) (*models.StudentSubscription, error) {
	query := `
		SELECT 
			ss.id, ss.student_id, ss.subscription_type_id, st.name as subscription_type_name, st.billing_type,
			ss.group_id, ss.teacher_id,
			ss.total_lessons, ss.used_lessons, ss.remaining_lessons, ss.total_price, ss.price_per_lesson,
			ss.start_date, ss.end_date, ss.paid_till, ss.status, ss.freeze_days_remaining,
			ss.created_at, ss.updated_at, ss.company_id
		FROM student_subscriptions ss
		LEFT JOIN subscription_types st ON ss.subscription_type_id = st.id
		WHERE ss.student_id = $1 AND ss.status = 'active' AND ss.remaining_lessons > 0
		ORDER BY ss.created_at DESC
		LIMIT 1
	`
	var sub models.StudentSubscription
	var typeName, billingType sql.NullString
	err := r.db.QueryRow(query, studentID).Scan(
		&sub.ID, &sub.StudentID, &sub.SubscriptionTypeID, &typeName, &billingType,
		&sub.GroupID, &sub.TeacherID,
		&sub.TotalLessons, &sub.UsedLessons, &sub.LessonsRemaining, &sub.TotalPrice, &sub.PricePerLesson,
		&sub.StartDate, &sub.EndDate, &sub.PaidTill, &sub.Status, &sub.FreezeDaysRemaining,
		&sub.CreatedAt, &sub.UpdatedAt, &sub.CompanyID,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if typeName.Valid {
		sub.SubscriptionTypeName = typeName.String
	} else {
		sub.SubscriptionTypeName = "Тип не указан"
	}
	return &sub, nil
}

// CheckExpiringSubscriptions returns subscriptions expiring within 7 days
func (r *SubscriptionRepository) CheckExpiringSubscriptions() ([]*models.StudentSubscription, error) {
	query := `
		SELECT 
			ss.id, ss.student_id, ss.subscription_type_id, st.name as subscription_type_name, st.billing_type,
			ss.group_id, ss.teacher_id,
			ss.total_lessons, ss.used_lessons, ss.remaining_lessons, ss.total_price, ss.price_per_lesson,
			ss.start_date, ss.end_date, ss.paid_till, ss.status, ss.freeze_days_remaining,
			ss.created_at, ss.updated_at, ss.company_id
		FROM student_subscriptions ss
		LEFT JOIN subscription_types st ON ss.subscription_type_id = st.id
		WHERE ss.status = 'active' 
		AND ss.end_date IS NOT NULL 
		AND ss.end_date BETWEEN CURRENT_TIMESTAMP AND CURRENT_TIMESTAMP + INTERVAL '7 days'
	`
	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	subs := []*models.StudentSubscription{}
	for rows.Next() {
		var sub models.StudentSubscription
		var typeName, billingType sql.NullString
		if err := rows.Scan(
			&sub.ID, &sub.StudentID, &sub.SubscriptionTypeID, &typeName, &billingType,
			&sub.GroupID, &sub.TeacherID,
			&sub.TotalLessons, &sub.UsedLessons, &sub.LessonsRemaining, &sub.TotalPrice, &sub.PricePerLesson,
			&sub.StartDate, &sub.EndDate, &sub.PaidTill, &sub.Status, &sub.FreezeDaysRemaining,
			&sub.CreatedAt, &sub.UpdatedAt, &sub.CompanyID,
		); err != nil {
			return nil, err
		}
		if typeName.Valid {
			sub.SubscriptionTypeName = typeName.String
		} else {
			sub.SubscriptionTypeName = "Тип не указан"
		}
		if billingType.Valid {
			sub.BillingType = billingType.String
		}
		subs = append(subs, &sub)
	}
	return subs, nil
}
