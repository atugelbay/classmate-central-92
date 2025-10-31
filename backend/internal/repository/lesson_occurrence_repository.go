package repository

import (
	"database/sql"
	"fmt"
	"time"

	"classmate-central/internal/models"
)

type LessonOccurrenceRepository struct {
	db *sql.DB
}

func NewLessonOccurrenceRepository(db *sql.DB) *LessonOccurrenceRepository {
	return &LessonOccurrenceRepository{db: db}
}

func (r *LessonOccurrenceRepository) Create(occurrence *models.LessonOccurrence, companyID string) error {
	query := `
		INSERT INTO lesson_occurrence (rule_id, starts_at, ends_at, status, company_id)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at, updated_at
	`
	err := r.db.QueryRow(
		query,
		occurrence.RuleID,
		occurrence.StartsAt,
		occurrence.EndsAt,
		occurrence.Status,
		companyID,
	).Scan(&occurrence.ID, &occurrence.CreatedAt, &occurrence.UpdatedAt)
	if err != nil {
		return fmt.Errorf("error creating lesson occurrence: %w", err)
	}
	return nil
}

func (r *LessonOccurrenceRepository) GetByID(id int64, companyID string) (*models.LessonOccurrence, error) {
	occurrence := &models.LessonOccurrence{}

	query := `SELECT id, rule_id, starts_at, ends_at, status, company_id, created_at, updated_at 
	          FROM lesson_occurrence WHERE id = $1 AND company_id = $2`
	err := r.db.QueryRow(query, id, companyID).Scan(
		&occurrence.ID,
		&occurrence.RuleID,
		&occurrence.StartsAt,
		&occurrence.EndsAt,
		&occurrence.Status,
		&occurrence.CompanyID,
		&occurrence.CreatedAt,
		&occurrence.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("error getting lesson occurrence: %w", err)
	}

	return occurrence, nil
}

func (r *LessonOccurrenceRepository) GetByRuleID(ruleID int64, companyID string) ([]*models.LessonOccurrence, error) {
	query := `
		SELECT id, rule_id, starts_at, ends_at, status, company_id, created_at, updated_at 
		FROM lesson_occurrence 
		WHERE rule_id = $1 AND company_id = $2
		ORDER BY starts_at ASC
	`
	rows, err := r.db.Query(query, ruleID, companyID)
	if err != nil {
		return nil, fmt.Errorf("error getting lesson occurrences: %w", err)
	}
	defer rows.Close()

	occurrences := []*models.LessonOccurrence{}
	for rows.Next() {
		occurrence := &models.LessonOccurrence{}

		err := rows.Scan(
			&occurrence.ID,
			&occurrence.RuleID,
			&occurrence.StartsAt,
			&occurrence.EndsAt,
			&occurrence.Status,
			&occurrence.CompanyID,
			&occurrence.CreatedAt,
			&occurrence.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("error scanning lesson occurrence: %w", err)
		}

		occurrences = append(occurrences, occurrence)
	}

	return occurrences, nil
}

func (r *LessonOccurrenceRepository) GetFutureByRuleID(ruleID int64, companyID string, fromTime time.Time) ([]*models.LessonOccurrence, error) {
	query := `
		SELECT id, rule_id, starts_at, ends_at, status, company_id, created_at, updated_at 
		FROM lesson_occurrence 
		WHERE rule_id = $1 AND company_id = $2 AND starts_at >= $3
		ORDER BY starts_at ASC
	`
	rows, err := r.db.Query(query, ruleID, companyID, fromTime)
	if err != nil {
		return nil, fmt.Errorf("error getting future lesson occurrences: %w", err)
	}
	defer rows.Close()

	occurrences := []*models.LessonOccurrence{}
	for rows.Next() {
		occurrence := &models.LessonOccurrence{}

		err := rows.Scan(
			&occurrence.ID,
			&occurrence.RuleID,
			&occurrence.StartsAt,
			&occurrence.EndsAt,
			&occurrence.Status,
			&occurrence.CompanyID,
			&occurrence.CreatedAt,
			&occurrence.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("error scanning lesson occurrence: %w", err)
		}

		occurrences = append(occurrences, occurrence)
	}

	return occurrences, nil
}

