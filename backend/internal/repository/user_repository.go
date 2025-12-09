package repository

import (
	"database/sql"
	"fmt"

	"classmate-central/internal/models"
)

type UserRepository struct {
	db *sql.DB
}

func NewUserRepository(db *sql.DB) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) Create(user *models.User) error {
	query := `
		INSERT INTO users (email, password, name, company_id, role_id, is_email_verified, email_verification_token, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
		RETURNING id, created_at, updated_at
	`

	err := r.db.QueryRow(query, user.Email, user.Password, user.Name, user.CompanyID, user.RoleID, user.IsEmailVerified, user.EmailVerificationToken).
		Scan(&user.ID, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		return fmt.Errorf("error creating user: %w", err)
	}

	return nil
}

func (r *UserRepository) GetByEmail(email string) (*models.User, error) {
	user := &models.User{}
	query := `SELECT id, email, password, name, company_id, role_id, is_email_verified, created_at, updated_at FROM users WHERE email = $1`

	var roleID sql.NullString
	err := r.db.QueryRow(query, email).Scan(
		&user.ID, &user.Email, &user.Password, &user.Name, &user.CompanyID, &roleID, &user.IsEmailVerified, &user.CreatedAt, &user.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("error getting user by email: %w", err)
	}

	if roleID.Valid {
		user.RoleID = &roleID.String
	}

	return user, nil
}

func (r *UserRepository) GetByID(id int) (*models.User, error) {
	user := &models.User{}
	query := `SELECT id, email, password, name, company_id, role_id, is_email_verified, created_at, updated_at FROM users WHERE id = $1`

	var roleID sql.NullString
	err := r.db.QueryRow(query, id).Scan(
		&user.ID, &user.Email, &user.Password, &user.Name, &user.CompanyID, &roleID, &user.IsEmailVerified, &user.CreatedAt, &user.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("error getting user by id: %w", err)
	}

	if roleID.Valid {
		user.RoleID = &roleID.String
	}

	return user, nil
}

// GetUserWithRoles gets a user with all their roles and permissions
func (r *UserRepository) GetUserWithRoles(id int, companyID string) (*models.User, error) {
	user, err := r.GetByID(id)
	if err != nil || user == nil {
		return user, err
	}

	// Get roles for the user
	roleRepo := NewRoleRepository(r.db)
	roles, err := roleRepo.GetUserRoles(id, companyID)
	if err != nil {
		return nil, fmt.Errorf("error getting user roles: %w", err)
	}
	user.Roles = roles

	// Get permissions for the user
	permissions, err := roleRepo.GetUserPermissions(id, companyID)
	if err != nil {
		return nil, fmt.Errorf("error getting user permissions: %w", err)
	}
	user.Permissions = permissions

	return user, nil
}

// UpdateRoleID updates the primary role ID for a user
func (r *UserRepository) UpdateRoleID(userID int, roleID *string) error {
	query := `UPDATE users SET role_id = $1, updated_at = NOW() WHERE id = $2`
	_, err := r.db.Exec(query, roleID, userID)
	if err != nil {
		return fmt.Errorf("error updating user role: %w", err)
	}
	return nil
}

// AssignRoleToUser assigns a role to a user
func (r *UserRepository) AssignRoleToUser(userID int, roleID string, companyID string, assignedBy *int) error {
	query := `
		INSERT INTO user_roles (user_id, role_id, company_id, assigned_by, assigned_at)
		VALUES ($1, $2, $3, $4, NOW())
		ON CONFLICT (user_id, role_id, company_id) DO NOTHING
	`

	_, err := r.db.Exec(query, userID, roleID, companyID, assignedBy)
	if err != nil {
		return fmt.Errorf("error assigning role to user: %w", err)
	}

	// Update primary role_id if this is the first role
	user, err := r.GetByID(userID)
	if err != nil {
		return err
	}
	if user != nil && user.RoleID == nil {
		err = r.UpdateRoleID(userID, &roleID)
		if err != nil {
			return err
		}
	}

	return nil
}

// RemoveRoleFromUser removes a role from a user
func (r *UserRepository) RemoveRoleFromUser(userID int, roleID string, companyID string) error {
	query := `DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2 AND company_id = $3`
	_, err := r.db.Exec(query, userID, roleID, companyID)
	if err != nil {
		return fmt.Errorf("error removing role from user: %w", err)
	}

	// If this was the primary role, update primary role_id
	user, err := r.GetByID(userID)
	if err != nil {
		return err
	}
	if user != nil && user.RoleID != nil && *user.RoleID == roleID {
		// Get remaining roles and set first one as primary
		roleRepo := NewRoleRepository(r.db)
		roles, err := roleRepo.GetUserRoles(userID, companyID)
		if err != nil {
			return err
		}
		if len(roles) > 0 {
			err = r.UpdateRoleID(userID, &roles[0].ID)
		} else {
			err = r.UpdateRoleID(userID, nil)
		}
		if err != nil {
			return err
		}
	}

	return nil
}

// GetAll gets all users for a company with their roles
func (r *UserRepository) GetAll(companyID string) ([]*models.User, error) {
	query := `
		SELECT id, email, name, company_id, role_id, is_email_verified, created_at, updated_at
		FROM users
		WHERE company_id = $1
		ORDER BY created_at DESC
	`

	rows, err := r.db.Query(query, companyID)
	if err != nil {
		return nil, fmt.Errorf("error getting users: %w", err)
	}
	defer rows.Close()

	users := []*models.User{}
	for rows.Next() {
		user := &models.User{}
		var roleID sql.NullString
		err := rows.Scan(
			&user.ID, &user.Email, &user.Name, &user.CompanyID, &roleID,
			&user.IsEmailVerified, &user.CreatedAt, &user.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("error scanning user: %w", err)
		}

		if roleID.Valid {
			user.RoleID = &roleID.String
		}

		// Load roles for the user
		roleRepo := NewRoleRepository(r.db)
		roles, err := roleRepo.GetUserRoles(user.ID, companyID)
		if err == nil {
			user.Roles = roles
		}

		users = append(users, user)
	}

	return users, nil
}
