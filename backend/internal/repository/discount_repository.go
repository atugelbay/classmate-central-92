package repository

import (
	"classmate-central/internal/models"
	"database/sql"
	"fmt"
)

type DiscountRepository struct {
	db *sql.DB
}

func NewDiscountRepository(db *sql.DB) *DiscountRepository {
	return &DiscountRepository{db: db}
}

func (r *DiscountRepository) Create(discount *models.Discount, companyID string) error {
	query := `INSERT INTO discounts (id, name, description, type, value, is_active, company_id) 
	          VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING created_at`
	return r.db.QueryRow(query, discount.ID, discount.Name, discount.Description, discount.Type, discount.Value, discount.IsActive, companyID).
		Scan(&discount.CreatedAt)
}

func (r *DiscountRepository) GetAll(companyID string) ([]models.Discount, error) {
	query := `SELECT id, name, description, type, value, is_active, created_at, company_id 
	          FROM discounts WHERE company_id = $1 ORDER BY created_at DESC`
	rows, err := r.db.Query(query, companyID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	discounts := []models.Discount{}
	for rows.Next() {
		var discount models.Discount
		if err := rows.Scan(&discount.ID, &discount.Name, &discount.Description, &discount.Type, &discount.Value, &discount.IsActive, &discount.CreatedAt, &discount.CompanyID); err != nil {
			return nil, err
		}
		discounts = append(discounts, discount)
	}
	return discounts, nil
}

func (r *DiscountRepository) GetByID(id string, companyID string) (*models.Discount, error) {
	query := `SELECT id, name, description, type, value, is_active, created_at, company_id 
	          FROM discounts WHERE id = $1 AND company_id = $2`
	var discount models.Discount
	err := r.db.QueryRow(query, id, companyID).Scan(&discount.ID, &discount.Name, &discount.Description, &discount.Type, &discount.Value, &discount.IsActive, &discount.CreatedAt, &discount.CompanyID)
	if err != nil {
		return nil, err
	}
	return &discount, nil
}

func (r *DiscountRepository) Update(discount *models.Discount, companyID string) error {
	query := `UPDATE discounts SET name = $1, description = $2, type = $3, value = $4, is_active = $5 
	          WHERE id = $6 AND company_id = $7`
	_, err := r.db.Exec(query, discount.Name, discount.Description, discount.Type, discount.Value, discount.IsActive, discount.ID, companyID)
	return err
}

func (r *DiscountRepository) Delete(id string, companyID string) error {
	query := `DELETE FROM discounts WHERE id = $1 AND company_id = $2`
	_, err := r.db.Exec(query, id, companyID)
	return err
}

// StudentDiscount methods
func (r *DiscountRepository) ApplyToStudent(studentDiscount *models.StudentDiscount, companyID string) error {
	query := `INSERT INTO student_discounts (student_id, discount_id, applied_at, expires_at, is_active, company_id) 
	          VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, created_at`
	return r.db.QueryRow(query, studentDiscount.StudentID, studentDiscount.DiscountID, studentDiscount.AppliedAt, studentDiscount.ExpiresAt, studentDiscount.IsActive, companyID).
		Scan(&studentDiscount.ID, &studentDiscount.CreatedAt)
}

func (r *DiscountRepository) GetStudentDiscounts(studentID string, companyID string) ([]models.StudentDiscount, error) {
	query := `SELECT sd.id, sd.student_id, sd.discount_id, sd.applied_at, sd.expires_at, sd.is_active, sd.created_at, sd.company_id,
	                 d.name as discount_name, d.type as discount_type, d.value as discount_value
	          FROM student_discounts sd
	          JOIN discounts d ON sd.discount_id = d.id
	          WHERE sd.student_id = $1 AND sd.company_id = $2 AND sd.is_active = true
	          ORDER BY sd.created_at DESC`
	rows, err := r.db.Query(query, studentID, companyID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	studentDiscounts := []models.StudentDiscount{}
	for rows.Next() {
		var sd models.StudentDiscount
		var expiresAt sql.NullTime
		var discountName, discountType sql.NullString
		var discountValue sql.NullFloat64

		err := rows.Scan(&sd.ID, &sd.StudentID, &sd.DiscountID, &sd.AppliedAt, &expiresAt, &sd.IsActive, &sd.CreatedAt, &sd.CompanyID,
			&discountName, &discountType, &discountValue)
		if err != nil {
			return nil, fmt.Errorf("error scanning student discount: %w", err)
		}

		if expiresAt.Valid {
			sd.ExpiresAt = &expiresAt.Time
		}
		studentDiscounts = append(studentDiscounts, sd)
	}
	return studentDiscounts, nil
}

func (r *DiscountRepository) RemoveStudentDiscount(studentID string, discountID string, companyID string) error {
	query := `UPDATE student_discounts SET is_active = false 
	          WHERE student_id = $1 AND discount_id = $2 AND company_id = $3`
	_, err := r.db.Exec(query, studentID, discountID, companyID)
	return err
}