func (r *LessonOccurrenceRepository) GetInRange(start, end time.Time, companyID string) ([]*models.LessonOccurrence, error) {
	query := `
		SELECT id, rule_id, starts_at, ends_at, status, company_id, created_at, updated_at 
		FROM lesson_occurrence 
		WHERE company_id = $1 AND starts_at >= $2 AND starts_at < $3
		ORDER BY starts_at ASC
	`
	rows, err := r.db.Query(query, companyID, start, end)
	if err != nil {
		return nil, fmt.Errorf("error getting lesson occurrences in range: %w", err)
	}
	defer rows.Close()

	occurrences := []*models.LessonOccurrence{}
	for rows.Next() {
		occurrence := &models.LessonOccurrence{}

		err := rows.Scan(
			&occurrence.ID,
			&occurrence.RuleID,
			&occurrence.StartsAt,
			&occurrence.EndsAt,
			&occurrence.Status,
			&occurrence.CompanyID,
			&occurrence.CreatedAt,
			&occurrence.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("error scanning lesson occurrence: %w", err)
		}

		occurrences = append(occurrences, occurrence)
	}

	return occurrences, nil
}

func (r *LessonOccurrenceRepository) Update(occurrence *models.LessonOccurrence, companyID string) error {
	query := `
		UPDATE lesson_occurrence 
		SET rule_id = $2, starts_at = $3, ends_at = $4, status = $5, updated_at = CURRENT_TIMESTAMP
		WHERE id = $1 AND company_id = $6
	`
	_, err := r.db.Exec(
		query,
		occurrence.ID,
		occurrence.RuleID,
		occurrence.StartsAt,
		occurrence.EndsAt,
		occurrence.Status,
		companyID,
	)
	if err != nil {
		return fmt.Errorf("error updating lesson occurrence: %w", err)
	}
	return nil
}

func (r *LessonOccurrenceRepository) DeleteFutureByRuleID(ruleID int64, companyID string, fromTime time.Time) error {
	query := `
		DELETE FROM lesson_occurrence 
		WHERE rule_id = $1 AND company_id = $2 AND starts_at >= $3
	`
	_, err := r.db.Exec(query, ruleID, companyID, fromTime)
	if err != nil {
		return fmt.Errorf("error deleting future lesson occurrences: %w", err)
	}
	return nil
}

func (r *LessonOccurrenceRepository) Delete(id int64, companyID string) error {
	query := `DELETE FROM lesson_occurrence WHERE id = $1 AND company_id = $2`
	_, err := r.db.Exec(query, id, companyID)
	if err != nil {
		return fmt.Errorf("error deleting lesson occurrence: %w", err)
	}
	return nil
}

func (r *LessonOccurrenceRepository) BulkCreate(occurrences []*models.LessonOccurrence, companyID string) error {
	if len(occurrences) == 0 {
		return nil
	}

	tx, err := r.db.Begin()
	if err != nil {
		return fmt.Errorf("error starting transaction: %w", err)
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare(`
		INSERT INTO lesson_occurrence (rule_id, starts_at, ends_at, status, company_id)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at, updated_at
	`)
	if err != nil {
		return fmt.Errorf("error preparing statement: %w", err)
	}
	defer stmt.Close()

	for _, occurrence := range occurrences {
		err := stmt.QueryRow(
			occurrence.RuleID,
			occurrence.StartsAt,
			occurrence.EndsAt,
			occurrence.Status,
			companyID,
		).Scan(&occurrence.ID, &occurrence.CreatedAt, &occurrence.UpdatedAt)
		if err != nil {
			return fmt.Errorf("error creating lesson occurrence: %w", err)
		}
	}

	return tx.Commit()
}

