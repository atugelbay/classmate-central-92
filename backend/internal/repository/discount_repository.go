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
	query := `INSERT INTO discounts (id, name, description, type, value, is_active, company_id, branch_id) 
	          VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING created_at`
	return r.db.QueryRow(query, discount.ID, discount.Name, discount.Description, discount.Type, discount.Value, discount.IsActive, companyID, nullString(discount.BranchID)).
		Scan(&discount.CreatedAt)
}

func (r *DiscountRepository) GetAll(companyID string, branchID string) ([]models.Discount, error) {
	// If branchID is provided, filter by it (branch isolation)
	var (
		query string
		args  []interface{}
	)
	if branchID != "" {
		query = `SELECT id, name, description, type, value, is_active, created_at, company_id, branch_id
		         FROM discounts WHERE company_id = $1 AND branch_id = $2 ORDER BY created_at DESC`
		args = []interface{}{companyID, branchID}
	} else {
		query = `SELECT id, name, description, type, value, is_active, created_at, company_id, branch_id
		         FROM discounts WHERE company_id = $1 ORDER BY created_at DESC`
		args = []interface{}{companyID}
	}
	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	discounts := []models.Discount{}
	for rows.Next() {
		var discount models.Discount
		var branch sql.NullString
		if err := rows.Scan(&discount.ID, &discount.Name, &discount.Description, &discount.Type, &discount.Value, &discount.IsActive, &discount.CreatedAt, &discount.CompanyID, &branch); err != nil {
			return nil, err
		}
		if branch.Valid {
			discount.BranchID = branch.String
		}
		discounts = append(discounts, discount)
	}
	return discounts, nil
}

func (r *DiscountRepository) GetByID(id string, companyID string, branchID string) (*models.Discount, error) {
	var (
		query string
		args  []interface{}
	)
	if branchID != "" {
		query = `SELECT id, name, description, type, value, is_active, created_at, company_id, branch_id
		         FROM discounts WHERE id = $1 AND company_id = $2 AND branch_id = $3`
		args = []interface{}{id, companyID, branchID}
	} else {
		query = `SELECT id, name, description, type, value, is_active, created_at, company_id, branch_id
		         FROM discounts WHERE id = $1 AND company_id = $2`
		args = []interface{}{id, companyID}
	}
	var discount models.Discount
	var branch sql.NullString
	err := r.db.QueryRow(query, args...).Scan(&discount.ID, &discount.Name, &discount.Description, &discount.Type, &discount.Value, &discount.IsActive, &discount.CreatedAt, &discount.CompanyID, &branch)
	if err != nil {
		return nil, err
	}
	if branch.Valid {
		discount.BranchID = branch.String
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

// GetActiveStudentDiscountsWithDetails returns active discounts for a student with full discount details,
// filtering out expired discounts
func (r *DiscountRepository) GetActiveStudentDiscountsWithDetails(studentID string, companyID string) ([]models.Discount, error) {
	query := `SELECT d.id, d.name, d.description, d.type, d.value, d.is_active, d.created_at, d.company_id, d.branch_id
	          FROM student_discounts sd
	          JOIN discounts d ON sd.discount_id = d.id
	          WHERE sd.student_id = $1 
	            AND sd.company_id = $2 
	            AND sd.is_active = true 
	            AND d.is_active = true
	            AND (sd.expires_at IS NULL OR sd.expires_at > NOW())
	          ORDER BY sd.created_at DESC`
	rows, err := r.db.Query(query, studentID, companyID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	discounts := []models.Discount{}
	for rows.Next() {
		var d models.Discount
		var branch sql.NullString

		err := rows.Scan(&d.ID, &d.Name, &d.Description, &d.Type, &d.Value, &d.IsActive, &d.CreatedAt, &d.CompanyID, &branch)
		if err != nil {
			return nil, fmt.Errorf("error scanning discount: %w", err)
		}

		if branch.Valid {
			d.BranchID = branch.String
		}
		discounts = append(discounts, d)
	}
	return discounts, nil
}

func nullString(v string) sql.NullString {
	if v == "" {
		return sql.NullString{Valid: false}
	}
	return sql.NullString{String: v, Valid: true}
}

func (r *DiscountRepository) RemoveStudentDiscount(studentID string, discountID string, companyID string) error {
	query := `UPDATE student_discounts SET is_active = false 
	          WHERE student_id = $1 AND discount_id = $2 AND company_id = $3`
	_, err := r.db.Exec(query, studentID, discountID, companyID)
	return err
}
