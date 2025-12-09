package handlers

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"classmate-central/internal/models"
	"classmate-central/internal/repository"
	"classmate-central/internal/services"
	"classmate-central/internal/testutil"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupTestRouter(t *testing.T) (*gin.Engine, *AuthHandler, *sql.DB) {
	gin.SetMode(gin.TestMode)
	
	// Setup test database
	db := testutil.SetupTestDB(t)

	// Create repositories
	userRepo := repository.NewUserRepository(db)
	companyRepo := repository.NewCompanyRepository(db)
	roleRepo := repository.NewRoleRepository(db)
	settingsRepo := repository.NewSettingsRepository(db)
	emailService := services.NewEmailService()

	// Create handler
	authHandler := NewAuthHandler(userRepo, companyRepo, roleRepo, settingsRepo, emailService)

	// Setup router
	router := gin.New()
	router.POST("/api/auth/register", authHandler.Register)
	router.POST("/api/auth/login", authHandler.Login)

	return router, authHandler, db
}

func TestAuthHandler_Register(t *testing.T) {
	router, _, db := setupTestRouter(t)
	defer db.Close()
	defer testutil.CleanupTestDB(t, db)

	reqBody := models.RegisterRequest{
		Email:       "test@example.com",
		Password:    "password123",
		Name:        "Test User",
		CompanyName: "Test Company",
	}

	jsonBody, _ := json.Marshal(reqBody)
	req, _ := http.NewRequest("POST", "/api/auth/register", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)
	
	var response models.AuthResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)
	assert.NotEmpty(t, response.Token)
	assert.NotEmpty(t, response.RefreshToken)
	assert.Equal(t, "test@example.com", response.User.Email)
}

func TestAuthHandler_Register_DuplicateEmail(t *testing.T) {
	router, _, db := setupTestRouter(t)
	defer db.Close()
	defer testutil.CleanupTestDB(t, db)

	// Register first user
	reqBody := models.RegisterRequest{
		Email:       "duplicate@example.com",
		Password:    "password123",
		Name:        "First User",
		CompanyName: "First Company",
	}
	jsonBody, _ := json.Marshal(reqBody)
	req, _ := http.NewRequest("POST", "/api/auth/register", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusCreated, w.Code)

	// Try to register with same email
	req2, _ := http.NewRequest("POST", "/api/auth/register", bytes.NewBuffer(jsonBody))
	req2.Header.Set("Content-Type", "application/json")
	w2 := httptest.NewRecorder()
	router.ServeHTTP(w2, req2)
	assert.Equal(t, http.StatusConflict, w2.Code)
}

func TestAuthHandler_Login(t *testing.T) {
	router, _, db := setupTestRouter(t)
	defer db.Close()
	defer testutil.CleanupTestDB(t, db)

	// First register a user
	registerReq := models.RegisterRequest{
		Email:       "login@example.com",
		Password:    "password123",
		Name:        "Login User",
		CompanyName: "Login Company",
	}
	jsonBody, _ := json.Marshal(registerReq)
	req, _ := http.NewRequest("POST", "/api/auth/register", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusCreated, w.Code)

	// Now try to login
	loginReq := models.LoginRequest{
		Email:    "login@example.com",
		Password: "password123",
	}
	loginBody, _ := json.Marshal(loginReq)
	loginRequest, _ := http.NewRequest("POST", "/api/auth/login", bytes.NewBuffer(loginBody))
	loginRequest.Header.Set("Content-Type", "application/json")
	loginW := httptest.NewRecorder()
	router.ServeHTTP(loginW, loginRequest)

	assert.Equal(t, http.StatusOK, loginW.Code)
	
	var response models.AuthResponse
	err := json.Unmarshal(loginW.Body.Bytes(), &response)
	require.NoError(t, err)
	assert.NotEmpty(t, response.Token)
	assert.Equal(t, "login@example.com", response.User.Email)
}

func TestAuthHandler_Login_InvalidCredentials(t *testing.T) {
	router, _, db := setupTestRouter(t)
	defer db.Close()
	defer testutil.CleanupTestDB(t, db)

	loginReq := models.LoginRequest{
		Email:    "nonexistent@example.com",
		Password: "wrongpassword",
	}
	loginBody, _ := json.Marshal(loginReq)
	req, _ := http.NewRequest("POST", "/api/auth/login", bytes.NewBuffer(loginBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

