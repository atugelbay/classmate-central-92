package handlers

import (
	"classmate-central/internal/models"
	"classmate-central/internal/repository"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type LeadHandler struct {
	repo *repository.LeadRepository
}

func NewLeadHandler(repo *repository.LeadRepository) *LeadHandler {
	return &LeadHandler{repo: repo}
}

func (h *LeadHandler) GetAll(c *gin.Context) {
	companyID := c.GetString("company_id")
	// Check if filtering by status or source
	status := c.Query("status")
	source := c.Query("source")

	var leads []models.Lead
	var err error

	if status != "" {
		leads, err = h.repo.GetByStatus(status, companyID)
	} else if source != "" {
		leads, err = h.repo.GetBySource(source, companyID)
	} else {
		leads, err = h.repo.GetAll(companyID)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, leads)
}

func (h *LeadHandler) GetByID(c *gin.Context) {
	id := c.Param("id")
	companyID := c.GetString("company_id")
	lead, err := h.repo.GetByID(id, companyID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Lead not found"})
		return
	}
	c.JSON(http.StatusOK, lead)
}

func (h *LeadHandler) Create(c *gin.Context) {
	var lead models.Lead
	if err := c.ShouldBindJSON(&lead); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	companyID := c.GetString("company_id")
	lead.ID = uuid.New().String()
	if lead.Status == "" {
		lead.Status = "new"
	}

	if err := h.repo.Create(&lead, companyID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, lead)
}

func (h *LeadHandler) Update(c *gin.Context) {
	id := c.Param("id")
	companyID := c.GetString("company_id")
	var lead models.Lead
	if err := c.ShouldBindJSON(&lead); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	lead.ID = id
	if err := h.repo.Update(&lead, companyID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, lead)
}

func (h *LeadHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	companyID := c.GetString("company_id")
	if err := h.repo.Delete(id, companyID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Lead deleted successfully"})
}

func (h *LeadHandler) GetConversionStats(c *gin.Context) {
	companyID := c.GetString("company_id")
	stats, err := h.repo.GetConversionStats(companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, stats)
}

// Activities
func (h *LeadHandler) GetActivities(c *gin.Context) {
	leadID := c.Param("id")
	activities, err := h.repo.GetActivities(leadID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, activities)
}

func (h *LeadHandler) AddActivity(c *gin.Context) {
	leadID := c.Param("id")
	var activity models.LeadActivity
	if err := c.ShouldBindJSON(&activity); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	activity.LeadID = leadID
	// Get user ID from context (set by auth middleware)
	if userID, exists := c.Get("userID"); exists {
		if id, ok := userID.(int); ok {
			activity.CreatedBy = &id
		}
	}

	if err := h.repo.AddActivity(&activity); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, activity)
}

// Tasks
func (h *LeadHandler) GetTasks(c *gin.Context) {
	leadID := c.Param("id")
	tasks, err := h.repo.GetTasks(leadID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, tasks)
}

func (h *LeadHandler) CreateTask(c *gin.Context) {
	leadID := c.Param("id")
	var task models.LeadTask
	if err := c.ShouldBindJSON(&task); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	task.LeadID = leadID
	if task.Status == "" {
		task.Status = "pending"
	}

	if err := h.repo.CreateTask(&task); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, task)
}

func (h *LeadHandler) UpdateTask(c *gin.Context) {
	taskID := c.Param("taskId")
	var task models.LeadTask
	if err := c.ShouldBindJSON(&task); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Parse task ID as int
	var id int
	if _, err := fmt.Sscanf(taskID, "%d", &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID"})
		return
	}
	task.ID = id

	if err := h.repo.UpdateTask(&task); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, task)
}
