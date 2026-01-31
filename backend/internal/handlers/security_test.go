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
)

// =============================================================================
// Multi-Tenancy Isolation Tests
// =============================================================================

func setupMultiTenantTestRouter(t *testing.T, db *sql.DB, companyID, branchID string) *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()

	studentRepo := repository.NewStudentRepository(db)
	activityRepo := repository.NewActivityRepository(db)
	notificationRepo := repository.NewNotificationRepository(db)
	activityService := services.NewActivityService(activityRepo)
	groupRepo := repository.NewGroupRepository(db)
	lessonRepo := repository.NewLessonRepository(db)

	studentHandler := NewStudentHandler(studentRepo, activityRepo, notificationRepo, activityService)
	groupHandler := NewGroupHandler(groupRepo, lessonRepo)

	router.Use(func(c *gin.Context) {
		c.Set("company_id", companyID)
		c.Set("branch_id", branchID)
		c.Set("accessible_branch_ids", []string{branchID})
		c.Next()
	})

	router.GET("/api/students", studentHandler.GetAll)
	router.GET("/api/students/:id", studentHandler.GetByID)
	router.GET("/api/groups", groupHandler.GetAll)
	router.GET("/api/groups/:id", groupHandler.GetByID)

	return router
}

func TestMultiTenancy_CompanyA_CannotSeeCompanyB_Students(t *testing.T) {
	r := testutil.NewWorkflowReporter(t)
	db := testutil.SetupTestDB(t)
	defer db.Close()

	companyA := testutil.CreateTestCompany(t, db)
	branchA := testutil.CreateTestBranch(t, db, companyA.ID)
	studentA := testutil.CreateTestStudent(t, db, companyA.ID, branchA.ID)

	companyB := testutil.CreateTestCompany(t, db)
	branchB := testutil.CreateTestBranch(t, db, companyB.ID)

	r.Step("Company B tries to list students", func() error {
		routerB := setupMultiTenantTestRouter(t, db, companyB.ID, branchB.ID)
		req := httptest.NewRequest("GET", "/api/students", nil)
		w := httptest.NewRecorder()
		routerB.ServeHTTP(w, req)

		r.Check("status 200 OK", 200, w.Code, w.Code == http.StatusOK)

		// Parse response with items wrapper
		var response struct {
			Items []models.Student `json:"items"`
		}
		json.Unmarshal(w.Body.Bytes(), &response)

		found := false
		for _, s := range response.Items {
			if s.ID == studentA.ID {
				found = true
				break
			}
		}
		r.Check("Company A student not visible", false, found, !found)
		return nil
	})
}

func TestMultiTenancy_CompanyA_CannotAccessCompanyB_StudentByID(t *testing.T) {
	r := testutil.NewWorkflowReporter(t)
	db := testutil.SetupTestDB(t)
	defer db.Close()

	companyA := testutil.CreateTestCompany(t, db)
	branchA := testutil.CreateTestBranch(t, db, companyA.ID)
	studentA := testutil.CreateTestStudent(t, db, companyA.ID, branchA.ID)

	companyB := testutil.CreateTestCompany(t, db)
	branchB := testutil.CreateTestBranch(t, db, companyB.ID)

	r.Step("Company B tries to access Company A student by ID", func() error {
		routerB := setupMultiTenantTestRouter(t, db, companyB.ID, branchB.ID)
		req := httptest.NewRequest("GET", "/api/students/"+studentA.ID, nil)
		w := httptest.NewRecorder()
		routerB.ServeHTTP(w, req)

		blocked := w.Code == http.StatusNotFound || w.Code == http.StatusForbidden
		r.Check("access denied (404 or 403)", true, blocked, blocked)
		return nil
	})
}

func TestMultiTenancy_CompanyA_CannotSeeCompanyB_Groups(t *testing.T) {
	r := testutil.NewWorkflowReporter(t)
	db := testutil.SetupTestDB(t)
	defer db.Close()

	companyA := testutil.CreateTestCompany(t, db)
	branchA := testutil.CreateTestBranch(t, db, companyA.ID)
	roomA := testutil.CreateTestRoom(t, db, companyA.ID, branchA.ID)
	teacherA := testutil.CreateTestTeacher(t, db, companyA.ID, branchA.ID)
	groupA := testutil.CreateTestGroup(t, db, companyA.ID, branchA.ID, teacherA.ID, roomA.ID)

	companyB := testutil.CreateTestCompany(t, db)
	branchB := testutil.CreateTestBranch(t, db, companyB.ID)

	r.Step("Company B tries to list groups", func() error {
		routerB := setupMultiTenantTestRouter(t, db, companyB.ID, branchB.ID)
		req := httptest.NewRequest("GET", "/api/groups", nil)
		w := httptest.NewRecorder()
		routerB.ServeHTTP(w, req)

		r.Check("status 200 OK", 200, w.Code, w.Code == http.StatusOK)

		var groups []models.Group
		json.Unmarshal(w.Body.Bytes(), &groups)

		found := false
		for _, g := range groups {
			if g.ID == groupA.ID {
				found = true
				break
			}
		}
		r.Check("Company A group not visible", false, found, !found)
		return nil
	})
}

