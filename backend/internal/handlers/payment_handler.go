package handlers

import (
	"classmate-central/internal/models"
	"classmate-central/internal/repository"
	"net/http"

	"github.com/gin-gonic/gin"
)

type PaymentHandler struct {
	repo *repository.PaymentRepository
}

func NewPaymentHandler(repo *repository.PaymentRepository) *PaymentHandler {
	return &PaymentHandler{repo: repo}
}

// CreateTransaction creates a new payment transaction
func (h *PaymentHandler) CreateTransaction(c *gin.Context) {
	var tx models.PaymentTransaction
	if err := c.ShouldBindJSON(&tx); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.repo.CreateTransaction(&tx); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Update student balance
	if err := h.repo.UpdateStudentBalance(tx.StudentID, tx.Amount); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update balance"})
		return
	}

	c.JSON(http.StatusCreated, tx)
}

// GetTransactionsByStudent returns all transactions for a student
func (h *PaymentHandler) GetTransactionsByStudent(c *gin.Context) {
	studentID := c.Param("studentId")

	transactions, err := h.repo.GetTransactionsByStudent(studentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, transactions)
}

// GetAllTransactions returns all transactions
func (h *PaymentHandler) GetAllTransactions(c *gin.Context) {
	transactions, err := h.repo.GetAllTransactions()
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
	balances, err := h.repo.GetAllBalances()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, balances)
}
