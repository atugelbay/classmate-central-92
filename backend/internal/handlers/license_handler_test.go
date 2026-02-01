package handlers

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"classmate-central/internal/models"
	"classmate-central/internal/repository"
	"classmate-central/internal/testutil"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupLicenseTestRouter(t *testing.T) (*gin.Engine, *LicenseHandler, *sql.DB) {
	gin.SetMode(gin.TestMode)

	db := testutil.SetupTestDB(t)
	licenseRepo := repository.NewLicenseRepository(db)
	licenseHandler := NewLicenseHandler(licenseRepo)

	router := gin.New()
	
	// Public route
	router.GET("/api/plans", licenseHandler.GetPlans)
	
	// Protected routes with mock auth middleware
	authorized := router.Group("/api")
	authorized.Use(func(c *gin.Context) {
		// Mock company_id in context
		companyID := c.GetHeader("X-Company-ID")
		if companyID != "" {
			c.Set("company_id", companyID)
		}
		c.Next()
	})
	authorized.GET("/company/license", licenseHandler.GetCurrentLicense)
	authorized.POST("/company/license", licenseHandler.SelectPlan)

	return router, licenseHandler, db
}

func createTestCompany(t *testing.T, db *sql.DB, name string) string {
	companyID := "test-company-" + name
	_, err := db.Exec(`
		INSERT INTO companies (id, name, status, created_at, updated_at)
		VALUES ($1, $2, 'active', NOW(), NOW())
		ON CONFLICT (id) DO NOTHING
	`, companyID, name)
	require.NoError(t, err)
	return companyID
}

