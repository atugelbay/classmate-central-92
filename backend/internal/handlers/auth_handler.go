package handlers

import (
	"net/http"

	"classmate-central/internal/logger"
	"classmate-central/internal/middleware"
	"classmate-central/internal/models"
	"classmate-central/internal/repository"
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
}

func NewAuthHandler(userRepo *repository.UserRepository, companyRepo *repository.CompanyRepository, roleRepo *repository.RoleRepository, settingsRepo *repository.SettingsRepository) *AuthHandler {
	return &AuthHandler{
		userRepo:     userRepo,
		companyRepo:  companyRepo,
		roleRepo:     roleRepo,
		settingsRepo: settingsRepo,
	}
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

	// Find view_only role for the company (default role)
	viewOnlyRoleID := company.ID + "_view_only"
	viewOnlyRole, err := h.roleRepo.GetByID(viewOnlyRoleID, company.ID)
	if err != nil || viewOnlyRole == nil {
		logger.Warn("view_only role not found after creation attempt", zap.String("companyId", company.ID), zap.String("roleId", viewOnlyRoleID))
		// Continue without role assignment - user can still access with default permissions
	}

	// Create user with company_id and default role
	user := &models.User{
		Email:     req.Email,
		Password:  string(hashedPassword),
		Name:      req.Name,
		CompanyID: company.ID,
	}
	if viewOnlyRole != nil {
		user.RoleID = &viewOnlyRoleID
	}

	if err := h.userRepo.Create(user); err != nil {
		logger.Error("Error creating user", logger.ErrorField(err), zap.String("email", req.Email), zap.String("companyId", company.ID))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error creating user: " + err.Error()})
		return
	}

	logger.Info("User created", zap.Int("userId", user.ID), zap.String("email", user.Email), zap.String("companyId", company.ID))

	// Assign default role to user
	if viewOnlyRole != nil {
		err = h.userRepo.AssignRoleToUser(user.ID, viewOnlyRoleID, company.ID, nil)
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