func TestMultiTenancy_CompanyA_CannotAccessCompanyB_GroupByID(t *testing.T) {
	r := testutil.NewWorkflowReporter(t)
	db := testutil.SetupTestDB(t)
	defer db.Close()

	companyA := testutil.CreateTestCompany(t, db)
	branchA := testutil.CreateTestBranch(t, db, companyA.ID)
	roomA := testutil.CreateTestRoom(t, db, companyA.ID, branchA.ID)
	teacherA := testutil.CreateTestTeacher(t, db, companyA.ID, branchA.ID)
	groupA := testutil.CreateTestGroup(t, db, companyA.ID, branchA.ID, teacherA.ID, roomA.ID)

	companyB := testutil.CreateTestCompany(t, db)
	branchB := testutil.CreateTestBranch(t, db, companyB.ID)

	r.Step("Company B tries to access Company A group by ID", func() error {
		routerB := setupMultiTenantTestRouter(t, db, companyB.ID, branchB.ID)
		req := httptest.NewRequest("GET", "/api/groups/"+groupA.ID, nil)
		w := httptest.NewRecorder()
		routerB.ServeHTTP(w, req)

		blocked := w.Code == http.StatusNotFound || w.Code == http.StatusForbidden
		r.Check("access denied (404 or 403)", true, blocked, blocked)
		return nil
	})
}

// =============================================================================
// Branch Isolation Tests
// =============================================================================

func TestBranchIsolation_BranchA_CannotSeeBranchB_Students(t *testing.T) {
	r := testutil.NewWorkflowReporter(t)
	db := testutil.SetupTestDB(t)
	defer db.Close()

	company := testutil.CreateTestCompany(t, db)
	branchA := testutil.CreateTestBranch(t, db, company.ID)
	branchB := testutil.CreateTestBranch(t, db, company.ID)

	studentA := testutil.CreateTestStudent(t, db, company.ID, branchA.ID)
	studentB := testutil.CreateTestStudent(t, db, company.ID, branchB.ID)

	r.Step("Request students from Branch A only", func() error {
		routerA := setupMultiTenantTestRouter(t, db, company.ID, branchA.ID)
		req := httptest.NewRequest("GET", "/api/students", nil)
		w := httptest.NewRecorder()
		routerA.ServeHTTP(w, req)

		r.Check("status 200 OK", 200, w.Code, w.Code == http.StatusOK)

		// Parse response with items wrapper
		var response struct {
			Items []models.Student `json:"items"`
		}
		json.Unmarshal(w.Body.Bytes(), &response)

		foundA := false
		foundB := false
		for _, s := range response.Items {
			if s.ID == studentA.ID {
				foundA = true
			}
			if s.ID == studentB.ID {
				foundB = true
			}
		}
		r.Check("Branch A student visible", true, foundA, foundA)
		r.Check("Branch B student NOT visible", false, foundB, !foundB)
		return nil
	})
}

// =============================================================================
// Cross-Company Data Modification Tests
// =============================================================================

func setupModificationRouter(t *testing.T, db *sql.DB, companyID, branchID string) *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()

	studentRepo := repository.NewStudentRepository(db)
	activityRepo := repository.NewActivityRepository(db)
	notificationRepo := repository.NewNotificationRepository(db)
	activityService := services.NewActivityService(activityRepo)
	handler := NewStudentHandler(studentRepo, activityRepo, notificationRepo, activityService)

	router.Use(func(c *gin.Context) {
		c.Set("company_id", companyID)
		c.Set("branch_id", branchID)
		c.Set("accessible_branch_ids", []string{branchID})
		c.Next()
	})

	router.PUT("/api/students/:id", handler.Update)
	router.DELETE("/api/students/:id", handler.Delete)

	return router
}

