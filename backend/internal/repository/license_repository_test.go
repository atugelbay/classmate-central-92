package repository

import (
	"testing"

	"classmate-central/internal/testutil"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestLicenseRepository_GetAllPlans(t *testing.T) {
	db := testutil.SetupTestDB(t)
	defer db.Close()

	repo := NewLicenseRepository(db)

	plans, err := repo.GetAllPlans()
	require.NoError(t, err)
	
	// Should have 4 plans: standard, professional, business, enterprise
	assert.Len(t, plans, 4)

	// Check plans are ordered by sort_order
	assert.Equal(t, "standard", plans[0].ID)
	assert.Equal(t, "professional", plans[1].ID)
	assert.Equal(t, "business", plans[2].ID)
	assert.Equal(t, "enterprise", plans[3].ID)
}

func TestLicenseRepository_GetPlanByID(t *testing.T) {
	db := testutil.SetupTestDB(t)
	defer db.Close()

	repo := NewLicenseRepository(db)

	t.Run("existing plan", func(t *testing.T) {
		plan, err := repo.GetPlanByID("standard")
		require.NoError(t, err)
		require.NotNil(t, plan)
		
		assert.Equal(t, "standard", plan.ID)
		assert.Equal(t, "Standard", plan.Name)
		assert.Equal(t, float64(29900), plan.PriceMonthly)
		assert.NotNil(t, plan.MaxStudents)
		assert.Equal(t, 100, *plan.MaxStudents)
	})

	t.Run("enterprise has no limits", func(t *testing.T) {
		plan, err := repo.GetPlanByID("enterprise")
		require.NoError(t, err)
		require.NotNil(t, plan)
		
		assert.Equal(t, "enterprise", plan.ID)
		assert.Nil(t, plan.MaxStudents)  // unlimited
		assert.Nil(t, plan.MaxUsers)     // unlimited
		assert.Nil(t, plan.MaxTeachers)  // unlimited
		assert.Nil(t, plan.MaxBranches)  // unlimited
	})

	t.Run("non-existing plan", func(t *testing.T) {
		plan, err := repo.GetPlanByID("non-existing")
		require.NoError(t, err)
		assert.Nil(t, plan)
	})
}

func TestLicenseRepository_GetAllPlans_Features(t *testing.T) {
	db := testutil.SetupTestDB(t)
	defer db.Close()

	repo := NewLicenseRepository(db)

	plans, err := repo.GetAllPlans()
	require.NoError(t, err)

	// Check that features are parsed correctly
	for _, plan := range plans {
		assert.NotNil(t, plan.Features, "Features should not be nil for plan %s", plan.ID)
		
		// All plans should have basic features
		if groups, ok := plan.Features["groups"]; ok {
			assert.True(t, groups.(bool), "Plan %s should have groups feature", plan.ID)
		}
	}

	// Enterprise should have all premium features
	enterprisePlan, _ := repo.GetPlanByID("enterprise")
	require.NotNil(t, enterprisePlan)
	
	if prioritySupport, ok := enterprisePlan.Features["priority_support"]; ok {
		assert.True(t, prioritySupport.(bool))
	}
}

func TestLicenseRepository_CreateAndGetLicense(t *testing.T) {
	db := testutil.SetupTestDB(t)
	defer db.Close()
	defer testutil.CleanupTestDB(t, db)

	repo := NewLicenseRepository(db)

	// Create a test company using fixtures
	company := testutil.CreateTestCompany(t, db)

	t.Run("create new license", func(t *testing.T) {
		license, err := repo.CreateLicense(company.ID, "professional", 1)
		require.NoError(t, err)
		require.NotNil(t, license)

		assert.Equal(t, company.ID, license.CompanyID)
		assert.Equal(t, "professional", license.PlanID)
		assert.Equal(t, "active", license.Status)
	})

	t.Run("get license with plan details", func(t *testing.T) {
		licenseWithPlan, err := repo.GetLicenseByCompanyID(company.ID)
		require.NoError(t, err)
		require.NotNil(t, licenseWithPlan)

		assert.Equal(t, company.ID, licenseWithPlan.CompanyID)
		assert.Equal(t, "professional", licenseWithPlan.PlanID)
		assert.Equal(t, "Professional", licenseWithPlan.PlanName)
		assert.Equal(t, float64(49900), licenseWithPlan.PriceMonthly)
		assert.NotNil(t, licenseWithPlan.MaxStudents)
		assert.Equal(t, 300, *licenseWithPlan.MaxStudents)
	})
}

func TestLicenseRepository_UpdateLicensePlan(t *testing.T) {
	db := testutil.SetupTestDB(t)
	defer db.Close()
	defer testutil.CleanupTestDB(t, db)

	repo := NewLicenseRepository(db)

	// Create a test company using fixtures
	company := testutil.CreateTestCompany(t, db)

	// Create initial license using fixtures
	testutil.CreateTestLicense(t, db, company.ID, "standard", 1)

	// Update to professional
	err := repo.UpdateLicensePlan(company.ID, "professional")
	require.NoError(t, err)

	// Verify the update
	license, err := repo.GetLicenseByCompanyID(company.ID)
	require.NoError(t, err)
	assert.Equal(t, "professional", license.PlanID)
	assert.Equal(t, "Professional", license.PlanName)
}

func TestLicenseRepository_HasLicense(t *testing.T) {
	db := testutil.SetupTestDB(t)
	defer db.Close()
	defer testutil.CleanupTestDB(t, db)

	repo := NewLicenseRepository(db)

	// Create test companies using fixtures
	companyWithLicense := testutil.CreateTestCompany(t, db)
	companyWithoutLicense := testutil.CreateTestCompany(t, db)

	// Create license for first company using fixtures
	testutil.CreateTestLicense(t, db, companyWithLicense.ID, "standard", 1)

	t.Run("company with license", func(t *testing.T) {
		hasLicense, err := repo.HasLicense(companyWithLicense.ID)
		require.NoError(t, err)
		assert.True(t, hasLicense)
	})

	t.Run("company without license", func(t *testing.T) {
		hasLicense, err := repo.HasLicense(companyWithoutLicense.ID)
		require.NoError(t, err)
		assert.False(t, hasLicense)
	})
}

func TestLicenseRepository_GetCompanyUsage(t *testing.T) {
	db := testutil.SetupTestDB(t)
	defer db.Close()
	defer testutil.CleanupTestDB(t, db)

	repo := NewLicenseRepository(db)

	// Create a test company using fixtures
	company := testutil.CreateTestCompany(t, db)
	branch := testutil.CreateTestBranch(t, db, company.ID)

	// Get usage (should be 0 for students/teachers, 1 for branches)
	usage, err := repo.GetCompanyUsage(company.ID)
	require.NoError(t, err)
	require.NotNil(t, usage)

	assert.Equal(t, 0, usage.StudentsCount)
	assert.Equal(t, 0, usage.TeachersCount)
	assert.Equal(t, 1, usage.BranchesCount) // We added one branch

	// Add some students and teachers using fixtures
	testutil.CreateMultipleStudents(t, db, company.ID, branch.ID, 5)
	testutil.CreateMultipleTeachers(t, db, company.ID, branch.ID, 3)

	// Re-check usage
	usage, err = repo.GetCompanyUsage(company.ID)
	require.NoError(t, err)
	assert.Equal(t, 5, usage.StudentsCount)
	assert.Equal(t, 3, usage.TeachersCount)
}

func TestLicenseRepository_CreateLicense_Upsert(t *testing.T) {
	db := testutil.SetupTestDB(t)
	defer db.Close()
	defer testutil.CleanupTestDB(t, db)

	repo := NewLicenseRepository(db)

	// Create a test company using fixtures
	company := testutil.CreateTestCompany(t, db)

	// Create initial license
	license1, err := repo.CreateLicense(company.ID, "standard", 1)
	require.NoError(t, err)
	assert.Equal(t, "standard", license1.PlanID)

	// Call CreateLicense again - should upsert (update)
	license2, err := repo.CreateLicense(company.ID, "enterprise", 1)
	require.NoError(t, err)
	assert.Equal(t, "enterprise", license2.PlanID)

	// Verify only one license exists
	var count int
	err = db.QueryRow("SELECT COUNT(*) FROM company_licenses WHERE company_id = $1", company.ID).Scan(&count)
	require.NoError(t, err)
	assert.Equal(t, 1, count)
}

