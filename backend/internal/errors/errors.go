package errors

import (
	"fmt"
	"net/http"
)

// ErrorCode represents application error codes
type ErrorCode string

const (
	// General errors
	ErrCodeInternal       ErrorCode = "INTERNAL_ERROR"
	ErrCodeNotFound      ErrorCode = "NOT_FOUND"
	ErrCodeBadRequest    ErrorCode = "BAD_REQUEST"
	ErrCodeUnauthorized  ErrorCode = "UNAUTHORIZED"
	ErrCodeForbidden     ErrorCode = "FORBIDDEN"
	ErrCodeConflict      ErrorCode = "CONFLICT"
	ErrCodeValidation    ErrorCode = "VALIDATION_ERROR"
	ErrCodeDatabase      ErrorCode = "DATABASE_ERROR"

	// Auth errors
	ErrCodeInvalidCredentials ErrorCode = "INVALID_CREDENTIALS"
	ErrCodeTokenExpired       ErrorCode = "TOKEN_EXPIRED"
	ErrCodeTokenInvalid       ErrorCode = "TOKEN_INVALID"

	// Business logic errors
	ErrCodeInsufficientBalance ErrorCode = "INSUFFICIENT_BALANCE"
	ErrCodeDuplicateEntry      ErrorCode = "DUPLICATE_ENTRY"
	ErrCodeInvalidState        ErrorCode = "INVALID_STATE"
)

// AppError represents an application error
type AppError struct {
	Code       ErrorCode `json:"code"`
	Message    string    `json:"message"`
	Details    string    `json:"details,omitempty"`
	HTTPStatus int       `json:"-"`
	Err        error     `json:"-"`
}

func (e *AppError) Error() string {
	if e.Details != "" {
		return fmt.Sprintf("%s: %s (%s)", e.Code, e.Message, e.Details)
	}
	return fmt.Sprintf("%s: %s", e.Code, e.Message)
}

func (e *AppError) Unwrap() error {
	return e.Err
}

// New creates a new AppError
func New(code ErrorCode, message string, httpStatus int) *AppError {
	return &AppError{
		Code:       code,
		Message:    message,
		HTTPStatus: httpStatus,
	}
}

// NewWithDetails creates a new AppError with details
func NewWithDetails(code ErrorCode, message, details string, httpStatus int) *AppError {
	return &AppError{
		Code:       code,
		Message:    message,
		Details:    details,
		HTTPStatus: httpStatus,
	}
}

// Wrap wraps an existing error into AppError
func Wrap(err error, code ErrorCode, message string, httpStatus int) *AppError {
	return &AppError{
		Code:       code,
		Message:    message,
		HTTPStatus: httpStatus,
		Err:        err,
		Details:    err.Error(),
	}
}

// Predefined error constructors
func NewInternalError(message string) *AppError {
	return New(ErrCodeInternal, message, http.StatusInternalServerError)
}

func NewNotFound(resource string) *AppError {
	return New(ErrCodeNotFound, fmt.Sprintf("%s not found", resource), http.StatusNotFound)
}

func NewBadRequest(message string) *AppError {
	return New(ErrCodeBadRequest, message, http.StatusBadRequest)
}

func NewUnauthorized(message string) *AppError {
	return New(ErrCodeUnauthorized, message, http.StatusUnauthorized)
}

func NewForbidden(message string) *AppError {
	return New(ErrCodeForbidden, message, http.StatusForbidden)
}

func NewConflict(message string) *AppError {
	return New(ErrCodeConflict, message, http.StatusConflict)
}

func NewValidationError(message, details string) *AppError {
	return NewWithDetails(ErrCodeValidation, message, details, http.StatusBadRequest)
}

func NewDatabaseError(err error) *AppError {
	return Wrap(err, ErrCodeDatabase, "Database operation failed", http.StatusInternalServerError)
}

func NewInvalidCredentials() *AppError {
	return New(ErrCodeInvalidCredentials, "Invalid email or password", http.StatusUnauthorized)
}

func NewTokenExpired() *AppError {
	return New(ErrCodeTokenExpired, "Token has expired", http.StatusUnauthorized)
}

func NewTokenInvalid() *AppError {
	return New(ErrCodeTokenInvalid, "Invalid token", http.StatusUnauthorized)
}

// IsAppError checks if error is AppError
func IsAppError(err error) bool {
	_, ok := err.(*AppError)
	return ok
}

// ToAppError converts error to AppError if it's not already one
func ToAppError(err error) *AppError {
	if appErr, ok := err.(*AppError); ok {
		return appErr
	}
	return NewInternalError("Internal server error")
}

