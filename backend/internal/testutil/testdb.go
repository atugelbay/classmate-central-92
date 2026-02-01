package testutil

import (
	"database/sql"
	"fmt"
	"os"
	"sync"
	"testing"

	"classmate-central/internal/database"

	_ "github.com/lib/pq"
)

var (
	migrationsApplied bool
	migrationsMutex   sync.Mutex
)

// SetupTestDB creates a test database connection
func SetupTestDB(t *testing.T) *sql.DB {
	// IMPORTANT: Use a SEPARATE test database to avoid destroying development data!
	// Tests will TRUNCATE all tables at the end, so we must use a dedicated test DB.
	dbName := os.Getenv("TEST_DB_NAME")
	if dbName == "" {
		dbName = "classmate_central_test" // Separate test database!
	}

	// Safety check: prevent tests from running on production-like database names
	if dbName == "classmate_central" || dbName == "classmate_central_db" {
		t.Logf("WARNING: Tests should use a separate database! Set TEST_DB_NAME or use 'classmate_central_test'")
		t.Logf("To create test database: CREATE DATABASE classmate_central_test;")
		dbName = "classmate_central_test"
	}

	connStr := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		getEnvOrDefault("DB_HOST", "localhost"),
		getEnvOrDefault("DB_PORT", "5432"),
		getEnvOrDefault("DB_USER", "postgres"),
		getEnvOrDefault("DB_PASSWORD", "postgres"),
		dbName,
	)

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		t.Fatalf("Failed to open test database: %v", err)
	}

	if err := db.Ping(); err != nil {
		t.Fatalf("Failed to ping test database '%s': %v\n"+
			"Please check:\n"+
			"  1. PostgreSQL is running\n"+
			"  2. Database '%s' exists: CREATE DATABASE %s;\n"+
			"  3. Connection settings (DB_HOST=%s, DB_USER=%s, DB_PORT=%s)\n"+
			"Or run: docker exec classmate_central_db psql -U postgres -c 'CREATE DATABASE %s'",
			dbName, err, dbName, dbName,
			getEnvOrDefault("DB_HOST", "localhost"),
			getEnvOrDefault("DB_USER", "postgres"),
			getEnvOrDefault("DB_PORT", "5432"),
			dbName)
	}

	// Apply migrations to test database (only once per test run)
	migrationsMutex.Lock()
	if !migrationsApplied {
		t.Log("Applying migrations to test database...")
		testDB := &database.Database{DB: db}
		if err := testDB.RunMigrations(); err != nil {
			migrationsMutex.Unlock()
			t.Fatalf("Failed to run migrations on test database: %v", err)
		}
		migrationsApplied = true
		t.Log("Migrations applied successfully")
	}
	migrationsMutex.Unlock()

	return db
}

// CleanupTestDB truncates all tables to clean up test data
func CleanupTestDB(t *testing.T, db *sql.DB) {
	tables := []string{
		"lesson_students",
		"lesson_attendance",
		"student_groups",
		"student_subjects",
		"lessons",
		"groups",
		"students",
		"teachers",
		"leads",
		"rooms",
		"debt_records",
		"payment_transactions",
		"student_balance",
		"tariffs",
		"subscription_freezes",
		"student_subscriptions",
		"subscription_types",
		"student_activity_log",
		"student_notes",
		"notifications",
		"user_roles",
		"billing_addons",
		"usage_metrics",
		"billing_history",
		"company_licenses",
		"users",
		"branches",
		"companies",
		"roles",
		"settings",
	}

	for _, table := range tables {
		_, err := db.Exec(fmt.Sprintf("TRUNCATE TABLE %s CASCADE", table))
		if err != nil {
			// Ignore errors for tables that don't exist
			t.Logf("Warning: Could not truncate table %s: %v", table, err)
		}
	}
}

func getEnvOrDefault(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}
