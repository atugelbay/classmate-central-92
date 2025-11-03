package validation

import (
	"database/sql"
	"fmt"
	"strings"

	"github.com/go-playground/validator/v10"
)

// RegisterCustomValidators registers custom validators for Gin
func RegisterCustomValidators(v *validator.Validate) {
	// Email validator
	v.RegisterValidation("email", func(fl validator.FieldLevel) bool {
		email := fl.Field().String()
		return ValidateEmail(email) == nil
	})

	// Phone validator
	v.RegisterValidation("phone", func(fl validator.FieldLevel) bool {
		phone := fl.Field().String()
		return ValidatePhone(phone) == nil
	})

	// Positive amount validator
	v.RegisterValidation("positive_amount", func(fl validator.FieldLevel) bool {
		amount := fl.Field().Float()
		return ValidatePositiveAmount(amount) == nil
	})

	// Non-negative amount validator
	v.RegisterValidation("non_negative_amount", func(fl validator.FieldLevel) bool {
		amount := fl.Field().Float()
		return ValidateAmount(amount) == nil
	})
}

// ValidateRecordExists checks if a record exists in the database
func ValidateRecordExists(db *sql.DB, table, idColumn, idValue, companyID string) error {
	var count int
	query := fmt.Sprintf(
		"SELECT COUNT(*) FROM %s WHERE %s = $1 AND company_id = $2",
		table, idColumn,
	)
	err := db.QueryRow(query, idValue, companyID).Scan(&count)
	if err != nil {
		return fmt.Errorf("error checking record existence: %w", err)
	}
	if count == 0 {
		return fmt.Errorf("record not found in %s", table)
	}
	return nil
}

// ValidateNotExists checks if a record does NOT exist (for unique constraints)
func ValidateNotExists(db *sql.DB, table, column, value, companyID string, excludeID *string) error {
	query := fmt.Sprintf(
		"SELECT COUNT(*) FROM %s WHERE %s = $1 AND company_id = $2",
		table, column,
	)
	args := []interface{}{value, companyID}
	
	if excludeID != nil {
		query += fmt.Sprintf(" AND id != $3")
		args = append(args, *excludeID)
	}
	
	var count int
	err := db.QueryRow(query, args...).Scan(&count)
	if err != nil {
		return fmt.Errorf("error checking uniqueness: %w", err)
	}
	if count > 0 {
		return fmt.Errorf("%s already exists", column)
	}
	return nil
}

// FormatValidationErrors formats validator errors into a readable string
func FormatValidationErrors(err error) string {
	if validationErr, ok := err.(validator.ValidationErrors); ok {
		var messages []string
		for _, e := range validationErr {
			field := strings.ToLower(e.Field())
			switch e.Tag() {
			case "required":
				messages = append(messages, fmt.Sprintf("%s is required", field))
			case "email":
				messages = append(messages, fmt.Sprintf("%s must be a valid email", field))
			case "min":
				messages = append(messages, fmt.Sprintf("%s must be at least %s characters", field, e.Param()))
			case "max":
				messages = append(messages, fmt.Sprintf("%s must be at most %s characters", field, e.Param()))
			case "phone":
				messages = append(messages, fmt.Sprintf("%s must be a valid phone number", field))
			case "positive_amount":
				messages = append(messages, fmt.Sprintf("%s must be positive", field))
			case "non_negative_amount":
				messages = append(messages, fmt.Sprintf("%s cannot be negative", field))
			default:
				messages = append(messages, fmt.Sprintf("%s is invalid", field))
			}
		}
		return strings.Join(messages, "; ")
	}
	return err.Error()
}

