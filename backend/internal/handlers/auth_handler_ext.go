package handlers

import (
	"net/http"

	"classmate-central/internal/logger"
	"classmate-central/internal/validation"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// VerifyEmail handles email verification
func (h *AuthHandler) VerifyEmail(c *gin.Context) {
	var req struct {
		Email string `json:"email" binding:"required,email"`
		Code  string `json:"code" binding:"required,len=6"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": validation.FormatValidationErrors(err)})
		return
	}

	// Verify code
	if err := h.userRepo.VerifyEmail(req.Email, req.Code); err != nil {
		logger.Error("Email verification failed", logger.ErrorField(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid or expired verification code"})
		return
	}

	user, _ := h.userRepo.GetByEmail(req.Email)

	c.JSON(http.StatusOK, gin.H{
		"message": "Email verified successfully",
		"user":    user,
	})
}

// ResendVerificationEmail sends a new verification email
func (h *AuthHandler) ResendVerificationEmail(c *gin.Context) {
	var req struct {
		Email string `json:"email" binding:"required,email"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": validation.FormatValidationErrors(err)})
		return
	}

	user, err := h.userRepo.GetByEmail(req.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}
	if user == nil {
		// Don't reveal if user exists
		c.JSON(http.StatusOK, gin.H{"message": "If this email is registered, a verification link has been sent"})
		return
	}

	if user.IsEmailVerified {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email is already verified"})
		return
	}

	// Generate new code and persist
	newCode := generateVerificationCode()
	_ = h.userRepo.UpdateVerificationCode(user.ID, newCode)

	// Send email
	go func() {
		if err := h.emailService.SendVerificationCode(user.Email, newCode); err != nil {
			logger.Error("Failed to resend verification email", logger.ErrorField(err), zap.String("email", user.Email))
		}
	}()

	c.JSON(http.StatusOK, gin.H{"message": "A new verification code has been sent to your email"})
}
