package handlers

import (
	"classmate-central/internal/models"
	"classmate-central/internal/repository"
	"classmate-central/internal/services"
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
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get user ID from context (set by auth middleware)
	if userID, exists := c.Get("userID"); exists {
		if uid, ok := userID.(int); ok {
			tx.CreatedBy = &uid
		}
	}

	companyID := c.GetString("company_id")
	if err := h.repo.CreateTransaction(&tx, companyID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Update student balance
	if err := h.repo.UpdateStudentBalance(tx.StudentID, tx.Amount); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update balance"})
		return
	}

	// Log payment activity
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
