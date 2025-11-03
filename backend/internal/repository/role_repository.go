package repository

import (
	"database/sql"
	"fmt"
	"strings"

	"classmate-central/internal/models"
)

type RoleRepository struct {
	db *sql.DB
}

func NewRoleRepository(db *sql.DB) *RoleRepository {
	return &RoleRepository{db: db}
}

// GetAll gets all roles for a company
func (r *RoleRepository) GetAll(companyID string) ([]*models.Role, error) {
	query := `
		SELECT id, name, description, company_id, created_at, updated_at
		FROM roles
		WHERE company_id = $1
		ORDER BY name
	`

	rows, err := r.db.Query(query, companyID)
	if err != nil {
		return nil, fmt.Errorf("error getting roles: %w", err)
	}
	defer rows.Close()

	roles := []*models.Role{}
	for rows.Next() {
		role := &models.Role{}
		err := rows.Scan(
			&role.ID, &role.Name, &role.Description, &role.CompanyID,
			&role.CreatedAt, &role.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("error scanning role: %w", err)
		}
		roles = append(roles, role)
	}

	return roles, nil
}

// GetByID gets a role by ID with its permissions
func (r *RoleRepository) GetByID(id, companyID string) (*models.Role, error) {
	role := &models.Role{}
	query := `
		SELECT id, name, description, company_id, created_at, updated_at
		FROM roles
		WHERE id = $1 AND company_id = $2
	`

	err := r.db.QueryRow(query, id, companyID).Scan(
		&role.ID, &role.Name, &role.Description, &role.CompanyID,
		&role.CreatedAt, &role.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("error getting role by id: %w", err)
	}

	// Load permissions for the role
	permissions, err := r.GetRolePermissions(id)
	if err != nil {
		return nil, fmt.Errorf("error getting role permissions: %w", err)
	}
	role.Permissions = permissions

	return role, nil
}

// Create creates a new role
func (r *RoleRepository) Create(role *models.Role) error {
	query := `
		INSERT INTO roles (id, name, description, company_id, created_at, updated_at)
		VALUES ($1, $2, $3, $4, NOW(), NOW())
		RETURNING created_at, updated_at
	`

	// Generate ID: company_id_role_name
	roleID := fmt.Sprintf("%s_%s", role.CompanyID, strings.ToLower(strings.ReplaceAll(role.Name, " ", "_")))

	err := r.db.QueryRow(query, roleID, role.Name, role.Description, role.CompanyID).
		Scan(&role.CreatedAt, &role.UpdatedAt)
	if err != nil {
		return fmt.Errorf("error creating role: %w", err)
	}

	role.ID = roleID
	return nil
}

// Update updates an existing role
func (r *RoleRepository) Update(role *models.Role) error {
	query := `
		UPDATE roles
		SET name = $1, description = $2, updated_at = NOW()
		WHERE id = $3 AND company_id = $4
		RETURNING updated_at
	`

	err := r.db.QueryRow(query, role.Name, role.Description, role.ID, role.CompanyID).
		Scan(&role.UpdatedAt)
	if err != nil {
		return fmt.Errorf("error updating role: %w", err)
	}

	return nil
}

// Delete deletes a role
func (r *RoleRepository) Delete(id, companyID string) error {
	query := `DELETE FROM roles WHERE id = $1 AND company_id = $2`
	_, err := r.db.Exec(query, id, companyID)
	if err != nil {
		return fmt.Errorf("error deleting role: %w", err)
	}
	return nil
}

// GetRolePermissions gets all permissions for a role
func (r *RoleRepository) GetRolePermissions(roleID string) ([]*models.Permission, error) {
	query := `
		SELECT p.id, p.name, p.resource, p.action, p.description, p.created_at
		FROM permissions p
		INNER JOIN role_permissions rp ON p.id = rp.permission_id
		WHERE rp.role_id = $1
		ORDER BY p.resource, p.action
	`

	rows, err := r.db.Query(query, roleID)
	if err != nil {
		return nil, fmt.Errorf("error getting role permissions: %w", err)
	}
	defer rows.Close()

	permissions := []*models.Permission{}
	for rows.Next() {
		perm := &models.Permission{}
		err := rows.Scan(
			&perm.ID, &perm.Name, &perm.Resource, &perm.Action,
			&perm.Description, &perm.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("error scanning permission: %w", err)
		}
		permissions = append(permissions, perm)
	}

	return permissions, nil
}

