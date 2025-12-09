package handlers

import (
	"crypto/rand"
	"math/big"
	"net/http"

	"classmate-central/internal/logger"
	"classmate-central/internal/middleware"
	"classmate-central/internal/models"
	"classmate-central/internal/repository"
	"classmate-central/internal/services"
	"classmate-central/internal/validation"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	userRepo     *repository.UserRepository
	companyRepo  *repository.CompanyRepository
	roleRepo     *repository.RoleRepository
	settingsRepo *repository.SettingsRepository
	emailService *services.EmailService
}

func NewAuthHandler(userRepo *repository.UserRepository, companyRepo *repository.CompanyRepository, roleRepo *repository.RoleRepository, settingsRepo *repository.SettingsRepository, emailService *services.EmailService) *AuthHandler {
	return &AuthHandler{
		userRepo:     userRepo,
		companyRepo:  companyRepo,
		roleRepo:     roleRepo,
		settingsRepo: settingsRepo,
		emailService: emailService,
	}
}

// Helper to generate 6-char alphanumeric code
func generateVerificationCode() string {
	const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // avoid confusing chars
	code := make([]byte, 6)
	for i := 0; i < 6; i++ {
		n, err := rand.Int(rand.Reader, big.NewInt(int64(len(letters))))
		if err != nil {
			code[i] = letters[i%len(letters)]
			continue
		}
		code[i] = letters[n.Int64()]
	}
	return string(code)
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req models.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": validation.FormatValidationErrors(err)})
		return
	}

	// Additional validation
	if err := validation.ValidateName(req.Name); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := validation.ValidateEmail(req.Email); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if len(req.Password) < 6 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "password must be at least 6 characters"})
		return
	}
	if err := validation.ValidateName(req.CompanyName); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "company name: " + err.Error()})
		return
	}

	// Check if user already exists
	existingUser, err := h.userRepo.GetByEmail(req.Email)
	if err != nil {
		logger.Error("Error checking existing user", logger.ErrorField(err), zap.String("email", req.Email))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}
	if existingUser != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "User already exists"})
		return
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		logger.Error("Error hashing password", logger.ErrorField(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error hashing password"})
		return
	}

	// Create a new company for this user
	company := &models.Company{
		Name:   req.CompanyName, // Company name from registration form
		Status: "active",
	}

	if err := h.companyRepo.Create(company); err != nil {
		logger.Error("Error creating company", logger.ErrorField(err), zap.String("companyName", req.CompanyName))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error creating company: " + err.Error()})
		return
	}

	logger.Info("Company created", zap.String("companyId", company.ID), zap.String("companyName", company.Name))

	// Create default settings for the new company
	defaultSettings := &models.Settings{
		CenterName: req.CompanyName,
		ThemeColor: "#8B5CF6",
		Logo:       "",
		CompanyID:  company.ID,
	}
	if err := h.settingsRepo.Update(defaultSettings, company.ID); err != nil {
		// Log error but don't fail registration - settings can be created later
		logger.Warn("Failed to create default settings", logger.ErrorField(err), zap.String("companyId", company.ID))
	}

	// Create default roles for the new company using SQL function
	_, err = h.companyRepo.DB().Exec("SELECT create_default_roles_for_company($1)", company.ID)
	if err != nil {
		logger.Warn("Failed to create default roles for company", logger.ErrorField(err), zap.String("companyId", company.ID))
		// Continue registration even if role creation fails
	} else {
		logger.Info("Default roles created", zap.String("companyId", company.ID))
	}

	// For the first user of the company, grant admin role by default
	adminRoleID := company.ID + "_admin"
	adminRole, err := h.roleRepo.GetByID(adminRoleID, company.ID)
	if err != nil || adminRole == nil {
		logger.Warn("admin role not found after creation attempt", logger.ErrorField(err), zap.String("companyId", company.ID), zap.String("roleId", adminRoleID))
	}

	// Create user with company_id and default role
	verificationCode := generateVerificationCode()
	user := &models.User{
		Email:                  req.Email,
		Password:               string(hashedPassword),
		Name:                   req.Name,
		CompanyID:              company.ID,
		IsEmailVerified:        false,
		EmailVerificationToken: &verificationCode,
	}
	if adminRole != nil {
		user.RoleID = &adminRoleID
	}

	if err := h.userRepo.Create(user); err != nil {
		logger.Error("Error creating user", logger.ErrorField(err), zap.String("email", req.Email), zap.String("companyId", company.ID))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error creating user: " + err.Error()})
		return
	}

	// Send verification email
	go func() {
		if err := h.emailService.SendVerificationCode(user.Email, verificationCode); err != nil {
			logger.Error("Failed to send verification email", logger.ErrorField(err), zap.String("email", user.Email))
		}
	}()

	logger.Info("User created", zap.Int("userId", user.ID), zap.String("email", user.Email), zap.String("companyId", company.ID))

	// Assign admin role to the first user
	if adminRole != nil {
		err = h.userRepo.AssignRoleToUser(user.ID, adminRoleID, company.ID, nil)
		if err != nil {
			// Log error but don't fail registration
			_ = err
		}
	}

	// Load user with roles and permissions
	userWithRoles, err := h.userRepo.GetUserWithRoles(user.ID, company.ID)
	if err != nil {
		userWithRoles = user
	}

	// Get permissions for token
	permissions := []string{}
	if userWithRoles != nil {
		permissions = userWithRoles.Permissions
	}

	// Generate tokens with role and permissions
	token, err := middleware.GenerateToken(user.ID, user.Email, user.RoleID, permissions)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error generating token"})
		return
	}

	refreshToken, err := middleware.GenerateRefreshToken(user.ID, user.Email, user.RoleID, permissions)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error generating refresh token"})
		return
	}

	if userWithRoles != nil {
		user = userWithRoles
	}

	c.JSON(http.StatusCreated, models.AuthResponse{
		Token:        token,
		RefreshToken: refreshToken,
		User:         user,
	})
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": validation.FormatValidationErrors(err)})
		return
	}

	// Additional validation
	if err := validation.ValidateEmail(req.Email); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.Password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "password is required"})
		return
	}

	// Get user
	user, err := h.userRepo.GetByEmail(req.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// Check password
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// Load user with roles and permissions
	userWithRoles, err := h.userRepo.GetUserWithRoles(user.ID, user.CompanyID)
	if err != nil {
		userWithRoles = user
	}

	// Get permissions for token
	permissions := []string{}
	if userWithRoles != nil {
		permissions = userWithRoles.Permissions
	}

	// Generate tokens with role and permissions
	token, err := middleware.GenerateToken(user.ID, user.Email, user.RoleID, permissions)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error generating token"})
		return
	}

	refreshToken, err := middleware.GenerateRefreshToken(user.ID, user.Email, user.RoleID, permissions)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error generating refresh token"})
		return
	}

	if userWithRoles != nil {
		user = userWithRoles
	}

	c.JSON(http.StatusOK, models.AuthResponse{
		Token:        token,
		RefreshToken: refreshToken,
		User:         user,
	})
}

