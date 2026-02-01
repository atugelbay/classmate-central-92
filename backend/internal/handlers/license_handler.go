package handlers

import (
	"net/http"

	"classmate-central/internal/models"
	"classmate-central/internal/repository"

	"github.com/gin-gonic/gin"
)

type LicenseHandler struct {
	repo *repository.LicenseRepository
}

func NewLicenseHandler(repo *repository.LicenseRepository) *LicenseHandler {
	return &LicenseHandler{repo: repo}
}

// GetPlans returns all available plans (public endpoint)
func (h *LicenseHandler) GetPlans(c *gin.Context) {
	plans, err := h.repo.GetAllPlans()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, plans)
}

// GetCurrentLicense returns the current license for the authenticated user's company
func (h *LicenseHandler) GetCurrentLicense(c *gin.Context) {
	companyID := c.GetString("company_id")
	if companyID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Company context required"})
		return
	}

	// Get license with plan details
	license, err := h.repo.GetLicenseByCompanyID(companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Get usage metrics
	usage, err := h.repo.GetCompanyUsage(companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Return combined response
	response := &models.LicenseWithUsage{
		License: license,
		Usage:   usage,
	}

	c.JSON(http.StatusOK, response)
}

// SelectPlan creates or updates a license with the selected plan
func (h *LicenseHandler) SelectPlan(c *gin.Context) {
	companyID := c.GetString("company_id")
	if companyID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Company context required"})
		return
	}

	var req models.SelectPlanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify plan exists
	plan, err := h.repo.GetPlanByID(req.PlanID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if plan == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid plan ID"})
		return
	}

	// Check if company already has a license
	hasLicense, err := h.repo.HasLicense(companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if hasLicense {
		// Update existing license
		err = h.repo.UpdateLicensePlan(companyID, req.PlanID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	} else {
		// Create new license (1 month for all plans including Enterprise promo)
		_, err = h.repo.CreateLicense(companyID, req.PlanID, 1)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}

	// Return updated license
	license, err := h.repo.GetLicenseByCompanyID(companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	usage, err := h.repo.GetCompanyUsage(companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	response := &models.LicenseWithUsage{
		License: license,
		Usage:   usage,
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Plan selected successfully",
		"license": response,
	})
}

// CheckLimits middleware to check if company has exceeded their plan limits
func (h *LicenseHandler) CheckLimits(resourceType string) gin.HandlerFunc {
	return func(c *gin.Context) {
		companyID := c.GetString("company_id")
		if companyID == "" {
			c.Next()
			return
		}

		license, err := h.repo.GetLicenseByCompanyID(companyID)
		if err != nil || license == nil {
			// No license, allow (will be handled by business logic)
			c.Next()
			return
		}

		usage, err := h.repo.GetCompanyUsage(companyID)
		if err != nil {
			c.Next()
			return
		}

		// Check limits based on resource type
		var limitExceeded bool
		var limitMessage string

		switch resourceType {
		case "students":
			if license.MaxStudents != nil && usage.StudentsCount >= *license.MaxStudents {
				limitExceeded = true
				limitMessage = "Student limit reached for your plan"
			}
		case "users":
			if license.MaxUsers != nil && usage.UsersCount >= *license.MaxUsers {
				limitExceeded = true
				limitMessage = "User limit reached for your plan"
			}
		case "teachers":
			if license.MaxTeachers != nil && usage.TeachersCount >= *license.MaxTeachers {
				limitExceeded = true
				limitMessage = "Teacher limit reached for your plan"
			}
		case "branches":
			if license.MaxBranches != nil && usage.BranchesCount >= *license.MaxBranches {
				limitExceeded = true
				limitMessage = "Branch limit reached for your plan"
			}
		}

		if limitExceeded {
			c.JSON(http.StatusForbidden, gin.H{
				"error":       limitMessage,
				"code":        "LIMIT_EXCEEDED",
				"upgradeUrl":  "/settings?tab=billing",
				"currentPlan": license.PlanName,
			})
			c.Abort()
			return
		}

		c.Next()
	}
}
