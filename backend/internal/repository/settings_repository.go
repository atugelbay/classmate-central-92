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

func (r *SettingsRepository) Get() (*models.Settings, error) {
	settings := &models.Settings{}
	var logo sql.NullString

	// Get the first (and should be only) settings record
	query := `SELECT id, center_name, logo, theme_color FROM settings ORDER BY id LIMIT 1`

	err := r.db.QueryRow(query).Scan(&settings.ID, &settings.CenterName, &logo, &settings.ThemeColor)
	if err == sql.ErrNoRows {
		// If settings don't exist, create default record
		defaultSettings := &models.Settings{
			CenterName: "Образовательный Центр",
			ThemeColor: "#8B5CF6",
			Logo:       "",
		}
		
		insertQuery := `
			INSERT INTO settings (center_name, logo, theme_color)
			VALUES ($1, $2, $3)
			RETURNING id
		`
		err = r.db.QueryRow(insertQuery, defaultSettings.CenterName, defaultSettings.Logo, defaultSettings.ThemeColor).Scan(&defaultSettings.ID)
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

func (r *SettingsRepository) Update(settings *models.Settings) error {
	// First check if any settings exist
	var existingID int
	checkQuery := `SELECT id FROM settings ORDER BY id LIMIT 1`
	err := r.db.QueryRow(checkQuery).Scan(&existingID)
	
	if err == sql.ErrNoRows {
		// No settings exist, create new record
		insertQuery := `
			INSERT INTO settings (center_name, logo, theme_color)
			VALUES ($1, $2, $3)
			RETURNING id
		`
		err = r.db.QueryRow(insertQuery, settings.CenterName, settings.Logo, settings.ThemeColor).Scan(&settings.ID)
		if err != nil {
			return fmt.Errorf("error inserting settings: %w", err)
		}
	} else if err != nil {
		return fmt.Errorf("error checking for existing settings: %w", err)
	} else {
		// Settings exist, update the first record
		updateQuery := `
			UPDATE settings 
			SET center_name = $1, logo = $2, theme_color = $3
			WHERE id = $4
		`
		_, err = r.db.Exec(updateQuery, settings.CenterName, settings.Logo, settings.ThemeColor, existingID)
		if err != nil {
			return fmt.Errorf("error updating settings: %w", err)
		}
		settings.ID = existingID
	}

	return nil
}
