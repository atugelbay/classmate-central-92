package validation

import (
	"fmt"
	"regexp"
	"strings"
	"time"
)

var (
	emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)
	phoneRegex = regexp.MustCompile(`^\+?[1-9]\d{1,14}$`)
)

// ValidateEmail validates email format
func ValidateEmail(email string) error {
	if email == "" {
		return fmt.Errorf("email is required")
	}
	if !emailRegex.MatchString(email) {
		return fmt.Errorf("invalid email format")
	}
	if len(email) > 255 {
		return fmt.Errorf("email is too long (max 255 characters)")
	}
	return nil
}

// ValidatePhone validates phone number format
func ValidatePhone(phone string) error {
	if phone == "" {
		return fmt.Errorf("phone is required")
	}
	// Remove spaces and dashes
	cleaned := strings.ReplaceAll(strings.ReplaceAll(phone, " ", ""), "-", "")
	if !phoneRegex.MatchString(cleaned) {
		return fmt.Errorf("invalid phone number format")
	}
	return nil
}

// ValidateName validates name (not empty, reasonable length)
func ValidateName(name string) error {
	if name == "" {
		return fmt.Errorf("name is required")
	}
	if len(name) < 2 {
		return fmt.Errorf("name must be at least 2 characters")
	}
	if len(name) > 255 {
		return fmt.Errorf("name is too long (max 255 characters)")
	}
	return nil
}

// ValidateAge validates age
func ValidateAge(age int) error {
	if age < 1 {
		return fmt.Errorf("age must be positive")
	}
	if age > 150 {
		return fmt.Errorf("age is invalid")
	}
	return nil
}

// ValidateAmount validates monetary amount
func ValidateAmount(amount float64) error {
	if amount < 0 {
		return fmt.Errorf("amount cannot be negative")
	}
	if amount > 1000000000 {
		return fmt.Errorf("amount is too large")
	}
	return nil
}

// ValidatePositiveAmount validates positive monetary amount
func ValidatePositiveAmount(amount float64) error {
	if amount <= 0 {
		return fmt.Errorf("amount must be positive")
	}
	if amount > 1000000000 {
		return fmt.Errorf("amount is too large")
	}
	return nil
}

// ValidateDateRange validates that start date is before end date
func ValidateDateRange(start, end time.Time) error {
	if start.After(end) {
		return fmt.Errorf("start date must be before end date")
	}
	return nil
}

// ValidateNotEmpty validates that a string is not empty
func ValidateNotEmpty(value, fieldName string) error {
	if strings.TrimSpace(value) == "" {
		return fmt.Errorf("%s is required", fieldName)
	}
	return nil
}

// ValidateLength validates string length
func ValidateLength(value string, min, max int, fieldName string) error {
	length := len(strings.TrimSpace(value))
	if length < min {
		return fmt.Errorf("%s must be at least %d characters", fieldName, min)
	}
	if length > max {
		return fmt.Errorf("%s must be at most %d characters", fieldName, max)
	}
	return nil
}

// ValidateInRange validates that an integer is in a range
func ValidateInRange(value, min, max int, fieldName string) error {
	if value < min || value > max {
		return fmt.Errorf("%s must be between %d and %d", fieldName, min, max)
	}
	return nil
}

// ValidatePositiveInt validates that an integer is positive
func ValidatePositiveInt(value int, fieldName string) error {
	if value <= 0 {
		return fmt.Errorf("%s must be positive", fieldName)
	}
	return nil
}

// ValidateOneOf validates that a value is one of the allowed values
func ValidateOneOf(value string, allowed []string, fieldName string) error {
	for _, allowedValue := range allowed {
		if value == allowedValue {
			return nil
		}
	}
	return fmt.Errorf("%s must be one of: %s", fieldName, strings.Join(allowed, ", "))
}

