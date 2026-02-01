package repository

import (
	"database/sql"
	"encoding/json"
	"fmt"

	"classmate-central/internal/models"
)

type LicenseRepository struct {
	db *sql.DB
}

func NewLicenseRepository(db *sql.DB) *LicenseRepository {
	return &LicenseRepository{db: db}
}

// DB returns the underlying database connection
func (r *LicenseRepository) DB() *sql.DB {
	return r.db
}

// GetAllPlans retrieves all active plans ordered by sort_order
func (r *LicenseRepository) GetAllPlans() ([]*models.Plan, error) {
	query := `
		SELECT id, name, description, price_monthly, price_yearly, 
		       max_students, max_users, max_teachers, max_branches,
		       features, is_active, sort_order, created_at
		FROM plans
		WHERE is_active = true
		ORDER BY sort_order ASC
	`

	rows, err := r.db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("error getting plans: %w", err)
	}
	defer rows.Close()

	plans := []*models.Plan{}
	for rows.Next() {
		plan := &models.Plan{}
		var featuresJSON []byte
		err := rows.Scan(
			&plan.ID, &plan.Name, &plan.Description, &plan.PriceMonthly, &plan.PriceYearly,
			&plan.MaxStudents, &plan.MaxUsers, &plan.MaxTeachers, &plan.MaxBranches,
			&featuresJSON, &plan.IsActive, &plan.SortOrder, &plan.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("error scanning plan: %w", err)
		}

		// Parse features JSON
		if len(featuresJSON) > 0 {
			if err := json.Unmarshal(featuresJSON, &plan.Features); err != nil {
				plan.Features = make(map[string]interface{})
			}
		} else {
			plan.Features = make(map[string]interface{})
		}

		plans = append(plans, plan)
	}

	return plans, nil
}

// GetPlanByID retrieves a plan by ID
func (r *LicenseRepository) GetPlanByID(id string) (*models.Plan, error) {
	plan := &models.Plan{}
	var featuresJSON []byte

	query := `
		SELECT id, name, description, price_monthly, price_yearly,
		       max_students, max_users, max_teachers, max_branches,
		       features, is_active, sort_order, created_at
		FROM plans
		WHERE id = $1
	`

	err := r.db.QueryRow(query, id).Scan(
		&plan.ID, &plan.Name, &plan.Description, &plan.PriceMonthly, &plan.PriceYearly,
		&plan.MaxStudents, &plan.MaxUsers, &plan.MaxTeachers, &plan.MaxBranches,
		&featuresJSON, &plan.IsActive, &plan.SortOrder, &plan.CreatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("error getting plan by id: %w", err)
	}

	// Parse features JSON
	if len(featuresJSON) > 0 {
		if err := json.Unmarshal(featuresJSON, &plan.Features); err != nil {
			plan.Features = make(map[string]interface{})
		}
	} else {
		plan.Features = make(map[string]interface{})
	}

	return plan, nil
}

// GetLicenseByCompanyID retrieves the license for a company with plan details
func (r *LicenseRepository) GetLicenseByCompanyID(companyID string) (*models.CompanyLicenseWithPlan, error) {
	license := &models.CompanyLicenseWithPlan{}
	var featuresJSON []byte

	query := `
		SELECT 
			cl.id, cl.company_id, cl.plan_id, cl.status,
			cl.trial_ends_at, cl.current_period_start, cl.current_period_end,
			cl.custom_max_students, cl.custom_max_users, cl.custom_max_teachers, cl.custom_max_branches,
			cl.notes, cl.created_at, cl.updated_at,
			p.name as plan_name, p.features, 
			p.max_students, p.max_users, p.max_teachers, p.max_branches,
			p.price_monthly
		FROM company_licenses cl
		JOIN plans p ON cl.plan_id = p.id
		WHERE cl.company_id = $1
	`

	err := r.db.QueryRow(query, companyID).Scan(
		&license.ID, &license.CompanyID, &license.PlanID, &license.Status,
		&license.TrialEndsAt, &license.CurrentPeriodStart, &license.CurrentPeriodEnd,
		&license.CustomMaxStudents, &license.CustomMaxUsers, &license.CustomMaxTeachers, &license.CustomMaxBranches,
		&license.Notes, &license.CreatedAt, &license.UpdatedAt,
		&license.PlanName, &featuresJSON,
		&license.MaxStudents, &license.MaxUsers, &license.MaxTeachers, &license.MaxBranches,
		&license.PriceMonthly,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("error getting license by company id: %w", err)
	}

	// Parse features JSON
	if len(featuresJSON) > 0 {
		if err := json.Unmarshal(featuresJSON, &license.PlanFeatures); err != nil {
			license.PlanFeatures = make(map[string]interface{})
		}
	} else {
		license.PlanFeatures = make(map[string]interface{})
	}

	// Apply custom limits if set
	if license.CustomMaxStudents != nil {
		license.MaxStudents = license.CustomMaxStudents
	}
	if license.CustomMaxUsers != nil {
		license.MaxUsers = license.CustomMaxUsers
	}
	if license.CustomMaxTeachers != nil {
		license.MaxTeachers = license.CustomMaxTeachers
	}
	if license.CustomMaxBranches != nil {
		license.MaxBranches = license.CustomMaxBranches
	}

	return license, nil
}

