package testutil

import (
	"database/sql"
	"fmt"
	"os"
	"testing"

	_ "github.com/lib/pq"
)

// SetupTestDB creates a test database connection
func SetupTestDB(t *testing.T) *sql.DB {
	// Use test database from env or default
	dbName := os.Getenv("DB_NAME")
	if dbName == "" {
		// Try to use the same DB as in .env file, fallback to classmate_central_db
		dbName = "classmate_central"
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
			"  4. Run migrations on the database\n"+
			"Or run: ./scripts/setup-test-db.sh (Linux/macOS) or .\\scripts\\setup-test-db.ps1 (Windows)",
			dbName, err, dbName, dbName,
			getEnvOrDefault("DB_HOST", "localhost"),
			getEnvOrDefault("DB_USER", "postgres"),
			getEnvOrDefault("DB_PORT", "5432"))
	}

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
		"users",
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