// AssignPermissionToRole assigns a permission to a role
func (r *RoleRepository) AssignPermissionToRole(roleID, permissionID string) error {
	query := `
		INSERT INTO role_permissions (role_id, permission_id)
		VALUES ($1, $2)
		ON CONFLICT (role_id, permission_id) DO NOTHING
	`

	_, err := r.db.Exec(query, roleID, permissionID)
	if err != nil {
		return fmt.Errorf("error assigning permission to role: %w", err)
	}
	return nil
}

// RemovePermissionFromRole removes a permission from a role
func (r *RoleRepository) RemovePermissionFromRole(roleID, permissionID string) error {
	query := `DELETE FROM role_permissions WHERE role_id = $1 AND permission_id = $2`
	_, err := r.db.Exec(query, roleID, permissionID)
	if err != nil {
		return fmt.Errorf("error removing permission from role: %w", err)
	}
	return nil
}

// SetRolePermissions sets all permissions for a role (replaces existing)
func (r *RoleRepository) SetRolePermissions(roleID string, permissionIDs []string) error {
	// Start transaction
	tx, err := r.db.Begin()
	if err != nil {
		return fmt.Errorf("error starting transaction: %w", err)
	}
	defer tx.Rollback()

	// Delete existing permissions
	_, err = tx.Exec(`DELETE FROM role_permissions WHERE role_id = $1`, roleID)
	if err != nil {
		return fmt.Errorf("error deleting existing permissions: %w", err)
	}

	// Insert new permissions
	if len(permissionIDs) > 0 {
		query := `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)`
		stmt, err := tx.Prepare(query)
		if err != nil {
			return fmt.Errorf("error preparing statement: %w", err)
		}
		defer stmt.Close()

		for _, permID := range permissionIDs {
			_, err = stmt.Exec(roleID, permID)
			if err != nil {
				return fmt.Errorf("error inserting permission: %w", err)
			}
		}
	}

	return tx.Commit()
}

// GetUserRoles gets all roles for a user in a company
func (r *RoleRepository) GetUserRoles(userID int, companyID string) ([]*models.Role, error) {
	query := `
		SELECT r.id, r.name, r.description, r.company_id, r.created_at, r.updated_at
		FROM roles r
		INNER JOIN user_roles ur ON r.id = ur.role_id
		WHERE ur.user_id = $1 AND ur.company_id = $2
		ORDER BY r.name
	`

	rows, err := r.db.Query(query, userID, companyID)
	if err != nil {
		return nil, fmt.Errorf("error getting user roles: %w", err)
	}
	defer rows.Close()

	roles := []*models.Role{}
	for rows.Next() {
		role := &models.Role{}
		err := rows.Scan(
			&role.ID, &role.Name, &role.Description, &role.CompanyID,
			&role.CreatedAt, &role.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("error scanning role: %w", err)
		}
		roles = append(roles, role)
	}

	return roles, nil
}

// GetUserPermissions gets all permissions for a user (from all their roles)
func (r *RoleRepository) GetUserPermissions(userID int, companyID string) ([]string, error) {
	query := `
		SELECT DISTINCT p.name
		FROM permissions p
		INNER JOIN role_permissions rp ON p.id = rp.permission_id
		INNER JOIN user_roles ur ON rp.role_id = ur.role_id
		WHERE ur.user_id = $1 AND ur.company_id = $2
		ORDER BY p.name
	`

	rows, err := r.db.Query(query, userID, companyID)
	if err != nil {
		return nil, fmt.Errorf("error getting user permissions: %w", err)
	}
	defer rows.Close()

	permissions := []string{}
	for rows.Next() {
		var permName string
		err := rows.Scan(&permName)
		if err != nil {
			return nil, fmt.Errorf("error scanning permission: %w", err)
		}
		permissions = append(permissions, permName)
	}

	return permissions, nil
}

// CheckUserPermission checks if a user has a specific permission
func (r *RoleRepository) CheckUserPermission(userID int, companyID string, permissionName string) (bool, error) {
	query := `
		SELECT COUNT(*) > 0
		FROM permissions p
		INNER JOIN role_permissions rp ON p.id = rp.permission_id
		INNER JOIN user_roles ur ON rp.role_id = ur.role_id
		WHERE ur.user_id = $1 AND ur.company_id = $2 AND p.name = $3
	`

	var hasPermission bool
	err := r.db.QueryRow(query, userID, companyID, permissionName).Scan(&hasPermission)
	if err != nil {
		return false, fmt.Errorf("error checking user permission: %w", err)
	}

	return hasPermission, nil
}

