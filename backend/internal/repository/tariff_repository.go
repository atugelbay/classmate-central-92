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

func (r *TariffRepository) Create(tariff *models.Tariff, companyID string) error {
	query := `INSERT INTO tariffs (id, name, description, price, duration_days, lesson_count, company_id) 
	          VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING created_at`
	return r.db.QueryRow(query, tariff.ID, tariff.Name, tariff.Description, tariff.Price, tariff.DurationDays, tariff.LessonCount, companyID).
		Scan(&tariff.CreatedAt)
}

func (r *TariffRepository) GetAll(companyID string) ([]models.Tariff, error) {
	query := `SELECT id, name, description, price, duration_days, lesson_count, created_at 
	          FROM tariffs WHERE company_id = $1 ORDER BY created_at DESC`
	rows, err := r.db.Query(query, companyID)
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

func (r *TariffRepository) GetByID(id string, companyID string) (*models.Tariff, error) {
	query := `SELECT id, name, description, price, duration_days, lesson_count, created_at 
	          FROM tariffs WHERE id = $1 AND company_id = $2`
	var tariff models.Tariff
	err := r.db.QueryRow(query, id, companyID).Scan(&tariff.ID, &tariff.Name, &tariff.Description, &tariff.Price, &tariff.DurationDays, &tariff.LessonCount, &tariff.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &tariff, nil
}

func (r *TariffRepository) Update(tariff *models.Tariff, companyID string) error {
	query := `UPDATE tariffs SET name = $1, description = $2, price = $3, duration_days = $4, lesson_count = $5 
	          WHERE id = $6 AND company_id = $7`
	_, err := r.db.Exec(query, tariff.Name, tariff.Description, tariff.Price, tariff.DurationDays, tariff.LessonCount, tariff.ID, companyID)
	return err
}

func (r *TariffRepository) Delete(id string, companyID string) error {
	query := `DELETE FROM tariffs WHERE id = $1 AND company_id = $2`
	_, err := r.db.Exec(query, id, companyID)
	return err
}
