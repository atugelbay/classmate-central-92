package handlers

import (
	"classmate-central/internal/models"
	"classmate-central/internal/repository"
	"classmate-central/internal/services"
	"classmate-central/internal/validation"
	"net/http"

	"github.com/gin-gonic/gin"
)

type PaymentHandler struct {
	repo            *repository.PaymentRepository
	activityService *services.ActivityService
}

func NewPaymentHandler(repo *repository.PaymentRepository, activityService *services.ActivityService) *PaymentHandler {
	return &PaymentHandler{
		repo:            repo,
		activityService: activityService,
	}
}

// CreateTransaction creates a new payment transaction
func (h *PaymentHandler) CreateTransaction(c *gin.Context) {
	var tx models.PaymentTransaction
	if err := c.ShouldBindJSON(&tx); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": validation.FormatValidationErrors(err)})
		return
	}

	// Validation
	if err := validation.ValidateNotEmpty(tx.StudentID, "studentId"); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := validation.ValidateAmount(tx.Amount); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := validation.ValidateOneOf(tx.Type, []string{"payment", "refund", "debt"}, "type"); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get user ID from context (set by auth middleware)
	if userID, exists := c.Get("user_id"); exists {
		if uid, ok := userID.(int); ok {
			tx.CreatedBy = &uid
		}
	}

	companyID := c.GetString("company_id")
	
	// Use atomic transaction method to ensure data consistency
	if err := h.repo.CreateTransactionWithBalance(&tx, companyID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create transaction: " + err.Error()})
		return
	}

	// Log payment activity (non-critical, can fail without affecting transaction)
	_ = h.activityService.LogPayment(&tx)

	c.JSON(http.StatusCreated, tx)
}

// GetTransactionsByStudent returns all transactions for a student
func (h *PaymentHandler) GetTransactionsByStudent(c *gin.Context) {
	studentID := c.Param("studentId")
	companyID := c.GetString("company_id")

	transactions, err := h.repo.GetTransactionsByStudent(studentID, companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, transactions)
}

// GetAllTransactions returns all transactions
func (h *PaymentHandler) GetAllTransactions(c *gin.Context) {
	companyID := c.GetString("company_id")
	transactions, err := h.repo.GetAllTransactions(companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, transactions)
}

// GetStudentBalance returns the balance for a student
func (h *PaymentHandler) GetStudentBalance(c *gin.Context) {
	studentID := c.Param("studentId")

	balance, err := h.repo.GetStudentBalance(studentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, balance)
}

// GetAllBalances returns all student balances
func (h *PaymentHandler) GetAllBalances(c *gin.Context) {
	companyID := c.GetString("company_id")
	balances, err := h.repo.GetAllBalances(companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, balances)
}
