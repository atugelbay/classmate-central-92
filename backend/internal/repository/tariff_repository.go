package repository

import (
	"classmate-central/internal/models"
	"database/sql"
)

type TariffRepository struct {
	db *sql.DB
}

func NewTariffRepository(db *sql.DB) *TariffRepository {
	return &TariffRepository{db: db}
}

func (r *TariffRepository) Create(tariff *models.Tariff) error {
	query := `INSERT INTO tariffs (id, name, description, price, duration_days, lesson_count) 
	          VALUES ($1, $2, $3, $4, $5, $6) RETURNING created_at`
	return r.db.QueryRow(query, tariff.ID, tariff.Name, tariff.Description, tariff.Price, tariff.DurationDays, tariff.LessonCount).
		Scan(&tariff.CreatedAt)
}

func (r *TariffRepository) GetAll() ([]models.Tariff, error) {
	query := `SELECT id, name, description, price, duration_days, lesson_count, created_at 
	          FROM tariffs ORDER BY created_at DESC`
	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	tariffs := []models.Tariff{}
	for rows.Next() {
		var tariff models.Tariff
		if err := rows.Scan(&tariff.ID, &tariff.Name, &tariff.Description, &tariff.Price, &tariff.DurationDays, &tariff.LessonCount, &tariff.CreatedAt); err != nil {
			return nil, err
		}
		tariffs = append(tariffs, tariff)
	}
	return tariffs, nil
}

func (r *TariffRepository) GetByID(id string) (*models.Tariff, error) {
	query := `SELECT id, name, description, price, duration_days, lesson_count, created_at 
	          FROM tariffs WHERE id = $1`
	var tariff models.Tariff
	err := r.db.QueryRow(query, id).Scan(&tariff.ID, &tariff.Name, &tariff.Description, &tariff.Price, &tariff.DurationDays, &tariff.LessonCount, &tariff.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &tariff, nil
}

func (r *TariffRepository) Update(tariff *models.Tariff) error {
	query := `UPDATE tariffs SET name = $1, description = $2, price = $3, duration_days = $4, lesson_count = $5 
	          WHERE id = $6`
	_, err := r.db.Exec(query, tariff.Name, tariff.Description, tariff.Price, tariff.DurationDays, tariff.LessonCount, tariff.ID)
	return err
}

func (r *TariffRepository) Delete(id string) error {
	query := `DELETE FROM tariffs WHERE id = $1`
	_, err := r.db.Exec(query, id)
	return err
}