func (h *AuthHandler) RefreshToken(c *gin.Context) {
	var req struct {
		RefreshToken string `json:"refreshToken" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate refresh token
	claims, err := middleware.ValidateToken(req.RefreshToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid refresh token"})
		return
	}

	// Get user with roles and permissions
	user, err := h.userRepo.GetByID(claims.UserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}
	if user == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Load user with roles and permissions
	userWithRoles, err := h.userRepo.GetUserWithRoles(user.ID, user.CompanyID)
	if err != nil {
		userWithRoles = user
	}

	// Use permissions from token if available, otherwise load from DB
	permissions := claims.Permissions
	if len(permissions) == 0 && userWithRoles != nil {
		permissions = userWithRoles.Permissions
	}

	// Generate new tokens with role and permissions
	token, err := middleware.GenerateToken(claims.UserID, claims.Email, user.RoleID, permissions)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error generating token"})
		return
	}

	refreshToken, err := middleware.GenerateRefreshToken(claims.UserID, claims.Email, user.RoleID, permissions)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error generating refresh token"})
		return
	}

	if userWithRoles != nil {
		user = userWithRoles
	}

	c.JSON(http.StatusOK, models.AuthResponse{
		Token:        token,
		RefreshToken: refreshToken,
		User:         user,
	})
}

func (h *AuthHandler) Me(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	companyID, exists := c.Get("company_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Company context required"})
		return
	}

	// Get user with roles and permissions
	user, err := h.userRepo.GetUserWithRoles(userID.(int), companyID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}
	if user == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, user)
}

// InviteUser allows an admin/manager to add a user by email and assign a role within the same company
func (h *AuthHandler) InviteUser(c *gin.Context) {
	companyID, exists := c.Get("company_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Company context required"})
		return
	}

	var req models.InviteUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": validation.FormatValidationErrors(err)})
		return
	}

	if err := validation.ValidateName(req.Name); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := validation.ValidateEmail(req.Email); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Ensure role belongs to the same company
	role, err := h.roleRepo.GetByID(req.RoleID, companyID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load role"})
		return
	}
	if role == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Role not found for this company"})
		return
	}

	// Check for existing user by email
	existingUser, err := h.userRepo.GetByEmail(req.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}
	if existingUser != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "User with this email already exists"})
		return
	}

	// Generate temp password and verification code
	tempPassword := generateVerificationCode()
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(tempPassword), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error generating password"})
		return
	}

	verificationCode := generateVerificationCode()
	user := &models.User{
		Email:                  req.Email,
		Password:               string(hashedPassword),
		Name:                   req.Name,
		CompanyID:              companyID.(string),
		RoleID:                 &req.RoleID,
		IsEmailVerified:        false,
		EmailVerificationToken: &verificationCode,
	}

	if err := h.userRepo.Create(user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error creating user: " + err.Error()})
		return
	}

	if err := h.userRepo.AssignRoleToUser(user.ID, req.RoleID, companyID.(string), nil); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error assigning role: " + err.Error()})
		return
	}

	// Send invite/verification email
	go func() {
		if err := h.emailService.SendInviteEmail(user.Email, verificationCode); err != nil {
			logger.Error("Failed to send invite verification email", logger.ErrorField(err), zap.String("email", user.Email))
		}
	}()

	c.JSON(http.StatusCreated, gin.H{
		"message": "User invited successfully",
		"userId":  user.ID,
	})
}

// AcceptInvite lets invited user set password and activate the account
func (h *AuthHandler) AcceptInvite(c *gin.Context) {
	var req models.AcceptInviteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": validation.FormatValidationErrors(err)})
		return
	}

	if req.Password != req.ConfirmPassword {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Passwords do not match"})
		return
	}
	if len(req.Password) < 6 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Password must be at least 6 characters"})
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error hashing password"})
		return
	}

	user, err := h.userRepo.CompleteInvite(req.Email, req.Code, string(hashedPassword))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	logger.Info("Invite completed", zap.Int("userId", user.ID), zap.String("email", user.Email), zap.String("companyId", user.CompanyID))

	// Load roles/permissions for token - ensure we use the correct company_id
	userWithRoles, err := h.userRepo.GetUserWithRoles(user.ID, user.CompanyID)
	if err != nil {
		logger.Warn("Failed to load user roles, using basic user", logger.ErrorField(err), zap.Int("userId", user.ID), zap.String("companyId", user.CompanyID))
	} else if userWithRoles != nil {
		user = userWithRoles
		logger.Info("User roles loaded", zap.Int("userId", user.ID), zap.Int("rolesCount", len(user.Roles)), zap.Int("permissionsCount", len(user.Permissions)))
	}

	perms := []string{}
	if user.Permissions != nil {
		perms = user.Permissions
	}

	// Generate tokens
	token, err := middleware.GenerateToken(user.ID, user.Email, user.RoleID, perms)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error generating token"})
		return
	}
	refreshToken, err := middleware.GenerateRefreshToken(user.ID, user.Email, user.RoleID, perms)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error generating refresh token"})
		return
	}

	c.JSON(http.StatusOK, models.AuthResponse{
		Token:        token,
		RefreshToken: refreshToken,
		User:         user,
	})
}

// GetUsers gets all users for the company (for admin/manager)
func (h *AuthHandler) GetUsers(c *gin.Context) {
	companyID, exists := c.Get("company_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Company context required"})
		return
	}

	users, err := h.userRepo.GetAll(companyID.(string))
	if err != nil {
		logger.Error("Error getting users", logger.ErrorField(err), zap.String("companyId", companyID.(string)))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error getting users"})
		return
	}

	c.JSON(http.StatusOK, users)
}

// Logout handles user logout
// Note: For full token blacklist functionality, implement Redis or database-based token blacklist
func (h *AuthHandler) Logout(c *gin.Context) {
	// In a stateless JWT system, logout is handled client-side by removing tokens
	// For enhanced security, you can implement token blacklisting here:
	// 1. Extract token from Authorization header
	// 2. Add token to blacklist (Redis or database)
	// 3. Check blacklist in AuthMiddleware before validating token

	// For now, we just return success - client should remove tokens
	c.JSON(http.StatusOK, gin.H{
		"message": "Logged out successfully",
	})
}