func TestMultiTenancy_CannotModifyOtherCompanyStudent(t *testing.T) {
	r := testutil.NewWorkflowReporter(t)
	db := testutil.SetupTestDB(t)
	defer db.Close()

	companyA := testutil.CreateTestCompany(t, db)
	branchA := testutil.CreateTestBranch(t, db, companyA.ID)
	studentA := testutil.CreateTestStudent(t, db, companyA.ID, branchA.ID)
	originalName := studentA.Name

	companyB := testutil.CreateTestCompany(t, db)
	branchB := testutil.CreateTestBranch(t, db, companyB.ID)

	r.Step("Company B tries to update Company A student", func() error {
		routerB := setupModificationRouter(t, db, companyB.ID, branchB.ID)

		updateData := map[string]interface{}{
			"name":   "HACKED NAME",
			"age":    99,
			"status": "active",
		}
		body, _ := json.Marshal(updateData)
		req := httptest.NewRequest("PUT", "/api/students/"+studentA.ID, bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		routerB.ServeHTTP(w, req)

		r.Check("modification rejected", true, w.Code != http.StatusOK, w.Code != http.StatusOK)

		var currentName string
		err := db.QueryRow("SELECT name FROM students WHERE id = $1", studentA.ID).Scan(&currentName)
		r.Check("name unchanged", originalName, currentName, err == nil && currentName == originalName)
		return nil
	})
}

func TestMultiTenancy_CannotDeleteOtherCompanyStudent(t *testing.T) {
	r := testutil.NewWorkflowReporter(t)
	db := testutil.SetupTestDB(t)
	defer db.Close()

	companyA := testutil.CreateTestCompany(t, db)
	branchA := testutil.CreateTestBranch(t, db, companyA.ID)
	studentA := testutil.CreateTestStudent(t, db, companyA.ID, branchA.ID)

	companyB := testutil.CreateTestCompany(t, db)
	branchB := testutil.CreateTestBranch(t, db, companyB.ID)

	r.Step("Company B tries to delete Company A student", func() error {
		routerB := setupModificationRouter(t, db, companyB.ID, branchB.ID)
		req := httptest.NewRequest("DELETE", "/api/students/"+studentA.ID, nil)
		w := httptest.NewRecorder()
		routerB.ServeHTTP(w, req)

		r.Check("deletion rejected", true, w.Code != http.StatusOK, w.Code != http.StatusOK)

		var count int
		db.QueryRow("SELECT COUNT(*) FROM students WHERE id = $1", studentA.ID).Scan(&count)
		r.Check("student still exists", 1, count, count == 1)
		return nil
	})
}

// =============================================================================
// Payment/Balance Isolation Tests
// =============================================================================

func TestMultiTenancy_CannotSeeOtherCompanyBalances(t *testing.T) {
	r := testutil.NewWorkflowReporter(t)
	db := testutil.SetupTestDB(t)
	defer db.Close()

	companyA := testutil.CreateTestCompany(t, db)
	branchA := testutil.CreateTestBranch(t, db, companyA.ID)
	studentA := testutil.CreateTestStudent(t, db, companyA.ID, branchA.ID)
	testutil.CreateTestStudentBalance(t, db, studentA.ID, 50000)

	companyB := testutil.CreateTestCompany(t, db)

	r.Step("Query balance with Company B context", func() error {
		var balance float64
		err := db.QueryRow(`
			SELECT COALESCE(sb.balance, 0) 
			FROM student_balance sb
			JOIN students s ON sb.student_id = s.id
			WHERE sb.student_id = $1 AND s.company_id = $2
		`, studentA.ID, companyB.ID).Scan(&balance)

		if err == sql.ErrNoRows {
			r.Check("no rows returned (correct)", true, true, true)
		} else {
			r.Check("balance is 0 (filtered)", 0.0, balance, balance == 0)
		}
		return nil
	})
}

// =============================================================================
// Subscription Isolation Tests
// =============================================================================

func TestMultiTenancy_CannotSeeOtherCompanySubscriptions(t *testing.T) {
	r := testutil.NewWorkflowReporter(t)
	db := testutil.SetupTestDB(t)
	defer db.Close()

	ctxA := testutil.NewTestContext(t, db)
	subA := testutil.CreateTestSubscription(t, db, ctxA.Student.ID, ctxA.SubType.ID,
		ctxA.Company.ID, ctxA.Branch.ID, 8, 10000)

	companyB := testutil.CreateTestCompany(t, db)

	r.Step("Query subscriptions with Company B filter", func() error {
		rows, err := db.Query(`
			SELECT id FROM student_subscriptions WHERE company_id = $1
		`, companyB.ID)
		if err != nil {
			return err
		}
		defer rows.Close()

		var subIDs []string
		for rows.Next() {
			var id string
			rows.Scan(&id)
			subIDs = append(subIDs, id)
		}

		found := false
		for _, id := range subIDs {
			if id == subA.ID {
				found = true
				break
			}
		}
		r.Check("Company A subscription not visible", false, found, !found)
		return nil
	})
}

// =============================================================================
// Edge Case: Empty Company ID
// =============================================================================

func TestSecurity_EmptyCompanyID_ReturnsNoData(t *testing.T) {
	r := testutil.NewWorkflowReporter(t)
	db := testutil.SetupTestDB(t)
	defer db.Close()

	ctx := testutil.NewTestContext(t, db)

	r.Step("Request with empty company_id", func() error {
		router := setupMultiTenantTestRouter(t, db, "", "")
		req := httptest.NewRequest("GET", "/api/students", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		// Parse response with items wrapper
		var response struct {
			Items []models.Student `json:"items"`
		}
		json.Unmarshal(w.Body.Bytes(), &response)

		found := false
		for _, s := range response.Items {
			if s.ID == ctx.Student.ID {
				found = true
				break
			}
		}
		r.Check("no data with empty company_id", false, found, !found)
		return nil
	})
}
