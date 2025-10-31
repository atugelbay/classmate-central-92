package repository

import (
	"database/sql"
	"fmt"
	"time"

	"classmate-central/internal/models"
)

type ScheduleRuleRepository struct {
	db *sql.DB
}

func NewScheduleRuleRepository(db *sql.DB) *ScheduleRuleRepository {
	return &ScheduleRuleRepository{db: db}
}

func (r *ScheduleRuleRepository) Create(rule *models.ScheduleRule, companyID string) error {
	query := `
		INSERT INTO schedule_rule (owner_type, owner_id, rrule, dtstart, dtend, duration_minutes, timezone, location, company_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, created_at, updated_at
	`
	err := r.db.QueryRow(
		query,
		rule.OwnerType,
		rule.OwnerID,
		rule.RRule,
		rule.DTStart,
		rule.DTEnd,
		rule.DurationMinutes,
		rule.Timezone,
		rule.Location,
		companyID,
	).Scan(&rule.ID, &rule.CreatedAt, &rule.UpdatedAt)
	if err != nil {
		return fmt.Errorf("error creating schedule rule: %w", err)
	}
	return nil
}

func (r *ScheduleRuleRepository) GetByID(id int64, companyID string) (*models.ScheduleRule, error) {
	rule := &models.ScheduleRule{}
	var dtend sql.NullTime
	var location sql.NullString

	query := `SELECT id, owner_type, owner_id, rrule, dtstart, dtend, duration_minutes, timezone, location, company_id, created_at, updated_at 
	          FROM schedule_rule WHERE id = $1 AND company_id = $2`
	err := r.db.QueryRow(query, id, companyID).Scan(
		&rule.ID,
		&rule.OwnerType,
		&rule.OwnerID,
		&rule.RRule,
		&rule.DTStart,
		&dtend,
		&rule.DurationMinutes,
		&rule.Timezone,
		&location,
		&rule.CompanyID,
		&rule.CreatedAt,
		&rule.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("error getting schedule rule: %w", err)
	}

	if dtend.Valid {
		rule.DTEnd = &dtend.Time
	}
	if location.Valid {
		rule.Location = &location.String
	}

	return rule, nil
}

func (r *ScheduleRuleRepository) GetByOwner(ownerType, ownerID string, companyID string) ([]*models.ScheduleRule, error) {
	query := `
		SELECT id, owner_type, owner_id, rrule, dtstart, dtend, duration_minutes, timezone, location, company_id, created_at, updated_at 
		FROM schedule_rule 
		WHERE owner_type = $1 AND owner_id = $2 AND company_id = $3
		ORDER BY dtstart DESC
	`
	rows, err := r.db.Query(query, ownerType, ownerID, companyID)
	if err != nil {
		return nil, fmt.Errorf("error getting schedule rules: %w", err)
	}
	defer rows.Close()

	rules := []*models.ScheduleRule{}
	for rows.Next() {
		rule := &models.ScheduleRule{}
		var dtend sql.NullTime
		var location sql.NullString

		err := rows.Scan(
			&rule.ID,
			&rule.OwnerType,
			&rule.OwnerID,
			&rule.RRule,
			&rule.DTStart,
			&dtend,
			&rule.DurationMinutes,
			&rule.Timezone,
			&location,
			&rule.CompanyID,
			&rule.CreatedAt,
			&rule.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("error scanning schedule rule: %w", err)
		}

		if dtend.Valid {
			rule.DTEnd = &dtend.Time
		}
		if location.Valid {
			rule.Location = &location.String
		}

		rules = append(rules, rule)
	}

	return rules, nil
}

func (r *ScheduleRuleRepository) GetActiveRules(companyID string) ([]*models.ScheduleRule, error) {
	now := time.Now()
	query := `
		SELECT id, owner_type, owner_id, rrule, dtstart, dtend, duration_minutes, timezone, location, company_id, created_at, updated_at 
		FROM schedule_rule 
		WHERE company_id = $1 AND (dtend IS NULL OR dtend > $2)
		ORDER BY dtstart DESC
	`
	rows, err := r.db.Query(query, companyID, now)
	if err != nil {
		return nil, fmt.Errorf("error getting active schedule rules: %w", err)
	}
	defer rows.Close()

	rules := []*models.ScheduleRule{}
	for rows.Next() {
		rule := &models.ScheduleRule{}
		var dtend sql.NullTime
		var location sql.NullString

		err := rows.Scan(
			&rule.ID,
			&rule.OwnerType,
			&rule.OwnerID,
			&rule.RRule,
			&rule.DTStart,
			&dtend,
			&rule.DurationMinutes,
			&rule.Timezone,
			&location,
			&rule.CompanyID,
			&rule.CreatedAt,
			&rule.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("error scanning schedule rule: %w", err)
		}

		if dtend.Valid {
			rule.DTEnd = &dtend.Time
		}
		if location.Valid {
			rule.Location = &location.String
		}

		rules = append(rules, rule)
	}

	return rules, nil
}

func (r *ScheduleRuleRepository) Update(rule *models.ScheduleRule, companyID string) error {
	query := `
		UPDATE schedule_rule 
		SET owner_type = $2, owner_id = $3, rrule = $4, dtstart = $5, dtend = $6, duration_minutes = $7, timezone = $8, location = $9, updated_at = CURRENT_TIMESTAMP
		WHERE id = $1 AND company_id = $10
	`
	_, err := r.db.Exec(
		query,
		rule.ID,
		rule.OwnerType,
		rule.OwnerID,
		rule.RRule,
		rule.DTStart,
		rule.DTEnd,
		rule.DurationMinutes,
		rule.Timezone,
		rule.Location,
		companyID,
	)
	if err != nil {
		return fmt.Errorf("error updating schedule rule: %w", err)
	}
	return nil
}

func (r *ScheduleRuleRepository) Delete(id int64, companyID string) error {
	query := `DELETE FROM schedule_rule WHERE id = $1 AND company_id = $2`
	_, err := r.db.Exec(query, id, companyID)
	if err != nil {
		return fmt.Errorf("error deleting schedule rule: %w", err)
	}
	return nil
}

