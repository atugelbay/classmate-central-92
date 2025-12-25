package repository

import (
	"database/sql"
	"fmt"

	"classmate-central/internal/logger"
	"classmate-central/internal/models"

	"go.uber.org/zap"
)

type BranchRepository struct {
	db *sql.DB
}

func NewBranchRepository(db *sql.DB) *BranchRepository {
	return &BranchRepository{db: db}
}

// GetBranchesByCompany gets all branches for a company
func (r *BranchRepository) GetBranchesByCompany(companyID string) ([]*models.Branch, error) {
	query := `
		SELECT id, name, company_id, address, phone, status, created_at, updated_at
		FROM branches
		WHERE company_id = $1
		ORDER BY name
	`

	rows, err := r.db.Query(query, companyID)
	if err != nil {
		logger.Error("Failed to query branches by company", logger.ErrorField(err), zap.String("companyId", companyID))
		return nil, err
	}
	defer rows.Close()

	var branches []*models.Branch
	for rows.Next() {
		var branch models.Branch
		var address sql.NullString
		var phone sql.NullString
		err := rows.Scan(
			&branch.ID,
			&branch.Name,
			&branch.CompanyID,
			&address,
			&phone,
			&branch.Status,
			&branch.CreatedAt,
			&branch.UpdatedAt,
		)
		if err != nil {
			logger.Error("Failed to scan branch", logger.ErrorField(err))
			return nil, err
		}
		if address.Valid {
			branch.Address = address.String
		}
		if phone.Valid {
			branch.Phone = phone.String
		}
		branches = append(branches, &branch)
	}

	return branches, nil
}

// GetUserBranches gets all branches accessible to a user
func (r *BranchRepository) GetUserBranches(userID int, companyID string) ([]*models.Branch, error) {
	// Check if user has admin role - if so, return all branches for company
	query := `
		SELECT COUNT(*) FROM user_roles ur
		JOIN roles r ON ur.role_id = r.id
		WHERE ur.user_id = $1 AND ur.company_id = $2 AND r.name = 'admin'
	`
	var adminCount int
	err := r.db.QueryRow(query, userID, companyID).Scan(&adminCount)
	if err != nil && err != sql.ErrNoRows {
		logger.Error("Failed to check admin role", logger.ErrorField(err))
		return nil, err
	}

	if adminCount > 0 {
		// User is admin, return all branches
		return r.GetBranchesByCompany(companyID)
	}

	// Otherwise, return only branches the user is assigned to
	query = `
		SELECT DISTINCT b.id, b.name, b.company_id, b.address, b.phone, b.status, b.created_at, b.updated_at
		FROM branches b
		JOIN user_branches ub ON b.id = ub.branch_id
		WHERE ub.user_id = $1 AND ub.company_id = $2
		ORDER BY b.name
	`

	rows, err := r.db.Query(query, userID, companyID)
	if err != nil {
		logger.Error("Failed to query user branches", logger.ErrorField(err))
		return nil, err
	}
	defer rows.Close()

	var branches []*models.Branch
	for rows.Next() {
		var branch models.Branch
		var address sql.NullString
		var phone sql.NullString
		err := rows.Scan(
			&branch.ID,
			&branch.Name,
			&branch.CompanyID,
			&address,
			&phone,
			&branch.Status,
			&branch.CreatedAt,
			&branch.UpdatedAt,
		)
		if err != nil {
			logger.Error("Failed to scan branch", logger.ErrorField(err))
			return nil, err
		}
		if address.Valid {
			branch.Address = address.String
		}
		if phone.Valid {
			branch.Phone = phone.String
		}
		branches = append(branches, &branch)
	}

	return branches, nil
}

// GetBranchByID gets a specific branch by ID
func (r *BranchRepository) GetBranchByID(branchID string, companyID string) (*models.Branch, error) {
	query := `
		SELECT id, name, company_id, address, phone, status, created_at, updated_at
		FROM branches
		WHERE id = $1 AND company_id = $2
	`

	var branch models.Branch
	var address sql.NullString
	var phone sql.NullString
	err := r.db.QueryRow(query, branchID, companyID).Scan(
		&branch.ID,
		&branch.Name,
		&branch.CompanyID,
		&address,
		&phone,
		&branch.Status,
		&branch.CreatedAt,
		&branch.UpdatedAt,
	)
	
	if err == nil {
		if address.Valid {
			branch.Address = address.String
		}
		if phone.Valid {
			branch.Phone = phone.String
		}
	}

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("branch not found")
	}
	if err != nil {
		logger.Error("Failed to query branch by ID", logger.ErrorField(err))
		return nil, err
	}

	return &branch, nil
}

// CreateBranch creates a new branch
func (r *BranchRepository) CreateBranch(branch *models.Branch) error {
	query := `
		INSERT INTO branches (id, name, company_id, address, phone, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
		ON CONFLICT (id) DO UPDATE SET
			name = EXCLUDED.name,
			status = EXCLUDED.status,
			updated_at = NOW()
	`

	_, err := r.db.Exec(
		query,
		branch.ID,
		branch.Name,
		branch.CompanyID,
		branch.Address,
		branch.Phone,
		branch.Status,
	)

	if err != nil {
		logger.Error("Failed to create branch", logger.ErrorField(err))
		return err
	}

	return nil
}

