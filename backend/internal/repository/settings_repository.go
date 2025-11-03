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

func (r *SettingsRepository) Get(companyID string) (*models.Settings, error) {
	settings := &models.Settings{CompanyID: companyID}
	var logo sql.NullString

	// Get settings for specific company
	query := `SELECT id, center_name, logo, theme_color, company_id FROM settings WHERE company_id = $1 LIMIT 1`

	err := r.db.QueryRow(query, companyID).Scan(&settings.ID, &settings.CenterName, &logo, &settings.ThemeColor, &settings.CompanyID)
	if err == sql.ErrNoRows {
		// If settings don't exist, create default record for this company
		defaultSettings := &models.Settings{
			CenterName: "Образовательный Центр",
			ThemeColor: "#8B5CF6",
			Logo:       "",
			CompanyID:  companyID,
		}
		
		insertQuery := `
			INSERT INTO settings (center_name, logo, theme_color, company_id)
			VALUES ($1, $2, $3, $4)
			RETURNING id
		`
		err = r.db.QueryRow(insertQuery, defaultSettings.CenterName, defaultSettings.Logo, defaultSettings.ThemeColor, defaultSettings.CompanyID).Scan(&defaultSettings.ID)
		if err != nil {
			return nil, fmt.Errorf("error creating default settings: %w", err)
		}
		
		return defaultSettings, nil
	}
	if err != nil {
		return nil, fmt.Errorf("error getting settings: %w", err)
	}

	if logo.Valid {
		settings.Logo = logo.String
	}

	return settings, nil
}

func (r *SettingsRepository) Update(settings *models.Settings, companyID string) error {
	// First check if settings exist for this company
	var existingID int
	checkQuery := `SELECT id FROM settings WHERE company_id = $1 LIMIT 1`
	err := r.db.QueryRow(checkQuery, companyID).Scan(&existingID)
	
	if err == sql.ErrNoRows {
		// No settings exist for this company, create new record
		insertQuery := `
			INSERT INTO settings (center_name, logo, theme_color, company_id)
			VALUES ($1, $2, $3, $4)
			RETURNING id
		`
		err = r.db.QueryRow(insertQuery, settings.CenterName, settings.Logo, settings.ThemeColor, companyID).Scan(&settings.ID)
		if err != nil {
			return fmt.Errorf("error inserting settings: %w", err)
		}
		settings.CompanyID = companyID
	} else if err != nil {
		return fmt.Errorf("error checking for existing settings: %w", err)
	} else {
		// Settings exist for this company, update the record
		updateQuery := `
			UPDATE settings 
			SET center_name = $1, logo = $2, theme_color = $3
			WHERE id = $4 AND company_id = $5
		`
		result, err := r.db.Exec(updateQuery, settings.CenterName, settings.Logo, settings.ThemeColor, existingID, companyID)
		if err != nil {
			return fmt.Errorf("error updating settings: %w", err)
		}
		rowsAffected, _ := result.RowsAffected()
		if rowsAffected == 0 {
			return fmt.Errorf("settings not found or unauthorized")
		}
		settings.ID = existingID
		settings.CompanyID = companyID
	}

	return nil
}
