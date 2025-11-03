package repository

import (
	"database/sql"
	"fmt"

	"classmate-central/internal/models"
)

type PermissionRepository struct {
	db *sql.DB
}

func NewPermissionRepository(db *sql.DB) *PermissionRepository {
	return &PermissionRepository{db: db}
}

// GetAll gets all permissions
func (r *PermissionRepository) GetAll() ([]*models.Permission, error) {
	query := `
		SELECT id, name, resource, action, description, created_at
		FROM permissions
		ORDER BY resource, action
	`

	rows, err := r.db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("error getting permissions: %w", err)
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

// GetByID gets a permission by ID
func (r *PermissionRepository) GetByID(id string) (*models.Permission, error) {
	perm := &models.Permission{}
	query := `
		SELECT id, name, resource, action, description, created_at
		FROM permissions
		WHERE id = $1
	`

	err := r.db.QueryRow(query, id).Scan(
		&perm.ID, &perm.Name, &perm.Resource, &perm.Action,
		&perm.Description, &perm.CreatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("error getting permission by id: %w", err)
	}

	return perm, nil
}

// GetByResourceAndAction gets a permission by resource and action
func (r *PermissionRepository) GetByResourceAndAction(resource, action string) (*models.Permission, error) {
	perm := &models.Permission{}
	query := `
		SELECT id, name, resource, action, description, created_at
		FROM permissions
		WHERE resource = $1 AND action = $2
	`

	err := r.db.QueryRow(query, resource, action).Scan(
		&perm.ID, &perm.Name, &perm.Resource, &perm.Action,
		&perm.Description, &perm.CreatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("error getting permission by resource and action: %w", err)
	}

	return perm, nil
}

// GetByResource gets all permissions for a specific resource
func (r *PermissionRepository) GetByResource(resource string) ([]*models.Permission, error) {
	query := `
		SELECT id, name, resource, action, description, created_at
		FROM permissions
		WHERE resource = $1
		ORDER BY action
	`

	rows, err := r.db.Query(query, resource)
	if err != nil {
		return nil, fmt.Errorf("error getting permissions by resource: %w", err)
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