// UpdateBranch updates an existing branch
func (r *BranchRepository) UpdateBranch(branch *models.Branch) error {
	query := `
		UPDATE branches
		SET name = $1, address = $2, phone = $3, status = $4, updated_at = NOW()
		WHERE id = $5 AND company_id = $6
	`

	result, err := r.db.Exec(
		query,
		branch.Name,
		branch.Address,
		branch.Phone,
		branch.Status,
		branch.ID,
		branch.CompanyID,
	)

	if err != nil {
		logger.Error("Failed to update branch", logger.ErrorField(err))
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("branch not found")
	}

	return nil
}

// DeleteBranch deletes a branch
func (r *BranchRepository) DeleteBranch(branchID string, companyID string) error {
	query := `DELETE FROM branches WHERE id = $1 AND company_id = $2`

	result, err := r.db.Exec(query, branchID, companyID)
	if err != nil {
		logger.Error("Failed to delete branch", logger.ErrorField(err))
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("branch not found")
	}

	return nil
}

// AssignUserToBranch assigns a user to a branch
func (r *BranchRepository) AssignUserToBranch(userID int, branchID string, roleID *string, companyID string, assignedBy *int) error {
	query := `
		INSERT INTO user_branches (user_id, branch_id, role_id, company_id, assigned_at, assigned_by)
		VALUES ($1, $2, $3, $4, NOW(), $5)
		ON CONFLICT (user_id, branch_id, company_id) 
		DO UPDATE SET role_id = $3, assigned_at = NOW(), assigned_by = $5
	`

	_, err := r.db.Exec(query, userID, branchID, roleID, companyID, assignedBy)
	if err != nil {
		logger.Error("Failed to assign user to branch", logger.ErrorField(err))
		return err
	}

	return nil
}

// RemoveUserFromBranch removes a user's access to a branch
func (r *BranchRepository) RemoveUserFromBranch(userID int, branchID string, companyID string) error {
	query := `
		DELETE FROM user_branches
		WHERE user_id = $1 AND branch_id = $2 AND company_id = $3
	`

	result, err := r.db.Exec(query, userID, branchID, companyID)
	if err != nil {
		logger.Error("Failed to remove user from branch", logger.ErrorField(err))
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("user branch assignment not found")
	}

	return nil
}

// GetBranchUsers gets all users assigned to a branch
func (r *BranchRepository) GetBranchUsers(branchID string, companyID string) ([]int, error) {
	query := `
		SELECT DISTINCT user_id
		FROM user_branches
		WHERE branch_id = $1 AND company_id = $2
	`

	rows, err := r.db.Query(query, branchID, companyID)
	if err != nil {
		logger.Error("Failed to query branch users", logger.ErrorField(err))
		return nil, err
	}
	defer rows.Close()

	var userIDs []int
	for rows.Next() {
		var userID int
		err := rows.Scan(&userID)
		if err != nil {
			logger.Error("Failed to scan user ID", logger.ErrorField(err))
			return nil, err
		}
		userIDs = append(userIDs, userID)
	}

	return userIDs, nil
}

// CheckUserBranchAccess checks if a user has access to a specific branch
func (r *BranchRepository) CheckUserBranchAccess(userID int, branchID string, companyID string) (bool, error) {
	// Check if user has admin role - if so, they have access to all branches
	query := `
		SELECT COUNT(*) FROM user_roles ur
		JOIN roles r ON ur.role_id = r.id
		WHERE ur.user_id = $1 AND ur.company_id = $2 AND r.name = 'admin'
	`
	var adminCount int
	err := r.db.QueryRow(query, userID, companyID).Scan(&adminCount)
	if err != nil && err != sql.ErrNoRows {
		logger.Error("Failed to check admin role", logger.ErrorField(err))
		return false, err
	}

	if adminCount > 0 {
		// User is admin, check if branch belongs to their company
		query = `SELECT COUNT(*) FROM branches WHERE id = $1 AND company_id = $2`
		var branchCount int
		err = r.db.QueryRow(query, branchID, companyID).Scan(&branchCount)
		if err != nil {
			logger.Error("Failed to check branch", logger.ErrorField(err))
			return false, err
		}
		return branchCount > 0, nil
	}

	// Otherwise, check if user is explicitly assigned to the branch
	query = `
		SELECT COUNT(*) FROM user_branches
		WHERE user_id = $1 AND branch_id = $2 AND company_id = $3
	`
	var count int
	err = r.db.QueryRow(query, userID, branchID, companyID).Scan(&count)
	if err != nil {
		logger.Error("Failed to check user branch access", logger.ErrorField(err))
		return false, err
	}

	return count > 0, nil
}

// GetDefaultBranchForUser gets the first branch accessible to a user (for initial login)
func (r *BranchRepository) GetDefaultBranchForUser(userID int, companyID string) (*models.Branch, error) {
	branches, err := r.GetUserBranches(userID, companyID)
	if err != nil {
		return nil, err
	}

	if len(branches) == 0 {
		return nil, fmt.Errorf("user has no accessible branches")
	}

	return branches[0], nil
}

