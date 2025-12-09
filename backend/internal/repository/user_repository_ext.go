package repository

import (
	"database/sql"
	"fmt"

	"classmate-central/internal/models"
)

// VerifyEmail verifies a user's email by code
func (r *UserRepository) VerifyEmail(email, code string) error {
	query := `UPDATE users SET is_email_verified = TRUE, email_verification_token = NULL WHERE email = $1 AND email_verification_token = $2`
	result, err := r.db.Exec(query, email, code)
	if err != nil {
		return fmt.Errorf("error verifying email: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("error checking rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("invalid or expired verification token")
	}

	return nil
}

// GetByVerificationToken finds a user by verification token
func (r *UserRepository) GetByVerificationToken(token string) (*models.User, error) {
	return r.getByToken(token)
}

// UpdateVerificationCode sets a new verification code for a user
func (r *UserRepository) UpdateVerificationCode(userID int, code string) error {
	_, err := r.db.Exec(`UPDATE users SET email_verification_token = $1, updated_at = NOW() WHERE id = $2`, code, userID)
	if err != nil {
		return fmt.Errorf("error updating verification code: %w", err)
	}
	return nil
}

// CompleteInvite verifies token and sets new password, returns user for convenience
func (r *UserRepository) CompleteInvite(email, code, passwordHash string) (*models.User, error) {
	user := &models.User{}
	query := `
		UPDATE users
		SET password = $1,
			is_email_verified = TRUE,
			email_verification_token = NULL,
			updated_at = NOW()
		WHERE email = $2 AND email_verification_token = $3
		RETURNING id, email, name, company_id, role_id, is_email_verified, created_at, updated_at
	`

	var roleID sql.NullString
	err := r.db.QueryRow(query, passwordHash, email, code).Scan(
		&user.ID, &user.Email, &user.Name, &user.CompanyID, &roleID, &user.IsEmailVerified, &user.CreatedAt, &user.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("invalid or expired invite code")
	}
	if err != nil {
		return nil, fmt.Errorf("error completing invite: %w", err)
	}

	if roleID.Valid {
		user.RoleID = &roleID.String
	}

	return user, nil
}

// getByToken is an internal helper retained for compatibility
func (r *UserRepository) getByToken(token string) (*models.User, error) {
	user := &models.User{}
	query := `SELECT id, email, password, name, company_id, role_id, is_email_verified, created_at, updated_at FROM users WHERE email_verification_token = $1`

	var roleID sql.NullString
	err := r.db.QueryRow(query, token).Scan(
		&user.ID, &user.Email, &user.Password, &user.Name, &user.CompanyID, &roleID, &user.IsEmailVerified, &user.CreatedAt, &user.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("error getting user by token: %w", err)
	}

	if roleID.Valid {
		user.RoleID = &roleID.String
	}

	return user, nil
}
