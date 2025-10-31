package repository

import (
	"database/sql"
	"fmt"
	"time"

	"classmate-central/internal/models"
)

type SubscriptionConsumptionRepository struct {
	db *sql.DB
}

func NewSubscriptionConsumptionRepository(db *sql.DB) *SubscriptionConsumptionRepository {
	return &SubscriptionConsumptionRepository{db: db}
}

func (r *SubscriptionConsumptionRepository) Create(consumption *models.SubscriptionConsumption, companyID string) error {
	query := `
		INSERT INTO subscription_consumption (subscription_id, attendance_id, units, company_id)
		VALUES ($1, $2, $3, $4)
		RETURNING id, created_at
	`
	err := r.db.QueryRow(
		query,
		consumption.SubscriptionID,
		consumption.AttendanceID,
		consumption.Units,
		companyID,
	).Scan(&consumption.ID, &consumption.CreatedAt)
	if err != nil {
		return fmt.Errorf("error creating subscription consumption: %w", err)
	}
	return nil
}

func (r *SubscriptionConsumptionRepository) GetByID(id int64, companyID string) (*models.SubscriptionConsumption, error) {
	consumption := &models.SubscriptionConsumption{}

	query := `SELECT id, subscription_id, attendance_id, units, company_id, created_at 
	          FROM subscription_consumption WHERE id = $1 AND company_id = $2`
	err := r.db.QueryRow(query, id, companyID).Scan(
		&consumption.ID,
		&consumption.SubscriptionID,
		&consumption.AttendanceID,
		&consumption.Units,
		&consumption.CompanyID,
		&consumption.CreatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("error getting subscription consumption: %w", err)
	}

	return consumption, nil
}

func (r *SubscriptionConsumptionRepository) GetBySubscriptionID(subscriptionID string, companyID string) ([]*models.SubscriptionConsumption, error) {
	query := `
		SELECT id, subscription_id, attendance_id, units, company_id, created_at 
		FROM subscription_consumption 
		WHERE subscription_id = $1 AND company_id = $2
		ORDER BY created_at DESC
	`
	rows, err := r.db.Query(query, subscriptionID, companyID)
	if err != nil {
		return nil, fmt.Errorf("error getting subscription consumptions: %w", err)
	}
	defer rows.Close()

	consumptions := []*models.SubscriptionConsumption{}
	for rows.Next() {
		consumption := &models.SubscriptionConsumption{}

		err := rows.Scan(
			&consumption.ID,
			&consumption.SubscriptionID,
			&consumption.AttendanceID,
			&consumption.Units,
			&consumption.CompanyID,
			&consumption.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("error scanning subscription consumption: %w", err)
		}

		consumptions = append(consumptions, consumption)
	}

	return consumptions, nil
}

func (r *SubscriptionConsumptionRepository) GetByAttendanceID(attendanceID int, companyID string) (*models.SubscriptionConsumption, error) {
	consumption := &models.SubscriptionConsumption{}

	query := `SELECT id, subscription_id, attendance_id, units, company_id, created_at 
	          FROM subscription_consumption WHERE attendance_id = $1 AND company_id = $2`
	err := r.db.QueryRow(query, attendanceID, companyID).Scan(
		&consumption.ID,
		&consumption.SubscriptionID,
		&consumption.AttendanceID,
		&consumption.Units,
		&consumption.CompanyID,
		&consumption.CreatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("error getting subscription consumption: %w", err)
	}

	return consumption, nil
}

func (r *SubscriptionConsumptionRepository) GetTotalUnitsBySubscription(subscriptionID string, companyID string) (int, error) {
	var total int
	query := `
		SELECT COALESCE(SUM(units), 0)
		FROM subscription_consumption
		WHERE subscription_id = $1 AND company_id = $2
	`
	err := r.db.QueryRow(query, subscriptionID, companyID).Scan(&total)
	if err != nil {
		return 0, fmt.Errorf("error getting total units: %w", err)
	}
	return total, nil
}

func (r *SubscriptionConsumptionRepository) GetInRange(start, end time.Time, companyID string) ([]*models.SubscriptionConsumption, error) {
	query := `
		SELECT id, subscription_id, attendance_id, units, company_id, created_at 
		FROM subscription_consumption 
		WHERE company_id = $1 AND created_at >= $2 AND created_at < $3
		ORDER BY created_at DESC
	`
	rows, err := r.db.Query(query, companyID, start, end)
	if err != nil {
		return nil, fmt.Errorf("error getting subscription consumptions in range: %w", err)
	}
	defer rows.Close()

	consumptions := []*models.SubscriptionConsumption{}
	for rows.Next() {
		consumption := &models.SubscriptionConsumption{}

		err := rows.Scan(
			&consumption.ID,
			&consumption.SubscriptionID,
			&consumption.AttendanceID,
			&consumption.Units,
			&consumption.CompanyID,
			&consumption.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("error scanning subscription consumption: %w", err)
		}

		consumptions = append(consumptions, consumption)
	}

	return consumptions, nil
}

func (r *SubscriptionConsumptionRepository) Delete(id int64, companyID string) error {
	query := `DELETE FROM subscription_consumption WHERE id = $1 AND company_id = $2`
	_, err := r.db.Exec(query, id, companyID)
	if err != nil {
		return fmt.Errorf("error deleting subscription consumption: %w", err)
	}
	return nil
}

