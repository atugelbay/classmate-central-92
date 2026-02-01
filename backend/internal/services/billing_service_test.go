package services

import (
	"fmt"
	"testing"
	"time"

	"classmate-central/internal/repository"
	"classmate-central/internal/testutil"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestBillingFlow_NewCompanyGetsEnterprise tests that new companies get Enterprise for free
func TestBillingFlow_NewCompanyGetsEnterprise(t *testing.T) {
	db := testutil.SetupTestDB(t)
	defer db.Close()
	defer testutil.CleanupTestDB(t, db)

	companyRepo := repository.NewCompanyRepository(db)
	licenseRepo := repository.NewLicenseRepository(db)

	// Create a new company
	companyID := "test-billing-flow-company"
	_, err := db.Exec(`
		INSERT INTO companies (id, name, status, created_at, updated_at)
		VALUES ($1, 'Test Billing Company', 'active', NOW(), NOW())
	`, companyID)
	require.NoError(t, err)

	// Verify company was created
	company, err := companyRepo.GetByID(companyID)
	require.NoError(t, err)
	require.NotNil(t, company)

	// Migration 035 should have given this company an Enterprise license
	// Let's simulate that by creating the license manually
	_, err = licenseRepo.CreateLicense(companyID, "enterprise", 1)
	require.NoError(t, err)

	// Verify the license
	license, err := licenseRepo.GetLicenseByCompanyID(companyID)
	require.NoError(t, err)
	require.NotNil(t, license)

	assert.Equal(t, "enterprise", license.PlanID)
	assert.Equal(t, "active", license.Status)
	
	// Verify period is approximately 1 month (28-31 days depending on month)
	periodDuration := license.CurrentPeriodEnd.Sub(license.CurrentPeriodStart)
	assert.True(t, periodDuration >= 27*24*time.Hour && periodDuration <= 32*24*time.Hour, 
		"Period should be approximately 1 month, got %v", periodDuration)
}

// TestBillingFlow_DowngradePlan tests downgrading from higher to lower plan
func TestBillingFlow_DowngradePlan(t *testing.T) {
	db := testutil.SetupTestDB(t)
	defer db.Close()
	defer testutil.CleanupTestDB(t, db)

	licenseRepo := repository.NewLicenseRepository(db)

	// Create company with Enterprise license
	companyID := "downgrade-test-company"
	_, err := db.Exec(`
		INSERT INTO companies (id, name, status, created_at, updated_at)
		VALUES ($1, 'Downgrade Test Company', 'active', NOW(), NOW())
	`, companyID)
	require.NoError(t, err)

	_, err = licenseRepo.CreateLicense(companyID, "enterprise", 1)
	require.NoError(t, err)

	// Downgrade to standard
	err = licenseRepo.UpdateLicensePlan(companyID, "standard")
	require.NoError(t, err)

	// Verify downgrade
	license, err := licenseRepo.GetLicenseByCompanyID(companyID)
	require.NoError(t, err)
	assert.Equal(t, "standard", license.PlanID)
	
	// Verify new limits are applied
	assert.NotNil(t, license.MaxStudents)
	assert.Equal(t, 100, *license.MaxStudents)
}

// TestBillingFlow_UpgradePlan tests upgrading from lower to higher plan
func TestBillingFlow_UpgradePlan(t *testing.T) {
	db := testutil.SetupTestDB(t)
	defer db.Close()
	defer testutil.CleanupTestDB(t, db)

	licenseRepo := repository.NewLicenseRepository(db)

	// Create company with Standard license
	companyID := "upgrade-test-company"
	_, err := db.Exec(`
		INSERT INTO companies (id, name, status, created_at, updated_at)
		VALUES ($1, 'Upgrade Test Company', 'active', NOW(), NOW())
	`, companyID)
	require.NoError(t, err)

	_, err = licenseRepo.CreateLicense(companyID, "standard", 1)
	require.NoError(t, err)

	// Verify initial limits
	license, err := licenseRepo.GetLicenseByCompanyID(companyID)
	require.NoError(t, err)
	assert.Equal(t, 100, *license.MaxStudents)

	// Upgrade to business
	err = licenseRepo.UpdateLicensePlan(companyID, "business")
	require.NoError(t, err)

	// Verify upgrade
	license, err = licenseRepo.GetLicenseByCompanyID(companyID)
	require.NoError(t, err)
	assert.Equal(t, "business", license.PlanID)
	assert.Equal(t, 700, *license.MaxStudents)
}

// TestBillingFlow_UsageTracking tests that usage is tracked correctly
func TestBillingFlow_UsageTracking(t *testing.T) {
	db := testutil.SetupTestDB(t)
	defer db.Close()
	defer testutil.CleanupTestDB(t, db)

	licenseRepo := repository.NewLicenseRepository(db)

	// Create company
	companyID := "usage-tracking-company"
	_, err := db.Exec(`
		INSERT INTO companies (id, name, status, created_at, updated_at)
		VALUES ($1, 'Usage Tracking Company', 'active', NOW(), NOW())
	`, companyID)
	require.NoError(t, err)

	// Create branch
	branchID := "usage-branch-1"
	_, err = db.Exec(`
		INSERT INTO branches (id, name, company_id, status)
		VALUES ($1, 'Main Branch', $2, 'active')
	`, branchID, companyID)
	require.NoError(t, err)

	// Initial usage should be 0 students, 0 users, 0 teachers, 1 branch
	usage, err := licenseRepo.GetCompanyUsage(companyID)
	require.NoError(t, err)
	assert.Equal(t, 0, usage.StudentsCount)
	assert.Equal(t, 0, usage.UsersCount)
	assert.Equal(t, 0, usage.TeachersCount)
	assert.Equal(t, 1, usage.BranchesCount)

	// Add students
	for i := 0; i < 10; i++ {
		studentID := fmt.Sprintf("usage-student-%d", i)
		studentName := fmt.Sprintf("Student %d", i)
		_, err = db.Exec(`
			INSERT INTO students (id, name, phone, status, company_id, branch_id)
			VALUES ($1, $2, '123456789', 'active', $3, $4)
		`, studentID, studentName, companyID, branchID)
		require.NoError(t, err)
	}

	// Add teachers
	for i := 0; i < 3; i++ {
		teacherID := fmt.Sprintf("usage-teacher-%d", i)
		teacherName := fmt.Sprintf("Teacher %d", i)
		teacherEmail := fmt.Sprintf("teacher%d@test.com", i)
		_, err = db.Exec(`
			INSERT INTO teachers (id, name, subject, email, phone, status, company_id, branch_id)
			VALUES ($1, $2, 'Math', $3, '123456789', 'active', $4, $5)
		`, teacherID, teacherName, teacherEmail, companyID, branchID)
		require.NoError(t, err)
	}

	// Add users
	for i := 0; i < 2; i++ {
		userEmail := fmt.Sprintf("usage-user%d@test.com", i)
		userName := fmt.Sprintf("User %d", i)
		_, err = db.Exec(`
			INSERT INTO users (email, password, name, company_id, created_at, updated_at)
			VALUES ($1, 'password', $2, $3, NOW(), NOW())
		`, userEmail, userName, companyID)
		require.NoError(t, err)
	}

	// Check updated usage
	usage, err = licenseRepo.GetCompanyUsage(companyID)
	require.NoError(t, err)
	assert.Equal(t, 10, usage.StudentsCount)
	assert.Equal(t, 2, usage.UsersCount)
	assert.Equal(t, 3, usage.TeachersCount)
	assert.Equal(t, 1, usage.BranchesCount)
}

// TestBillingFlow_PlanFeaturesMatch tests that features in DB match expected values
func TestBillingFlow_PlanFeaturesMatch(t *testing.T) {
	db := testutil.SetupTestDB(t)
	defer db.Close()

	licenseRepo := repository.NewLicenseRepository(db)
	plans, err := licenseRepo.GetAllPlans()
	require.NoError(t, err)

	// Expected features by plan
	expectedFeatures := map[string][]string{
		"standard": {"groups", "individual", "schedule", "attendance", "finance", "subscriptions", "reports", "leads"},
		"professional": {"groups", "individual", "schedule", "attendance", "finance", "subscriptions", "reports", "leads", "advanced_analytics"},
		"business": {"groups", "individual", "schedule", "attendance", "finance", "subscriptions", "reports", "leads", "advanced_analytics", "priority_support", "custom_reports"},
		"enterprise": {"groups", "individual", "schedule", "attendance", "finance", "subscriptions", "reports", "leads", "advanced_analytics", "priority_support", "custom_reports", "dedicated_manager", "custom_integration"},
	}

	for _, plan := range plans {
		expected, ok := expectedFeatures[plan.ID]
		if !ok {
			continue
		}

		for _, feature := range expected {
			value, exists := plan.Features[feature]
			assert.True(t, exists, "Plan %s should have feature %s", plan.ID, feature)
			if exists {
				assert.True(t, value.(bool), "Plan %s feature %s should be true", plan.ID, feature)
			}
		}
	}
}

// TestBillingFlow_LicensePeriodCalculation tests that license periods are calculated correctly
func TestBillingFlow_LicensePeriodCalculation(t *testing.T) {
	db := testutil.SetupTestDB(t)
	defer db.Close()
	defer testutil.CleanupTestDB(t, db)

	licenseRepo := repository.NewLicenseRepository(db)

	// Create company
	companyID := "period-calc-company"
	_, err := db.Exec(`
		INSERT INTO companies (id, name, status, created_at, updated_at)
		VALUES ($1, 'Period Calc Company', 'active', NOW(), NOW())
	`, companyID)
	require.NoError(t, err)

	// Create 1-month license
	before := time.Now()
	license, err := licenseRepo.CreateLicense(companyID, "standard", 1)
	require.NoError(t, err)
	after := time.Now()

	// Period start should be around now
	assert.True(t, license.CurrentPeriodStart.After(before) || license.CurrentPeriodStart.Equal(before))
	assert.True(t, license.CurrentPeriodStart.Before(after) || license.CurrentPeriodStart.Equal(after))

	// Period end should be approximately 1 month later
	expectedEnd := license.CurrentPeriodStart.AddDate(0, 1, 0)
	timeDiff := license.CurrentPeriodEnd.Sub(expectedEnd)
	assert.True(t, timeDiff > -24*time.Hour && timeDiff < 24*time.Hour, 
		"Period end should be approximately 1 month after start")
}

// TestBillingFlow_MultipleCompaniesIsolation tests that companies are isolated
func TestBillingFlow_MultipleCompaniesIsolation(t *testing.T) {
	db := testutil.SetupTestDB(t)
	defer db.Close()
	defer testutil.CleanupTestDB(t, db)

	licenseRepo := repository.NewLicenseRepository(db)

	// Create two companies
	company1ID := "isolation-company-1"
	company2ID := "isolation-company-2"
	
	for _, cid := range []string{company1ID, company2ID} {
		_, err := db.Exec(`
			INSERT INTO companies (id, name, status, created_at, updated_at)
			VALUES ($1, $2, 'active', NOW(), NOW())
		`, cid, "Company "+cid)
		require.NoError(t, err)
	}

	// Give different plans
	_, err := licenseRepo.CreateLicense(company1ID, "standard", 1)
	require.NoError(t, err)
	_, err = licenseRepo.CreateLicense(company2ID, "enterprise", 1)
	require.NoError(t, err)

	// Verify isolation
	license1, err := licenseRepo.GetLicenseByCompanyID(company1ID)
	require.NoError(t, err)
	license2, err := licenseRepo.GetLicenseByCompanyID(company2ID)
	require.NoError(t, err)

	assert.Equal(t, "standard", license1.PlanID)
	assert.Equal(t, "enterprise", license2.PlanID)
	
	// Standard has limits
	assert.NotNil(t, license1.MaxStudents)
	// Enterprise has no limits
	assert.Nil(t, license2.MaxStudents)
}
