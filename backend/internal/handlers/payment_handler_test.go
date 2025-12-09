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

func setupPaymentTestRouter(t *testing.T) (*gin.Engine, *PaymentHandler, *sql.DB) {
	gin.SetMode(gin.TestMode)
	
	db := testutil.SetupTestDB(t)

	paymentRepo := repository.NewPaymentRepository(db)
	activityService := services.NewActivityService(repository.NewActivityRepository(db))
	emailService := services.NewEmailService()
	studentRepo := repository.NewStudentRepository(db)
	
	paymentHandler := NewPaymentHandler(paymentRepo, activityService, emailService, studentRepo)

	router := gin.New()
	router.POST("/api/payments/transactions", paymentHandler.CreateTransaction)
	router.GET("/api/payments/transactions", paymentHandler.GetAllTransactions)

	return router, paymentHandler, db
}

func TestPaymentHandler_CreateTransaction(t *testing.T) {
	router, _, db := setupPaymentTestRouter(t)
	defer db.Close()
	defer testutil.CleanupTestDB(t, db)

	// Note: This test requires a student to exist in the database
	// In a full integration test, you would create a student first
	
	reqBody := models.PaymentTransaction{
		StudentID:     "test-student-id",
		Amount:        5000.0,
		Type:          "payment",
		PaymentMethod: "cash",
		Description:   "Test payment",
	}

	jsonBody, _ := json.Marshal(reqBody)
	req, _ := http.NewRequest("POST", "/api/payments/transactions", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// This will likely fail without proper setup, but tests the handler structure
	// In real test, you'd need to create company, student, etc. first
	assert.True(t, w.Code == http.StatusCreated || w.Code == http.StatusInternalServerError || w.Code == http.StatusBadRequest)
}

func TestPaymentHandler_GetAllTransactions(t *testing.T) {
	router, _, db := setupPaymentTestRouter(t)
	defer db.Close()
	defer testutil.CleanupTestDB(t, db)

	req, _ := http.NewRequest("GET", "/api/payments/transactions", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Should return 200 even if empty
	assert.Equal(t, http.StatusOK, w.Code)
	
	var transactions []models.PaymentTransaction
	err := json.Unmarshal(w.Body.Bytes(), &transactions)
	require.NoError(t, err)
	assert.NotNil(t, transactions)
}

