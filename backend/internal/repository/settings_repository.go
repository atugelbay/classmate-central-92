package repository

import (
	"database/sql"
	"fmt"

	"classmate-central/internal/models"
)

type SettingsRepository struct {
	db *sql.DB
}

func NewSettingsRepository(db *sql.DB) *SettingsRepository {
	return &SettingsRepository{db: db}
}

func (r *SettingsRepository) Get(companyID, branchID string) (*models.Settings, error) {
	settings := &models.Settings{CompanyID: companyID, BranchID: branchID}
	var logo sql.NullString

	// Get settings for specific company and branch
	query := `SELECT id, center_name, logo, theme_color, timezone, company_id, branch_id FROM settings WHERE company_id = $1 AND branch_id = $2 LIMIT 1`

	var tz string
	err := r.db.QueryRow(query, companyID, branchID).Scan(&settings.ID, &settings.CenterName, &logo, &settings.ThemeColor, &tz, &settings.CompanyID, &settings.BranchID)
	if err == sql.ErrNoRows {
		// If settings don't exist, create default record for this company and branch
		defaultSettings := &models.Settings{
			CenterName: "Образовательный Центр",
			ThemeColor: "#8B5CF6",
			Logo:       "",
			Timezone:   "Asia/Almaty",
			CompanyID:  companyID,
			BranchID:   branchID,
		}

		insertQuery := `
            INSERT INTO settings (center_name, logo, theme_color, timezone, company_id, branch_id)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
        `
		err = r.db.QueryRow(insertQuery, defaultSettings.CenterName, defaultSettings.Logo, defaultSettings.ThemeColor, defaultSettings.Timezone, defaultSettings.CompanyID, defaultSettings.BranchID).Scan(&defaultSettings.ID)
		if err != nil {
			return nil, fmt.Errorf("error creating default settings: %w", err)
		}

		return defaultSettings, nil
	}
	if err != nil {
		return nil, fmt.Errorf("error getting settings: %w", err)
	}

	settings.Timezone = tz
	if logo.Valid {
		settings.Logo = logo.String
	}

	return settings, nil
}

func (r *SettingsRepository) Update(settings *models.Settings, companyID, branchID string) error {
	// First check if settings exist for this company and branch
	var existingID int
	checkQuery := `SELECT id FROM settings WHERE company_id = $1 AND branch_id = $2 LIMIT 1`
	err := r.db.QueryRow(checkQuery, companyID, branchID).Scan(&existingID)

	if err == sql.ErrNoRows {
		// No settings exist for this company and branch, create new record
		insertQuery := `
            INSERT INTO settings (center_name, logo, theme_color, timezone, company_id, branch_id)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
        `
		err = r.db.QueryRow(insertQuery, settings.CenterName, settings.Logo, settings.ThemeColor, settings.Timezone, companyID, branchID).Scan(&settings.ID)
		if err != nil {
			return fmt.Errorf("error inserting settings: %w", err)
		}
		settings.CompanyID = companyID
		settings.BranchID = branchID
	} else if err != nil {
		return fmt.Errorf("error checking for existing settings: %w", err)
	} else {
		// Settings exist for this company and branch, update the record
		updateQuery := `
            UPDATE settings 
            SET center_name = $1, logo = $2, theme_color = $3, timezone = $4
            WHERE id = $5 AND company_id = $6 AND branch_id = $7
        `
		result, err := r.db.Exec(updateQuery, settings.CenterName, settings.Logo, settings.ThemeColor, settings.Timezone, existingID, companyID, branchID)
		if err != nil {
			return fmt.Errorf("error updating settings: %w", err)
		}
		rowsAffected, _ := result.RowsAffected()
		if rowsAffected == 0 {
			return fmt.Errorf("settings not found or unauthorized")
		}
		settings.ID = existingID
		settings.CompanyID = companyID
		settings.BranchID = branchID
	}

	return nil
}