// GetCompanyUsage retrieves current usage metrics for a company
func (r *LicenseRepository) GetCompanyUsage(companyID string) (*models.CompanyUsage, error) {
	usage := &models.CompanyUsage{}

	// Get students count
	err := r.db.QueryRow(`SELECT COUNT(*) FROM students WHERE company_id = $1`, companyID).Scan(&usage.StudentsCount)
	if err != nil {
		return nil, fmt.Errorf("error counting students: %w", err)
	}

	// Get users count
	err = r.db.QueryRow(`SELECT COUNT(*) FROM users WHERE company_id = $1`, companyID).Scan(&usage.UsersCount)
	if err != nil {
		return nil, fmt.Errorf("error counting users: %w", err)
	}

	// Get teachers count
	err = r.db.QueryRow(`SELECT COUNT(*) FROM teachers WHERE company_id = $1`, companyID).Scan(&usage.TeachersCount)
	if err != nil {
		return nil, fmt.Errorf("error counting teachers: %w", err)
	}

	// Get branches count
	err = r.db.QueryRow(`SELECT COUNT(*) FROM branches WHERE company_id = $1`, companyID).Scan(&usage.BranchesCount)
	if err != nil {
		return nil, fmt.Errorf("error counting branches: %w", err)
	}

	return usage, nil
}

// CreateLicense creates a new license for a company
func (r *LicenseRepository) CreateLicense(companyID, planID string, periodMonths int) (*models.CompanyLicense, error) {
	license := &models.CompanyLicense{}

	query := `
		INSERT INTO company_licenses (
			company_id, plan_id, status, 
			current_period_start, current_period_end,
			created_at, updated_at
		)
		VALUES ($1, $2, 'active', NOW(), NOW() + INTERVAL '1 month' * $3, NOW(), NOW())
		ON CONFLICT (company_id) 
		DO UPDATE SET
			plan_id = EXCLUDED.plan_id,
			status = 'active',
			current_period_start = NOW(),
			current_period_end = NOW() + INTERVAL '1 month' * $3,
			updated_at = NOW()
		RETURNING id, company_id, plan_id, status, current_period_start, current_period_end, created_at, updated_at
	`

	err := r.db.QueryRow(query, companyID, planID, periodMonths).Scan(
		&license.ID, &license.CompanyID, &license.PlanID, &license.Status,
		&license.CurrentPeriodStart, &license.CurrentPeriodEnd,
		&license.CreatedAt, &license.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("error creating license: %w", err)
	}

	return license, nil
}

// UpdateLicensePlan updates the plan for an existing license
func (r *LicenseRepository) UpdateLicensePlan(companyID, planID string) error {
	query := `
		UPDATE company_licenses
		SET plan_id = $1, updated_at = NOW()
		WHERE company_id = $2
	`

	result, err := r.db.Exec(query, planID, companyID)
	if err != nil {
		return fmt.Errorf("error updating license plan: %w", err)
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return fmt.Errorf("no license found for company")
	}

	return nil
}

// HasLicense checks if a company has a license
func (r *LicenseRepository) HasLicense(companyID string) (bool, error) {
	var count int
	err := r.db.QueryRow(`SELECT COUNT(*) FROM company_licenses WHERE company_id = $1`, companyID).Scan(&count)
	if err != nil {
		return false, fmt.Errorf("error checking license: %w", err)
	}
	return count > 0, nil
}