func TestLicenseHandler_GetPlans(t *testing.T) {
	router, _, db := setupLicenseTestRouter(t)
	defer db.Close()

	req, _ := http.NewRequest("GET", "/api/plans", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var plans []models.Plan
	err := json.Unmarshal(w.Body.Bytes(), &plans)
	require.NoError(t, err)

	assert.Len(t, plans, 4)
	
	// Verify plan order
	assert.Equal(t, "standard", plans[0].ID)
	assert.Equal(t, "professional", plans[1].ID)
	assert.Equal(t, "business", plans[2].ID)
	assert.Equal(t, "enterprise", plans[3].ID)
}

func TestLicenseHandler_GetPlans_PricesCorrect(t *testing.T) {
	router, _, db := setupLicenseTestRouter(t)
	defer db.Close()

	req, _ := http.NewRequest("GET", "/api/plans", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var plans []models.Plan
	err := json.Unmarshal(w.Body.Bytes(), &plans)
	require.NoError(t, err)

	// Verify prices
	planPrices := map[string]float64{
		"standard":     29900,
		"professional": 49900,
		"business":     89900,
		"enterprise":   149900,
	}

	for _, plan := range plans {
		expectedPrice, ok := planPrices[plan.ID]
		assert.True(t, ok, "Unknown plan: %s", plan.ID)
		assert.Equal(t, expectedPrice, plan.PriceMonthly, "Price mismatch for plan %s", plan.ID)
	}
}

func TestLicenseHandler_GetPlans_LimitsCorrect(t *testing.T) {
	router, _, db := setupLicenseTestRouter(t)
	defer db.Close()

	req, _ := http.NewRequest("GET", "/api/plans", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var plans []models.Plan
	err := json.Unmarshal(w.Body.Bytes(), &plans)
	require.NoError(t, err)

	// Check Standard limits
	standardPlan := findPlanByID(plans, "standard")
	require.NotNil(t, standardPlan)
	assert.NotNil(t, standardPlan.MaxStudents)
	assert.Equal(t, 100, *standardPlan.MaxStudents)
	assert.NotNil(t, standardPlan.MaxUsers)
	assert.Equal(t, 5, *standardPlan.MaxUsers)
	assert.NotNil(t, standardPlan.MaxBranches)
	assert.Equal(t, 1, *standardPlan.MaxBranches)

	// Check Enterprise has no limits (nil)
	enterprisePlan := findPlanByID(plans, "enterprise")
	require.NotNil(t, enterprisePlan)
	assert.Nil(t, enterprisePlan.MaxStudents, "Enterprise should have unlimited students")
	assert.Nil(t, enterprisePlan.MaxUsers, "Enterprise should have unlimited users")
	assert.Nil(t, enterprisePlan.MaxBranches, "Enterprise should have unlimited branches")
}

func TestLicenseHandler_GetCurrentLicense_NoAuth(t *testing.T) {
	router, _, db := setupLicenseTestRouter(t)
	defer db.Close()

	// Request without company_id header
	req, _ := http.NewRequest("GET", "/api/company/license", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestLicenseHandler_GetCurrentLicense_NoLicense(t *testing.T) {
	router, _, db := setupLicenseTestRouter(t)
	defer db.Close()
	defer testutil.CleanupTestDB(t, db)

	companyID := createTestCompany(t, db, "no-license-company")

	req, _ := http.NewRequest("GET", "/api/company/license", nil)
	req.Header.Set("X-Company-ID", companyID)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response models.LicenseWithUsage
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)
	
	assert.Nil(t, response.License, "License should be nil for company without license")
	assert.NotNil(t, response.Usage)
}

func TestLicenseHandler_GetCurrentLicense_WithLicense(t *testing.T) {
	router, _, db := setupLicenseTestRouter(t)
	defer db.Close()
	defer testutil.CleanupTestDB(t, db)

	companyID := createTestCompany(t, db, "with-license-company")
	
	// Create a license for the company
	_, err := db.Exec(`
		INSERT INTO company_licenses (company_id, plan_id, status, current_period_start, current_period_end)
		VALUES ($1, 'professional', 'active', NOW(), NOW() + INTERVAL '1 month')
	`, companyID)
	require.NoError(t, err)

	req, _ := http.NewRequest("GET", "/api/company/license", nil)
	req.Header.Set("X-Company-ID", companyID)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response models.LicenseWithUsage
	err = json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)
	
	assert.NotNil(t, response.License)
	assert.Equal(t, companyID, response.License.CompanyID)
	assert.Equal(t, "professional", response.License.PlanID)
	assert.Equal(t, "Professional", response.License.PlanName)
}

func TestLicenseHandler_SelectPlan_CreateNew(t *testing.T) {
	router, _, db := setupLicenseTestRouter(t)
	defer db.Close()
	defer testutil.CleanupTestDB(t, db)

	companyID := createTestCompany(t, db, "select-plan-company")

	reqBody := models.SelectPlanRequest{PlanID: "business"}
	jsonBody, _ := json.Marshal(reqBody)
	
	req, _ := http.NewRequest("POST", "/api/company/license", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Company-ID", companyID)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)
	
	assert.Equal(t, "Plan selected successfully", response["message"])
	
	license := response["license"].(map[string]interface{})["license"].(map[string]interface{})
	assert.Equal(t, "business", license["planId"])
}

func TestLicenseHandler_SelectPlan_UpdateExisting(t *testing.T) {
	router, _, db := setupLicenseTestRouter(t)
	defer db.Close()
	defer testutil.CleanupTestDB(t, db)

	companyID := createTestCompany(t, db, "update-plan-company")
	
	// Create initial license
	_, err := db.Exec(`
		INSERT INTO company_licenses (company_id, plan_id, status, current_period_start, current_period_end)
		VALUES ($1, 'standard', 'active', NOW(), NOW() + INTERVAL '1 month')
	`, companyID)
	require.NoError(t, err)

	// Update to enterprise
	reqBody := models.SelectPlanRequest{PlanID: "enterprise"}
	jsonBody, _ := json.Marshal(reqBody)
	
	req, _ := http.NewRequest("POST", "/api/company/license", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Company-ID", companyID)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	// Verify the plan was updated
	var planID string
	err = db.QueryRow("SELECT plan_id FROM company_licenses WHERE company_id = $1", companyID).Scan(&planID)
	require.NoError(t, err)
	assert.Equal(t, "enterprise", planID)
}

func TestLicenseHandler_SelectPlan_InvalidPlan(t *testing.T) {
	router, _, db := setupLicenseTestRouter(t)
	defer db.Close()
	defer testutil.CleanupTestDB(t, db)

	companyID := createTestCompany(t, db, "invalid-plan-company")

	reqBody := models.SelectPlanRequest{PlanID: "non-existing-plan"}
	jsonBody, _ := json.Marshal(reqBody)
	
	req, _ := http.NewRequest("POST", "/api/company/license", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Company-ID", companyID)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestLicenseHandler_SelectPlan_NoAuth(t *testing.T) {
	router, _, db := setupLicenseTestRouter(t)
	defer db.Close()

	reqBody := models.SelectPlanRequest{PlanID: "standard"}
	jsonBody, _ := json.Marshal(reqBody)
	
	req, _ := http.NewRequest("POST", "/api/company/license", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	// No X-Company-ID header
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestLicenseHandler_CheckLimits_UnderLimit(t *testing.T) {
	gin.SetMode(gin.TestMode)

	db := testutil.SetupTestDB(t)
	defer db.Close()
	defer testutil.CleanupTestDB(t, db)

	licenseRepo := repository.NewLicenseRepository(db)
	licenseHandler := NewLicenseHandler(licenseRepo)

	companyID := createTestCompany(t, db, "under-limit-company")
	
	// Create branch for company
	_, err := db.Exec(`INSERT INTO branches (id, name, company_id, status) VALUES ($1, $2, $3, 'active')`,
		"branch-under-limit", "Test Branch", companyID)
	require.NoError(t, err)

	// Create license with Standard plan (100 students limit)
	_, err = db.Exec(`
		INSERT INTO company_licenses (company_id, plan_id, status, current_period_start, current_period_end)
		VALUES ($1, 'standard', 'active', NOW(), NOW() + INTERVAL '1 month')
	`, companyID)
	require.NoError(t, err)

	// Add only 5 students (under limit)
	for i := 0; i < 5; i++ {
		_, err = db.Exec(`
			INSERT INTO students (id, name, phone, status, company_id, branch_id)
			VALUES ($1, $2, $3, 'active', $4, $5)
		`, "student-"+string(rune('a'+i)), "Student "+string(rune('a'+i)), "123456789", companyID, "branch-under-limit")
		require.NoError(t, err)
	}

	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("company_id", companyID)
		c.Next()
	})
	router.POST("/test", licenseHandler.CheckLimits("students"), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	req, _ := http.NewRequest("POST", "/test", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code, "Should allow when under limit")
}

func TestLicenseHandler_CheckLimits_AtLimit(t *testing.T) {
	gin.SetMode(gin.TestMode)

	db := testutil.SetupTestDB(t)
	defer db.Close()
	defer testutil.CleanupTestDB(t, db)

	licenseRepo := repository.NewLicenseRepository(db)
	licenseHandler := NewLicenseHandler(licenseRepo)

	companyID := createTestCompany(t, db, "at-limit-company")
	
	// Create branch for company
	_, err := db.Exec(`INSERT INTO branches (id, name, company_id, status) VALUES ($1, $2, $3, 'active')`,
		"branch-at-limit", "Test Branch", companyID)
	require.NoError(t, err)

	// Create license with Standard plan (5 users limit)
	_, err = db.Exec(`
		INSERT INTO company_licenses (company_id, plan_id, status, current_period_start, current_period_end)
		VALUES ($1, 'standard', 'active', NOW(), NOW() + INTERVAL '1 month')
	`, companyID)
	require.NoError(t, err)

	// Add exactly 5 users (at limit)
	for i := 0; i < 5; i++ {
		_, err = db.Exec(`
			INSERT INTO users (email, password, name, company_id, created_at, updated_at)
			VALUES ($1, 'pass123', $2, $3, NOW(), NOW())
		`, "user"+string(rune('a'+i))+"@test.com", "User "+string(rune('a'+i)), companyID)
		require.NoError(t, err)
	}

	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("company_id", companyID)
		c.Next()
	})
	router.POST("/test", licenseHandler.CheckLimits("users"), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	req, _ := http.NewRequest("POST", "/test", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusForbidden, w.Code, "Should block when at limit")
	
	var response map[string]interface{}
	err = json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)
	assert.Equal(t, "LIMIT_EXCEEDED", response["code"])
}

func TestLicenseHandler_CheckLimits_EnterpriseLimits(t *testing.T) {
	gin.SetMode(gin.TestMode)

	db := testutil.SetupTestDB(t)
	defer db.Close()
	defer testutil.CleanupTestDB(t, db)

	licenseRepo := repository.NewLicenseRepository(db)
	licenseHandler := NewLicenseHandler(licenseRepo)

	companyID := createTestCompany(t, db, "enterprise-company")
	
	// Create branch for company
	_, err := db.Exec(`INSERT INTO branches (id, name, company_id, status) VALUES ($1, $2, $3, 'active')`,
		"branch-enterprise", "Test Branch", companyID)
	require.NoError(t, err)

	// Create license with Enterprise plan (unlimited)
	_, err = db.Exec(`
		INSERT INTO company_licenses (company_id, plan_id, status, current_period_start, current_period_end)
		VALUES ($1, 'enterprise', 'active', NOW(), NOW() + INTERVAL '1 month')
	`, companyID)
	require.NoError(t, err)

	// Add many students using proper string formatting
	for i := 0; i < 200; i++ {
		studentID := fmt.Sprintf("ent-student-%d", i)
		studentName := fmt.Sprintf("Student %d", i)
		_, err = db.Exec(`
			INSERT INTO students (id, name, phone, status, company_id, branch_id)
			VALUES ($1, $2, $3, 'active', $4, $5)
		`, studentID, studentName, "123456789", companyID, "branch-enterprise")
		require.NoError(t, err)
	}

	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("company_id", companyID)
		c.Next()
	})
	router.POST("/test", licenseHandler.CheckLimits("students"), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	req, _ := http.NewRequest("POST", "/test", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code, "Enterprise should have no limits")
}

func TestLicenseHandler_CheckLimits_NoLicense(t *testing.T) {
	gin.SetMode(gin.TestMode)

	db := testutil.SetupTestDB(t)
	defer db.Close()
	defer testutil.CleanupTestDB(t, db)

	licenseRepo := repository.NewLicenseRepository(db)
	licenseHandler := NewLicenseHandler(licenseRepo)

	companyID := createTestCompany(t, db, "no-license-check-company")

	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("company_id", companyID)
		c.Next()
	})
	router.POST("/test", licenseHandler.CheckLimits("students"), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	req, _ := http.NewRequest("POST", "/test", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Should pass through if no license (allow for now, business logic can handle)
	assert.Equal(t, http.StatusOK, w.Code)
}

// Helper function
func findPlanByID(plans []models.Plan, id string) *models.Plan {
	for _, plan := range plans {
		if plan.ID == id {
			return &plan
		}
	}
	return nil
}
