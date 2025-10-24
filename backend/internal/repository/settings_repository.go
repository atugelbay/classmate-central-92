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

	query := `SELECT id, center_name, logo, theme_color FROM settings LIMIT 1`

	err := r.db.QueryRow(query).Scan(&settings.ID, &settings.CenterName, &logo, &settings.ThemeColor)
	if err == sql.ErrNoRows {
		return nil, nil
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
	query := `
		UPDATE settings 
		SET center_name = $1, logo = $2, theme_color = $3
		WHERE id = 1
	`

	_, err := r.db.Exec(query, settings.CenterName, settings.Logo, settings.ThemeColor)
	if err != nil {
		return fmt.Errorf("error updating settings: %w", err)
	}

	return nil
}
